import React, { useState, useMemo } from "react";
import {
  X,
  Lock,
  Unlock,
  Send,
  Copy,
  Check,
  Globe,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Phone,
  MessageSquare,
  Sparkles,
  DollarSign,
  Building,
  Wallet,
  BookOpen,
  Filter,
  CheckSquare,
  Square,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { User, Account } from "../types";
import { SYSTEM_ROLES } from "../data/permissionsData";
import { getUserShareableUrl } from "../utils/userLinkService";
import { useLanguage } from "../context/LanguageContext";

interface UserAccountsControlModalProps {
  user: User;
  accounts: Account[];
  onSaveUser: (updatedUser: User) => void;
  onClose: () => void;
  onRegenerateLink?: (user: User) => void;
  currency?: string;
}

export const UserAccountsControlModal: React.FC<UserAccountsControlModalProps> = ({
  user,
  accounts,
  onSaveUser,
  onClose,
  onRegenerateLink,
  currency = "ج.م",
}) => {
  const { t, isRTL, language } = useLanguage();
  const [currentUserState, setCurrentUserState] = useState<User>(user);
  const [activeTab, setActiveTab] = useState<"accounts" | "whatsapp" | "screens">("accounts");

  // WhatsApp state
  const [recipientPhone, setRecipientPhone] = useState<string>(user.phone || "");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Accounts state
  const isAllAccounts =
    !currentUserState.allowedAccounts ||
    currentUserState.allowedAccounts.length === 0 ||
    currentUserState.allowedAccounts.includes("*");

  const [accountScope, setAccountScope] = useState<"ALL" | "SPECIFIC">(
    isAllAccounts ? "ALL" : "SPECIFIC"
  );
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    isAllAccounts ? accounts.map((a) => a.id) : currentUserState.allowedAccounts || []
  );
  const [searchAccountQuery, setSearchAccountQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const isInactive = currentUserState.status === "INACTIVE" || currentUserState.isActive === false;
  const directLinkUrl = getUserShareableUrl(currentUserState);
  const userPassword = currentUserState.password || currentUserState.pin || "123";
  const roleTitle = SYSTEM_ROLES.find((r) => r.id === currentUserState.role)?.title || currentUserState.role;

  // Toggle User Activation / Lock
  const handleToggleStatus = () => {
    if (currentUserState.isSuperAdmin) {
      alert(t("cannotLockAdmin", "لا يمكن قفل أو تعطيل حساب المدير العام الرئيسي."));
      return;
    }

    const nextStatus: "ACTIVE" | "INACTIVE" = isInactive ? "ACTIVE" : "INACTIVE";
    const updated: User = {
      ...currentUserState,
      status: nextStatus,
      isActive: nextStatus === "ACTIVE",
      updatedAt: new Date().toISOString(),
    };

    setCurrentUserState(updated);
    onSaveUser(updated);

    if (nextStatus === "ACTIVE") {
      triggerToast(t("accountActivatedSuccess", `تم تفعيل وتشغيل حساب (${user.fullName}) بنجاح ✓`));
    } else {
      triggerToast(t("accountLockedSuccess", `تم قفل وتعطيل حساب (${user.fullName}) فوراً ومنعه من الدخول 🔒`));
    }
  };

  // Change Account Scope (All vs Specific)
  const handleScopeChange = (newScope: "ALL" | "SPECIFIC") => {
    setAccountScope(newScope);
    const updatedList = newScope === "ALL" ? ["*"] : selectedAccountIds;
    const updated: User = {
      ...currentUserState,
      allowedAccounts: updatedList,
      updatedAt: new Date().toISOString(),
    };
    setCurrentUserState(updated);
    onSaveUser(updated);

    triggerToast(
      newScope === "ALL"
        ? t("allAccountsAllowed", "تم السماح برؤية جميع حسابات الدليل المالي بالكامل (*)")
        : t("specificAccountsAllowed", `تم حصر الرؤية على الحسابات المحددة فقط (${selectedAccountIds.length} حساب)`)
    );
  };

  // Toggle single account in list
  const handleToggleAccount = (accountId: string) => {
    let nextList: string[];
    if (selectedAccountIds.includes(accountId)) {
      nextList = selectedAccountIds.filter((id) => id !== accountId);
    } else {
      nextList = [...selectedAccountIds, accountId];
    }
    setSelectedAccountIds(nextList);

    const updated: User = {
      ...currentUserState,
      allowedAccounts: nextList,
      updatedAt: new Date().toISOString(),
    };
    setCurrentUserState(updated);
    onSaveUser(updated);
    triggerToast(t("accountsUpdated", "تم حفظ وتحديث الحسابات المصرح بها للمستخدم تلقائياً ✓"));
  };

  // Select all filtered accounts
  const handleSelectAllFiltered = () => {
    const ids = filteredAccounts.map((a) => a.id);
    const combined = Array.from(new Set([...selectedAccountIds, ...ids]));
    setSelectedAccountIds(combined);

    const updated: User = {
      ...currentUserState,
      allowedAccounts: combined,
      updatedAt: new Date().toISOString(),
    };
    setCurrentUserState(updated);
    onSaveUser(updated);
    triggerToast(t("selectedAllFiltered", `تم تحديد جميع الحسابات المعروضة (${combined.length}) وحفظها ✓`));
  };

  // Deselect all filtered accounts
  const handleDeselectAllFiltered = () => {
    const idsToRemove = new Set(filteredAccounts.map((a) => a.id));
    const nextList = selectedAccountIds.filter((id) => !idsToRemove.has(id));
    setSelectedAccountIds(nextList);

    const updated: User = {
      ...currentUserState,
      allowedAccounts: nextList,
      updatedAt: new Date().toISOString(),
    };
    setCurrentUserState(updated);
    onSaveUser(updated);
    triggerToast(t("deselectedFiltered", "تم إلغاء تحديد الحسابات المعروضة وحفظ التعديل ✓"));
  };

  // Copy Direct Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(directLinkUrl);
    setCopiedKey("direct-link");
    setTimeout(() => setCopiedKey(null), 2500);
    triggerToast(t("linkCopiedSuccess", "تم نسخ رابط الدخول المباشر بنجاح!"));
  };

  // WhatsApp formatted invitation message
  const getWhatsAppMessage = () => {
    return (
      `مرحباً ${currentUserState.fullName}،\n` +
      `إليك رابط وبيانات تسجيل الدخول المصرح بها لنظام المحاسب ERP:\n\n` +
      `🔗 الرابط المباشر للدخول:\n${directLinkUrl}\n\n` +
      `👤 اسم المستخدم: ${currentUserState.username}\n` +
      `🔑 كلمة المرور: ${userPassword}\n` +
      `📌 رمز PIN السريع: ${currentUserState.pin || "1234"}\n` +
      `🛡️ الرتبة والصلاحية: [${roleTitle}]\n` +
      `📊 الحسابات المصرح بها: [${accountScope === "ALL" ? "جميع الحسابات (*)" : `${selectedAccountIds.length} حساب مصرح`}]\n\n` +
      `*ملاحظة:* عند الضغط على الرابط يفتح النظام مباشرة بالصلاحيات المعينة لك.`
    );
  };

  // Send WhatsApp
  const handleSendWhatsApp = () => {
    const msg = getWhatsAppMessage();
    const cleanPhone = recipientPhone.replace(/[^0-9]/g, "");
    let whatsappUrl = "";
    if (cleanPhone) {
      whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    } else {
      whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    }
    window.open(whatsappUrl, "_blank");
  };

  // Copy full message
  const handleCopyWhatsAppMessage = () => {
    navigator.clipboard.writeText(getWhatsAppMessage());
    setCopiedKey("full-msg");
    setTimeout(() => setCopiedKey(null), 2500);
    triggerToast(t("msgCopiedSuccess", "تم نسخ رسالة الدعوة والبيانات الكاملة!"));
  };

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchQuery =
        acc.name.toLowerCase().includes(searchAccountQuery.toLowerCase()) ||
        acc.code.toLowerCase().includes(searchAccountQuery.toLowerCase());
      const matchType = selectedTypeFilter === "ALL" || acc.type === selectedTypeFilter;
      return matchQuery && matchType;
    });
  }, [accounts, searchAccountQuery, selectedTypeFilter]);

  const uniqueAccountTypes = useMemo(() => {
    const set = new Set<string>();
    accounts.forEach((a) => {
      if (a.type) set.add(a.type);
    });
    return Array.from(set);
  }, [accounts]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div
        className="bg-[#11141B] border border-gray-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Real-time Toast */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white font-bold text-xs px-4 py-2 text-center border-b border-emerald-500 animate-pulse">
            {toastMessage}
          </div>
        )}

        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#161B24] border-b border-gray-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0">
              {currentUserState.fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-base truncate">{currentUserState.fullName}</h3>
                <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  @{currentUserState.username}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {roleTitle}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {t("userAccountsControlSub", "إدارة وتخصيص الحسابات المالية، تفعيل/قفل الحساب، وإرسال رابط الدخول عبر واتساب")}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition shrink-0"
            title={t("close", "إغلاق النافذة")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status & Quick Action Bar (تفعيل أو قفل الحساب) */}
        <div className="p-4 bg-[#141822] border-b border-gray-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                isInactive
                  ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              }`}
            >
              {isInactive ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{t("accountStatus", "حالة الحساب الحالية:")}</span>
                <span
                  className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                    isInactive
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  }`}
                >
                  {isInactive ? t("statusLocked", "🚫 الحساب مقفل وموقوف") : t("statusActive", "🟢 الحساب نشط ومفعل")}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {isInactive
                  ? t("lockedNotice", "تم حظر دخول المستخدم وتجميد رابطه المباشر فوراً.")
                  : t("activeNotice", "المستخدم قادر على الدخول واستخدام الصلاحيات المصرحة.")}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleStatus}
            disabled={currentUserState.isSuperAdmin}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md ${
              isInactive
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40"
                : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40"
            }`}
          >
            {isInactive ? (
              <>
                <Unlock className="w-4 h-4" />
                <span>{t("activateAccount", "تفعيل وتشغيل الحساب الآن")}</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>{t("lockAccount", "قفل وتعطيل الحساب فوراً")}</span>
              </>
            )}
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex border-b border-gray-800 bg-[#12161F] px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab("accounts")}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-t-xl transition border-b-2 ${
              activeTab === "accounts"
                ? "bg-[#181D28] text-blue-400 border-blue-500"
                : "text-gray-400 hover:text-white border-transparent"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{t("authorizedAccounts", "الحسابات المالية المصرح بها")}</span>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full font-mono">
              {accountScope === "ALL" ? "*" : selectedAccountIds.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-t-xl transition border-b-2 ${
              activeTab === "whatsapp"
                ? "bg-[#181D28] text-emerald-400 border-emerald-500"
                : "text-gray-400 hover:text-white border-transparent"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{t("shareViaWhatsAppTab", "الرابط المباشر وواتساب")}</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full">
              واتساب
            </span>
          </button>

          <button
            onClick={() => setActiveTab("screens")}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-t-xl transition border-b-2 ${
              activeTab === "screens"
                ? "bg-[#181D28] text-purple-400 border-purple-500"
                : "text-gray-400 hover:text-white border-transparent"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{t("userScreensAndRole", "الشاشات والصلاحيات")}</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {/* TAB 1: ACCOUNTS CONTROL */}
          {activeTab === "accounts" && (
            <div className="space-y-4">
              {/* Account Scope Switcher */}
              <div className="bg-[#161B25] border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-gray-200">
                  {t("chooseVisibilityScope", "نطاق رؤية الحسابات المالية للمستخدم:")}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleScopeChange("ALL")}
                    className={`p-3 rounded-xl border text-right transition flex items-start gap-3 ${
                      accountScope === "ALL"
                        ? "bg-blue-600/15 border-blue-500 text-blue-200 font-bold shadow-md"
                        : "bg-[#1A1F2B] border-gray-700/80 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <div className="mt-0.5">
                      {accountScope === "ALL" ? (
                        <CheckSquare className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-white font-bold">
                        {t("allAccountsOption", "جميع الحسابات بالكامل (*)")}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5 font-normal">
                        {t("allAccountsDesc", "المستخدم قادر على مشاهدة كافة حسابات الخزينة، البنوك، المصروفات، والعملاء.")}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleScopeChange("SPECIFIC")}
                    className={`p-3 rounded-xl border text-right transition flex items-start gap-3 ${
                      accountScope === "SPECIFIC"
                        ? "bg-blue-600/15 border-blue-500 text-blue-200 font-bold shadow-md"
                        : "bg-[#1A1F2B] border-gray-700/80 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <div className="mt-0.5">
                      {accountScope === "SPECIFIC" ? (
                        <CheckSquare className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-white font-bold">
                        {t("specificAccountsOption", "حسابات محددة فقط")}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5 font-normal">
                        {t("specificAccountsDesc", "تحديد حسابات معينة تظهر للمستخدم (مثل خزينة محددة أو عهدة معينة).")}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Accounts Table & Filter Toolbar */}
              <div className="bg-[#141822] border border-gray-800 rounded-xl p-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* Search input */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      placeholder={t("searchAccountsPlaceholder", "بحث برقم الحساب أو الاسم...")}
                      value={searchAccountQuery}
                      onChange={(e) => setSearchAccountQuery(e.target.value)}
                      className="w-full bg-[#1A1F2C] border border-gray-700/80 rounded-lg pr-9 pl-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>

                  {/* Type Filter */}
                  <select
                    value={selectedTypeFilter}
                    onChange={(e) => setSelectedTypeFilter(e.target.value)}
                    className="bg-[#1A1F2C] border border-gray-700/80 text-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">{t("allTypes", "جميع أنواع الحسابات")}</option>
                    {uniqueAccountTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>

                  {/* Selection Actions */}
                  {accountScope === "SPECIFIC" && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleSelectAllFiltered}
                        className="px-2.5 py-1.5 bg-[#1F2633] hover:bg-[#283244] text-blue-300 rounded-lg text-[11px] font-semibold transition"
                      >
                        {t("selectAll", "تحديد الكل")}
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllFiltered}
                        className="px-2.5 py-1.5 bg-[#1F2633] hover:bg-[#283244] text-gray-300 rounded-lg text-[11px] font-semibold transition"
                      >
                        {t("deselectAll", "إلغاء التحديد")}
                      </button>
                    </div>
                  )}
                </div>

                {/* Counter & Status */}
                <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
                  <span>
                    {accountScope === "ALL" ? (
                      <strong className="text-emerald-400">
                        {t("allAccountsOpen", "جميع الحسابات متاحة للمستخدم دون حجب")}
                      </strong>
                    ) : (
                      <span>
                        {t("selectedCount", "الحسابات المصرح بها:")}{" "}
                        <strong className="text-blue-400 font-mono">{selectedAccountIds.length}</strong> من إجمالي{" "}
                        <strong className="font-mono">{accounts.length}</strong> حساب
                      </span>
                    )}
                  </span>
                  <span>
                    {t("recordsFound", "المعروض بالبحث:")}{" "}
                    <strong className="font-mono">{filteredAccounts.length}</strong>
                  </span>
                </div>

                {/* Accounts List / Table */}
                <div className="max-h-72 overflow-y-auto custom-scrollbar border border-gray-800 rounded-lg divide-y divide-gray-800/80">
                  {filteredAccounts.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-xs">
                      {t("noAccountsFound", "لا توجد حسابات مطابقة لمعايير البحث.")}
                    </div>
                  ) : (
                    filteredAccounts.map((acc) => {
                      const isChecked =
                        accountScope === "ALL" || selectedAccountIds.includes(acc.id);
                      return (
                        <div
                          key={acc.id}
                          onClick={() => {
                            if (accountScope === "SPECIFIC") {
                              handleToggleAccount(acc.id);
                            }
                          }}
                          className={`p-2.5 flex items-center justify-between gap-3 transition cursor-pointer ${
                            isChecked
                              ? "bg-[#181F2C]/60 hover:bg-[#1C2536]"
                              : "bg-[#11141B] hover:bg-[#161A24]"
                          } ${accountScope === "ALL" ? "cursor-default" : ""}`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {accountScope === "SPECIFIC" && (
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleAccount(acc.id)}
                                className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-blue-400 font-bold text-xs">
                                  {acc.code}
                                </span>
                                <span className="font-medium text-white truncate text-xs">
                                  {acc.name}
                                </span>
                                {acc.type && (
                                  <span className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.2 rounded border border-gray-700">
                                    {acc.type}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-left shrink-0 font-mono text-xs">
                            <span
                              className={
                                (acc.balance || 0) >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"
                              }
                            >
                              {(acc.balance || 0).toLocaleString()} {currency}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WHATSAPP SHARING & ASSOCIATED LINK */}
          {activeTab === "whatsapp" && (
            <div className="space-y-4">
              {/* Direct Link Gateway Card */}
              <div className="bg-[#141822] border border-blue-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                    <Globe className="w-4 h-4" />
                    <span>{t("associatedDirectLinkTitle", "الرابط المباشر المرتبط بالمستخدم")}</span>
                  </div>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-mono">
                    Tokenized Secure Link
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={directLinkUrl}
                    className="flex-1 bg-[#1A1F2C] border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-300 select-all focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 transition text-xs shrink-0"
                  >
                    {copiedKey === "direct-link" ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>{t("copied", "تم النسخ!")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>{t("copyLink", "نسخ الرابط")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* WhatsApp Dispatcher Card */}
              <div className="bg-[#141822] border border-emerald-500/30 rounded-xl p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <MessageSquare className="w-4 h-4" />
                    <span>{t("sendViaWhatsAppTitle", "إرسال الرابط وبيانات الحساب فوراً عبر واتساب")}</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                    WhatsApp API
                  </span>
                </div>

                {/* Recipient Phone Input */}
                <div>
                  <label className="block text-gray-300 font-medium mb-1 flex items-center gap-1.5 text-xs">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t("recipientPhoneLabel", "رقم هاتف المستلم بكود الدولة (مثال: 201xxxxxxxxx أو 966xxxxxxxxx):")}</span>
                  </label>
                  <input
                    type="text"
                    placeholder={t("recipientPhonePlaceholder", "مثال: 201012345678 (اتركه فارغاً للاختيار من محادثات واتساب مباشرة)")}
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full bg-[#1A1F2C] border border-gray-700/80 rounded-xl px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 transition text-left dir-ltr text-xs font-mono"
                  />
                </div>

                {/* WhatsApp Message Preview */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-300 font-medium text-xs">
                      {t("messagePreviewLabel", "معاينة الرسالة المجهزة للإرسال:")}
                    </label>
                    <button
                      type="button"
                      onClick={handleCopyWhatsAppMessage}
                      className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      {copiedKey === "full-msg" ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>{t("copied", "تم النسخ!")}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>{t("copyMessageText", "نسخ نص الرسالة")}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-[#0D1017] border border-gray-800 rounded-xl p-3.5 max-h-44 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] text-emerald-300/90 leading-relaxed dir-rtl select-all">
                    {getWhatsAppMessage()}
                  </div>
                </div>

                {/* Direct WhatsApp Action Button */}
                <div className="pt-1 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition shadow-lg shadow-emerald-950/50 text-xs"
                  >
                    <Send className="w-4 h-4" />
                    <span>{t("openWhatsAppNow", "فتح وإرسال الرسالة عبر واتساب الآن 📲")}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: USER SCREENS & ROLE MATRIX */}
          {activeTab === "screens" && (
            <div className="space-y-4">
              <div className="bg-[#141822] border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-200">
                    {t("allowedScreensTitle", "الشاشات المصرح بظهورها في القائمة الجانبية:")}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold font-mono">
                    {currentUserState.allowedTabs.includes("*")
                      ? t("allScreens", "كامل الشاشات (*)")
                      : `${currentUserState.allowedTabs.length} شاشة`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap p-2 bg-[#1A1F2B] rounded-lg border border-gray-800">
                  {currentUserState.allowedTabs.includes("*") ? (
                    <span className="text-xs text-emerald-300 font-bold p-1">
                      ✓ {t("allScreensAccessDesc", "المستخدم لديه وصول لكامل أقسام ولوحات النظام المحاسبي بدون أي حجب.")}
                    </span>
                  ) : (
                    currentUserState.allowedTabs.map((tabId) => (
                      <span
                        key={tabId}
                        className="bg-[#242C3D] text-gray-200 border border-gray-700 px-2.5 py-1 rounded-lg text-xs font-medium"
                      >
                        {tabId}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-[#141822] border border-gray-800 rounded-xl p-4 space-y-2 text-xs text-gray-300">
                <div className="font-bold text-white">{t("credentialsSummary", "بيانات المصادقة السريعة:")}</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
                  <div className="bg-[#1A1F2C] p-2 rounded-lg border border-gray-800">
                    <div className="text-gray-500 text-[10px]">اسم المستخدم</div>
                    <div className="text-blue-300 font-bold">{currentUserState.username}</div>
                  </div>
                  <div className="bg-[#1A1F2C] p-2 rounded-lg border border-gray-800">
                    <div className="text-gray-500 text-[10px]">كلمة المرور</div>
                    <div className="text-amber-300 font-bold">{userPassword}</div>
                  </div>
                  <div className="bg-[#1A1F2C] p-2 rounded-lg border border-gray-800">
                    <div className="text-gray-500 text-[10px]">رمز PIN</div>
                    <div className="text-emerald-300 font-bold">{currentUserState.pin || "1234"}</div>
                  </div>
                  <div className="bg-[#1A1F2C] p-2 rounded-lg border border-gray-800">
                    <div className="text-gray-500 text-[10px]">الدور الوظيفي</div>
                    <div className="text-purple-300 font-bold">{roleTitle}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#161B24] border-t border-gray-800 flex items-center justify-between gap-3">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{t("autoSaveActive", "يتم حفظ كافة التعديلات على الحسابات والحالة تلقائياً ولحظياً.")}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition"
          >
            {t("done", "تم وإغلاق")}
          </button>
        </div>
      </div>
    </div>
  );
};
