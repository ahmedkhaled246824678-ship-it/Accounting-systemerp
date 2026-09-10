import React, { useState, useMemo } from "react";
import {
  Wallet,
  Building,
  Users,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Search,
  Printer,
  FileSpreadsheet,
  Edit3,
  Check,
  Send,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Account, CompanySettings, JournalEntry, User } from "../types";
import { WhatsAppShareModal } from "./WhatsAppShareModal";
import { WhatsAppShareData } from "../utils/whatsapp";
import { printReport, exportToExcel } from "../utils/export";

interface DashboardActualAccountsHubProps {
  accounts: Account[];
  journalEntries: JournalEntry[];
  companySettings: CompanySettings;
  currentUser?: User | null;
  onSaveAccount?: (account: Account) => void;
  onNavigateTab?: (tab: any) => void;
}

export const DashboardActualAccountsHub: React.FC<DashboardActualAccountsHubProps> = ({
  accounts,
  journalEntries,
  companySettings,
  currentUser,
  onSaveAccount,
  onNavigateTab,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [openingBalanceInput, setOpeningBalanceInput] = useState<string>("");
  const [whatsAppModalData, setWhatsAppModalData] = useState<WhatsAppShareData | null>(null);
  const [includeSignatureInPrint, setIncludeSignatureInPrint] = useState<boolean>(true);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filter sub-accounts (non-header)
  const subAccounts = useMemo(() => {
    return accounts.filter((a) => !a.isHeader);
  }, [accounts]);

  // Compute category matching
  const getAccountCategoryKey = (acc: Account): string => {
    const code = acc.code;
    const name = acc.nameAr.toLowerCase();

    if (code.startsWith("1111") || name.includes("خزينة") || name.includes("صندوق") || name.includes("نقدية")) {
      return "TREASURY";
    }
    if (code.startsWith("1113") || code.startsWith("1114") || name.includes("بنك")) {
      return "BANK";
    }
    if (code.startsWith("112") || name.includes("عملاء") || name.includes("مدين")) {
      return "CUSTOMER";
    }
    if (code.startsWith("211") || name.includes("مورد") || name.includes("دائن")) {
      return "SUPPLIER";
    }
    if (acc.type === "EXPENSE" || code.startsWith("5")) {
      return "EXPENSE";
    }
    if (acc.type === "REVENUE" || code.startsWith("4")) {
      return "REVENUE";
    }
    if (acc.type === "ASSET") {
      return "ASSET";
    }
    if (acc.type === "LIABILITY") {
      return "LIABILITY";
    }
    return "EQUITY";
  };

  // Filtered accounts list
  const filteredAccounts = useMemo(() => {
    return subAccounts.filter((acc) => {
      // Category filter
      if (activeCategory !== "ALL") {
        const cat = getAccountCategoryKey(acc);
        if (activeCategory === "TREASURY" && cat !== "TREASURY") return false;
        if (activeCategory === "BANK" && cat !== "BANK") return false;
        if (activeCategory === "CUSTOMER" && cat !== "CUSTOMER") return false;
        if (activeCategory === "SUPPLIER" && cat !== "SUPPLIER") return false;
        if (activeCategory === "EXPENSE" && cat !== "EXPENSE") return false;
        if (activeCategory === "REVENUE" && cat !== "REVENUE") return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = acc.nameAr.toLowerCase().includes(q) || acc.nameEn.toLowerCase().includes(q);
        const matchesCode = acc.code.includes(q);
        if (!matchesName && !matchesCode) return false;
      }

      return true;
    });
  }, [subAccounts, activeCategory, searchQuery]);

  // Aggregate stats
  const totalOpening = useMemo(() => {
    return filteredAccounts.reduce((sum, a) => sum + (a.openingBalance || 0), 0);
  }, [filteredAccounts]);

  const totalActual = useMemo(() => {
    return filteredAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  }, [filteredAccounts]);

  const totalNetMovements = totalActual - totalOpening;

  // Open Edit Opening Balance Modal
  const handleOpenEdit = (acc: Account) => {
    setEditingAccount(acc);
    setOpeningBalanceInput((acc.openingBalance || 0).toString());
  };

  // Save Opening Balance and automatically adjust actual balance in real time
  const handleSaveOpeningBalance = () => {
    if (!editingAccount || !onSaveAccount) return;
    const newOpening = parseFloat(openingBalanceInput) || 0;
    const oldOpening = editingAccount.openingBalance || 0;
    const diff = newOpening - oldOpening;

    // The actual balance reflects openingBalance + journal movements.
    // So changing the opening balance by diff directly changes the actual balance by diff.
    const updatedAccount: Account = {
      ...editingAccount,
      openingBalance: newOpening,
      balance: (editingAccount.balance || 0) + diff,
    };

    onSaveAccount(updatedAccount);
    setEditingAccount(null);
    setSuccessToast(`تم تحديث الرصيد الافتتاحي للحساب (${updatedAccount.nameAr}) وانعكاس الرصيد الفعلي فوراً!`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Open WhatsApp Share for an Account
  const handleOpenWhatsAppShare = (acc: Account) => {
    const opening = acc.openingBalance || 0;
    const actual = acc.balance || 0;
    const movements = actual - opening;

    const data: WhatsAppShareData = {
      title: `كشف رصيد حساب: ${acc.nameAr}`,
      subtitle: `كود الحساب: ${acc.code} | العملة: ${companySettings.currency}`,
      recipientName: acc.nameAr,
      details: [
        { label: "كود الحساب المالي", value: acc.code },
        { label: "اسم الحساب", value: acc.nameAr },
        { label: "طبيعة الحساب", value: acc.type === "ASSET" ? "أصول" : acc.type === "LIABILITY" ? "التزامات" : acc.type === "EXPENSE" ? "مصروفات" : acc.type === "REVENUE" ? "إيرادات" : "حقوق ملكية" },
        { label: "[1] الرصيد الافتتاحي المعتمد", value: `${opening.toLocaleString()} ${companySettings.currency}` },
        { label: "[2] صافي القيود والحركات", value: `${movements.toLocaleString()} ${companySettings.currency}` },
        { label: "[3] الرصيد الفعلي الحالي المطابق", value: `${actual.toLocaleString()} ${companySettings.currency}` },
      ],
      totalAmount: actual,
      currency: companySettings.currency,
      notes: "تمت مراجعة ومطابقة الرصيد الفعلي لحظياً عبر النظام المحاسبي ERP.",
    };

    setWhatsAppModalData(data);
  };

  // Print Actual Balances Table
  const handlePrintActualBalances = async () => {
    const title = `كشف الأرصدة الفعلية والافتتاحية للحسابات التفصيلية`;
    const rows = filteredAccounts
      .map(
        (acc, idx) => `
        <tr style="${idx % 2 === 0 ? "background: #f8fafc;" : ""}">
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold; text-align: center;">${acc.code}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${acc.nameAr}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${acc.type}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: #b45309; font-weight: bold;">${(acc.openingBalance || 0).toLocaleString()} ${companySettings.currency}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: #2563eb;">${((acc.balance || 0) - (acc.openingBalance || 0)).toLocaleString()} ${companySettings.currency}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: #15803d; font-weight: bold; background: #f0fdf4;">${(acc.balance || 0).toLocaleString()} ${companySettings.currency}</td>
        </tr>
      `
      )
      .join("");

    const html = `
      <div style="font-family: 'Cairo', sans-serif; font-size: 11px;">
        <div style="margin-bottom: 16px; padding: 12px; background: #f1f5f9; border-radius: 8px; border: 1px solid #cbd5e1; display: flex; justify-content: space-between;">
          <div>
            <strong style="color: #1e3a8a; font-size: 13px;">إجمالي الأرصدة الافتتاحية:</strong> ${totalOpening.toLocaleString()} ${companySettings.currency}
          </div>
          <div>
            <strong style="color: #2563eb; font-size: 13px;">إجمالي صافي الحركات:</strong> ${totalNetMovements.toLocaleString()} ${companySettings.currency}
          </div>
          <div>
            <strong style="color: #15803d; font-size: 13px;">إجمالي الأرصدة الفعلية الحالية:</strong> ${totalActual.toLocaleString()} ${companySettings.currency}
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #1e293b; color: white;">
              <th style="padding: 10px; border: 1px solid #475569; width: 12%;">كود الحساب</th>
              <th style="padding: 10px; border: 1px solid #475569; text-align: right;">اسم الحساب التفصيلي</th>
              <th style="padding: 10px; border: 1px solid #475569; width: 12%;">النوع</th>
              <th style="padding: 10px; border: 1px solid #475569; text-align: right; width: 18%;">الرصيد الافتتاحي</th>
              <th style="padding: 10px; border: 1px solid #475569; text-align: right; width: 18%;">صافي القيود والحركات</th>
              <th style="padding: 10px; border: 1px solid #475569; text-align: right; width: 20%;">الرصيد الفعلي الحالي</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr style="background: #e2e8f0; font-weight: bold;">
              <td colspan="3" style="padding: 10px; border: 1px solid #94a3b8; text-align: center;">الإجماليات الكلية:</td>
              <td style="padding: 10px; border: 1px solid #94a3b8; text-align: right; color: #b45309;">${totalOpening.toLocaleString()} ${companySettings.currency}</td>
              <td style="padding: 10px; border: 1px solid #94a3b8; text-align: right; color: #2563eb;">${totalNetMovements.toLocaleString()} ${companySettings.currency}</td>
              <td style="padding: 10px; border: 1px solid #94a3b8; text-align: right; color: #15803d; font-size: 13px;">${totalActual.toLocaleString()} ${companySettings.currency}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    await printReport(title, html, companySettings, {
      includeSignature: includeSignatureInPrint,
      signatureUser: currentUser,
      signatureTitle: currentUser?.signatureTitle || "المسؤول المالي المعتمد",
    });
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredAccounts.map((a) => ({
      "كود الحساب": a.code,
      "اسم الحساب التفصيلي": a.nameAr,
      "الاسم بالإنجليزية": a.nameEn,
      "نوع الحساب": a.type,
      "الرصيد الافتتاحي": a.openingBalance || 0,
      "صافي القيود والحركات": (a.balance || 0) - (a.openingBalance || 0),
      "الرصيد الفعلي الحالي": a.balance || 0,
      العملة: companySettings.currency,
      "حالة الحساب": a.isActive ? "نشط" : "معطل",
    }));

    exportToExcel(data, `الأرصدة_الفعلية_للحسابات_${new Date().toISOString().split("T")[0]}`);
  };

  return (
    <div className="bg-[#11141B] border border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header with Real-Time Pulse Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm md:text-base">
                الأرصدة الفعلية للحسابات التفصيلية
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                تحديث لحظي Real-time
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              تنعكس تعديلات الرصيد الافتتاحي والقيود اليومية فوراً على الأرصدة الفعلية بدون تأخير
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Include Signature Toggle */}
          <label className="flex items-center gap-1.5 bg-[#1A1F26] px-2.5 py-1.5 rounded-lg border border-gray-700/80 text-[11px] text-gray-300 cursor-pointer hover:border-gray-600 transition">
            <input
              type="checkbox"
              checked={includeSignatureInPrint}
              onChange={(e) => setIncludeSignatureInPrint(e.target.checked)}
              className="rounded border-gray-700 text-blue-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
            />
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>تضمين التوقيع والاعتماد</span>
          </label>

          {/* Print Button */}
          <button
            onClick={handlePrintActualBalances}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-700 transition"
            title="طباعة كشف الأرصدة الفعلية"
          >
            <Printer className="w-3.5 h-3.5 text-gray-300" />
            <span>طباعة الكشف</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-500/30 transition"
            title="تصدير إكسل"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>تصدير Excel</span>
          </button>

          {/* Jump to Accounts View */}
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab("accounts")}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline px-2 py-1"
              title="الانتقال إلى دليل الحسابات التفصيلي الكامل"
            >
              <span>دليل الحسابات الكامل</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Aggregate KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#161B22] p-3 rounded-lg border border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 font-medium block">
              إجمالي الأرصدة الافتتاحية:
            </span>
            <span className="text-sm md:text-base font-bold text-amber-400 font-mono">
              {totalOpening.toLocaleString()} {companySettings.currency}
            </span>
          </div>
          <span className="text-xs text-gray-500 bg-gray-800/80 px-2 py-1 rounded">بداية المدة</span>
        </div>

        <div className="bg-[#161B22] p-3 rounded-lg border border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 font-medium block">
              صافي حركة القيود والترحيل:
            </span>
            <span
              className={`text-sm md:text-base font-bold font-mono ${
                totalNetMovements >= 0 ? "text-blue-400" : "text-rose-400"
              }`}
            >
              {totalNetMovements >= 0 ? "+" : ""}
              {totalNetMovements.toLocaleString()} {companySettings.currency}
            </span>
          </div>
          <span className="text-xs text-gray-500 bg-gray-800/80 px-2 py-1 rounded">العمليات</span>
        </div>

        <div className="bg-[#161B22] p-3 rounded-lg border border-emerald-500/20 bg-emerald-950/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-emerald-400 font-medium block">
              إجمالي الأرصدة الفعلية الحالية:
            </span>
            <span className="text-sm md:text-base font-bold text-emerald-300 font-mono">
              {totalActual.toLocaleString()} {companySettings.currency}
            </span>
          </div>
          <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded font-semibold">
            مطابق لحظياً
          </span>
        </div>
      </div>

      {/* Filter Category Pills & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { key: "ALL", label: "الكل", count: subAccounts.length },
            {
              key: "TREASURY",
              label: "الخزائن والصناديق",
              icon: Wallet,
              count: subAccounts.filter((a) => getAccountCategoryKey(a) === "TREASURY").length,
            },
            {
              key: "BANK",
              label: "البنوك",
              icon: Building,
              count: subAccounts.filter((a) => getAccountCategoryKey(a) === "BANK").length,
            },
            {
              key: "CUSTOMER",
              label: "العملاء",
              icon: Users,
              count: subAccounts.filter((a) => getAccountCategoryKey(a) === "CUSTOMER").length,
            },
            {
              key: "SUPPLIER",
              label: "الموردين",
              icon: Briefcase,
              count: subAccounts.filter((a) => getAccountCategoryKey(a) === "SUPPLIER").length,
            },
            {
              key: "EXPENSE",
              label: "المصروفات",
              icon: TrendingDown,
              count: subAccounts.filter((a) => getAccountCategoryKey(a) === "EXPENSE").length,
            },
            {
              key: "REVENUE",
              label: "الإيرادات",
              icon: TrendingUp,
              count: subAccounts.filter((a) => getAccountCategoryKey(a) === "REVENUE").length,
            },
          ].map((tab) => {
            const isSelected = activeCategory === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveCategory(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-[#1A1F26] text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? "bg-blue-700 text-blue-100" : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="بحث بكود أو اسم الحساب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1A1F26] border border-gray-700 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Actual Balances Responsive Table */}
      <div className="overflow-x-auto border border-gray-800 rounded-lg">
        <table className="w-full text-xs text-right text-slate-300">
          <thead className="bg-[#0A0C10] text-gray-400 border-b border-gray-800 font-semibold">
            <tr>
              <th className="p-3 w-28">كود الحساب</th>
              <th className="p-3">اسم الحساب التفصيلي</th>
              <th className="p-3 w-28">التصنيف</th>
              <th className="p-3 w-36 text-right">الرصيد الافتتاحي</th>
              <th className="p-3 w-36 text-right">صافي حركة القيود</th>
              <th className="p-3 w-40 text-right">الرصيد الفعلي الحالي</th>
              <th className="p-3 w-48 text-center">إجراءات سريعة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 font-medium">
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  لا توجد حسابات مطابقة لمعايير البحث الحالية
                </td>
              </tr>
            ) : (
              filteredAccounts.map((acc) => {
                const opening = acc.openingBalance || 0;
                const actual = acc.balance || 0;
                const netMov = actual - opening;
                const isNormalDebit = acc.type === "ASSET" || acc.type === "EXPENSE";

                return (
                  <tr key={acc.id} className="hover:bg-gray-800/30 transition">
                    {/* Code */}
                    <td className="p-3 font-mono font-bold text-blue-400">{acc.code}</td>

                    {/* Name */}
                    <td className="p-3">
                      <div className="font-bold text-white">{acc.nameAr}</div>
                      {acc.nameEn && <div className="text-[10px] text-gray-400 font-mono">{acc.nameEn}</div>}
                    </td>

                    {/* Category badge */}
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-gray-800 text-gray-300 border border-gray-700 font-semibold">
                        {acc.type === "ASSET"
                          ? "أصول"
                          : acc.type === "LIABILITY"
                          ? "التزامات"
                          : acc.type === "EXPENSE"
                          ? "مصروفات"
                          : acc.type === "REVENUE"
                          ? "إيرادات"
                          : "حقوق ملكية"}
                      </span>
                    </td>

                    {/* Opening Balance */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="font-mono font-bold text-amber-400">
                          {opening.toLocaleString()} {companySettings.currency}
                        </span>
                        {onSaveAccount && (
                          <button
                            onClick={() => handleOpenEdit(acc)}
                            className="p-1 hover:bg-amber-500/20 text-amber-400/80 hover:text-amber-300 rounded transition"
                            title="تعديل الرصيد الافتتاحي وتحديث الرصيد الفعلي فوراً"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Net Movements */}
                    <td className="p-3 text-right font-mono">
                      <span
                        className={
                          netMov > 0
                            ? "text-blue-400 font-semibold"
                            : netMov < 0
                            ? "text-rose-400 font-semibold"
                            : "text-gray-500"
                        }
                      >
                        {netMov > 0 ? "+" : ""}
                        {netMov.toLocaleString()} {companySettings.currency}
                      </span>
                    </td>

                    {/* Actual Current Balance */}
                    <td className="p-3 text-right">
                      <span className="px-2.5 py-1 rounded font-mono font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 inline-block text-xs">
                        {actual.toLocaleString()} {companySettings.currency}
                      </span>
                    </td>

                    {/* Quick Actions */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Edit Opening Balance */}
                        {onSaveAccount && (
                          <button
                            onClick={() => handleOpenEdit(acc)}
                            className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[11px] transition"
                            title="تعديل الرصيد الافتتاحي"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>تعديل افتتاح</span>
                          </button>
                        )}

                        {/* WhatsApp / PDF Share */}
                        <button
                          onClick={() => handleOpenWhatsAppShare(acc)}
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 rounded text-[11px] transition"
                          title="إرسال كشف الحساب والرصيد عبر واتساب كـ PDF"
                        >
                          <Send className="w-3 h-3 text-emerald-400" />
                          <span>واتساب</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Edit Opening Balance Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fadeIn">
          <div className="bg-[#161B22] border border-gray-700 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-white text-sm">
                  تعديل الرصيد الافتتاحي للحساب
                </h4>
              </div>
              <button
                onClick={() => setEditingAccount(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-[#0D1117] rounded-lg border border-gray-800 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">كود الحساب:</span>
                <span className="font-mono font-bold text-blue-400">{editingAccount.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">اسم الحساب:</span>
                <span className="font-bold text-white">{editingAccount.nameAr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">الرصيد الافتتاحي الحالي:</span>
                <span className="font-mono text-amber-400">
                  {(editingAccount.openingBalance || 0).toLocaleString()} {companySettings.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">الرصيد الفعلي الحالي:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {(editingAccount.balance || 0).toLocaleString()} {companySettings.currency}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                الرصيد الافتتاحي الجديد ({companySettings.currency}):
              </label>
              <input
                type="number"
                step="any"
                value={openingBalanceInput}
                onChange={(e) => setOpeningBalanceInput(e.target.value)}
                className="w-full bg-[#0D1117] border border-gray-700 rounded-lg p-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                placeholder="أدخل القيمة الجديدة للرصيد الافتتاحي..."
                autoFocus
              />
              <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                💡 <strong className="text-amber-300">ملاحظة محاسبية:</strong> سيتم تحديث الرصيد الفعلي
                للحساب فوراً في لوحة التحكم ودليل الحسابات وميزان المراجعة لضمان تطابق البيانات لحظياً.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
              <button
                onClick={() => setEditingAccount(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveOpeningBalance}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow"
              >
                <Check className="w-4 h-4" />
                <span>حفظ وتحديث فوري</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Share Modal */}
      {whatsAppModalData && (
        <WhatsAppShareModal
          data={whatsAppModalData}
          companySettings={companySettings}
          currentUser={currentUser}
          onClose={() => setWhatsAppModalData(null)}
        />
      )}
    </div>
  );
};
