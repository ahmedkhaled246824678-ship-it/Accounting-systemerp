import React, { useState } from "react";
import {
  Settings,
  Building,
  Save,
  Check,
  FileText,
  DollarSign,
  Calendar,
  Receipt,
  Lock,
  Unlock,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { CompanySettings, SystemLockState } from "../types";
import { ERPStorage } from "../utils/storage";

interface CompanySettingsViewProps {
  companySettings: CompanySettings;
  onSaveCompanySettings: (settings: CompanySettings) => void;
  systemLockState?: SystemLockState;
  onSaveSystemLockState?: (state: SystemLockState) => void;
  isAdmin?: boolean;
}

export const CompanySettingsView: React.FC<CompanySettingsViewProps> = ({
  companySettings,
  onSaveCompanySettings,
  systemLockState,
  onSaveSystemLockState,
  isAdmin = true,
}) => {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [lockSavedSuccess, setLockSavedSuccess] = useState(false);

  // System Lock State
  const [lockState, setLockState] = useState<SystemLockState>(() => {
    return systemLockState || ERPStorage.getSystemLockState();
  });
  const [lockReason, setLockReason] = useState(lockState.lockedReason || "صيانة دورية وتحديث البيانات");
  const [lockMessage, setLockMessage] = useState(lockState.notifyMessage || "النظام قيد الصيانة، يرجى المحاولة لاحقاً");

  const handleToggleLock = () => {
    const nextLocked = !lockState.isLocked;
    const updated: SystemLockState = {
      ...lockState,
      isLocked: nextLocked,
      lockedAt: nextLocked ? new Date().toISOString() : "",
      lockedBy: "مدير النظام",
      lockedReason: lockReason.trim() || "صيانة دورية وتحديث البيانات",
      notifyMessage: lockMessage.trim() || "النظام قيد الصيانة المؤقتة",
      allowAdminsOnly: true,
    };
    setLockState(updated);
    if (onSaveSystemLockState) {
      onSaveSystemLockState(updated);
    } else {
      ERPStorage.saveSystemLockState(updated);
    }
    setLockSavedSuccess(true);
    setTimeout(() => setLockSavedSuccess(false), 3000);
  };

  const handleSaveLockDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SystemLockState = {
      ...lockState,
      lockedReason: lockReason.trim(),
      notifyMessage: lockMessage.trim(),
    };
    setLockState(updated);
    if (onSaveSystemLockState) {
      onSaveSystemLockState(updated);
    } else {
      ERPStorage.saveSystemLockState(updated);
    }
    setLockSavedSuccess(true);
    setTimeout(() => setLockSavedSuccess(false), 3000);
  };

  // Form State
  const [companyName, setCompanyName] = useState(companySettings.companyName);
  const [taxNumber, setTaxNumber] = useState(companySettings.taxNumber);
  const [commercialRegister, setCommercialRegister] = useState(companySettings.commercialRegister);
  const [currency, setCurrency] = useState(companySettings.currency);
  const [currencySymbol, setCurrencySymbol] = useState(companySettings.currencySymbol);
  const [address, setAddress] = useState(companySettings.address);
  const [phone, setPhone] = useState(companySettings.phone);
  const [email, setEmail] = useState(companySettings.email);
  const [financialYear, setFinancialYear] = useState(companySettings.financialYear);
  const [logoUrl, setLogoUrl] = useState(companySettings.logoUrl || "");
  const [reportHeaderNote, setReportHeaderNote] = useState(companySettings.reportHeaderNote || "");
  const [reportFooterNote, setReportFooterNote] = useState(companySettings.reportFooterNote || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: CompanySettings = {
      companyName,
      taxNumber,
      commercialRegister,
      currency,
      currencySymbol,
      address,
      phone,
      email,
      financialYear,
      logoUrl,
      reportHeaderNote,
      reportFooterNote,
    };

    onSaveCompanySettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <span>إعدادات الشركة وحالة النظام والعملة والتقارير</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            التحكم في تشغيل وتعطيل النظام للمستخدمين، وتعديل بيانات المؤسسة، والرقم الضريبي، وترويسة الفواتير
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-bold">
            <Check className="w-4 h-4" />
            <span>تم حفظ الإعدادات بنجاح تلقائياً!</span>
          </div>
        )}
      </div>

      {/* System Availability & Lock Control Box for Admin */}
      {isAdmin && (
        <div className={`p-5 rounded-2xl border transition-all ${
          lockState.isLocked
            ? "bg-rose-950/20 border-rose-500/40 shadow-xl shadow-rose-950/20"
            : "bg-emerald-950/15 border-emerald-500/30 shadow-lg shadow-emerald-950/10"
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl border ${
                lockState.isLocked
                  ? "bg-rose-600/20 text-rose-400 border-rose-500/30 animate-pulse"
                  : "bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
              }`}>
                {lockState.isLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white">إتاحة وتشغيل النظام للمستخدمين</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                    lockState.isLocked
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  }`}>
                    {lockState.isLocked ? "🔴 النظام معطل للمستخدمين (مقتصر على المدراء)" : "🟢 النظام يعمل ومتاح لكافة المستخدمين"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  يمكن للمدير إيقاف النظام مؤقتاً لتنفيذ صيانة أو مراجعة قيود، وسيتم إظهار شاشة الصيانة لأي مستخدم يحاول الدخول.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleLock}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg ${
                  lockState.isLocked
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "bg-rose-600 hover:bg-rose-500 text-white"
                }`}
              >
                {lockState.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                <span>{lockState.isLocked ? "تشغيل وإتاحة النظام للجميع" : "تعطيل النظام للمستخدمين"}</span>
              </button>
            </div>
          </div>

          {/* Details Config */}
          <form onSubmit={handleSaveLockDetails} className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-800/80">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">سبب إيقاف النظام (يظهر في شاشة الصيانة):</label>
              <input
                type="text"
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                placeholder="صيانة دورية وتحديث البيانات..."
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">رسالة التنبيه الإضافية:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={lockMessage}
                  onChange={(e) => setLockMessage(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  placeholder="النظام قيد الصيانة المؤقتة..."
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-xs font-bold shrink-0 transition"
                >
                  حفظ الرسالة
                </button>
              </div>
            </div>
          </form>
          {lockSavedSuccess && (
            <div className="text-xs text-emerald-400 font-bold mt-2 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>تم حفظ حالة وبيانات الصيانة تلقائياً بنجاح!</span>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 text-xs text-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-slate-400 mb-1">اسم الشركة / المؤسسة *</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white font-semibold"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">الرقم الضريبي (Tax ID) *</label>
            <input
              type="text"
              required
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">رقم السجل التجاري *</label>
            <input
              type="text"
              required
              value={commercialRegister}
              onChange={(e) => setCommercialRegister(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-slate-400 mb-1">اسم العملة المعتمدة *</label>
            <input
              type="text"
              required
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white"
              placeholder="مثال: جنيه مصري / ريال سعودي..."
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">رمز العملة *</label>
            <input
              type="text"
              required
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white font-bold"
              placeholder="ج.م / ر.س / $"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">السنة المالية الحالية *</label>
            <input
              type="text"
              required
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">رقم الهاتف للطباعة</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 mb-1">العنوان الرئيسي للمؤسسة</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">رابط الشعار (Logo URL)</label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white font-mono"
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-slate-400 mb-1">عبارة ترويسة التقارير المطبوعة</label>
            <textarea
              rows={2}
              value={reportHeaderNote}
              onChange={(e) => setReportHeaderNote(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white"
              placeholder="تظهر في أعلى كل تقرير رسمي..."
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">عبارة تذييل وتقفيل التقارير الرسمية</label>
            <textarea
              rows={2}
              value={reportFooterNote}
              onChange={(e) => setReportFooterNote(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white"
              placeholder="تظهر في أسفل السندات المطبوعة والختم..."
            />
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="submit"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-bold text-xs shadow-lg transition"
          >
            <Save className="w-4 h-4" />
            <span>حفظ وتطبيق إعدادات الشركة</span>
          </button>
        </div>
      </form>

    </div>
  );
};
