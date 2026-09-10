import React, { useState, useMemo } from "react";
import {
  Receipt,
  Printer,
  FileSpreadsheet,
  Search,
  Trash2,
  Calendar,
  Filter,
  RefreshCw,
} from "lucide-react";
import { Account, CompanySettings, CostCenter, JournalEntry, TreasuryVoucher, FilterParams } from "../types";
import { exportToExcel, printReport } from "../utils/export";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface ExpensesSheetViewProps {
  accounts: Account[];
  journalEntries: JournalEntry[];
  treasuryVouchers: TreasuryVoucher[];
  costCenters: CostCenter[];
  companySettings: CompanySettings;
  filterParams: FilterParams;
  onDeleteTreasuryVoucher?: (voucherId: string) => void;
  onDeleteJournalEntry?: (entryId: string) => void;
}

export const ExpensesSheetView: React.FC<ExpensesSheetViewProps> = ({
  accounts,
  journalEntries,
  treasuryVouchers,
  costCenters,
  companySettings,
  filterParams,
  onDeleteTreasuryVoucher,
  onDeleteJournalEntry,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState(filterParams.query || "");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [startDate, setStartDate] = useState(filterParams.startDate || "");
  const [endDate, setEndDate] = useState(filterParams.endDate || "");
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<{ sourceId: string; sourceType: "TREASURY" | "JOURNAL"; name: string } | null>(null);

  const expenseAccounts = useMemo(() => {
    return accounts.filter((a) => a.type === "EXPENSE");
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
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [journalEntries, companySettings.financialYear]);

  // Extract all individual expense transactions without duplication
  const expenseRecords = React.useMemo(() => {
    const list: {
      id: string;
      sourceType: "TREASURY" | "JOURNAL";
      sourceId: string;
      date: string;
      docNumber: string;
      accountId: string;
      accountCode: string;
      accountName: string;
      costCenterName: string;
      notes: string;
      amount: number;
    }[] = [];

    const seenKeys = new Set<string>();

    // 1. Journal entries (primary source of truth for posted entries)
    journalEntries.forEach((je) => {
      if (je.isPosted === false) return;
      je.lines.forEach((l) => {
        const acc = accounts.find((a) => a.id === l.accountId);
        if (acc && acc.type === "EXPENSE" && l.debit > 0) {
          const cc = costCenters.find((c) => c.id === l.costCenterId);
          const key = `${je.entryNumber}_${acc.id}_${je.date}_${l.debit}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            list.push({
              id: `${je.id}-${l.id}`,
              sourceType: "JOURNAL",
              sourceId: je.id,
              date: je.date,
              docNumber: je.entryNumber,
              accountId: acc.id,
              accountCode: acc.code,
              accountName: acc.nameAr,
              costCenterName: cc ? cc.name : "عمومي",
              notes: l.note || je.notes || "مصروف إداري/تشغيلي",
              amount: l.debit,
            });
          }
        }
      });
    });

    // 2. Treasury vouchers (only include standalone vouchers not already posted as journal entries)
    treasuryVouchers.forEach((tv) => {
      if (tv.voucherType === "PAYMENT") {
        // Skip vouchers auto-generated from journal entries
        if (tv.id.startsWith("TV-JE-") || tv.id.startsWith("tv-je-")) return;

        const acc = accounts.find((a) => a.id === tv.oppositeAccountId);
        if (acc && acc.type === "EXPENSE") {
          const cc = costCenters.find((c) => c.id === tv.costCenterId);
          
          // Check if already in journal or seenKeys
          const isAlreadyInJournal = journalEntries.some(
            (je) =>
              je.isPosted !== false &&
              (je.entryNumber === tv.voucherNumber ||
                (tv.manualRef && je.entryNumber === tv.manualRef) ||
                (je.reference && (je.reference === tv.voucherNumber || je.reference === tv.manualRef)))
          );

          const key = `${tv.voucherNumber}_${acc.id}_${tv.date}_${tv.amount}`;
          if (!isAlreadyInJournal && !seenKeys.has(key)) {
            seenKeys.add(key);
            list.push({
              id: tv.id,
              sourceType: "TREASURY",
              sourceId: tv.id,
              date: tv.date,
              docNumber: tv.voucherNumber,
              accountId: acc.id,
              accountCode: acc.code,
              accountName: acc.nameAr,
              costCenterName: cc ? cc.name : "عمومي",
              notes: tv.notes || "صرف نقدية",
              amount: tv.amount,
            });
          }
        }
      }
    });

    return list.sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [journalEntries, treasuryVouchers, accounts, costCenters]);

  const selectedAcc = useMemo(() => {
    if (!selectedAccountId) return null;
    return accounts.find((a) => a.id === selectedAccountId || a.code === selectedAccountId);
  }, [accounts, selectedAccountId]);

  const filteredRecords = expenseRecords.filter((r) => {
    // 1. Expense Item Filter
    let matchesAccount = true;
    if (selectedAccountId) {
      matchesAccount =
        r.accountId === selectedAccountId ||
        r.accountCode === selectedAccountId ||
        (selectedAcc !== null && r.accountCode.startsWith(selectedAcc.code));
    }

    // 2. Year & Month Filter
    const entryYear = r.date ? r.date.split("-")[0] : "";
    const matchesYear = !selectedYear || selectedYear === "ALL" || entryYear === selectedYear;

    const entryMonth = r.date ? parseInt(r.date.split("-")[1], 10).toString() : "";
    const matchesMonth = !selectedMonth || selectedMonth === "ALL" || entryMonth === selectedMonth;

    // 3. Date Range Filter
    const matchesStartDate = !startDate || r.date >= startDate;
    const matchesEndDate = !endDate || r.date <= endDate;

    // 4. Search Filter
    let matchesSearch = true;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      matchesSearch =
        r.docNumber.toLowerCase().includes(q) ||
        r.accountCode.toLowerCase().includes(q) ||
        r.accountName.toLowerCase().includes(q) ||
        r.costCenterName.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q) ||
        r.date.includes(q);
    }

    return matchesAccount && matchesYear && matchesMonth && matchesStartDate && matchesEndDate && matchesSearch;
  });

  const totalExpenseAmount = filteredRecords.reduce((s, r) => s + r.amount, 0);

  const handleExportToExcel = () => {
    const data = filteredRecords.map((r) => ({
      التاريخ: r.date,
      "رقم السند/القيد": r.docNumber,
      "كود بند المصروف": r.accountCode,
      "اسم بند المصروف": r.accountName,
      "مركز التكلفة / المشروع": r.costCenterName,
      "البيان والشرح": r.notes,
      المبلغ: r.amount,
    }));

    exportToExcel(data, `شيت_المصروفات_التفصيلي_${companySettings.companyName}`);
  };

  const handlePrintExpenses = () => {
    const rows = filteredRecords
      .map(
        (r) => `
        <tr>
          <td>${r.date}</td>
          <td>${r.docNumber}</td>
          <td>${r.accountCode} - ${r.accountName}</td>
          <td>${r.costCenterName}</td>
          <td>${r.notes}</td>
          <td style="font-weight: bold; color: #b91c1c;">${r.amount.toLocaleString()} ${companySettings.currency}</td>
        </tr>
      `
      )
      .join("");

    const html = `
      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>رقم القيد/السند</th>
            <th>بند المصروف</th>
            <th>مركز التكلفة</th>
            <th>البيان والتفاصيل</th>
            <th>المبلغ المصروف</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="font-weight: bold; background: #f1f5f9;">
            <td colspan="5">إجمالي المصروفات التفصيلية:</td>
            <td style="color: #b91c1c;">${totalExpenseAmount.toLocaleString()} ${companySettings.currency}</td>
          </tr>
        </tbody>
      </table>
    `;

    printReport("شيت المصروفات التفصيلي الشامل", html, companySettings);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-400" />
            <span>شيت المصروفات التفصيلي لجميع البنود</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            تتبع ومراقبة كافة المصروفات التشغيلية والإدارية والعمومية وتصفيتها حسب البند المختار
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintExpenses}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>طباعة الشيت</span>
          </button>
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير إكسل</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Expense Item Selector */}
          <div className="flex flex-wrap items-center gap-2 text-xs flex-1">
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg flex-1 min-w-[260px]">
              <Filter className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-slate-300 font-semibold text-[11px] whitespace-nowrap">اختيار بند المصروف:</span>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="bg-slate-900 text-rose-300 font-bold border border-slate-700 rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-rose-500"
              >
                <option value="">جميع بنود المصروفات (عرض الكل)</option>
                {expenseAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300 font-semibold text-[11px]">السنة:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-900 text-amber-300 font-bold border border-slate-700 rounded px-2 py-0.5 focus:outline-none"
              >
                <option value="ALL">جميع السنوات</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    سنة {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-lg">
              <span className="text-blue-400 font-semibold text-[11px]">الشهر:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-900 text-blue-300 font-bold border border-slate-700 rounded px-2 py-0.5 focus:outline-none"
              >
                <option value="ALL">جميع الشهور</option>
                <option value="1">01 - يناير</option>
                <option value="2">02 - فبراير</option>
                <option value="3">03 - مارس</option>
                <option value="4">04 - أبريل</option>
                <option value="5">05 - مايو</option>
                <option value="6">06 - يونيو</option>
                <option value="7">07 - يوليو</option>
                <option value="8">08 - أغسطس</option>
                <option value="9">09 - سبتمبر</option>
                <option value="10">10 - أكتوبر</option>
                <option value="11">11 - نوفمبر</option>
                <option value="12">12 - ديسمبر</option>
              </select>
            </div>

            {(selectedAccountId || selectedYear !== "ALL" || selectedMonth !== "ALL" || startDate || endDate || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedAccountId("");
                  setSelectedYear("ALL");
                  setSelectedMonth("ALL");
                  setStartDate("");
                  setEndDate("");
                  setSearchQuery("");
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 rounded-lg transition text-xs font-semibold"
              >
                <RefreshCw className="w-3 h-3 text-rose-400" />
                <span>إعادة ضبط التصفية</span>
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بالبيان أو برقم القيد أو السند..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pr-9 pl-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            />
          </div>

        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-x-auto">
        <div className="flex justify-between items-center mb-3 text-xs">
          <span className="text-slate-400">
            عدد بنود المصروفات المعروضة: <strong className="text-white">{filteredRecords.length}</strong>
            {selectedAcc && (
              <span className="mr-2 text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40">
                مصفى بـ: {selectedAcc.code} - {selectedAcc.nameAr}
              </span>
            )}
          </span>
          <span className="font-extrabold text-rose-400 text-sm">
            إجمالي المصروفات: {totalExpenseAmount.toLocaleString()} {companySettings.currency}
          </span>
        </div>

        <table className="w-full text-xs text-right text-slate-300">
          <thead className="bg-slate-800 text-slate-400">
            <tr>
              <th className="p-2.5">التاريخ</th>
              <th className="p-2.5">رقم السند/القيد</th>
              <th className="p-2.5">كود المصروف</th>
              <th className="p-2.5">بند المصروف</th>
              <th className="p-2.5">مركز التكلفة</th>
              <th className="p-2.5">البيان والشرح</th>
              <th className="p-2.5 text-left">المبلغ المصروف</th>
              <th className="p-2.5 text-center">حذف المصروف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  لا توجد مصروفات مسجلة تطابق بند المصروف والمعايير المحددة
                </td>
              </tr>
            ) : (
              filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40">
                  <td className="p-2.5">{r.date}</td>
                  <td className="p-2.5 font-bold font-mono text-blue-400">{r.docNumber}</td>
                  <td className="p-2.5 font-mono text-slate-400">{r.accountCode}</td>
                  <td className="p-2.5 font-semibold text-white">{r.accountName}</td>
                  <td className="p-2.5 text-slate-300">{r.costCenterName}</td>
                  <td className="p-2.5 max-w-xs truncate">{r.notes}</td>
                  <td className="p-2.5 font-bold text-rose-400 text-left">
                    {r.amount.toLocaleString()} {companySettings.currency}
                  </td>
                  <td className="p-2.5 text-center">
                    <button
                      onClick={() => setDeleteConfirmExpense({ sourceId: r.sourceId, sourceType: r.sourceType, name: `${r.accountName} (${r.docNumber})` })}
                      className="p-1 text-rose-400 hover:bg-slate-800 rounded transition"
                      title="حذف هذا المصروف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmExpense}
        message={`هل أنت تأكد من حذف قيد المصروف (${deleteConfirmExpense?.name}) نهائياً؟`}
        onConfirm={() => {
          if (deleteConfirmExpense) {
            if (deleteConfirmExpense.sourceType === "TREASURY" && onDeleteTreasuryVoucher) {
              onDeleteTreasuryVoucher(deleteConfirmExpense.sourceId);
            } else if (deleteConfirmExpense.sourceType === "JOURNAL" && onDeleteJournalEntry) {
              onDeleteJournalEntry(deleteConfirmExpense.sourceId);
            }
            setDeleteConfirmExpense(null);
          }
        }}
        onCancel={() => setDeleteConfirmExpense(null)}
      />

    </div>
  );
};

