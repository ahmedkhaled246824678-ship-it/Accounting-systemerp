import React, { useState, useMemo } from "react";
import {
  Layers,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  Wallet,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  RefreshCw,
  Building2,
} from "lucide-react";
import { Account, CompanySettings, JournalEntry, TreasuryVoucher, BankVoucher, FilterParams } from "../types";
import { exportToExcel, printReport } from "../utils/export";
import { getLocalizedAccountName } from "../utils/accountTranslations";
import { useLanguage } from "../context/LanguageContext";

interface CombinedSheetViewProps {
  accounts: Account[];
  journalEntries: JournalEntry[];
  treasuryVouchers: TreasuryVoucher[];
  bankVouchers: BankVoucher[];
  companySettings: CompanySettings;
  filterParams: FilterParams;
}

export const CombinedSheetView: React.FC<CombinedSheetViewProps> = ({
  accounts,
  journalEntries,
  treasuryVouchers,
  bankVouchers,
  companySettings,
  filterParams,
}) => {
  const [searchQuery, setSearchQuery] = useState(filterParams.query || "");
  const [sourceFilter, setSourceFilter] = useState<"ALL" | "TREASURY" | "BANK" | "JOURNAL">("ALL");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [startDate, setStartDate] = useState(filterParams.startDate || "");
  const [endDate, setEndDate] = useState(filterParams.endDate || "");

  const { language, t } = useLanguage();

  // Bank Accounts List (non-header sub-accounts only)
  const bankAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        !a.isHeader &&
        (a.code.startsWith("1113") ||
        a.code.startsWith("1114") ||
        a.code.startsWith("112") ||
        a.nameAr.includes("بنك") ||
        a.nameAr.includes("البنك"))
    );
  }, [accounts]);

  // Available Financial Years
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    const currentYear = new Date().getFullYear().toString();
    set.add(currentYear);
    set.add("2026");
    set.add("2025");
    set.add("2024");
    if (companySettings.financialYear) {
      set.add(companySettings.financialYear);
    }
    journalEntries.forEach((je) => {
      if (je.financialYear) set.add(je.financialYear);
      if (je.date) {
        const y = je.date.split("-")[0];
        if (y && y.length === 4) set.add(y);
      }
    });
    treasuryVouchers.forEach((tv) => {
      if (tv.date) {
        const y = tv.date.split("-")[0];
        if (y && y.length === 4) set.add(y);
      }
    });
    bankVouchers.forEach((bv) => {
      if (bv.date) {
        const y = bv.date.split("-")[0];
        if (y && y.length === 4) set.add(y);
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [journalEntries, treasuryVouchers, bankVouchers, companySettings.financialYear]);

  // Handle Year & Month changes to auto-update startDate and endDate
  const handleYearMonthChange = (yearStr: string, monthStr: string) => {
    setSelectedYear(yearStr);
    setSelectedMonth(monthStr);

    if (yearStr === "ALL" && monthStr === "ALL") {
      setStartDate("");
      setEndDate("");
      return;
    }

    const yr = yearStr !== "ALL" ? yearStr : new Date().getFullYear().toString();

    if (monthStr !== "ALL") {
      const m = parseInt(monthStr, 10);
      const monthFormatted = m < 10 ? `0${m}` : `${m}`;
      const s = `${yr}-${monthFormatted}-01`;
      const lastDay = new Date(parseInt(yr, 10), m, 0).getDate();
      const lastDayFormatted = lastDay < 10 ? `0${lastDay}` : `${lastDay}`;
      const e = `${yr}-${monthFormatted}-${lastDayFormatted}`;
      setStartDate(s);
      setEndDate(e);
    } else {
      setStartDate(`${yr}-01-01`);
      setEndDate(`${yr}-12-31`);
    }
  };

  // Combine all cash and bank movements into one chronological master list
  const combinedMovements = React.useMemo(() => {
    const masterList: {
      id: string;
      date: string;
      docNumber: string;
      sourceType: string;
      sourceKey: "TREASURY" | "BANK" | "JOURNAL";
      party: string; // جهة القيد / المستفيد / الطرف المقابل
      bankAccountId?: string;
      bankName?: string;
      description: string;
      treasuryIn: number;
      treasuryOut: number;
      bankIn: number;
      bankOut: number;
      expenseAmount: number;
      revenueAmount: number;
      categoryDetail: string;
    }[] = [];

    // Identify cash and bank sub-account IDs (non-header sub-accounts)
    const cashBankAccIds = new Set(
      accounts
        .filter((a) => !a.isHeader && (a.code.startsWith("11") || a.nameAr.includes("خزينة") || a.nameAr.includes("الصندوق") || a.nameAr.includes("بنك")))
        .map((a) => a.id)
    );

    // 1. Treasury Vouchers (Only direct treasury vouchers; skip those auto-generated from journal entries to prevent duplication)
    treasuryVouchers.forEach((tv) => {
      // Check if voucher was auto-generated from a journal entry
      const isAutoFromJe =
        tv.id.startsWith("TV-JE-") ||
        tv.voucherNumber.startsWith("قبض-قيد-") ||
        tv.voucherNumber.startsWith("صرف-قيد-") ||
        tv.voucherNumber.startsWith("قيد-") ||
        tv.voucherNumber.includes("قيد-");

      if (isAutoFromJe) {
        // Skip here because it is processed once and accurately in the journalEntries section
        return;
      }

      const oppAcc = accounts.find((a) => a.id === tv.oppositeAccountId);
      const oppAccName = oppAcc ? getLocalizedAccountName(oppAcc, language) : "";
      const party = tv.beneficiary
        ? oppAccName && oppAccName !== tv.beneficiary
          ? `${tv.beneficiary} (${oppAccName})`
          : tv.beneficiary
        : oppAccName || (language === "ar" ? "خزينة" : "Treasury");

      masterList.push({
        id: tv.id,
        date: tv.date,
        docNumber: tv.voucherNumber,
        sourceType: language === "ar" ? "خزينة" : language === "de" ? "Kasse" : "Treasury",
        sourceKey: "TREASURY",
        party,
        description: `${tv.beneficiary ? `${language === "ar" ? "المستفيد" : "Beneficiary"}: ${tv.beneficiary} - ` : ""}${tv.notes}`,
        treasuryIn: tv.voucherType === "RECEIPT" ? tv.amount : 0,
        treasuryOut: tv.voucherType === "PAYMENT" ? tv.amount : 0,
        bankIn: 0,
        bankOut: 0,
        expenseAmount: oppAcc?.type === "EXPENSE" ? tv.amount : 0,
        revenueAmount: oppAcc?.type === "REVENUE" ? tv.amount : 0,
        categoryDetail: oppAcc ? `${oppAcc.code} - ${getLocalizedAccountName(oppAcc, language)}` : (language === "ar" ? "خزينة" : "Treasury"),
      });
    });

    // 2. Bank Vouchers (Only direct bank vouchers; skip those auto-generated from journal entries)
    bankVouchers.forEach((bv) => {
      // Check if voucher was auto-generated from a journal entry
      const isAutoFromJe =
        bv.id.startsWith("bv-je-") ||
        bv.voucherNumber.startsWith("قيد-") ||
        bv.voucherNumber.includes("قيد-");

      if (isAutoFromJe) {
        // Skip here because it is processed once and accurately in the journalEntries section
        return;
      }

      const oppAcc = accounts.find((a) => a.id === bv.oppositeAccountId);
      const oppAccName = oppAcc ? getLocalizedAccountName(oppAcc, language) : "";
      const party = bv.beneficiary
        ? oppAccName && oppAccName !== bv.beneficiary
          ? `${bv.beneficiary} (${oppAccName})`
          : bv.beneficiary
        : oppAccName || (language === "ar" ? "حساب بنكي" : "Bank");

      const bankAcc = accounts.find((a) => a.id === bv.bankAccountId);
      masterList.push({
        id: bv.id,
        date: bv.date,
        docNumber: bv.voucherNumber,
        sourceType: language === "ar" ? "بنك" : language === "de" ? "Bank" : "Bank",
        sourceKey: "BANK",
        party,
        bankAccountId: bv.bankAccountId,
        bankName: bankAcc ? `${bankAcc.code} - ${getLocalizedAccountName(bankAcc, language)}` : (language === "ar" ? "حساب بنكي" : "Bank Account"),
        description: `${bv.checkNumber ? `${language === "ar" ? "شيك #" : "Cheque #"}${bv.checkNumber} - ` : ""}${bv.beneficiary ? `${language === "ar" ? "جهة" : "Party"}: ${bv.beneficiary} - ` : ""}${bv.notes}`,
        treasuryIn: 0,
        treasuryOut: 0,
        bankIn: bv.type === "DEPOSIT" ? bv.amount : 0,
        bankOut: bv.type === "WITHDRAWAL" || bv.type === "BANK_EXPENSE" ? bv.amount : 0,
        expenseAmount: oppAcc?.type === "EXPENSE" ? bv.amount : 0,
        revenueAmount: oppAcc?.type === "REVENUE" ? bv.amount : 0,
        categoryDetail: oppAcc ? `${oppAcc.code} - ${getLocalizedAccountName(oppAcc, language)}` : (language === "ar" ? "بنك" : "Bank"),
      });
    });

    // 3. Journal entries affecting Cash/Bank (Aggregated strictly ONCE per journal entry without duplication)
    journalEntries.forEach((je) => {
      if (je.isPosted === false) return;

      // Filter lines of this journal entry that touch cash or bank accounts
      const relevantLines = je.lines.filter((line) => line.accountId && cashBankAccIds.has(line.accountId));
      if (relevantLines.length === 0) return;

      // Calculate total cash/bank effect for this journal entry
      let entryTreasuryIn = 0;
      let entryTreasuryOut = 0;
      let entryBankIn = 0;
      let entryBankOut = 0;
      let entryBankAccountId: string | undefined = undefined;
      let entryBankName: string | undefined = undefined;
      const touchedAccNames: string[] = [];

      relevantLines.forEach((line) => {
        const acc = accounts.find((a) => a.id === line.accountId);
        const isBank =
          acc?.nameAr.includes("بنك") ||
          acc?.code.startsWith("112") ||
          acc?.code.startsWith("1113") ||
          acc?.code.startsWith("1114");

        if (isBank) {
          entryBankIn += line.debit || 0;
          entryBankOut += line.credit || 0;
          if (!entryBankAccountId) {
            entryBankAccountId = acc?.id || line.accountId;
            entryBankName = acc ? `${acc.code} - ${getLocalizedAccountName(acc, language)}` : undefined;
          }
        } else {
          entryTreasuryIn += line.debit || 0;
          entryTreasuryOut += line.credit || 0;
        }

        if (acc) {
          const accTitle = `${acc.code} - ${getLocalizedAccountName(acc, language)}`;
          if (!touchedAccNames.includes(accTitle)) {
            touchedAccNames.push(accTitle);
          }
        }
      });

      // Extract opposite party / accounts (lines not touching cash/bank)
      const oppositePartiesSet = new Set<string>();
      let entryExpense = 0;
      let entryRevenue = 0;

      je.lines.forEach((line) => {
        if (!cashBankAccIds.has(line.accountId)) {
          const oppAcc = accounts.find((a) => a.id === line.accountId);
          if (oppAcc) {
            oppositePartiesSet.add(getLocalizedAccountName(oppAcc, language));
            if (oppAcc.type === "EXPENSE") entryExpense += line.debit || 0;
            if (oppAcc.type === "REVENUE") entryRevenue += line.credit || 0;
          }
          if (line.employeeName) {
            oppositePartiesSet.add(line.employeeName);
          }
        }
      });

      // Build party name (جهة القيد)
      const party =
        oppositePartiesSet.size > 0
          ? Array.from(oppositePartiesSet).join("، ")
          : (language === "ar" ? "قيد تسوية" : language === "de" ? "Umbuchung" : "Adjustment Entry");

      // Build unified single description
      const lineNotes = relevantLines.map((l) => l.note).filter(Boolean).join(" | ");
      const mainNote = lineNotes || je.notes || (je.reference ? `${language === "ar" ? "مرجع" : "Ref"}: ${je.reference}` : `${language === "ar" ? "قيد يومية رقم" : "Journal Entry #"} ${je.entryNumber}`);
      const chequeNumbers = relevantLines.map((l) => l.chequeNumber).filter(Boolean).join(", ");
      const fullDesc = chequeNumbers ? `${language === "ar" ? "شيك #" : "Cheque #"}${chequeNumbers} - ${mainNote}` : mainNote;

      masterList.push({
        id: `JE-AGG-${je.id}`,
        date: je.date,
        docNumber: je.entryNumber,
        sourceType: language === "ar" ? "قيد يومية" : language === "de" ? "Journal" : "Journal",
        sourceKey: "JOURNAL",
        party,
        bankAccountId: entryBankAccountId,
        bankName: entryBankName,
        description: fullDesc,
        treasuryIn: entryTreasuryIn,
        treasuryOut: entryTreasuryOut,
        bankIn: entryBankIn,
        bankOut: entryBankOut,
        expenseAmount: entryExpense,
        revenueAmount: entryRevenue,
        categoryDetail: touchedAccNames.length > 0 ? touchedAccNames.join(" / ") : (language === "ar" ? "قيد يومية مجمع" : "Aggregated Journal"),
      });
    });

    // Sort chronologically
    return masterList.sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [treasuryVouchers, bankVouchers, journalEntries, accounts, language]);

  const filteredMovements = combinedMovements.filter((m) => {
    if (sourceFilter !== "ALL" && m.sourceKey !== sourceFilter) return false;
    
    // Year & Month Filter
    const entryYear = m.date ? m.date.split("-")[0] : "";
    if (selectedYear !== "ALL" && entryYear !== selectedYear) return false;

    const entryMonth = m.date ? parseInt(m.date.split("-")[1], 10).toString() : "";
    if (selectedMonth !== "ALL" && entryMonth !== selectedMonth) return false;

    if (startDate && m.date < startDate) return false;
    if (endDate && m.date > endDate) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        m.docNumber.toLowerCase().includes(q) ||
        m.party.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.categoryDetail.toLowerCase().includes(q) ||
        (m.bankName && m.bankName.toLowerCase().includes(q)) ||
        m.date.includes(q)
      );
    }
    return true;
  });

  // Calculate Summary Totals (Net Cash, Net Banks, Total Liquidity)
  const totalTreasuryIn = filteredMovements.reduce((s, m) => s + m.treasuryIn, 0);
  const totalTreasuryOut = filteredMovements.reduce((s, m) => s + m.treasuryOut, 0);
  const netTreasury = totalTreasuryIn - totalTreasuryOut; // صافي النقدية (الخزينة)

  const totalBankIn = filteredMovements.reduce((s, m) => s + m.bankIn, 0);
  const totalBankOut = filteredMovements.reduce((s, m) => s + m.bankOut, 0);
  const netBanks = totalBankIn - totalBankOut; // صافي البنوك

  const netLiquidityChange = netTreasury + netBanks; // صافي إجمالي السيولة

  // Individual Bank Breakdown Summary (إجمالي إيداع وإجمالي صرف لكل بنك)
  const perBankSummary = useMemo(() => {
    const map = new Map<string, { id: string; code: string; name: string; deposits: number; withdrawals: number; net: number }>();

    // Seed with all configured bank accounts
    bankAccounts.forEach((ba) => {
      map.set(ba.id, {
        id: ba.id,
        code: ba.code,
        name: getLocalizedAccountName(ba, language),
        deposits: 0,
        withdrawals: 0,
        net: 0,
      });
    });

    // Accumulate from filtered movements
    filteredMovements.forEach((m) => {
      if (m.sourceKey === "BANK" || (m.sourceKey === "JOURNAL" && m.bankAccountId)) {
        const bankId = m.bankAccountId;
        if (bankId && map.has(bankId)) {
          const item = map.get(bankId)!;
          item.deposits += m.bankIn;
          item.withdrawals += m.bankOut;
          item.net = item.deposits - item.withdrawals;
        } else if (bankId) {
          map.set(bankId, {
            id: bankId,
            code: "بنك",
            name: m.bankName || (language === "ar" ? "حساب بنكي" : "Bank Account"),
            deposits: m.bankIn,
            withdrawals: m.bankOut,
            net: m.bankIn - m.bankOut,
          });
        }
      }
    });

    return Array.from(map.values());
  }, [bankAccounts, filteredMovements, language]);

  // Export Combined Sheet to Excel
  const handleExportToExcel = () => {
    const isAr = language === "ar";
    const data = filteredMovements.map((m) => ({
      [isAr ? "التاريخ" : "Date"]: m.date,
      [isAr ? "رقم الحركة / السند" : "Doc/Voucher No."]: m.docNumber,
      [isAr ? "مصدر الحركة" : "Source"]: m.sourceType,
      [isAr ? "جهة القيد" : "Party / Counterparty"]: m.party,
      [isAr ? "البيان والتفاصيل" : "Description"]: m.description,
      [isAr ? "وارد الخزينة (+)" : "Treasury In (+)"]: m.treasuryIn,
      [isAr ? "منصرف الخزينة (-)" : "Treasury Out (-)"]: m.treasuryOut,
      [isAr ? "إيداع البنك (+)" : "Bank Deposit (+)"]: m.bankIn,
      [isAr ? "سحب البنك (-)" : "Bank Withdrawal (-)"]: m.bankOut,
      [isAr ? "المصروفات التفصيلية" : "Expenses"]: m.expenseAmount,
      [isAr ? "الإيرادات التفصيلية" : "Revenues"]: m.revenueAmount,
      [isAr ? "البند التفصيلي والملاحظات" : "Detail / Counter Account"]: m.categoryDetail,
    }));

    exportToExcel(data, `الشيت_المجمع_للنقدية_والبنك_${companySettings.companyName}`);
  };

  // Print Combined Sheet
  const handlePrintCombinedSheet = () => {
    const bankRows = perBankSummary
      .map(
        (b) => `
        <tr>
          <td>${b.code} - ${b.name}</td>
          <td style="color: green;">+${b.deposits.toLocaleString()}</td>
          <td style="color: red;">-${b.withdrawals.toLocaleString()}</td>
          <td style="font-weight: bold; color: ${b.net >= 0 ? "green" : "red"};">${b.net.toLocaleString()} ${companySettings.currency}</td>
        </tr>
      `
      )
      .join("");

    const rows = filteredMovements
      .map(
        (m) => `
        <tr>
          <td>${m.date}</td>
          <td>${m.docNumber}</td>
          <td>${m.sourceType}</td>
          <td>${m.party}</td>
          <td>${m.description}</td>
          <td style="color: green;">${m.treasuryIn > 0 ? m.treasuryIn.toLocaleString() : "-"}</td>
          <td style="color: red;">${m.treasuryOut > 0 ? m.treasuryOut.toLocaleString() : "-"}</td>
          <td style="color: green;">${m.bankIn > 0 ? m.bankIn.toLocaleString() : "-"}</td>
          <td style="color: red;">${m.bankOut > 0 ? m.bankOut.toLocaleString() : "-"}</td>
          <td>${m.expenseAmount > 0 ? m.expenseAmount.toLocaleString() : "-"}</td>
        </tr>
      `
      )
      .join("");

    const html = `
      <h3>${t("singleBankSummary", "ملخص حركة البنوك الفردية")}</h3>
      <table style="margin-bottom: 20px;">
        <thead>
          <tr>
            <th>${t("bankName", "اسم البنك")}</th>
            <th>${t("totalDeposits", "إجمالي الإيداع (+)")}</th>
            <th>${t("totalWithdrawals", "إجمالي الصرف (-)")}</th>
            <th>${t("bankNet", "صافي البنك (=)")}</th>
          </tr>
        </thead>
        <tbody>
          ${bankRows}
        </tbody>
      </table>

      <h3>${t("combinedMasterSheet", "حركات الشيت المجمع")}</h3>
      <table>
        <thead>
          <tr>
            <th>${t("date", "التاريخ")}</th>
            <th>${t("docNumber", "رقم السند/القيد")}</th>
            <th>${t("movementType", "نوع الحركة")}</th>
            <th>${t("entryParty", "جهة القيد")}</th>
            <th>${t("descriptionDetails", "البيان والتفاصيل")}</th>
            <th>${t("treasuryIn", "وارد الخزينة")}</th>
            <th>${t("treasuryOut", "منصرف الخزينة")}</th>
            <th>${t("bankIn", "إيداع البنك")}</th>
            <th>${t("bankOut", "سحب البنك")}</th>
            <th>${t("expensesCol", "المصروفات")}</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="font-weight: bold; background: #f8fafc;">
            <td colspan="5">${language === "ar" ? "الإجماليات المجمعة والصافي:" : "Consolidated Totals & Net:"}</td>
            <td style="color: green;">+${totalTreasuryIn.toLocaleString()}</td>
            <td style="color: red;">-${totalTreasuryOut.toLocaleString()}</td>
            <td style="color: green;">+${totalBankIn.toLocaleString()}</td>
            <td style="color: red;">-${totalBankOut.toLocaleString()}</td>
            <td style="color: #2563eb;">${t("combinedNet", "صافي السيولة")}: ${netLiquidityChange.toLocaleString()} ${companySettings.currency}</td>
          </tr>
        </tbody>
      </table>
    `;

    printReport(t("combinedMasterSheet", "شيت الجمع الشامل لحركات النقدية والبنوك والمصروفات"), html, companySettings);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#11141B] p-4 rounded-xl border border-gray-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            <span>{t("combinedMasterSheet", "الشيت التفصيلي المجمع لحركات النقدية والبنوك")}</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {t("combinedSubHeader", "تجميع كافة حركات الخزينة والبنوك وقيود المقاصة في شيت واحد وإظهار صافي النقدية وصافي البنوك بدون تكرار")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintCombinedSheet}
            className="flex items-center gap-1.5 bg-[#1A1F26] hover:bg-gray-800 text-gray-200 border border-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>{t("printCombined", "طباعة الشيت المجمع")}</span>
          </button>
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-1.5 bg-[#1A1F26] hover:bg-gray-800 text-gray-200 border border-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>{t("exportExcel", "تصدير إكسل")}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Summary Cards: Net Cash, Net Banks, Net Liquidity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 text-xs">
        
        {/* Treasury In */}
        <div className="bg-[#11141B] border border-gray-800 p-3 rounded-xl">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px]">وارد الخزينة (+)</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-base font-extrabold text-emerald-400">+{totalTreasuryIn.toLocaleString()} {companySettings.currency}</p>
        </div>

        {/* Treasury Out */}
        <div className="bg-[#11141B] border border-gray-800 p-3 rounded-xl">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px]">{t("treasuryOut", "منصرف الخزينة (-)")}</span>
            <Wallet className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-base font-extrabold text-rose-400">-{totalTreasuryOut.toLocaleString()} {companySettings.currency}</p>
        </div>

        {/* NET CASH (صافي النقدية) */}
        <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-800/60 p-3 rounded-xl">
          <div className="flex items-center justify-between text-emerald-300 mb-1">
            <span className="font-extrabold text-[11px]">{language === "ar" ? "صافي النقدية (الخزينة)" : "Net Cash (Treasury)"}</span>
            <Wallet className="w-4 h-4 text-emerald-300" />
          </div>
          <p className={`text-base font-black ${netTreasury >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
            {netTreasury.toLocaleString()} {companySettings.currency}
          </p>
        </div>

        {/* Bank Deposits */}
        <div className="bg-[#11141B] border border-gray-800 p-3 rounded-xl">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px]">{t("bankIn", "إيداعات البنوك (+)")}</span>
            <Landmark className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-base font-extrabold text-blue-400">+{totalBankIn.toLocaleString()} {companySettings.currency}</p>
        </div>

        {/* Bank Withdrawals */}
        <div className="bg-[#11141B] border border-gray-800 p-3 rounded-xl">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px]">{t("bankOut", "سحوبات البنوك (-)")}</span>
            <Landmark className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-base font-extrabold text-amber-400">-{totalBankOut.toLocaleString()} {companySettings.currency}</p>
        </div>

        {/* NET BANKS (صافي البنوك) */}
        <div className="bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-800/60 p-3 rounded-xl">
          <div className="flex items-center justify-between text-blue-300 mb-1">
            <span className="font-extrabold text-[11px]">{t("bankNet", "صافي البنوك")}</span>
            <Landmark className="w-4 h-4 text-blue-300" />
          </div>
          <p className={`text-base font-black ${netBanks >= 0 ? 'text-blue-300' : 'text-amber-400'}`}>
            {netBanks.toLocaleString()} {companySettings.currency}
          </p>
        </div>

        {/* NET TOTAL LIQUIDITY (صافي إجمالي السيولة) */}
        <div className="bg-gradient-to-br from-purple-950/50 to-slate-900 border border-purple-800/70 p-3 rounded-xl col-span-1 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-purple-300 mb-1">
            <span className="font-extrabold text-[11px]">{t("combinedNet", "صافي إجمالي السيولة")}</span>
            <ArrowUpRight className="w-4 h-4 text-purple-300" />
          </div>
          <p className={`text-base font-black ${netLiquidityChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {netLiquidityChange.toLocaleString()} {companySettings.currency}
          </p>
        </div>

      </div>

      {/* Per-Bank Individual Deposit/Withdrawal Breakdown Table */}
      <div className="bg-[#11141B] border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-extrabold text-slate-200 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>{t("singleBankSummary", "ملخص الحركة الإجمالية والصافي لكل بنك (إيداع / صرف)")}</span>
          </h3>
          <span className="text-[11px] text-gray-400">
            {language === "ar" ? "عدد البنوك:" : "Banks count:"} <strong className="text-white">{perBankSummary.length}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {perBankSummary.map((b) => (
            <div key={b.id} className="bg-[#1A1F26] border border-gray-800 p-3 rounded-lg text-xs space-y-2">
              <div className="flex justify-between items-center border-b border-gray-800 pb-1.5">
                <span className="font-bold text-white truncate max-w-[170px]" title={b.name}>
                  {b.name}
                </span>
                <span className="font-mono text-[10px] text-gray-400 bg-slate-900 px-1.5 py-0.5 rounded">
                  {b.code}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-emerald-950/30 border border-emerald-900/40 p-1.5 rounded text-right">
                  <span className="text-emerald-400 block text-[10px]">{t("totalDeposits", "إجمالي الإيداع (+)")}</span>
                  <span className="font-bold text-emerald-300">+{b.deposits.toLocaleString()}</span>
                </div>
                <div className="bg-rose-950/30 border border-rose-900/40 p-1.5 rounded text-right">
                  <span className="text-rose-400 block text-[10px]">{t("totalWithdrawals", "إجمالي الصرف (-)")}</span>
                  <span className="font-bold text-rose-300">-{b.withdrawals.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-900/80 px-2 py-1 rounded border border-gray-800">
                <span className="text-gray-400 text-[10px] font-semibold">{t("bankNet", "صافي البنك (=)")}</span>
                <span className={`font-black text-xs ${b.net >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {b.net.toLocaleString()} {companySettings.currency}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Bar with Year, Month, Date, Source, and Search */}
      <div className="bg-[#11141B] border border-gray-800 rounded-xl p-3.5 space-y-3 text-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Year & Month Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Year */}
            <div className="flex items-center gap-1.5 bg-[#1A1F26] border border-gray-700 px-2.5 py-1.5 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-gray-300 font-semibold text-[11px]">{t("year", "السنة")}:</span>
              <select
                value={selectedYear}
                onChange={(e) => handleYearMonthChange(e.target.value, selectedMonth)}
                className="bg-slate-900 text-amber-300 font-bold border border-gray-700 rounded px-2 py-0.5 focus:outline-none"
              >
                <option value="ALL">{t("allYears", "جميع السنوات")}</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div className="flex items-center gap-1.5 bg-[#1A1F26] border border-gray-700 px-2.5 py-1.5 rounded-lg">
              <Filter className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-gray-300 font-semibold text-[11px]">{t("month", "الشهر")}:</span>
              <select
                value={selectedMonth}
                onChange={(e) => handleYearMonthChange(selectedYear, e.target.value)}
                className="bg-slate-900 text-blue-300 font-bold border border-gray-700 rounded px-2 py-0.5 focus:outline-none"
              >
                <option value="ALL">{t("allMonths", "جميع الشهور")}</option>
                <option value="1">01 - {language === "ar" ? "يناير" : "January"}</option>
                <option value="2">02 - {language === "ar" ? "فبراير" : "February"}</option>
                <option value="3">03 - {language === "ar" ? "مارس" : "March"}</option>
                <option value="4">04 - {language === "ar" ? "أبريل" : "April"}</option>
                <option value="5">05 - {language === "ar" ? "مايو" : "May"}</option>
                <option value="6">06 - {language === "ar" ? "يونيو" : "June"}</option>
                <option value="7">07 - {language === "ar" ? "يوليو" : "July"}</option>
                <option value="8">08 - {language === "ar" ? "أغسطس" : "August"}</option>
                <option value="9">09 - {language === "ar" ? "سبتمبر" : "September"}</option>
                <option value="10">10 - {language === "ar" ? "أكتوبر" : "October"}</option>
                <option value="11">11 - {language === "ar" ? "نوفمبر" : "November"}</option>
                <option value="12">12 - {language === "ar" ? "ديسمبر" : "December"}</option>
              </select>
            </div>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-1.5 bg-[#1A1F26] border border-gray-700 px-2.5 py-1 rounded-lg">
              <span className="text-gray-400 text-[11px]">{t("dateFrom", "من")}:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-gray-200 text-xs focus:outline-none"
              />
              <span className="text-gray-400 text-[11px]">{t("dateTo", "إلى")}:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-gray-200 text-xs focus:outline-none"
              />
            </div>

            {(selectedYear !== "ALL" || selectedMonth !== "ALL" || startDate || endDate || searchQuery || sourceFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSelectedYear("ALL");
                  setSelectedMonth("ALL");
                  setStartDate("");
                  setEndDate("");
                  setSearchQuery("");
                  setSourceFilter("ALL");
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 rounded-lg transition font-semibold"
              >
                <RefreshCw className="w-3 h-3 text-rose-400" />
                <span>{t("resetFilter", "إعادة ضبط التصفية")}</span>
              </button>
            )}

          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder={t("searchPlaceholder", "بحث برقم السند، البيان، اسم الحساب، أو التاريخ...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-gray-700 rounded-lg pr-9 pl-3 py-1.5 text-xs text-[#E2E8F0] focus:outline-none focus:border-blue-500 transition"
            />
          </div>

        </div>

        {/* Source Pills */}
        <div className="flex items-center gap-2 border-t border-gray-800/80 pt-2.5">
          <span className="text-gray-400 text-[11px]">{t("filterMovementSource", "تصفية مصدر الحركة:")}</span>
          <div className="flex items-center gap-1 bg-[#1A1F26] p-0.5 rounded-lg border border-gray-700">
            <button
              onClick={() => setSourceFilter("ALL")}
              className={`px-3 py-1 rounded transition text-xs ${sourceFilter === "ALL" ? "bg-blue-600 text-white font-semibold" : "text-gray-400 hover:text-white"}`}
            >
              {t("all", "الكل")} ({combinedMovements.length})
            </button>
            <button
              onClick={() => setSourceFilter("TREASURY")}
              className={`px-3 py-1 rounded transition text-xs ${sourceFilter === "TREASURY" ? "bg-blue-600 text-white font-semibold" : "text-gray-400 hover:text-white"}`}
            >
              {t("treasurySource", "الخزينة")}
            </button>
            <button
              onClick={() => setSourceFilter("BANK")}
              className={`px-3 py-1 rounded transition text-xs ${sourceFilter === "BANK" ? "bg-blue-600 text-white font-semibold" : "text-gray-400 hover:text-white"}`}
            >
              {t("bankSource", "البنوك")}
            </button>
            <button
              onClick={() => setSourceFilter("JOURNAL")}
              className={`px-3 py-1 rounded transition text-xs ${sourceFilter === "JOURNAL" ? "bg-blue-600 text-white font-semibold" : "text-gray-400 hover:text-white"}`}
            >
              {t("journalSource", "القيود")}
            </button>
          </div>
        </div>

      </div>

      {/* Master Combined Table */}
      <div className="bg-[#11141B] border border-gray-800 rounded-xl p-4 overflow-x-auto">
        <div className="flex justify-between items-center mb-3 text-xs">
          <span className="text-gray-400">
            {t("displayedCount", "عدد الحركات المعروضة")}: <strong className="text-white">{filteredMovements.length}</strong>
          </span>
          <span className="font-extrabold text-blue-400">
            {t("combinedNet", "صافي الحركة المجمعة")}: {netLiquidityChange.toLocaleString()} {companySettings.currency}
          </span>
        </div>

        <table className="w-full text-xs text-right text-gray-300">
          <thead className="bg-[#1A1F26] text-gray-400">
            <tr>
              <th className="p-2.5">{t("date", "التاريخ")}</th>
              <th className="p-2.5">{t("docNumber", "رقم السند/القيد")}</th>
              <th className="p-2.5">{t("movementType", "نوع الحركة")}</th>
              <th className="p-2.5 text-amber-400">{t("entryParty", "جهة القيد")}</th>
              <th className="p-2.5">{t("descriptionDetails", "البيان والتفاصيل")}</th>
              <th className="p-2.5 text-emerald-400">{t("treasuryIn", "وارد الخزينة (+)")}</th>
              <th className="p-2.5 text-rose-400">{t("treasuryOut", "منصرف الخزينة (-)")}</th>
              <th className="p-2.5 text-blue-400">{t("bankIn", "إيداع البنك (+)")}</th>
              <th className="p-2.5 text-amber-400">{t("bankOut", "سحب البنك (-)")}</th>
              <th className="p-2.5">{t("expensesCol", "المصروفات")}</th>
              <th className="p-2.5">{t("opposingAccountBank", "البند المقابل / البنك")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredMovements.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-6 text-center text-gray-500">
                  {t("noRecords", "لا توجد حركات مطابقة لمعايير البحث والتصفية المحددة")}
                </td>
              </tr>
            ) : (
              filteredMovements.map((m) => (
                <tr key={m.id} className="hover:bg-gray-800/40">
                  <td className="p-2.5 font-mono text-slate-300">{m.date}</td>
                  <td className="p-2.5 font-bold font-mono text-blue-400">{m.docNumber}</td>
                  <td className="p-2.5 font-semibold text-gray-300">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      m.sourceKey === "TREASURY"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : m.sourceKey === "BANK"
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    }`}>
                      {m.sourceType}
                    </span>
                  </td>
                  <td className="p-2.5 font-medium text-amber-300/90 whitespace-nowrap" title={m.party}>
                    {m.party}
                  </td>
                  <td className="p-2.5 max-w-xs truncate" title={m.description}>{m.description}</td>
                  <td className="p-2.5 font-bold text-emerald-400">
                    {m.treasuryIn > 0 ? `+${m.treasuryIn.toLocaleString()}` : "-"}
                  </td>
                  <td className="p-2.5 font-bold text-rose-400">
                    {m.treasuryOut > 0 ? `-${m.treasuryOut.toLocaleString()}` : "-"}
                  </td>
                  <td className="p-2.5 font-bold text-blue-400">
                    {m.bankIn > 0 ? `+${m.bankIn.toLocaleString()}` : "-"}
                  </td>
                  <td className="p-2.5 font-bold text-amber-400">
                    {m.bankOut > 0 ? `-${m.bankOut.toLocaleString()}` : "-"}
                  </td>
                  <td className="p-2.5 font-bold text-rose-300">
                    {m.expenseAmount > 0 ? m.expenseAmount.toLocaleString() : "-"}
                  </td>
                  <td className="p-2.5 text-gray-400">
                    {m.bankName ? (
                      <span className="text-blue-300 bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-900/40">
                        {m.bankName}
                      </span>
                    ) : (
                      m.categoryDetail
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

