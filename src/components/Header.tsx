import React, { useState, useRef, useEffect } from "react";
import {
  Building2,
  Calendar,
  Search,
  Printer,
  RefreshCw,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  Share2,
  LogOut,
  UserCheck,
  ChevronDown,
  Copy,
  Check,
  ExternalLink,
  Shield,
  KeyRound,
  Globe,
  MessageSquare,
  Zap,
  Plus,
} from "lucide-react";
import { CompanySettings, FilterParams, User, SystemLockState } from "../types";
import { useLanguage } from "../context/LanguageContext";
import { realtimeClient } from "../utils/realtimeService";
import { getUserShareableUrl } from "../utils/userLinkService";

interface HeaderProps {
  companySettings: CompanySettings;
  currentUser?: User;
  users?: User[];
  systemLockState?: SystemLockState;
  onToggleSystemLock?: () => void;
  onOpenQuickJournal?: () => void;
  onOpenQuickVoucher?: () => void;
  onSwitchUser?: (user: User) => void;
  onLogout?: () => void;
  onOpenShareModal?: () => void;
  onOpenWhatsAppShare?: () => void;
  filterParams: FilterParams;
  onFilterChange: (params: FilterParams) => void;
  onResetData?: () => void;
  activeTabTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  companySettings,
  currentUser,
  users = [],
  systemLockState,
  onToggleSystemLock,
  onOpenQuickJournal,
  onOpenQuickVoucher,
  onSwitchUser,
  onLogout,
  onOpenShareModal,
  onOpenWhatsAppShare,
  filterParams,
  onFilterChange,
  onResetData,
  activeTabTitle = "لوحة التحكم",
}) => {
  const { language, setLanguage, t, isRTL, languages, addLanguage } = useLanguage();
  const [query, setQuery] = useState(filterParams.query || "");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showAddLangModal, setShowAddLangModal] = useState(false);
  const [newLangCode, setNewLangCode] = useState("");
  const [newLangName, setNewLangName] = useState("");
  const [newLangNative, setNewLangNative] = useState("");
  const [newLangFlag, setNewLangFlag] = useState("🌐");
  const [newLangDir, setNewLangDir] = useState<"rtl" | "ltr">("ltr");
  const [copiedLink, setCopiedLink] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const [isWsConnected, setIsWsConnected] = useState<boolean>(realtimeClient.isConnected);

  useEffect(() => {
    const unsub = realtimeClient.onConnectionChange((connected) => {
      setIsWsConnected(connected);
    });
    return () => unsub();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filterParams, query });
  };

  const displayName = currentUser?.fullName || currentUser?.username || (language === "ar" ? "أحمد خالد" : "Ahmed Khaled");
  const initial = displayName.charAt(0);
  const displayRole =
    currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN"
      ? language === "ar" ? "مدير النظام" : "Administrator"
      : currentUser?.role === "ACCOUNTANT"
      ? language === "ar" ? "محاسب تنفيذ" : "Senior Accountant"
      : currentUser?.role === "AUDITOR"
      ? language === "ar" ? "مدقق ومراجع" : "Financial Auditor"
      : currentUser?.role === "VIEWER"
      ? language === "ar" ? "مشاهد" : "Viewer"
      : language === "ar" ? "مخصص" : "Custom";

  const handleCopyMyLink = () => {
    if (!currentUser) return;
    const url = getUserShareableUrl(currentUser);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const toggleLanguage = () => {
    setLanguage(language === "ar" ? "en" : "ar");
  };

  return (
    <header className="no-print bg-[#11141B]/95 backdrop-blur-md border-b border-gray-800 text-[#E2E8F0] sticky top-0 z-30 shadow-lg font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Right: Company Logo & Page Title */}
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 shadow-inner">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">
                  {companySettings.companyName}
                </h1>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-bold">
                  {companySettings.financialYear}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                <span className="font-medium text-gray-300">{activeTabTitle}</span>
                <span>•</span>
                {isWsConnected ? (
                  <span className="text-emerald-400 flex items-center gap-1 text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20" title="تزامن لحظي نشط عبر WebSocket">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>{t("realtimeConnected", "تزامن لحظي نشط")}</span>
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1 text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20" title="جاري الاتصال بخادم التزامن اللحظي">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                    <span>{t("connecting", "جاري التوصيل...")}</span>
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Center: Global Search & Date Filters */}
          <div className="flex-1 max-w-xl">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className={`w-4 h-4 absolute ${isRTL ? "right-3" : "left-3"} top-2 text-gray-500`} />
                <input
                  type="text"
                  placeholder={t("searchPlaceholder", "بحث شامل بالحسابات، القيد، اليوم، التاريخ والسنة المالية...")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={`w-full bg-[#1A1F26] border border-gray-700/80 rounded-lg ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} py-1.5 text-xs text-[#E2E8F0] placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
                />
              </div>

              {/* Date Filter Quick Picker */}
              <div className="hidden sm:flex items-center gap-1">
                <input
                  type="date"
                  value={filterParams.startDate || ""}
                  onChange={(e) => onFilterChange({ ...filterParams, startDate: e.target.value })}
                  className="bg-[#1A1F26] border border-gray-700/80 text-[11px] rounded-lg px-2 py-1.5 text-[#E2E8F0] focus:outline-none focus:border-blue-500"
                  title={t("dateFrom", "من تاريخ")}
                />
                <span className="text-gray-500 text-[10px]">{t("dateTo", "إلى")}</span>
                <input
                  type="date"
                  value={filterParams.endDate || ""}
                  onChange={(e) => onFilterChange({ ...filterParams, endDate: e.target.value })}
                  className="bg-[#1A1F26] border border-gray-700/80 text-[11px] rounded-lg px-2 py-1.5 text-[#E2E8F0] focus:outline-none focus:border-blue-500"
                  title={t("dateTo", "إلى تاريخ")}
                />
              </div>
            </form>
          </div>

          {/* Left: Quick Actions & User Profile Menu */}
          <div className="flex items-center gap-2">
            
            {/* Language Switcher Dropdown (العربية / English / Deutsch + Custom Languages) */}
            <div className="relative" ref={langMenuRef}>
              <button
                type="button"
                onClick={() => setShowLangMenu((p) => !p)}
                className="flex items-center gap-1.5 bg-[#181D26] hover:bg-[#202734] text-amber-300 hover:text-amber-200 border border-amber-500/30 px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                title={t("changeLanguage", "تغيير لغة النظام")}
              >
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {(() => {
                    const cur = languages.find((l) => l.code === language);
                    return cur ? `${cur.flag} ${cur.nativeName || cur.name}` : "🇸🇦 العربية";
                  })()}
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showLangMenu ? "rotate-180" : ""}`} />
              </button>

              {showLangMenu && (
                <div className={`absolute ${isRTL ? "left-0" : "right-0"} top-full mt-1.5 w-44 bg-[#11141B] border border-gray-700 rounded-xl p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1`}>
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        setLanguage(l.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-right px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                        language === l.code ? "bg-amber-500/20 text-amber-300 font-bold" : "text-gray-300 hover:bg-gray-800"
                      }`}
                    >
                      <span className="truncate">{l.nativeName} ({l.name})</span>
                      <span className="text-sm shrink-0">{l.flag}</span>
                    </button>
                  ))}

                  <div className="border-t border-gray-800 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLangMenu(false);
                        setShowAddLangModal(true);
                      }}
                      className="w-full text-right px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-amber-400 hover:bg-amber-500/10 flex items-center justify-between transition"
                    >
                      <span>{t("addNewLanguage", "إضافة لغة أخرى")}</span>
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* WhatsApp Quick Share Button */}
            {onOpenWhatsAppShare && (
              <button
                onClick={onOpenWhatsAppShare}
                className="flex items-center gap-1.5 bg-[#181D26] hover:bg-[#202734] text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm"
                title={t("shareWhatsApp", "إرسال تقرير الصفحة الحالية عبر واتساب")}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden lg:inline">{t("shareWhatsApp", "واتساب")}</span>
              </button>
            )}

            {/* Share / Link Dispatch Button */}
            {onOpenShareModal && (
              <button
                onClick={onOpenShareModal}
                className="flex items-center gap-1.5 bg-[#181D26] hover:bg-[#202734] text-purple-300 hover:text-purple-200 border border-purple-500/30 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm"
                title="مشاركة رابط دخول مخصص لأي مستخدم مع ضبط صلاحياته"
              >
                <Share2 className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">{t("shareLink", "مشاركة الرابط")}</span>
              </button>
            )}

            {onOpenQuickJournal && currentUser?.permissions?.canAdd && (
              <button
                onClick={onOpenQuickJournal}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-md shadow-blue-900/20"
                title="إضافة قيد يومية يدوي"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{t("newEntry", "قيد جديد")}</span>
              </button>
            )}

            {onOpenQuickVoucher && currentUser?.permissions?.canAdd && (
              <button
                onClick={onOpenQuickVoucher}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-md shadow-emerald-900/20"
                title="إضافة سند خزينة/بنك يدوي"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{t("newVoucher", "سند جديد")}</span>
              </button>
            )}

            {/* User Profile Badge */}
            <div className="flex items-center gap-2 p-1.5 px-3 bg-[#1A1F26] border border-gray-700/80 rounded-xl">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs bg-purple-600/20 text-purple-300 border border-purple-500/30">
                {initial}
              </div>
              <div className="hidden sm:block text-right">
                <p className="font-semibold text-white text-xs leading-none truncate max-w-[120px]">
                  {displayName}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-none">
                  {displayRole}
                </p>
              </div>
            </div>

            {/* Reset Button */}
            {onResetData && (
              <button
                onClick={onResetData}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-[#1A1F26] rounded-lg transition"
                title="إعادة ضبط البيانات النموذجية"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Add New Language Modal */}
      {showAddLangModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181D26] border border-gray-700 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">
                  {t("addNewLanguage", "إضافة لغة جديدة للنظام")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLangModal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newLangCode.trim() || !newLangName.trim()) return;
                const cleanCode = newLangCode.trim().toLowerCase();
                addLanguage({
                  code: cleanCode,
                  name: newLangName.trim(),
                  nativeName: (newLangNative || newLangName).trim(),
                  flag: newLangFlag.trim() || "🌐",
                  dir: newLangDir,
                });
                setLanguage(cleanCode);
                setShowAddLangModal(false);
                setNewLangCode("");
                setNewLangName("");
                setNewLangNative("");
              }}
              className="space-y-4 mt-4 text-xs"
            >
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  {t("languageCode", "رمز اللغة (مثال: fr, tr, es, it, zh)")} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: fr أو tr أو es"
                  value={newLangCode}
                  onChange={(e) => setNewLangCode(e.target.value)}
                  className="w-full bg-[#11141B] border border-gray-700 rounded-lg p-2.5 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  {t("languageName", "اسم اللغة بالإنجليزية")} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: French أو Turkish أو Spanish"
                  value={newLangName}
                  onChange={(e) => setNewLangName(e.target.value)}
                  className="w-full bg-[#11141B] border border-gray-700 rounded-lg p-2.5 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  الاسم الأصلي المكتوب باللغة نفسها
                </label>
                <input
                  type="text"
                  placeholder="مثال: Français أو Türkçe أو Español"
                  value={newLangNative}
                  onChange={(e) => setNewLangNative(e.target.value)}
                  className="w-full bg-[#11141B] border border-gray-700 rounded-lg p-2.5 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    أيقونة أو علم
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 🇫🇷 أو 🇹🇷 أو 🇪🇸"
                    value={newLangFlag}
                    onChange={(e) => setNewLangFlag(e.target.value)}
                    className="w-full bg-[#11141B] border border-gray-700 rounded-lg p-2.5 text-white text-center text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    {t("direction", "اتجاه الكتابة")}
                  </label>
                  <select
                    value={newLangDir}
                    onChange={(e) => setNewLangDir(e.target.value as "rtl" | "ltr")}
                    className="w-full bg-[#11141B] border border-gray-700 rounded-lg p-2.5 text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="ltr">{t("ltr", "من اليسار لليمين (LTR)")}</option>
                    <option value="rtl">{t("rtl", "من اليمين لليسار (RTL)")}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowAddLangModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition"
                >
                  {t("cancel", "إلغاء")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition shadow-md"
                >
                  {t("add", "إضافة وتفعيل")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

