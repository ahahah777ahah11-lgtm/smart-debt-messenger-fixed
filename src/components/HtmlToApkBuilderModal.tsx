import React, { useState } from 'react';
import {
  X,
  Download,
  Smartphone,
  Sparkles,
  CheckCircle2,
  FileCode2,
  FolderArchive,
  Layers,
  Settings2,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  ShieldCheck,
  Info,
  Globe,
  Radio,
  FileText
} from 'lucide-react';
import {
  ApkBuilderOptions,
  DEFAULT_APK_OPTIONS,
  buildApkZipArchive,
  generateAndroidManifest,
  generateMainActivityJava,
  generateAppBuildGradle,
  generateGitHubWorkflow,
  generateKlencodConfig,
  generateArabicInstructions,
  triggerBrowserDownload
} from '../utils/apkBuilderHelper';

interface HtmlToApkBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HtmlToApkBuilderModal: React.FC<HtmlToApkBuilderModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'download' | 'config' | 'guide' | 'files'>('download');
  const [options, setOptions] = useState<ApkBuilderOptions>({
    ...DEFAULT_APK_OPTIONS,
    webUrl: typeof window !== 'undefined' ? window.location.origin : DEFAULT_APK_OPTIONS.webUrl
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<
    'manifest' | 'activity' | 'gradle' | 'github' | 'klencod' | 'readme'
  >('manifest');

  if (!isOpen) return null;

  const handleDownloadCustomZip = async () => {
    try {
      setIsGenerating(true);
      const blob = await buildApkZipArchive(options);
      const safeFilename = `${options.appName.replace(/[^a-zA-Z0-9_-]/g, '_')}_APK_Builder.zip`;
      triggerBrowserDownload(blob, safeFilename);
    } catch (err) {
      console.error('Error generating APK zip:', err);
      // Fallback to pre-built zip
      window.location.href = '/html-to-apk-builder.zip';
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = (text: string, fileKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(fileKey);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const getPreviewContent = () => {
    switch (selectedPreviewFile) {
      case 'manifest':
        return { title: 'app/src/main/AndroidManifest.xml', content: generateAndroidManifest(options) };
      case 'activity':
        return { title: `app/src/main/java/${options.packageName.replace(/\./g, '/')}/MainActivity.java`, content: generateMainActivityJava(options) };
      case 'gradle':
        return { title: 'app/build.gradle', content: generateAppBuildGradle(options) };
      case 'github':
        return { title: '.github/workflows/build-apk.yml', content: generateGitHubWorkflow(options) };
      case 'klencod':
        return { title: 'Klencod.json', content: generateKlencodConfig(options) };
      case 'readme':
        return { title: 'INSTRUCTIONS_AR.md', content: generateArabicInstructions(options) };
    }
  };

  const currentPreview = getPreviewContent();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Smartphone className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white">
                  حزمة بناء تطبيق أندرويد (HTML to APK Builder)
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Klencod & GitHub Ready
                </span>
              </div>
              <p className="text-xs text-slate-300">
                مشروع أندرويد كامل داخل ملف ZIP جاهز للتحويل الفوري إلى ملف APK للتثبيت على الهواتف
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('download')}
            className={`px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'download'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span>تحميل ملف الـ ZIP</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'guide'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>طرق بناء الـ APK (Klencod / GitHub)</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'config'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>تخصيص المشروع والحزمة</span>
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'files'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>استعراض ملفات الكود</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: DOWNLOAD QUICK PANEL */}
          {activeTab === 'download' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Highlight Card */}
              <div className="rounded-3xl p-6 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-indigo-800/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-3 text-center md:text-right">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>حزمة أندرويد متكاملة ومجهزة بنسبة 100%</span>
                    </div>
                    <h4 className="text-xl sm:text-2xl font-black text-white">
                      ملف html-to-apk-builder.zip جاهز للتحميل
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                      يحتوي الأرشيف المضغوط على مشروع Android Studio متكامل ومبرمج مسبقاً بلغة Java وGradle، يدعم تشغيل تطبيقك بصيغة تطبيق هاتف ذكي، إرسال رسائل SMS، دعم كامل لتطبيق واتساب، وتشغيل أوفلاين.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
                    <button
                      onClick={handleDownloadCustomZip}
                      disabled={isGenerating}
                      className="px-6 py-3.5 rounded-2xl font-black text-sm bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Download className={`w-5 h-5 ${isGenerating ? 'animate-bounce' : ''}`} />
                      <span>{isGenerating ? 'جاري تجهيز وتنزيل الـ ZIP...' : 'تنزيل ملف الـ ZIP مباشرة'}</span>
                    </button>

                    <a
                      href="/html-to-apk-builder.zip"
                      download="html-to-apk-builder.zip"
                      className="px-6 py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 flex items-center justify-center gap-2 transition-all text-center"
                    >
                      <FolderArchive className="w-4 h-4" />
                      <span>رابط مباشر (Pre-built ZIP - 12.6 KB)</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* What's Inside Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">هيكل أندرويد معياري</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      يضم MainActivity، AndroidManifest، وجميع ملفات Gradle الرسمية.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">أذونات SMS وواتساب</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      مجهز لفتح تطبيقات المراسلة والنقر المباشر على روابط sms: وwa.me بسلاسة.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">جاهز لـ Klencod السحابي</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      يتضمن ملف Klencod.json وسير عمل GitHub Actions لبناء الـ APK مجاناً بدون حاسوب.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Summary Box */}
              <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span className="text-xs text-indigo-900 font-medium">
                    يمكنك تعديل اسم التطبيق أو الحزمة من تبويب <strong>"تخصيص المشروع والحزمة"</strong> قبل التنزيل، أو الاطلاع على خطوات التحويل إلى APK في تبويب <strong>"طرق بناء الـ APK"</strong>.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BUILD GUIDES (KLENCOD & GITHUB) */}
          {activeTab === 'guide' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Method 1: Klencod IDE on Mobile */}
                <div className="p-5 rounded-2xl border border-indigo-200 bg-indigo-50/40 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-900">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">1</span>
                    <h4 className="font-black text-sm">البناء باستخدام Klencod IDE (على الهاتف)</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    تطبيق <strong>Klencod IDE</strong> يتيح لك بناء ملف APK وتثبيته مباشرة من هاتفك الأندرويد بدون أي كمبيوتر:
                  </p>
                  <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside pr-1">
                    <li>قم بتنزيل ملف الـ ZIP وفك الضغط عنه على هاتفك في مجلد الملفات (Downloads).</li>
                    <li>افتح تطبيق <strong>Klencod IDE</strong> على جهازك الأندرويد.</li>
                    <li>اختر <strong>Open Project</strong> وحدد المجلد المفكوك <code>html-to-apk-builder</code>.</li>
                    <li>سيتعرف التطبيق فوراً على ملف <code>Klencod.json</code> والمشروع.</li>
                    <li>اضغط على زر <strong>Build APK</strong> (أيقونة البناء).</li>
                    <li>بعد ثوانٍ معدودة ستحصل على ملف APK جاهز للتثبيت الفوري ومشاركته!</li>
                  </ol>
                </div>

                {/* Method 2: GitHub Actions Cloud Build */}
                <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">2</span>
                    <h4 className="font-black text-sm">البناء السحابي عبر GitHub Actions (مجاناً 100%)</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    الحزمة تتضمن ملف <code>.github/workflows/build-apk.yml</code> مبرمج تلقائياً:
                  </p>
                  <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside pr-1">
                    <li>أنشئ مستودعاً جديداً (New Repo) في حسابك على موقع <strong>GitHub</strong>.</li>
                    <li>ارفع محتويات هذا الـ ZIP إلى المستودع.</li>
                    <li>توجه إلى تبويب <strong>Actions</strong> في المستودع.</li>
                    <li>سيبدأ خادم جيت هب ببناء التطبيق تلقائياً عبر Gradle.</li>
                    <li>بعد انتهاء المهمة (دقيقتين)، ستجد ملف الـ APK جاهزاً للتنزيل في قسم <strong>Artifacts</strong>!</li>
                  </ol>
                </div>

                {/* Method 3: Android Studio on PC */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center gap-2 text-slate-900">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-black text-xs flex items-center justify-center">3</span>
                    <h4 className="font-black text-sm">البناء عبر Android Studio (على الكمبيوتر)</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    إذا كان لديك برنامج Android Studio الرسمي:
                  </p>
                  <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside pr-1">
                    <li>فك ضغط الملف وافتح المجلد من خلال: <strong>File &gt; Open</strong>.</li>
                    <li>انتظر اكتمال مزامنة Gradle Sync.</li>
                    <li>من القائمة العلوية: <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong>.</li>
                    <li>ستجد ملف <code>app-debug.apk</code> داخل مجلد <code>app/build/outputs/apk/debug/</code>.</li>
                  </ol>
                </div>

                {/* Method 4: Command Line / Terminal */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center gap-2 text-slate-900">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-black text-xs flex items-center justify-center">4</span>
                    <h4 className="font-black text-sm">سطر الأوامر (Terminal / CMD)</h4>
                  </div>
                  <p className="text-xs text-slate-600">
                    لأجهزة المطورين مع بيئة Java مثبتة:
                  </p>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-xs space-y-1 dir-ltr text-left">
                    <div># على نظام Linux / Mac / Termux:</div>
                    <div className="text-emerald-400">chmod +x gradlew && ./gradlew assembleDebug</div>
                    <div className="pt-1"># على نظام Windows:</div>
                    <div className="text-emerald-400">gradlew.bat assembleDebug</div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM CONFIGURATION */}
          {activeTab === 'config' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* App Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    اسم التطبيق (App Name):
                  </label>
                  <input
                    type="text"
                    value={options.appName}
                    onChange={(e) => setOptions({ ...options, appName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                  <p className="text-[11px] text-slate-500">الاسم الذي يظهر تحت أيقونة التطبيق على شاشة الهاتف.</p>
                </div>

                {/* Package Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    معرف الحزمة (Package ID):
                  </label>
                  <input
                    type="text"
                    value={options.packageName}
                    onChange={(e) => setOptions({ ...options, packageName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 font-mono text-left dir-ltr"
                  />
                  <p className="text-[11px] text-slate-500">معرف فريد للأندرويد مثل <code>com.mycompany.app</code>.</p>
                </div>

                {/* Version Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    رقم الإصدار (Version Name):
                  </label>
                  <input
                    type="text"
                    value={options.versionName}
                    onChange={(e) => setOptions({ ...options, versionName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 font-mono text-left dir-ltr"
                  />
                </div>

                {/* Version Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    كود الإصدار الداخلي (Version Code):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={options.versionCode}
                    onChange={(e) => setOptions({ ...options, versionCode: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 font-mono text-left dir-ltr"
                  />
                </div>

              </div>

              {/* Mode Selection */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                <label className="text-xs font-bold text-slate-900 block">
                  طريقة عرض وتشغيل التطبيق:
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    onClick={() => setOptions({ ...options, mode: 'offline' })}
                    className={`p-3 rounded-xl border-2 cursor-pointer flex items-start gap-3 transition-all ${
                      options.mode === 'offline'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <Radio className={`w-4 h-4 mt-0.5 shrink-0 ${options.mode === 'offline' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-xs font-bold text-slate-900">مدمج كلياً (Offline Bundled)</div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        ملفات الـ HTML/CSS/JS مدمجة في مجلد الأصول (assets/www) وتعمل بدون إنترنت.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setOptions({ ...options, mode: 'online' })}
                    className={`p-3 rounded-xl border-2 cursor-pointer flex items-start gap-3 transition-all ${
                      options.mode === 'online'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <Radio className={`w-4 h-4 mt-0.5 shrink-0 ${options.mode === 'online' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-xs font-bold text-slate-900">رابط ويب مباشر (Live Webview URL)</div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        يفتح الرابط السحابي الحي مع الاحتفاظ بالنسخة المدمجة كخطة احتياطية عند انقطاع الشبكة.
                      </p>
                    </div>
                  </label>
                </div>

                {options.mode === 'online' && (
                  <div className="pt-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      الرابط المباشر للموقع:
                    </label>
                    <input
                      type="url"
                      value={options.webUrl}
                      onChange={(e) => setOptions({ ...options, webUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-left dir-ltr focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Permissions Checkboxes */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                <span className="text-xs font-bold text-slate-900 block">
                  أذونات الأندرويد المضمنة في الـ Manifest:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={options.enableSms}
                      onChange={(e) => setOptions({ ...options, enableSms: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>إرسال SMS ومكالمات</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={options.enableStorage}
                      onChange={(e) => setOptions({ ...options, enableStorage: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>تخزين الملفات (إكسل وPDF)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={options.enableCamera}
                      onChange={(e) => setOptions({ ...options, enableCamera: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>الكاميرا للوثائق</span>
                  </label>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleDownloadCustomZip}
                  disabled={isGenerating}
                  className="px-6 py-3 rounded-2xl font-black text-sm bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGenerating ? 'جاري التوليد والتنزيل...' : 'تنزيل ملف الـ ZIP بالتخصيص الجديد'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: CODE PREVIEW */}
          {activeTab === 'files' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setSelectedPreviewFile('manifest')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedPreviewFile === 'manifest'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  AndroidManifest.xml
                </button>

                <button
                  onClick={() => setSelectedPreviewFile('activity')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedPreviewFile === 'activity'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  MainActivity.java
                </button>

                <button
                  onClick={() => setSelectedPreviewFile('gradle')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedPreviewFile === 'gradle'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  build.gradle (App)
                </button>

                <button
                  onClick={() => setSelectedPreviewFile('github')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedPreviewFile === 'github'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  GitHub Workflow (CI/CD)
                </button>

                <button
                  onClick={() => setSelectedPreviewFile('klencod')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedPreviewFile === 'klencod'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Klencod.json
                </button>

                <button
                  onClick={() => setSelectedPreviewFile('readme')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedPreviewFile === 'readme'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  تعليمات البناء (README)
                </button>
              </div>

              {/* Code Display Area */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <span className="font-mono dir-ltr">{currentPreview.title}</span>
                  <button
                    onClick={() => handleCopyCode(currentPreview.content, selectedPreviewFile)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer font-bold"
                  >
                    {copiedFile === selectedPreviewFile ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ الكود</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[350px] leading-relaxed dir-ltr text-left">
                  {currentPreview.content}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>الحزمة متوافقة مع Android SDK 34 وJava 17 وGradle 8.5</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
            >
              إغلاق
            </button>
            <button
              onClick={handleDownloadCustomZip}
              disabled={isGenerating}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تنزيل حزمة الـ ZIP</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
