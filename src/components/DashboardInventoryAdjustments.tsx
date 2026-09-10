import React, { useState, useEffect } from "react";
import {
  Scale,
  Package,
  Wallet,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Plus,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Sparkles,
  Search,
  Check,
  Printer,
  Layers,
  Clock,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Filter,
  Trash2,
  Bell,
  Calendar,
  ShieldCheck,
  CalendarClock,
  X,
} from "lucide-react";
import {
  Account,
  JournalEntry,
  InventoryItem,
  CompanySettings,
  CostCenter,
  User,
} from "../types";
import { exportToExcel } from "../utils/export";
import { AccrualAdjustmentsSection, AccrualType } from "./AccrualAdjustmentsSection";
import { printSettlementVoucher } from "../utils/printSettlementVoucher";
import {
  ScheduledAdjustmentsService,
  ScheduledAdjustment,
} from "../utils/scheduledAdjustments";

export interface InventoryAdjustmentRecord {
  id: string;
  type: "CASH" | "STOCK" | "ACCRUED_EXPENSE" | "PREPAID_EXPENSE" | "ACCRUED_REVENUE" | "DEFERRED_REVENUE";
  categoryLabel?: string;
  date: string;
  title: string;
  targetName: string;
  bookValue: number;
  actualValue: number;
  discrepancy: number;
  financialAmount: number;
  reason: string;
  journalEntryNumber?: string;
  approvedBy: string;
  debitAccountName?: string;
  creditAccountName?: string;
  costCenterName?: string;
}

interface DashboardInventoryAdjustmentsProps {
  accounts: Account[];
  inventoryItems?: InventoryItem[];
  journalEntries: JournalEntry[];
  costCenters?: CostCenter[];
  companySettings: CompanySettings;
  currentUser?: User | null;
  onSaveJournalEntry?: (entry: JournalEntry) => void;
  onSaveInventoryItem?: (item: InventoryItem) => void;
  onDeleteJournalEntry?: (entryId: string) => void;
}

const ADJUSTMENTS_STORAGE_KEY = "erp_dashboard_inventory_adjustments_log";

export const DashboardInventoryAdjustments: React.FC<
  DashboardInventoryAdjustmentsProps
