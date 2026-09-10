import React, { useState } from "react";
import {
  Wallet,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  Scale,
  FolderKanban,
  Receipt,
  Plus,
  FileSpreadsheet,
  CheckCircle,
  Users,
  ShieldCheck,
  UserCheck,
  KeyRound,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Send,
  Eye,
  EyeOff,
  Lock,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  Account,
  CompanySettings,
  CostCenter,
  JournalEntry,
  TreasuryVoucher,
  BankVoucher,
  Advance,
  InventoryItem,
  User,
  FixedAsset,
} from "../types";
import { Bell, AlertTriangle, AlertCircle, CalendarClock, ArrowLeft, Building2, UserPlus, Layers, Search, PenTool, FileCheck } from "lucide-react";
import { getUserShareableUrl } from "../utils/userLinkService";
import { SYSTEM_ROLES } from "../data/permissionsData";
import { DashboardExcelHub } from "./DashboardExcelHub";
import { DashboardInventoryAdjustments } from "./DashboardInventoryAdjustments";
import { DashboardActualAccountsHub } from "./DashboardActualAccountsHub";
import { DashboardAddUserModal } from "./DashboardAddUserModal";
import { ConsolidatedAssetsDepreciationModal } from "./ConsolidatedAssetsDepreciationModal";
import { WhatsAppShareModal } from "./WhatsAppShareModal";
import { UserSignatureModal } from "./UserSignatureModal";
import { WhatsAppShareData } from "../utils/whatsapp";
import { printReport, exportReportToPdf } from "../utils/export";

