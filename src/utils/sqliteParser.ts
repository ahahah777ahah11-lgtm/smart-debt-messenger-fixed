import { Database, SqlJsStatic } from 'sql.js';
// @ts-ignore
import initSqlAsm from 'sql.js/dist/sql-asm.js';
import { ColumnMapping, SqliteTableInfo } from '../types';

let SQL: SqlJsStatic | null = null;

// Initialize pure JavaScript SQL.js engine (asm.js) - zero external network requests, zero WASM errors
export async function getSqlInstance(): Promise<SqlJsStatic> {
  if (SQL) return SQL;

  try {
    const initFn: any =
      typeof initSqlAsm === 'function'
        ? initSqlAsm
        : (initSqlAsm as any)?.default || (typeof window !== 'undefined' ? (window as any).initSqlJs : null);
    SQL = await initFn();
    return SQL!;
  } catch (err) {
    console.warn('Direct initSqlAsm failed, trying fallback script...', err);
    // If running in browser and direct import had an issue, load /sql-asm.js from public
    if (typeof window !== 'undefined') {
      if (!(window as any).initSqlJs) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = '/sql-asm.js';
          script.onload = () => resolve();
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      SQL = await (window as any).initSqlJs();
      return SQL!;
    }
    throw err;
  }
}

export interface ParsedDbResult {
  tables: SqliteTableInfo[];
  db: Database;
  recommendedTable?: string;
  recommendedMapping?: Partial<ColumnMapping>;
}

