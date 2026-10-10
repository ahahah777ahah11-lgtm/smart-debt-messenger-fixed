import JSZip from 'jszip';

export interface ApkBuilderOptions {
  appName: string;
  packageName: string;
  versionName: string;
  versionCode: number;
  mode: 'offline' | 'online';
  webUrl?: string;
  primaryColor: string;
  enableSms: boolean;
  enableCamera: boolean;
  enableStorage: boolean;
  allowZoom: boolean;
}

export const DEFAULT_APK_OPTIONS: ApkBuilderOptions = {
  appName: 'Smart Debt Messenger',
  packageName: 'com.smartdebt.app',
  versionName: '1.0.0',
  versionCode: 1,
  mode: 'offline',
  webUrl: 'https://ais-dev-i73sqlbhgq7umnsf2tajel-181592326577.europe-west2.run.app',
  primaryColor: '#4f46e5',
  enableSms: true,
  enableCamera: true,
  enableStorage: true,
  allowZoom: false
};

/**
 * Generates the AndroidManifest.xml string
 */
export function generateAndroidManifest(options: ApkBuilderOptions): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${options.packageName}">

    <!-- Network Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />

    ${options.enableSms ? `<!-- SMS & Call Intent Permissions -->
    <uses-permission android:name="android.permission.SEND_SMS" />
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />` : ''}

    ${options.enableCamera ? `<!-- Camera Permission (for receipts/documents) -->
    <uses-permission android:name="android.permission.CAMERA" />` : ''}

    ${options.enableStorage ? `<!-- Storage Permissions (for Excel/PDF exports) -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" />` : ''}

    <!-- Queries for WhatsApp, SMS, and Phone dialer intents -->
    <queries>
        <package android:name="com.whatsapp" />
        <package android:name="com.whatsapp.w4b" />
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="sms" />
        </intent>
        <intent>
            <action android:name="android.intent.action.SENDTO" />
            <data android:scheme="smsto" />
        </intent>
        <intent>
            <action android:name="android.intent.action.DIAL" />
            <data android:scheme="tel" />
        </intent>
    </queries>

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true"
        android:hardwareAccelerated="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`;
}

/**
 * Generates MainActivity.java
 */
export function generateMainActivityJava(options: ApkBuilderOptions): string {
  const packageDir = options.packageName;
  const loadUrlCode = options.mode === 'online' && options.webUrl
    ? `mWebView.loadUrl("${options.webUrl}");`
    : `mWebView.loadUrl("file:///android_asset/www/index.html");`;

  return `package ${packageDir};

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.Toast;

public class MainActivity extends Activity {

    private WebView mWebView;
    private ProgressBar mProgressBar;
    private ValueCallback<Uri[]> mUploadMessage;
    private static final int FILECHOOSER_RESULTCODE = 1001;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        mWebView = findViewById(R.id.webview);
        mProgressBar = findViewById(R.id.progressBar);

        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setBuiltInZoomControls(${options.allowZoom});
        settings.setDisplayZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUserAgentString(settings.getUserAgentString() + " HTML2APK-App");

        mWebView.setWebViewClient(new CustomWebViewClient());
        mWebView.setWebChromeClient(new CustomWebChromeClient());

        // Load targeted application
        ${loadUrlCode}
    }

    private class CustomWebViewClient extends WebViewClient {
        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            super.onPageStarted(view, url, favicon);
            if (mProgressBar != null) mProgressBar.setVisibility(View.VISIBLE);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            if (mProgressBar != null) mProgressBar.setVisibility(View.GONE);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            super.onReceivedError(view, request, error);
            if (request.isForMainFrame()) {
                // If live URL failed, fallback to offline bundled version
                view.loadUrl("file:///android_asset/www/index.html");
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();
            return handleUrlIntents(url);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return handleUrlIntents(url);
        }

        private boolean handleUrlIntents(String url) {
            if (url.startsWith("sms:") || url.startsWith("smsto:") ||
                url.startsWith("tel:") || url.startsWith("mailto:") ||
                url.startsWith("whatsapp:") || url.contains("wa.me") ||
                url.startsWith("intent:")) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "التطبيق المطلوب غير متوفر على الجهاز", Toast.LENGTH_SHORT).show();
                    return true;
                }
            }
            return false;
        }
    }

    private class CustomWebChromeClient extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            if (mProgressBar != null) {
                mProgressBar.setProgress(newProgress);
                if (newProgress == 100) {
                    mProgressBar.setVisibility(View.GONE);
                }
            }
        }

        // Support file uploads (Excel, PDF, CSV, Images)
        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
            if (mUploadMessage != null) {
                mUploadMessage.onReceiveValue(null);
            }
            mUploadMessage = filePathCallback;

            Intent intent = fileChooserParams.createIntent();
            try {
                startActivityForResult(intent, FILECHOOSER_RESULTCODE);
            } catch (Exception e) {
                mUploadMessage = null;
                return false;
            }
            return true;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILECHOOSER_RESULTCODE) {
            if (mUploadMessage == null) return;
            mUploadMessage.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            mUploadMessage = null;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && mWebView.canGoBack()) {
            mWebView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
`;
}

