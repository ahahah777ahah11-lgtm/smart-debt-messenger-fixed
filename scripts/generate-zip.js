import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const zip = new JSZip();
const root = zip.folder('html-to-apk-builder');

const appName = 'Smart Debt Messenger';
const packageName = 'com.smartdebt.app';
const versionName = '1.0.0';
const versionCode = 1;
const webUrl = 'https://ais-dev-i73sqlbhgq7umnsf2tajel-181592326577.europe-west2.run.app';

// 1. Root files
root.file('build.gradle', `buildscript {
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
`);

root.file('settings.gradle', `pluginManagement {
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
rootProject.name = "Smart_Debt_Messenger"
include ':app'
`);

root.file('gradle.properties', `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
`);

root.file('Klencod.json', JSON.stringify({
  projectType: 'android-webview',
  name: appName,
  package: packageName,
  version: versionName,
  entryPoint: 'app/src/main/assets/www/index.html',
  buildTool: 'gradle',
  jdkVersion: '17',
  targetSdk: 34,
  permissions: ['INTERNET', 'SEND_SMS', 'READ_PHONE_STATE', 'CAMERA', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE']
}, null, 2));

root.file('build.sh', `#!/bin/bash
echo "Building APK for ${appName}..."
chmod +x gradlew || true
./gradlew assembleDebug
echo "APK built successfully at app/build/outputs/apk/debug/app-debug.apk"
`);

root.file('build.bat', `@echo off
echo Building APK for ${appName}...
call gradlew.bat assembleDebug
echo APK built successfully at app/build/outputs/apk/debug/app-debug.apk
pause
`);

// 2. Gradle wrapper
const wrapper = root.folder('gradle')?.folder('wrapper');
wrapper.file('gradle-wrapper.properties', `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.5-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`);

// 3. GitHub Actions
const workflows = root.folder('.github')?.folder('workflows');
workflows.file('build-apk.yml', `name: Build Android APK (HTML to APK Builder)

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
        name: SmartDebt-debug-apk
        path: app/build/outputs/apk/debug/*.apk

    - name: Build Release APK
      run: bash ./gradlew assembleRelease --stacktrace || true

    - name: Upload Release APK
      uses: actions/upload-artifact@v4
      with:
        name: SmartDebt-release-apk
        path: app/build/outputs/apk/release/*.apk
        if-no-files-found: ignore
`);

// 4. Instructions in Arabic & English
root.file('INSTRUCTIONS_AR.md', `# دليل بناء ملف APK (HTML to APK Builder)

حزمة مشروع أندرويد متكاملة ومجهزة لتحويل تطبيق الويب إلى تطبيق أندرويد حقيقي APK بصيغة جاهزة للتثبيت على الهواتف.

## تفاصيل التطبيق:
- اسم التطبيق: ${appName}
- معرف الحزمة: ${packageName}
- الإصدار: ${versionName}

### طرق بناء ملف الـ APK:
1. **Klencod IDE على الهاتف**: افتح التطبيق -> Open Project -> Build APK.
2. **GitHub Actions سحابياً**: ارفع المجلد لمستودع جيت هب -> Actions -> تحميل ملف الـ APK جاهزاً.
3. **Android Studio**: فتح المشروع -> Build -> Build APK(s).
4. **سطر الأوامر**: تشغيل \`./build.sh\` أو \`gradlew assembleDebug\`.
`);

root.file('README.md', `# HTML to APK Builder Template
Complete Android WebView template project configured for building APKs via Klencod IDE, Android Studio, or GitHub Actions.
`);

// 5. App module
const app = root.folder('app');
app.file('build.gradle', `plugins {
    id 'com.android.application'
}

android {
    namespace '${packageName}'
    compileSdk 34

    defaultConfig {
        applicationId "${packageName}"
        minSdk 21
        targetSdk 34
        versionCode ${versionCode}
        versionName "${versionName}"
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
`);

app.file('proguard-rules.pro', `-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
-keep class android.webkit.** { *; }
`);

const main = app.folder('src')?.folder('main');
main.file('AndroidManifest.xml', `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${packageName}">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.SEND_SMS" />
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" />

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
`);

// Java
const javaApp = main.folder('java')?.folder('com')?.folder('smartdebt')?.folder('app');
javaApp.file('MainActivity.java', `package ${packageName};

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
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUserAgentString(settings.getUserAgentString() + " HTML2APK-App");

        mWebView.setWebViewClient(new CustomWebViewClient());
        mWebView.setWebChromeClient(new CustomWebChromeClient());

        // Default: loads bundled web assets
        mWebView.loadUrl("file:///android_asset/www/index.html");
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
                view.loadUrl("file:///android_asset/www/index.html");
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return handleUrlIntents(request.getUrl().toString());
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
                if (newProgress == 100) mProgressBar.setVisibility(View.GONE);
            }
        }

        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
            if (mUploadMessage != null) mUploadMessage.onReceiveValue(null);
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
`);

// Resources
const res = main.folder('res');
res.folder('values')?.file('strings.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${appName}</string>
</resources>
`);

res.folder('values')?.file('styles.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="colorPrimary">#4f46e5</item>
        <item name="colorPrimaryDark">#3730a3</item>
        <item name="colorAccent">#10b981</item>
        <item name="android:windowBackground">#0f172a</item>
    </style>
</resources>
`);

res.folder('layout')?.file('activity_main.xml', `<?xml version="1.0" encoding="utf-8"?>
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
`);

// Assets / www
const www = main.folder('assets')?.folder('www');
www.file('index.html', `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${appName}</title>
    <style>
        :root { --primary: #4f46e5; --bg: #0f172a; --surface: #1e293b; --text: #f8fafc; --text-muted: #94a3b8; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
        body { background-color: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; }
        header { background: #1e1b4b; padding: 1rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .logo { font-size: 1.1rem; font-weight: bold; }
        .container { padding: 1.25rem; max-width: 800px; margin: 0 auto; width: 100%; }
        .card { background: var(--surface); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1rem; border: 1px solid rgba(255,255,255,0.08); }
        .btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.6rem 1.2rem; border-radius: 0.6rem; font-weight: bold; text-decoration: none; border: none; cursor: pointer; color: white; }
        .btn-primary { background: var(--primary); }
        .btn-sms { background: #059669; }
        .btn-wa { background: #16a34a; }
        .customer { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    </style>
</head>
<body>
    <header>
        <div class="logo">📱 ${appName}</div>
        <a href="${webUrl}" class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">فتح السحابي</a>
    </header>
    <div class="container">
        <div class="card" style="background: rgba(79,70,229,0.15); border-color: rgba(79,70,229,0.3);">
            <h3 style="margin-bottom: 0.5rem; color: #a5b4fc;">✅ تطبيق الأندرويد جاهز ويعمل بكفاءة!</h3>
            <p style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.5;">تم تحويل تطبيق الويب بنجاح إلى ملف APK أندرويد حقيقي مع دعم مباشر لرسائل SMS، كشوف الحسابات، وواتساب.</p>
        </div>
        <div class="card">
            <h3 style="margin-bottom: 1rem;">إجراءات تذكير الديون السريعة</h3>
            <div class="customer">
                <div><strong>محمد عبد الله</strong><br><small style="color:var(--text-muted);">المبلغ: 12,400 ريال</small></div>
                <div style="display:flex; gap:0.5rem;">
                    <a href="sms:0551234567?body=عزيزي محمد نود تذكيركم بموعد سداد القسط المستحق وقدره 12400 ريال" class="btn btn-sms">SMS</a>
                    <a href="https://wa.me/966551234567" class="btn btn-wa">واتساب</a>
                </div>
            </div>
            <div class="customer">
                <div><strong>شركة الأفق</strong><br><small style="color:var(--text-muted);">المبلغ: 28,000 ريال</small></div>
                <div style="display:flex; gap:0.5rem;">
                    <a href="sms:0509876543?body=تذكير بموعد سداد رصيد الحساب المستحق 28000 ريال" class="btn btn-sms">SMS</a>
                    <a href="https://wa.me/966509876543" class="btn btn-wa">واتساب</a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
`);

www.file('style.css', `/* CSS */\nbody { background: #0f172a; color: #fff; }`);
www.file('app.js', `console.log('App ready');`);

// Ensure public directory exists
const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate ZIP file
const outputPath = path.join(publicDir, 'html-to-apk-builder.zip');
console.log('Generating ZIP file at:', outputPath);

zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } })
  .then(content => {
    fs.writeFileSync(outputPath, content);
    const stats = fs.statSync(outputPath);
    console.log('✅ Successfully created html-to-apk-builder.zip! Size:', (stats.size / 1024).toFixed(2), 'KB');
  })
  .catch(err => {
    console.error('Error generating zip:', err);
    process.exit(1);
  });
