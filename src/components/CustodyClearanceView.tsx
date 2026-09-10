import React, { useState, useMemo } from "react";
import {
  ClipboardCheck,
  Plus,
  Printer,
  Search,
  Trash2,
  Edit2,
  ArrowDownLeft,
  ArrowUpRight,
  UserCheck,
  Building2,
  Receipt,
  RotateCcw,
  Sparkles,
  Download,
  Coins,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  PlusCircle,
  X,
  Calendar,
  DollarSign,
  Tag,
  Wallet,
} from "lucide-react";
import {
  CustodyClearanceRecord,
  CustodyClearanceInvoiceItem,
  CostCenter,
  CompanySettings,
  FilterParams,
  Account,
  Employee,
  Custody,
} from "../types";
import { exportToExcel, printReport } from "../utils/export";
import { numberToArabicWords } from "../utils/numberToArabicWords";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface CustodyClearanceViewProps {
  records: CustodyClearanceRecord[];
  costCenters: CostCenter[];
  accounts: Account[];
  employees: Employee[];
  custodies?: Custody[];
  companySettings: CompanySettings;
  filterParams: FilterParams;
  onAddRecord: (record: Omit<CustodyClearanceRecord, "id" | "createdAt">) => void;
  onUpdateRecord: (id: string, record: Partial<CustodyClearanceRecord>) => void;
  onDeleteRecord: (id: string) => void;
  onSyncFromCustodies?: () => void;
}

const COMMON_EXPENSE_CATEGORIES = [
  "مواد بناء ومؤن",
  "أجور عمالة ويوميات",
  "نقل وتشوين ومواصلات",
  "محروقات وسولار وبنزين",
  "صيانة وتشغيل معدات",
  "أدوات ومستلزمات مكتبية",
  "ضيافة وبوفيه وإعاشة",
  "رسوم وتراخيص حكومية",
  "مصروفات طارئة ونثريات",
];