interface DashboardViewProps {
  accounts: Account[];
  journalEntries: JournalEntry[];
  treasuryVouchers: TreasuryVoucher[];
  bankVouchers: BankVoucher[];
  costCenters: CostCenter[];
  advances?: Advance[];
  inventoryItems?: InventoryItem[];
  fixedAssets?: FixedAsset[];
  companySettings: CompanySettings;
  users?: User[];
  currentUser?: User | null;
  onNavigateTab?: (tab: any) => void;
  onNavigate?: (tab: any) => void;
  onOpenQuickJournal?: () => void;
  onOpenQuickVoucher?: () => void;
  onOpenShareModal?: () => void;
  onSwitchUserRequest?: (user: User) => void;
  onSaveUser?: (user: User) => void;
  onSaveJournalEntry?: (entry: JournalEntry) => void;
  onSaveInventoryItem?: (item: InventoryItem) => void;
  onSaveAccount?: (account: Account) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  accounts,
  journalEntries,
  treasuryVouchers,
  bankVouchers,
  costCenters,
  advances = [],
  inventoryItems = [],
  fixedAssets = [],
  companySettings,
  users = [],
  currentUser,
  onNavigateTab,
  onNavigate,
  onOpenQuickJournal,
  onOpenQuickVoucher,
  onOpenShareModal,
  onSwitchUserRequest,
  onSaveUser,
  onSaveJournalEntry,
  onSaveInventoryItem,
  onSaveAccount,
}) => {
  const navigateTo = onNavigateTab || onNavigate || (() => {});
  const [revealedPasswords, setRevealedPasswords] = useState<{ [userId: string]: boolean }>({});
  const [copiedLinkMap, setCopiedLinkMap] = useState<{ [userId: string]: boolean }>({});
  const [copiedMsgMap, setCopiedMsgMap] = useState<{ [userId: string]: boolean }>({});
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAssetDepreciationModal, setShowAssetDepreciationModal] = useState(false);

  // Real-time accounts list & opening balance state
  const [accountFilterCategory, setAccountFilterCategory] = useState<string>("ALL");
  const [accountSearchQuery, setAccountSearchQuery] = useState<string>("");
  const [quickOpeningEditAccount, setQuickOpeningEditAccount] = useState<Account | null>(null);
  const [quickOpeningVal, setQuickOpeningVal] = useState<string>("");
  const [whatsAppModalData, setWhatsAppModalData] = useState<WhatsAppShareData | null>(null);
  const [signatureModalUser, setSignatureModalUser] = useState<User | null>(null);
  const [includePrintSignatures, setIncludePrintSignatures] = useState<boolean>(true);

  const isAdmin =
    currentUser?.role === "SUPER_ADMIN" ||
    currentUser?.role === "ADMIN" ||
    currentUser?.isSuperAdmin;

  const togglePasswordReveal = (userId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleCopyUserLink = (user: User) => {
    const link = getUserShareableUrl(user);
    navigator.clipboard.writeText(link);
    setCopiedLinkMap((prev) => ({ ...prev, [user.id]: true }));
    setTimeout(() => {
      setCopiedLinkMap((prev) => ({ ...prev, [user.id]: false }));
    }, 2500);
  };

  const handleCopyWhatsAppText = (user: User) => {
    const link = getUserShareableUrl(user);
    const pass = user.password || user.pin || "123";
    const msg = `مرحباً ${user.fullName}،\nإليك رابط وبيانات الدخول المعتمدة لبرنامج المحاسبة (${companySettings.companyName || "نظام المحاسب ERP"}):\n\n🔗 الرابط المباشر:\n${link}\n\n👤 اسم المستخدم: ${user.username}\n🔑 كلمة المرور: ${pass}\n📌 رمز PIN السريع: ${user.pin || "1234"}\n🛡️ الدور المصرح به: [${user.role}]\n\nيرجى استخدام كلمة المرور المسجلة أعلاه للدخول.`;
    navigator.clipboard.writeText(msg);
    setCopiedMsgMap((prev) => ({ ...prev, [user.id]: true }));
    setTimeout(() => {
      setCopiedMsgMap((prev) => ({ ...prev, [user.id]: false }));
    }, 2500);
  };

  // Calculate notifications
  const lowStockItems = inventoryItems.filter((item) => item.quantity <= item.minLevel);
  const activeAdvances = advances.filter((adv) => adv.status === "ACTIVE" && adv.remainingAmount > 0);

  // Calculate balances using actual sub-accounts (non-header accounts)
  const treasurySubAccounts = accounts.filter(
    (a) =>
      !a.isHeader &&
      (a.code.startsWith("1111") ||
        a.code.startsWith("1112") ||
        (a.parentId === "1110" && (a.nameAr.includes("خزينة") || a.nameAr.includes("صندوق") || a.nameAr.includes("نقدية"))) ||
        a.nameAr.includes("خزينة") ||
        a.nameAr.includes("الصندوق") ||
        a.nameAr.includes("نقدية بالخزينة")) &&
      !a.nameAr.includes("بنك")
  );

  const bankSubAccounts = accounts.filter(
    (a) =>
      !a.isHeader &&
      (a.code.startsWith("1113") ||
        a.code.startsWith("1114") ||
        a.code.startsWith("1115") ||
        (a.parentId === "1110" && (a.nameAr.includes("بنك") || a.nameAr.includes("Bank"))) ||
        a.nameAr.includes("بنك") ||
        a.nameAr.includes("مصرف")) &&
      !a.code.startsWith("112") &&
      !a.nameAr.includes("عملاء")
  );

  const totalTreasuryBalance = treasurySubAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalBankBalance = bankSubAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  // Calculate Total Revenues, Expenses & Assets using actual sub-accounts
  const revenueAccounts = accounts.filter((a) => !a.isHeader && a.type === "REVENUE");
  const expenseAccounts = accounts.filter((a) => !a.isHeader && a.type === "EXPENSE");
  const assetAccounts = accounts.filter((a) => !a.isHeader && a.type === "ASSET");
  const liabilityAccounts = accounts.filter((a) => !a.isHeader && a.type === "LIABILITY");
  const equityAccounts = accounts.filter((a) => !a.isHeader && a.type === "EQUITY");

  const totalRevenues = revenueAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalExpenses = expenseAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const netProfit = totalRevenues - totalExpenses;
  const totalAssets = assetAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalEquity = equityAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  // Estimated Taxes Due (14% VAT) from sub-accounts
  const vatSubAccounts = accounts.filter(
    (a) => !a.isHeader && (a.code.startsWith("2120") || a.nameAr.includes("قيمة مضافة") || a.nameAr.includes("ضرائب"))
  );
  const vatDue = vatSubAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-slate-900 rounded-2xl p-6 border border-slate-800 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-medium border border-blue-500/30">
              السنة المالية النشطة {companySettings.financialYear}
            </span>
            <h2 className="text-2xl font-bold mt-2">
              أهلاً بك في نظام {companySettings.companyName}
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              إدارة محاسبية متكاملة لدليل الحسابات، قيود اليومية، حركة الخزينة والبنوك، مراكز تكلفة المشاريع، والتقارير المالية المعتمدة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowAssetDepreciationModal(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition shadow-lg shadow-purple-600/30"
              title="شيت مجمع إهلاك الأصول الثابتة الشامل لكل أصل"
            >
              <Building2 className="w-4 h-4 text-amber-300" />
              <span>شيت مجمع إهلاك الأصول</span>
            </button>
            <button
              onClick={onOpenQuickJournal}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition shadow-lg shadow-blue-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>إدخال قيد يدوي</span>
            </button>
            <button
              onClick={onOpenQuickVoucher}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition shadow-lg shadow-emerald-600/30"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>إضافة سند جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Notifications System (نظام التنبيهات التلقائي) */}
      {(lowStockItems.length > 0 || activeAdvances.length > 0) && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg animate-pulse">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">تنبيهات النظام والتذكيرات الهامة (Dashboard Notifications)</h3>
                <p className="text-xs text-slate-400">
                  تنبيهات حول مواعيد استحقاق السلف وانخفاض أرصدة الأصناف عن حد الطلب
                </p>
              </div>
            </div>
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-bold">
              {lowStockItems.length + activeAdvances.length} تنبيهات نشطة
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Low Stock Alerts */}
            {lowStockItems.length > 0 && (
              <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-xs text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                    تنبيه انخفاض المخزون عن حد الطلب ({lowStockItems.length} أصناف)
                  </span>
                  <button
                    onClick={() => navigateTo("inventory")}
                    className="text-[11px] text-rose-300 hover:text-white underline flex items-center gap-1"
                  >
                    <span>إدارة المخزون</span>
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {lowStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-900/80 p-2 rounded-lg border border-rose-500/20 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white">{item.name}</span>
                        <span className="text-[10px] text-slate-400 block">كود: {item.sku}</span>
                      </div>
                      <div className="text-left font-mono">
                        <span className="text-rose-400 font-bold block">{item.quantity} {item.unit}</span>
                        <span className="text-[10px] text-slate-400">حد الطلب: {item.minLevel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advances Due Alerts */}
            {activeAdvances.length > 0 && (
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-xs text-amber-400">
                    <CalendarClock className="w-4 h-4" />
                    تنبيه سلف الموظفين القائمة والاستحقاق ({activeAdvances.length} سلفة)
                  </span>
                  <button
                    onClick={() => navigateTo("treasury")}
                    className="text-[11px] text-amber-300 hover:text-white underline flex items-center gap-1"
                  >
                    <span>حركة الخزينة والسلف</span>
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {activeAdvances.map((adv) => (
                    <div
                      key={adv.id}
                      className="bg-slate-900/80 p-2 rounded-lg border border-amber-500/20 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white">{adv.employeeName}</span>
                        <span className="text-[10px] text-slate-400 block">تاريخ البدء: {adv.startDate}</span>
                      </div>
                      <div className="text-left font-mono">
                        <span className="text-amber-400 font-bold block">
                          المتبقي: {adv.remainingAmount.toLocaleString()} {companySettings.currency}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          القسط: {adv.monthlyDeduction.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Treasury Card */}
        <div className="bg-[#11141B] border border-gray-800 rounded-xl p-4 shadow-sm hover:border-gray-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">رصيد الخزينة الرئيسية</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-emerald-400 mt-2">
            {totalTreasuryBalance.toLocaleString()} {companySettings.currency}
          </p>
          <p className="text-[11px] text-emerald-500 mt-1 flex items-center gap-1 font-medium">
            <CheckCircle className="w-3 h-3 text-emerald-400" /> متاح للعمليات اليومية
          </p>
        </div>

        {/* Bank Card */}
        <div className="bg-[#11141B] border border-gray-800 rounded-xl p-4 shadow-sm hover:border-gray-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">سيولة البنوك المتاحة</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-blue-400 mt-2">
            {totalBankBalance.toLocaleString()} {companySettings.currency}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            حسابات جارية البنك الأهلي و CIB
          </p>
        </div>

        {/* Total Revenues */}
        <div className="bg-[#11141B] border border-gray-800 rounded-xl p-4 shadow-sm hover:border-gray-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">إجمالي الإيرادات المقيدة</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-emerald-400 mt-2">
            {totalRevenues.toLocaleString()} {companySettings.currency}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            مبيعات وعقود خدمات الميدانية
          </p>
        </div>

        {/* Net Profit */}
        <div className="bg-[#11141B] border border-gray-800 rounded-xl p-4 shadow-sm hover:border-gray-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">صافي الأرباح التشغيلية</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-xl font-extrabold mt-2 ${netProfit >= 0 ? "text-purple-400" : "text-rose-400"}`}>
            {netProfit.toLocaleString()} {companySettings.currency}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            قبل استقطاع الضرائب المستحقة
          </p>
        </div>

      </div>

      {/* System Users & Direct Links Section (مستخدمو النظام والروابط الخاصة وإدارة الصلاحيات) */}
      <div className="bg-[#11141B] border border-gray-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">مستخدمو النظام والروابط المباشرة والصلاحيات</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold">
                  {users.length} مستخدمين
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                روابط وصول مخصصة لكل مستخدم، كلمات المرور المعتمدة لمدير النظام، والمشاركة المباشرة عبر واتساب
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow"
                title="إضافة مستخدم جديد للنظام وتحديد دوره"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ إضافة مستخدم جديد</span>
              </button>
            )}
            {onOpenShareModal && (
              <button
                onClick={onOpenShareModal}
                className="flex items-center gap-1.5 bg-[#1A1F26] hover:bg-[#222934] text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                title="إنشاء رابط مستخدم جديد وتحديد صلاحياته"
              >
                <Share2 className="w-3.5 h-3.5 text-purple-400" />
                <span>+ رابط مستخدم جديد</span>
              </button>
            )}
            <button
              onClick={() => navigateTo("users")}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shadow-md shadow-blue-900/20"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>إدارة الصلاحيات والمستخدمين ←</span>
            </button>
          </div>
        </div>

        {/* Users Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {users.map((u) => {
            const isSelf = currentUser?.id === u.id;
            const roleInfo = SYSTEM_ROLES.find((r) => r.id === u.role);
            const roleTitle = roleInfo?.title || u.role;
            const isUserAdmin = u.role === "SUPER_ADMIN" || u.role === "ADMIN" || u.isSuperAdmin;
            const userPassword = u.password || u.pin || "123";
            const userPin = u.pin || "1234";
            const isPassVisible = revealedPasswords[u.id];
            const isLinkCopied = copiedLinkMap[u.id];
            const isMsgCopied = copiedMsgMap[u.id];
            const allowedCount = Array.isArray(u.allowedTabs) ? u.allowedTabs.length : 0;
            const hasAllTabs = u.allowedTabs?.includes("*") || isUserAdmin;

            return (
              <div
                key={u.id}
                className={`bg-[#161B22] border rounded-xl p-4 flex flex-col justify-between space-y-3 transition hover:border-gray-700 ${
                  isSelf
                    ? "border-blue-500/50 shadow-md shadow-blue-500/5"
                    : u.isActive === false || u.status === "INACTIVE"
                    ? "border-red-900/40 opacity-75"
                    : "border-gray-800"
                }`}
              >
                {/* User Top Meta */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 font-bold flex items-center justify-center text-sm shadow-inner shrink-0">
                      {u.fullName.charAt(0) || u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs leading-tight">
                          {u.fullName}
                        </span>
                        {isSelf && (
                          <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded font-semibold">
                            أنت
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 font-mono block mt-0.5">
                        @{u.username}
                      </span>
                    </div>
                  </div>

                  <div className="text-left">
                    {isAdmin && onSaveUser ? (
                      <button
                        onClick={() => {
                          const isCurrentlyActive = u.isActive !== false && u.status !== "INACTIVE";
                          const nextStatus = isCurrentlyActive ? "INACTIVE" : "ACTIVE";
                          onSaveUser({
                            ...u,
                            status: nextStatus,
                            isActive: nextStatus === "ACTIVE",
                          });
                        }}
                        className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border transition cursor-pointer ${
                          u.isActive !== false && u.status !== "INACTIVE"
                            ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
                        }`}
                        title="انقر لتعديل حالة الحساب (تفعيل / تعطيل)"
                      >
                        {u.isActive !== false && u.status !== "INACTIVE" ? "نشط (تعديل)" : "موقوف (تفعيل)"}
                      </button>
                    ) : (
                      <span
                        className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          u.isActive !== false && u.status !== "INACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {u.isActive !== false && u.status !== "INACTIVE" ? "نشط" : "موقوف"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Role & Permissions Badge */}
                <div className="bg-[#0D1117] p-2 rounded-lg border border-gray-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-gray-400 font-medium">الدور المصرح:</span>
                  <span className="font-semibold text-purple-300 truncate max-w-[140px]" title={roleTitle}>
                    {roleTitle}
                  </span>
                </div>

                {/* Password Box for Admin Inspection (معرفة كلمة السر لكل نظام) */}
                <div className="bg-[#0D1117] p-2.5 rounded-lg border border-gray-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>بيانات الدخول (كلمة السر):</span>
                    </span>

                    {isAdmin ? (
                      <button
                        onClick={() => togglePasswordReveal(u.id)}
                        className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20"
                        title={isPassVisible ? "إخفاء كلمة المرور" : "كشف ومعرفة كلمة المرور للمدير"}
                      >
                        {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{isPassVisible ? "إخفاء" : "معرفة السر"}</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-500">مشفرة</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between font-mono text-xs px-2 py-1 bg-[#161B22] rounded border border-gray-800">
                    <span className="text-gray-300 font-bold">
                      {isAdmin && isPassVisible ? (
                        <span className="text-amber-300">{userPassword} (PIN: {userPin})</span>
                      ) : (
                        <span className="tracking-widest text-gray-500">••••••••</span>
                      )}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(userPassword);
                          setCopiedMsgMap((p) => ({ ...p, [u.id]: true }));
                          setTimeout(() => setCopiedMsgMap((p) => ({ ...p, [u.id]: false })), 2000);
                        }}
                        className="text-[10px] text-gray-400 hover:text-white"
                        title="نسخ كلمة السر"
                      >
                        {copiedMsgMap[u.id] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  <div className="text-[10px] text-gray-400 flex items-center justify-between pt-0.5">
                    <span>الشاشات المتاحة:</span>
                    <span className="text-blue-400 font-semibold">
                      {hasAllTabs ? "كامل الشاشات (Full)" : `${allowedCount} شاشات`}
                    </span>
                  </div>
                </div>

                {/* Actions: Send WhatsApp, Copy Link, Switch with Password */}
                <div className="pt-2 border-t border-gray-800/80 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Copy Link */}
                    <button
                      onClick={() => handleCopyUserLink(u)}
                      className="flex items-center justify-center gap-1 bg-[#1A1F26] hover:bg-[#252D37] text-gray-200 border border-gray-700/80 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition"
                      title="نسخ الرابط المباشر لهذا المستخدم"
                    >
                      {isLinkCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">تم النسخ!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-blue-400" />
                          <span>نسخ الرابط</span>
                        </>
                      )}
                    </button>

                    {/* WhatsApp Send */}
                    <button
                      onClick={() => {
                        const link = getUserShareableUrl(u);
                        const pass = u.password || u.pin || "123";
                        const msg = `🏢 *${companySettings.companyName || "نظام المحاسب ERP"}*\n👤 مرحباً بك زميلنا: *${u.fullName}*\n\nإليك رابط وبيانات تسجيل الدخول الخاصة بك:\n\n🔗 *رابط الدخول المباشر:*\n${link}\n\n👤 *اسم المستخدم:* ${u.username}\n🔑 *كلمة المرور:* ${pass}\n📌 *رمز PIN:* ${u.pin || "1234"}\n🛡️ *الصلاحية المصرحة:* [${roleTitle}]\n\n⚠️ يرجى حفظ سرية بياناتك وعدم مشاركتها.`;
                        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
                        window.open(url, "_blank");
                      }}
                      className="flex items-center justify-center gap-1 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition"
                      title="إرسال رابط وبيانات الدخول عبر واتساب"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-400" />
                      <span>إرسال واتساب</span>
                    </button>
                  </div>

                  {/* Switch User Button (Protected by password verification modal) */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSwitchUserRequest?.(u)}
                      disabled={isSelf}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition border ${
                        isSelf
                          ? "bg-gray-800/50 text-gray-500 border-gray-800 cursor-not-allowed"
                          : "bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 border-blue-500/30 hover:border-blue-500/50"
                      }`}
                      title={
                        isSelf
                          ? "أنت متصل بهذا الحساب حالياً"
                          : "التبديل إلى هذا الحساب (يلزم إدخال كلمة المرور)"
                      }
                    >
                      <Lock className="w-3 h-3 text-blue-400" />
                      <span>{isSelf ? "الجلسة الحالية" : "دخول بكلمة السر"}</span>
                    </button>

                    <button
                      onClick={() => setSignatureModalUser(u)}
                      className={`p-1.5 rounded-lg text-[11px] border transition flex items-center gap-1 ${
                        u.electronicSignature
                          ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/60"
                          : "bg-gray-800 border-gray-700 text-amber-400 hover:bg-gray-700"
                      }`}
                      title={u.electronicSignature ? "تعديل واعتماد التوقيع الإلكتروني" : "إضافة واعتماد توقيع/إمضاء إلكتروني للمستخدم"}
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span className="text-[10px] hidden sm:inline">{u.electronicSignature ? "إمضاء معتمد" : "إمضاء"}</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => navigateTo("users")}
                        className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-[11px] border border-gray-700 transition"
                        title="تعديل صلاحيات المستخدم المحددة"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Excel Sheets Hub (شيتات إكسيل في الرئيسية) */}
      <DashboardExcelHub
        accounts={accounts}
        journalEntries={journalEntries}
        treasuryVouchers={treasuryVouchers}
        bankVouchers={bankVouchers}
        advances={advances}
        fixedAssets={fixedAssets}
        inventoryItems={inventoryItems}
        companySettings={companySettings}
      />

      {/* Actual Balances Hub with Real-Time Opening Balance Modification (الأرصدة الفعلية للحسابات التفصيلية) */}
      <DashboardActualAccountsHub
        accounts={accounts}
        journalEntries={journalEntries}
        companySettings={companySettings}
        currentUser={currentUser}
        onSaveAccount={onSaveAccount}
        onNavigateTab={navigateTo}
      />

      {/* Inventory & Cash Adjustments Hub (التسويات الجردية في الرئيسية) */}
      <DashboardInventoryAdjustments
        accounts={accounts}
        inventoryItems={inventoryItems}
        journalEntries={journalEntries}
        costCenters={costCenters}
        companySettings={companySettings}
        currentUser={currentUser}
        onSaveJournalEntry={onSaveJournalEntry}
        onSaveInventoryItem={onSaveInventoryItem}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cost Centers Quick Overview */}
        <div className="lg:col-span-2 bg-[#11141B] border border-gray-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-white text-sm">مراكز التكلفة والمشاريع النشطة</h3>
            </div>
            <button
              onClick={() => onNavigateTab("cost_centers")}
              className="text-xs text-blue-400 hover:underline"
            >
              عرض الكل والتفاصيل ←
            </button>
          </div>

          <div className="space-y-3">
            {costCenters.map((cc) => {
              const percentage = Math.min(100, Math.round((cc.spent / (cc.budget || 1)) * 100));
              return (
                <div key={cc.id} className="bg-[#1A1F26] p-3 rounded-lg border border-gray-800">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-white">{cc.name}</span>
                    <span className="text-gray-400">
                      المصروف: <strong className="text-orange-400">{cc.spent.toLocaleString()}</strong> / الميزانية: {cc.budget.toLocaleString()} {companySettings.currency}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        percentage > 85 ? "bg-rose-500" : percentage > 60 ? "bg-orange-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                    <span>مدير المشروع: {cc.projectManager || "غير محدد"}</span>
                    <span>نسبة الاستهلاك: {percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Highlights & Tax Box */}
        <div className="bg-[#11141B] border border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
            <Receipt className="w-5 h-5 text-orange-400" />
            <h3 className="font-bold text-white text-sm">الالتزامات والضرائب المستحقة</h3>
          </div>

          <div className="bg-[#1A1F26] p-3.5 rounded-lg border border-gray-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">ضريبة القيمة المضافة (14%):</span>
              <span className="font-bold text-orange-400">{vatDue.toLocaleString()} {companySettings.currency}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">إجمالي المصروفات الإدارية:</span>
              <span className="font-bold text-rose-400">{totalExpenses.toLocaleString()} {companySettings.currency}</span>
            </div>
            <div className="flex justify-between text-xs pt-2 border-t border-gray-800">
              <span className="text-gray-200 font-semibold">صافي موقف السيولة:</span>
              <span className="font-bold text-emerald-400">
                {(totalTreasuryBalance + totalBankBalance - vatDue).toLocaleString()} {companySettings.currency}
              </span>
            </div>
          </div>

          <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg text-xs text-blue-200">
            <p className="font-bold mb-1">💡 نصيحة التحليل المالي:</p>
            <p className="text-[11px] leading-relaxed text-blue-300">
              يمكنك استخدام تبويب "التحليل المالي وزيادة الإنتاجية" لإنشاء تقارير بالذكاء الاصطناعي تقدم توصيات لتقليل هدر المصروفات ومراقبة تصفية العهد والسلف.
            </p>
          </div>
        </div>

      </div>

      {/* Recent Journal Entries Table */}
      <div className="bg-[#11141B] border border-gray-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-sm">آخر القيود والمعاملات المقيدة</h3>
          <button
            onClick={() => onNavigateTab("journal")}
            className="text-xs text-blue-400 hover:underline"
          >
            عرض دفتر اليومية الكامل ←
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right text-slate-300">
            <thead className="bg-[#0A0C10] text-gray-400 border-b border-gray-800">
              <tr>
                <th className="p-2.5">رقم القيد</th>
                <th className="p-2.5">التاريخ</th>
                <th className="p-2.5">المرجع</th>
                <th className="p-2.5">البيان والملحوظات</th>
                <th className="p-2.5">المبلغ الإجمالي</th>
                <th className="p-2.5">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {journalEntries.slice(0, 5).map((je) => {
                const totalDebit = je.lines.reduce((s, l) => s + l.debit, 0);
                return (
                  <tr key={je.id} className="hover:bg-gray-800/30">
                    <td className="p-2.5 font-bold font-mono text-blue-400">{je.entryNumber}</td>
                    <td className="p-2.5 text-gray-400">{je.date}</td>
                    <td className="p-2.5">{je.reference || "-"}</td>
                    <td className="p-2.5 max-w-xs truncate">{je.notes}</td>
                    <td className="p-2.5 font-bold text-white">
                      {totalDebit.toLocaleString()} {companySettings.currency}
                    </td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        رحل ومرحل
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dashboard Add User Modal */}
      {onSaveUser && (
        <DashboardAddUserModal
          isOpen={showAddUserModal}
          onClose={() => setShowAddUserModal(false)}
          onSaveUser={onSaveUser}
          existingUsers={users}
        />
      )}

      {/* Consolidated Depreciation Sheet Modal */}
      <ConsolidatedAssetsDepreciationModal
        isOpen={showAssetDepreciationModal}
        onClose={() => setShowAssetDepreciationModal(false)}
        fixedAssets={fixedAssets}
        costCenters={costCenters}
        companySettings={companySettings}
        onSaveJournalEntry={onSaveJournalEntry}
      />

      {/* User Electronic Signature Modal */}
      {signatureModalUser && (
        <UserSignatureModal
          isOpen={!!signatureModalUser}
          user={signatureModalUser}
          canApproveAsAdmin={isAdmin}
          onClose={() => setSignatureModalUser(null)}
          onSaveSignature={(data) => {
            if (onSaveUser && signatureModalUser) {
              onSaveUser({
                ...signatureModalUser,
                ...data,
              });
            }
            setSignatureModalUser(null);
          }}
        />
      )}

    </div>
  );
};
