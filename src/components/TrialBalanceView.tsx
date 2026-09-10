import React, { useState, useMemo } from "react";
import {
  Scale,
  Printer,
  FileSpreadsheet,
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Filter,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { Account, CompanySettings, JournalEntry, FilterParams } from "../types";
import { exportToExcel, printReport } from "../utils/export";

interface TrialBalanceViewProps {
  accounts: Account[];
  journalEntries: JournalEntry[];
  companySettings: CompanySettings;
  filterParams: FilterParams;
}

export const TrialBalanceView: React.FC<TrialBalanceViewProps> = ({
  accounts,
  journalEntries,
  companySettings,
  filterParams,
}) => {
  const [searchQuery, setSearchQuery] = useState(filterParams.query || "");
  const [levelFilter, setLevelFilter] = useState<"ALL" | "HEADER" | "SUB">("SUB");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [hideZeroBalances, setHideZeroBalances] = useState<boolean>(false);

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
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [journalEntries, companySettings.financialYear]);

  // Handle Month & Year changes to auto-update startDate and endDate
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

  // Quick Date Range Setters
  const setThisMonth = () => {
    const now = new Date();
    const yr = now.getFullYear().toString();
    const m = (now.getMonth() + 1).toString();
    handleYearMonthChange(yr, m);
  };

  const setThisYear = () => {
    const now = new Date();
    const yr = now.getFullYear().toString();
    handleYearMonthChange(yr, "ALL");
  };

  const clearDates = () => {
    setSelectedYear("ALL");
    setSelectedMonth("ALL");
    setStartDate("");
    setEndDate("");
  };

  // 1. Calculate Movements per account from Posted Journal Entries
  const { priorMovements, periodMovements } = useMemo(() => {
    const prior: Record<string, { debit: number; credit: number }> = {};
    const period: Record<string, { debit: number; credit: number }> = {};

    accounts.forEach((acc) => {
      prior[acc.id] = { debit: 0, credit: 0 };
      period[acc.id] = { debit: 0, credit: 0 };
    });

    journalEntries.forEach((entry) => {
      // Ignore unposted entries
      if (entry.isPosted === false) return;

      const entryDate = entry.date;
      const isPrior = startDate && entryDate < startDate;
      const isInPeriod =
        (!startDate || entryDate >= startDate) &&
        (!endDate || entryDate <= endDate);

      entry.lines.forEach((line) => {
        const accId = line.accountId;
        if (!prior[accId]) prior[accId] = { debit: 0, credit: 0 };
        if (!period[accId]) period[accId] = { debit: 0, credit: 0 };

        if (isPrior) {
          prior[accId].debit += Number(line.debit) || 0;
          prior[accId].credit += Number(line.credit) || 0;
        } else if (isInPeriod) {
          period[accId].debit += Number(line.debit) || 0;
          period[accId].credit += Number(line.credit) || 0;
        }
      });
    });

    return { priorMovements: prior, periodMovements: period };
  }, [accounts, journalEntries, startDate, endDate]);

  // 2. Build Sub-Account Calculations
  const subAccountsCalculated = useMemo(() => {
    const map = new Map<
      string,
      {
        openingDebit: number;
        openingCredit: number;
        debitMovement: number;
        creditMovement: number;
        debitBalance: number;
        creditBalance: number;
      }
    >();

    accounts.forEach((acc) => {
      if (acc.isHeader) return;

      const isDebitNature = acc.type === "ASSET" || acc.type === "EXPENSE";

      // Calculate total movements across all entries for fallback calculation
      const allD = (priorMovements[acc.id]?.debit || 0) + (periodMovements[acc.id]?.debit || 0);
      const allC = (priorMovements[acc.id]?.credit || 0) + (periodMovements[acc.id]?.credit || 0);

      let initialOpening = 0;
      if (acc.openingBalance !== undefined) {
        initialOpening = acc.openingBalance;
      } else {
        // Deduce base opening balance from balance by backing out posted movements
        initialOpening = isDebitNature ? (acc.balance || 0) - (allD - allC) : (acc.balance || 0) - (allC - allD);
      }

      const priorD = priorMovements[acc.id]?.debit || 0;
      const priorC = priorMovements[acc.id]?.credit || 0;
      const periodD = periodMovements[acc.id]?.debit || 0;
      const periodC = periodMovements[acc.id]?.credit || 0;

      let openingDebit = 0;
      let openingCredit = 0;
      let debitBalance = 0;
      let creditBalance = 0;

      if (isDebitNature) {
        // Normal Debit nature
        const openingNet = initialOpening + priorD - priorC;
        if (openingNet >= 0) openingDebit = openingNet;
        else openingCredit = Math.abs(openingNet);

        const endingNet = openingNet + periodD - periodC;
        if (endingNet >= 0) debitBalance = endingNet;
        else creditBalance = Math.abs(endingNet);
      } else {
        // Normal Credit nature (Liability, Equity, Revenue)
        const openingNet = initialOpening + priorC - priorD;
        if (openingNet >= 0) openingCredit = openingNet;
        else openingDebit = Math.abs(openingNet);

        const endingNet = openingNet + periodC - periodD;
        if (endingNet >= 0) creditBalance = endingNet;
        else debitBalance = Math.abs(endingNet);
      }

      map.set(acc.id, {
        openingDebit,
        openingCredit,
        debitMovement: periodD,
        creditMovement: periodC,
        debitBalance,
        creditBalance,
      });
    });

    return map;
  }, [accounts, priorMovements, periodMovements]);

  // 3. Build Full Trial Balance Rows (Combining Headers & Sub-Accounts)
  const trialBalanceRows = useMemo(() => {
    return accounts.map((acc) => {
      if (!acc.isHeader) {
        const calculated = subAccountsCalculated.get(acc.id) || {
          openingDebit: 0,
          openingCredit: 0,
          debitMovement: 0,
          creditMovement: 0,
          debitBalance: 0,
          creditBalance: 0,
        };
        return {
          ...acc,
          ...calculated,
        };
      } else {
        // For Header accounts: Aggregate all child sub-accounts
        const childSubAccounts = accounts.filter(
          (sub) => !sub.isHeader && (sub.parentId === acc.id || sub.code.startsWith(acc.code))
        );

        let openingDebit = 0;
        let openingCredit = 0;
        let debitMovement = 0;
        let creditMovement = 0;
        let debitBalance = 0;
        let creditBalance = 0;

        childSubAccounts.forEach((sub) => {
          const subCalc = subAccountsCalculated.get(sub.id);
          if (subCalc) {
            openingDebit += subCalc.openingDebit;
            openingCredit += subCalc.openingCredit;
            debitMovement += subCalc.debitMovement;
            creditMovement += subCalc.creditMovement;
            debitBalance += subCalc.debitBalance;
            creditBalance += subCalc.creditBalance;
          }
        });

        return {
          ...acc,
          openingDebit,
          openingCredit,
          debitMovement,
          creditMovement,
          debitBalance,
          creditBalance,
        };
      }
    });
  }, [accounts, subAccountsCalculated]);

  // 4. Filter Rows
  const filteredRows = useMemo(() => {
    return trialBalanceRows.filter((r) => {
      if (levelFilter === "HEADER" && !r.isHeader) return false;
      if (levelFilter === "SUB" && r.isHeader) return false;
      if (typeFilter !== "ALL" && r.type !== typeFilter) return false;

      // Hide Zero Balances Filter
      if (
        hideZeroBalances &&
        r.openingDebit === 0 &&
        r.openingCredit === 0 &&
        r.debitMovement === 0 &&
        r.creditMovement === 0 &&
        r.debitBalance === 0 &&
        r.creditBalance === 0
      ) {
        return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          r.code.toLowerCase().includes(q) ||
          r.nameAr.toLowerCase().includes(q) ||
          (r.nameEn && r.nameEn.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [trialBalanceRows, levelFilter, typeFilter, hideZeroBalances, searchQuery]);

  // 5. Calculate Totals (Summing sub-accounts or filtered display rows)
  const rowsForTotals = useMemo(() => {
    // If viewing ALL or SUB, sum sub-accounts only to prevent double counting
    if (levelFilter === "ALL" || levelFilter === "SUB") {
      return trialBalanceRows.filter((r) => !r.isHeader && filteredRows.some((fr) => fr.id === r.id));
    }
    return filteredRows;
  }, [levelFilter, trialBalanceRows, filteredRows]);

  const totalOpeningDebit = rowsForTotals.reduce((s, r) => s + r.openingDebit, 0);
  const totalOpeningCredit = rowsForTotals.reduce((s, r) => s + r.openingCredit, 0);
  const totalDebitMovements = rowsForTotals.reduce((s, r) => s + r.debitMovement, 0);
  const totalCreditMovements = rowsForTotals.reduce((s, r) => s + r.creditMovement, 0);
  const totalDebitBalances = rowsForTotals.reduce((s, r) => s + r.debitBalance, 0);
  const totalCreditBalances = rowsForTotals.reduce((s, r) => s + r.creditBalance, 0);

  const balanceVariance = Math.abs(totalDebitBalances - totalCreditBalances);
  const isBalanced = balanceVariance < 0.01;

  // Check if month 1 or all periods starting from month 1 is active
  const isMonth1 = useMemo(() => {
    if (selectedMonth === "1") return true;
    if (selectedMonth === "ALL") {
      if (!startDate) return true;
      const parts = startDate.split("-");
      if (parts.length >= 2) {
        return parseInt(parts[1], 10) === 1;
      }
      return true;
    }
    return false;
  }, [selectedMonth, startDate]);

  // Print Trial Balance Report
  const handlePrintTrialBalance = () => {
    const rowsHtml = filteredRows
      .map(
        (r) => `
        <tr style="${r.isHeader ? "font-weight: bold; background-color: #f8fafc;" : ""}">
          <td style="font-weight: bold; text-align: center;">${r.code}</td>
          <td style="padding-right: ${r.level * 10}px;">${r.nameAr} ${r.isHeader ? "(رئيسي)" : ""}</td>
          <td style="text-align: center;">${r.type}</td>
          <td style="text-align: right;">${isMonth1 && r.openingDebit > 0 ? r.openingDebit.toLocaleString() : "-"}</td>
          <td style="text-align: right;">${isMonth1 && r.openingCredit > 0 ? r.openingCredit.toLocaleString() : "-"}</td>
          <td style="color: #2563eb; text-align: right;">${r.debitMovement > 0 ? r.debitMovement.toLocaleString() : "-"}</td>
          <td style="color: #d97706; text-align: right;">${r.creditMovement > 0 ? r.creditMovement.toLocaleString() : "-"}</td>
          <td style="color: green; font-weight: bold; text-align: right;">${r.debitBalance > 0 ? r.debitBalance.toLocaleString() : "-"}</td>
          <td style="color: red; font-weight: bold; text-align: right;">${r.creditBalance > 0 ? r.creditBalance.toLocaleString() : "-"}</td>
        </tr>
      `
      )
      .join("");

    const html = `
      <div style="margin-bottom: 15px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 5px 0; color: #0f172a;">ميزان المراجعة بالأرصدة والمجاميع الفعلية (من واقع القيود)</h3>
        <p style="margin: 2px 0; font-size: 12px; color: #475569;">
          الفترة المالية: <strong>${startDate || "من البداية"}</strong> إلى <strong>${endDate || "حتى الآن"}</strong> | للسنة المالية: ${companySettings.financialYear}
        </p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: ${isBalanced ? "green" : "red"}; font-weight: bold;">
          حالة اتزان الميزان: ${isBalanced ? "متزن 100% ✓ (إجمالي الأرصدة المدينة = إجمالي الأرصدة الدائنة)" : `تنبيه: يوجد فارق عدم اتزان قدره (${balanceVariance.toLocaleString()} ${companySettings.currency})`}
        </p>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:11px;">
        <thead>
          <tr style="background:#0f172a; color:white;">
            <th style="padding:8px; border:1px solid #334155;">كود الحساب</th>
            <th style="padding:8px; border:1px solid #334155;">اسم الحساب</th>
            <th style="padding:8px; border:1px solid #334155;">نوع الحساب</th>
            <th style="padding:8px; border:1px solid #334155;">افتتاحي مدين</th>
            <th style="padding:8px; border:1px solid #334155;">افتتاحي دائن</th>
            <th style="padding:8px; border:1px solid #334155;">حركة مدينة</th>
            <th style="padding:8px; border:1px solid #334155;">حركة دائنة</th>
            <th style="padding:8px; border:1px solid #334155;">رصيد مدين نهائي</th>
            <th style="padding:8px; border:1px solid #334155;">رصيد دائن نهائي</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr style="font-weight: bold; background: #f1f5f9; font-size: 12px;">
            <td colspan="3" style="text-align: right; padding: 10px;">المجموع الإجمالي لميزان المراجعة:</td>
            <td style="text-align: right;">${isMonth1 ? totalOpeningDebit.toLocaleString() : "-"}</td>
            <td style="text-align: right;">${isMonth1 ? totalOpeningCredit.toLocaleString() : "-"}</td>
            <td style="color: #2563eb; text-align: right;">${totalDebitMovements.toLocaleString()}</td>
            <td style="color: #d97706; text-align: right;">${totalCreditMovements.toLocaleString()}</td>
            <td style="color: green; text-align: right;">${totalDebitBalances.toLocaleString()} ${companySettings.currency}</td>
            <td style="color: red; text-align: right;">${totalCreditBalances.toLocaleString()} ${companySettings.currency}</td>
          </tr>
        </tbody>
      </table>
    `;

    printReport("ميزان المراجعة بالأرصدة والمجاميع الفعلية", html, companySettings);
  };

  // Export to Excel
  const handleExportToExcel = () => {
    const data = filteredRows.map((r) => ({
      "كود الحساب": r.code,
      "اسم الحساب": r.nameAr,
      "نوع الحساب": r.type,
      "طبيعة الحساب": r.isHeader ? "رئيسي" : "فرعي",
      "الرصيد الافتتاحي - مدين": r.openingDebit,
      "الرصيد الافتتاحي - دائن": r.openingCredit,
      "حركة الفترة - مدين": r.debitMovement,
      "حركة الفترة - دائن": r.creditMovement,
      "الرصيد النهائي - مدين": r.debitBalance,
      "الرصيد النهائي - دائن": r.creditBalance,
    }));

    exportToExcel(data, `ميزان_المراجعة_الفعلي_${companySettings.companyName}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#11141B] p-4 rounded-xl border border-gray-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-400" />
            <span>ميزان المراجعة بالأرصدة الفعلية (من واقع القيود)</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            حساب ديناميكي آلي للأرصدة الافتتاحية، حركات الفترة المحلّة، والأرصدة الفعلية النهائية لكل حساب
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrintTrialBalance}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow transition"
          >
            <FileText className="w-4 h-4" />
            <span>تصدير إلى PDF</span>
          </button>
          <button
            onClick={handlePrintTrialBalance}
            className="flex items-center gap-1.5 bg-[#1A1F26] hover:bg-gray-800 text-gray-200 border border-gray-700 px-3.5 py-1.5 rounded-lg text-xs font-medium transition"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>طباعة الميزان</span>
          </button>
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-1.5 bg-[#1A1F26] hover:bg-gray-800 text-gray-200 border border-gray-700 px-3.5 py-1.5 rounded-lg text-xs font-medium transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير إكسل</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-[#11141B] border border-gray-800 p-4 rounded-xl space-y-1">
          <span className="text-gray-400">إجمالي الحركات المدينة للفترة</span>
          <p className="text-xl font-extrabold text-blue-400">
            {totalDebitMovements.toLocaleString()} {companySettings.currency}
          </p>
        </div>

        <div className="bg-[#11141B] border border-gray-800 p-4 rounded-xl space-y-1">
          <span className="text-gray-400">إجمالي الحركات الدائنة للفترة</span>
          <p className="text-xl font-extrabold text-amber-400">
            {totalCreditMovements.toLocaleString()} {companySettings.currency}
          </p>
        </div>

        <div className="bg-[#11141B] border border-gray-800 p-4 rounded-xl space-y-1">
          <span className="text-gray-400">إجمالي الأرصدة المدينة النهائية</span>
          <p className="text-xl font-extrabold text-emerald-400">
            {totalDebitBalances.toLocaleString()} {companySettings.currency}
          </p>
        </div>

        <div className="bg-[#11141B] border border-gray-800 p-4 rounded-xl space-y-1">
          <span className="text-gray-400">إجمالي الأرصدة الدائنة النهائية</span>
          <div className="flex items-center justify-between">
            <p className="text-xl font-extrabold text-rose-400">
              {totalCreditBalances.toLocaleString()} {companySettings.currency}
            </p>
            {isBalanced ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                <CheckCircle2 className="w-3 h-3" /> متزن 100%
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded font-bold" title={`فارق عدم الاتزان: ${balanceVariance}`}>
                <AlertTriangle className="w-3 h-3" /> غير متزن ({balanceVariance.toLocaleString()})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Date Range & Controls Bar */}
      <div className="bg-[#11141B] border border-gray-800 rounded-xl p-3 space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2 text-gray-300 font-semibold">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>تحديد الفترة المالية للحركات:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Year Selector */}
            <div className="flex items-center gap-1.5 bg-[#1A1F26] border border-gray-700 rounded-lg px-2.5 py-1">
              <span className="text-amber-400 font-semibold text-[11px]">السنة:</span>
              <select
                value={selectedYear}
                onChange={(e) => handleYearMonthChange(e.target.value, selectedMonth)}
                className="bg-transparent text-white focus:outline-none text-xs font-bold"
              >
                <option value="ALL" className="bg-slate-900">جميع السنوات</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr} className="bg-slate-900">
                    سنة {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div className="flex items-center gap-1.5 bg-[#1A1F26] border border-gray-700 rounded-lg px-2.5 py-1">
              <span className="text-blue-400 font-semibold text-[11px]">الشهر:</span>
              <select
                value={selectedMonth}
                onChange={(e) => handleYearMonthChange(selectedYear, e.target.value)}
                className="bg-transparent text-white focus:outline-none text-xs font-bold"
              >
                <option value="ALL" className="bg-slate-900">جميع الشهور (الكل)</option>
                <option value="1" className="bg-slate-900">01 - يناير</option>
                <option value="2" className="bg-slate-900">02 - فبراير</option>
                <option value="3" className="bg-slate-900">03 - مارس</option>
                <option value="4" className="bg-slate-900">04 - أبريل</option>
                <option value="5" className="bg-slate-900">05 - مايو</option>
                <option value="6" className="bg-slate-900">06 - يونيو</option>
                <option value="7" className="bg-slate-900">07 - يوليو</option>
                <option value="8" className="bg-slate-900">08 - أغسطس</option>
                <option value="9" className="bg-slate-900">09 - سبتمبر</option>
                <option value="10" className="bg-slate-900">10 - أكتوبر</option>
                <option value="11" className="bg-slate-900">11 - نوفمبر</option>
                <option value="12" className="bg-slate-900">12 - ديسمبر</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-[#1A1F26] border border-gray-700 rounded-lg px-2.5 py-1">
              <span className="text-gray-400 text-[11px]">من:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-[#1A1F26] border border-gray-700 rounded-lg px-2.5 py-1">
              <span className="text-gray-400 text-[11px]">إلى:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none text-xs"
              />
            </div>

            <button
              onClick={setThisMonth}
              className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg font-medium transition"
            >
              هذا الشهر
            </button>
            <button
              onClick={setThisYear}
              className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 rounded-lg font-medium transition"
            >
              هذه السنة
            </button>
            {(startDate || endDate || selectedYear !== "ALL" || selectedMonth !== "ALL") && (
              <button
                onClick={clearDates}
                className="px-2.5 py-1 text-gray-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 rounded-lg flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3 h-3 text-rose-400" />
                <span>إعادة ضبط التصفية</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالكود، اسم الحساب، أو النوع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1A1F26] border border-gray-700 rounded-lg pr-9 pl-3 py-1.5 text-xs text-[#E2E8F0] focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as any)}
              className="bg-[#1A1F26] border border-gray-700 rounded-lg px-3 py-1.5 text-gray-300 focus:outline-none"
            >
              <option value="SUB">الحسابات الفرعية فقط (المستطردة)</option>
              <option value="HEADER">الحسابات الرئيسية فقط</option>
              <option value="ALL">جميع المستويات (رئيسي + فرعي)</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#1A1F26] border border-gray-700 rounded-lg px-3 py-1.5 text-gray-300 focus:outline-none"
            >
              <option value="ALL">جميع أنواع الحسابات</option>
              <option value="ASSET">الأصول (Assets)</option>
              <option value="LIABILITY">الالتزامات (Liabilities)</option>
              <option value="EQUITY">حقوق الملكية (Equity)</option>
              <option value="REVENUE">الإيرادات (Revenues)</option>
              <option value="EXPENSE">المصروفات (Expenses)</option>
            </select>

            <button
              onClick={() => setHideZeroBalances(!hideZeroBalances)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                hideZeroBalances
                  ? "bg-amber-600/20 text-amber-300 border-amber-500/40"
                  : "bg-[#1A1F26] text-gray-400 border-gray-700 hover:text-white"
              }`}
            >
              {hideZeroBalances ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{hideZeroBalances ? "إخفاء الحسابات الصفرية" : "إظهار الكل"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Trial Balance Table */}
      <div className="bg-[#11141B] border border-gray-800 rounded-xl p-4 overflow-x-auto shadow-xl">
        <table className="w-full text-xs text-right text-gray-300 border-collapse">
          <thead className="bg-[#1A1F26] text-gray-400">
            <tr>
              <th className="p-2.5 border-b border-gray-800">الكود</th>
              <th className="p-2.5 border-b border-gray-800">اسم الحساب</th>
              <th className="p-2.5 border-b border-gray-800">نوع الحساب</th>
              <th className="p-2.5 border-b border-gray-800 text-center bg-slate-900/60" colSpan={2}>
                الرصيد الافتتاحي
              </th>
              <th className="p-2.5 border-b border-gray-800 text-center bg-blue-950/40" colSpan={2}>
                حركات الفترة (من القيود)
              </th>
              <th className="p-2.5 border-b border-gray-800 text-center bg-emerald-950/40" colSpan={2}>
                الأرصدة الفعلية النهائية
              </th>
            </tr>
            <tr className="bg-[#151922] text-[11px] text-gray-400">
              <th className="p-2 border-b border-gray-800"></th>
              <th className="p-2 border-b border-gray-800"></th>
              <th className="p-2 border-b border-gray-800"></th>
              <th className="p-2 border-b border-gray-800 text-slate-300 text-center">مدين (+)</th>
              <th className="p-2 border-b border-gray-800 text-slate-300 text-center">دائن (-)</th>
              <th className="p-2 border-b border-gray-800 text-blue-400 text-center">مدين (+)</th>
              <th className="p-2 border-b border-gray-800 text-amber-400 text-center">دائن (-)</th>
              <th className="p-2 border-b border-gray-800 text-emerald-400 text-center">مدين</th>
              <th className="p-2 border-b border-gray-800 text-rose-400 text-center">دائن</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-500">
                  لا توجد حسابات مطابقة للبحث وتصفية ميزان المراجعة
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr
                  key={r.id}
                  className={`hover:bg-gray-800/40 transition ${
                    r.isHeader ? "font-bold bg-gray-800/30 text-white" : ""
                  }`}
                >
                  <td className="p-2.5 font-mono text-blue-400">{r.code}</td>
                  <td className="p-2.5" style={{ paddingRight: `${r.level * 10}px` }}>
                    {r.nameAr}
                    {r.isHeader && (
                      <span className="mr-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                        رئيسي
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-gray-400">{r.type}</td>
                  
                  {/* Opening Debit / Credit */}
                  <td className="p-2.5 text-center text-slate-300 font-mono">
                    {r.openingDebit > 0 ? r.openingDebit.toLocaleString() : "-"}
                  </td>
                  <td className="p-2.5 text-center text-slate-300 font-mono">
                    {r.openingCredit > 0 ? r.openingCredit.toLocaleString() : "-"}
                  </td>

                  {/* Movements Debit / Credit */}
                  <td className="p-2.5 text-center text-blue-400 font-semibold font-mono">
                    {r.debitMovement > 0 ? r.debitMovement.toLocaleString() : "-"}
                  </td>
                  <td className="p-2.5 text-center text-amber-400 font-semibold font-mono">
                    {r.creditMovement > 0 ? r.creditMovement.toLocaleString() : "-"}
                  </td>

                  {/* Final Debit / Credit Balances */}
                  <td className="p-2.5 text-center text-emerald-400 font-bold font-mono">
                    {r.debitBalance > 0 ? r.debitBalance.toLocaleString() : "-"}
                  </td>
                  <td className="p-2.5 text-center text-rose-400 font-bold font-mono">
                    {r.creditBalance > 0 ? r.creditBalance.toLocaleString() : "-"}
                  </td>
                </tr>
              ))
            )}

            {/* Total Row */}
            <tr className="bg-[#1A1F26] font-extrabold text-white text-xs border-t-2 border-gray-700">
              <td colSpan={3} className="p-3 text-right">
                إجمالي ميزان المراجعة بالأرصدة والمجاميع:
              </td>
              <td className="p-3 text-center text-slate-200">{totalOpeningDebit.toLocaleString()}</td>
              <td className="p-3 text-center text-slate-200">{totalOpeningCredit.toLocaleString()}</td>
              <td className="p-3 text-center text-blue-400">{totalDebitMovements.toLocaleString()}</td>
              <td className="p-3 text-center text-amber-400">{totalCreditMovements.toLocaleString()}</td>
              <td className="p-3 text-center text-emerald-400">
                {totalDebitBalances.toLocaleString()} {companySettings.currency}
              </td>
              <td className="p-3 text-center text-rose-400">
                {totalCreditBalances.toLocaleString()} {companySettings.currency}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