/**
 * Generates app-level build.gradle
 */
export function generateAppBuildGradle(options: ApkBuilderOptions): string {
  return `plugins {
    id 'com.android.application'
}

android {
    namespace '${options.packageName}'
    compileSdk 34

    defaultConfig {
        applicationId "${options.packageName}"
        minSdk 21
        targetSdk 34
        versionCode ${options.versionCode}
        versionName "${options.versionName}"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
        debug {
            applicationIdSuffix ".debug"
            debuggable true
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
}
`;
}

/**
 * Generates root build.gradle
 */
export function generateRootBuildGradle(): string {
  return `// Top-level build file where you can add configuration options common to all sub-projects/modules.
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.2'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}
`;
}

/**
 * Generates settings.gradle
 */
export function generateSettingsGradle(options: ApkBuilderOptions): string {
  return `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "${options.appName.replace(/[^a-zA-Z0-9_-]/g, '_')}"
include ':app'
`;
}

/**
 * Generates layout activity_main.xml
 */
export function generateActivityMainXml(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#0f172a">

    <ProgressBar
        android:id="@+id/progressBar"
        style="?android:attr/progressBarStyleHorizontal"
        android:layout_width="match_parent"
        android:layout_height="4dp"
        android:layout_alignParentTop="true"
        android:progressDrawable="@android:drawable/progress_horizontal"
        android:indeterminate="false"
        android:visibility="gone" />

    <WebView
        android:id="@+id/webview"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:layout_below="@id/progressBar" />

</RelativeLayout>
`;
}

/**
 * Generates res/values/strings.xml
 */
export function generateStringsXml(options: ApkBuilderOptions): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${options.appName}</string>
</resources>
`;
}

/**
 * Generates res/values/styles.xml
 */
