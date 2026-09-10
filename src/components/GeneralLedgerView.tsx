import React, { useState, useMemo } from "react";
import {
  BookCheck,
  Printer,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  Calendar,
  Layers,
  ArrowUpDown,
  Eye,
  CheckCircle2,
  FolderKanban,
  Building2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Account,
  CompanySettings,
  JournalEntry,
  CostCenter,
  FilterParams,
} from "../types";
import { exportToExcel, printReport } from "../utils/export";

interface GeneralLedgerViewProps {
  accounts: Account[];
  journalEntries: JournalEntry[];
  costCenters: CostCenter[];
  companySettings: CompanySettings;
  filterParams: FilterParams;
}

export const GeneralLedgerView: React.FC<GeneralLedgerViewProps> = ({
  accounts,
  journalEntries,
  costCenters,
  companySettings,
  filterParams,
}) => {
  // State variables
  const [selectedAccountId, setSelectedAccountId] = useState<string>("ALL");
  const [selectedAccountType, setSelectedAccountType] = useState<string>("ALL");
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>(filterParams.query || "");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [viewMode, setViewMode] = useState<"ALL_MOVEMENTS" | "PER_ACCOUNT">("ALL_MOVEMENTS");
  
  // Modal for viewing complete journal entry details
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);

  // Accounts Map for fast lookup
  const accountsMap = useMemo(() => {
    const map = new Map<string, Account>();
    accounts.forEach((acc) => map.set(acc.id, acc));
    return map;
  }, [accounts]);

  // Cost Centers Map for lookup
  const costCentersMap = useMemo(() => {
    const map = new Map<string, CostCenter>();
    costCenters.forEach((cc) => map.set(cc.id, cc));
    return map;
  }, [costCenters]);

  // Sort journal entries strictly by date and entry number
  const sortedEntries = useMemo(() => {
    return [...journalEntries].sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      const numA = parseInt(a.entryNumber.replace(/\D/g, "") || "0", 10);
      const numB = parseInt(b.entryNumber.replace(/\D/g, "") || "0", 10);
      if (numA !== numB) return numA - numB;
      return a.entryNumber.localeCompare(b.entryNumber);
    });
  }, [journalEntries]);

  // Calculate effective opening balance per account (taking into account acc.openingBalance and any entries before startDate)
  const accountOpeningBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    accounts.forEach((acc) => {
      balances[acc.id] = acc.openingBalance || 0;
    });

    if (startDate) {
      sortedEntries.forEach((entry) => {
        if (entry.date < startDate) {
          entry.lines.forEach((line) => {
            if (balances[line.accountId] !== undefined) {
              balances[line.accountId] += (line.debit || 0) - (line.credit || 0);
            }
          });
        }
      });
    }

    return balances;
  }, [accounts, sortedEntries, startDate]);

  // Flattened journal entry movements with account balance tracking
  const allLedgerMovements = useMemo(() => {
    const movements: {
      id: string;
      entryId: string;
      entryNumber: string;
      date: string;
      accountId: string;
      accountCode: string;
      accountName: string;
      accountType: string;
      costCenterId?: string;
      costCenterName?: string;
      debit: number;
      credit: number;
      note: string;
      reference?: string;
      entry: JournalEntry;
      accountRunningBalance: number;
    }[] = [];

    // Track running balance per account starting with account opening balance
    const accountRunningBalances: Record<string, number> = { ...accountOpeningBalances };

    const selectedAccountObj = selectedAccountId !== "ALL" ? accountsMap.get(selectedAccountId) : null;
    let targetAccountIds: Set<string> | null = null;
    if (selectedAccountObj) {
      if (selectedAccountObj.isHeader) {
        const getSubIds = (parentId: string): string[] => {
          const children = accounts.filter((a) => a.parentId === parentId);
          let ids: string[] = [];
          children.forEach((child) => {
            if (child.isHeader) {
              ids = ids.concat(getSubIds(child.id));
            } else {
              ids.push(child.id);
            }
          });
          return ids;
        };
        targetAccountIds = new Set(getSubIds(selectedAccountObj.id));
      } else {
        targetAccountIds = new Set<string>([selectedAccountId]);
      }
    }

    sortedEntries.forEach((entry) => {
      // Date filtering
      if (startDate && entry.date < startDate) return;
      if (endDate && entry.date > endDate) return;

      entry.lines.forEach((line) => {
        const acc = accountsMap.get(line.accountId);
        if (!acc) return;

        // Account filter (matches account or its sub-accounts)
        if (targetAccountIds && !targetAccountIds.has(line.accountId)) return;
        // Account Type filter
        if (selectedAccountType !== "ALL" && acc.type !== selectedAccountType) return;
        // Cost center filter
        if (selectedCostCenterId !== "ALL" && line.costCenterId !== selectedCostCenterId) return;

        // Search Query filter
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchNumber = entry.entryNumber.toLowerCase().includes(q);
          const matchNote = (line.note || entry.notes || "").toLowerCase().includes(q);
          const matchAccCode = acc.code.toLowerCase().includes(q);
          const matchAccName = acc.nameAr.toLowerCase().includes(q);
          const matchRef = (entry.reference || "").toLowerCase().includes(q);
          if (!matchNumber && !matchNote && !matchAccCode && !matchAccName && !matchRef) {
            return;
          }
        }

        const debit = line.debit || 0;
        const credit = line.credit || 0;

        // Calculate running balance for this account
        if (accountRunningBalances[acc.id] === undefined) {
          accountRunningBalances[acc.id] = accountOpeningBalances[acc.id] || 0;
        }
        accountRunningBalances[acc.id] += debit - credit;

        const cc = line.costCenterId ? costCentersMap.get(line.costCenterId) : undefined;

        movements.push({
          id: `${entry.id}-${line.id}`,
          entryId: entry.id,
          entryNumber: entry.entryNumber,
          date: entry.date,
          accountId: acc.id,
          accountCode: acc.code,
          accountName: acc.nameAr,
          accountType: acc.type,
          costCenterId: line.costCenterId,
          costCenterName: cc ? `${cc.code} - ${cc.nameAr}` : undefined,
          debit,
          credit,
          note: line.note || entry.notes || "-",
          reference: entry.reference,
          entry,
          accountRunningBalance: accountRunningBalances[acc.id],
        });
      });
    });

    return movements;
  }, [
    sortedEntries,
    accountsMap,
    costCentersMap,
    accountOpeningBalances,
    selectedAccountId,
    selectedAccountType,
    selectedCostCenterId,
    startDate,
    endDate,
    searchQuery,
    accounts,
  ]);

  // Grouped by account for the Per-Account View
  const groupedByAccount = useMemo(() => {
    const map = new Map<
      string,
      {
        account: Account;
        openingBalance: number;
        movements: typeof allLedgerMovements;
        totalDebit: number;
        totalCredit: number;
        netBalance: number;
      }
    >();

    // If a specific account is selected, pre-populate map so account is visible even with 0 movements
    if (selectedAccountId !== "ALL") {
      const selectedAccObj = accountsMap.get(selectedAccountId);
      if (selectedAccObj) {
        let accsToInclude: Account[] = [];
        if (selectedAccObj.isHeader) {
          const getSubIds = (parentId: string): string[] => {
            const children = accounts.filter((a) => a.parentId === parentId);
            let ids: string[] = [];
            children.forEach((child) => {
              if (child.isHeader) {
                ids = ids.concat(getSubIds(child.id));
              } else {
                ids.push(child.id);
              }
            });
            return ids;
          };
          const subSet = new Set(getSubIds(selectedAccObj.id));
          accsToInclude = accounts.filter((a) => subSet.has(a.id) && !a.isHeader);
        } else {
          accsToInclude = [selectedAccObj];
        }

        accsToInclude.forEach((acc) => {
          const opBal = accountOpeningBalances[acc.id] || 0;
          map.set(acc.id, {
            account: acc,
            openingBalance: opBal,
            movements: [],
            totalDebit: 0,
            totalCredit: 0,
            netBalance: opBal,
          });
        });
      }
    }

    allLedgerMovements.forEach((mov) => {
      let group = map.get(mov.accountId);
      if (!group) {
        const acc = accountsMap.get(mov.accountId)!;
        const opBal = accountOpeningBalances[mov.accountId] || 0;
        group = {
          account: acc,
          openingBalance: opBal,
          movements: [],
          totalDebit: 0,
          totalCredit: 0,
          netBalance: opBal,
        };
        map.set(mov.accountId, group);
      }
      group.movements.push(mov);
      group.totalDebit += mov.debit;
      group.totalCredit += mov.credit;
      group.netBalance = group.openingBalance + group.totalDebit - group.totalCredit;
    });

    return Array.from(map.values()).sort((a, b) =>
      a.account.code.localeCompare(b.account.code)
    );
  }, [allLedgerMovements, accountsMap, accountOpeningBalances, selectedAccountId, accounts]);

  // Collapsed state for Per-Account view
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});

  const toggleAccountExpand = (accId: string) => {
    setExpandedAccounts((prev) => ({
      ...prev,
      [accId]: !prev[accId],
    }));
  };

  const expandAllAccounts = () => {
    const next: Record<string, boolean> = {};
    groupedByAccount.forEach((g) => {
      next[g.account.id] = true;
    });
    setExpandedAccounts(next);
  };

  const collapseAllAccounts = () => {
    setExpandedAccounts({});
  };

  // Overall Statistics
  const totalDebitSum = useMemo(
    () => allLedgerMovements.reduce((sum, m) => sum + m.debit, 0),
    [allLedgerMovements]
  );
  const totalCreditSum = useMemo(
    () => allLedgerMovements.reduce((sum, m) => sum + m.credit, 0),
    [allLedgerMovements]
  );
  const activeAccountsCount = useMemo(
    () => new Set(allLedgerMovements.map((m) => m.accountId)).size,
    [allLedgerMovements]
  );

  // Check if Month 1 (January) or all periods from beginning of year is selected
  const isMonth1 = useMemo(() => {
    if (!startDate) return true;
    const parts = startDate.split("-");
    if (parts.length >= 2) {
      const m = parseInt(parts[1], 10);
      return m === 1;
    }
    return true;
  }, [startDate]);

  const totalOpeningSum = useMemo(() => {
    if (!isMonth1) return 0;
    if (selectedAccountId !== "ALL") {
      const selectedAccObj = accountsMap.get(selectedAccountId);
      if (!selectedAccObj) return 0;
      if (selectedAccObj.isHeader) {
        const getSubIds = (parentId: string): string[] => {
          const children = accounts.filter((a) => a.parentId === parentId);
          let ids: string[] = [];
          children.forEach((child) => {
            if (child.isHeader) {
              ids = ids.concat(getSubIds(child.id));
            } else {
              ids.push(child.id);
            }
          });
          return ids;
        };
        const subSet = new Set(getSubIds(selectedAccObj.id));
        return accounts
          .filter((a) => subSet.has(a.id) && !a.isHeader)
          .reduce((sum, a) => sum + (accountOpeningBalances[a.id] || 0), 0);
      }
      return accountOpeningBalances[selectedAccountId] || 0;
    }
    return groupedByAccount.reduce((sum, g) => sum + g.openingBalance, 0);
  }, [isMonth1, selectedAccountId, accountsMap, accountOpeningBalances, accounts, groupedByAccount]);

  const totalNetBalance = useMemo(
    () => totalOpeningSum + totalDebitSum - totalCreditSum,
    [totalOpeningSum, totalDebitSum, totalCreditSum]
  );

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedAccountId("ALL");
    setSelectedAccountType("ALL");
    setSelectedCostCenterId("ALL");
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
  };

  // Quick date presets
  const setQuickDateRange = (type: "THIS_MONTH" | "PREV_MONTH" | "ALL") => {
    if (type === "ALL") {
      setStartDate("");
      setEndDate("");
      return;
    }
    const now = new Date();
    if (type === "THIS_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (type === "PREV_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString()
        .split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
        .toISOString()
        .split("T")[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    }
  };

  // Export to Excel handler
  const handleExportExcel = () => {
    const selectedAccObj = accountsMap.get(selectedAccountId);
    const accLabel = selectedAccObj
      ? `${selectedAccObj.code}_${selectedAccObj.nameAr}`
      : "جميع_الحسابات";

    const dataToExport: any[] = [];

    // Prepend opening balance for selected account only if Month 1 (or all periods) is active
    if (isMonth1 && selectedAccObj && !selectedAccObj.isHeader) {
      const opBal = accountOpeningBalances[selectedAccObj.id] || 0;
      dataToExport.push({
        "التاريخ": startDate || "بداية المدة",
        "رقم القيد": "-",
        "رمز الحساب": selectedAccObj.code,
        "اسم الحساب": selectedAccObj.nameAr,
        "البيان والتفاصيل": "الرصيد الافتتاحي للحساب",
        "مركز التكلفة": "-",
        "مدين (+)": opBal > 0 ? opBal : 0,
        "دائن (-)": opBal < 0 ? Math.abs(opBal) : 0,
        "الرصيد التراكمي": opBal,
      });
    }

    allLedgerMovements.forEach((mov) => {
      dataToExport.push({
        "التاريخ": mov.date,
        "رقم القيد": mov.entryNumber,
        "رمز الحساب": mov.accountCode,
        "اسم الحساب": mov.accountName,
        "البيان والتفاصيل": mov.note,
        "مركز التكلفة": mov.costCenterName || "-",
        "مدين (+)": mov.debit,
        "دائن (-)": mov.credit,
        "الرصيد التراكمي": mov.accountRunningBalance,
      });
    });

    exportToExcel(dataToExport, `دفتر_الأستاذ_العام_${accLabel}`);
  };

  // Print Report Handler
  const handlePrintLedger = () => {
    const selectedAccObj = accountsMap.get(selectedAccountId);
    const filterDesc = selectedAccObj
      ? `الحساب: ${selectedAccObj.code} - ${selectedAccObj.nameAr}`
      : selectedAccountType !== "ALL"
      ? `نوع الحسابات: ${selectedAccountType}`
      : "كافة حسابات النظام";

    const dateRangeDesc =
      startDate || endDate
        ? `الفترة: من ${startDate || "البداية"} إلى ${endDate || "النهاية"}`
        : "كافة الفترات المالية";

    let rowsHtml = "";

    if (isMonth1 && selectedAccObj && !selectedAccObj.isHeader) {
      const opBal = accountOpeningBalances[selectedAccObj.id] || 0;
      rowsHtml += `
        <tr style="background-color: #fef3c7; font-weight: bold;">
          <td style="text-align: center;">${startDate || "بداية المدة"}</td>
          <td style="text-align: center;">-</td>
          <td><strong>${selectedAccObj.code}</strong> - ${selectedAccObj.nameAr}</td>
          <td>الرصيد الافتتاحي للحساب</td>
          <td style="text-align: center;">-</td>
          <td style="text-align: right; color: #16a34a;">${opBal > 0 ? opBal.toLocaleString() : "-"}</td>
          <td style="text-align: right; color: #dc2626;">${opBal < 0 ? Math.abs(opBal).toLocaleString() : "-"}</td>
          <td style="text-align: right; color: #1d4ed8;">${opBal.toLocaleString()} ${companySettings.currency}</td>
        </tr>
      `;
    }

    rowsHtml += allLedgerMovements
      .map(
        (m) => `
      <tr>
        <td style="text-align: center;">${m.date}</td>
        <td style="text-align: center; font-weight: bold;">${m.entryNumber}</td>
        <td><strong>${m.accountCode}</strong> - ${m.accountName}</td>
        <td>${m.note}</td>
        <td style="text-align: center;">${m.costCenterName || "-"}</td>
        <td style="text-align: right; color: #16a34a; font-weight: bold;">${
          m.debit > 0 ? m.debit.toLocaleString() : "-"
        }</td>
        <td style="text-align: right; color: #dc2626; font-weight: bold;">${
          m.credit > 0 ? m.credit.toLocaleString() : "-"
        }</td>
        <td style="text-align: right; font-weight: bold;">${m.accountRunningBalance.toLocaleString()} ${
          companySettings.currency
        }</td>
      </tr>
    `
      )
      .join("");

    const htmlContent = `
      <div style="margin-bottom: 20px; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div style="display: flex; justify-content: space-between; font-size: 13px;">
          <p style="margin: 2px 0;"><strong>${filterDesc}</strong></p>
          <p style="margin: 2px 0;"><strong>${dateRangeDesc}</strong></p>
        </div>
        <div style="display: flex; gap: 20px; margin-top: 10px; font-size: 12px; color: #334155;">
          ${isMonth1 ? `<span><strong>الرصيد الافتتاحي:</strong> ${totalOpeningSum.toLocaleString()} ${companySettings.currency}</span>` : ""}
          <span><strong>إجمالي المدين:</strong> ${totalDebitSum.toLocaleString()} ${companySettings.currency}</span>
          <span><strong>إجمالي الدائن:</strong> ${totalCreditSum.toLocaleString()} ${companySettings.currency}</span>
          <span><strong>الرصيد الصافي النهائي:</strong> ${totalNetBalance.toLocaleString()} ${companySettings.currency}</span>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
        <thead>
          <tr style="background-color: #0f172a; color: white;">
            <th style="padding: 8px; border: 1px solid #334155;">التاريخ</th>
            <th style="padding: 8px; border: 1px solid #334155;">رقم القيد</th>
            <th style="padding: 8px; border: 1px solid #334155;">الحساب</th>
            <th style="padding: 8px; border: 1px solid #334155;">البيان والتفاصيل</th>
            <th style="padding: 8px; border: 1px solid #334155;">مركز التكلفة</th>
            <th style="padding: 8px; border: 1px solid #334155;">مدين (+)</th>
            <th style="padding: 8px; border: 1px solid #334155;">دائن (-)</th>
            <th style="padding: 8px; border: 1px solid #334155;">الرصيد التراكمي</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr style="background-color: #f1f5f9; font-weight: bold;">
            <td colspan="5" style="padding: 10px; text-align: left; border: 1px solid #cbd5e1;">الرصيد الصافي النهائي</td>
            <td style="padding: 10px; text-align: right; color: #16a34a; border: 1px solid #cbd5e1;">${totalDebitSum.toLocaleString()} ${companySettings.currency}</td>
            <td style="padding: 10px; text-align: right; color: #dc2626; border: 1px solid #cbd5e1;">${totalCreditSum.toLocaleString()} ${companySettings.currency}</td>
            <td style="padding: 10px; text-align: right; border: 1px solid #cbd5e1;">${totalNetBalance.toLocaleString()} ${companySettings.currency}</td>
          </tr>
        </tfoot>
      </table>
    `;

    printReport("دفتر الأستاذ العام - تفاصيل حركات الحسابات", htmlContent, companySettings);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#11141B] border border-gray-800 rounded-xl p-5 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
              <BookCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                دفتر الأستاذ العام (General Ledger)
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  الحركات اليومية
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                سجل تفصيلي وشامل لكافة حركات وتأثيرات الحسابات المباشرة المرحّلة من القيود اليومية
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={handlePrintLedger}
            className="flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>تصدير إلى PDF</span>
          </button>

          <button
            onClick={handlePrintLedger}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-lg border border-gray-700 transition-colors"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>طباعة الدفتر</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-xs font-medium rounded-lg border border-emerald-500/30 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#11141B] border border-gray-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">إجمالي الرصيد الافتتاحي</p>
            <p className="text-lg font-bold text-amber-400 mt-1">
              {totalOpeningSum.toLocaleString()} <span className="text-xs text-gray-400">{companySettings.currency}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <BookCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#11141B] border border-gray-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">إجمالي الحركات المدينة</p>
            <p className="text-lg font-bold text-emerald-400 mt-1">
              {totalDebitSum.toLocaleString()} <span className="text-xs text-gray-400">{companySettings.currency}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ArrowUpDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#11141B] border border-gray-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">إجمالي الحركات الدائنة</p>
            <p className="text-lg font-bold text-red-400 mt-1">
              {totalCreditSum.toLocaleString()} <span className="text-xs text-gray-400">{companySettings.currency}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <ArrowUpDown className="w-5 h-5 rotate-180" />
          </div>
        </div>

        <div className="bg-[#11141B] border border-gray-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">الرصيد الصافي النهائي</p>
            <p className={`text-lg font-bold mt-1 ${totalNetBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {totalNetBalance.toLocaleString()}{" "}
              <span className="text-xs text-gray-400">{companySettings.currency}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="bg-[#11141B] border border-gray-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#1A1F26] p-1 rounded-lg border border-gray-800 self-start">
            <button
              onClick={() => setViewMode("ALL_MOVEMENTS")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "ALL_MOVEMENTS"
                  ? "bg-blue-600 text-white font-semibold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              جميع الحركات chronologically
            </button>
            <button
              onClick={() => setViewMode("PER_ACCOUNT")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "PER_ACCOUNT"
                  ? "bg-blue-600 text-white font-semibold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              تجميع حسب الحساب (حساب بحساب)
            </button>
          </div>

          {/* Quick Date Range Presets */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-xs text-gray-400 flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5" /> اختصار الفترة:
            </span>
            <button
              onClick={() => setQuickDateRange("THIS_MONTH")}
              className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded border border-gray-700 transition-colors whitespace-nowrap"
            >
              هذا الشهر
            </button>
            <button
              onClick={() => setQuickDateRange("PREV_MONTH")}
              className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded border border-gray-700 transition-colors whitespace-nowrap"
            >
              الشهر السابق
            </button>
            <button
              onClick={() => setQuickDateRange("ALL")}
              className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded border border-gray-700 transition-colors whitespace-nowrap"
            >
              كل المدة
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-gray-800">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم القيد، البيان، الحساب..."
              className="w-full pr-9 pl-3 py-2 bg-[#1A1F26] border border-gray-700 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Account Selector */}
          <div>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-[#1A1F26] border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">كل الحسابات الفرعية والرئيسية</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.nameAr} ({acc.type})
                </option>
              ))}
            </select>
          </div>

          {/* Account Type Filter */}
          <div>
            <select
              value={selectedAccountType}
              onChange={(e) => setSelectedAccountType(e.target.value)}
              className="w-full px-3 py-2 bg-[#1A1F26] border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">جميع أنواع الحسابات</option>
              <option value="ASSET">الأصول (Assets)</option>
              <option value="LIABILITY">الالتزامات (Liabilities)</option>
              <option value="EQUITY">حقوق الملكية (Equity)</option>
              <option value="REVENUE">الإيرادات (Revenues)</option>
              <option value="EXPENSE">المصروفات (Expenses)</option>
            </select>
          </div>

          {/* Cost Center Filter */}
          <div>
            <select
              value={selectedCostCenterId}
              onChange={(e) => setSelectedCostCenterId(e.target.value)}
              className="w-full px-3 py-2 bg-[#1A1F26] border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">جميع مراكز التكلفة</option>
              {costCenters.map((cc) => (
                <option key={cc.id} value={cc.id}>
                  {cc.code} - {cc.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-1/2 px-2 py-2 bg-[#1A1F26] border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              title="من تاريخ"
            />
            <span className="text-gray-500 text-xs">إلى</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-1/2 px-2 py-2 bg-[#1A1F26] border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              title="إلى تاريخ"
            />
          </div>
        </div>

        {/* Filter Summary & Clear Button */}
        {(selectedAccountId !== "ALL" ||
          selectedAccountType !== "ALL" ||
          selectedCostCenterId !== "ALL" ||
          searchQuery ||
          startDate ||
          endDate) && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-800 text-xs">
            <span className="text-blue-400 font-medium">
              تم تطبيق الفلترة — يعرض {allLedgerMovements.length} من أصل{" "}
              {journalEntries.reduce((acc, j) => acc + j.lines.length, 0)} حركة
            </span>
            <button
              onClick={handleResetFilters}
              className="text-gray-400 hover:text-white underline text-xs"
            >
              إعادة ضبط الفلاتر
            </button>
          </div>
        )}
      </div>

      {/* View Mode 1: All Movements Table */}
      {viewMode === "ALL_MOVEMENTS" && (
        <div className="bg-[#11141B] border border-gray-800 rounded-xl overflow-hidden shadow-md">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#151921]">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <BookCheck className="w-4 h-4 text-blue-400" />
              جدول حركات دفتر الأستاذ العام
            </h3>
            <span className="text-xs text-gray-400">
              مرتبة زمنياً حسب تاريخ القيد المحاسبي
            </span>
          </div>

          {allLedgerMovements.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-300 font-medium text-sm">لا توجد حركات تسجيلية تطابق الفلترة المحددة</p>
              <p className="text-gray-500 text-xs mt-1">
                تأكد من إدخال قيود يومية أو ترحيلها أو خيارات الفلترة المحددة
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right text-gray-300">
                <thead className="bg-[#1A1F26] text-gray-400 font-medium border-b border-gray-800">
                  <tr>
                    <th className="px-4 py-3">التاريخ</th>
                    <th className="px-4 py-3">رقم القيد</th>
                    <th className="px-4 py-3">رمز واسم الحساب</th>
                    <th className="px-4 py-3">البيان والتفاصيل</th>
                    <th className="px-4 py-3">مركز التكلفة</th>
                    <th className="px-4 py-3 text-emerald-400">مدين (+)</th>
                    <th className="px-4 py-3 text-red-400">دائن (-)</th>
                    <th className="px-4 py-3 text-blue-300">الرصيد التراكمي</th>
                    <th className="px-4 py-3 text-center">معاينة القيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {allLedgerMovements.map((mov) => (
                    <tr
                      key={mov.id}
                      className="hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {mov.date}
                      </td>
                      <td className="px-4 py-3 font-semibold text-blue-400 whitespace-nowrap">
                        {mov.entryNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-gray-400 mr-1">[{mov.accountCode}]</span>
                        <span className="font-medium text-white">{mov.accountName}</span>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-gray-300" title={mov.note}>
                        {mov.note}
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {mov.costCenterName || "-"}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-400 whitespace-nowrap dir-ltr text-right">
                        {mov.debit > 0 ? mov.debit.toLocaleString() : "-"}
                      </td>
                      <td className="px-4 py-3 font-bold text-red-400 whitespace-nowrap dir-ltr text-right">
                        {mov.credit > 0 ? mov.credit.toLocaleString() : "-"}
                      </td>
                      <td className="px-4 py-3 font-bold text-blue-300 whitespace-nowrap dir-ltr text-right">
                        {mov.accountRunningBalance.toLocaleString()} {companySettings.currency}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setViewingEntry(mov.entry)}
                          className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                          title="عرض القيد المحاسبي الكامل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#1A1F26] font-bold text-white border-t border-gray-800">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-left">
                      الإجمالي الكلي للحركات المعروضة:
                    </td>
                    <td className="px-4 py-3 text-emerald-400 text-right dir-ltr">
                      {totalDebitSum.toLocaleString()} {companySettings.currency}
                    </td>
                    <td className="px-4 py-3 text-red-400 text-right dir-ltr">
                      {totalCreditSum.toLocaleString()} {companySettings.currency}
                    </td>
                    <td colSpan={2} className="px-4 py-3 text-blue-300 text-right dir-ltr">
                      الصافي: {(totalDebitSum - totalCreditSum).toLocaleString()} {companySettings.currency}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View Mode 2: Per-Account Grouped View */}
      {viewMode === "PER_ACCOUNT" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-gray-400">
              عدد الحسابات في العرض: {groupedByAccount.length} حساب
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={expandAllAccounts}
                className="text-xs text-blue-400 hover:underline"
              >
                توسيع الكل
              </button>
              <span className="text-gray-600">|</span>
              <button
                onClick={collapseAllAccounts}
                className="text-xs text-gray-400 hover:underline"
              >
                طوي الكل
              </button>
            </div>
          </div>

          {groupedByAccount.length === 0 ? (
            <div className="bg-[#11141B] border border-gray-800 rounded-xl p-12 text-center">
              <Layers className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-300 font-medium text-sm">لا توجد حسابات نشطة تطابق الفلترة</p>
            </div>
          ) : (
            groupedByAccount.map(({ account, openingBalance, movements, totalDebit, totalCredit, netBalance }) => {
              const isExpanded = expandedAccounts[account.id] ?? true;

              return (
                <div
                  key={account.id}
                  className="bg-[#11141B] border border-gray-800 rounded-xl overflow-hidden shadow-md"
                >
                  {/* Account Header Bar */}
                  <div
                    onClick={() => toggleAccountExpand(account.id)}
                    className="p-4 bg-[#151921] hover:bg-[#1A1F26] cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-400 text-sm">
                            {account.code}
                          </span>
                          <span className="font-bold text-white text-sm">
                            {account.nameAr}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                            {account.type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          عدد الحركات: {movements.length} حركة | الرصيد الحالي بالحساب:{" "}
                          <strong className="text-white">{account.balance.toLocaleString()} {companySettings.currency}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 text-xs w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-gray-800 pt-2 sm:pt-0">
                      {isMonth1 && (
                        <div>
                          <span className="text-gray-400 block text-[10px]">الرصيد الافتتاحي</span>
                          <span className="font-bold text-amber-400 dir-ltr">
                            {openingBalance.toLocaleString()} {companySettings.currency}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-400 block text-[10px]">إجمالي المدين</span>
                        <span className="font-bold text-emerald-400 dir-ltr">
                          {totalDebit.toLocaleString()} {companySettings.currency}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">إجمالي الدائن</span>
                        <span className="font-bold text-red-400 dir-ltr">
                          {totalCredit.toLocaleString()} {companySettings.currency}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">الرصيد الصافي النهائي</span>
                        <span
                          className={`font-bold dir-ltr ${
                            netBalance >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {netBalance.toLocaleString()} {companySettings.currency}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Account Movements Table */}
                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-right text-gray-300">
                        <thead className="bg-[#1A1F26] text-gray-400 font-medium border-b border-gray-800">
                          <tr>
                            <th className="px-4 py-2.5">التاريخ</th>
                            <th className="px-4 py-2.5">رقم القيد</th>
                            <th className="px-4 py-2.5">البيان والتفاصيل</th>
                            <th className="px-4 py-2.5">مركز التكلفة</th>
                            <th className="px-4 py-2.5 text-emerald-400">مدين (+)</th>
                            <th className="px-4 py-2.5 text-red-400">دائن (-)</th>
                            <th className="px-4 py-2.5 text-blue-300">الرصيد التراكمي للحساب</th>
                            <th className="px-4 py-2.5 text-center">عرض القيد</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/40">
                          {/* Opening Balance Row (Only in Month 1 or full period) */}
                          {isMonth1 && (
                            <tr className="bg-amber-500/10 font-medium text-amber-300 border-b border-gray-800">
                              <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{startDate || "بداية المدة"}</td>
                              <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">-</td>
                              <td className="px-4 py-2.5 font-bold text-amber-300">
                                الرصيد الافتتاحي للحساب
                              </td>
                              <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">-</td>
                              <td className="px-4 py-2.5 font-bold text-emerald-400 whitespace-nowrap dir-ltr text-right">
                                {openingBalance > 0 ? openingBalance.toLocaleString() : "-"}
                              </td>
                              <td className="px-4 py-2.5 font-bold text-red-400 whitespace-nowrap dir-ltr text-right">
                                {openingBalance < 0 ? Math.abs(openingBalance).toLocaleString() : "-"}
                              </td>
                              <td className="px-4 py-2.5 font-bold text-blue-300 whitespace-nowrap dir-ltr text-right">
                                {openingBalance.toLocaleString()} {companySettings.currency}
                              </td>
                              <td className="px-4 py-2.5 text-center text-gray-500">-</td>
                            </tr>
                          )}

                          {movements.map((mov) => (
                            <tr
                              key={mov.id}
                              className="hover:bg-gray-800/30 transition-colors"
                            >
                              <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">
                                {mov.date}
                              </td>
                              <td className="px-4 py-2.5 font-semibold text-blue-400 whitespace-nowrap">
                                {mov.entryNumber}
                              </td>
                              <td className="px-4 py-2.5 text-gray-300 max-w-sm truncate">
                                {mov.note}
                              </td>
                              <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">
                                {mov.costCenterName || "-"}
                              </td>
                              <td className="px-4 py-2.5 font-bold text-emerald-400 whitespace-nowrap dir-ltr text-right">
                                {mov.debit > 0 ? mov.debit.toLocaleString() : "-"}
                              </td>
                              <td className="px-4 py-2.5 font-bold text-red-400 whitespace-nowrap dir-ltr text-right">
                                {mov.credit > 0 ? mov.credit.toLocaleString() : "-"}
                              </td>
                              <td className="px-4 py-2.5 font-bold text-blue-300 whitespace-nowrap dir-ltr text-right">
                                {mov.accountRunningBalance.toLocaleString()} {companySettings.currency}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <button
                                  onClick={() => setViewingEntry(mov.entry)}
                                  className="p-1 text-gray-400 hover:text-blue-400 rounded transition-colors"
                                  title="عرض القيد"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal: View Full Journal Entry Details */}
      {viewingEntry && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#11141B] border border-gray-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  تفاصيل القيد المحاسبي #{viewingEntry.entryNumber}
                  {viewingEntry.isPosted ? (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> مرحل
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      مسودة
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  التاريخ: {viewingEntry.date} | السنة المالية: {viewingEntry.financialYear}
                </p>
              </div>
              <button
                onClick={() => setViewingEntry(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 text-sm"
              >
                ✕
              </button>
            </div>

            {viewingEntry.notes && (
              <div className="bg-[#1A1F26] p-3 rounded-lg border border-gray-800 text-xs text-gray-300">
                <strong className="text-gray-400 block mb-1">بيان / ملاحظات القيد العامة:</strong>
                {viewingEntry.notes}
              </div>
            )}

            {/* Entry Lines */}
            <div className="overflow-x-auto border border-gray-800 rounded-lg">
              <table className="w-full text-xs text-right text-gray-300">
                <thead className="bg-[#1A1F26] text-gray-400 border-b border-gray-800">
                  <tr>
                    <th className="p-2.5">رمز الحساب</th>
                    <th className="p-2.5">اسم الحساب</th>
                    <th className="p-2.5 text-emerald-400">مدين (+)</th>
                    <th className="p-2.5 text-red-400">دائن (-)</th>
                    <th className="p-2.5">ملاحظات السطر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {viewingEntry.lines.map((line, idx) => {
                    const acc = accountsMap.get(line.accountId);
                    return (
                      <tr key={idx} className="hover:bg-gray-800/30">
                        <td className="p-2.5 font-mono text-gray-400">{acc?.code || "-"}</td>
                        <td className="p-2.5 font-medium text-white">{acc?.nameAr || "حساب غير معروف"}</td>
                        <td className="p-2.5 font-bold text-emerald-400 dir-ltr text-right">
                          {line.debit > 0 ? line.debit.toLocaleString() : "-"}
                        </td>
                        <td className="p-2.5 font-bold text-red-400 dir-ltr text-right">
                          {line.credit > 0 ? line.credit.toLocaleString() : "-"}
                        </td>
                        <td className="p-2.5 text-gray-400">{line.note || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[#1A1F26] font-bold text-white border-t border-gray-800">
                  <tr>
                    <td colSpan={2} className="p-2.5 text-left">
                      إجمالي القيد:
                    </td>
                    <td className="p-2.5 text-emerald-400 text-right dir-ltr">
                      {viewingEntry.lines.reduce((s, l) => s + (l.debit || 0), 0).toLocaleString()}{" "}
                      {companySettings.currency}
                    </td>
                    <td className="p-2.5 text-red-400 text-right dir-ltr">
                      {viewingEntry.lines.reduce((s, l) => s + (l.credit || 0), 0).toLocaleString()}{" "}
                      {companySettings.currency}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-800">
              <button
                onClick={() => setViewingEntry(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
