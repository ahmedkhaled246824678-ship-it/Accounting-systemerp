import React, { useState } from "react";
import {
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRightLeft,
  FileCheck,
  Calculator,
} from "lucide-react";
import { Account, JournalEntry, CompanySettings, CostCenter, User } from "../types";

export type AccrualType =
  | "ACCRUED_EXPENSE"
  | "PREPAID_EXPENSE"
  | "ACCRUED_REVENUE"
  | "DEFERRED_REVENUE";

export interface AccrualDefinition {
  type: AccrualType;
  nameAr: string;
  nameEn: string;
  definition: string;
  color: string;
  borderColor: string;
  bgColor: string;
  badgeBg: string;
  textColor: string;
  icon: React.ComponentType<{ className?: string }>;
  typicalDebit: string;
  typicalCredit: string;
  accountingStandard: string;
}

export const ACCRUAL_TYPES_INFO: AccrualDefinition[] = [
  {
    type: "ACCRUED_EXPENSE",
    nameAr: "المصروفات المستحقة",
    nameEn: "Accrued Expenses",
    definition: "مصروفات تخص الفترة الحالية ولم تُدفع أو تُسجل بعد.",
    color: "amber",
    borderColor: "border-amber-500/40",
    bgColor: "bg-amber-950/20 hover:bg-amber-950/30",
    badgeBg: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    textColor: "text-amber-400",
    icon: Clock,
    typicalDebit: "حـ/ المصروف المعني (رواتب، إيجار، كهرباء...)",
    typicalCredit: "حـ/ المصروفات المستحقة (التزام متداول)",
    accountingStandard: "تطبيق مبدأ الاستحقاق لتحميل الفترة بأعبائها الفعلية",
  },
  {
    type: "PREPAID_EXPENSE",
    nameAr: "المصروفات المقدمة",
    nameEn: "Prepaid Expenses",
    definition: "مبالغ دُفعت مقدماً عن خدمات أو فترات مالية قادمة.",
    color: "blue",
    borderColor: "border-blue-500/40",
    bgColor: "bg-blue-950/20 hover:bg-blue-950/30",
    badgeBg: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    textColor: "text-blue-400",
    icon: TrendingDown,
    typicalDebit: "حـ/ المصروف المستنفد للفترة الحالية",
    typicalCredit: "حـ/ المصروفات المدفوعة مقدماً (أصل متداول)",
    accountingStandard: "مبدأ مقابلة الإيرادات بالمصروفات وحصر الأصول المؤجلة",
  },
  {
    type: "ACCRUED_REVENUE",
    nameAr: "الإيرادات المستحقة",
    nameEn: "Accrued Revenues",
    definition: "إيرادات تحققت وكُسبت خلال الفترة ولم تُقبض أو تُسجل بعد.",
    color: "emerald",
    borderColor: "border-emerald-500/40",
    bgColor: "bg-emerald-950/20 hover:bg-emerald-950/30",
    badgeBg: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    textColor: "text-emerald-400",
    icon: TrendingUp,
    typicalDebit: "حـ/ الإيرادات المستحقة (أصل متداول - حق للمنشأة)",
    typicalCredit: "حـ/ الإيرادات المعنية (المبيعات، خدمات، استشارات...)",
    accountingStandard: "مبدأ الاعتراف بالإيراد المكتسب عند تحقق الخدمة",
  },
  {
    type: "DEFERRED_REVENUE",
    nameAr: "الإيرادات المقدمة",
    nameEn: "Deferred / Unearned Revenues",
    definition: "مبالغ قُبضت مقدماً نظير خدمات لم تُقدم بعد.",
    color: "purple",
    borderColor: "border-purple-500/40",
    bgColor: "bg-purple-950/20 hover:bg-purple-950/30",
    badgeBg: "bg-purple-500/10 text-purple-300 border-purple-500/30",
    textColor: "text-purple-400",
    icon: DollarSign,
    typicalDebit: "حـ/ الإيرادات المقبوضة مقدماً (تخفيض التزام متداول)",
    typicalCredit: "حـ/ الإيرادات المحققة المكتسبة للفترة الحالية",
    accountingStandard: "تأجيل الاعتراف بالإيراد كالتزام لحين أداء الخدمة وتسليمها",
  },
];

interface AccrualAdjustmentsSectionProps {
  accounts: Account[];
  costCenters?: CostCenter[];
  companySettings: CompanySettings;
  currentUser?: User | null;
  onRecordAdjustment: (record: {
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
  }) => void;
  onSaveJournalEntry?: (entry: JournalEntry) => void;
}