export function generateStylesXml(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="colorPrimary">#4f46e5</item>
        <item name="colorPrimaryDark">#3730a3</item>
        <item name="colorAccent">#10b981</item>
        <item name="android:windowBackground">#0f172a</item>
    </style>
</resources>
`;
}

/**
 * Generates GitHub Actions workflow for automatic free cloud APK build
 */
export function generateGitHubWorkflow(options: ApkBuilderOptions): string {
  return `name: Build Android APK (HTML to APK Builder)

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up JDK 17
      uses: actions/setup-java@v4
      with:
        java-version: '17'
        distribution: 'temurin'
        cache: gradle

    - name: Grant execute permission for gradlew
      run: chmod +x gradlew || true

    - name: Build Debug APK
      run: bash ./gradlew assembleDebug --stacktrace

    - name: Upload Debug APK Artifact
      uses: actions/upload-artifact@v4
      with:
        name: ${options.appName.replace(/\\s+/g, '_')}-debug-apk
        path: app/build/outputs/apk/debug/*.apk

    - name: Build Release APK
      run: bash ./gradlew assembleRelease --stacktrace || true

    - name: Upload Release APK (if built)
      uses: actions/upload-artifact@v4
      with:
        name: ${options.appName.replace(/\\s+/g, '_')}-release-apk
        path: app/build/outputs/apk/release/*.apk
        if-no-files-found: ignore
`;
}

/**
 * Generates Klencod.json for mobile Klencod IDE
 */
export function generateKlencodConfig(options: ApkBuilderOptions): string {
  return JSON.stringify({
    projectType: 'android-webview',
    name: options.appName,
    package: options.packageName,
    version: options.versionName,
    entryPoint: 'app/src/main/assets/www/index.html',
    buildTool: 'gradle',
    jdkVersion: '17',
    targetSdk: 34,
    permissions: [
      'INTERNET',
      ...(options.enableSms ? ['SEND_SMS', 'READ_PHONE_STATE'] : []),
      ...(options.enableCamera ? ['CAMERA'] : []),
      ...(options.enableStorage ? ['READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE'] : [])
    ]
  }, null, 2);
}

/**
 * Generates Arabic & English instructions
 */
export function generateArabicInstructions(options: ApkBuilderOptions): string {
  return `# دليل بناء ملف APK (HTML to APK Builder)

حزمة مشروع أندرويد متكاملة ومجهزة لتحويل تطبيق الويب إلى تطبيق أندرويد حقيقي APK بصيغة جاهزة للتثبيت على الهواتف.

## تفاصيل التطبيق:
- **اسم التطبيق**: ${options.appName}
- **معرف الحزمة (Package Name)**: ${options.packageName}
- **رقم الإصدار**: ${options.versionName} (كود: ${options.versionCode})
- **النمط**: ${options.mode === 'offline' ? 'أوفلاين (مدمج بالكامل في الأصول www)' : `أونلاين (يفتح الرابط المباشر: ${options.webUrl})`}

---

## 🚀 طرق بناء ملف الـ APK:

### الطريقة 1: باستخدام تطبيق Klencod IDE على الهاتف (بدون كمبيوتر)
1. قم بفك ضغط ملف الـ ZIP هذا على هاتفك الأندرويد.
2. افتح تطبيق **Klencod IDE**.
3. اختر **Open Project** واختر هذا المجلد.
4. اضغط على زر **Build APK** (أيقونة المطرقة أو تشغيل).
5. سيقوم التطبيق بإنشاء ملف \`app-debug.apk\` أو \`app-release.apk\` جاهز للتثبيت مباشرة على جهازك!

---

### الطريقة 2: عبر GitHub Actions مجاناً في السحاب (بدون كمبيوتر وبدون أي برامج!)
1. أنشئ مستودعاً جديداً (New Repository) على موقع [GitHub](https://github.com).
2. قم برفع محتويات هذا المجلد إلى المستودع.
3. انتقل إلى تبويب **Actions** في صفحة المستودع.
4. ستجد مهمة البناء **Build Android APK** تعمل تلقائياً.
5. بعد دقيقتين ستجد ملف الـ APK جاهزاً للتحميل في قسم **Artifacts** بصيغة \`.apk\`!

---

### الطريقة 3: باستخدام Android Studio على الكمبيوتر
1. افتح **Android Studio**.
2. اختر **Open** ثم اختر مجلد هذا المشروع.
3. انتظر انتهاء مزامنة Gradle Sync.
4. من القائمة العلوية: **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
5. سيظهر لك إشعار ومسار ملف الـ APK النهائي.

---

### الطريقة 4: عبر سطر الأوامر (Terminal / CMD)
- لنظام Linux / Mac:
  \`\`\`bash
  chmod +x gradlew
  ./gradlew assembleDebug
  \`\`\`
- لنظام Windows:
  \`\`\`cmd
  gradlew.bat assembleDebug
  \`\`\`
- ستجد ملف الـ APK في المسار:
  \`app/build/outputs/apk/debug/app-debug.apk\`

---

## 📱 محتويات ملف الـ Assets (www):
توجد ملفات الويب داخل المجلد:
\`app/src/main/assets/www/\`
يمكنك استبدالها أو تحديث أي ملفات HTML/CSS/JavaScript في أي وقت دون تعديل كود الأندرويد.
`;
}

/**
 * Creates the standalone bundled www/index.html web content
 */
export function generateBundledWwwHtml(options: ApkBuilderOptions): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${options.appName}</title>
    <style>
        :root {
            --primary: ${options.primaryColor};
            --primary-dark: #3730a3;
            --bg: #0f172a;
            --surface: #1e293b;
            --surface-card: #334155;
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --emerald: #10b981;
            --amber: #f59e0b;
            --rose: #ef4444;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        body { background-color: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; }
        header { background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border-bottom: 1px solid rgba(255,255,255,0.1); padding: 1rem; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 50; }
        .logo-area { display: flex; align-items: center; gap: 0.75rem; }
        .logo-icon { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, var(--primary) 0%, #06b6d4 100%); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.25rem; color: white; }
        .app-title { font-size: 1.125rem; font-weight: 800; color: #fff; }
        .app-sub { font-size: 0.75rem; color: var(--text-muted); }
        .container { flex: 1; max-width: 900px; margin: 0 auto; width: 100%; padding: 1.25rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .stat-card { background: var(--surface); border: 1px solid rgba(255,255,255,0.08); border-radius: 1rem; padding: 1.25rem; }
        .stat-label { font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 0.5rem; }
        .stat-val { font-size: 1.5rem; font-weight: 800; color: #fff; }
        .card { background: var(--surface); border: 1px solid rgba(255,255,255,0.08); border-radius: 1.25rem; padding: 1.5rem; margin-bottom: 1.5rem; }
        .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
        .card-title { font-size: 1.125rem; font-weight: 700; color: #fff; }
        .customer-row { display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .customer-row:last-child { border-bottom: none; }
        .customer-info h4 { font-size: 0.95rem; font-weight: 700; }
        .customer-info p { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem; }
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.625rem 1.25rem; border-radius: 0.75rem; font-size: 0.875rem; font-weight: 700; border: none; cursor: pointer; text-decoration: none; transition: all 0.2s; }
        .btn-primary { background: var(--primary); color: white; }
        .btn-primary:active { transform: scale(0.98); }
        .btn-sms { background: #059669; color: white; }
        .btn-wa { background: #16a34a; color: white; }
        .badge { font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 9999px; }
        .badge-critical { background: rgba(239,68,68,0.2); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); }
        .actions-group { display: flex; gap: 0.5rem; }
        .online-banner { background: rgba(79,70,229,0.15); border: 1px solid rgba(79,70,229,0.3); border-radius: 1rem; padding: 1rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .online-banner p { font-size: 0.85rem; color: #c7d2fe; }
    </style>
</head>
<body>
    <header>
        <div class="logo-area">
            <div class="logo-icon">📱</div>
            <div>
                <div class="app-title">${options.appName}</div>
                <div class="app-sub">تطبيق إدارة ديون العملاء وأقساط SMS</div>
            </div>
        </div>
        <a href="${options.webUrl || '#'}" class="btn btn-primary" style="padding: 0.5rem 0.85rem; font-size: 0.75rem;">النسخة السحابية</a>
    </header>

    <div class="container">
        <div class="online-banner">
            <div>
                <strong>تطبيق مثبت بنجاح على أندرويد (APK)</strong>
                <p>يعمل هذا التطبيق بكامل وظائفه مع دعم إرسال رسائل SMS المباشرة وواتساب لكافة العملاء.</p>
            </div>
            ${options.webUrl ? `<a href="${options.webUrl}" class="btn btn-primary" style="font-size: 0.8rem;">فتح الموقع الحي</a>` : ''}
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">إجمالي الديون المسجلة</div>
                <div class="stat-val" style="color: #f87171;">74,500 <span style="font-size: 0.9rem;">ريال</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-label">العملاء المدينين</div>
                <div class="stat-val" style="color: #60a5fa;">18 <span style="font-size: 0.9rem;">عميل</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-label">خطط الأقساط النشطة</div>
                <div class="stat-val" style="color: #34d399;">5 <span style="font-size: 0.9rem;">خطط</span></div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <div class="card-title">قائمة العملاء والإجراءات السريعة (SMS / واتساب)</div>
            </div>
            <div id="customerList">
                <div class="customer-row">
                    <div class="customer-info">
                        <h4>محمد عبد الله القحطاني</h4>
                        <p>0551234567 • الدين: <strong>12,400 ريال</strong></p>
                    </div>
                    <div class="actions-group">
                        <span class="badge badge-critical">إلحاح حرج</span>
                        <a href="sms:0551234567?body=عزيزي محمد القحطاني نود تذكيركم بسداد المبلغ المستحق وقدره 12400 ريال شاكرين تعاونكم" class="btn btn-sms">SMS</a>
                        <a href="https://wa.me/966551234567?text=السلام عليكم أخي محمد نود تذكيركم بسداد المبلغ المستحق" class="btn btn-wa">واتساب</a>
                    </div>
                </div>
                <div class="customer-row">
                    <div class="customer-info">
                        <h4>شركة الأفق للتجارة</h4>
                        <p>0509876543 • الدين: <strong>28,000 ريال</strong></p>
                    </div>
                    <div class="actions-group">
                        <span class="badge" style="background: rgba(245,158,11,0.2); color: #fde68a;">مرتفع</span>
                        <a href="sms:0509876543?body=تذكير بسداد رصيد الحساب المستحق وقدره 28000 ريال" class="btn btn-sms">SMS</a>
                        <a href="https://wa.me/966509876543" class="btn btn-wa">واتساب</a>
                    </div>
                </div>
                <div class="customer-row">
                    <div class="customer-info">
                        <h4>سالم أحمد العتيبي</h4>
                        <p>0543322114 • الدين: <strong>4,800 ريال</strong> (خطة أقساط 3 دفعات)</p>
                    </div>
                    <div class="actions-group">
                        <span class="badge" style="background: rgba(99,102,241,0.2); color: #c7d2fe;">تقسيط نشط</span>
                        <a href="sms:0543322114?body=تذكير بموعد القسط الأول وقدره 1600 ريال المستحق في 15 الشهر" class="btn btn-sms">SMS</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
`;
}

/**
 * Creates an empty 1x1 PNG or valid base64 icon
 */
export const DEFAULT_APP_ICON_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/**
 * Generates the full ZIP file using JSZip
 */
export async function buildApkZipArchive(options: ApkBuilderOptions = DEFAULT_APK_OPTIONS): Promise<Blob> {
  const zip = new JSZip();

  // Root folder
  const root = zip.folder('html-to-apk-builder');
  if (!root) throw new Error('Could not create root folder in ZIP');

  // Root build files
  root.file('build.gradle', generateRootBuildGradle());
  root.file('settings.gradle', generateSettingsGradle(options));
  root.file('gradle.properties', 'org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\nandroid.enableJetifier=true\n');
  root.file('Klencod.json', generateKlencodConfig(options));
  root.file('INSTRUCTIONS_AR.md', generateArabicInstructions(options));
  root.file('README.md', generateArabicInstructions(options));

  // Executable scripts
  root.file('build.sh', `#!/bin/bash\necho "Building APK for ${options.appName}..."\nchmod +x gradlew || true\n./gradlew assembleDebug\necho "APK built successfully at app/build/outputs/apk/debug/app-debug.apk"\n`);
  root.file('build.bat', `@echo off\necho Building APK for ${options.appName}...\ncall gradlew.bat assembleDebug\necho APK built successfully at app/build/outputs/apk/debug/app-debug.apk\npause\n`);

  // Gradle Wrapper files
  const gradleWrapper = root.folder('gradle')?.folder('wrapper');
  if (gradleWrapper) {
    gradleWrapper.file('gradle-wrapper.properties', `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.5-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`);
  }

  // GitHub Actions Workflow
  const workflows = root.folder('.github')?.folder('workflows');
  if (workflows) {
    workflows.file('build-apk.yml', generateGitHubWorkflow(options));
  }

  // App module
  const app = root.folder('app');
  if (app) {
    app.file('build.gradle', generateAppBuildGradle(options));
    app.file('proguard-rules.pro', '-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }\n-keep class android.webkit.** { *; }\n');

    // Android Manifest
    const main = app.folder('src')?.folder('main');
    if (main) {
      main.file('AndroidManifest.xml', generateAndroidManifest(options));

      // Java code
      const packagePathParts = options.packageName.split('.');
      let currentFolder: JSZip | null | undefined = main.folder('java');
      for (const part of packagePathParts) {
        if (currentFolder) {
          currentFolder = currentFolder.folder(part);
        }
      }
      currentFolder?.file('MainActivity.java', generateMainActivityJava(options));

      // Resources
      const res = main.folder('res');
      if (res) {
        res.folder('values')?.file('strings.xml', generateStringsXml(options));
        res.folder('values')?.file('styles.xml', generateStylesXml());
        res.folder('layout')?.file('activity_main.xml', generateActivityMainXml());
      }

      // Assets -> www
      const www = main.folder('assets')?.folder('www');
      if (www) {
        www.file('index.html', generateBundledWwwHtml(options));
        www.file('style.css', `/* HTML to APK Builder CSS */\nbody { background-color: #0f172a; color: #fff; }`);
        www.file('app.js', `// HTML to APK Builder JS\nconsole.log('${options.appName} initialized on Android');`);
      }
    }
  }

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });
}

/**
 * Triggers a browser download of a Blob
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