// Inspect a .db file buffer and return list of tables and auto-detected structure
export async function parseSqliteBuffer(buffer: ArrayBuffer): Promise<ParsedDbResult> {
  if (!buffer || buffer.byteLength < 100) {
    throw new Error('حجم الملف صغير جداً أو فارغ. يرجى التأكد من اختيار ملف قاعدة بيانات .db صالح.');
  }

  // Validate SQLite magic header: "SQLite format 3\0"
  const bytes = new Uint8Array(buffer.slice(0, 16));
  const magic = String.fromCharCode(...bytes);
  if (!magic.startsWith('SQLite format 3')) {
    throw new Error('الملف المرفق ليس بصيغة قاعدة بيانات SQLite صالحة (امتداد .db). يرجى التأكد من اختيار الملف الصحيح من تطبيق الحسابات.');
  }

  const sql = await getSqlInstance();
  const db = new sql.Database(new Uint8Array(buffer));

  // Query all user tables (exclude sqlite internal tables)
  const tablesResult = db.exec(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'android_%'
    ORDER BY name ASC;
  `);

  const tables: SqliteTableInfo[] = [];

  if (tablesResult.length > 0 && tablesResult[0].values) {
    for (const row of tablesResult[0].values) {
      const tableName = String(row[0]);
      try {
        // Get column names
        const pragmaResult = db.exec(`PRAGMA table_info("${tableName}");`);
        const columns: string[] = [];
        if (pragmaResult.length > 0 && pragmaResult[0].values) {
          columns.push(...pragmaResult[0].values.map((v) => String(v[1])));
        }

        // Get row count
        const countResult = db.exec(`SELECT COUNT(*) FROM "${tableName}";`);
        const rowCount = countResult.length > 0 ? Number(countResult[0].values[0][0]) : 0;

        tables.push({
          name: tableName,
          rowCount,
          columns
        });
      } catch (e) {
        console.error(`Error reading table ${tableName}:`, e);
      }
    }
  }

  // Detect recommended customer table
  let recommendedTable: string | undefined;
  let recommendedMapping: Partial<ColumnMapping> | undefined;

  // Keyword weights to find best customer table
  const customerTableKeywords = [
    'customer', 'client', 'account', 'user', 'عميل', 'عملاء', 'حساب', 'حسابات',
    'contact', 'person', 'debt', 'debtor', 'مدين', 'debits', 'balance'
  ];

  let highestScore = -1;

  for (const t of tables) {
    let score = 0;
    const lowerName = t.name.toLowerCase();
    for (const kw of customerTableKeywords) {
      if (lowerName.includes(kw)) score += 10;
    }
    // Also check if columns look like a customer table
    const cols = t.columns.map((c) => c.toLowerCase());
    if (cols.some((c) => c.includes('name') || c.includes('اسم'))) score += 5;
    if (cols.some((c) => c.includes('phone') || c.includes('mobile') || c.includes('هاتف') || c.includes('جوال') || c.includes('tel'))) score += 5;
    if (cols.some((c) => c.includes('balance') || c.includes('debit') || c.includes('credit') || c.includes('رصيد') || c.includes('مبلغ'))) score += 5;

    // Prefer tables that actually have rows
    if (t.rowCount > 0) score += 2;

    if (score > highestScore) {
      highestScore = score;
      recommendedTable = t.name;
    }
  }

  if (recommendedTable) {
    const tableInfo = tables.find((t) => t.name === recommendedTable);
    if (tableInfo) {
      recommendedMapping = detectColumns(tableInfo.columns);
    }
  }

  return {
    tables,
    db,
    recommendedTable,
    recommendedMapping
  };
}

// Smart heuristic column detector for Arabic/English accounting schemas
export function detectColumns(columns: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {};

  const nameMatch = columns.find((c) => {
    const l = c.toLowerCase();
    return l.includes('اسم') || l.includes('name') || l.includes('customer') || l.includes('client') || l.includes('العميل') || l.includes('c_name');
  });
  if (nameMatch) mapping.nameCol = nameMatch;

  const phoneMatch = columns.find((c) => {
    const l = c.toLowerCase();
    return l.includes('هاتف') || l.includes('جوال') || l.includes('phone') || l.includes('mobile') || l.includes('tel') || l.includes('cell') || l.includes('رقم_الهاتف') || l.includes('تلفون');
  });
  if (phoneMatch) mapping.phoneCol = phoneMatch;

  const debitMatch = columns.find((c) => {
    const l = c.toLowerCase();
    return l.includes('عليه') || l.includes('مدين') || l.includes('debit') || l.includes('maden') || l.includes('alaih') || l.includes('مبلغ_عليه');
  });
  if (debitMatch) mapping.debitCol = debitMatch;

  const creditMatch = columns.find((c) => {
    const l = c.toLowerCase();
    return l.includes('له') || l.includes('دائن') || l.includes('credit') || l.includes('dayen') || l.includes('lah') || l.includes('مبلغ_له') || l.includes('paid');
  });
  if (creditMatch) mapping.creditCol = creditMatch;

  const balanceMatch = columns.find((c) => {
    const l = c.toLowerCase();
    return l.includes('رصيد') || l.includes('balance') || l.includes('صافي') || l.includes('total') || l.includes('net') || l.includes('المبلغ') || l.includes('amount');
  });
  if (balanceMatch) mapping.balanceCol = balanceMatch;

  const notesMatch = columns.find((c) => {
    const l = c.toLowerCase();
    return l.includes('ملاحظ') || l.includes('note') || l.includes('detail') || l.includes('بيان') || l.includes('desc') || l.includes('comment');
  });
  if (notesMatch) mapping.notesCol = notesMatch;

  const accMatch = columns.find((c) => {
    const l = c.toLowerCase();
    return l.includes('acc') || l.includes('حساب') || l.includes('code') || l.includes('رقم_الحساب') || l.includes('id');
  });
  if (accMatch) mapping.accountNumberCol = accMatch;

  return mapping;
}

// Create a realistic sample SQLite .db file binary in memory for instant testing
export async function createSampleSqliteDatabase(): Promise<Uint8Array> {
  const sql = await getSqlInstance();
  const db = new sql.Database();

  // Create accounts table matching standard accounting mobile apps
  db.run(`
    CREATE TABLE customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      notes TEXT,
      account_number TEXT
    );
  `);

  // Insert sample realistic accounts
  const sampleData = [
    ['عادل حزام اليافعي', '777123456', 85000, 15000, 70000, 'حساب بقالة ومواد غذائية', 'ACC-101'],
    ['محمد عبدالله الصنعاني', '771987654', 120000, 40000, 80000, 'فواتير مشتريات شهر مارس', 'ACC-102'],
    ['أحمد علي القدسي', '733456789', 45000, 45000, 0, 'تم سداد الحساب بالكامل', 'ACC-103'],
    ['خالد عبده الحكيمي', '770112233', 195000, 25000, 170000, 'متبقي حساب أجهزة وإلكترونيات', 'ACC-104'],
    ['طارق حسن العدني', '773665544', 32000, 0, 32000, 'مشتريات آجل - وعد بالسداد نهاية الأسبوع', 'ACC-105'],
    ['صالح ناصر المهري', '775889900', 0, 15000, -15000, 'دائن - له رصيد متبقي لدينا', 'ACC-106'],
    ['يوسف سعيد التعزي', '772334455', 68000, 18000, 50000, 'فاتورة صيدلية ومستلزمات', 'ACC-107'],
    ['فهد عبدالكريم المأربي', '774998877', 240000, 50000, 190000, 'مورد تجاري - مستحق السداد', 'ACC-108']
  ];

  for (const row of sampleData) {
    db.run(
      `INSERT INTO customers (name, phone, debit, credit, balance, notes, account_number) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      row
    );
  }

  // Also create transactions table
  db.run(`
    CREATE TABLE transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      date TEXT,
      type TEXT,
      amount REAL,
      note TEXT
    );
  `);

  db.run(`INSERT INTO transactions (customer_id, date, type, amount, note) VALUES (1, '2026-03-01', 'debit', 85000, 'فاتورة مبيعات رقم 401');`);
  db.run(`INSERT INTO transactions (customer_id, date, type, amount, note) VALUES (1, '2026-03-15', 'credit', 15000, 'دفعة نقدية سند قبض 12');`);

  const binaryArray = db.export();
  return binaryArray;
}