> = ({
  accounts,
  inventoryItems = [],
  journalEntries,
  costCenters = [],
  companySettings,
  currentUser,
  onSaveJournalEntry,
  onSaveInventoryItem,
  onDeleteJournalEntry,
}) => {
  const [activeTab, setActiveTab] = useState<"accruals" | "cash" | "stock" | "schedules" | "history">("accruals");
  const [historyFilter, setHistoryFilter] = useState<string>("ALL");
  const [historySearchQuery, setHistorySearchQuery] = useState<string>("");
  const [includeSignatureInPrint, setIncludeSignatureInPrint] = useState<boolean>(true);
  const [deleteConfirmAdj, setDeleteConfirmAdj] = useState<InventoryAdjustmentRecord | null>(null);

  // Scheduled Adjustments State
  const [scheduledList, setScheduledList] = useState<ScheduledAdjustment[]>(() =>
    ScheduledAdjustmentsService.getAdjustments()
  );
  const [approachingAlerts, setApproachingAlerts] = useState(() =>
    ScheduledAdjustmentsService.getApproachingAdjustments(3)
  );
  const [dismissAlertBanner, setDismissAlertBanner] = useState(false);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [newScheduleForm, setNewScheduleForm] = useState({
    title: "",
    type: "CASH" as const,
    categoryLabel: "جرد الخزينة والنقدية",
    dueDate: new Date().toISOString().split("T")[0],
    frequency: "MONTHLY" as const,
    estimatedAmount: 0,
    assignedTo: "المحاسب المعتمد",
    targetAccountName: "الخزينة الرئيسية",
    notes: "",
  });

  useEffect(() => {
    const unsub = ScheduledAdjustmentsService.subscribe((items) => {
      setScheduledList(items);
      setApproachingAlerts(ScheduledAdjustmentsService.getApproachingAdjustments(3));
    });
    return unsub;
  }, []);

  // Cash Adjustment State
  const treasuryAccounts = accounts.filter(
    (a) =>
      !a.isHeader &&
      (a.code.startsWith("1111") ||
        a.code.startsWith("1112") ||
        a.nameAr.includes("خزينة") ||
        a.nameAr.includes("صندوق"))
  );

  const [selectedTreasuryId, setSelectedTreasuryId] = useState<string>(
    treasuryAccounts[0]?.id || "1111"
  );
  const [actualCashCount, setActualCashCount] = useState<number | "">("");
  const [cashAdjustmentReason, setCashAdjustmentReason] = useState("");
  const [cashSuccessMsg, setCashSuccessMsg] = useState<string | null>(null);

  // Stock Adjustment State
  const [selectedItemId, setSelectedItemId] = useState<string>(
    inventoryItems[0]?.id || ""
  );
  const [actualStockCount, setActualStockCount] = useState<number | "">("");
  const [stockReason, setStockReason] = useState<string>("عجز جرد مستودع");
  const [stockNotes, setStockNotes] = useState("");
  const [stockSuccessMsg, setStockSuccessMsg] = useState<string | null>(null);

  // Adjustments History
  const [adjustmentsHistory, setAdjustmentsHistory] = useState<
    InventoryAdjustmentRecord[]
  >(() => {
    try {
      const saved = localStorage.getItem(ADJUSTMENTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: "ADJ-001",
        type: "ACCRUED_EXPENSE",
        categoryLabel: "المصروفات المستحقة",
        date: new Date(Date.now() - 86400000 * 1).toISOString().split("T")[0],
        title: "استحقاق رواتب وأجور شهر ديسمبر",
        targetName: "مصروف الرواتب والأجور ⟵ ⟶ المصروفات المستحقة",
        bookValue: 45000,
        actualValue: 45000,
        discrepancy: 0,
        financialAmount: 45000,
        reason: "مصروفات تخص الفترة الحالية ولم تُدفع أو تُسجل بعد عملاً بمبدأ الاستحقاق",
        journalEntryNumber: "قيد-تسوية-001",
        approvedBy: "مدير الحسابات",
        debitAccountName: "مصروف الرواتب والأجور",
        creditAccountName: "المصروفات المستحقة",
        costCenterName: "الإدارة العامة",
      },
      {
        id: "ADJ-002",
        type: "PREPAID_EXPENSE",
        categoryLabel: "المصروفات المقدمة",
        date: new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
        title: "استهلاك قسط إيجار المقر السنوي المدفوع مقدماً",
        targetName: "مصروف الإيجار ⟵ ⟶ المصروفات المدفوعة مقدماً",
        bookValue: 15000,
        actualValue: 15000,
        discrepancy: 0,
        financialAmount: 15000,
        reason: "مبالغ دُفعت مقدماً عن خدمات أو فترات مالية قادمة - استنفاد حصة الفترة",
        journalEntryNumber: "قيد-تسوية-002",
        approvedBy: "رئيس الحسابات",
        debitAccountName: "مصروف الإيجار",
        creditAccountName: "المصروفات المدفوعة مقدماً",
        costCenterName: "الفرع الرئيسي",
      },
      {
        id: "ADJ-003",
        type: "ACCRUED_REVENUE",
        categoryLabel: "الإيرادات المستحقة",
        date: new Date(Date.now() - 86400000 * 3).toISOString().split("T")[0],
        title: "إثبات إيراد خدمات صيانة منجزة للعميل لم تُفوتر",
        targetName: "الإيرادات المستحقة ⟵ ⟶ إيرادات عقود الصيانة والخدمات",
        bookValue: 22000,
        actualValue: 22000,
        discrepancy: 0,
        financialAmount: 22000,
        reason: "إيرادات تحققت وكُسبت خلال الفترة ولم تُقبض أو تُسجل بعد",
        journalEntryNumber: "قيد-تسوية-003",
        approvedBy: "المدير المالي",
        debitAccountName: "الإيرادات المستحقة",
        creditAccountName: "إيرادات عقود الصيانة والخدمات",
        costCenterName: "مشروع البرج السكني",
      },
      {
        id: "ADJ-004",
        type: "DEFERRED_REVENUE",
        categoryLabel: "الإيرادات المقدمة",
        date: new Date(Date.now() - 86400000 * 4).toISOString().split("T")[0],
        title: "تحقق إيراد دفعة مقدمة لتنفيذ استشارات هندسية",
        targetName: "الإيرادات المقبوضة مقدماً ⟵ ⟶ إيرادات الخدمات",
        bookValue: 30000,
        actualValue: 30000,
        discrepancy: 0,
        financialAmount: 30000,
        reason: "مبالغ قُبضت مقدماً نظير خدمات لم تُقدم بعد - إثبات تحقق إنجاز المرحلة",
        journalEntryNumber: "قيد-تسوية-004",
        approvedBy: "المدير المالي",
        debitAccountName: "الإيرادات المقبوضة مقدماً",
        creditAccountName: "إيرادات عقود الصيانة والخدمات",
        costCenterName: "مشروع فرع الإسكندرية",
      },
      {
        id: "ADJ-005",
        type: "CASH",
        categoryLabel: "جرد الخزينة",
        date: new Date(Date.now() - 86400000 * 5).toISOString().split("T")[0],
        title: "تسوية جرد الخزينة الرئيسية",
        targetName: "الخزينة الرئيسية (1111)",
        bookValue: 50000,
        actualValue: 49850,
        discrepancy: -150,
        financialAmount: 150,
        reason: "عجز طفيف أثناء مطابقة الإيصالات النقدية",
        journalEntryNumber: "قيد-تسوية-005",
        approvedBy: "مدير الحسابات",
        debitAccountName: "خسائر وفروقات جرد النقدية",
        creditAccountName: "الخزينة الرئيسية",
      },
      {
        id: "ADJ-006",
        type: "STOCK",
        categoryLabel: "جرد المخزون",
        date: new Date(Date.now() - 86400000 * 6).toISOString().split("T")[0],
        title: "تسوية جرد مخزون أصناف تالفة",
        targetName: "صنف مستودع رقم 1",
        bookValue: 120,
        actualValue: 115,
        discrepancy: -5,
        financialAmount: 750,
        reason: "تلف أثناء النقل والتحميل",
        journalEntryNumber: "قيد-تسوية-006",
        approvedBy: "أمين المستودع",
        debitAccountName: "خسائر عجز وتلف مخزون",
        creditAccountName: "المخزون السلعي",
      },
    ];
  });

  const saveHistory = (newRec: InventoryAdjustmentRecord) => {
    const updated = [newRec, ...adjustmentsHistory];
    setAdjustmentsHistory(updated);
    try {
      localStorage.setItem(ADJUSTMENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleRecordAccrualAdjustment = (rec: {
    type: AccrualType;
    categoryLabel: string;
    title: string;
    targetName: string;
    amount: number;
    reason: string;
    entryNumber: string;
    debitAccountName: string;
    creditAccountName: string;
    costCenterName?: string;
  }) => {
    const historyRec: InventoryAdjustmentRecord = {
      id: "ADJ-" + Date.now().toString().slice(-4),
      type: rec.type,
      categoryLabel: rec.categoryLabel,
      date: new Date().toISOString().split("T")[0],
      title: rec.title,
      targetName: rec.targetName,
      bookValue: rec.amount,
      actualValue: rec.amount,
      discrepancy: 0,
      financialAmount: rec.amount,
      reason: rec.reason,
      journalEntryNumber: rec.entryNumber,
      approvedBy: currentUser?.fullName || "المسؤول المعتمد",
      debitAccountName: rec.debitAccountName,
      creditAccountName: rec.creditAccountName,
      costCenterName: rec.costCenterName,
    };
    saveHistory(historyRec);
  };

  // Selected treasury calculations
  const currentTreasuryAccount =
    accounts.find((a) => a.id === selectedTreasuryId) || treasuryAccounts[0];
  const treasuryBookBalance = currentTreasuryAccount?.balance || 0;
  const cashDifference =
    actualCashCount === "" ? 0 : Number(actualCashCount) - treasuryBookBalance;

  // Selected stock item calculations
  const currentItem =
    inventoryItems.find((i) => i.id === selectedItemId) || inventoryItems[0];
  const itemBookQty = currentItem?.quantity || 0;
  const itemCostPrice = currentItem?.costPrice || 0;
  const stockDifferenceQty =
    actualStockCount === "" ? 0 : Number(actualStockCount) - itemBookQty;
  const stockDifferenceValue = Math.abs(stockDifferenceQty * itemCostPrice);

  // Handle Cash Settlement Submission
  const handleSettleCashCount = (e: React.FormEvent) => {
    e.preventDefault();
    if (actualCashCount === "" || !currentTreasuryAccount) return;

    const diff = Number(actualCashCount) - treasuryBookBalance;
    if (diff === 0) {
      alert("الرصيد الفعلي مطابق تماماً للرصيد الدفتري، لا يوجد فارق يستوجب قيد تسوية.");
      return;
    }

    const entryNum = `تسوية-خزينة-${Date.now().toString().slice(-4)}`;
    const today = new Date().toISOString().split("T")[0];
    const isShortage = diff < 0;
    const absDiff = Math.abs(diff);

    // Find or fallback accounts
    const cashDiscrepancyAcc =
      accounts.find(
        (a) =>
          a.nameAr.includes("عجز") ||
          a.nameAr.includes("فروقات النقدية") ||
          a.code.startsWith("5")
      ) ||
      accounts.find((a) => a.type === "EXPENSE") ||
      currentTreasuryAccount;

    // Build Journal Entry
    const newEntry: JournalEntry = {
      id: "JE-ADJ-" + Date.now(),
      entryNumber: entryNum,
      date: today,
      isPosted: true,
      reference: `تسوية جرد ${currentTreasuryAccount.nameAr}`,
      notes: `قيد تسوية جرد الخزينة: ${isShortage ? "عجز نقدي" : "فائض نقدي"} بمبلغ ${absDiff.toLocaleString()} ${companySettings.currency} - ${cashAdjustmentReason || "تسوية جرد دورية"}`,
      lines: isShortage
        ? [
            {
              id: "L1-" + Date.now(),
              accountId: cashDiscrepancyAcc.id,
              debit: absDiff,
              credit: 0,
              note: `عجز جرد الخزينة ${currentTreasuryAccount.nameAr}`,
            },
            {
              id: "L2-" + Date.now(),
              accountId: currentTreasuryAccount.id,
              debit: 0,
              credit: absDiff,
              note: `تخفيض رصيد الخزينة لمطابقة الجرد الفعلي`,
            },
          ]
        : [
            {
              id: "L1-" + Date.now(),
              accountId: currentTreasuryAccount.id,
              debit: absDiff,
              credit: 0,
              note: `زيادة رصيد الخزينة لمطابقة الجرد الفعلي`,
            },
            {
              id: "L2-" + Date.now(),
              accountId: cashDiscrepancyAcc.id,
              debit: 0,
              credit: absDiff,
              note: `إيرادات وفروقات زيادة جرد الخزينة`,
            },
          ],
      createdAt: new Date().toISOString(),
    };

    if (onSaveJournalEntry) {
      onSaveJournalEntry(newEntry);
    }

    // Record in History
    const historyRec: InventoryAdjustmentRecord = {
      id: "ADJ-" + Date.now(),
      type: "CASH",
      date: today,
      title: `تسوية جرد ${currentTreasuryAccount.nameAr}`,
      targetName: currentTreasuryAccount.nameAr,
      bookValue: treasuryBookBalance,
      actualValue: Number(actualCashCount),
      discrepancy: diff,
      financialAmount: absDiff,
      reason: cashAdjustmentReason || (isShortage ? "عجز جرد نقدي" : "فائض جرد نقدي"),
      journalEntryNumber: entryNum,
      approvedBy: currentUser?.fullName || "المسؤول المعتمد",
    };
    saveHistory(historyRec);

    setCashSuccessMsg(`تم إنشاء وترحيل قيد التسوية رقم (${entryNum}) وتعديل المطابقة بنجاح.`);
    setTimeout(() => setCashSuccessMsg(null), 4000);
    setActualCashCount("");
    setCashAdjustmentReason("");
  };

  // Handle Stock Settlement Submission
  const handleSettleStockCount = (e: React.FormEvent) => {
    e.preventDefault();
    if (actualStockCount === "" || !currentItem) return;

    const diffQty = Number(actualStockCount) - itemBookQty;
    if (diffQty === 0) {
      alert("الكمية الفعلية مطابقة تماماً للمسجلة بالمستودع، لا يوجد عجز أو زيادة.");
      return;
    }

    const entryNum = `تسوية-مخزون-${Date.now().toString().slice(-4)}`;
    const today = new Date().toISOString().split("T")[0];
    const isShortage = diffQty < 0;
    const absFinancial = Math.abs(diffQty * itemCostPrice);

    // Update inventory item quantity
    if (onSaveInventoryItem) {
      onSaveInventoryItem({
        ...currentItem,
        quantity: Number(actualStockCount),
      });
    }

    // Create journal entry if cost is greater than zero
    if (absFinancial > 0 && onSaveJournalEntry) {
      const inventoryAcc =
        accounts.find((a) => a.code.startsWith("113") || a.nameAr.includes("مخزون")) ||
        accounts[0];
      const lossAcc =
        accounts.find(
          (a) => a.nameAr.includes("تالف") || a.nameAr.includes("خسائر") || a.code.startsWith("5")
        ) || accounts[0];

      const newEntry: JournalEntry = {
        id: "JE-STK-" + Date.now(),
        entryNumber: entryNum,
        date: today,
        isPosted: true,
        reference: `تسوية صنف: ${currentItem.name}`,
        notes: `قيد تسوية جرد المخزون: ${isShortage ? "عجز / تلف" : "فائض"} (${Math.abs(diffQty)} ${currentItem.unit || "وحدة"}) بقيمة ${absFinancial.toLocaleString()} ${companySettings.currency} - ${stockReason}`,
        lines: isShortage
          ? [
              {
                id: "L1-" + Date.now(),
                accountId: lossAcc.id,
                debit: absFinancial,
                credit: 0,
                note: `خسائر عجز وتلف مخزون: ${currentItem.name}`,
              },
              {
                id: "L2-" + Date.now(),
                accountId: inventoryAcc.id,
                debit: 0,
                credit: absFinancial,
                note: `تخفيض حساب المخزون لجرد صنف ${currentItem.name}`,
              },
            ]
          : [
              {
                id: "L1-" + Date.now(),
                accountId: inventoryAcc.id,
                debit: absFinancial,
                credit: 0,
                note: `إثبات زيادة جرد مخزون صنف: ${currentItem.name}`,
              },
              {
                id: "L2-" + Date.now(),
                accountId: lossAcc.id,
                debit: 0,
                credit: absFinancial,
                note: `أرباح وفروقات جرد المستودعات`,
              },
            ],
        createdAt: new Date().toISOString(),
      };

      onSaveJournalEntry(newEntry);
    }

    // Record in History
    const historyRec: InventoryAdjustmentRecord = {
      id: "ADJ-" + Date.now(),
      type: "STOCK",
      date: today,
      title: `تسوية جرد صنف: ${currentItem.name}`,
      targetName: currentItem.name,
      bookValue: itemBookQty,
      actualValue: Number(actualStockCount),
      discrepancy: diffQty,
      financialAmount: absFinancial,
      reason: `${stockReason} - ${stockNotes || "تسوية جرد مخزني"}`,
      journalEntryNumber: entryNum,
      approvedBy: currentUser?.fullName || "أمين المستودع",
    };
    saveHistory(historyRec);

    setStockSuccessMsg(
      `تم تسوية المخزون بنجاح وتعديل رصيد الصنف إلى (${actualStockCount}) وترحيل القيد المحاسبي (${entryNum}).`
    );
    setTimeout(() => setStockSuccessMsg(null), 4000);
    setActualStockCount("");
    setStockNotes("");
  };

  const handleExportAdjustmentsExcel = () => {
    const rows = filteredHistory.map((a) => ({
      "كود التسوية": a.id,
      "التاريخ": a.date,
      "نوع التسوية": a.categoryLabel || (a.type === "CASH" ? "جرد خزينة ونقدية" : a.type === "STOCK" ? "جرد مخزون ومستودعات" : a.type),
      "البيان / المعاملة": a.title,
      "الحساب / الصنف المستهدف": a.targetName,
      "الطرف المدين (من حـ/)": a.debitAccountName || "-",
      "الطرف الدائن (إلى حـ/)": a.creditAccountName || "-",
      "مركز التكلفة": a.costCenterName || "-",
      "الرصيد الدفتري المسجل": a.bookValue,
      "الرصيد الفعلي المجرود": a.actualValue,
      "فارق الجرد": a.discrepancy,
      "القيمة المالية": a.financialAmount,
      "المبرر المحاسبي": a.reason,
      "رقم القيد المحاسبي": a.journalEntryNumber || "-",
      "المسؤول المعتمد": a.approvedBy,
    }));
    exportToExcel(rows, `سجل_التسويات_الجردية_${companySettings.companyName}`, "التسويات الجردية");
  };

  const filteredHistory = adjustmentsHistory.filter((rec) => {
    if (historyFilter !== "ALL" && rec.type !== historyFilter) return false;
    if (historySearchQuery.trim()) {
      const q = historySearchQuery.toLowerCase();
      const matchTarget = rec.targetName.toLowerCase().includes(q);
      const matchTitle = rec.title.toLowerCase().includes(q);
      const matchReason = rec.reason.toLowerCase().includes(q);
      const matchId = rec.id.toLowerCase().includes(q);
      const matchEntry = (rec.journalEntryNumber || "").toLowerCase().includes(q);
      if (!matchTarget && !matchTitle && !matchReason && !matchId && !matchEntry) return false;
    }
    return true;
  });

  return (
    <div className="bg-[#11141B] border border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-800 pb-3">
        <div>
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-400" />
            <span>التسويات الجردية والرقابة الداخلية الفورية</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            أنواع التسويات الجردية (المصروفات المستحقة والمقدمة، الإيرادات المستحقة والمقدمة)، مطابقة النقدية وجرد المخزون
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800">
          <button
            onClick={() => setActiveTab("accruals")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition ${
              activeTab === "accruals"
                ? "bg-amber-500 text-black shadow font-extrabold"
                : "text-gray-300 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>أنواع التسويات الجردية</span>
          </button>

          <button
            onClick={() => setActiveTab("cash")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition ${
              activeTab === "cash"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>جرد الخزينة</span>
          </button>

          <button
            onClick={() => setActiveTab("stock")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition ${
              activeTab === "stock"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>جرد المخزون</span>
          </button>

          <button
            onClick={() => setActiveTab("schedules")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition ${
              activeTab === "schedules"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span>التسويات المجدولة والتنبيهات ({scheduledList.length})</span>
            {approachingAlerts.length > 0 && (
              <span className="bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded-full text-[10px] animate-pulse">
                {approachingAlerts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition ${
              activeTab === "history"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>سجل التسويات ({adjustmentsHistory.length})</span>
          </button>
        </div>
      </div>

      {/* Real-time Toast / Alert Banner for Approaching Scheduled Adjustments */}
      {approachingAlerts.length > 0 && !dismissAlertBanner && (
        <div className="p-3 bg-gradient-to-r from-rose-950/80 via-amber-950/60 to-[#161B24] border border-amber-500/50 rounded-xl flex items-center justify-between gap-3 shadow-lg animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/40 animate-bounce">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">
                  تنبيه استحقاق تسويات جردية مجدولة (Real-time Alert):
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                  {approachingAlerts.length} تسويات مستحقة
                </span>
              </div>
              <p className="text-[11px] text-amber-200/90 mt-0.5">
                {approachingAlerts[0]?.title} - موعد الاستحقاق: {approachingAlerts[0]?.dueDate} (
                {approachingAlerts[0]?.urgency === "TODAY"
                  ? "مستحقة اليوم!"
                  : approachingAlerts[0]?.urgency === "OVERDUE"
                  ? "متأخرة عن الموعد"
                  : `متبقي ${approachingAlerts[0]?.diffDays} يوم`}
                )
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab("schedules")}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs transition shadow"
            >
              عرض واستكمال التسويات
            </button>
            <button
              onClick={() => setDismissAlertBanner(true)}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg"
              title="إخفاء التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 0: ACCRUAL ADJUSTMENT TYPES (المصروفات المستحقة والمقدمة، الإيرادات المستحقة والمقدمة) */}
      {activeTab === "accruals" && (
        <AccrualAdjustmentsSection
          accounts={accounts}
          costCenters={costCenters}
          companySettings={companySettings}
          currentUser={currentUser}
          onRecordAdjustment={handleRecordAccrualAdjustment}
          onSaveJournalEntry={onSaveJournalEntry}
        />
      )}

      {/* TAB 1: CASH RECONCILIATION */}
      {activeTab === "cash" && (
        <form onSubmit={handleSettleCashCount} className="space-y-4">
          {cashSuccessMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{cashSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Choose Treasury */}
            <div>
              <label className="text-xs text-gray-300 font-semibold mb-1 block">
                اختر الخزينة / الصندوق المراد جرده:
              </label>
              <select
                value={selectedTreasuryId}
                onChange={(e) => setSelectedTreasuryId(e.target.value)}
                className="w-full bg-[#181D26] border border-gray-700 text-white rounded-lg p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              >
                {treasuryAccounts.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} - {t.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* Current System Book Balance */}
            <div>
              <label className="text-xs text-gray-400 font-semibold mb-1 block">
                الرصيد الدفتري الحالي بالنظام:
              </label>
              <div className="w-full bg-[#181D26] border border-gray-700 text-emerald-400 font-bold rounded-lg p-2.5 text-sm font-mono">
                {treasuryBookBalance.toLocaleString()} {companySettings.currency}
              </div>
            </div>

            {/* Actual Physical Cash Count Input */}
            <div>
              <label className="text-xs text-amber-300 font-semibold mb-1 block">
                الرصيد الفعلي بعد الجرد والعد اليدوي:
              </label>
              <input
                type="number"
                step="any"
                required
                value={actualCashCount}
                onChange={(e) =>
                  setActualCashCount(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="أدخل المبلغ الفعلي الموجود بالخزنة..."
                className="w-full bg-[#181D26] border border-amber-500/50 text-white rounded-lg p-2.5 text-xs font-mono font-bold focus:border-amber-400 focus:outline-none"
              />
            </div>

          </div>

          {/* Real-time Calculation Badge */}
          {actualCashCount !== "" && (
            <div
              className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                cashDifference === 0
                  ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                  : cashDifference < 0
                  ? "bg-rose-950/30 border-rose-500/40 text-rose-200"
                  : "bg-blue-950/30 border-blue-500/40 text-blue-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {cashDifference === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span>
                  نتيجة الجرد:{" "}
                  <strong>
                    {cashDifference === 0
                      ? "مطابق تماماً - لا يوجد أي فروقات"
                      : cashDifference < 0
                      ? `عجز نقدي بقيمة: ${Math.abs(cashDifference).toLocaleString()} ${companySettings.currency}`
                      : `فائض نقدي بقيمة: ${cashDifference.toLocaleString()} ${companySettings.currency}`}
                  </strong>
                </span>
              </div>

              {cashDifference !== 0 && (
                <span className="text-[11px] text-gray-300">
                  سيتم توليد قيد تسوية آلي لترحيل الفارق لحساب الأرباح/الخسائر أو عهدة أمين الخزينة
                </span>
              )}
            </div>
          )}

          {/* Reason Input */}
          <div>
            <label className="text-xs text-gray-300 font-semibold mb-1 block">
              مبرر وبيان تسوية جرد الخزينة:
            </label>
            <input
              type="text"
              value={cashAdjustmentReason}
              onChange={(e) => setCashAdjustmentReason(e.target.value)}
              placeholder="مثال: تسوية جرد شهري معتمد - فروقات مقبولة - إيصال مفقود..."
              className="w-full bg-[#181D26] border border-gray-700 text-white rounded-lg p-2.5 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={actualCashCount === ""}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>إنشاء وترحيل قيد تسوية جرد الخزينة</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: STOCK RECONCILIATION */}
      {activeTab === "stock" && (
        <form onSubmit={handleSettleStockCount} className="space-y-4">
          {stockSuccessMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{stockSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            
            {/* Select Item */}
            <div className="md:col-span-2">
              <label className="text-xs text-gray-300 font-semibold mb-1 block">
                اختر الصنف المخزني المراد جرد مستودعه:
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full bg-[#181D26] border border-gray-700 text-white rounded-lg p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              >
                {inventoryItems.length === 0 && (
                  <option value="">لا توجد أصناف مسجلة في المخزون</option>
                )}
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} - {item.name} (الرصيد: {item.quantity} {item.unit || "وحدة"})
                  </option>
                ))}
              </select>
            </div>

            {/* Current Book Qty */}
            <div>
              <label className="text-xs text-gray-400 font-semibold mb-1 block">
                الكمية المسجلة دفترياً:
              </label>
              <div className="w-full bg-[#181D26] border border-gray-700 text-blue-400 font-bold rounded-lg p-2.5 text-xs font-mono">
                {itemBookQty} {currentItem?.unit || "وحدة"}
              </div>
            </div>

            {/* Actual Counted Qty */}
            <div>
              <label className="text-xs text-amber-300 font-semibold mb-1 block">
                الكمية الفعلية المجرودة:
              </label>
              <input
                type="number"
                step="any"
                required
                value={actualStockCount}
                onChange={(e) =>
                  setActualStockCount(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="العدد الفعلي بالمستودع..."
                className="w-full bg-[#181D26] border border-amber-500/50 text-white rounded-lg p-2.5 text-xs font-mono font-bold focus:border-amber-400 focus:outline-none"
              />
            </div>

          </div>

          {/* Real-time Calculation Badge */}
          {actualStockCount !== "" && (
            <div
              className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                stockDifferenceQty === 0
                  ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                  : stockDifferenceQty < 0
                  ? "bg-rose-950/30 border-rose-500/40 text-rose-200"
                  : "bg-blue-950/30 border-blue-500/40 text-blue-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {stockDifferenceQty === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span>
                  فارق الجرد المخزني:{" "}
                  <strong>
                    {stockDifferenceQty === 0
                      ? "مطابق تماماً"
                      : stockDifferenceQty < 0
                      ? `عجز / نقص (${Math.abs(stockDifferenceQty)} ${currentItem?.unit || "وحدة"}) بقيمة مالية تقديرية ${stockDifferenceValue.toLocaleString()} ${companySettings.currency}`
                      : `فائض (${stockDifferenceQty} ${currentItem?.unit || "وحدة"}) بقيمة مالية ${stockDifferenceValue.toLocaleString()} ${companySettings.currency}`}
                  </strong>
                </span>
              </div>

              <span className="text-[11px] text-gray-400">
                متوسط تكلفة الوحدة: {itemCostPrice.toLocaleString()} {companySettings.currency}
              </span>
            </div>
          )}

          {/* Reason and Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-gray-300 font-semibold mb-1 block">سبب الفارق الجردي:</label>
              <select
                value={stockReason}
                onChange={(e) => setStockReason(e.target.value)}
                className="w-full bg-[#181D26] border border-gray-700 text-white rounded-lg p-2.5 focus:border-amber-500 focus:outline-none"
              >
                <option value="تالف / كسر أثناء التخزين">تالف / كسر أثناء التخزين والتحميل</option>
                <option value="انتهاء تاريخ الصلاحية">انتهاء تاريخ الصلاحية</option>
                <option value="عجز فاقد طبيعي">عجز فاقد طبيعي وتبخر/انكماش</option>
                <option value="خطأ تسجيل سابق بفاتورة شراء أو مبيعات">خطأ تسجيل سابق في أذون الصرف</option>
                <option value="فائض جرد مستودعي">فائض جرد مستودعي لم يتم قيده</option>
              </select>
            </div>

            <div>
              <label className="text-gray-300 font-semibold mb-1 block">ملاحظات إضافية وتوصية:</label>
              <input
                type="text"
                value={stockNotes}
                onChange={(e) => setStockNotes(e.target.value)}
                placeholder="أدخل أي ملاحظات فنية حول حالة الصنف..."
                className="w-full bg-[#181D26] border border-gray-700 text-white rounded-lg p-2.5 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={actualStockCount === "" || inventoryItems.length === 0}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition"
            >
              <Package className="w-4 h-4" />
              <span>ترحيل قيد تسوية المخزون وتحديث الكميات</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: ADJUSTMENTS AUDIT HISTORY */}
      {activeTab === "history" && (
        <div className="space-y-4">
          
          {/* Top Control Bar: Search, Category Filters, and Excel Export */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#181D26] p-3 rounded-xl border border-gray-800">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-gray-400 font-semibold flex items-center gap-1 ml-1">
                <Filter className="w-3.5 h-3.5 text-amber-400" />
                <span>تصفية:</span>
              </span>

              {[
                { id: "ALL", label: "الكل" },
                { id: "ACCRUED_EXPENSE", label: "المصروفات المستحقة", color: "amber" },
                { id: "PREPAID_EXPENSE", label: "المصروفات المقدمة", color: "blue" },
                { id: "ACCRUED_REVENUE", label: "الإيرادات المستحقة", color: "emerald" },
                { id: "DEFERRED_REVENUE", label: "الإيرادات المقدمة", color: "purple" },
                { id: "CASH", label: "جرد الخزينة", color: "yellow" },
                { id: "STOCK", label: "جرد المخزون", color: "cyan" },
              ].map((filterItem) => (
                <button
                  key={filterItem.id}
                  onClick={() => setHistoryFilter(filterItem.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    historyFilter === filterItem.id
                      ? "bg-amber-500 text-black font-bold shadow"
                      : "bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  {filterItem.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2.5" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="بحث في التسويات أو القيود..."
                  className="bg-[#11141B] border border-gray-700 text-white rounded-lg pr-8 pl-2 py-1.5 text-xs w-48 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleExportAdjustmentsExcel}
                className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition border border-gray-700 shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>تصدير إكسيل</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-xs text-right text-slate-300">
              <thead className="bg-[#0A0C10] text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="p-2.5">رقم التسوية</th>
                  <th className="p-2.5">النوع والتصنيف</th>
                  <th className="p-2.5">التاريخ</th>
                  <th className="p-2.5">البيان والمعاملة / الحسابات</th>
                  <th className="p-2.5">مركز التكلفة</th>
                  <th className="p-2.5">القيمة المالية</th>
                  <th className="p-2.5">المبرر المحاسبي</th>
                  <th className="p-2.5">رقم القيد</th>
                  <th className="p-2.5 text-center">طباعة السند</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-[#11141B]">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-gray-400">
                      لا توجد تسويات مطابقة لمعايير البحث أو التصفية الحالية
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((rec) => {
                    const badgeStyle =
                      rec.type === "ACCRUED_EXPENSE"
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                        : rec.type === "PREPAID_EXPENSE"
                        ? "bg-blue-500/10 text-blue-300 border-blue-500/30"
                        : rec.type === "ACCRUED_REVENUE"
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        : rec.type === "DEFERRED_REVENUE"
                        ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                        : rec.type === "CASH"
                        ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30"
                        : "bg-cyan-500/10 text-cyan-300 border-cyan-500/30";

                    return (
                      <tr key={rec.id} className="hover:bg-gray-800/40 transition">
                        <td className="p-2.5 font-mono font-bold text-amber-400 whitespace-nowrap">
                          {rec.id}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block ${badgeStyle}`}
                          >
                            {rec.categoryLabel ||
                              (rec.type === "CASH"
                                ? "جرد الخزينة"
                                : rec.type === "STOCK"
                                ? "جرد المخزون"
                                : rec.type)}
                          </span>
                        </td>
                        <td className="p-2.5 text-gray-400 whitespace-nowrap font-mono">{rec.date}</td>
                        <td className="p-2.5">
                          <div className="font-bold text-white leading-tight">{rec.title}</div>
                          <div className="text-[11px] text-gray-400 truncate max-w-xs">{rec.targetName}</div>
                        </td>
                        <td className="p-2.5 text-gray-300 whitespace-nowrap">
                          {rec.costCenterName || "-"}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {rec.financialAmount.toLocaleString()} {companySettings.currency}
                        </td>
                        <td className="p-2.5 max-w-xs truncate text-gray-300 text-[11px]">{rec.reason}</td>
                        <td className="p-2.5 font-mono text-blue-400 whitespace-nowrap">
                          {rec.journalEntryNumber || "-"}
                        </td>
                        <td className="p-2.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() =>
                                printSettlementVoucher(
                                  {
                                    id: rec.id,
                                    type: rec.type,
                                    categoryLabel:
                                      rec.categoryLabel ||
                                      (rec.type === "CASH"
                                        ? "جرد خزينة"
                                        : rec.type === "STOCK"
                                        ? "جرد مخزون"
                                        : rec.type),
                                    title: rec.title,
                                    date: rec.date,
                                    targetName: rec.targetName,
                                    financialAmount: rec.financialAmount,
                                    reason: rec.reason,
                                    journalEntryNumber: rec.journalEntryNumber,
                                    approvedBy: rec.approvedBy,
                                    debitAccountName: rec.debitAccountName,
                                    creditAccountName: rec.creditAccountName,
                                    costCenterName: rec.costCenterName,
                                  },
                                  companySettings
                                )
                              }
                              className="inline-flex items-center gap-1 bg-gray-800 hover:bg-amber-600 hover:text-white text-gray-300 px-2 py-1 rounded text-[11px] font-semibold border border-gray-700 transition"
                              title="طباعة سند تسوية جردية معتمد"
                            >
                              <Printer className="w-3 h-3" />
                              <span>طباعة</span>
                            </button>

                            <button
                              onClick={() => setDeleteConfirmAdj(rec)}
                              className="inline-flex items-center gap-1 bg-rose-950/40 hover:bg-rose-600 hover:text-white text-rose-400 px-2 py-1 rounded text-[11px] font-semibold border border-rose-800/50 transition"
                              title="حذف التسوية الجردية وإلغاء القيد المحاسبي المرتبط بها"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>حذف</span>
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
        </div>
      )}

      {/* TAB 4: SCHEDULED ADJUSTMENTS & REAL-TIME REMINDERS */}
      {activeTab === "schedules" && (
        <div className="space-y-4 animate-fade-in">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#161B24] border border-gray-800 rounded-xl">
            <div>
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-amber-400" />
                <span>جدول مواعيد التسويات الجردية والرقابية الدورية</span>
              </h4>
              <p className="text-[11px] text-gray-400 mt-0.5">
                تنبيهات فورية عند اقتراب مواعيد جرد الخزائن، المستودعات، واستهلاك المصروفات المقدمة والمستحقة
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddScheduleModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs transition shadow shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة تسوية دورية مجدولة جديدة</span>
            </button>
          </div>

          {/* Scheduled Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {scheduledList.map((sch) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const due = new Date(sch.dueDate);
              due.setHours(0, 0, 0, 0);
              const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
              const isOverdue = diffDays < 0;
              const isToday = diffDays === 0;
              const isApproaching = diffDays > 0 && diffDays <= 3;

              const isDone = sch.status === "COMPLETED";

              return (
                <div
                  key={sch.id}
                  className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                    isDone
                      ? "bg-gray-900/40 border-gray-800 opacity-70"
                      : isToday
                      ? "bg-rose-950/20 border-rose-500/50 shadow-md"
                      : isApproaching
                      ? "bg-amber-950/20 border-amber-500/50 shadow-sm"
                      : "bg-[#161B24] border-gray-800 hover:border-gray-700"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[10px] text-gray-400 font-bold block">
                          {sch.id} • {sch.categoryLabel}
                        </span>
                        <h5 className="font-bold text-white text-xs mt-1 leading-snug">
                          {sch.title}
                        </h5>
                      </div>

                      {/* Status / Urgency Badge */}
                      {isDone ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          ✓ تم التنفيذ
                        </span>
                      ) : isToday ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                          مستحقة اليوم!
                        </span>
                      ) : isOverdue ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          متأخرة بـ {Math.abs(diffDays)} يوم
                        </span>
                      ) : isApproaching ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          متبقي {diffDays} يوم
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-800 text-gray-300">
                          متبقي {diffDays} يوم
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-1 text-[11px] text-gray-300">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">تاريخ الاستحقاق:</span>
                        <span className="font-mono font-bold text-white flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-400" />
                          <span>{sch.dueDate}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">الدورية:</span>
                        <span className="text-gray-300">
                          {sch.frequency === "WEEKLY"
                            ? "أسبوعي"
                            : sch.frequency === "MONTHLY"
                            ? "شهري"
                            : sch.frequency === "QUARTERLY"
                            ? "ربع سنوي"
                            : "سنوي"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">المبلغ التقديري:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {sch.estimatedAmount.toLocaleString()} {companySettings.currency}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">الحساب المستهدف:</span>
                        <span className="text-blue-300 truncate max-w-[180px]">
                          {sch.targetAccountName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">المسؤول:</span>
                        <span className="text-gray-300">{sch.assignedTo}</span>
                      </div>
                      {sch.notes && (
                        <p className="text-[10px] text-gray-400 mt-1 pt-1 border-t border-gray-800 line-clamp-2">
                          {sch.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        ScheduledAdjustmentsService.deleteAdjustment(sch.id);
                        setScheduledList(ScheduledAdjustmentsService.getAdjustments());
                      }}
                      className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      title="حذف الموعد المجدول"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-2">
                      {!isDone && (
                        <button
                          type="button"
                          onClick={() => {
                            ScheduledAdjustmentsService.markCompleted(sch.id);
                            setScheduledList(ScheduledAdjustmentsService.getAdjustments());
                          }}
                          className="px-2.5 py-1 bg-gray-800 hover:bg-emerald-600 hover:text-white text-gray-300 border border-gray-700 rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
                        >
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>تأكيد الإنجاز</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (sch.type === "CASH") setActiveTab("cash");
                          else if (sch.type === "STOCK") setActiveTab("stock");
                          else setActiveTab("accruals");
                        }}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-[11px] transition shadow"
                      >
                        تنفيذ التسوية الآن
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: ADD SCHEDULED ADJUSTMENT */}
      {showAddScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-[#11141B] border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-[#161B24] border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-white text-sm">
                  إضافة تسوية جردية ورَقابية مجدولة
                </h4>
              </div>
              <button
                onClick={() => setShowAddScheduleModal(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newScheduleForm.title.trim()) return;

                ScheduledAdjustmentsService.addAdjustment({
                  title: newScheduleForm.title.trim(),
                  type: newScheduleForm.type,
                  categoryLabel: newScheduleForm.categoryLabel,
                  dueDate: newScheduleForm.dueDate,
                  frequency: newScheduleForm.frequency,
                  estimatedAmount: Number(newScheduleForm.estimatedAmount) || 0,
                  assignedTo: newScheduleForm.assignedTo,
                  targetAccountName: newScheduleForm.targetAccountName,
                  notes: newScheduleForm.notes,
                  status: "PENDING",
                });

                setScheduledList(ScheduledAdjustmentsService.getAdjustments());
                setShowAddScheduleModal(false);
              }}
              className="p-5 space-y-3 text-xs"
            >
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  عنوان التسوية المجدولة *:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مطابقة الخزينة الأسبوعية أو استحقاق الرواتب"
                  value={newScheduleForm.title}
                  onChange={(e) =>
                    setNewScheduleForm({ ...newScheduleForm, title: e.target.value })
                  }
                  className="w-full bg-[#1A1F2B] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    نوع التسوية:
                  </label>
                  <select
                    value={newScheduleForm.type}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      const catLabels: Record<string, string> = {
                        CASH: "جرد الخزينة والنقدية",
                        STOCK: "جرد المخزون السلعي",
                        ACCRUED_EXPENSE: "المصروفات المستحقة",
                        PREPAID_EXPENSE: "المصروفات المدفوعة مقدماً",
                        ACCRUED_REVENUE: "الإيرادات المستحقة",
                        DEFERRED_REVENUE: "الإيرادات المقدمة",
                        DEPRECIATION: "إهلاك الأصول الثابتة",
                      };
                      setNewScheduleForm({
                        ...newScheduleForm,
                        type: t,
                        categoryLabel: catLabels[t] || "تسوية جردية",
                      });
                    }}
                    className="w-full bg-[#1A1F2B] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="CASH">جرد الخزينة والنقدية</option>
                    <option value="STOCK">جرد المخزون السلعي</option>
                    <option value="ACCRUED_EXPENSE">مصروف مستحق</option>
                    <option value="PREPAID_EXPENSE">مصروف مدفوع مقدماً</option>
                    <option value="ACCRUED_REVENUE">إيراد مستحق</option>
                    <option value="DEFERRED_REVENUE">إيراد مقدم</option>
                    <option value="DEPRECIATION">إهلاك أصول ثابتة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    دورية التكرار:
                  </label>
                  <select
                    value={newScheduleForm.frequency}
                    onChange={(e) =>
                      setNewScheduleForm({
                        ...newScheduleForm,
                        frequency: e.target.value as any,
                      })
                    }
                    className="w-full bg-[#1A1F2B] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="WEEKLY">أسبوعي</option>
                    <option value="MONTHLY">شهري</option>
                    <option value="QUARTERLY">ربع سنوي</option>
                    <option value="YEARLY">سنوي</option>
                    <option value="ONCE">مرة واحدة فقط</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    موعد الاستحقاق الأول *:
                  </label>
                  <input
                    type="date"
                    required
                    value={newScheduleForm.dueDate}
                    onChange={(e) =>
                      setNewScheduleForm({ ...newScheduleForm, dueDate: e.target.value })
                    }
                    className="w-full bg-[#1A1F2B] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    المبلغ التقديري:
                  </label>
                  <input
                    type="number"
                    value={newScheduleForm.estimatedAmount || ""}
                    onChange={(e) =>
                      setNewScheduleForm({
                        ...newScheduleForm,
                        estimatedAmount: Number(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                    className="w-full bg-[#1A1F2B] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  الحساب المستهدف / الطرف المعني:
                </label>
                <input
                  type="text"
                  placeholder="مثال: الخزينة الرئيسية (1111) أو مصروف إيجار"
                  value={newScheduleForm.targetAccountName}
                  onChange={(e) =>
                    setNewScheduleForm({
                      ...newScheduleForm,
                      targetAccountName: e.target.value,
                    })
                  }
                  className="w-full bg-[#1A1F2B] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  ملاحظات أو توجيهات الجرد:
                </label>
                <textarea
                  rows={2}
                  placeholder="تعليمات أو اشتراطات المطابقة الدورية..."
                  value={newScheduleForm.notes}
                  onChange={(e) =>
                    setNewScheduleForm({ ...newScheduleForm, notes: e.target.value })
                  }
                  className="w-full bg-[#1A1F2B] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="p-3 bg-[#161B24] border-t border-gray-800 flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddScheduleModal(false)}
                  className="px-3 py-1.5 text-gray-400 hover:text-white rounded-lg text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs shadow"
                >
                  حفظ وتفعيل التنبيه الدوري
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE ADJUSTMENT CONFIRMATION */}
      {deleteConfirmAdj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-[#11141B] border border-rose-800/60 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/40">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">
                  تأكيد حذف التسوية الجردية وعكس أثرها
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  رقم التسوية: {deleteConfirmAdj.id}
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-xs space-y-2 text-gray-300">
              <p>
                هل أنت متأكد من حذف التسوية الجردية:{" "}
                <strong className="text-white">"{deleteConfirmAdj.title}"</strong> بمبلغ{" "}
                <strong className="text-emerald-400 font-mono">
                  {deleteConfirmAdj.financialAmount.toLocaleString()}{" "}
                  {companySettings.currency}
                </strong>
                ؟
              </p>
              {deleteConfirmAdj.journalEntryNumber ? (
                <div className="p-2 bg-rose-900/40 border border-rose-500/30 rounded-lg text-[11px] text-rose-200">
                  ⚠️ <strong>تنبيه هام:</strong> سيتم حذف قيد اليومية المرتبط رقم (
                  <span className="font-mono font-bold text-white">
                    {deleteConfirmAdj.journalEntryNumber}
                  </span>
                  ) تلقائياً، وعكس أثر القيد من الحسابات الفرعية وميزان المراجعة لضمان
                  تطابق الحسابات الفعلية.
                </div>
              ) : (
                <p className="text-[11px] text-gray-400">
                  سيتم مسح هذه التسوية من السجلات والتقارير.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmAdj(null)}
                className="px-4 py-2 text-gray-400 hover:text-white rounded-xl text-xs font-semibold"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={() => {
                  // 1. Remove from history
                  const updated = adjustmentsHistory.filter(
                    (item) => item.id !== deleteConfirmAdj.id
                  );
                  setAdjustmentsHistory(updated);
                  try {
                    localStorage.setItem(
                      ADJUSTMENTS_STORAGE_KEY,
                      JSON.stringify(updated)
                    );
                  } catch {
                    // ignore
                  }

                  // 2. Cascade delete journal entry if connected
                  if (
                    deleteConfirmAdj.journalEntryNumber &&
                    onDeleteJournalEntry
                  ) {
                    const linked = journalEntries.find(
                      (j) =>
                        j.entryNumber === deleteConfirmAdj.journalEntryNumber ||
                        j.id === deleteConfirmAdj.journalEntryNumber
                    );
                    if (linked) {
                      onDeleteJournalEntry(linked.id);
                    }
                  }

                  setDeleteConfirmAdj(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-rose-950"
              >
                تأكيد الحذف وعكس القيد
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
