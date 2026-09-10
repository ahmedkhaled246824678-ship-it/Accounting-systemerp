import React, { useState } from "react";
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Printer,
  FileSpreadsheet,
  Search,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  FileText,
  Calendar,
  Wallet,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Building2,
  Layers,
  Scale,
  MessageSquare,
  Download,
} from "lucide-react";
import { Account, AccountType, AccountCategory, CompanySettings, JournalEntry, FilterParams } from "../types";
import { exportToExcel, printReport, exportReportToPdf } from "../utils/export";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { useLanguage } from "../context/LanguageContext";
import { getLocalizedAccountName } from "../utils/accountTranslations";

interface AccountsViewProps {
  accounts: Account[];
  journalEntries: JournalEntry[];
  companySettings: CompanySettings;
  filterParams: FilterParams;
  onSaveAccount: (account: Account) => void;
  onToggleAccountActive: (accountId: string) => void;
  onDeleteAccount: (accountId: string) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  journalEntries,
  companySettings,
  filterParams,
  onSaveAccount,
  onToggleAccountActive,
  onDeleteAccount,
}) => {
  const { language, t } = useLanguage();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Partial<Account> | null>(null);
  const [deleteConfirmAccount, setDeleteConfirmAccount] = useState<{ id: string; name: string } | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    "1000": true,
    "1100": true,
    "2000": true,
    "3000": true,
    "4000": true,
    "5000": true,
  });

  const [searchQuery, setSearchQuery] = useState(filterParams.query || "");
  const [statementStartDate, setStatementStartDate] = useState(filterParams.startDate || "2026-01-01");
  const [statementEndDate, setStatementEndDate] = useState(filterParams.endDate || "2026-12-31");

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAddModal = (parentId?: string) => {
    const parent = parentId ? accounts.find((a) => a.id === parentId) : null;
    const newLevel = parent ? parent.level + 1 : 1;
    setEditingAccount({
      id: "ACC-" + Date.now(),
      code: parent ? `${parent.code}${accounts.filter((a) => a.parentId === parentId).length + 1}` : `${accounts.length + 1}`,
      nameAr: "",
      nameEn: "",
      type: parent ? parent.type : "ASSET",
      category: parent ? parent.category : "CURRENT_ASSET",
      parentId: parentId || undefined,
      balance: 0,
      isActive: true,
      isHeader: false,
      level: newLevel,
      description: "",
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (account: Account) => {
    setEditingAccount({ ...account });
    setShowModal(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editingAccount.nameAr || !editingAccount.code) return;

    const existingAcc = accounts.find((a) => a.id === editingAccount.id);
    const oldOpening = existingAcc ? (existingAcc.openingBalance ?? 0) : 0;
    const newOpening = editingAccount.openingBalance ?? 0;
    const diffOpening = newOpening - oldOpening;

    const updatedAccount: Account = {
      ...(editingAccount as Account),
      openingBalance: newOpening,
      balance: existingAcc ? (existingAcc.balance || 0) + diffOpening : newOpening,
    };

    onSaveAccount(updatedAccount);
    setShowModal(false);
    setEditingAccount(null);
  };

  // Calculate unified KPI figures identical to the Dashboard
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

  // Calculate Total Revenues, Expenses, Assets, Liabilities & Equity using actual sub-accounts
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

  // Helper to compute display balance:
  // - Sub-accounts return their actual balance
  // - Header accounts recursively aggregate all descendant sub-account balances
  const getAccountDisplayBalance = React.useCallback(
    (acc: Account): number => {
      if (!acc.isHeader) {
        return acc.balance || 0;
      }
      const getDescendantBalances = (parentId: string): number => {
        const children = accounts.filter((a) => a.parentId === parentId);
        let sum = 0;
        children.forEach((child) => {
          if (child.isHeader) {
            sum += getDescendantBalances(child.id);
          } else {
            sum += child.balance || 0;
          }
        });
        return sum;
      };
      return getDescendantBalances(acc.id);
    },
    [accounts]
  );

  // Export Chart of Accounts to Excel
  const handleExportAccountsToExcel = () => {
    const dataToExport = accounts.map((a) => ({
      "رقم الحساب": a.code,
      "اسم الحساب بالعربية": a.nameAr,
      "اسم الحساب بالإنجليزي": a.nameEn || "-",
      "النوع الرئيسي": a.type,
      "التصنيف الفرعي": a.category,
      "الرصيد الحالي": getAccountDisplayBalance(a),
      "حالة الحساب": a.isActive ? "نشط" : "معطل",
      "طبيعة الحساب": a.isHeader ? "رئيسي" : "فرعي قابل للقيد",
    }));
    exportToExcel(dataToExport, `دليل_الحسابات_${companySettings.companyName}`);
  };

  // Print Full Chart of Accounts
  const handlePrintChartOfAccounts = () => {
    const rows = accounts
      .map(
        (a) => `
        <tr>
          <td style="font-weight: bold;">${a.code}</td>
          <td style="padding-right: ${a.level * 12}px;">${a.nameAr}</td>
          <td>${a.type}</td>
          <td>${a.isHeader ? "حساب رئيسي" : "حساب فرعي"}</td>
          <td>${getAccountDisplayBalance(a).toLocaleString()} ${companySettings.currency}</td>
          <td>${a.isActive ? "نشط" : "معطل"}</td>
        </tr>
      `
      )
      .join("");

    const html = `
      <table>
        <thead>
          <tr>
            <th>كود الحساب</th>
            <th>اسم الحساب</th>
            <th>النوع الرئيسي</th>
            <th>نوع الحساب</th>
            <th>الرصيد الحالي</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    printReport("دليل الحسابات التفصيلي الشامل", html, companySettings);
  };

  // Export Chart of Accounts to PDF
  const handleExportPdfChartOfAccounts = async () => {
    const rows = accounts
      .map(
        (a) => `
        <tr>
          <td style="font-weight: bold; text-align: center;">${a.code}</td>
          <td style="padding-right: ${a.level * 12}px;">${a.nameAr}</td>
          <td style="text-align: center;">${a.type}</td>
          <td style="text-align: center;">${a.isHeader ? "حساب رئيسي" : "حساب فرعي"}</td>
          <td style="text-align: right; font-weight: bold;">${getAccountDisplayBalance(a).toLocaleString()} ${companySettings.currency}</td>
          <td style="text-align: center;">${a.isActive ? "نشط" : "معطل"}</td>
        </tr>
      `
      )
      .join("");

    const html = `
      <table>
        <thead>
          <tr>
            <th>كود الحساب</th>
            <th>اسم الحساب</th>
            <th>النوع الرئيسي</th>
            <th>نوع الحساب</th>
            <th>الرصيد الحالي</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    await exportReportToPdf(`دليل_الحسابات_${companySettings.companyName}`, html, companySettings);
  };

  // WhatsApp helper for specific account
  const handleSendWhatsAppAccount = (a: Account) => {
    const bal = getAccountDisplayBalance(a);
    const msg = `🏢 *${companySettings.companyName}*\n📌 *كشف رصيد الحساب:*\n\n🔹 *الحساب:* ${a.nameAr} (${a.code})\n🏷️ *طبيعة الحساب:* ${a.isHeader ? "رئيسي تجميعي" : "فرعي تفصيلي"}\n📂 *التصنيف:* ${a.type}\n💰 *الرصيد الحالي:* ${bal.toLocaleString()} ${companySettings.currency}\n📅 *بتاريخ:* ${new Date().toLocaleDateString("ar-EG")}\n\n✅ معتمد من إدارة الحسابات.`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const selectedAccount = selectedAccountId ? accounts.find((a) => a.id === selectedAccountId) : null;

  const [manualOpeningInput, setManualOpeningInput] = useState<string>("");
  const [isEditingOpening, setIsEditingOpening] = useState<boolean>(false);

  // Sync manual opening input when selected account changes
  React.useEffect(() => {
    if (selectedAccount) {
      setManualOpeningInput((selectedAccount.openingBalance ?? selectedAccount.balance ?? 0).toString());
      setIsEditingOpening(false);
    }
  }, [selectedAccountId, selectedAccount?.openingBalance, selectedAccount?.balance]);

  // Target account IDs for statement (selected account + any child sub-accounts if header)
  const targetAccountIds = React.useMemo(() => {
    if (!selectedAccountId || !selectedAccount) return new Set<string>();
    if (selectedAccount.isHeader) {
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
      return new Set(getSubIds(selectedAccount.id));
    }
    return new Set([selectedAccountId]);
  }, [selectedAccountId, selectedAccount, accounts]);

  // Generate Account Statement Data with Opening Balance (First) and Actual Balance (Second)
  const { openingBalance, accountTransactions, currentBalance, totalPeriodDebit, totalPeriodCredit } = React.useMemo(() => {
    if (!selectedAccountId || !selectedAccount) {
      return { openingBalance: 0, accountTransactions: [], currentBalance: 0, totalPeriodDebit: 0, totalPeriodCredit: 0 };
    }

    const initialOpening = selectedAccount.openingBalance !== undefined 
      ? selectedAccount.openingBalance 
      : (selectedAccount.balance || 0);

    const isDebitNature = selectedAccount.type === "ASSET" || selectedAccount.type === "EXPENSE";

    let priorDebit = 0;
    let priorCredit = 0;
    let periodDebit = 0;
    let periodCredit = 0;

    const list: {
      date: string;
      entryNumber: string;
      notes: string;
      debit: number;
      credit: number;
      runningBalance: number;
    }[] = [];

    // Filter and sort entries chronologically
    const sorted = [...journalEntries]
      .filter((e) => e.isPosted !== false)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach((entry) => {
      const isPrior = statementStartDate && entry.date < statementStartDate;
      const isInPeriod =
        (!statementStartDate || entry.date >= statementStartDate) &&
        (!statementEndDate || entry.date <= statementEndDate);

      entry.lines.forEach((line) => {
        if (targetAccountIds.has(line.accountId)) {
          const d = Number(line.debit) || 0;
          const c = Number(line.credit) || 0;

          if (isPrior) {
            priorDebit += d;
            priorCredit += c;
          } else if (isInPeriod) {
            periodDebit += d;
            periodCredit += c;
          }
        }
      });
    });

    // 1st: Opening balance calculation
    const openingNet = isDebitNature
      ? initialOpening + priorDebit - priorCredit
      : initialOpening + priorCredit - priorDebit;

    let running = openingNet;

    sorted.forEach((entry) => {
      const isInPeriod =
        (!statementStartDate || entry.date >= statementStartDate) &&
        (!statementEndDate || entry.date <= statementEndDate);

      if (!isInPeriod) return;

      entry.lines.forEach((line) => {
        if (targetAccountIds.has(line.accountId)) {
          const d = Number(line.debit) || 0;
          const c = Number(line.credit) || 0;

          if (isDebitNature) {
            running += d - c;
          } else {
            running += c - d;
          }

          const lineAcc = accounts.find((a) => a.id === line.accountId);
          const accTag = selectedAccount.isHeader && lineAcc ? ` [${lineAcc.code} - ${lineAcc.nameAr}]` : "";

          list.push({
            date: entry.date,
            entryNumber: entry.entryNumber,
            notes: (line.note || entry.notes || "-") + accTag,
            debit: d,
            credit: c,
            runningBalance: running,
          });
        }
      });
    });

    // 2nd: Actual / Current balance calculation
    const endingNet = isDebitNature
      ? openingNet + periodDebit - periodCredit
      : openingNet + periodCredit - periodDebit;

    return {
      openingBalance: openingNet,
      accountTransactions: list,
      currentBalance: endingNet,
      totalPeriodDebit: periodDebit,
      totalPeriodCredit: periodCredit,
    };
  }, [selectedAccountId, selectedAccount, targetAccountIds, accounts, journalEntries, statementStartDate, statementEndDate]);

  // Print Selected Account Statement
  const handlePrintAccountStatement = () => {
    if (!selectedAccount) return;

    const rows = accountTransactions
      .map(
        (t) => `
      <tr>
        <td style="text-align:center;">${t.date}</td>
        <td style="text-align:center; font-weight:bold; color:#2563eb;">${t.entryNumber}</td>
        <td>${t.notes}</td>
        <td style="text-align:right; color: green; font-weight:bold;">${t.debit > 0 ? t.debit.toLocaleString() : "-"}</td>
        <td style="text-align:right; color: red; font-weight:bold;">${t.credit > 0 ? t.credit.toLocaleString() : "-"}</td>
        <td style="text-align:right; font-weight: bold;">${t.runningBalance.toLocaleString()} ${companySettings.currency}</td>
      </tr>
    `
      )
      .join("");

    const html = `
      <div style="margin-bottom: 15px; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #cbd5e1;">
        <p style="margin: 2px 0; font-size: 14px;"><strong>اسم الحساب:</strong> ${selectedAccount.nameAr} (${selectedAccount.code})</p>
        <p style="margin: 2px 0; font-size: 12px; color: #475569;"><strong>الفترة المحددة:</strong> من ${statementStartDate || "البداية"} إلى ${statementEndDate || "النهاية"}</p>
        
        <div style="display: flex; gap: 30px; margin-top: 12px; padding-top: 10px; border-top: 2px dashed #cbd5e1;">
          <div style="background:#fef3c7; padding:8px 14px; border-radius:6px; border:1px solid #f59e0b;">
            <p style="margin:0; font-size:11px; color:#b45309; font-weight:bold;">أولاً: الرصيد الافتتاحي</p>
            <p style="margin:2px 0 0 0; font-size:16px; font-weight:bold; color:#78350f;">${openingBalance.toLocaleString()} ${companySettings.currency}</p>
          </div>
          <div style="background:#dcfce7; padding:8px 14px; border-radius:6px; border:1px solid #22c55e;">
            <p style="margin:0; font-size:11px; color:#15803d; font-weight:bold;">ثانياً: الرصيد الحالي النهائي</p>
            <p style="margin:2px 0 0 0; font-size:16px; font-weight:bold; color:#14532d;">${currentBalance.toLocaleString()} ${companySettings.currency}</p>
          </div>
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead>
          <tr style="background:#0f172a; color:white;">
            <th style="padding:8px; border:1px solid #334155;">التاريخ</th>
            <th style="padding:8px; border:1px solid #334155;">رقم القيد</th>
            <th style="padding:8px; border:1px solid #334155;">البيان والتفاصيل</th>
            <th style="padding:8px; border:1px solid #334155;">مدين (+)</th>
            <th style="padding:8px; border:1px solid #334155;">دائن (-)</th>
            <th style="padding:8px; border:1px solid #334155;">الرصيد التراكمي</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background:#fffbeb; font-weight:bold;">
            <td style="text-align:center;">${statementStartDate || "01/01/2026"}</td>
            <td style="text-align:center; color:#b45309;">افتتاحي</td>
            <td style="color:#b45309;">[أولاً] الرصيد الافتتاحي في بداية الفترة</td>
            <td style="text-align:right;">-</td>
            <td style="text-align:right;">-</td>
            <td style="text-align:right; font-weight:bold; color:#b45309;">${openingBalance.toLocaleString()} ${companySettings.currency}</td>
          </tr>
          ${rows}
        </tbody>
        <tfoot>
          <tr style="background:#f1f5f9; font-weight:bold;">
            <td colSpan="3" style="padding:10px; text-align:right;">[ثانياً] إجمالي الرصيد الحالي النهائي:</td>
            <td style="text-align:right; color:green;">${totalPeriodDebit.toLocaleString()}</td>
            <td style="text-align:right; color:red;">${totalPeriodCredit.toLocaleString()}</td>
            <td style="text-align:right; color:#16a34a; font-size:14px;">${currentBalance.toLocaleString()} ${companySettings.currency}</td>
          </tr>
        </tfoot>
      </table>
    `;

    printReport(`كشف حساب تفصيلي - ${selectedAccount.nameAr}`, html, companySettings);
  };

  // Export Selected Account Statement to PDF
  const handleExportPdfAccountStatement = async () => {
    if (!selectedAccount) return;

    const rows = accountTransactions
      .map(
        (t) => `
      <tr>
        <td style="text-align:center;">${t.date}</td>
        <td style="text-align:center; font-weight:bold; color:#2563eb;">${t.entryNumber}</td>
        <td>${t.notes}</td>
        <td style="text-align:right; color: green; font-weight:bold;">${t.debit > 0 ? t.debit.toLocaleString() : "-"}</td>
        <td style="text-align:right; color: red; font-weight:bold;">${t.credit > 0 ? t.credit.toLocaleString() : "-"}</td>
        <td style="text-align:right; font-weight: bold;">${t.runningBalance.toLocaleString()} ${companySettings.currency}</td>
      </tr>
    `
      )
      .join("");

    const html = `
      <div style="margin-bottom: 15px; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #cbd5e1;">
        <p style="margin: 2px 0; font-size: 14px;"><strong>اسم الحساب:</strong> ${selectedAccount.nameAr} (${selectedAccount.code})</p>
        <p style="margin: 2px 0; font-size: 12px; color: #475569;"><strong>الفترة المحددة:</strong> من ${statementStartDate || "البداية"} إلى ${statementEndDate || "النهاية"}</p>
        
        <div style="display: flex; gap: 30px; margin-top: 12px; padding-top: 10px; border-top: 2px dashed #cbd5e1;">
          <div style="background:#fef3c7; padding:8px 14px; border-radius:6px; border:1px solid #f59e0b;">
            <p style="margin:0; font-size:11px; color:#b45309; font-weight:bold;">أولاً: الرصيد الافتتاحي</p>
            <p style="margin:2px 0 0 0; font-size:16px; font-weight:bold; color:#78350f;">${openingBalance.toLocaleString()} ${companySettings.currency}</p>
          </div>
          <div style="background:#dcfce7; padding:8px 14px; border-radius:6px; border:1px solid #22c55e;">
            <p style="margin:0; font-size:11px; color:#15803d; font-weight:bold;">ثانياً: الرصيد الحالي النهائي</p>
            <p style="margin:2px 0 0 0; font-size:16px; font-weight:bold; color:#14532d;">${currentBalance.toLocaleString()} ${companySettings.currency}</p>
          </div>
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead>
          <tr style="background:#0f172a; color:white;">
            <th style="padding:8px; border:1px solid #334155;">التاريخ</th>
            <th style="padding:8px; border:1px solid #334155;">رقم القيد</th>
            <th style="padding:8px; border:1px solid #334155;">البيان والتفاصيل</th>
            <th style="padding:8px; border:1px solid #334155;">مدين (+)</th>
            <th style="padding:8px; border:1px solid #334155;">دائن (-)</th>
            <th style="padding:8px; border:1px solid #334155;">الرصيد التراكمي</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background:#fffbeb; font-weight:bold;">
            <td style="text-align:center;">${statementStartDate || "01/01/2026"}</td>
            <td style="text-align:center; color:#b45309;">افتتاحي</td>
            <td style="color:#b45309;">[أولاً] الرصيد الافتتاحي في بداية الفترة</td>
            <td style="text-align:right;">-</td>
            <td style="text-align:right;">-</td>
            <td style="text-align:right; font-weight:bold; color:#b45309;">${openingBalance.toLocaleString()} ${companySettings.currency}</td>
          </tr>
          ${rows}
        </tbody>
        <tfoot>
          <tr style="background:#f1f5f9; font-weight:bold;">
            <td colSpan="3" style="padding:10px; text-align:right;">[ثانياً] إجمالي الرصيد الحالي النهائي:</td>
            <td style="text-align:right; color:green;">${totalPeriodDebit.toLocaleString()}</td>
            <td style="text-align:right; color:red;">${totalPeriodCredit.toLocaleString()}</td>
            <td style="text-align:right; color:#16a34a; font-size:14px;">${currentBalance.toLocaleString()} ${companySettings.currency}</td>
          </tr>
        </tfoot>
      </table>
    `;

    await exportReportToPdf(`كشف_حساب_${selectedAccount.nameAr}`, html, companySettings);
  };

  // Send WhatsApp Statement
  const handleSendWhatsAppAccountStatement = () => {
    if (!selectedAccount) return;
    const msg = `🏢 *${companySettings.companyName}*\n📄 *كشف حساب تفصيلي:*\n\n📌 *الحساب:* ${selectedAccount.nameAr} (${selectedAccount.code})\n📅 *الفترة:* من ${statementStartDate || "البداية"} إلى ${statementEndDate || "النهاية"}\n\n1️⃣ *الرصيد الافتتاحي:* ${openingBalance.toLocaleString()} ${companySettings.currency}\n2️⃣ *إجمالي المدين:* ${totalPeriodDebit.toLocaleString()} ${companySettings.currency}\n3️⃣ *إجمالي الدائن:* ${totalPeriodCredit.toLocaleString()} ${companySettings.currency}\n\n✅ *الرصيد الحالي النهائي:* ${currentBalance.toLocaleString()} ${companySettings.currency}\n\nيرجى المطابقة والاعتماد.`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  // Export Account Statement to Excel
  const handleExportStatementToExcel = () => {
    if (!selectedAccount) return;
    const exportData = [
      {
        التاريخ: statementStartDate || "01/01/2026",
        "رقم القيد": "افتتاحي",
        البيان: "[أولاً] الرصيد الافتتاحي في بداية الفترة",
        "مدين (+)": 0,
        "دائن (-)": 0,
        "الرصيد التراكمي": openingBalance,
      },
      ...accountTransactions.map((t) => ({
        التاريخ: t.date,
        "رقم القيد": t.entryNumber,
        البيان: t.notes,
        "مدين (+)": t.debit,
        "دائن (-)": t.credit,
        "الرصيد التراكمي": t.runningBalance,
      })),
      {
        التاريخ: "الرصيد الحالي",
        "رقم القيد": "نهائي",
        البيان: "[ثانياً] إجمالي الرصيد الحالي النهائي",
        "مدين (+)": totalPeriodDebit,
        "دائن (-)": totalPeriodCredit,
        "الرصيد التراكمي": currentBalance,
      },
    ];
    exportToExcel(
      exportData,
      `كشف_حساب_${selectedAccount.code}_${selectedAccount.nameAr}`
    );
  };

  // Filter accounts by search query
  const filteredAccounts = accounts.filter(
    (a) =>
      a.nameAr.includes(searchQuery) ||
      a.code.includes(searchQuery) ||
      (a.nameEn && a.nameEn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.nameDe && a.nameDe.toLowerCase().includes(searchQuery.toLowerCase())) ||
      getLocalizedAccountName(a, language).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-blue-400" />
            <span>{t("accounts", "دليل الحسابات التفصيلي الهيكلي")}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === "ar"
              ? "إضافة، تعديل، تفعيل/تعطيل وحذف الحسابات الرئيسية والفرعية مع طباعة وتصدير كشوف الحسابات"
              : language === "de"
              ? "Hinzufügen, Bearbeiten, Aktivieren und Exportieren von Haupt- und Unterkonten"
              : "Add, edit, activate/deactivate, and delete accounts with full export and statement printing"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t("add", "إضافة حساب جديد")}</span>
          </button>
          <button
            onClick={handlePrintChartOfAccounts}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>{t("print", "طباعة الدليل")}</span>
          </button>
          <button
            onClick={handleExportAccountsToExcel}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>{t("exportExcel", "تصدير إكسل")}</span>
          </button>
          <button
            onClick={handleExportPdfChartOfAccounts}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
            title="تصدير شجرة ودليل الحسابات كاملاً بصيغة PDF"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>تصدير الدليل PDF</span>
          </button>
        </div>
      </div>

      {/* Financial Metrics Strip - Identical to Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-emerald-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">رصيد الخزائن (نقدية)</span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm lg:text-base font-extrabold text-emerald-400 mt-1">
            {totalTreasuryBalance.toLocaleString()} {companySettings.currency}
          </p>
          <span className="text-[9px] text-emerald-500 font-medium">مطابق للوحة التحكم</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-blue-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">سيولة البنوك المتاحة</span>
            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm lg:text-base font-extrabold text-blue-400 mt-1">
            {totalBankBalance.toLocaleString()} {companySettings.currency}
          </p>
          <span className="text-[9px] text-blue-400 font-medium">حسابات البنوك الجارية</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-emerald-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">إجمالي الإيرادات</span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm lg:text-base font-extrabold text-emerald-400 mt-1">
            {totalRevenues.toLocaleString()} {companySettings.currency}
          </p>
          <span className="text-[9px] text-emerald-500 font-medium">مبيعات وخدمات</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-rose-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">إجمالي المصروفات</span>
            <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm lg:text-base font-extrabold text-rose-400 mt-1">
            {totalExpenses.toLocaleString()} {companySettings.currency}
          </p>
          <span className="text-[9px] text-rose-400 font-medium">مصروفات تشغيلية</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-emerald-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">صافي الأرباح</span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm lg:text-base font-extrabold text-emerald-400 mt-1">
            {netProfit.toLocaleString()} {companySettings.currency}
          </p>
          <span className="text-[9px] text-emerald-500 font-medium">الأرباح التشغيلية</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-indigo-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">إجمالي الأصول</span>
            <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm lg:text-base font-extrabold text-indigo-400 mt-1">
            {totalAssets.toLocaleString()} {companySettings.currency}
          </p>
          <span className="text-[9px] text-indigo-400 font-medium">الميزانية العمومية</span>
        </div>
      </div>

      {/* Main Grid: Tree View Left / Account Statement Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Account Tree List */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="mb-3 relative">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="تصفية بالكود أو الاسم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-9 pl-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
            {filteredAccounts.map((account) => {
              const isSelected = selectedAccountId === account.id;
              return (
                <div
                  key={account.id}
                  style={{ marginRight: `${(account.level - 1) * 16}px` }}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs transition border ${
                    isSelected
                      ? "bg-blue-900/30 border-blue-500 text-white font-bold"
                      : "bg-slate-800/40 border-slate-800/80 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {account.isHeader ? (
                      <button
                        onClick={() => toggleExpand(account.id)}
                        className="p-0.5 text-slate-400 hover:text-white"
                      >
                        {expandedNodes[account.id] ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    ) : (
                      <span className="w-4" />
                    )}

                    <span className="font-mono text-blue-400 font-semibold">{account.code}</span>
                    <button
                      onClick={() => setSelectedAccountId(account.id)}
                      className="hover:underline text-right"
                    >
                      {getLocalizedAccountName(account, language)}
                    </button>
                    {account.isHeader && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                        رئيسي
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold text-xs ${
                        account.isHeader
                          ? "text-blue-300 bg-blue-950/50 border border-blue-800/40 px-2 py-0.5 rounded"
                          : "text-slate-200"
                      }`}
                      title={account.isHeader ? "إجمالي الحساب التراكمي للحسابات الفرعية التابعة (مطابق للوحة التحكم)" : "رصيد الحساب"}
                    >
                      {getAccountDisplayBalance(account).toLocaleString()} {companySettings.currency}
                    </span>

                    {/* Quick CRUD Actions */}
                    <div className="flex items-center gap-1 opacity-80 hover:opacity-100">
                      <button
                        onClick={() => handleSendWhatsAppAccount(account)}
                        className="p-1 hover:bg-emerald-950/70 text-emerald-400 rounded transition"
                        title="إرسال رصيد الحساب عبر واتساب"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      {account.isHeader && (
                        <button
                          onClick={() => handleOpenAddModal(account.id)}
                          className="p-1 hover:bg-slate-700 text-emerald-400 rounded"
                          title="إضافة فرعي"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditModal(account)}
                        className="p-1 hover:bg-slate-700 text-blue-400 rounded"
                        title="تعديل الحساب"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onToggleAccountActive(account.id)}
                        className={`p-1 rounded ${account.isActive ? "text-emerald-400" : "text-slate-500"}`}
                        title={account.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
                      >
                        {account.isActive ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmAccount({ id: account.id, name: `${account.code} - ${account.nameAr}` })}
                        className="p-1 hover:bg-slate-700 text-rose-400 rounded"
                        title="حذف الحساب"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Account Statement for Selected Account */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>كشف حساب تفصيلي</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedAccount ? `${getLocalizedAccountName(selectedAccount, language)} (${selectedAccount.code})` : "اختر حساباً لمشاهدة التفاصيل"}
                </p>
              </div>

              {selectedAccount && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleSendWhatsAppAccountStatement}
                    className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs flex items-center gap-1 font-semibold transition"
                    title="إرسال كشف رصيد الحساب عبر واتساب"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">واتساب</span>
                  </button>
                  <button
                    onClick={handleExportPdfAccountStatement}
                    className="px-2 py-1 bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/30 rounded-lg text-xs flex items-center gap-1 font-semibold transition"
                    title="تصدير كشف الحساب بصيغة PDF"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span className="hidden sm:inline">PDF</span>
                  </button>
                  <button
                    onClick={handlePrintAccountStatement}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-xs transition"
                    title="طباعة كشف الحساب"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleExportStatementToExcel}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs transition"
                    title="تصدير كشف الحساب لإكسل"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {selectedAccount ? (
              <div className="space-y-3">
                {/* Date range filter for statement */}
                <div className="grid grid-cols-2 gap-2 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                  <div>
                    <label className="text-[10px] text-slate-400 block">من تاريخ</label>
                    <input
                      type="date"
                      value={statementStartDate}
                      onChange={(e) => setStatementStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded p-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">إلى تاريخ</label>
                    <input
                      type="date"
                      value={statementEndDate}
                      onChange={(e) => setStatementEndDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded p-1"
                    />
                  </div>
                </div>

                {/* Balance Summary Cards: Opening Balance (First) & Actual Balance (Second) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-amber-950/30 border border-amber-500/30 p-2.5 rounded-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1">
                        <span className="bg-amber-500/20 px-1.5 py-0.5 rounded text-[10px]">1</span>
                        {t("openingBalance", "الرصيد الافتتاحي (يدوي)")}
                      </span>
                      {!isEditingOpening ? (
                        <button
                          type="button"
                          onClick={() => {
                            setManualOpeningInput((selectedAccount.openingBalance ?? selectedAccount.balance ?? 0).toString());
                            setIsEditingOpening(true);
                          }}
                          className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 transition"
                          title="تعديل القيد الافتتاحي يدويًا"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>تعديل فوري</span>
                        </button>
                      ) : null}
                    </div>

                    {isEditingOpening ? (
                      <div className="flex items-center gap-1 mt-1.5">
                        <input
                          type="number"
                          step="any"
                          value={manualOpeningInput}
                          onChange={(e) => setManualOpeningInput(e.target.value)}
                          className="w-full bg-slate-900 border border-amber-500 text-amber-300 font-mono font-bold text-xs rounded px-2 py-1 focus:outline-none"
                          placeholder="أدخل الرصيد الافتتاحي"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const val = parseFloat(manualOpeningInput) || 0;
                              const oldOpening = selectedAccount.openingBalance ?? 0;
                              const diffOpening = val - oldOpening;
                              onSaveAccount({
                                ...selectedAccount,
                                openingBalance: val,
                                balance: (selectedAccount.balance ?? 0) + diffOpening,
                              });
                              setIsEditingOpening(false);
                            } else if (e.key === "Escape") {
                              setIsEditingOpening(false);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = parseFloat(manualOpeningInput) || 0;
                            const oldOpening = selectedAccount.openingBalance ?? 0;
                            const diffOpening = val - oldOpening;
                            onSaveAccount({
                              ...selectedAccount,
                              openingBalance: val,
                              balance: (selectedAccount.balance ?? 0) + diffOpening,
                            });
                            setIsEditingOpening(false);
                          }}
                          className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded transition shrink-0"
                        >
                          حفظ
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingOpening(false)}
                          className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-1 rounded transition shrink-0"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm font-extrabold font-mono text-amber-400 mt-1">
                        {openingBalance.toLocaleString()} <span className="text-[10px] text-amber-300/80">{companySettings.currency}</span>
                      </span>
                    )}
                  </div>

                  <div className="bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-emerald-300 font-bold flex items-center gap-1">
                        <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded text-[10px]">2</span>
                        {t("currentBalance", "الرصيد الفعلي الحالي")}
                      </span>
                      <span className="text-[9px] text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        ({t("openingBalance", "الافتتاحي")} + {t("net", "صافي الحركة")})
                      </span>
                    </div>
                    <span className="text-sm font-extrabold font-mono text-emerald-400 mt-1">
                      {currentBalance.toLocaleString()} <span className="text-[10px] text-emerald-300/80">{companySettings.currency}</span>
                    </span>
                  </div>
                </div>

                {/* Account statement table */}
                <div className="max-h-[380px] overflow-y-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-xs text-right text-slate-300">
                    <thead className="bg-slate-800 text-slate-400 sticky top-0">
                      <tr>
                        <th className="p-2">التاريخ</th>
                        <th className="p-2">القيد</th>
                        <th className="p-2">البيان والتفاصيل</th>
                        <th className="p-2">مدين (+)</th>
                        <th className="p-2">دائن (-)</th>
                        <th className="p-2 text-blue-300">الرصيد التراكمي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {/* Row 1: Opening Balance (First) */}
                      <tr className="bg-amber-950/20 text-amber-300 font-semibold">
                        <td className="p-2 text-[11px] font-mono">{statementStartDate || "01/01/2026"}</td>
                        <td className="p-2 font-mono text-amber-400 text-[10px] font-bold">افتتاحي</td>
                        <td className="p-2 text-amber-300/90 text-[11px] font-medium">[أولاً] الرصيد الافتتاحي في بداية الفترة</td>
                        <td className="p-2 text-slate-500">-</td>
                        <td className="p-2 text-slate-500">-</td>
                        <td className="p-2 font-extrabold font-mono text-amber-300">
                          {openingBalance.toLocaleString()}
                        </td>
                      </tr>

                      {accountTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-500">
                            لا توجد قيود أو حركات إضافية مقيدة خلال هذه الفترة
                          </td>
                        </tr>
                      ) : (
                        accountTransactions.map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/50">
                            <td className="p-2 text-[11px]">{t.date}</td>
                            <td className="p-2 font-mono text-blue-400">{t.entryNumber}</td>
                            <td className="p-2 text-slate-200">{t.notes || "-"}</td>
                            <td className="p-2 text-emerald-400 font-semibold">{t.debit > 0 ? t.debit.toLocaleString() : "-"}</td>
                            <td className="p-2 text-rose-400 font-semibold">{t.credit > 0 ? t.credit.toLocaleString() : "-"}</td>
                            <td className="p-2 font-bold font-mono">{t.runningBalance.toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-slate-950 text-white font-bold border-t border-slate-700">
                      <tr>
                        <td colSpan={3} className="p-2.5 text-slate-300">
                          <span className="bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded text-[10px] ml-1">ثانياً</span>
                          إجمالي الرصيد الفعلي النهائي:
                        </td>
                        <td className="p-2.5 text-emerald-400 font-mono">{totalPeriodDebit > 0 ? totalPeriodDebit.toLocaleString() : "-"}</td>
                        <td className="p-2.5 text-rose-400 font-mono">{totalPeriodCredit > 0 ? totalPeriodCredit.toLocaleString() : "-"}</td>
                        <td className="p-2.5 text-emerald-400 font-mono font-extrabold text-sm">{currentBalance.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                <FileText className="w-8 h-8 mx-auto text-slate-600" />
                <p>يرجى النقر على أي حساب من القائمة لمشاهدة وتصدير كشف الحساب التفصيلي له.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Account Add/Edit Modal */}
      {showModal && editingAccount && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-5 shadow-2xl text-slate-100 space-y-4">
            <h3 className="text-base font-bold border-b border-slate-800 pb-2">
              {editingAccount.id ? "تعديل بيانات الحساب" : "إضافة حساب جديد"}
            </h3>

            <form onSubmit={handleSaveForm} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">كود الحساب *</label>
                <input
                  type="text"
                  required
                  value={editingAccount.code || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, code: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">اسم الحساب بالعربية *</label>
                <input
                  type="text"
                  required
                  value={editingAccount.nameAr || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, nameAr: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">الاسم بالإنجليزية (English)</label>
                  <input
                    type="text"
                    value={editingAccount.nameEn || ""}
                    onChange={(e) => setEditingAccount({ ...editingAccount, nameEn: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                    placeholder="e.g. Main Cash Vault"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">الاسم بالألمانية (Deutsch)</label>
                  <input
                    type="text"
                    value={editingAccount.nameDe || ""}
                    onChange={(e) => setEditingAccount({ ...editingAccount, nameDe: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                    placeholder="z.B. Hauptkasse"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">النوع الرئيسي *</label>
                <select
                  value={editingAccount.type || "ASSET"}
                  onChange={(e) => setEditingAccount({ ...editingAccount, type: e.target.value as AccountType })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                >
                  <option value="ASSET">أصول (Assets)</option>
                  <option value="LIABILITY">التزامات (Liabilities)</option>
                  <option value="EQUITY">حقوق ملكية (Equity)</option>
                  <option value="REVENUE">إيرادات (Revenues)</option>
                  <option value="EXPENSE">مصروفات (Expenses)</option>
                </select>
              </div>

              <div>
                <label className="block text-amber-300 font-semibold mb-1">القيد / الرصيد الافتتاحي (يدوي)</label>
                <input
                  type="number"
                  value={editingAccount.openingBalance ?? 0}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setEditingAccount({ ...editingAccount, openingBalance: val });
                  }}
                  className="w-full bg-slate-800 border border-amber-500/40 rounded p-2 text-amber-300 font-bold font-mono focus:border-amber-400 focus:outline-none"
                  placeholder="0"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  * أدخل الرصيد الافتتاحي اليدوي للحساب في بداية الفترة، وسيتم حساب الرصيد الفعلي تلقائيًا بناءً على القيود.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isHeader"
                  checked={editingAccount.isHeader || false}
                  onChange={(e) => setEditingAccount({ ...editingAccount, isHeader: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700"
                />
                <label htmlFor="isHeader" className="text-slate-300">
                  حساب رئيسي (تندرج تحته حسابات فرعية ولا يقبل قيود مباشرة)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
                >
                  حفظ الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmAccount}
        message={`هل أنت تأكد من حذف الحساب (${deleteConfirmAccount?.name}) وجميع الحسابات الفرعية التابعة له نهائياً؟`}
        onConfirm={() => {
          if (deleteConfirmAccount) {
            onDeleteAccount(deleteConfirmAccount.id);
            setDeleteConfirmAccount(null);
          }
        }}
        onCancel={() => setDeleteConfirmAccount(null)}
      />

    </div>
  );
};