export const CustodyClearanceView: React.FC<CustodyClearanceViewProps> = ({
  records,
  costCenters,
  accounts,
  employees,
  custodies = [],
  companySettings,
  filterParams,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  onSyncFromCustodies,
}) => {
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CustodyClearanceRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [expandedRecordIds, setExpandedRecordIds] = useState<Set<string>>(new Set());

  // Filters & display preferences
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<string>("ALL");
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "HAS_BALANCE" | "SETTLED">("ALL");
  const [balanceMode, setBalanceMode] = useState<"RUNNING" | "ROW">("RUNNING");

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    beneficiaryName: "",
    statement: "",
    entryType: "CREDIT" as "DEBIT" | "CREDIT" | "REFUND" | "CUSTOM",
    amount: "",
    debitAmount: "",
    creditAmount: "",
    costCenterId: "",
    documentRef: "",
    category: "تقديم فواتير ومصروفات",
    expenseAccountId: "",
    notes: "",
  });

  // Detailed Invoice Line Items for Form
  const [invoiceItems, setInvoiceItems] = useState<CustodyClearanceInvoiceItem[]>([]);
  const [showInvoiceDetailsSection, setShowInvoiceDetailsSection] = useState(true);

  // Toggle record item expansion in table
  const toggleRecordExpansion = (id: string) => {
    setExpandedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Expand / collapse all items
  const toggleAllExpansions = () => {
    if (expandedRecordIds.size > 0) {
      setExpandedRecordIds(new Set());
    } else {
      const allWithItems = records.filter((r) => r.items && r.items.length > 0).map((r) => r.id);
      setExpandedRecordIds(new Set(allWithItems));
    }
  };

  // Unique list of beneficiaries
  const uniqueBeneficiaries = useMemo(() => {
    const names = new Set<string>();
    records.forEach((r) => {
      if (r.beneficiaryName) names.add(r.beneficiaryName.trim());
    });
    return Array.from(names);
  }, [records]);

  // Calculate Cumulative Running Balance per Beneficiary (sorted chronologically)
  const sortedRecordsWithBalance = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return (a.createdAt || "").localeCompare(b.createdAt || "");
    });

    const runningBalances: { [key: string]: number } = {};

    return sorted.map((rec) => {
      const bKey = rec.beneficiaryName.trim();
      const prevBal = runningBalances[bKey] || 0;
      const currentBal = prevBal + (rec.debit || 0) - (rec.credit || 0);
      runningBalances[bKey] = currentBal;

      return {
        ...rec,
        runningBalance: currentBal,
        rowBalance: (rec.debit || 0) - (rec.credit || 0),
      };
    });
  }, [records]);

  // Beneficiary Stats Summary Map
  const beneficiaryStats = useMemo(() => {
    const stats: {
      [key: string]: { totalDebit: number; totalCredit: number; balance: number; count: number };
    } = {};

    sortedRecordsWithBalance.forEach((r) => {
      const name = r.beneficiaryName.trim();
      if (!stats[name]) {
        stats[name] = { totalDebit: 0, totalCredit: 0, balance: 0, count: 0 };
      }
      stats[name].totalDebit += r.debit || 0;
      stats[name].totalCredit += r.credit || 0;
      stats[name].balance = stats[name].totalDebit - stats[name].totalCredit;
      stats[name].count += 1;
    });

    return stats;
  }, [sortedRecordsWithBalance]);

  // Filtered Records with Deep Search across invoice items
  const filteredRecords = useMemo(() => {
    return sortedRecordsWithBalance.filter((rec) => {
      // Search term (searches main statement, beneficiary, document ref, notes, and individual invoice items)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesMain =
          rec.statement.toLowerCase().includes(query) ||
          rec.beneficiaryName.toLowerCase().includes(query) ||
          (rec.documentRef && rec.documentRef.toLowerCase().includes(query)) ||
          (rec.notes && rec.notes.toLowerCase().includes(query)) ||
          (rec.category && rec.category.toLowerCase().includes(query));

        const matchesItem = rec.items?.some(
          (item) =>
            item.statement.toLowerCase().includes(query) ||
            (item.invoiceNo && item.invoiceNo.toLowerCase().includes(query)) ||
            (item.category && item.category.toLowerCase().includes(query)) ||
            (item.notes && item.notes.toLowerCase().includes(query))
        );

        const recAcc = accounts.find((a) => a.id === rec.expenseAccountId || a.code === rec.expenseAccountId);
        const matchesAccount = recAcc
          ? recAcc.nameAr.toLowerCase().includes(query) ||
            recAcc.code.toLowerCase().includes(query) ||
            (recAcc.nameEn && recAcc.nameEn.toLowerCase().includes(query))
          : false;

        if (!matchesMain && !matchesItem && !matchesAccount) return false;
      }

      // Beneficiary filter
      if (selectedBeneficiary !== "ALL" && rec.beneficiaryName.trim() !== selectedBeneficiary) {
        return false;
      }

      // Cost Center filter
      if (selectedCostCenter !== "ALL") {
        const matchesDirectCC = rec.costCenterId === selectedCostCenter;
        const matchesItemCC = rec.items?.some((item) => item.costCenterId === selectedCostCenter);
        if (!matchesDirectCC && !matchesItemCC) return false;
      }

      // Date Range filter
      if (startDate && rec.date < startDate) return false;
      if (endDate && rec.date > endDate) return false;

      // Status filter
      if (statusFilter === "HAS_BALANCE") {
        const pStat = beneficiaryStats[rec.beneficiaryName.trim()];
        if (!pStat || pStat.balance <= 0) return false;
      } else if (statusFilter === "SETTLED") {
        const pStat = beneficiaryStats[rec.beneficiaryName.trim()];
        if (!pStat || pStat.balance > 0) return false;
      }

      return true;
    });
  }, [
    sortedRecordsWithBalance,
    searchTerm,
    selectedBeneficiary,
    selectedCostCenter,
    startDate,
    endDate,
    statusFilter,
    beneficiaryStats,
  ]);

  // Aggregate Totals
  const totals = useMemo(() => {
    const totalDebit = filteredRecords.reduce((sum, r) => sum + (r.debit || 0), 0);
    const totalCredit = filteredRecords.reduce((sum, r) => sum + (r.credit || 0), 0);
    const netBalance = totalDebit - totalCredit;
    const settlementRate = totalDebit > 0 ? (totalCredit / totalDebit) * 100 : 100;
    const totalInvoicesCount = filteredRecords.reduce((sum, r) => sum + (r.items?.length || 0), 0);

    return {
      totalDebit,
      totalCredit,
      netBalance,
      settlementRate,
      count: filteredRecords.length,
      totalInvoicesCount,
    };
  }, [filteredRecords]);

  // Invoice Items total sum in modal
  const invoiceItemsTotalSum = useMemo(() => {
    return invoiceItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [invoiceItems]);

  // Open Create Modal
  const handleOpenCreateModal = (initialName?: string, defaultType: "DEBIT" | "CREDIT" = "CREDIT") => {
    setEditingRecord(null);
    const today = new Date().toISOString().split("T")[0];
    const initialBeneficiary = initialName || (uniqueBeneficiaries[0] || "");
    const initialCostCenter = costCenters[0]?.id || "";

    setFormData({
      date: today,
      beneficiaryName: initialBeneficiary,
      statement: defaultType === "CREDIT" ? "تقديم فواتير ومصروفات تسوية عهدة" : "صرف دفعة عهدة نقدية",
      entryType: defaultType,
      amount: "",
      debitAmount: "",
      creditAmount: "",
      costCenterId: initialCostCenter,
      documentRef: `فاتورة-${Math.floor(100 + Math.random() * 900)}`,
      category: defaultType === "CREDIT" ? "تقديم فواتير ومصروفات" : "استلام عهدة",
      expenseAccountId: accounts.find((a) => a.code === "5160")?.id || "",
      notes: "",
    });

    if (defaultType === "CREDIT") {
      setInvoiceItems([
        {
          id: `INV-${Date.now()}-1`,
          date: today,
          invoiceNo: `فاتورة-${Math.floor(100 + Math.random() * 900)}`,
          statement: "",
          amount: 0,
          category: "مواد بناء ومؤن",
          costCenterId: initialCostCenter,
        },
      ]);
    } else {
      setInvoiceItems([]);
    }

    setShowInvoiceDetailsSection(true);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (rec: CustodyClearanceRecord) => {
    setEditingRecord(rec);
    let eType: "DEBIT" | "CREDIT" | "REFUND" | "CUSTOM" = "CUSTOM";
    let amt = "";
    if (rec.debit > 0 && rec.credit === 0) {
      eType = "DEBIT";
      amt = rec.debit.toString();
    } else if (rec.credit > 0 && rec.debit === 0) {
      eType = rec.category?.includes("رد") ? "REFUND" : "CREDIT";
      amt = rec.credit.toString();
    } else {
      eType = "CUSTOM";
    }

    setFormData({
      date: rec.date,
      beneficiaryName: rec.beneficiaryName,
      statement: rec.statement,
      entryType: eType,
      amount: amt,
      debitAmount: rec.debit > 0 ? rec.debit.toString() : "",
      creditAmount: rec.credit > 0 ? rec.credit.toString() : "",
      costCenterId: rec.costCenterId || "",
      documentRef: rec.documentRef || "",
      category: rec.category || "تقديم فواتير ومصروفات",
      expenseAccountId: rec.expenseAccountId || "",
      notes: rec.notes || "",
    });

    if (rec.items && rec.items.length > 0) {
      setInvoiceItems(rec.items.map((it) => ({ ...it })));
      setShowInvoiceDetailsSection(true);
    } else {
      setInvoiceItems([]);
      setShowInvoiceDetailsSection(eType === "CREDIT");
    }

    setShowModal(true);
  };

  // Add Invoice Line Item
  const handleAddInvoiceItem = () => {
    const newItem: CustodyClearanceInvoiceItem = {
      id: `INV-${Date.now()}-${invoiceItems.length + 1}`,
      date: formData.date,
      invoiceNo: `فاتورة-${Math.floor(100 + Math.random() * 900)}`,
      statement: "",
      amount: 0,
      category: "مواد بناء ومؤن",
      costCenterId: formData.costCenterId || costCenters[0]?.id || "",
    };
    const nextItems = [...invoiceItems, newItem];
    setInvoiceItems(nextItems);

    // If in credit mode and amount is calculated from items
    const newSum = nextItems.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    if (newSum > 0) {
      setFormData((prev) => ({ ...prev, amount: newSum.toString() }));
    }
  };

  // Update Invoice Line Item
  const handleUpdateInvoiceItem = (
    index: number,
    field: keyof CustodyClearanceInvoiceItem,
    value: any
  ) => {
    setInvoiceItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };

      // Update total form amount if editing amount
      if (field === "amount") {
        const nextSum = next.reduce((s, it) => s + (Number(it.amount) || 0), 0);
        if (nextSum > 0) {
          setFormData((f) => ({
            ...f,
            amount: nextSum.toString(),
            creditAmount: f.entryType === "CUSTOM" ? nextSum.toString() : f.creditAmount,
          }));
        }
      }

      return next;
    });
  };

  // Remove Invoice Line Item
  const handleRemoveInvoiceItem = (index: number) => {
    setInvoiceItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const nextSum = next.reduce((s, it) => s + (Number(it.amount) || 0), 0);
      if (next.length > 0 && nextSum > 0) {
        setFormData((f) => ({ ...f, amount: nextSum.toString() }));
      }
      return next;
    });
  };

  // Auto-generate statement text from invoice items
  const handleGenerateStatementFromInvoices = () => {
    if (invoiceItems.length === 0) return;
    const statementsList = invoiceItems
      .map((it) => it.statement.trim())
      .filter(Boolean);

    if (statementsList.length > 0) {
      const countText = invoiceItems.length === 1 ? "فاتورة" : `${invoiceItems.length} فواتير`;
      const generated = `تقديم ${countText} تصفية عهدة: ${statementsList.join("، ")}`;
      setFormData((prev) => ({ ...prev, statement: generated }));
    }
  };

  // Save Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.beneficiaryName.trim()) {
      alert("يرجى إدخال أو تحديد اسم المصرف له / صاحب العهدة");
      return;
    }

    // Filter valid invoice items
    const validInvoiceItems = invoiceItems
      .filter((it) => it.statement.trim() || Number(it.amount) > 0)
      .map((it) => ({
        ...it,
        amount: Number(it.amount) || 0,
        statement: it.statement.trim() || "مصروف بالفاتورة",
      }));

    let calculatedDebit = 0;
    let calculatedCredit = 0;

    // Use invoice items sum if available and greater than 0
    const itemsTotal = validInvoiceItems.reduce((s, it) => s + (Number(it.amount) || 0), 0);

    if (formData.entryType === "DEBIT") {
      calculatedDebit = parseFloat(formData.amount) || 0;
      calculatedCredit = 0;
    } else if (formData.entryType === "CREDIT" || formData.entryType === "REFUND") {
      calculatedCredit = (validInvoiceItems.length > 0 && itemsTotal > 0) ? itemsTotal : (parseFloat(formData.amount) || 0);
      calculatedDebit = 0;
    } else {
      calculatedDebit = parseFloat(formData.debitAmount) || 0;
      calculatedCredit = (validInvoiceItems.length > 0 && itemsTotal > 0) ? itemsTotal : (parseFloat(formData.creditAmount) || 0);
    }

    if (calculatedDebit === 0 && calculatedCredit === 0) {
      alert("يرجى إدخال قيمة صحيحة للمدين أو الدائن أو إدخال مبالغ الفواتير التفصيلية");
      return;
    }

    // Auto-fill statement if empty
    let finalStatement = formData.statement.trim();
    if (!finalStatement && validInvoiceItems.length > 0) {
      const itemsList = validInvoiceItems.map((it) => it.statement).join("، ");
      finalStatement = `تقديم ${validInvoiceItems.length} فواتير تصفية: ${itemsList}`;
    } else if (!finalStatement) {
      finalStatement = formData.entryType === "DEBIT" ? "صرف عهدة نقدية" : "تقديم فواتير ومصروفات";
    }

    const payload = {
      date: formData.date,
      beneficiaryName: formData.beneficiaryName.trim(),
      statement: finalStatement,
      debit: calculatedDebit,
      credit: calculatedCredit,
      costCenterId: formData.costCenterId || undefined,
      documentRef: formData.documentRef.trim() || (validInvoiceItems[0]?.invoiceNo || undefined),
      category: formData.category.trim() || undefined,
      expenseAccountId: formData.expenseAccountId || undefined,
      notes: formData.notes.trim() || undefined,
      items: validInvoiceItems.length > 0 ? validInvoiceItems : undefined,
    };

    if (editingRecord) {
      onUpdateRecord(editingRecord.id, payload);
    } else {
      onAddRecord(payload);
    }

    setShowModal(false);
  };

  // Export to Excel with Itemized line-by-line breakdown
  const handleExportExcel = () => {
    interface ExcelRow {
      "م": number;
      "التاريخ": string;
      "اسم المصرف له": string;
      "الحركة": "صرف عهدة" | "تصفية";
      "البيان": string;
      "رقم السند": string;
      "مدين (صرف عهدة)": number;
      "دائن (قيمة المصروف)": number;
      "الباقي": number;
      "المشروع / مركز التكلفة": string;
      "ملاحظات": string;
    }

    const excelRows: ExcelRow[] = [];
    const runningBalances: { [key: string]: number } = {};
    let counter = 1;

    filteredRecords.forEach((r) => {
      const bKey = r.beneficiaryName.trim();
      if (runningBalances[bKey] === undefined) {
        runningBalances[bKey] = 0;
      }
      const cc = costCenters.find((c) => c.id === r.costCenterId);

      // Case 1: Custody disbursement (صرف عهدة)
      if (r.debit > 0) {
        runningBalances[bKey] += r.debit;
        excelRows.push({
          "م": counter++,
          "التاريخ": r.date,
          "اسم المصرف له": r.beneficiaryName,
          "الحركة": "صرف عهدة",
          "البيان": r.statement || "صرف دفعة عهدة نقدية",
          "رقم السند": r.documentRef || "-",
          "مدين (صرف عهدة)": r.debit,
          "دائن (قيمة المصروف)": 0,
          "الباقي": runningBalances[bKey],
          "المشروع / مركز التكلفة": cc ? cc.name : "-",
          "ملاحظات": r.notes || "-",
        });
      }

      // Case 2: Clearance with invoice line items (تصفية - تقديم فواتير ومصروفات مفصلة)
      if (r.items && r.items.length > 0) {
        r.items.forEach((item) => {
          const itemCC = costCenters.find((c) => c.id === item.costCenterId) || cc;
          const itemAmount = Number(item.amount) || 0;
          runningBalances[bKey] -= itemAmount;

          excelRows.push({
            "م": counter++,
            "التاريخ": item.date || r.date,
            "اسم المصرف له": r.beneficiaryName,
            "الحركة": "تصفية",
            "البيان": item.statement || r.statement || "مصروف بالفاتورة",
            "رقم السند": item.invoiceNo || r.documentRef || "-",
            "مدين (صرف عهدة)": 0,
            "دائن (قيمة المصروف)": itemAmount,
            "الباقي": runningBalances[bKey],
            "المشروع / مركز التكلفة": itemCC ? itemCC.name : "-",
            "ملاحظات": item.notes || r.notes || "-",
          });
        });
      } else if (r.credit > 0) {
        // Case 3: Credit without sub-items (سداد / رد عهدة)
        runningBalances[bKey] -= r.credit;
        excelRows.push({
          "م": counter++,
          "التاريخ": r.date,
          "اسم المصرف له": r.beneficiaryName,
          "الحركة": "تصفية",
          "البيان": r.statement,
          "رقم السند": r.documentRef || "-",
          "مدين (صرف عهدة)": 0,
          "دائن (قيمة المصروف)": r.credit,
          "الباقي": runningBalances[bKey],
          "المشروع / مركز التكلفة": cc ? cc.name : "-",
          "ملاحظات": r.notes || "-",
        });
      }
    });

    const filePrefix = selectedBeneficiary !== "ALL"
      ? `كشف_عهدة_${selectedBeneficiary}`
      : "شيت_تصفية_العهد_المفصل";

    exportToExcel(excelRows, `${filePrefix}_${companySettings.companyName}`, "تصفية العهد");
  };

  // Print Custody Clearance Sheet with itemized rows
  // الأعمدة: م - التاريخ - اسم المصرف له - الحركة (صرف عهدة / تصفية) - البيان - رقم السند - مدين (صرف عهدة) - دائن (قيمة المصروف) - الباقي
  const handlePrintSheet = (targetBeneficiary?: string) => {
    const activeBeneficiary = targetBeneficiary || (selectedBeneficiary !== "ALL" ? selectedBeneficiary : undefined);
    const filterTitle = activeBeneficiary
      ? `كشف حساب وتصفية عهدة الموظف: ${activeBeneficiary}`
      : "شيت كشف وتصفية العهد المالية وتفاصيل البنود والفواتير";

    // Filter relevant records sorted chronologically
    const baseRecords = activeBeneficiary
      ? sortedRecordsWithBalance.filter((r) => r.beneficiaryName.trim() === activeBeneficiary.trim())
      : filteredRecords;

    // Flatten all records and invoice items into individual rows
    interface FlatPrintRow {
      idx: number;
      date: string;
      beneficiaryName: string;
      movementType: "صرف عهدة" | "تصفية";
      statement: string;
      docRef: string;
      entryType: "DEBIT" | "CREDIT";
      debit: number;
      credit: number;
      balance: number;
      costCenterName: string;
      categoryName: string;
      notes: string;
    }

    const flatRows: FlatPrintRow[] = [];
    const runningBalances: { [key: string]: number } = {};
    let printCounter = 1;

    baseRecords.forEach((r) => {
      const bKey = r.beneficiaryName.trim();
      if (runningBalances[bKey] === undefined) {
        runningBalances[bKey] = 0;
      }
      const cc = costCenters.find((c) => c.id === r.costCenterId);

      // Case 1: Custody Disbursement (صرف عهدة نقدية)
      if (r.debit > 0) {
        runningBalances[bKey] += r.debit;
        flatRows.push({
          idx: printCounter++,
          date: r.date,
          beneficiaryName: r.beneficiaryName,
          movementType: "صرف عهدة",
          statement: r.statement || "صرف دفعة عهدة نقدية",
          docRef: r.documentRef || "-",
          entryType: "DEBIT",
          debit: r.debit,
          credit: 0,
          balance: runningBalances[bKey],
          costCenterName: cc ? cc.name : "-",
          categoryName: r.category || "صرف عهدة",
          notes: r.notes || "",
        });
      }

      // Case 2: Invoice submission with individual line items (تصفية عهدة - تقديم فواتير ومصروفات مفصلة)
      if (r.items && r.items.length > 0) {
        r.items.forEach((item) => {
          const itemCC = costCenters.find((c) => c.id === item.costCenterId) || cc;
          const itemAmount = Number(item.amount) || 0;
          runningBalances[bKey] -= itemAmount;

          flatRows.push({
            idx: printCounter++,
            date: item.date || r.date,
            beneficiaryName: r.beneficiaryName,
            movementType: "تصفية",
            statement: item.statement || r.statement || "مصروف بالفاتورة",
            docRef: item.invoiceNo || r.documentRef || "-",
            entryType: "CREDIT",
            debit: 0,
            credit: itemAmount,
            balance: runningBalances[bKey],
            costCenterName: itemCC ? itemCC.name : "-",
            categoryName: item.category || r.category || "فواتير ومصروفات",
            notes: item.notes || r.notes || "",
          });
        });
      } else if (r.credit > 0) {
        // Case 3: Credit without sub-items (سداد / رد نقدية)
        runningBalances[bKey] -= r.credit;
        flatRows.push({
          idx: printCounter++,
          date: r.date,
          beneficiaryName: r.beneficiaryName,
          movementType: "تصفية",
          statement: r.statement || "تسوية وتصفية عهدة",
          docRef: r.documentRef || "-",
          entryType: "CREDIT",
          debit: 0,
          credit: r.credit,
          balance: runningBalances[bKey],
          costCenterName: cc ? cc.name : "-",
          categoryName: r.category || "تسوية عهدة",
          notes: r.notes || "",
        });
      }
    });

    // Totals for the print table
    const printTotalDebit = flatRows.reduce((sum, r) => sum + r.debit, 0);
    const printTotalCredit = flatRows.reduce((sum, r) => sum + r.credit, 0);
    const printNetBalance = printTotalDebit - printTotalCredit;
    const totalClearanceInPrint = flatRows.filter((r) => r.movementType === "تصفية").length;

    const rowsHtml = flatRows
      .map((r) => {
        const balanceColor = r.balance > 0 ? "#b45309" : r.balance === 0 ? "#16a34a" : "#dc2626";
        const isDisbursement = r.movementType === "صرف عهدة";

        const movementBadge = isDisbursement
          ? `<span style="display: inline-block; padding: 2px 7px; border-radius: 4px; background: #ecfdf5; color: #047857; font-size: 10.5px; font-weight: 700; border: 1px solid #a7f3d0;">صرف عهدة</span>`
          : `<span style="display: inline-block; padding: 2px 7px; border-radius: 4px; background: #fffbeb; color: #b45309; font-size: 10.5px; font-weight: 700; border: 1px solid #fde68a;">تصفية</span>`;

        return `
          <tr>
            <td style="text-align: center; font-weight: bold; font-size: 11px; background: #fafafa;">${r.idx}</td>
            <td style="text-align: center; font-family: monospace; white-space: nowrap; font-size: 11px;">${r.date}</td>
            <td style="font-weight: 700; color: #1e3a8a; font-size: 11px;">${r.beneficiaryName}</td>
            <td style="text-align: center; white-space: nowrap;">${movementBadge}</td>
            <td style="font-weight: 500; color: #1e293b; font-size: 11px; line-height: 1.4;">
              ${r.statement}
            </td>
            <td style="text-align: center; font-family: monospace; font-size: 11px; color: #475569; font-weight: 600; white-space: nowrap; background: #f8fafc;">
              ${r.docRef !== "-" ? `<strong>${r.docRef}</strong>` : "-"}
            </td>
            <td style="text-align: left; font-weight: bold; color: #047857; dir: ltr; white-space: nowrap; font-size: 11px; ${r.debit > 0 ? "background: #f0fdf4;" : ""}">
              ${r.debit > 0 ? `${r.debit.toLocaleString()} ${companySettings.currency}` : "-"}
            </td>
            <td style="text-align: left; font-weight: bold; color: #b45309; dir: ltr; white-space: nowrap; font-size: 11px; ${r.credit > 0 ? "background: #fffbeb;" : ""}">
              ${r.credit > 0 ? `${r.credit.toLocaleString()} ${companySettings.currency}` : "-"}
            </td>
            <td style="text-align: left; font-weight: 800; color: ${balanceColor}; dir: ltr; white-space: nowrap; background: #f8fafc; font-size: 11px;">
              ${r.balance.toLocaleString()} ${companySettings.currency}
            </td>
            <td style="font-size: 10px; color: #475569; text-align: center;">${r.costCenterName}</td>
            <td style="font-size: 10px; color: #64748b;">${r.notes || "-"}</td>
          </tr>
        `;
      })
      .join("");

    const reportHtml = `
      <div style="margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 12px 18px; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 16px;">
          <div>
            <div style="font-size: 14px; font-weight: 800; color: #1e293b;">
              ${activeBeneficiary ? `كشف حساب وتصفية عهدة الموظف: <span style="color: #1e3a8a;">${activeBeneficiary}</span>` : "كشف وتصفية العهد المالية الشامل"}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
              الفترة: ${startDate || "بداية النشاط"} إلى ${endDate || "تاريخه"} | إجمالي البنود: <strong>${flatRows.length} حركة وبند</strong> (${totalClearanceInPrint} بند تصفية ومصروف)
            </div>
          </div>
          <div style="display: flex; gap: 20px; font-size: 12px;">
            <div style="background: #ffffff; padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <span style="color: #64748b; font-size: 10px; display: block;">إجمالي المدين (العهد المنصرفة)</span>
              <strong style="color: #047857; dir: ltr; font-size: 13px;">${printTotalDebit.toLocaleString()} ${companySettings.currency}</strong>
            </div>
            <div style="background: #ffffff; padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <span style="color: #64748b; font-size: 10px; display: block;">إجمالي الدائن (المصروفات والفواتير)</span>
              <strong style="color: #b45309; dir: ltr; font-size: 13px;">${printTotalCredit.toLocaleString()} ${companySettings.currency}</strong>
            </div>
            <div style="background: #ffffff; padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <span style="color: #64748b; font-size: 10px; display: block;">صافي الباقي (المتبقي طرف العهدة)</span>
              <strong style="color: ${printNetBalance > 0 ? "#b45309" : "#16a34a"}; dir: ltr; font-size: 14px;">${printNetBalance.toLocaleString()} ${companySettings.currency}</strong>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 28px; text-align: center;">م</th>
              <th style="width: 75px; text-align: center;">التاريخ</th>
              <th style="width: 125px; text-align: right;">اسم المصرف له</th>
              <th style="width: 75px; text-align: center;">الحركة</th>
              <th style="text-align: right;">البيان</th>
              <th style="width: 85px; text-align: center;">رقم السند</th>
              <th style="width: 90px; text-align: center;">مدين (صرف عهدة)</th>
              <th style="width: 90px; text-align: center;">دائن (قيمة المصروف)</th>
              <th style="width: 95px; text-align: center;">الباقي</th>
              <th style="width: 95px; text-align: center;">المشروع / المركز</th>
              <th style="width: 80px; text-align: right;">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="11" style="text-align: center; padding: 20px; color: #94a3b8;">لا توجد حركات مسجلة</td></tr>`}
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: bold; font-size: 12px;">
              <td colspan="6" style="text-align: right; padding: 10px;">
                إجمالي الكشف (${flatRows.length} حركة وبند مسجل):
              </td>
              <td style="text-align: left; color: #047857; dir: ltr; padding: 10px; font-weight: 800;">
                ${printTotalDebit.toLocaleString()} ${companySettings.currency}
              </td>
              <td style="text-align: left; color: #b45309; dir: ltr; padding: 10px; font-weight: 800;">
                ${printTotalCredit.toLocaleString()} ${companySettings.currency}
              </td>
              <td style="text-align: left; color: #1e3a8a; dir: ltr; padding: 10px; font-weight: 900; background: #e2e8f0;">
                ${printNetBalance.toLocaleString()} ${companySettings.currency}
              </td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 14px; padding: 10px 14px; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>فقط وقدره صافي متبقي طرف العهدة: </strong>
            <span style="color: #1e3a8a; font-weight: bold;">${numberToArabicWords(printNetBalance)} ${companySettings.currency} لا غير.</span>
          </div>
          <div style="font-size: 11px; color: #64748b;">
            حالة الحساب: <strong>${printNetBalance === 0 ? "العهدة مسواة بالكامل (خالصة)" : printNetBalance > 0 ? "يوجد متبقي مستحق على الموظف" : "يوجد مستحق للموظف طرف الشركة"}</strong>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 36px; padding-top: 16px; border-top: 1px dashed #cbd5e1; text-align: center; font-size: 12px;">
          <div>
            <p style="font-weight: bold; color: #475569; margin-bottom: 30px;">توقيع صاحب العهدة</p>
            <p style="color: #94a3b8;">..................................</p>
          </div>
          <div>
            <p style="font-weight: bold; color: #475569; margin-bottom: 30px;">المحاسب المختص</p>
            <p style="color: #94a3b8;">..................................</p>
          </div>
          <div>
            <p style="font-weight: bold; color: #475569; margin-bottom: 30px;">المراجع المالي</p>
            <p style="color: #94a3b8;">..................................</p>
          </div>
          <div>
            <p style="font-weight: bold; color: #475569; margin-bottom: 30px;">اعتماد المدير المالي</p>
            <p style="color: #94a3b8;">..................................</p>
          </div>
        </div>
      </div>
    `;

    printReport(filterTitle, reportHtml, companySettings);
  };

  // Print Single Settlement Voucher with Dedicated Invoices Table
  const handlePrintVoucher = (rec: CustodyClearanceRecord) => {
    const cc = costCenters.find((c) => c.id === rec.costCenterId);
    const amountVal = rec.debit > 0 ? rec.debit : rec.credit;
    const isDebit = rec.debit > 0;

    const invoicesTableHtml = rec.items && rec.items.length > 0
      ? `
        <div style="margin-top: 18px; margin-bottom: 18px;">
          <h4 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 13px; border-bottom: 2px solid #cbd5e1; padding-bottom: 4px; display: flex; justify-content: space-between;">
            <span>📋 تفاصيل وبنود الفواتير والمستندات المقدمة للتصفية (${rec.items.length} فواتير):</span>
            <span>إجمالي الفواتير: ${amountVal.toLocaleString()} ${companySettings.currency}</span>
          </h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 6px; border: 1px solid #cbd5e1; width: 30px; text-align: center;">م</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1; width: 80px; text-align: center;">التاريخ</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1; width: 95px; text-align: center;">رقم الفاتورة</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">البيان والتفاصيل للبند</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1; width: 90px; text-align: center;">التصنيف</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1; width: 90px; text-align: center;">مركز التكلفة</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1; width: 95px; text-align: center;">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              ${rec.items.map((item, idx) => {
                const itemCC = costCenters.find((c) => c.id === item.costCenterId);
                return `
                  <tr>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${idx + 1}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace;">${item.date || rec.date}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-weight: bold; color: #1e3a8a;">${item.invoiceNo || "-"}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: 600; color: #0f172a;">${item.statement}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 10px; color: #475569;">${item.category || "-"}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 10px;">${itemCC ? itemCC.name : (cc ? cc.name : "-")}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: left; font-weight: bold; color: #b45309; dir: ltr; background: #fffbeb;">
                      ${item.amount.toLocaleString()} ${companySettings.currency}
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc; font-weight: bold;">
                <td colspan="6" style="padding: 6px 8px; text-align: right; border: 1px solid #cbd5e1;">إجمالي مبالغ الفواتير المرفقة:</td>
                <td style="padding: 6px 8px; text-align: left; border: 1px solid #cbd5e1; color: #b45309; dir: ltr; font-size: 12px; font-weight: 800;">
                  ${amountVal.toLocaleString()} ${companySettings.currency}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      `
      : "";

    const voucherHtml = `
      <div style="border: 2px solid #1e3a8a; border-radius: 10px; padding: 20px; margin: 10px 0; background: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px;">
          <div>
            <h2 style="margin: 0; color: #1e3a8a; font-size: 20px;">
              ${isDebit ? "سند صرف واستلام عهدة مالية" : "سند تصفية وتسوية عهدة مالية معتمد"}
            </h2>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">رقم السند: <strong>${rec.documentRef || rec.id}</strong></div>
          </div>
          <div style="text-align: left; font-family: monospace; font-size: 13px;">
            <div>التاريخ: <strong>${rec.date}</strong></div>
            <div style="margin-top: 4px; color: #475569;">نوع الحركة: ${isDebit ? "صرف عهدة (مدين)" : "تقديم فواتير وتصفية (دائن)"}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 16px; font-size: 13px;">
          <div style="background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-size: 11px;">اسم المصرف له / صاحب العهدة:</span>
            <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px;">${rec.beneficiaryName}</div>
          </div>
          <div style="background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-size: 11px;">المشروع / مركز التكلفة:</span>
            <div style="font-size: 14px; font-weight: 700; color: #1e3a8a; margin-top: 2px;">${cc ? cc.name : "المركز الرئيسي"}</div>
          </div>
        </div>

        <div style="background: #f1f5f9; padding: 12px 14px; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 14px;">
          <div style="font-size: 11px; color: #475569; margin-bottom: 3px;">البيان العام للحركة والتسوية:</div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.5;">${rec.statement}</div>
          ${rec.notes ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">ملاحظات: ${rec.notes}</div>` : ""}
        </div>

        ${invoicesTableHtml}

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <thead>
            <tr style="background: #e2e8f0;">
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">نوع الحركة / التصنيف</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">مدين (استلام عهدة)</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">دائن (مصروف مسوى)</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">المبلغ الإجمالي المحتسب</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">${rec.category || (isDebit ? "صرف عهدة" : "تقديم فواتير")}</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; font-weight: bold; color: #047857; dir: ltr;">
                ${rec.debit > 0 ? `${rec.debit.toLocaleString()} ${companySettings.currency}` : "-"}
              </td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; font-weight: bold; color: #b45309; dir: ltr;">
                ${rec.credit > 0 ? `${rec.credit.toLocaleString()} ${companySettings.currency}` : "-"}
              </td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; font-weight: 800; color: #1e3a8a; dir: ltr; font-size: 15px; background: #f8fafc;">
                ${amountVal.toLocaleString()} ${companySettings.currency}
              </td>
            </tr>
          </tbody>
        </table>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 24px; font-size: 13px;">
          <strong>المبلغ بالحروف: </strong>
          <span style="color: #1e3a8a; font-weight: bold;">${numberToArabicWords(amountVal)} ${companySettings.currency} فقط لا غير.</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center; font-size: 12px; margin-top: 28px; padding-top: 14px; border-top: 1px dashed #94a3b8;">
          <div>
            <p style="font-weight: bold; margin-bottom: 35px;">توقيع صاحب العهدة (المستلم/المسوي)</p>
            <p style="color: #94a3b8;">..................................</p>
          </div>
          <div>
            <p style="font-weight: bold; margin-bottom: 35px;">المحاسب المسؤول</p>
            <p style="color: #94a3b8;">..................................</p>
          </div>
          <div>
            <p style="font-weight: bold; margin-bottom: 35px;">اعتماد الإدارة المالية</p>
            <p style="color: #94a3b8;">..................................</p>
          </div>
        </div>
      </div>
    `;

    printReport(isDebit ? "سند استلام عهدة" : "سند تصفية عهدة وفواتير", voucherHtml, companySettings);
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      {/* Header & Main Controls */}
      <div className="bg-[#11141B] p-5 rounded-2xl border border-gray-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                شيت تصفية العهد
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {records.length} حركة ({totals.totalInvoicesCount} فاتورة مسواة)
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                متابعة وتصفية العهد المالية (التاريخ، اسم المصرف له، البيان والتفاصيل، مدين، الدائن، الباقي)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onSyncFromCustodies && (
            <button
              onClick={onSyncFromCustodies}
              title="مزامنة وتوليد الحركات من العهد المسجلة بالخزينة"
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-medium border border-gray-700 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              مزامنة العهد
            </button>
          )}

          <button
            onClick={toggleAllExpansions}
            title="عرض/طي تفاصيل الفواتير لكافة الحركات"
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-medium border border-gray-700 transition"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            {expandedRecordIds.size > 0 ? "طي الفواتير" : "توسيع الفواتير"}
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            تصدير Excel
          </button>

          <button
            onClick={() => handlePrintSheet()}
            title="طباعة كشف وتصفية العهد مع تفصيل كل بند وفاتورة في سطر مستقل وخانات مدين ودائن والباقي"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-semibold transition"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            {selectedBeneficiary !== "ALL" ? `طباعة كشف عهدة ${selectedBeneficiary}` : "طباعة الكشف المفصل"}
          </button>

          <button
            onClick={() => handleOpenCreateModal(undefined, "CREDIT")}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/20 transition"
          >
            <Receipt className="w-4 h-4" />
            تقديم فواتير وتصفية عهدة
          </button>

          <button
            onClick={() => handleOpenCreateModal(undefined, "DEBIT")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            صرف عهدة جديدة
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Debits */}
        <div className="bg-[#11141B] p-4 rounded-xl border border-gray-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">إجمالي العهد المنصرفة (مدين)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-emerald-400 dir-ltr text-right">
            {totals.totalDebit.toLocaleString()} {companySettings.currency}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">المبالغ المستلمة والمسلمة للموظفين</p>
        </div>

        {/* Total Credits */}
        <div className="bg-[#11141B] p-4 rounded-xl border border-gray-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">إجمالي المسدد والمصروف (دائن)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-amber-400 dir-ltr text-right">
            {totals.totalCredit.toLocaleString()} {companySettings.currency}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {totals.totalInvoicesCount} فواتير وبنود مسواة ومرفقة
          </p>
        </div>

        {/* Net Remaining Balance */}
        <div className="bg-[#11141B] p-4 rounded-xl border border-gray-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">صافي المتبقي طرف العهد (الباقي)</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                totals.netBalance > 0
                  ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                  : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              }`}
            >
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`mt-2 text-xl font-bold font-mono dir-ltr text-right ${
              totals.netBalance > 0 ? "text-blue-400" : "text-emerald-400"
            }`}
          >
            {totals.netBalance.toLocaleString()} {companySettings.currency}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {totals.netBalance === 0 ? "جميع العهد المعروضة مسواة بالكامل" : "مبالغ متبقية مستحقة التسوية أو الرد"}
          </p>
        </div>

        {/* Settlement Completion Rate */}
        <div className="bg-[#11141B] p-4 rounded-xl border border-gray-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">نسبة تصفية العهد</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-purple-400 dir-ltr text-right">
            {totals.settlementRate.toFixed(1)}%
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(totals.settlementRate, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Custodian Quick Filter Bar */}
      {uniqueBeneficiaries.length > 0 && (
        <div className="bg-[#11141B] p-3 rounded-xl border border-gray-800/80 flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <span className="text-[11px] font-bold text-gray-400 whitespace-nowrap flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            أصحاب العهد:
          </span>
          <button
            onClick={() => setSelectedBeneficiary("ALL")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition whitespace-nowrap ${
              selectedBeneficiary === "ALL"
                ? "bg-blue-600 text-white font-bold"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            الكل ({records.length})
          </button>
          {uniqueBeneficiaries.map((name) => {
            const st = beneficiaryStats[name] || { balance: 0, count: 0 };
            const isSelected = selectedBeneficiary === name;
            return (
              <div
                key={name}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition whitespace-nowrap border ${
                  isSelected
                    ? "bg-blue-600/20 text-blue-300 border-blue-500 font-bold"
                    : "bg-[#161B22] text-gray-300 border-gray-800 hover:bg-gray-800"
                }`}
              >
                <button
                  onClick={() => setSelectedBeneficiary(name)}
                  className="flex items-center gap-1.5 focus:outline-none"
                >
                  <span>{name}</span>
                  <span
                    className={`text-[10px] font-mono px-1 rounded ${
                      st.balance > 0
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {st.balance > 0 ? `باقي: ${st.balance.toLocaleString()}` : "مسواة"}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrintSheet(name);
                  }}
                  title={`طباعة كشف عهدة الموظف: ${name} (مفصل سطر بسطر لكل بند وفاتورة)`}
                  className="p-0.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/20 rounded transition mr-1"
                >
                  <Printer className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#11141B] p-4 rounded-xl border border-gray-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Search */}
        <div className="lg:col-span-2 relative">
          <Search className="w-4 h-4 absolute right-3 top-3 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالبيان، اسم المصرف له، تفاصيل الفاتورة، رقم الإيصال..."
            className="w-full bg-[#181D26] border border-gray-700/80 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Cost Center */}
        <div>
          <select
            value={selectedCostCenter}
            onChange={(e) => setSelectedCostCenter(e.target.value)}
            className="w-full bg-[#181D26] border border-gray-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">كافة المشاريع والمراكز</option>
            {costCenters.map((cc) => (
              <option key={cc.id} value={cc.id}>
                {cc.name}
              </option>
            ))}
          </select>
        </div>

        {/* From Date */}
        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="من تاريخ"
            className="w-full bg-[#181D26] border border-gray-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* To Date */}
        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="إلى تاريخ"
            className="w-full bg-[#181D26] border border-gray-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Balance View Mode */}
        <div className="flex items-center gap-1.5">
          <select
            value={balanceMode}
            onChange={(e) => setBalanceMode(e.target.value as any)}
            className="w-full bg-[#181D26] border border-gray-700/80 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            title="طريقة عرض عمود الباقي"
          >
            <option value="RUNNING">رصيد تراكمي للموظف</option>
            <option value="ROW">رصيد السطر المباشر</option>
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-[#11141B] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#161B24] border-b border-gray-800 text-gray-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 text-center w-12">م</th>
                <th className="px-3.5 py-3 text-center w-24">التاريخ</th>
                <th className="px-4 py-3 min-w-[160px]">اسم المصرف له</th>
                <th className="px-4 py-3 min-w-[320px]">البيان والتفاصيل (الفواتير المقدمة)</th>
                <th className="px-3 py-3 text-left w-32">مدين (العهدة)</th>
                <th className="px-3 py-3 text-left w-32">الدائن (المصروف)</th>
                <th className="px-3.5 py-3 text-left w-32 bg-gray-800/30">الباقي</th>
                <th className="px-3.5 py-3 min-w-[130px]">مركز التكلفة</th>
                <th className="px-3.5 py-3 min-w-[150px]">الحساب المقابل</th>
                <th className="px-3 py-3 text-center w-24">المستند</th>
                <th className="px-3 py-3 text-center w-28">إجراءات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-800/60 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                    <ClipboardCheck className="w-10 h-10 mx-auto text-gray-600 mb-2 opacity-50" />
                    <p className="text-sm font-semibold text-gray-400">لا توجد حركات تصفية عهد مطابقة</p>
                    <p className="text-xs text-gray-500 mt-1">
                      يمكنك تسجيل حركة جديدة أو تقديم فواتير بالضغط على الأزرار بالأعلى
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, idx) => {
                  const cc = costCenters.find((c) => c.id === rec.costCenterId);
                  const oppAccount = accounts.find(
                    (a) => a.id === rec.expenseAccountId || a.code === rec.expenseAccountId
                  );
                  const displayBalance = balanceMode === "RUNNING" ? rec.runningBalance : rec.rowBalance;
                  const hasItems = rec.items && rec.items.length > 0;
                  const isExpanded = expandedRecordIds.has(rec.id);

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-[#161B24]/70 transition group"
                    >
                      {/* # */}
                      <td className="px-3 py-3 text-center font-mono text-gray-500 font-bold">
                        {idx + 1}
                      </td>

                      {/* التاريخ */}
                      <td className="px-3.5 py-3 text-center font-mono text-gray-300 whitespace-nowrap">
                        <span className="bg-gray-800/60 px-1.5 py-0.5 rounded border border-gray-700/50">
                          {rec.date}
                        </span>
                      </td>

                      {/* اسم المصرف له */}
                      <td className="px-4 py-3 text-white">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                          <span className="font-bold text-blue-300">{rec.beneficiaryName}</span>
                        </div>
                      </td>

                      {/* البيان والتفاصيل */}
                      <td className="px-4 py-3 text-gray-200">
                        <div className="space-y-1.5">
                          <p className="font-medium text-xs leading-relaxed text-gray-100">{rec.statement}</p>
                          
                          {/* Invoice Line Items Summary / Accordion */}
                          {hasItems && (
                            <div className="mt-2 bg-[#12161F] p-2.5 rounded-xl border border-gray-800/90 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                                  <Receipt className="w-3.5 h-3.5 text-amber-400" />
                                  الفواتير المقدمة للتصفية ({rec.items?.length}):
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleRecordExpansion(rec.id)}
                                  className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded border border-gray-700 transition"
                                >
                                  {isExpanded ? (
                                    <>
                                      <span>إخفاء التفاصيل</span>
                                      <ChevronUp className="w-3 h-3" />
                                    </>
                                  ) : (
                                    <>
                                      <span>عرض {rec.items?.length} بنود</span>
                                      <ChevronDown className="w-3 h-3" />
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Render Invoice Items if expanded or single preview */}
                              {isExpanded ? (
                                <div className="space-y-1 pt-1 border-t border-gray-800/80">
                                  {rec.items?.map((item, iIdx) => {
                                    const itemCC = costCenters.find((c) => c.id === item.costCenterId);
                                    return (
                                      <div
                                        key={item.id || iIdx}
                                        className="flex items-center justify-between gap-2 bg-[#181D26] px-2.5 py-1.5 rounded-lg border border-gray-800 text-[11px]"
                                      >
                                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                                          <span className="text-gray-500 font-mono font-bold">#{iIdx + 1}</span>
                                          {item.invoiceNo && (
                                            <span className="font-mono bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 text-[10px]">
                                              {item.invoiceNo}
                                            </span>
                                          )}
                                          <span className="text-gray-200 font-medium truncate">{item.statement}</span>
                                          {item.category && (
                                            <span className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700">
                                              {item.category}
                                            </span>
                                          )}
                                          {itemCC && (
                                            <span className="text-[9px] bg-gray-800 text-blue-300 px-1.5 py-0.5 rounded border border-gray-700">
                                              {itemCC.name}
                                            </span>
                                          )}
                                        </div>
                                        <div className="font-mono font-bold text-amber-400 dir-ltr whitespace-nowrap text-xs">
                                          {item.amount.toLocaleString()} {companySettings.currency}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 flex-wrap">
                                  {rec.items?.slice(0, 2).map((item, iIdx) => (
                                    <span
                                      key={iIdx}
                                      className="bg-[#181D26] px-1.5 py-0.5 rounded border border-gray-800 text-gray-300"
                                    >
                                      {item.statement} ({item.amount.toLocaleString()} {companySettings.currency})
                                    </span>
                                  ))}
                                  {(rec.items?.length || 0) > 2 && (
                                    <span className="text-gray-500">+{((rec.items?.length || 0) - 2)} أخرى...</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {rec.notes && (
                            <span className="inline-block text-[10px] text-gray-400 bg-black/30 px-1.5 py-0.5 rounded border border-gray-800">
                              ملاحظات: {rec.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* مدين (العهدة المستلمة) */}
                      <td className="px-3 py-3 text-left font-mono font-bold text-xs dir-ltr">
                        {rec.debit > 0 ? (
                          <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 whitespace-nowrap">
                            +{rec.debit.toLocaleString()} {companySettings.currency}
                          </span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>

                      {/* الدائن (المصروفات والمسدد) */}
                      <td className="px-3 py-3 text-left font-mono font-bold text-xs dir-ltr">
                        {rec.credit > 0 ? (
                          <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 whitespace-nowrap">
                            -{rec.credit.toLocaleString()} {companySettings.currency}
                          </span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>

                      {/* الباقي */}
                      <td className="px-3.5 py-3 text-left font-mono font-bold text-xs dir-ltr bg-gray-800/20">
                        <span
                          className={`px-2 py-0.5 rounded-md whitespace-nowrap ${
                            displayBalance > 0
                              ? "text-blue-300 bg-blue-500/10 border border-blue-500/20"
                              : displayBalance === 0
                              ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                              : "text-red-400 bg-red-500/10 border border-red-500/20"
                          }`}
                        >
                          {displayBalance.toLocaleString()} {companySettings.currency}
                        </span>
                      </td>

                      {/* مركز التكلفة */}
                      <td className="px-3.5 py-3 text-gray-300">
                        {cc ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-800/80 text-[11px] text-gray-300 border border-gray-700/60 max-w-[130px] truncate">
                            <Building2 className="w-3 h-3 text-blue-400 shrink-0" />
                            <span className="truncate">{cc.name}</span>
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[11px]">-</span>
                        )}
                      </td>

                      {/* الحساب المقابل */}
                      <td className="px-3.5 py-3 text-gray-300">
                        {oppAccount ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#181D26] text-[11px] text-gray-200 border border-gray-700/70 max-w-[160px] truncate shadow-sm"
                            title={`${oppAccount.code} - ${oppAccount.nameAr}`}
                          >
                            <Wallet className="w-3 h-3 text-purple-400 shrink-0" />
                            <span className="truncate font-medium">{oppAccount.nameAr}</span>
                            <span className="text-[10px] text-purple-400/80 font-mono font-bold shrink-0">
                              ({oppAccount.code})
                            </span>
                          </span>
                        ) : rec.expenseAccountId ? (
                          <span className="bg-gray-800/60 px-1.5 py-0.5 rounded border border-gray-700/40 text-gray-400 font-mono text-[11px]">
                            {rec.expenseAccountId}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[11px]">-</span>
                        )}
                      </td>

                      {/* المستند */}
                      <td className="px-3 py-3 text-center text-gray-400 font-mono text-[11px]">
                        {rec.documentRef ? (
                          <span className="bg-[#181D26] px-1.5 py-0.5 rounded border border-gray-700/60 text-gray-300">
                            {rec.documentRef}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* إجراءات */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handlePrintSheet(rec.beneficiaryName)}
                            title={`طباعة كشف عهدة الموظف (${rec.beneficiaryName}) المفصل سطر بسطر`}
                            className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handlePrintVoucher(rec)}
                            title="طباعة سند حركة مفرد معتمد"
                            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(rec)}
                            title="تعديل الحركة والفواتير"
                            className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                id: rec.id,
                                name: `${rec.beneficiaryName} (${rec.statement})`,
                              })
                            }
                            title="حذف الحركة"
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer Totals */}
            {filteredRecords.length > 0 && (
              <tfoot className="bg-[#141720] border-t-2 border-gray-700/80 font-bold text-xs">
                <tr>
                  <td colSpan={4} className="px-4 py-3.5 text-right text-white">
                    إجمالي كشف التصفية المعروض ({filteredRecords.length} حركة - {totals.totalInvoicesCount} فاتورة مسواة):
                  </td>
                  <td className="px-3 py-3.5 text-left font-mono text-emerald-400 text-sm dir-ltr">
                    {totals.totalDebit.toLocaleString()} {companySettings.currency}
                  </td>
                  <td className="px-3 py-3.5 text-left font-mono text-amber-400 text-sm dir-ltr">
                    {totals.totalCredit.toLocaleString()} {companySettings.currency}
                  </td>
                  <td className="px-3.5 py-3.5 text-left font-mono text-blue-400 text-sm dir-ltr bg-gray-800/40">
                    {totals.netBalance.toLocaleString()} {companySettings.currency}
                  </td>
                  <td colSpan={4} className="px-3 py-3.5 text-gray-400 text-[11px]">
                    فقط {numberToArabicWords(totals.netBalance)} {companySettings.currency} لا غير
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal: Add/Edit Clearance Record with Full Invoice Details */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-[#11141B] w-full max-w-3xl rounded-2xl border border-gray-800 shadow-2xl overflow-hidden my-6">
            <div className="p-4 bg-[#161B24] border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                <Receipt className="w-4 h-4 text-amber-400" />
                {editingRecord
                  ? "تعديل حركة وتصفية العهدة وفواتيرها"
                  : formData.entryType === "CREDIT"
                  ? "تسجيل تقديم فواتير وتصفية عهدة مالية"
                  : "تسجيل حركة عهدة جديدة"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Row 1: Date & Beneficiary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    التاريخ *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-[#181D26] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-semibold flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                    اسم المصرف له (صاحب العهدة) *
                  </label>
                  <input
                    type="text"
                    required
                    list="beneficiaries-list"
                    value={formData.beneficiaryName}
                    onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
                    placeholder="مثال: م. طارق عبدالفتاح"
                    className="w-full bg-[#181D26] border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-semibold"
                  />
                  <datalist id="beneficiaries-list">
                    {uniqueBeneficiaries.map((name) => (
                      <option key={name} value={name} />
                    ))}
                    {employees.map((emp) => (
                      <option key={emp.id} value={`${emp.name} (${emp.jobTitle})`} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Movement Type Selection */}
              <div className="bg-[#161B24] p-3 rounded-xl border border-gray-800 space-y-2">
                <label className="block text-gray-300 font-semibold">نوع العملية المالية:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        entryType: "CREDIT",
                        category: "تقديم فواتير ومصروفات",
                      });
                      if (invoiceItems.length === 0) {
                        handleAddInvoiceItem();
                      }
                    }}
                    className={`p-2.5 rounded-xl text-center transition font-bold flex items-center justify-center gap-1.5 ${
                      formData.entryType === "CREDIT"
                        ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                        : "bg-[#11141B] text-gray-300 border border-gray-800 hover:bg-gray-800"
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    تقديم فواتير (دائن)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        entryType: "DEBIT",
                        category: "استلام عهدة",
                      })
                    }
                    className={`p-2.5 rounded-xl text-center transition font-bold flex items-center justify-center gap-1.5 ${
                      formData.entryType === "DEBIT"
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                        : "bg-[#11141B] text-gray-300 border border-gray-800 hover:bg-gray-800"
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    صرف عهدة (مدين)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        entryType: "REFUND",
                        category: "رد نقدية للخزينة",
                      })
                    }
                    className={`p-2.5 rounded-xl text-center transition font-bold flex items-center justify-center gap-1.5 ${
                      formData.entryType === "REFUND"
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                        : "bg-[#11141B] text-gray-300 border border-gray-800 hover:bg-gray-800"
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    رد نقدية (دائن)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        entryType: "CUSTOM",
                      })
                    }
                    className={`p-2.5 rounded-xl text-center transition font-bold flex items-center justify-center gap-1.5 ${
                      formData.entryType === "CUSTOM"
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                        : "bg-[#11141B] text-gray-300 border border-gray-800 hover:bg-gray-800"
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    مخصص (مدين/دائن)
                  </button>
                </div>
              </div>

              {/* INVOICE DETAILS SECTION (بنود وتفاصيل الفواتير المقدمة) */}
              <div className="bg-[#141822] p-4 rounded-2xl border-2 border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">
                        تفاصيل وبنود الفواتير والإيصالات المقدمة للتصفية ({invoiceItems.length} بند)
                      </h4>
                      <p className="text-[10px] text-gray-400">
                        سجل كل فاتورة وتفاصيل مصروفها ومبلغها لحفظ المستندات بدقة واحترافية
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {invoiceItems.length > 0 && (
                      <button
                        type="button"
                        onClick={handleGenerateStatementFromInvoices}
                        className="flex items-center gap-1 px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-semibold transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        توليد البيان العام من الفواتير
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleAddInvoiceItem}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-amber-600/20"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      إضافة فاتورة / بند جديد
                    </button>
                  </div>
                </div>

                {/* Items List */}
                {invoiceItems.length === 0 ? (
                  <div className="text-center py-5 bg-[#11141B] rounded-xl border border-gray-800 text-gray-500">
                    <Receipt className="w-7 h-7 mx-auto text-gray-600 mb-1 opacity-60" />
                    <p className="text-xs font-medium text-gray-400">لم يتم إضافة بنود فواتير تفصيلية بعد</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      اضغط على زر "إضافة فاتورة / بند جديد" لتسجيل فواتير ومصروفات التصفية بنداً بنداً
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {invoiceItems.map((item, index) => (
                      <div
                        key={item.id ? `inv-item-${item.id}` : `inv-idx-${index}`}
                        className="bg-[#11141B] p-3 rounded-xl border border-gray-800 space-y-2 relative group hover:border-gray-700 transition"
                      >
                        <div className="flex items-center justify-between border-b border-gray-800/80 pb-1.5 text-[11px]">
                          <span className="font-bold text-amber-400 flex items-center gap-1">
                            <span>بند فاتورة #{index + 1}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveInvoiceItem(index)}
                            title="حذف هذا البند"
                            className="text-gray-500 hover:text-red-400 p-1 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          {/* Invoice Statement / Details */}
                          <div className="sm:col-span-6">
                            <label className="block text-gray-400 mb-0.5 text-[10px] font-semibold">
                              البيان وتفاصيل المصروف / الفاتورة *
                            </label>
                            <input
                              type="text"
                              required
                              value={item.statement}
                              onChange={(e) =>
                                handleUpdateInvoiceItem(index, "statement", e.target.value)
                              }
                              placeholder="مثال: شراء 5 طن أسمنت / نقل معدات / أجور عمالة"
                              className="w-full bg-[#181D26] border border-gray-700 rounded-lg px-2.5 py-1.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-xs"
                            />
                          </div>

                          {/* Invoice Amount */}
                          <div className="sm:col-span-3">
                            <label className="block text-gray-400 mb-0.5 text-[10px] font-semibold">
                              المبلغ ({companySettings.currency}) *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={item.amount || ""}
                              onChange={(e) =>
                                handleUpdateInvoiceItem(index, "amount", parseFloat(e.target.value) || 0)
                              }
                              placeholder="0.00"
                              className="w-full bg-[#181D26] border border-gray-700 rounded-lg px-2.5 py-1.5 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500 text-xs dir-ltr text-right"
                            />
                          </div>

                          {/* Invoice Number */}
                          <div className="sm:col-span-3">
                            <label className="block text-gray-400 mb-0.5 text-[10px] font-semibold">
                              رقم الفاتورة / الإيصال
                            </label>
                            <input
                              type="text"
                              value={item.invoiceNo || ""}
                              onChange={(e) =>
                                handleUpdateInvoiceItem(index, "invoiceNo", e.target.value)
                              }
                              placeholder="فاتورة-891"
                              className="w-full bg-[#181D26] border border-gray-700 rounded-lg px-2.5 py-1.5 text-white font-mono placeholder-gray-500 focus:outline-none focus:border-amber-500 text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                          {/* Invoice Date */}
                          <div>
                            <label className="block text-gray-500 mb-0.5 text-[10px]">
                              تاريخ الفاتورة
                            </label>
                            <input
                              type="date"
                              value={item.date || formData.date}
                              onChange={(e) =>
                                handleUpdateInvoiceItem(index, "date", e.target.value)
                              }
                              className="w-full bg-[#181D26] border border-gray-800 rounded-lg px-2 py-1 text-gray-300 text-[11px] focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          {/* Category */}
                          <div>
                            <label className="block text-gray-500 mb-0.5 text-[10px]">
                              تصنيف المصروف
                            </label>
                            <select
                              value={item.category || "مواد بناء ومؤن"}
                              onChange={(e) =>
                                handleUpdateInvoiceItem(index, "category", e.target.value)
                              }
                              className="w-full bg-[#181D26] border border-gray-800 rounded-lg px-2 py-1 text-gray-300 text-[11px] focus:outline-none focus:border-amber-500"
                            >
                              {COMMON_EXPENSE_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Cost Center */}
                          <div>
                            <label className="block text-gray-500 mb-0.5 text-[10px]">
                              مركز التكلفة الخاص
                            </label>
                            <select
                              value={item.costCenterId || formData.costCenterId}
                              onChange={(e) =>
                                handleUpdateInvoiceItem(index, "costCenterId", e.target.value)
                              }
                              className="w-full bg-[#181D26] border border-gray-800 rounded-lg px-2 py-1 text-gray-300 text-[11px] focus:outline-none focus:border-amber-500"
                            >
                              <option value="">نفس مركز تكلفة الحركة</option>
                              {costCenters.map((cc) => (
                                <option key={cc.id} value={cc.id}>
                                  {cc.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Invoices Total Sum Bar */}
                    <div className="bg-[#11141B] p-2.5 rounded-xl border border-amber-500/40 flex items-center justify-between font-bold text-xs">
                      <span className="text-gray-300">
                        إجمالي مبالغ الفواتير المسجلة أعلاه ({invoiceItems.length} فاتورة):
                      </span>
                      <span className="text-amber-400 font-mono text-sm dir-ltr">
                        {invoiceItemsTotalSum.toLocaleString()} {companySettings.currency}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* General Statement */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-gray-400 font-semibold flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    البيان العام للحركة والتسوية *
                  </label>
                  {invoiceItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handleGenerateStatementFromInvoices}
                      className="text-[10px] text-blue-400 hover:underline"
                    >
                      تحديث تلقائي من الفواتير
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={formData.statement}
                  onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
                  placeholder="مثال: تقديم فواتير شراء مواد بناء ومصروفات تشغيل موقع القاهرة"
                  className="w-full bg-[#181D26] border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              {/* Total Amount Input (when not using custom) */}
              <div className="bg-[#161B24] p-3 rounded-xl border border-gray-800">
                {formData.entryType !== "CUSTOM" ? (
                  <div>
                    <label className="block text-gray-300 mb-1 font-semibold flex items-center justify-between">
                      <span>
                        {formData.entryType === "DEBIT"
                          ? "المبلغ المنصرف كعهدة (مدين) *"
                          : "إجمالي المبلغ المسوى بفواتير (دائن) *"}
                      </span>
                      {invoiceItems.length > 0 && invoiceItemsTotalSum > 0 && (
                        <span className="text-[10px] text-amber-400 font-normal">
                          (محسوب تلقائياً من مجموع الفواتير)
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        className="w-full bg-[#11141B] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500 dir-ltr text-right"
                      />
                      <span className="absolute left-3 top-2 text-gray-500 font-bold">
                        {companySettings.currency}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-emerald-400 mb-1 font-semibold">مدين (العهدة)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.debitAmount}
                        onChange={(e) => setFormData({ ...formData, debitAmount: e.target.value })}
                        placeholder="0.00"
                        className="w-full bg-[#11141B] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 dir-ltr text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-amber-400 mb-1 font-semibold">الدائن (المصروف)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.creditAmount}
                        onChange={(e) => setFormData({ ...formData, creditAmount: e.target.value })}
                        placeholder="0.00"
                        className="w-full bg-[#11141B] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-500 dir-ltr text-right"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Row 4: Cost Center, Counter Account & Document Ref */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold flex items-center gap-1 text-xs">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    مركز التكلفة / المشروع
                  </label>
                  <select
                    value={formData.costCenterId}
                    onChange={(e) => setFormData({ ...formData, costCenterId: e.target.value })}
                    className="w-full bg-[#181D26] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs"
                  >
                    <option value="">بدون مركز تكلفة (مقر رئيسي)</option>
                    {costCenters.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-semibold flex items-center gap-1 text-xs">
                    <Wallet className="w-3.5 h-3.5 text-purple-400" />
                    الحساب المقابل (المصروف / الخزينة)
                  </label>
                  <select
                    value={formData.expenseAccountId}
                    onChange={(e) => setFormData({ ...formData, expenseAccountId: e.target.value })}
                    className="w-full bg-[#181D26] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-xs"
                  >
                    <option value="">-- اختياري / اختر الحساب --</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-semibold flex items-center gap-1 text-xs">
                    <Receipt className="w-3.5 h-3.5 text-blue-400" />
                    رقم السند / الفاتورة
                  </label>
                  <input
                    type="text"
                    value={formData.documentRef}
                    onChange={(e) => setFormData({ ...formData, documentRef: e.target.value })}
                    placeholder="مثال: فاتورة-REC-491 / سند-صرف-104"
                    className="w-full bg-[#181D26] border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Row 5: Notes */}
              <div>
                <label className="block text-gray-400 mb-1 font-semibold">ملاحظات واعتماد إضافي</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أي توجيهات محاسبية أو تفاصيل إضافية للتسوية"
                  className="w-full bg-[#181D26] border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-medium transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-lg shadow-blue-600/25 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {editingRecord ? "حفظ التعديلات والفواتير" : "حفظ وتسجيل حركة التصفية"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <ConfirmDeleteModal
          isOpen={true}
          title="تأكيد حذف حركة تصفية العهدة"
          message={`هل أنت متأكد من رغبتك في حذف حركة: "${deleteConfirm.name}"؟`}
          onConfirm={() => {
            onDeleteRecord(deleteConfirm.id);
            setDeleteConfirm(null);
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};
