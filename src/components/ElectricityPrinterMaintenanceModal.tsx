import React, { useState, useEffect } from "react";
import {
  Printer,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Settings2,
  FileText,
  Receipt,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Sliders,
  Check,
  Zap,
  ExternalLink,
  ShieldCheck,
  Gauge,
  X,
  FileCheck2,
} from "lucide-react";
import {
  ElectricityInvoice,
  ElectricityPrintConfig,
  PrinterDiagnosticResult,
  CompanySettings,
} from "../types";
import {
  loadElectricityPrintConfig,
  saveElectricityPrintConfig,
  runElectricityPrinterDiagnostics,
  generateTestElectricityInvoice,
  executePrintDocument,
  printViaPopup,
  DEFAULT_ELECTRICITY_PRINT_CONFIG,
} from "../utils/electricityPrintService";

interface ElectricityPrinterMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  companySettings: CompanySettings;
  sampleInvoice?: ElectricityInvoice;
  onLaunchPrintInvoice?: (invoice: ElectricityInvoice, layout: "a4" | "thermal") => void;
  onLaunchPrintBatch?: () => void;
  invoicesCount: number;
}

export const ElectricityPrinterMaintenanceModal: React.FC<ElectricityPrinterMaintenanceModalProps> = ({
  isOpen,
  onClose,
  companySettings,
  sampleInvoice,
  onLaunchPrintInvoice,
  onLaunchPrintBatch,
  invoicesCount,
}) => {
  const [activeTab, setActiveTab] = useState<"diagnostics" | "settings" | "test" | "guide">("diagnostics");
  const [config, setConfig] = useState<ElectricityPrintConfig>(loadElectricityPrintConfig());
  const [diagnostics, setDiagnostics] = useState<PrinterDiagnosticResult | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Run diagnostics when modal opens
  useEffect(() => {
    if (isOpen) {
      const diag = runElectricityPrinterDiagnostics();
      setDiagnostics(diag);
      setConfig(loadElectricityPrintConfig());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveConfig = () => {
    saveElectricityPrintConfig(config);
    setSaveSuccessMsg("تم حفظ وتحديث إعدادات الطابعة بنجاح!");
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleResetConfig = () => {
    setConfig(DEFAULT_ELECTRICITY_PRINT_CONFIG);
    saveElectricityPrintConfig(DEFAULT_ELECTRICITY_PRINT_CONFIG);
    setSaveSuccessMsg("تمت استعادة إعدادات الطابعة الافتراضية.");
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleRunDiagnosticsAgain = () => {
    const diag = runElectricityPrinterDiagnostics();
    setDiagnostics(diag);
    setSaveSuccessMsg("تم تحديث فحص الطابعة وتشخيص بيئة التشغيل!");
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  const handlePrintTestCalibrationPage = () => {
    setIsTesting(true);
    const testInv = generateTestElectricityInvoice(companySettings);
    
    if (config.openInDedicatedWindow) {
      printViaPopup(testInv, companySettings, config);
    } else if (onLaunchPrintInvoice) {
      onLaunchPrintInvoice(testInv, config.defaultLayout === "thermal" ? "thermal" : "a4");
    } else {
      executePrintDocument("printing-single-invoice-active");
    }
    
    setTimeout(() => setIsTesting(false), 800);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">مركز صيانة وتشغيل طابعة فواتير الكهرباء</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  الطابعة مفعلة وجاهزة
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                فحص جاهزية محرك الطباعة، معايرة الإيصالات، وتخصيص إخراج الورق الرسمي A4 والإيصال الحراري 80mm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-950/60 border-b border-slate-800 px-4 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "diagnostics"
                ? "border-amber-400 text-amber-400 bg-amber-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Gauge className="w-4 h-4" />
            <span>فحص وصيانة الطابعة (Diagnostics)</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "settings"
                ? "border-amber-400 text-amber-400 bg-amber-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>إعدادات وتخصيص الطباعة</span>
          </button>

          <button
            onClick={() => setActiveTab("test")}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "test"
                ? "border-amber-400 text-amber-400 bg-amber-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>طباعة صفحة معايرة تجريبية</span>
          </button>

          <button
            onClick={() => setActiveTab("guide")}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "guide"
                ? "border-amber-400 text-amber-400 bg-amber-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>دليل حل مشكلات الطباعة</span>
          </button>
        </div>

        {/* Success Alert */}
        {saveSuccessMsg && (
          <div className="bg-emerald-950/80 border-b border-emerald-800/80 px-4 py-2 text-xs font-bold text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{saveSuccessMsg}</span>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          
          {/* TAB 1: DIAGNOSTICS */}
          {activeTab === "diagnostics" && diagnostics && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                
                {/* Engine Ready */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">محرك الطباعة (Print Engine)</span>
                    <span className="p-1 bg-emerald-500/10 text-emerald-400 rounded">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-base font-extrabold text-emerald-400">
                    {diagnostics.engineReady ? "متصل ويعمل بكفاءة" : "غير مدعوم"}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    دعم استدعاء واجهة الطباعة الأصلية ونوافذ الحوار
                  </p>
                </div>

                {/* Color Adjust Support */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">ألوان الجداول والخلفيات</span>
                    <span className="p-1 bg-blue-500/10 text-blue-400 rounded">
                      <Sparkles className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-base font-extrabold text-blue-400">
                    {diagnostics.colorAdjustSupported ? "مطابق لمعيار WebKit Exact" : "افتراضي"}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    طباعة خلفيات الشارات والأسعار بكثافة حبر دقيقة
                  </p>
                </div>

                {/* Iframe & Sandbox Status */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">بيئة تشغيل المتصفح</span>
                    <span className="p-1 bg-amber-500/10 text-amber-400 rounded">
                      <ExternalLink className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-base font-extrabold text-amber-400">
                    {diagnostics.isInsideIframe ? "داخل إطار تفاعلي (iFrame)" : "نافذة مستقلة (Direct Window)"}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {diagnostics.isInsideIframe
                      ? "يتوفر خيار النافذة المنبثقة المستقلة لضمان دقة الطباعة"
                      : "أعلى درجات التوافق مع كافة الطابعات الموصولة"}
                  </p>
                </div>
              </div>

              {/* Maintenance Tools Action Card */}
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-amber-400" />
                      <span>إجراءات الصيانة والاختبار المباشر</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      قم باختبار الطابعة الفيزيائية قبل تسليم الفواتير للعملاء
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRunDiagnosticsAgain}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>إعادة الفحص</span>
                    </button>
                    <button
                      onClick={handlePrintTestCalibrationPage}
                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>طباعة صفحة اختبار فوراً</span>
                    </button>
                  </div>
                </div>

                {/* Quick Action Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                  <button
                    onClick={() => {
                      if (sampleInvoice && onLaunchPrintInvoice) {
                        onLaunchPrintInvoice(sampleInvoice, "a4");
                      } else {
                        handlePrintTestCalibrationPage();
                      }
                    }}
                    className="p-3 bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/40 rounded-lg text-right transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                      <FileText className="w-4 h-4" />
                      <span>طباعة نموذج A4 رسمي</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      معاينة وطباعة فاتورة الكهرباء الضريبية المفصلة بجميع الرسوم
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      if (sampleInvoice && onLaunchPrintInvoice) {
                        onLaunchPrintInvoice(sampleInvoice, "thermal");
                      } else {
                        handlePrintTestCalibrationPage();
                      }
                    }}
                    className="p-3 bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/40 rounded-lg text-right transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <Receipt className="w-4 h-4" />
                      <span>طباعة إيصال حراري (POS 80mm)</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      إخراج إيصال حراري سريع لطابعات الكاشير ونقاط التحصيل
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      if (onLaunchPrintBatch) {
                        onClose();
                        onLaunchPrintBatch();
                      }
                    }}
                    className="p-3 bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/40 rounded-lg text-right transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                      <Printer className="w-4 h-4" />
                      <span>طباعة دفتر الفواتير ({invoicesCount})</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      طباعة كافة فواتير الكهرباء للشهر الحالي دفعة واحدة كدفتر إيصالات
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SETTINGS & CUSTOMIZATION */}
          {activeTab === "settings" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Visual Header & Company Info */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-amber-400 flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Sliders className="w-4 h-4" />
                    <span>مكونات الترويسة والبيانات الرسمية</span>
                  </h3>
                  
                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer hover:text-white">
                    <span>إظهار ترويسة الشركة والرقم الضريبي والسجل</span>
                    <input
                      type="checkbox"
                      checked={config.showCompanyHeader}
                      onChange={(e) => setConfig({ ...config, showCompanyHeader: e.target.checked })}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4 bg-slate-900 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer hover:text-white">
                    <span>إظهار صندوق بيانات المشترك ورقم العداد وثابت الاستهلاك</span>
                    <input
                      type="checkbox"
                      checked={config.showMeterDetails}
                      onChange={(e) => setConfig({ ...config, showMeterDetails: e.target.checked })}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4 bg-slate-900 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer hover:text-white">
                    <span>إظهار تفاصيل الضرائب والرسوم الحكومية (إذاعة/خدمات/صناعية)</span>
                    <input
                      type="checkbox"
                      checked={config.showTaxDetails}
                      onChange={(e) => setConfig({ ...config, showTaxDetails: e.target.checked })}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4 bg-slate-900 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer hover:text-white">
                    <span>إظهار التفقيط المالي باللغة العربية (المبلغ بالحروف)</span>
                    <input
                      type="checkbox"
                      checked={config.showTafqeet}
                      onChange={(e) => setConfig({ ...config, showTafqeet: e.target.checked })}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4 bg-slate-900 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer hover:text-white">
                    <span>إظهار خانات التوقيعات والاعتماد (المحاسب/المستلم/المدير)</span>
                    <input
                      type="checkbox"
                      checked={config.showSignatures}
                      onChange={(e) => setConfig({ ...config, showSignatures: e.target.checked })}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4 bg-slate-900 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Print Layout & Engine Options */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-amber-400 flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Printer className="w-4 h-4" />
                    <span>تفضيلات الورق ومحرك الطباعة</span>
                  </h3>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">النمط الافتراضي للطباعة:</label>
                    <select
                      value={config.defaultLayout}
                      onChange={(e) => setConfig({ ...config, defaultLayout: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="a4">نموذج A4 رسمي ضريبي مفصل</option>
                      <option value="thermal">إيصال حراري لنقاط البيع (80mm Thermal Slip)</option>
                      <option value="table">كشف جدول مجمع أفقي (Landscape Report)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">حجم الخط على الورق:</label>
                    <select
                      value={config.fontSize}
                      onChange={(e) => setConfig({ ...config, fontSize: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="compact">مضغوط (للطابعات الصغيرة والمساحات الضيقة)</option>
                      <option value="normal">عادي ومتناسق (الموصى به لطابعات A4)</option>
                      <option value="large">كبير وواضح جداً (High Contrast Large)</option>
                    </select>
                  </div>

                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer hover:text-white pt-2">
                    <span>فتح نافذة طباعة معزولة منبثقة (Pop-up Window)</span>
                    <input
                      type="checkbox"
                      checked={config.openInDedicatedWindow}
                      onChange={(e) => setConfig({ ...config, openInDedicatedWindow: e.target.checked })}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4 bg-slate-900 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer hover:text-white">
                    <span>الطباعة المباشرة تلقائياً بمجرد حفظ فاتورة جديدة</span>
                    <input
                      type="checkbox"
                      checked={config.autoPrintAfterSave}
                      onChange={(e) => setConfig({ ...config, autoPrintAfterSave: e.target.checked })}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4 bg-slate-900 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Custom Payment Notice / Instructions */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  ملاحظات السداد والتوجيهات المطبوعة أسفل الفاتورة:
                </label>
                <textarea
                  rows={2}
                  value={config.paymentNotice}
                  onChange={(e) => setConfig({ ...config, paymentNotice: e.target.value })}
                  placeholder="مثال: يرجى سداد قيمة الفاتورة في موعد أقصاه 10 أيام من تاريخ إصدار المطالبة..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500">
                  هذا النص سيظهر في تذييل كافة إيصالات وفواتير الكهرباء المطبوعة للعملاء.
                </p>
              </div>

              {/* Action Buttons for Settings */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleResetConfig}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>استعادة الإعدادات الافتراضية</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ وتطبيق إعدادات الطباعة</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: CALIBRATION & TEST PAGE */}
          {activeTab === "test" && (
            <div className="space-y-4 text-center py-2">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
                  <FileCheck2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-extrabold text-white">طباعة صفحة معايرة واختبار الطابعة</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  تتيح لك صفحة المعايرة التحقق من محاذاة الهوامش الرأسية والأفقية، وضوح أرقام العدادات وقراءة الكيلوواط، وتنسيق العملة والتفقيط دون التأثير على أرقام الفواتير الحقيقية.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl max-w-lg mx-auto text-right text-xs space-y-2 text-slate-300">
                <div className="font-bold text-amber-400 border-b border-slate-800 pb-1">
                  عناصر الفحص المتضمنة في صفحة الاختبار:
                </div>
                <ul className="space-y-1.5 text-[11px] text-slate-400 list-disc pr-4">
                  <li>معايرة كثافة الخطوط والألوان في الجداول (RGB & Grayscale)</li>
                  <li>اختبار التوافق مع الطابعات الحرارية (80mm) وطابعات الليزر (A4)</li>
                  <li>فحص مربع الإجمالي والتفقيط بالحروف العربية</li>
                  <li>فحص مربعات التوقيع والأختام الرسمية في أسفل الصفحة</li>
                </ul>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={handlePrintTestCalibrationPage}
                  disabled={isTesting}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xl transition flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isTesting ? "جاري الإرسال للطابعة..." : "طباعة صفحة المعايرة الآن 🖨️"}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: TROUBLESHOOTING GUIDE */}
          {activeTab === "guide" && (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl flex items-start gap-3 text-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="block text-xs font-bold">إرشادات ضبط متصفح Google Chrome / Microsoft Edge للطباعة المثالية:</strong>
                  <p className="text-[11px] leading-relaxed text-amber-300/90">
                    للحصول على فواتير بأعلى دقة ووضوح ومظهر احترافي مطابق للمعايير المالية، يرجى مراجعة الخيارات التالية في نافذة الطباعة:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-2">
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs">1</span>
                    <span>تفعيل خيار "رسومات الخلفية" (Background Graphics)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    تأكد من وضع علامة (✓) على خيار <strong>Background Graphics</strong> في نافذة الطباعة لإظهار ألوان شارات الحسابات وتظليل الجداول الرسمي.
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-2">
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs">2</span>
                    <span>ضبط الهوامش على "الحد الأدنى" (Margins: Minimum / None)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    اختر <strong>Margins: Minimum</strong> أو <strong>Default</strong> لمنع قص حواف الجداول وضمان طباعة الفاتورة بالكامل في صفحة واحدة دون إهدار للورق.
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-2">
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs">3</span>
                    <span>إلغاء ترويسة وتذييل المتصفح الافتراضية</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    قم بإلغاء تحديد <strong>Headers and Footers</strong> حتى لا تظهر روابط الصفحات وعناوين URL غير المرغوبة أعلى وأسفل الورقة المطبوعة.
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-2">
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs">4</span>
                    <span>طابعات الإيصالات الحرارية (POS 80mm Roll)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    اختر مقاس الورق <strong>80mm x Receipt</strong> في إعدادات الطابعة، واستخدم وضع <strong>"إيصال حراري"</strong> المدمج بالبرنامج.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 border-t border-slate-800 p-4 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>نظام طباعة ومطالبات فواتير الكهرباء المتوافق مع اللوائح المالية 🇪🇬</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            إغلاق مركز الصيانة
          </button>
        </div>

      </div>
    </div>
  );
};
