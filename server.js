import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
dotenv.config();
const app = express();
app.use(express.json({ limit: "10mb" }));
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
}) : null;
function computeCustomerDuration(customer, refDate = /* @__PURE__ */ new Date()) {
  let earliestDate = null;
  if (customer.transactions && customer.transactions.length > 0) {
    for (const tx of customer.transactions) {
      if (tx.type === "debit") {
        const d = new Date(tx.date);
        if (!isNaN(d.getTime())) {
          if (!earliestDate || d < earliestDate) {
            earliestDate = d;
          }
        }
      }
    }
  }
  if (!earliestDate && customer.createdAt) {
    earliestDate = new Date(customer.createdAt);
  }
  if (!earliestDate) {
    earliestDate = /* @__PURE__ */ new Date();
  }
  const diffMs = Math.max(0, refDate.getTime() - earliestDate.getTime());
  return Math.max(1, Math.floor(diffMs / (1e3 * 60 * 60 * 24)));
}
function calculateFallbackAnalysis(customer, currency = "\u0631\u064A\u0627\u0644") {
  const durationDays = computeCustomerDuration(customer);
  const balance = Math.max(0, customer.balance);
  let amountScore = 0;
  if (balance >= 15e4) amountScore = 50;
  else if (balance >= 1e5) amountScore = 42;
  else if (balance >= 6e4) amountScore = 32;
  else if (balance >= 3e4) amountScore = 22;
  else amountScore = Math.min(15, Math.floor(balance / 3e4 * 15));
  let durationScore = 0;
  if (durationDays >= 60) durationScore = 50;
  else if (durationDays >= 40) durationScore = 40;
  else if (durationDays >= 25) durationScore = 28;
  else if (durationDays >= 14) durationScore = 18;
  else durationScore = Math.min(12, Math.floor(durationDays / 14 * 12));
  let totalScore = Math.min(100, Math.max(5, amountScore + durationScore));
  const riskFactors = [];
  if (balance >= 1e5) riskFactors.push(`\u0645\u0628\u0644\u063A \u0645\u0631\u062A\u0641\u0639 (${balance.toLocaleString("ar-EG")} ${currency})`);
  if (durationDays >= 30) riskFactors.push(`\u0639\u0645\u0631 \u0627\u0644\u062F\u064A\u0646 \u062A\u062C\u0627\u0648\u0632 ${durationDays} \u064A\u0648\u0645\u0627\u064B`);
  let urgencyLevel = "low";
  let reasoning = "";
  let suggestedAction = "";
  let recommendedTone = "friendly";
  let recommendedFollowUpDays = 7;
  if (totalScore >= 75 || balance >= 12e4 && durationDays >= 25 || durationDays >= 60) {
    urgencyLevel = "critical";
    totalScore = Math.max(80, totalScore);
    recommendedTone = "urgent";
    reasoning = `\u0645\u0633\u062A\u0648\u0649 \u062D\u0631\u062C \u062C\u062F\u0627\u064B: \u0639\u0645\u0631 \u0627\u0644\u062F\u064A\u0646 (${durationDays} \u064A\u0648\u0645\u0627\u064B) \u0645\u0639 \u0631\u0635\u064A\u062F \u0645\u0633\u062A\u062D\u0642 \u0645\u0631\u062A\u0641\u0639 (${balance.toLocaleString("ar-EG")} ${currency}). \u0627\u0644\u062A\u0623\u062E\u064A\u0631 \u064A\u0634\u0643\u0644 \u0639\u0628\u0626\u0627\u064B \u0639\u0644\u0649 \u0627\u0644\u0633\u064A\u0648\u0644\u0629 \u0648\u064A\u0633\u062A\u0648\u062C\u0628 \u0625\u062C\u0631\u0627\u0621\u064B \u0641\u0648\u0631\u064A\u0627\u064B.`;
    suggestedAction = "\u0627\u062A\u0635\u0627\u0644 \u0647\u0627\u062A\u0641\u064A \u0645\u0628\u0627\u0634\u0631 \u0645\u0639 \u0627\u0644\u0639\u0645\u064A\u0644 \u0648\u0625\u0631\u0633\u0627\u0644 \u0625\u0646\u0630\u0627\u0631 SMS \u0639\u0627\u062C\u0644 \u0644\u0644\u0645\u0637\u0627\u0644\u0628\u0629 \u0628\u0627\u0644\u062D\u0636\u0648\u0631 \u0623\u0648 \u0627\u0644\u0633\u062F\u0627\u062F \u0627\u0644\u0641\u0648\u0631\u064A.";
    recommendedFollowUpDays = 1;
  } else if (totalScore >= 50 || balance >= 7e4 || durationDays >= 30) {
    urgencyLevel = "high";
    recommendedTone = "firm";
    reasoning = `\u0623\u0648\u0644\u0648\u064A\u0629 \u0639\u0627\u0644\u064A\u0629: \u062A\u062C\u0627\u0648\u0632 \u0639\u0645\u0631 \u0627\u0644\u062F\u064A\u0646 ${durationDays} \u064A\u0648\u0645\u0627\u064B \u0628\u0645\u0628\u0644\u063A (${balance.toLocaleString("ar-EG")} ${currency}). \u064A\u0644\u0632\u0645 \u0627\u062A\u062E\u0627\u0630 \u0625\u062C\u0631\u0627\u0621 \u062D\u0627\u0632\u0645 \u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0633\u062F\u0627\u062F.`;
    suggestedAction = "\u0625\u0631\u0633\u0627\u0644 \u062A\u0630\u0643\u064A\u0631 SMS \u0631\u0633\u0645\u064A \u0648\u0645\u062A\u0627\u0628\u0639\u0629 \u0639\u0628\u0631 \u0648\u0627\u062A\u0633\u0627\u0628 \u0644\u062A\u062D\u062F\u064A\u062F \u0645\u0648\u0639\u062F \u0633\u062F\u0627\u062F \u0645\u062D\u062F\u062F.";
    recommendedFollowUpDays = 3;
  } else if (totalScore >= 30 || durationDays >= 15 || balance >= 35e3) {
    urgencyLevel = "medium";
    recommendedTone = "firm";
    reasoning = `\u0623\u0648\u0644\u0648\u064A\u0629 \u0645\u062A\u0648\u0633\u0637\u0629: \u0639\u0645\u0631 \u0627\u0644\u062F\u064A\u0646 ${durationDays} \u064A\u0648\u0645\u0627\u064B \u0648\u0631\u0635\u064A\u062F \u0645\u062A\u0648\u0633\u0637 (${balance.toLocaleString("ar-EG")} ${currency}). \u0627\u0644\u062D\u0633\u0627\u0628 \u0628\u062D\u0627\u062C\u0629 \u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u062F\u0648\u0631\u064A\u0629.`;
    suggestedAction = "\u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0644\u0629 \u062A\u0630\u0643\u064A\u0631 \u062F\u0648\u0631\u064A\u0629 \u0628\u0628\u064A\u0627\u0646 \u0627\u0644\u0631\u0635\u064A\u062F \u0648\u0637\u0644\u0628 \u0627\u0644\u0633\u062F\u0627\u062F.";
    recommendedFollowUpDays = 5;
  } else {
    urgencyLevel = "low";
    recommendedTone = "friendly";
    reasoning = `\u0623\u0648\u0644\u0648\u064A\u0629 \u0645\u0646\u062E\u0641\u0636\u0629: \u062F\u064A\u0646 \u062D\u062F\u064A\u062B \u0646\u0633\u0628\u064A\u0627\u064B (${durationDays} \u064A\u0648\u0645\u0627\u064B) \u0648\u0628\u0645\u0628\u0644\u063A \u0645\u062D\u062F\u0648\u062F (${balance.toLocaleString("ar-EG")} ${currency}).`;
    suggestedAction = "\u062A\u0630\u0643\u064A\u0631 \u0648\u062F\u064A \u0639\u0628\u0631 \u0631\u0633\u0627\u0626\u0644 SMS \u0623\u0648 \u0648\u0627\u062A\u0633\u0627\u0628 \u0641\u064A \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0634\u0647\u0631.";
    recommendedFollowUpDays = 10;
  }
  return {
    customerId: customer.id,
    urgencyLevel,
    urgencyScore: totalScore,
    debtDurationDays: durationDays,
    reasoning,
    suggestedAction,
    recommendedTone,
    riskFactors,
    recommendedFollowUpDays,
    analyzedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
app.post("/api/ai/prioritize-debts", async (req, res) => {
  const { customers, storeName, currency } = req.body;
  if (!customers || !Array.isArray(customers) || customers.length === 0) {
    return res.status(400).json({ error: "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0641\u0627\u0631\u063A\u0629" });
  }
  const curr = currency || "\u0631\u064A\u0627\u0644";
  const debtorCustomers = customers.filter((c) => c.balance > 0);
  if (debtorCustomers.length === 0) {
    return res.json({ analyses: [], usedFallback: false });
  }
  if (!ai || !apiKey) {
    console.warn("GEMINI_API_KEY not found in environment, using deterministic local evaluation");
    const fallbackResults = debtorCustomers.map((c) => calculateFallbackAnalysis(c, curr));
    return res.json({
      analyses: fallbackResults,
      usedFallback: true,
      message: "\u062A\u0645 \u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u0628\u0648\u0627\u0633\u0637\u0629 \u062E\u0648\u0627\u0631\u0632\u0645\u064A\u0629 \u0642\u064A\u0627\u0633 \u0627\u0644\u0645\u062E\u0627\u0637\u0631 \u0627\u0644\u0645\u062D\u0644\u064A\u0629 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0639\u0645\u0631 \u0627\u0644\u062F\u064A\u0646 \u0648\u062D\u062C\u0645 \u0627\u0644\u0645\u0628\u0644\u063A"
    });
  }
  try {
    const debtorsSummary = debtorCustomers.map((c) => {
      const durationDays = computeCustomerDuration(c);
      const recentTx = (c.transactions || []).slice(0, 4).map((t) => ({
        date: t.date,
        type: t.type,
        amount: t.amount,
        note: t.note
      }));
      return {
        id: c.id,
        name: c.name,
        phone: c.phone || "\u0628\u062F\u0648\u0646 \u0647\u0627\u062A\u0641",
        balance: c.balance,
        debit: c.debit,
        credit: c.credit,
        accountNumber: c.accountNumber || "",
        category: c.category || "",
        notes: c.notes || "",
        status: c.status || "unnotified",
        debtDurationDays: durationDays,
        recentTransactions: recentTx
      };
    });
    const prompt = `\u0623\u0646\u062A \u062E\u0628\u064A\u0631 \u0645\u0627\u0644\u064A \u0648\u0645\u062D\u0627\u0633\u0628\u064A \u0645\u062A\u062E\u0635\u0635 \u0641\u064A \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u062A\u062D\u0635\u064A\u0644 \u0648\u0645\u062A\u0627\u0628\u0639\u0629 \u062F\u064A\u0648\u0646 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0644\u0645\u062A\u062C\u0631 "${storeName || "\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u062A\u062C\u0627\u0631\u064A"}".
\u0645\u0647\u0645\u062A\u0643: \u062A\u0635\u0646\u064A\u0641 \u0643\u0644 \u0639\u0645\u064A\u0644 \u0645\u062F\u064A\u0646 \u0625\u0644\u0649 "\u0645\u0633\u062A\u0648\u0649 \u0627\u0633\u062A\u0639\u062C\u0627\u0644 / \u062F\u0631\u062C\u0629 \u0625\u0644\u062D\u0627\u062D \u0627\u0644\u062A\u062D\u0635\u064A\u0644" (Urgency Level) \u0644\u062A\u0631\u062A\u064A\u0628 \u0623\u0648\u0644\u0648\u064A\u0627\u062A \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0639\u0628\u0631 SMS \u0648\u0648\u0627\u062A\u0633\u0627\u0628.

\u0645\u0633\u062A\u0648\u064A\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0639\u062C\u0627\u0644 \u0627\u0644\u0623\u0631\u0628\u0639\u0629:
1. "critical" (\u062D\u0631\u062C \u062C\u062F\u0627\u064B):
   - \u062F\u064A\u0648\u0646 \u0642\u062F\u064A\u0645\u0629 (\u062A\u062C\u0627\u0648\u0632\u062A 45 \u0625\u0644\u0649 60+ \u064A\u0648\u0645\u0627\u064B) \u0628\u0645\u0628\u0627\u0644\u063A \u0643\u0628\u064A\u0631\u0629\u060C \u0623\u0648 \u062F\u064A\u0648\u0646 \u0636\u062E\u0645\u0629 \u062C\u062F\u0627\u064B \u062F\u0648\u0646 \u0633\u062F\u0627\u062F \u0645\u0646\u062A\u0638\u0645\u060C \u0623\u0648 \u0639\u0645\u0644\u0627\u0621 \u0644\u062F\u064A\u0647\u0645 \u0648\u0639\u0648\u062F \u0645\u0624\u062C\u0644\u0629 \u0648\u0645\u0645\u0627\u0637\u0644\u0629.
   - \u064A\u062A\u0637\u0644\u0628 \u062A\u062F\u062E\u0644\u0627\u064B \u0641\u0648\u0631\u064A\u0627\u064B (\u0627\u062A\u0635\u0627\u0644 \u0647\u0627\u062A\u0641\u064A \u0645\u0628\u0627\u0634\u0631\u060C \u0632\u064A\u0627\u0631\u0629\u060C \u0623\u0648 \u0625\u0646\u0630\u0627\u0631 \u0631\u0633\u0645\u064A).
2. "high" (\u0623\u0648\u0644\u0648\u064A\u0629 \u0639\u0627\u0644\u064A\u0629):
   - \u0645\u0628\u0627\u0644\u063A \u0645\u0639\u062A\u0628\u0631\u0629 \u0623\u0648 \u062F\u064A\u0648\u0646 \u062A\u062C\u0627\u0648\u0632\u062A 30 \u0625\u0644\u0649 45 \u064A\u0648\u0645\u0627\u064B \u062F\u0648\u0646 \u0633\u062F\u0627\u062F \u0643\u0627\u0641\u064D.
   - \u064A\u062A\u0637\u0644\u0628 \u0625\u0634\u0639\u0627\u0631\u0627\u064B \u0639\u0627\u062C\u0644\u0627\u064B \u0648\u0645\u062A\u0627\u0628\u0639\u0629 \u062D\u062B\u064A\u062B\u0629.
3. "medium" (\u0623\u0648\u0644\u0648\u064A\u0629 \u0645\u062A\u0648\u0633\u0637\u0629):
   - \u0645\u0628\u0627\u0644\u063A \u0645\u062A\u0648\u0633\u0637\u0629 \u0623\u0648 \u0645\u062F\u0629 \u062F\u064A\u0646 \u0645\u0627 \u0628\u064A\u0646 15 \u0625\u0644\u0649 30 \u064A\u0648\u0645\u0627\u064B \u0645\u0639 \u062D\u0631\u0643\u0629 \u062D\u0633\u0627\u0628 \u0637\u0628\u064A\u0639\u064A\u0629.
   - \u064A\u062A\u0637\u0644\u0628 \u062A\u0630\u0643\u064A\u0631\u0627\u064B \u0631\u0648\u062A\u064A\u0646\u064A\u0627\u064B \u0628\u0628\u064A\u0627\u0646 \u0627\u0644\u062D\u0633\u0627\u0628.
4. "low" (\u0623\u0648\u0644\u0648\u064A\u0629 \u0645\u0646\u062E\u0641\u0636\u0629):
   - \u062F\u064A\u0648\u0646 \u062D\u062F\u064A\u062B\u0629 (\u0623\u0642\u0644 \u0645\u0646 15 \u064A\u0648\u0645\u0627\u064B) \u0623\u0648 \u0645\u0628\u0627\u0644\u063A \u0628\u0633\u064A\u0637\u0629\u060C \u0623\u0648 \u0639\u0645\u0644\u0627\u0621 \u0645\u0646\u062A\u0638\u0645\u0648\u0646 \u0641\u064A \u062F\u0641\u0639\u0627\u062A\u0647\u0645.
   - \u062A\u0630\u0643\u064A\u0631 \u0648\u062F\u064A \u0641\u064A \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0634\u0647\u0631.

\u0627\u0644\u0639\u0645\u0644\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0629: ${curr}.
\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u062F\u064A\u0646\u064A\u0646 \u0644\u0644\u062A\u062D\u0644\u064A\u0644:
${JSON.stringify(debtorsSummary, null, 2)}

\u0642\u0645 \u0628\u062A\u062D\u0644\u064A\u0644 \u0643\u0644 \u0639\u0645\u064A\u0644 \u0628\u062F\u0642\u0629 \u0645\u0639 \u0630\u0643\u0631:
- urgencyLevel (critical | high | medium | low)
- urgencyScore (\u0645\u0646 1 \u0625\u0644\u0649 100\u060C \u062D\u064A\u062B 100 \u0623\u0642\u0635\u0649 \u062E\u0637\u0648\u0631\u0629 \u0648\u0627\u0633\u062A\u0639\u062C\u0627\u0644)
- debtDurationDays (\u0639\u0645\u0631 \u0627\u0644\u062F\u064A\u0646 \u0628\u0627\u0644\u064A\u0648\u0645)
- reasoning (\u0634\u0631\u062D \u062A\u062D\u0644\u064A\u0644\u064A \u0648\u0627\u0636\u062D \u0648\u0645\u0642\u0646\u0639 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u064A\u0631\u0628\u0637 \u0628\u064A\u0646 \u0645\u062F\u0629 \u0627\u0644\u062F\u064A\u0646 \u0648\u062D\u062C\u0645 \u0627\u0644\u0645\u0628\u0644\u063A \u0648\u0633\u062C\u0644 \u0627\u0644\u062D\u0631\u0643\u0627\u062A)
- suggestedAction (\u062E\u0637\u0648\u0629 \u0639\u0645\u0644\u064A\u0629 \u0645\u0648\u0635\u0649 \u0628\u0647\u0627 \u0644\u0644\u062A\u062D\u0635\u064A\u0644)
- recommendedTone (urgent | firm | friendly | formal)
- riskFactors (\u0642\u0627\u0626\u0645\u0629 \u0628\u0623\u0647\u0645 \u0639\u0648\u0627\u0645\u0644 \u0627\u0644\u062E\u0637\u0631 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629)
- recommendedFollowUpDays (\u0639\u062F\u062F \u0627\u0644\u0623\u064A\u0627\u0645 \u0627\u0644\u0645\u0648\u0635\u0649 \u0628\u0647\u0627 \u0642\u0628\u0644 \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629)`;
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "\u0623\u0646\u062A \u0646\u0638\u0627\u0645 \u0630\u0643\u064A \u0644\u062A\u062D\u0644\u064A\u0644 \u0645\u062E\u0627\u0637\u0631 \u0627\u0644\u062F\u064A\u0648\u0646 \u0648\u062A\u0635\u0646\u064A\u0641 \u0623\u0648\u0644\u0648\u064A\u0627\u062A \u0627\u0644\u062A\u062D\u0635\u064A\u0644 \u0627\u0644\u062A\u062C\u0627\u0631\u064A \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0628\u062F\u0642\u0629 \u0639\u0627\u0644\u064A\u0629.",
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "\u0642\u0627\u0626\u0645\u0629 \u0628\u0646\u062A\u0627\u0626\u062C \u062A\u0642\u064A\u064A\u0645 \u062F\u0631\u062C\u0627\u062A \u0625\u0644\u062D\u0627\u062D \u0627\u0644\u062A\u062D\u0635\u064A\u0644 \u0644\u0643\u0644 \u0639\u0645\u064A\u0644",
          items: {
            type: Type.OBJECT,
            properties: {
              customerId: { type: Type.STRING },
              urgencyLevel: {
                type: Type.STRING,
                description: "Must be one of: critical, high, medium, low"
              },
              urgencyScore: { type: Type.INTEGER, description: "Score from 1 to 100" },
              debtDurationDays: { type: Type.INTEGER, description: "Debt duration in days" },
              reasoning: { type: Type.STRING, description: "Clear Arabic rationale" },
              suggestedAction: { type: Type.STRING, description: "Recommended collection action in Arabic" },
              recommendedTone: {
                type: Type.STRING,
                description: "Tone: urgent, firm, friendly, or formal"
              },
              riskFactors: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Risk factor tags in Arabic"
              },
              recommendedFollowUpDays: { type: Type.INTEGER }
            },
            required: [
              "customerId",
              "urgencyLevel",
              "urgencyScore",
              "debtDurationDays",
              "reasoning",
              "suggestedAction",
              "recommendedTone",
              "riskFactors",
              "recommendedFollowUpDays"
            ]
          }
        }
      }
    });
    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("Gemini API returned empty response text");
    }
    const parsedArray = JSON.parse(textOutput);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const finalizedResults = parsedArray.map((item) => {
      let level = "medium";
      if (["critical", "high", "medium", "low"].includes(item.urgencyLevel)) {
        level = item.urgencyLevel;
      }
      return {
        customerId: String(item.customerId),
        urgencyLevel: level,
        urgencyScore: Math.min(100, Math.max(1, Number(item.urgencyScore) || 50)),
        debtDurationDays: Number(item.debtDurationDays) || 1,
        reasoning: String(item.reasoning || ""),
        suggestedAction: String(item.suggestedAction || ""),
        recommendedTone: item.recommendedTone || "firm",
        riskFactors: Array.isArray(item.riskFactors) ? item.riskFactors : [],
        recommendedFollowUpDays: Number(item.recommendedFollowUpDays) || 3,
        analyzedAt: nowIso
      };
    });
    return res.json({
      analyses: finalizedResults,
      usedFallback: false,
      message: "\u062A\u0645 \u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u0628\u0646\u062C\u0627\u062D \u0628\u0648\u0627\u0633\u0637\u0629 Gemini AI"
    });
  } catch (err) {
    console.error("Error in Gemini prioritization API:", err);
    const fallbackResults = debtorCustomers.map((c) => calculateFallbackAnalysis(c, curr));
    return res.json({
      analyses: fallbackResults,
      usedFallback: true,
      message: "\u062A\u0639\u0630\u0631 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0640 Gemini \u0645\u0624\u0642\u062A\u0627\u064B\u060C \u0648\u062A\u0645 \u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0639\u0645\u0631 \u0627\u0644\u062F\u064A\u0646 \u0648\u062D\u062C\u0645 \u0627\u0644\u0631\u0635\u064A\u062F \u0628\u062F\u0642\u0629."
    });
  }
});
app.post("/api/ai/analyze-customer", async (req, res) => {
  const { customer, storeName, currency } = req.body;
  if (!customer) {
    return res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0639\u0645\u064A\u0644 \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631\u0629" });
  }
  const curr = currency || "\u0631\u064A\u0627\u0644";
  if (!ai || !apiKey) {
    const fallback = calculateFallbackAnalysis(customer, curr);
    return res.json({ analysis: fallback, usedFallback: true });
  }
  try {
    const durationDays = computeCustomerDuration(customer);
    const prompt = `\u0642\u0645 \u0628\u062A\u062D\u0644\u064A\u0644 \u0648\u062A\u0642\u064A\u064A\u0645 \u062F\u0631\u062C\u0629 \u0625\u0644\u062D\u0627\u062D \u062A\u062D\u0635\u064A\u0644 \u0627\u0644\u0645\u062F\u064A\u0648\u0646\u064A\u0629 (Urgency Level) \u0644\u0644\u0639\u0645\u064A\u0644 \u0627\u0644\u062A\u0627\u0644\u064A \u0641\u064A \u0645\u062A\u062C\u0631 "${storeName || "\u0627\u0644\u0645\u062A\u062C\u0631"}":
\u0627\u0644\u0627\u0633\u0645: ${customer.name}
\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641: ${customer.phone || "\u063A\u064A\u0631 \u0645\u0633\u062C\u0644"}
\u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u0633\u062A\u062D\u0642 (\u0627\u0644\u062F\u064A\u0646): ${customer.balance} ${curr}
\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A (\u0639\u0644\u064A\u0647): ${customer.debit} ${curr}
\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0633\u062F\u0627\u062F (\u0644\u0647): ${customer.credit} ${curr}
\u0631\u0642\u0645 \u0627\u0644\u062D\u0633\u0627\u0628: ${customer.accountNumber || "\u0644\u0627 \u064A\u0648\u062C\u062F"}
\u0627\u0644\u062A\u0635\u0646\u064A\u0641: ${customer.category || "\u0639\u0627\u0645"}
\u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A: ${customer.notes || "\u0644\u0627 \u062A\u0648\u062C\u062F"}
\u0639\u0645\u0631 \u0627\u0644\u062F\u064A\u0646 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A: ${durationDays} \u064A\u0648\u0645\u0627\u064B
\u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0633\u0627\u0628\u0642\u0629: ${JSON.stringify(customer.transactions || [])}

\u0627\u0644\u0645\u0637\u0644\u0648\u0628:
\u062A\u0642\u064A\u064A\u0645 \u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0627\u0633\u062A\u0639\u062C\u0627\u0644: critical \u0623\u0648 high \u0623\u0648 medium \u0623\u0648 low \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0639\u0645\u0631 \u0627\u0644\u062F\u064A\u0646 \u0648\u062D\u062C\u0645 \u0627\u0644\u0645\u0628\u0644\u063A \u0648\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0633\u062F\u0627\u062F.
\u0623\u0639\u0637\u0650 \u062F\u0631\u062C\u0629 \u062E\u0637\u0648\u0631\u0629 \u0645\u0646 1 \u0625\u0644\u0649 100\u060C \u0648\u0634\u0631\u062D\u0627\u064B \u0648\u0627\u0641\u064A\u0627\u064B \u0628\u0627\u0644\u0623\u0633\u0628\u0627\u0628 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629\u060C \u0648\u062E\u0637\u0648\u0629 \u0639\u0645\u0644\u064A\u0629 \u0644\u0644\u062A\u062D\u0635\u064A\u0644\u060C \u0648\u0646\u0628\u0631\u0629 \u0627\u0644\u0631\u0633\u0627\u0644\u0629\u060C \u0648\u0639\u0648\u0627\u0645\u0644 \u0627\u0644\u0645\u062E\u0627\u0637\u0631\u0629.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "\u0623\u0646\u062A \u0645\u0633\u062A\u0634\u0627\u0631 \u0645\u0627\u0644\u064A \u0645\u062A\u062E\u0635\u0635 \u0641\u064A \u062A\u062D\u0644\u064A\u0644 \u062F\u064A\u0648\u0646 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u062A\u0631\u062A\u064A\u0628 \u0623\u0648\u0644\u0648\u064A\u0627\u062A \u0627\u0644\u0633\u062F\u0627\u062F \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629.",
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerId: { type: Type.STRING },
            urgencyLevel: {
              type: Type.STRING,
              description: "Must be critical, high, medium, or low"
            },
            urgencyScore: { type: Type.INTEGER },
            debtDurationDays: { type: Type.INTEGER },
            reasoning: { type: Type.STRING },
            suggestedAction: { type: Type.STRING },
            recommendedTone: { type: Type.STRING },
            riskFactors: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            recommendedFollowUpDays: { type: Type.INTEGER }
          },
          required: [
            "customerId",
            "urgencyLevel",
            "urgencyScore",
            "debtDurationDays",
            "reasoning",
            "suggestedAction",
            "recommendedTone",
            "riskFactors",
            "recommendedFollowUpDays"
          ]
        }
      }
    });
    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("Empty response from model");
    }
    const item = JSON.parse(textOutput);
    let level = "medium";
    if (["critical", "high", "medium", "low"].includes(item.urgencyLevel)) {
      level = item.urgencyLevel;
    }
    const result = {
      customerId: customer.id,
      urgencyLevel: level,
      urgencyScore: Math.min(100, Math.max(1, Number(item.urgencyScore) || 50)),
      debtDurationDays: Number(item.debtDurationDays) || durationDays,
      reasoning: String(item.reasoning || ""),
      suggestedAction: String(item.suggestedAction || ""),
      recommendedTone: item.recommendedTone || "firm",
      riskFactors: Array.isArray(item.riskFactors) ? item.riskFactors : [],
      recommendedFollowUpDays: Number(item.recommendedFollowUpDays) || 3,
      analyzedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return res.json({ analysis: result, usedFallback: false });
  } catch (err) {
    console.error("Error analyzing customer with Gemini:", err);
    const fallback = calculateFallbackAnalysis(customer, curr);
    return res.json({ analysis: fallback, usedFallback: true });
  }
});
function calculateFallbackInstallmentPlans(customer, storeName = "\u0627\u0644\u0645\u062A\u062C\u0631", curr = "\u0631\u064A\u0627\u0644", storePhone = "") {
  const debt = Math.max(0, customer.balance);
  const urgency = customer.urgencyLevel || "medium";
  const now = /* @__PURE__ */ new Date();
  function formatDate(d) {
    return d.toISOString().split("T")[0];
  }
  function addDays(d, days) {
    const res = new Date(d);
    res.setDate(res.getDate() + days);
    return formatDate(res);
  }
  function addMonths(d, months) {
    const res = new Date(d);
    res.setMonth(res.getMonth() + months);
    return formatDate(res);
  }
  const startDate = /* @__PURE__ */ new Date();
  startDate.setDate(now.getDate() + 7);
  const startStr = formatDate(startDate);
  function createSchedule(total, down, count, interval) {
    const remaining = Math.max(0, total - down);
    const base = Math.floor(remaining / count);
    const remainder = remaining - base * count;
    const schedule = [];
    for (let i = 1; i <= count; i++) {
      let dueDate = startStr;
      if (interval === "weekly") dueDate = addDays(startDate, (i - 1) * 7);
      else if (interval === "biweekly") dueDate = addDays(startDate, (i - 1) * 14);
      else dueDate = addMonths(startDate, i - 1);
      schedule.push({
        installmentNumber: i,
        dueDate,
        amount: i === 1 ? base + remainder : base,
        label: `\u0627\u0644\u0642\u0633\u0637 ${i} \u0645\u0646 ${count}`,
        status: "pending"
      });
    }
    return schedule;
  }
  function makeSms(title, down, count, installmentAmt, interval, schedule) {
    const downText = down > 0 ? `
- \u062F\u0641\u0639\u0629 \u0645\u0642\u062F\u0645\u0629: ${down.toLocaleString("ar-EG")} ${curr}` : "";
    const schedSummary = schedule.slice(0, 3).map((s) => `\u2022 \u0642\u0633\u0637 ${s.installmentNumber}: ${s.amount.toLocaleString("ar-EG")} ${curr} (${s.dueDate})`).join("\n");
    const moreText = schedule.length > 3 ? `
... \u0648\u0628\u0627\u0642\u064A \u0627\u0644\u0623\u0642\u0633\u0627\u0637 \u062D\u062A\u0649 \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u062C\u062F\u0648\u0644\u0629` : "";
    return `\u0627\u0644\u0623\u062E/\u0627\u0644\u0623\u062E\u062A ${customer.name} \u0627\u0644\u0645\u062D\u062A\u0631\u0645\u060C
\u062A\u062D\u064A\u0629 \u0637\u064A\u0628\u0629 \u0645\u0646 ${storeName}.
\u062A\u064A\u0633\u064A\u0631\u0627\u064B \u0644\u0633\u062F\u0627\u062F \u062D\u0633\u0627\u0628\u0643\u0645 \u0627\u0644\u0645\u0633\u062A\u062D\u0642 (${debt.toLocaleString("ar-EG")} ${curr})\u060C \u0646\u0642\u062A\u0631\u062D \u0639\u0644\u064A\u0643\u0645 \u062E\u0637\u0629 (${title}):${downText}
- \u0639\u062F\u062F \u0627\u0644\u0623\u0642\u0633\u0627\u0637: ${count} \u0623\u0642\u0633\u0627\u0637 (${interval})
- \u0642\u064A\u0645\u0629 \u0627\u0644\u0642\u0633\u0637: ${installmentAmt.toLocaleString("ar-EG")} ${curr}
\u0645\u0648\u0627\u0639\u064A\u062F \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642 \u0627\u0644\u0645\u0642\u062A\u0631\u062D\u0629:
${schedSummary}${moreText}
\u064A\u0631\u062C\u0649 \u062A\u0623\u0643\u064A\u062F \u0645\u0648\u0627\u0641\u0642\u062A\u0643\u0645 \u0628\u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627 \u0639\u0644\u0649 \u0647\u0627\u062A\u0641: ${storePhone || "\u0627\u0644\u0645\u062A\u062C\u0631"}.
\u0634\u0627\u0643\u0631\u064A\u0646 \u062D\u0633\u0646 \u062A\u0639\u0627\u0648\u0646\u0643\u0645.`;
  }
  const fastDownPct = urgency === "critical" ? 0.4 : urgency === "high" ? 0.3 : 0.25;
  const fastCount = urgency === "critical" ? 2 : 3;
  const fastInterval = urgency === "critical" ? "weekly" : "biweekly";
  const fastDown = Math.round(debt * fastDownPct);
  const fastSched = createSchedule(debt, fastDown, fastCount, fastInterval);
  const fastAmt = fastSched.length > 0 ? fastSched[0].amount : 0;
  const fastEnd = fastSched.length > 0 ? fastSched[fastSched.length - 1].dueDate : startStr;
  const balDownPct = debt >= 1e5 ? 0.2 : 0.15;
  const balCount = debt >= 1e5 ? 4 : 3;
  const balDown = Math.round(debt * balDownPct);
  const balSched = createSchedule(debt, balDown, balCount, "monthly");
  const balAmt = balSched.length > 0 ? balSched[0].amount : 0;
  const balEnd = balSched.length > 0 ? balSched[balSched.length - 1].dueDate : startStr;
  const relDownPct = 0.1;
  const relCount = debt >= 1e5 ? 6 : 5;
  const relDown = Math.round(debt * relDownPct);
  const relSched = createSchedule(debt, relDown, relCount, "monthly");
  const relAmt = relSched.length > 0 ? relSched[0].amount : 0;
  const relEnd = relSched.length > 0 ? relSched[relSched.length - 1].dueDate : startStr;
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  return [
    {
      id: `plan_fast_${Date.now()}`,
      planTitle: urgency === "critical" ? "\u062E\u0637\u0629 \u0627\u0644\u062A\u0633\u0648\u064A\u0629 \u0627\u0644\u0639\u0627\u062C\u0644\u0629 (\u062F\u0641\u0639\u0629 \u0641\u0648\u0631\u064A\u0629 + \u0642\u0633\u0637\u064A\u0646)" : "\u062E\u0637\u0629 \u0627\u0644\u0633\u062F\u0627\u062F \u0627\u0644\u0633\u0631\u064A\u0639 \u0648\u0627\u0644\u062A\u0633\u0648\u064A\u0629 \u0627\u0644\u0648\u062F\u064A\u0629",
      strategyType: "fast_recovery",
      totalDebt: debt,
      downPayment: fastDown,
      numberOfInstallments: fastCount,
      interval: fastInterval,
      installmentAmount: fastAmt,
      startDate: startStr,
      endDate: fastEnd,
      schedule: fastSched,
      reasoning: `\u062E\u0637\u0629 \u0645\u0635\u0645\u0645\u0629 \u0644\u0645\u0639\u0627\u0644\u062C\u0629 \u0623\u0648\u0644\u0648\u064A\u0629 (${urgency === "critical" ? "\u062D\u0631\u062C \u062C\u062F\u0627\u064B" : "\u0639\u0627\u0644\u064A\u0629"}): \u062A\u0623\u0645\u064A\u0646 \u0646\u0633\u0628\u0629 ${Math.round(fastDownPct * 100)}% \u0643\u0645\u0642\u062F\u0645 \u0641\u0648\u0631\u0627\u064B \u0648\u0633\u062F\u0627\u062F \u0627\u0644\u0628\u0627\u0642\u064A \u0633\u0631\u064A\u0639\u0627\u064B \u0644\u062A\u0642\u0644\u064A\u0635 \u0627\u0644\u0645\u062E\u0627\u0637\u0631\u0629.`,
      smsMessageText: makeSms("\u0627\u0644\u0633\u062F\u0627\u062F \u0627\u0644\u0633\u0631\u064A\u0639", fastDown, fastCount, fastAmt, fastInterval === "weekly" ? "\u0623\u0633\u0628\u0648\u0639\u064A\u0627\u064B" : "\u0643\u0644 \u0623\u0633\u0628\u0648\u0639\u064A\u0646", fastSched),
      createdAt: nowIso
    },
    {
      id: `plan_bal_${Date.now() + 1}`,
      planTitle: "\u062E\u0637\u0629 \u0627\u0644\u0623\u0642\u0633\u0627\u0637 \u0627\u0644\u0634\u0647\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u0648\u0627\u0632\u0646\u0629 (3-4 \u0623\u0634\u0647\u0631)",
      strategyType: "balanced",
      totalDebt: debt,
      downPayment: balDown,
      numberOfInstallments: balCount,
      interval: "monthly",
      installmentAmount: balAmt,
      startDate: startStr,
      endDate: balEnd,
      schedule: balSched,
      reasoning: "\u0627\u0644\u062E\u0637\u0629 \u0627\u0644\u0645\u062B\u0627\u0644\u064A\u0629 \u0644\u0623\u063A\u0644\u0628 \u0627\u0644\u0639\u0645\u0644\u0627\u0621: \u062F\u0641\u0639\u0627\u062A \u0634\u0647\u0631\u064A\u0629 \u0645\u0646\u062A\u0638\u0645\u0629 \u062A\u0636\u0645\u0646 \u062A\u062F\u0641\u0642\u0627\u062A \u0645\u0627\u0644\u064A\u0629 \u0644\u0644\u0645\u062A\u062C\u0631 \u0648\u062A\u0646\u0627\u0633\u0628 \u0642\u062F\u0631\u0629 \u0627\u0644\u0639\u0645\u064A\u0644 \u0639\u0644\u0649 \u0627\u0644\u0633\u062F\u0627\u062F.",
      smsMessageText: makeSms("\u0627\u0644\u0623\u0642\u0633\u0627\u0637 \u0627\u0644\u0634\u0647\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u0648\u0627\u0632\u0646\u0629", balDown, balCount, balAmt, "\u0634\u0647\u0631\u064A\u0627\u064B", balSched),
      createdAt: nowIso
    },
    {
      id: `plan_rel_${Date.now() + 2}`,
      planTitle: "\u062E\u0637\u0629 \u0627\u0644\u062A\u064A\u0633\u064A\u0631 \u0648\u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0627\u0644\u0645\u0631\u0646\u0629 \u0627\u0644\u0645\u062E\u0641\u0641\u0629",
      strategyType: "relaxed",
      totalDebt: debt,
      downPayment: relDown,
      numberOfInstallments: relCount,
      interval: "monthly",
      installmentAmount: relAmt,
      startDate: startStr,
      endDate: relEnd,
      schedule: relSched,
      reasoning: "\u062E\u0637\u0629 \u0645\u064A\u0633\u0631\u0629 \u0628\u0623\u0642\u0633\u0627\u0637 \u0634\u0647\u0631\u064A\u0629 \u0635\u063A\u064A\u0631\u0629 \u0644\u0644\u062F\u064A\u0648\u0646 \u0627\u0644\u0645\u0631\u062A\u0641\u0639\u0629 \u062A\u0634\u062C\u0639 \u0627\u0644\u0639\u0645\u064A\u0644 \u0639\u0644\u0649 \u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645 \u062F\u0648\u0646 \u062A\u0639\u062B\u0631.",
      smsMessageText: makeSms("\u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0627\u0644\u0634\u0647\u0631\u064A\u0629 \u0627\u0644\u0645\u064A\u0633\u0631\u0629", relDown, relCount, relAmt, "\u0634\u0647\u0631\u064A\u0627\u064B", relSched),
      createdAt: nowIso
    }
  ];
}
app.post("/api/ai/suggest-installment-plans", async (req, res) => {
  const { customer, storeName, currency, storePhone } = req.body;
  const curr = currency || "\u0631\u064A\u0627\u0644";
  if (!customer || typeof customer.balance !== "number" || customer.balance <= 0) {
    return res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0639\u0645\u064A\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629 \u0623\u0648 \u0627\u0644\u0631\u0635\u064A\u062F \u0644\u064A\u0633 \u0645\u062F\u064A\u0648\u0646\u064A\u0629 \u0645\u0648\u062C\u0628\u0629" });
  }
  if (!ai) {
    const fallbackPlans = calculateFallbackInstallmentPlans(customer, storeName, curr, storePhone);
    return res.json({ plans: fallbackPlans, usedFallback: true });
  }
  try {
    const durationDays = computeCustomerDuration(customer);
    const urgency = customer.urgencyLevel || "medium";
    const urgencyScore = customer.urgencyScore || 50;
    const prompt = `\u0623\u0646\u062A \u062E\u0628\u064A\u0631 \u0645\u0627\u0644\u064A \u0641\u064A \u0625\u0639\u0627\u062F\u0629 \u062C\u062F\u0648\u0644\u0629 \u0627\u0644\u062F\u064A\u0648\u0646 \u0648\u062A\u0635\u0645\u064A\u0645 \u062E\u0637\u0637 \u0623\u0642\u0633\u0627\u0637 \u0644\u0644\u0639\u0645\u0644\u0627\u0621 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629.
\u0642\u0645 \u0628\u0625\u0646\u0634\u0627\u0621 3 \u062E\u0637\u0637 \u062A\u0642\u0633\u064A\u0637 \u0645\u062C\u062F\u0648\u0644\u0629 \u0648\u0627\u0636\u062D\u0629 \u0648\u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062A\u0637\u0628\u064A\u0642 \u0644\u0644\u0639\u0645\u064A\u0644 \u0627\u0644\u062A\u0627\u0644\u064A \u0641\u064A \u0645\u062A\u062C\u0631 "${storeName || "\u0627\u0644\u0645\u062A\u062C\u0631"}":
- \u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064A\u0644: ${customer.name}
- \u0647\u0627\u062A\u0641 \u0627\u0644\u0639\u0645\u064A\u0644: ${customer.phone || "\u063A\u064A\u0631 \u0645\u0633\u062C\u0644"}
- \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062F\u064A\u0646 \u0627\u0644\u0645\u0633\u062A\u062D\u0642: ${customer.balance} ${curr}
- \u062F\u0631\u062C\u0629 \u0625\u0644\u062D\u0627\u062D \u0627\u0644\u062A\u062D\u0635\u064A\u0644 \u0627\u0644\u062D\u0627\u0644\u064A\u0629: ${urgency} (\u0627\u0644\u062F\u0631\u062C\u0629: ${urgencyScore}/100)
- \u0639\u0645\u0631 \u0627\u0644\u062F\u064A\u0646: ${durationDays} \u064A\u0648\u0645\u0627\u064B
- \u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u0639\u0645\u064A\u0644: ${customer.category || "\u0639\u0627\u0645"}
- \u0647\u0627\u062A\u0641 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0628\u0627\u0644\u0645\u062A\u062C\u0631: ${storePhone || ""}

\u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0628\u062F\u0642\u0629:
\u0625\u0646\u0634\u0627\u0621 3 \u062E\u0637\u0637 \u0627\u0633\u062A\u0631\u0627\u062A\u064A\u062C\u064A\u0629 \u0645\u062E\u062A\u0644\u0641\u0629:
1. fast_recovery (\u062E\u0637\u0629 \u0627\u0644\u0633\u062F\u0627\u062F \u0627\u0644\u0633\u0631\u064A\u0639 \u0648\u0627\u0644\u062A\u0633\u0648\u064A\u0629 \u0627\u0644\u0641\u0648\u0631\u064A\u0629): \u062A\u0646\u0627\u0633\u0628 \u0627\u0644\u0627\u0633\u062A\u0639\u062C\u0627\u0644 \u0627\u0644\u0639\u0627\u0644\u064A \u0648\u062A\u0637\u0644\u0628 \u062F\u0641\u0639\u0629 \u0623\u0648\u0644\u0649 \u0645\u0642\u062F\u0645\u0629 \u0645\u0639\u062A\u0628\u0631\u0629 (30%-50%) \u0648\u062A\u0642\u0633\u064A\u0637 \u0627\u0644\u0628\u0627\u0642\u064A \u0639\u0644\u0649 2 \u0625\u0644\u0649 3 \u0623\u0642\u0633\u0627\u0637 \u0633\u0631\u064A\u0639\u0629 (\u0623\u0633\u0628\u0648\u0639\u064A\u0629 \u0623\u0648 \u0646\u0635\u0641 \u0634\u0647\u0631\u064A\u0629).
2. balanced (\u062E\u0637\u0629 \u0627\u0644\u0623\u0642\u0633\u0627\u0637 \u0627\u0644\u0645\u062A\u0648\u0627\u0632\u0646\u0629): \u062F\u0641\u0639\u0629 \u0645\u0642\u062F\u0645\u0629 \u0645\u0639\u062A\u062F\u0644\u0629 (15%-25%) \u06483 \u0625\u0644\u0649 4 \u0623\u0642\u0633\u0627\u0637 \u0634\u0647\u0631\u064A\u0629 \u0645\u0631\u064A\u062D\u0629.
3. relaxed (\u062E\u0637\u0629 \u0627\u0644\u062A\u064A\u0633\u064A\u0631 \u0648\u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0627\u0644\u0645\u0631\u0646\u0629): \u062F\u0641\u0639\u0629 \u0623\u0648\u0644\u0649 \u0631\u0645\u0632\u064A\u0629 (5%-10%) \u06484 \u0625\u0644\u0649 6 \u0623\u0642\u0633\u0627\u0637 \u0634\u0647\u0631\u064A\u0629 \u0635\u063A\u064A\u0631\u0629 \u0644\u0644\u062A\u0634\u062C\u064A\u0639 \u0639\u0644\u0649 \u0627\u0644\u0633\u062F\u0627\u062F.

\u0644\u0643\u0644 \u062E\u0637\u0629:
- \u0627\u062D\u0633\u0628 \u062C\u062F\u0648\u0644 \u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E \u0628\u062D\u064A\u062B \u064A\u0628\u062F\u0623 \u0628\u0639\u062F \u0623\u0633\u0628\u0648\u0639 \u0645\u0646 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u064A\u0648\u0645\u060C \u0648\u0627\u0630\u0643\u0631 \u0643\u0644 \u0642\u0633\u0637 \u0648\u062A\u0627\u0631\u064A\u062E\u0647 \u0648\u0645\u0628\u0644\u063A\u0647.
- \u0627\u0643\u062A\u0628 \u0646\u0635 \u0631\u0633\u0627\u0644\u0629 SMS \u0648\u0648\u0627\u062A\u0633\u0627\u0628 \u0643\u0627\u0645\u0644 \u0648\u0645\u0647\u0630\u0628 \u0648\u0645\u0642\u0646\u0639 \u0628\u0627\u0644\u0644\u0647\u062C\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0645\u0647\u0646\u064A\u0629\u060C \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064A\u0644 \u0648\u0627\u0644\u0645\u062A\u062C\u0631 \u0648\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062F\u064A\u0646 \u0648\u0627\u0644\u062F\u0641\u0639\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u0648\u0627\u0644\u0623\u0642\u0633\u0627\u0637 \u0648\u062A\u0648\u0627\u0631\u064A\u062E\u0647\u0627 \u0648\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062A\u0648\u0627\u0635\u0644.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "\u0623\u0646\u062A \u0645\u0633\u062A\u0634\u0627\u0631 \u0645\u0627\u0644\u064A \u0645\u062A\u062E\u0635\u0635 \u0641\u064A \u062C\u062F\u0648\u0644\u0629 \u0648\u062A\u062D\u0635\u064A\u0644 \u062F\u064A\u0648\u0646 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u062A\u0635\u0645\u064A\u0645 \u062E\u0637\u0637 \u0623\u0642\u0633\u0627\u0637 \u0645\u0644\u0627\u0626\u0645\u0629 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629.",
        temperature: 0.25,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plans: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  planTitle: { type: Type.STRING },
                  strategyType: {
                    type: Type.STRING,
                    description: "fast_recovery, balanced, or relaxed"
                  },
                  totalDebt: { type: Type.NUMBER },
                  downPayment: { type: Type.NUMBER },
                  numberOfInstallments: { type: Type.INTEGER },
                  interval: {
                    type: Type.STRING,
                    description: "weekly, biweekly, or monthly"
                  },
                  installmentAmount: { type: Type.NUMBER },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  schedule: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        installmentNumber: { type: Type.INTEGER },
                        dueDate: { type: Type.STRING },
                        amount: { type: Type.NUMBER },
                        label: { type: Type.STRING },
                        status: { type: Type.STRING, description: "pending or paid" }
                      },
                      required: ["installmentNumber", "dueDate", "amount", "label", "status"]
                    }
                  },
                  reasoning: { type: Type.STRING },
                  smsMessageText: { type: Type.STRING }
                },
                required: [
                  "planTitle",
                  "strategyType",
                  "totalDebt",
                  "downPayment",
                  "numberOfInstallments",
                  "interval",
                  "installmentAmount",
                  "startDate",
                  "endDate",
                  "schedule",
                  "reasoning",
                  "smsMessageText"
                ]
              }
            },
            aiNote: { type: Type.STRING }
          },
          required: ["plans"]
        }
      }
    });
    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("Empty response from model for installment plans");
    }
    const parsed = JSON.parse(textOutput);
    if (!parsed || !Array.isArray(parsed.plans) || parsed.plans.length === 0) {
      throw new Error("Invalid plans array in model response");
    }
    const formattedPlans = parsed.plans.map((p, idx) => {
      let st = "balanced";
      if (["fast_recovery", "balanced", "relaxed"].includes(p.strategyType)) {
        st = p.strategyType;
      }
      let interv = "monthly";
      if (["weekly", "biweekly", "monthly"].includes(p.interval)) {
        interv = p.interval;
      }
      return {
        id: `plan_ai_${Date.now()}_${idx}`,
        planTitle: String(p.planTitle || `\u062E\u0637\u0629 \u0645\u0642\u062A\u0631\u062D\u0629 ${idx + 1}`),
        strategyType: st,
        totalDebt: Number(p.totalDebt) || customer.balance,
        downPayment: Math.round(Number(p.downPayment) || 0),
        numberOfInstallments: Math.max(1, Number(p.numberOfInstallments) || 3),
        interval: interv,
        installmentAmount: Math.round(Number(p.installmentAmount) || Math.floor(customer.balance / 3)),
        startDate: String(p.startDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]),
        endDate: String(p.endDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]),
        schedule: Array.isArray(p.schedule) ? p.schedule.map((s, sIdx) => ({
          installmentNumber: Number(s.installmentNumber) || sIdx + 1,
          dueDate: String(s.dueDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]),
          amount: Math.round(Number(s.amount) || 0),
          label: String(s.label || `\u0627\u0644\u0642\u0633\u0637 ${sIdx + 1}`),
          status: s.status === "paid" ? "paid" : "pending"
        })) : [],
        reasoning: String(p.reasoning || ""),
        smsMessageText: String(p.smsMessageText || ""),
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    });
    return res.json({
      plans: formattedPlans,
      usedFallback: false,
      aiNote: parsed.aiNote || "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u062E\u0637\u0637 \u0627\u0644\u062A\u0642\u0633\u064A\u0637 \u0648\u062A\u062D\u0644\u064A\u0644\u0647\u0627 \u0628\u0646\u062C\u0627\u062D \u0628\u0648\u0627\u0633\u0637\u0629 Gemini AI"
    });
  } catch (err) {
    console.error("Error generating installment plans with Gemini:", err);
    const fallbackPlans = calculateFallbackInstallmentPlans(customer, storeName, curr, storePhone);
    return res.json({
      plans: fallbackPlans,
      usedFallback: true,
      aiNote: "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u062E\u0637\u0637 \u0627\u0644\u062A\u0642\u0633\u064A\u0637 \u0645\u062D\u0644\u064A\u0627\u064B \u0628\u062F\u0642\u0629 \u0645\u062A\u0646\u0627\u0647\u064A\u0629"
    });
  }
});
app.get(["/api/download/html-to-apk-builder.zip", "/html-to-apk-builder.zip"], (_req, res) => {
  const zipPath = path.resolve(process.cwd(), "public", "html-to-apk-builder.zip");
  if (fs.existsSync(zipPath)) {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="html-to-apk-builder.zip"');
    return res.sendFile(zipPath);
  }
  return res.status(404).json({ error: "Zip file not found" });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        port: PORT
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve("dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve("dist", "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