export const AccrualAdjustmentsSection: React.FC<AccrualAdjustmentsSectionProps> = ({
  accounts,
  costCenters = [],
  companySettings,
  currentUser,
  onRecordAdjustment,
  onSaveJournalEntry,
}) => {
  const [selectedType, setSelectedType] = useState<AccrualType>("ACCRUED_EXPENSE");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [selectedCostCenterId, setSelectedCostCenterId] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Amortization calculator for Prepaid and Deferred
  const [totalContractAmount, setTotalContractAmount] = useState<number | "">("");
  const [totalMonths, setTotalMonths] = useState<number>(12);
  const [consumedMonths, setConsumedMonths] = useState<number>(1);

  // Filtered accounts
  const expenseAccounts = accounts.filter((a) => !a.isHeader && (a.type === "EXPENSE" || a.code.startsWith("5")));
  const revenueAccounts = accounts.filter((a) => !a.isHeader && (a.type === "REVENUE" || a.code.startsWith("4")));
  
  // Specific adjustment accounts from Chart of Accounts
  const accruedExpenseAccount =
    accounts.find((a) => !a.isHeader && (a.code === "2150" || a.nameAr.includes("المصروفات المستحقة"))) ||
    accounts.find((a) => !a.isHeader && a.code.startsWith("21")) ||
    accounts[0];

  const prepaidExpenseAccount =
    accounts.find((a) => !a.isHeader && (a.code === "1150" || a.nameAr.includes("المصروفات المدفوعة مقدماً") || a.nameAr.includes("المصروفات المقدمة"))) ||
    accounts.find((a) => !a.isHeader && a.code.startsWith("11")) ||
    accounts[0];

  const accruedRevenueAccount =
    accounts.find((a) => !a.isHeader && (a.code === "1160" || a.nameAr.includes("الإيرادات المستحقة"))) ||
    accounts.find((a) => !a.isHeader && a.code.startsWith("11")) ||
    accounts[0];

  const deferredRevenueAccount =
    accounts.find((a) => !a.isHeader && (a.code === "2160" || a.nameAr.includes("الإيرادات المقبوضة مقدماً") || a.nameAr.includes("الإيرادات المقدمة"))) ||
    accounts.find((a) => !a.isHeader && a.code.startsWith("21")) ||
    accounts[0];

  // Specific selected accounts for the form
  const [selectedExpenseAccountId, setSelectedExpenseAccountId] = useState<string>(
    expenseAccounts[0]?.id || ""
  );
  const [selectedRevenueAccountId, setSelectedRevenueAccountId] = useState<string>(
    revenueAccounts[0]?.id || ""
  );

  const activeDef = ACCRUAL_TYPES_INFO.find((item) => item.type === selectedType)!;

  // Auto calculate when calculator is used
  const calculateFromMonths = () => {
    if (typeof totalContractAmount === "number" && totalContractAmount > 0 && totalMonths > 0) {
      const monthly = totalContractAmount / totalMonths;
      const computed = Math.round(monthly * consumedMonths * 100) / 100;
      setAmount(computed);
    }
  };

  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = Number(amount);
    if (!finalAmount || finalAmount <= 0) {
      alert("يرجى إدخال مبلغ صحيح للتسوية الجردية");
      return;
    }

    const today = date || new Date().toISOString().split("T")[0];
    const entryNum = `تسوية-${selectedType.slice(0, 3)}-${Date.now().toString().slice(-4)}`;

    let debitAcc: Account | undefined;
    let creditAcc: Account | undefined;
    let autoTitle = title;

    if (selectedType === "ACCRUED_EXPENSE") {
      debitAcc = expenseAccounts.find((a) => a.id === selectedExpenseAccountId) || expenseAccounts[0];
      creditAcc = accruedExpenseAccount;
      if (!autoTitle) autoTitle = `إثبات مصروف مستحق: ${debitAcc?.nameAr || "مصروف عام"}`;
    } else if (selectedType === "PREPAID_EXPENSE") {
      debitAcc = expenseAccounts.find((a) => a.id === selectedExpenseAccountId) || expenseAccounts[0];
      creditAcc = prepaidExpenseAccount;
      if (!autoTitle) autoTitle = `استهلاك مصروف مقدم يخص الفترة: ${debitAcc?.nameAr || "مصروف عام"}`;
    } else if (selectedType === "ACCRUED_REVENUE") {
      debitAcc = accruedRevenueAccount;
      creditAcc = revenueAccounts.find((a) => a.id === selectedRevenueAccountId) || revenueAccounts[0];
      if (!autoTitle) autoTitle = `إثبات إيراد مستحق مكتسب: ${creditAcc?.nameAr || "إيراد عام"}`;
    } else {
      // DEFERRED_REVENUE
      debitAcc = deferredRevenueAccount;
      creditAcc = revenueAccounts.find((a) => a.id === selectedRevenueAccountId) || revenueAccounts[0];
      if (!autoTitle) autoTitle = `تحقق إيراد مقبوض مقدماً للفترة: ${creditAcc?.nameAr || "إيراد عام"}`;
    }

    if (!debitAcc || !creditAcc) return;

    const costCenterObj = costCenters.find((c) => c.id === selectedCostCenterId);

    // Build Journal Entry
    const newEntry: JournalEntry = {
      id: "JE-ADJ-" + Date.now(),
      entryNumber: entryNum,
      date: today,
      isPosted: true,
      reference: `تسوية جردية (${activeDef.nameAr}) - ${autoTitle}`,
      notes: `${activeDef.nameAr}: ${autoTitle} بمبلغ ${finalAmount.toLocaleString()} ${companySettings.currency}. ${notes || activeDef.definition}`,
      lines: [
        {
          id: "L1-" + Date.now(),
          accountId: debitAcc.id,
          debit: finalAmount,
          credit: 0,
          costCenterId: selectedCostCenterId || undefined,
          note: `من حـ/ ${debitAcc.nameAr} - ${autoTitle}`,
        },
        {
          id: "L2-" + Date.now(),
          accountId: creditAcc.id,
          debit: 0,
          credit: finalAmount,
          costCenterId: selectedCostCenterId || undefined,
          note: `إلى حـ/ ${creditAcc.nameAr} - ${autoTitle}`,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    if (onSaveJournalEntry) {
      onSaveJournalEntry(newEntry);
    }

    onRecordAdjustment({
      type: selectedType,
      categoryLabel: activeDef.nameAr,
      title: autoTitle,
      targetName: `${debitAcc.nameAr} ⟵ ⟶ ${creditAcc.nameAr}`,
      amount: finalAmount,
      reason: notes || activeDef.definition,
      entryNumber: entryNum,
      debitAccountName: debitAcc.nameAr,
      creditAccountName: creditAcc.nameAr,
      costCenterName: costCenterObj?.name,
    });

    setSuccessMsg(
      `تم اعتماد وترحيل قيد تسوية (${activeDef.nameAr}) رقم [${entryNum}] بمبلغ ${finalAmount.toLocaleString()} ${companySettings.currency} بنجاح.`
    );
    setTimeout(() => setSuccessMsg(null), 5000);

    setTitle("");
    setAmount("");
    setNotes("");
    setTotalContractAmount("");
  };

  return (
    <div className="space-y-5">
      {/* 4 Cards Definitions Section (نصوص وأنواع التسويات الجردية الأربعة المطلوبة بدقة) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>أنواع التسويات الجردية الأساسية (Accrual & Deferral Types)</span>
          </h4>
          <span className="text-[11px] text-gray-500">اختر نوع التسوية الجردية لتسجيل القيد المحاسبي المعتمد</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ACCRUAL_TYPES_INFO.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedType === item.type;
            return (
              <div
                key={item.type}
                onClick={() => setSelectedType(item.type)}
                className={`p-3.5 rounded-xl border cursor-pointer transition relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? `${item.bgColor} ${item.borderColor} ring-1 ring-${item.color}-500/50 shadow-lg`
                    : "bg-[#181D26]/70 border-gray-800 hover:border-gray-700 hover:bg-[#181D26]"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${item.badgeBg}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-white text-xs leading-tight">{item.nameAr}</h5>
                        <span className="text-[10px] text-gray-400 font-mono">{item.nameEn}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <span className={`w-2 h-2 rounded-full bg-${item.color}-400 animate-pulse`} />
                    )}
                  </div>

                  {/* Exact prompt definition */}
                  <p className="text-[11px] text-gray-300 leading-relaxed font-medium bg-black/20 p-2 rounded-lg border border-gray-800/60">
                    {item.definition}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-800/80 text-[10px] space-y-1">
                  <div className="text-gray-400 flex items-center justify-between">
                    <span>مدين:</span>
                    <span className="text-gray-300 font-mono truncate max-w-[150px]">{item.typicalDebit.replace("حـ/ ", "")}</span>
                  </div>
                  <div className="text-gray-400 flex items-center justify-between">
                    <span>دائن:</span>
                    <span className="text-gray-300 font-mono truncate max-w-[150px]">{item.typicalCredit.replace("حـ/ ", "")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Adjustment Form & Live Entry Preview */}
      <form onSubmit={handleApplyAdjustment} className="bg-[#181D26] border border-gray-800 rounded-xl p-4 sm:p-5 space-y-4">
        
        {/* Banner with Active Type */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${activeDef.badgeBg}`}>
              {activeDef.nameAr}
            </span>
            <span className="text-xs text-gray-300 font-medium">
              — {activeDef.definition}
            </span>
          </div>
          <span className="text-[11px] text-gray-400 font-mono">
            {activeDef.accountingStandard}
          </span>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-500/50 rounded-lg text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          
          {/* Title / Description */}
          <div className="md:col-span-2">
            <label className="text-gray-300 font-semibold mb-1 block">
              بيان ومعاملة التسوية الجردية:
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                selectedType === "ACCRUED_EXPENSE"
                  ? "مثال: استحقاق رواتب وأجور شهر ديسمبر - استحقاق إيجار المقر..."
                  : selectedType === "PREPAID_EXPENSE"
                  ? "مثال: استهلاك قسط التأمين الشامل أو إيجار المخزن عن الفترة..."
                  : selectedType === "ACCRUED_REVENUE"
                  ? "مثال: إثبات إيراد خدمات استشارية وعقود منجزة لم تُفوتر بعد..."
                  : "مثال: تحقق إيراد دفعة مقدمة من العميل عن تسليم المرحلة الأولى..."
              }
              className="w-full bg-[#11141B] border border-gray-700 text-white rounded-lg p-2.5 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-gray-300 font-semibold mb-1 block">تاريخ التسوية الجردية:</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#11141B] border border-gray-700 text-white rounded-lg p-2.5 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Account 1: Expense or Revenue */}
          <div>
            <label className="text-gray-300 font-semibold mb-1 block">
              {selectedType === "ACCRUED_EXPENSE" || selectedType === "PREPAID_EXPENSE"
                ? "حساب المصروف المعني (قائمة الدخل):"
                : "حساب الإيراد المعني (قائمة الدخل):"}
            </label>
            {selectedType === "ACCRUED_EXPENSE" || selectedType === "PREPAID_EXPENSE" ? (
              <select
                value={selectedExpenseAccountId}
                onChange={(e) => setSelectedExpenseAccountId(e.target.value)}
                className="w-full bg-[#11141B] border border-gray-700 text-white rounded-lg p-2.5 focus:border-amber-500 focus:outline-none"
              >
                {expenseAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.nameAr}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedRevenueAccountId}
                onChange={(e) => setSelectedRevenueAccountId(e.target.value)}
                className="w-full bg-[#11141B] border border-gray-700 text-white rounded-lg p-2.5 focus:border-amber-500 focus:outline-none"
              >
                {revenueAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.nameAr}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Account 2: Adjustment Contra Account */}
          <div>
            <label className="text-gray-400 font-semibold mb-1 block">
              حساب التسوية المقابل (الميزانية العمومية):
            </label>
            <div className="w-full bg-[#11141B] border border-gray-700/70 text-gray-300 rounded-lg p-2.5 font-bold">
              {selectedType === "ACCRUED_EXPENSE" && (
                <span>{accruedExpenseAccount.code} - {accruedExpenseAccount.nameAr} (التزام متداول)</span>
              )}
              {selectedType === "PREPAID_EXPENSE" && (
                <span>{prepaidExpenseAccount.code} - {prepaidExpenseAccount.nameAr} (أصل متداول)</span>
              )}
              {selectedType === "ACCRUED_REVENUE" && (
                <span>{accruedRevenueAccount.code} - {accruedRevenueAccount.nameAr} (أصل متداول)</span>
              )}
              {selectedType === "DEFERRED_REVENUE" && (
                <span>{deferredRevenueAccount.code} - {deferredRevenueAccount.nameAr} (التزام متداول)</span>
              )}
            </div>
          </div>

          {/* Cost Center */}
          <div>
            <label className="text-gray-300 font-semibold mb-1 block">مركز التكلفة / المشروع (اختياري):</label>
            <select
              value={selectedCostCenterId}
              onChange={(e) => setSelectedCostCenterId(e.target.value)}
              className="w-full bg-[#11141B] border border-gray-700 text-white rounded-lg p-2.5 focus:border-amber-500 focus:outline-none"
            >
              <option value="">بدون مركز تكلفة محدد</option>
              {costCenters.map((cc) => (
                <option key={cc.id} value={cc.id}>
                  {cc.code} - {cc.name}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Optional Smart Amortization Calculator for Prepaids / Deferred */}
        {(selectedType === "PREPAID_EXPENSE" || selectedType === "DEFERRED_REVENUE") && (
          <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between text-gray-300">
              <span className="font-bold flex items-center gap-1.5 text-blue-300">
                <Calculator className="w-3.5 h-3.5" />
                <span>حاسبة الاستهلاك الزمني التلقائي (اختياري لاحتساب قيد الفترة):</span>
              </span>
              <button
                type="button"
                onClick={calculateFromMonths}
                className="text-[11px] bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 px-2 py-0.5 rounded border border-blue-500/30"
              >
                تطبيق الحسبة على مبلغ التسوية
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-gray-400 block mb-0.5">إجمالي المبلغ المدفوع/المقبوض مقدماً:</label>
                <input
                  type="number"
                  value={totalContractAmount}
                  onChange={(e) => setTotalContractAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="مثال: 120000"
                  className="w-full bg-[#11141B] border border-gray-700 text-white rounded p-1.5 font-mono"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-0.5">مدة العقد الإجمالية (بالشهور):</label>
                <input
                  type="number"
                  min={1}
                  value={totalMonths}
                  onChange={(e) => setTotalMonths(Number(e.target.value) || 1)}
                  className="w-full bg-[#11141B] border border-gray-700 text-white rounded p-1.5 font-mono"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-0.5">الشهور المستنفدة للفترة الحالية:</label>
                <input
                  type="number"
                  min={1}
                  max={totalMonths}
                  value={consumedMonths}
                  onChange={(e) => setConsumedMonths(Number(e.target.value) || 1)}
                  className="w-full bg-[#11141B] border border-gray-700 text-white rounded p-1.5 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Amount Input & Live Double-Entry Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center pt-2">
          <div>
            <label className="text-xs text-amber-300 font-bold mb-1 block">
              مبلغ التسوية الجردية المستحق ({companySettings.currency}):
            </label>
            <input
              type="number"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0.00"
              className="w-full bg-[#11141B] border-2 border-amber-500/60 text-white rounded-lg p-2.5 text-sm font-mono font-bold focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Live Double-Entry Box */}
          <div className="md:col-span-2 bg-[#11141B] border border-gray-800 rounded-lg p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-bold text-gray-400 border-b border-gray-800 pb-1">
              <span className="flex items-center gap-1 text-white">
                <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
                <span>معاينة القيد المحاسبي المزدوج المتولد:</span>
              </span>
              <span className="font-mono text-emerald-400">
                {amount ? Number(amount).toLocaleString() : "0"} {companySettings.currency}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div className="bg-emerald-950/30 border border-emerald-500/20 p-2 rounded">
                <span className="text-emerald-400 font-bold block">الطرف المدين (من حـ/):</span>
                <span className="text-gray-200">
                  {selectedType === "ACCRUED_EXPENSE" || selectedType === "PREPAID_EXPENSE"
                    ? (expenseAccounts.find((a) => a.id === selectedExpenseAccountId)?.nameAr || "حساب المصروف")
                    : selectedType === "ACCRUED_REVENUE"
                    ? accruedRevenueAccount.nameAr
                    : deferredRevenueAccount.nameAr}
                </span>
              </div>
              <div className="bg-blue-950/30 border border-blue-500/20 p-2 rounded">
                <span className="text-blue-400 font-bold block">الطرف الدائن (إلى حـ/):</span>
                <span className="text-gray-200">
                  {selectedType === "ACCRUED_EXPENSE"
                    ? accruedExpenseAccount.nameAr
                    : selectedType === "PREPAID_EXPENSE"
                    ? prepaidExpenseAccount.nameAr
                    : (revenueAccounts.find((a) => a.id === selectedRevenueAccountId)?.nameAr || "حساب الإيراد")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-gray-400 font-semibold mb-1 block">المبرر المستندي وملاحظات التسوية:</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أدخل أي إشارات لعقود، فواتير دورية، أو محاضر جرد..."
            className="w-full bg-[#11141B] border border-gray-700 text-white rounded-lg p-2 text-xs focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={!amount || Number(amount) <= 0}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-40 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-lg transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>اعتماد وترحيل قيد ({activeDef.nameAr}) آلياً</span>
          </button>
        </div>

      </form>
    </div>
  );
};
