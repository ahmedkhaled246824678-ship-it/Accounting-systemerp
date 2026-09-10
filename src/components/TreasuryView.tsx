import React, { useState } from "react";
import {
  Wallet,
  Plus,
  Printer,
  FileSpreadsheet,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  UserCheck,
  Receipt,
  FileCheck,
  Search,
  Trash2,
  Calculator,
} from "lucide-react";
import {
  Account,
  CompanySettings,
  CostCenter,
  Custody,
  Advance,
  TreasuryVoucher,
  FilterParams,
  JournalEntry,
} from "../types";
import { exportToExcel, printReport } from "../utils/export";
import { numberToArabicWords } from "../utils/numberToArabicWords";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { VoucherPrintSignatureModal } from "./VoucherPrintSignatureModal";

interface TreasuryViewProps {
  accounts: Account[];
  treasuryVouchers: TreasuryVoucher[];
  custodies: Custody[];
  advances: Advance[];
  costCenters: CostCenter[];
  companySettings: CompanySettings;
  filterParams: FilterParams;
  onSaveTreasuryVoucher: (voucher: TreasuryVoucher) => void;
  onSaveCustody: (custody: Custody) => void;
  onSaveAdvance: (advance: Advance) => void;
  onSettleCustody: (custodyId: string, item: any) => void;
  onSaveJournalEntry?: (entry: JournalEntry) => void;
  onDeleteTreasuryVoucher?: (voucherId: string) => void;
  onDeleteCustody?: (custodyId: string) => void;
  onDeleteAdvance?: (advanceId: string) => void;
}

export const TreasuryView: React.FC<TreasuryViewProps> = ({
  accounts,
  treasuryVouchers,
  custodies,
  advances,
  costCenters,
  companySettings,
  filterParams,
  onSaveTreasuryVoucher,
  onSaveCustody,
  onSaveAdvance,
  onSettleCustody,
  onSaveJournalEntry,
  onDeleteTreasuryVoucher,
  onDeleteCustody,
  onDeleteAdvance,
}) => {
  const [activeTab, setActiveTab] = useState<"vouchers" | "custodies" | "advances">("vouchers");
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<TreasuryVoucher | null>(null);
  const [showCustodyModal, setShowCustodyModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; type: "VOUCHER" | "CUSTODY" | "ADVANCE" } | null>(null);

  // Custody Settlement Sheet State (شيت تسوية العهد والنقدية)
  const [showSettlementSheetModal, setShowSettlementSheetModal] = useState(false);
  const [selectedCustody, setSelectedCustody] = useState<Custody | null>(null);
  const [settlementLines, setSettlementLines] = useState<
    Array<{
      id: string;
      date: string;
      receiptNo: string;
      description: string;
      expenseAccountId: string;
      amount: number;
      costCenterId?: string;
    }>
  >([]);
  const [settlementNotes, setSettlementNotes] = useState("");

  const openSettlementSheet = (custody: Custody) => {
    setSelectedCustody(custody);
    const defaultExpenseAccount = accounts.find((a) => a.code.startsWith("5") || a.type === "EXPENSE")?.id || accounts[0]?.id || "";
    setSettlementLines([
      {
        id: `STL-${Date.now()}-1`,
        date: new Date().toISOString().split("T")[0],
        receiptNo: `REC-${Math.floor(100 + Math.random() * 900)}`,
        description: "مصروفات إدارية ونقل وتسوية",
        expenseAccountId: defaultExpenseAccount,
        amount: custody.amount - custody.settledAmount > 0 ? custody.amount - custody.settledAmount : 0,
      },
    ]);
    setSettlementNotes(`تسوية وإقفال عهدة الموظف (${custody.employeeName}) - كود ${custody.code}`);
    setShowSettlementSheetModal(true);
  };

  const addSettlementLine = () => {
    const defaultExpenseAccount = accounts.find((a) => a.code.startsWith("5") || a.type === "EXPENSE")?.id || accounts[0]?.id || "";
    setSettlementLines((prev) => [
      ...prev,
      {
        id: `STL-${Date.now()}-${prev.length + 1}`,
        date: new Date().toISOString().split("T")[0],
        receiptNo: `REC-${Math.floor(100 + Math.random() * 900)}`,
        description: "",
        expenseAccountId: defaultExpenseAccount,
        amount: 0,
      },
    ]);
  };

  const removeSettlementLine = (id: string) => {
    if (settlementLines.length === 1) return;
    setSettlementLines((prev) => prev.filter((l) => l.id !== id));
  };

  const updateSettlementLine = (id: string, field: string, val: any) => {
    setSettlementLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, [field]: val } : line))
    );
  };

  const totalSettlementExpenses = settlementLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  const handlePrintSettlementSheet = () => {
    if (!selectedCustody) return;
    const remaining = selectedCustody.amount - (selectedCustody.settledAmount + totalSettlementExpenses);

    const rowsHtml = settlementLines
      .map(
        (l, idx) => `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>${l.date}</td>
          <td>${l.receiptNo || "-"}</td>
          <td>${l.description || "-"}</td>
          <td>${accounts.find((a) => a.id === l.expenseAccountId)?.nameAr || "-"}</td>
          <td style="font-weight:bold; text-align:right;">${l.amount.toLocaleString()} ${companySettings.currency}</td>
        </tr>
      `
      )
      .join("");

    const html = `
      <div style="border: 2px solid #0f172a; padding: 20px; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; border-b: 2px solid #334155; padding-bottom: 12px; margin-bottom: 15px;">
          <div>
            <h2 style="margin:0; color:#0f172a;">شيت تسوية عهدة مالية ونقدية (Custody Settlement Sheet)</h2>
            <p style="margin:4px 0; font-size:13px; color:#475569;">اسم صاحب العهدة: <strong>${selectedCustody.employeeName}</strong> | كود العهدة: <strong>${selectedCustody.code}</strong></p>
            <p style="margin:4px 0; font-size:13px; color:#475569;">تاريخ المساندة: <strong>${selectedCustody.dateGiven}</strong> | تاريخ التسوية: <strong>${new Date().toISOString().split("T")[0]}</strong></p>
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom: 20px; font-size:12px;">
          <thead>
            <tr style="background:#0f172a; color:white;">
              <th style="padding:8px; border:1px solid #334155;">#</th>
              <th style="padding:8px; border:1px solid #334155;">التاريخ</th>
              <th style="padding:8px; border:1px solid #334155;">رقم المستند/الإيصال</th>
              <th style="padding:8px; border:1px solid #334155;">البيان والتفاصيل</th>
              <th style="padding:8px; border:1px solid #334155;">بند المصروف</th>
              <th style="padding:8px; border:1px solid #334155;">المبلغ المصروف</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background:#f1f5f9; font-weight:bold;">
              <td colspan="5" style="padding:8px; text-align:left;">إجمالي المستندات والفواتير المقدمة:</td>
              <td style="padding:8px; text-align:right; color:#dc2626;">${totalSettlementExpenses.toLocaleString()} ${companySettings.currency}</td>
            </tr>
          </tfoot>
        </table>

        <div style="display:flex; justify-content:space-between; background:#f8fafc; padding:15px; border-radius:6px; border:1px solid #e2e8f0; font-size:13px; margin-bottom:20px;">
          <div><strong>إجمالي قيمة العهدة الأصلية:</strong> ${selectedCustody.amount.toLocaleString()} ${companySettings.currency}</div>
          <div><strong>إجمالي المصروفات السابقة:</strong> ${selectedCustody.settledAmount.toLocaleString()} ${companySettings.currency}</div>
          <div><strong>صافي المتبقي وردّ الخزينة / الصرف:</strong> <span style="color:${remaining >= 0 ? "green" : "red"}; font-weight:bold;">${remaining.toLocaleString()} ${companySettings.currency}</span></div>
        </div>

        <div style="display:flex; justify-content:space-between; margin-top:40px; text-align:center; font-size:12px;">
          <div>
            <p><strong>توقيع صاحب العهدة</strong></p>
            <p style="margin-top:30px;">................................</p>
          </div>
          <div>
            <p><strong>توقيع المحاسب المسؤول</strong></p>
            <p style="margin-top:30px;">................................</p>
          </div>
          <div>
            <p><strong>اعتماد المدير المالي</strong></p>
            <p style="margin-top:30px;">................................</p>
          </div>
        </div>
      </div>
    `;

    printReport(`شيت_تسوية_عهدة_${selectedCustody.code}`, html, companySettings);
  };

  const handleSaveSettlementSheet = () => {
    if (!selectedCustody) return;

    // 1. Post automatic double entry journal entry
    const entryLines = settlementLines.map((line, idx) => {
      const acc = accounts.find((a) => a.id === line.expenseAccountId) || accounts[0];
      return {
        id: `L-STL-${Date.now()}-${idx}`,
        accountId: acc.id,
        debit: line.amount,
        credit: 0,
        description: line.description || `مصروف تسوية عهدة (${selectedCustody.employeeName}) - مستند ${line.receiptNo}`,
        costCenterId: line.costCenterId,
      };
    });

    // Credit line to Treasury / Custody Account 1111
    const treasuryAcc = accounts.find((a) => a.code === "1111") || accounts[0];
    entryLines.push({
      id: `L-STL-${Date.now()}-CR`,
      accountId: treasuryAcc.id,
      debit: 0,
      credit: totalSettlementExpenses,
      description: `تصفية وإغلاق شيت تسوية عهدة الموظف ${selectedCustody.employeeName}`,
    });

    const journalEntry: JournalEntry = {
      id: `JE-CUST-${Date.now()}`,
      entryNumber: `JV-CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split("T")[0],
      description: settlementNotes || `تسوية شيت عهدة (${selectedCustody.code}) - ${selectedCustody.employeeName}`,
      lines: entryLines,
      reference: selectedCustody.code,
      isPosted: true,
      postedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    if (onSaveJournalEntry) {
      onSaveJournalEntry(journalEntry);
    }

    // 2. Update custody settledAmount and status
    const newSettledAmount = selectedCustody.settledAmount + totalSettlementExpenses;
    const isFullySettled = newSettledAmount >= selectedCustody.amount;

    const updatedCustody: Custody = {
      ...selectedCustody,
      settledAmount: newSettledAmount,
      status: isFullySettled ? "SETTLED" : "PARTIAL",
    };

    onSaveCustody(updatedCustody);
    setShowSettlementSheetModal(false);
  };

  // Form States
  const [manualVoucherNumber, setManualVoucherNumber] = useState(`سند-${String(treasuryVouchers.length + 1).padStart(3, "0")}`);
  const [voucherType, setVoucherType] = useState<"RECEIPT" | "PAYMENT">("RECEIPT");
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState<number | "">("");
  const [treasuryAccountId, setTreasuryAccountId] = useState("1111");
  const [oppositeAccountId, setOppositeAccountId] = useState(accounts[0]?.id || "");
  const [costCenterId, setCostCenterId] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [notes, setNotes] = useState("");
  const [manualRef, setManualRef] = useState("");

  // Custody Form State
  const [custodyCode, setCustodyCode] = useState(`عهدة-${String(custodies.length + 1).padStart(2, "0")}`);
  const [custodyEmployee, setCustodyEmployee] = useState("");
  const [custodyAmount, setCustodyAmount] = useState<number | "">("");

  // Advance Form State
  const [advanceCode, setAdvanceCode] = useState(`سلفة-${String(advances.length + 1).padStart(2, "0")}`);
  const [advanceEmployee, setAdvanceEmployee] = useState("");
  const [advanceTotal, setAdvanceTotal] = useState<number | "">("");
  const [advanceMonthly, setAdvanceMonthly] = useState<number | "">("");
  const [advanceStartMonth, setAdvanceStartMonth] = useState(new Date().toISOString().slice(0, 7));
  const [advanceInstallments, setAdvanceInstallments] = useState<number | "">(5);
  const [advanceScheduleNotes, setAdvanceScheduleNotes] = useState("");

  const handleVoucherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    const newVoucher: TreasuryVoucher = {
      id: "TV-" + Date.now(),
      voucherNumber: manualVoucherNumber,
      voucherType,
      date: voucherDate,
      amount: Number(amount),
      treasuryAccountId,
      oppositeAccountId,
      costCenterId: costCenterId || undefined,
      beneficiary,
      notes,
      manualRef,
      createdAt: new Date().toISOString(),
    };

    onSaveTreasuryVoucher(newVoucher);
    setShowVoucherModal(false);
    setAmount("");
    setBeneficiary("");
    setNotes("");
  };

  const handleCustodySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custodyAmount || Number(custodyAmount) <= 0) return;

    const newCustody: Custody = {
      id: "CUST-" + Date.now(),
      code: custodyCode,
      employeeName: custodyEmployee,
      amount: Number(custodyAmount),
      dateGiven: new Date().toISOString().split("T")[0],
      status: "ACTIVE",
      settledAmount: 0,
      treasuryAccountId: "1111",
      items: [],
    };

    onSaveCustody(newCustody);
    setShowCustodyModal(false);
    setCustodyEmployee("");
    setCustodyAmount("");
  };

  const handleAdvanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceTotal || Number(advanceTotal) <= 0) return;

    const total = Number(advanceTotal);
    const installments = Number(advanceInstallments) > 0 ? Number(advanceInstallments) : 5;
    const monthly = Number(advanceMonthly) > 0 ? Number(advanceMonthly) : Math.round(total / installments);

    let startM = advanceStartMonth || new Date().toISOString().slice(0, 7);
    let parts = startM.split("-");
    let yr = parseInt(parts[0], 10) || 2026;
    let mo = parseInt(parts[1], 10) || 8;

    let endMoTotal = mo + installments - 1;
    let endYr = yr + Math.floor((endMoTotal - 1) / 12);
    let endMo = ((endMoTotal - 1) % 12) + 1;
    const endMonthStr = `${endYr}-${String(endMo).padStart(2, "0")}`;

    const newAdvance: Advance = {
      id: "ADV-" + Date.now(),
      code: advanceCode,
      employeeName: advanceEmployee,
      totalAmount: total,
      monthlyDeduction: monthly,
      remainingAmount: total,
      startDate: new Date().toISOString().split("T")[0],
      status: "ACTIVE",
      deductionStartMonth: startM,
      deductionEndMonth: endMonthStr,
      installmentsCount: installments,
      deductionScheduleNotes: advanceScheduleNotes || `تخصم على ${installments} أقساط شهرياً من ${startM} إلى ${endMonthStr}`,
    };

    onSaveAdvance(newAdvance);
    setShowAdvanceModal(false);
    setAdvanceEmployee("");
    setAdvanceTotal("");
    setAdvanceMonthly("");
    setAdvanceScheduleNotes("");
  };

  // Print Voucher Receipt
  const handlePrintVoucher = (voucher: TreasuryVoucher) => {
    const oppAcc = accounts.find((a) => a.id === voucher.oppositeAccountId);
    const amountWords = numberToArabicWords(voucher.amount, companySettings.currency);

    const html = `
      <div style="border: 2px solid #1e3a8a; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px;">
          <h2>سند ${voucher.voucherType === "RECEIPT" ? "قبض نقدية" : "صرف نقدية"}</h2>
          <h3>رقم السند اليدوي: <span style="color: #2563eb;">${voucher.voucherNumber}</span></h3>
        </div>

        <table style="width: 100%; font-size: 14px; line-height: 2;">
          <tr>
            <td style="width: 150px; font-weight: bold;">التاريخ:</td>
            <td>${voucher.date}</td>
            <td style="font-weight: bold;">المرجع اليدوي:</td>
            <td>${voucher.manualRef || "-"}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">المبلغ بالأرقام:</td>
            <td style="font-size: 18px; font-weight: bold; color: #16a34a;">${voucher.amount.toLocaleString()} ${companySettings.currency}</td>
            <td style="font-weight: bold;">المستفيد / المسلم:</td>
            <td>${voucher.beneficiary || "-"}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">المبلغ بالحروف:</td>
            <td colspan="3" style="font-style: italic; background: #f8fafc; padding: 4px 8px;">${amountWords}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">الحساب المقابل:</td>
            <td colspan="3">${oppAcc ? `${oppAcc.code} - ${oppAcc.nameAr}` : "-"}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">البيان الشارح:</td>
            <td colspan="3">${voucher.notes}</td>
          </tr>
        </table>
      </div>
    `;

    printReport(`سند ${voucher.voucherType === "RECEIPT" ? "قبض" : "صرف"} - ${voucher.voucherNumber}`, html, companySettings);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            <span>حركة الخزينة والعهد المالية والسلف</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            إدارة سندات القبض والصرف، تسوية عهد الموظفين وسلف العاملين مع الطباعة المباشرة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVoucherModal(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            <span>سند جديد (قبض / صرف)</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center border-b border-slate-800 space-x-4 space-x-reverse text-xs font-semibold">
        <button
          onClick={() => setActiveTab("vouchers")}
          className={`pb-2 transition ${activeTab === "vouchers" ? "text-emerald-400 border-b-2 border-emerald-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          سندات الخزينة (قبض / صرف)
        </button>
        <button
          onClick={() => setActiveTab("custodies")}
          className={`pb-2 transition ${activeTab === "custodies" ? "text-emerald-400 border-b-2 border-emerald-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          العهد المالية والتصفية ({custodies.length})
        </button>
        <button
          onClick={() => setActiveTab("advances")}
          className={`pb-2 transition ${activeTab === "advances" ? "text-emerald-400 border-b-2 border-emerald-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          سلف الموظفين والقروض ({advances.length})
        </button>
      </div>

      {/* Treasury Totals KPI Cards: Total Debit (Receipts), Total Credit (Payments), Net Balance */}
      {(() => {
        const totalReceipts = treasuryVouchers
          .filter((v) => v.voucherType === "RECEIPT")
          .reduce((sum, v) => sum + v.amount, 0);

        const totalPayments = treasuryVouchers
          .filter((v) => v.voucherType === "PAYMENT")
          .reduce((sum, v) => sum + v.amount, 0);

        const treasurySubAccounts = accounts.filter(
          (a) => !a.isHeader && (a.code.startsWith("1111") || a.nameAr.includes("خزينة") || a.nameAr.includes("الصندوق"))
        );
        const currentBalance =
          treasurySubAccounts.length > 0
            ? treasurySubAccounts.reduce((sum, a) => sum + (a.balance || 0), 0)
            : totalReceipts - totalPayments;

        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  إجمالي مقبوضات الخزينة (مدين)
                </span>
                <p className="text-xl font-extrabold text-emerald-400 mt-1">
                  {totalReceipts.toLocaleString()} {companySettings.currency}
                </p>
              </div>
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 text-xs font-bold">
                {treasuryVouchers.filter((v) => v.voucherType === "RECEIPT").length} سند قبض
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <ArrowDownLeft className="w-4 h-4 text-rose-400" />
                  إجمالي مدفوعات الخزينة (دائن)
                </span>
                <p className="text-xl font-extrabold text-rose-400 mt-1">
                  {totalPayments.toLocaleString()} {companySettings.currency}
                </p>
              </div>
              <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 text-xs font-bold">
                {treasuryVouchers.filter((v) => v.voucherType === "PAYMENT").length} سند صرف
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Wallet className="w-4 h-4 text-blue-400" />
                  رصيد الخزينة الرئيسي الصافي
                </span>
                <p className={`text-xl font-extrabold mt-1 ${currentBalance >= 0 ? "text-blue-400" : "text-rose-400"}`}>
                  {currentBalance.toLocaleString()} {companySettings.currency}
                </p>
              </div>
              <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 text-xs font-bold">
                صافي النقدية
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tab Content: Vouchers */}
      {activeTab === "vouchers" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right text-slate-300">
              <thead className="bg-slate-800 text-slate-400">
                <tr>
                  <th className="p-2.5">رقم السند</th>
                  <th className="p-2.5">النوع</th>
                  <th className="p-2.5">التاريخ</th>
                  <th className="p-2.5">المبلغ</th>
                  <th className="p-2.5">المستفيد / الجهة</th>
                  <th className="p-2.5">الحساب المقابل</th>
                  <th className="p-2.5">البيان</th>
                  <th className="p-2.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {treasuryVouchers.map((v) => {
                  const oppAcc = accounts.find((a) => a.id === v.oppositeAccountId);
                  return (
                    <tr key={v.id} className="hover:bg-slate-800/40">
                      <td className="p-2.5 font-bold font-mono text-blue-400">{v.voucherNumber}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            v.voucherType === "RECEIPT"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {v.voucherType === "RECEIPT" ? "سند قبض" : "سند صرف"}
                        </span>
                      </td>
                      <td className="p-2.5">{v.date}</td>
                      <td className="p-2.5 font-bold text-white">
                        {v.amount.toLocaleString()} {companySettings.currency}
                      </td>
                      <td className="p-2.5">{v.beneficiary || "-"}</td>
                      <td className="p-2.5 text-slate-400">{oppAcc ? oppAcc.nameAr : "-"}</td>
                      <td className="p-2.5 max-w-xs truncate">{v.notes}</td>
                      <td className="p-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedVoucherForPrint(v)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded transition flex items-center gap-1"
                            title="طباعة السند بالتوقيع الإلكتروني للمسؤول المعتمد"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteTreasuryVoucher && (
                            <button
                              onClick={() => setDeleteConfirm({ id: v.id, name: `سند الخزينة (${v.voucherNumber})`, type: "VOUCHER" })}
                              className="p-1.5 bg-slate-800 hover:bg-rose-900/50 text-rose-400 rounded transition"
                              title="حذف السند"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Custodies */}
      {activeTab === "custodies" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCustodyModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>تسليم عهدة جديدة</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {custodies.map((c) => (
              <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <div>
                    <span className="font-bold text-white text-sm">{c.employeeName}</span>
                    <p className="text-[11px] text-slate-400">{c.code} - بتاريخ: {c.dateGiven}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-emerald-400">
                      {c.amount.toLocaleString()} {companySettings.currency}
                    </span>
                    {onDeleteCustody && (
                      <button
                        onClick={() => setDeleteConfirm({ id: c.id, name: `العهدة (${c.code} - ${c.employeeName})`, type: "CUSTODY" })}
                        className="p-1 text-rose-400 hover:bg-slate-800 rounded transition"
                        title="حذف العهدة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-300">{c.notes}</p>

                <div className="bg-slate-800/50 p-2.5 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>المبلغ المصروف بالتصفية:</span>
                    <span className="text-amber-400 font-bold">{c.settledAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>المتبقي بالعهدة:</span>
                    <span className="text-emerald-400 font-bold">{(c.amount - c.settledAmount).toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => openSettlementSheet(c)}
                  className="w-full mt-2 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Receipt className="w-4 h-4" />
                  <span>عمل شيت تسوية وتصفية العهدة (قيد آلي + PDF)</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Advances */}
      {activeTab === "advances" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span>شيت جدول سلف وقروض العاملين ومواعيد الاستقطاع الشهري</span>
            </h3>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const data = advances.map((a) => ({
                    "كود السلفة": a.code,
                    "اسم الموظف": a.employeeName,
                    "إجمالي السلفة": a.totalAmount,
                    "الخصم الشهري": a.monthlyDeduction,
                    "عدد الأقساط": a.installmentsCount || Math.ceil(a.totalAmount / (a.monthlyDeduction || 1)),
                    "بداية الخصم": a.deductionStartMonth || a.startDate,
                    "نهاية الخصم": a.deductionEndMonth || "-",
                    "مواعيد وسياق الخصم": a.deductionScheduleNotes || "-",
                    "المتبقي": a.remainingAmount,
                    "الحالة": a.status === "ACTIVE" ? "سارية الخصم" : "مكتملة",
                  }));
                  exportToExcel(data, `شيت_سلف_ومواعيد_خصم_الموظفين_${companySettings.companyName}`);
                }}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>تصدير إكسل</span>
              </button>

              <button
                onClick={() => {
                  const rows = advances.map((a) => `
                    <tr>
                      <td style="font-weight:bold; color:#1e3a8a;">${a.code}</td>
                      <td>${a.employeeName}</td>
                      <td style="font-weight:bold;">${a.totalAmount.toLocaleString()} ${companySettings.currency}</td>
                      <td style="color:#b45309; font-weight:bold;">${a.monthlyDeduction.toLocaleString()} ${companySettings.currency}</td>
                      <td>${a.installmentsCount || Math.ceil(a.totalAmount / (a.monthlyDeduction || 1))} قسط</td>
                      <td>${a.deductionStartMonth || a.startDate}</td>
                      <td>${a.deductionEndMonth || "-"}</td>
                      <td style="color:#dc2626; font-weight:bold;">${a.remainingAmount.toLocaleString()} ${companySettings.currency}</td>
                      <td>${a.deductionScheduleNotes || "-"}</td>
                    </tr>
                  `).join("");

                  const html = `
                    <div style="margin-bottom:12px; font-weight:bold; font-size:15px; color:#1e3a8a;">
                      شيت سلف وقروض الموظفين ومواعيد الخصم الاستقطاعي
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>الكود</th>
                          <th>اسم الموظف</th>
                          <th>إجمالي السلفة</th>
                          <th>الخصم الشهري</th>
                          <th>عدد الأقساط</th>
                          <th>بداية الخصم</th>
                          <th>نهاية الخصم</th>
                          <th>المتبقي</th>
                          <th>مواعيد وملاحظات الخصم</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${rows}
                      </tbody>
                    </table>
                  `;
                  printReport("شيت سلف وقروض الموظفين ومواعيد الخصم", html, companySettings);
                }}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
              >
                <Printer className="w-4 h-4 text-blue-400" />
                <span>طباعة الشيت</span>
              </button>

              <button
                onClick={() => setShowAdvanceModal(true)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
              >
                <Plus className="w-4 h-4" />
                <span>إصدار سلفة جديدة</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-x-auto">
            <table className="w-full text-xs text-right text-slate-300">
              <thead className="bg-slate-800 text-slate-400">
                <tr>
                  <th className="p-2.5">رقم السلفة</th>
                  <th className="p-2.5">اسم الموظف</th>
                  <th className="p-2.5">إجمالي السلفة</th>
                  <th className="p-2.5">الخصم الشهري</th>
                  <th className="p-2.5">الأقساط</th>
                  <th className="p-2.5">بداية الخصم</th>
                  <th className="p-2.5">نهاية الخصم</th>
                  <th className="p-2.5">المتبقي</th>
                  <th className="p-2.5">مواعيد وسياق الخصم</th>
                  <th className="p-2.5">الحالة</th>
                  <th className="p-2.5 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {advances.map((adv) => {
                  const instCount = adv.installmentsCount || (adv.monthlyDeduction > 0 ? Math.ceil(adv.totalAmount / adv.monthlyDeduction) : 1);
                  return (
                    <tr key={adv.id} className="hover:bg-slate-800/40">
                      <td className="p-2.5 font-bold text-blue-400 font-mono">{adv.code}</td>
                      <td className="p-2.5 font-semibold text-white">{adv.employeeName}</td>
                      <td className="p-2.5 font-bold text-emerald-400">{adv.totalAmount.toLocaleString()} {companySettings.currency}</td>
                      <td className="p-2.5 text-amber-400 font-bold">{adv.monthlyDeduction.toLocaleString()} {companySettings.currency}</td>
                      <td className="p-2.5 font-semibold text-blue-300">{instCount} قسط</td>
                      <td className="p-2.5 font-mono text-slate-300">{adv.deductionStartMonth || adv.startDate}</td>
                      <td className="p-2.5 font-mono text-slate-300">{adv.deductionEndMonth || "-"}</td>
                      <td className="p-2.5 text-rose-400 font-bold">{adv.remainingAmount.toLocaleString()} {companySettings.currency}</td>
                      <td className="p-2.5 text-slate-400 text-[11px] max-w-[180px] truncate">{adv.deductionScheduleNotes || `خصم ${adv.monthlyDeduction} شهرياً`}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${adv.status === "COMPLETED" ? "bg-slate-800 text-slate-400" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                          {adv.status === "COMPLETED" ? "مكتملة" : "سارية الخصم"}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        {onDeleteAdvance && (
                          <button
                            onClick={() => setDeleteConfirm({ id: adv.id, name: `سلفة الموظف (${adv.employeeName})`, type: "ADVANCE" })}
                            className="p-1 text-rose-400 hover:bg-slate-800 rounded transition"
                            title="حذف السلفة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Voucher Modal */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-5 text-slate-100 space-y-4">
            <h3 className="font-bold border-b border-slate-800 pb-2">إضافة سند خزينة جديد</h3>
            <form onSubmit={handleVoucherSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">نوع السند *</label>
                  <select
                    value={voucherType}
                    onChange={(e) => setVoucherType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="RECEIPT">سند قبض (وارد الخزينة)</option>
                    <option value="PAYMENT">سند صرف (منصرف الخزينة)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">رقم السند اليدوي *</label>
                  <input
                    type="text"
                    required
                    value={manualVoucherNumber}
                    onChange={(e) => setManualVoucherNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">المبلغ *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-emerald-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">المستفيد / المسلم *</label>
                  <input
                    type="text"
                    required
                    value={beneficiary}
                    onChange={(e) => setBeneficiary(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">الحساب المقابل *</label>
                <select
                  value={oppositeAccountId}
                  onChange={(e) => setOppositeAccountId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                >
                  {accounts
                    .filter((a) => !a.isHeader)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.nameAr}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">البيان *</label>
                <input
                  type="text"
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded">
                  حفظ السند
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custody Modal */}
      {showCustodyModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-5 text-slate-100 space-y-4">
            <h3 className="font-bold border-b border-slate-800 pb-2">تسليم عهدة جديدة للموظف</h3>
            <form onSubmit={handleCustodySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">كود العهدة</label>
                <input
                  type="text"
                  value={custodyCode}
                  onChange={(e) => setCustodyCode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">اسم الموظف المستلم *</label>
                <input
                  type="text"
                  required
                  value={custodyEmployee}
                  onChange={(e) => setCustodyEmployee(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">مبلغ العهدة *</label>
                <input
                  type="number"
                  required
                  value={custodyAmount}
                  onChange={(e) => setCustodyAmount(e.target.value ? Number(e.target.value) : "")}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-emerald-400 font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCustodyModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
                  حفظ وتسليم العهدة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advance Modal */}
      {showAdvanceModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-5 text-slate-100 space-y-4">
            <h3 className="font-bold border-b border-slate-800 pb-2">إصدار سلفة جديدة للموظف</h3>
            <form onSubmit={handleAdvanceSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">اسم الموظف *</label>
                <input
                  type="text"
                  required
                  value={advanceEmployee}
                  onChange={(e) => setAdvanceEmployee(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">مبلغ السلفة الإجمالي *</label>
                  <input
                    type="number"
                    required
                    value={advanceTotal}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : "";
                      setAdvanceTotal(val);
                      if (typeof val === "number" && typeof advanceInstallments === "number" && advanceInstallments > 0) {
                        setAdvanceMonthly(Math.round(val / advanceInstallments));
                      }
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-emerald-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">عدد الأقساط الشهرية *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={advanceInstallments}
                    onChange={(e) => {
                      const inst = e.target.value ? Number(e.target.value) : "";
                      setAdvanceInstallments(inst);
                      if (typeof advanceTotal === "number" && typeof inst === "number" && inst > 0) {
                        setAdvanceMonthly(Math.round(advanceTotal / inst));
                      }
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-blue-400 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">الخصم الشهري المحدد *</label>
                  <input
                    type="number"
                    required
                    value={advanceMonthly}
                    onChange={(e) => setAdvanceMonthly(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-amber-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">بداية الخصم (شهر) *</label>
                  <input
                    type="month"
                    required
                    value={advanceStartMonth}
                    onChange={(e) => setAdvanceStartMonth(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">جدول مواعيد وسياق الخصم (ملاحظات)</label>
                <input
                  type="text"
                  placeholder="مثال: تخصم 1,000 ج.م من راتب منتصف كل شهر..."
                  value={advanceScheduleNotes}
                  onChange={(e) => setAdvanceScheduleNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
                  إصدار السلفة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custody Settlement Sheet Modal (شيت تسوية العهد والنقدية) */}
      {showSettlementSheetModal && selectedCustody && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-xs">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">شيت تسوية وإقفال عهدة موظف / نقدية</h3>
                  <p className="text-[11px] text-slate-400">
                    صاحب العهدة: <strong className="text-blue-400">{selectedCustody.employeeName}</strong> ({selectedCustody.code}) - مبلغ العهدة الأصلية: <strong className="text-emerald-400">{selectedCustody.amount.toLocaleString()} {companySettings.currency}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettlementSheetModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <div className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="font-semibold text-slate-300">جدول الفواتير والمستندات المؤيدة للمصروفات</span>
                <button
                  type="button"
                  onClick={addSettlementLine}
                  className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded flex items-center gap-1 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة بند / إيصال مصروف</span>
                </button>
              </div>

              {/* Expense Receipts Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-right text-slate-300">
                  <thead className="bg-slate-800 text-slate-400 text-[11px]">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">التاريخ</th>
                      <th className="p-2">رقم الإيصال / الفاتورة</th>
                      <th className="p-2">البيان والتفاصيل</th>
                      <th className="p-2">حساب المصروف</th>
                      <th className="p-2">المبلغ</th>
                      <th className="p-2 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {settlementLines.map((line, idx) => (
                      <tr key={line.id} className="hover:bg-slate-800/40">
                        <td className="p-2 font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-2">
                          <input
                            type="date"
                            value={line.date}
                            onChange={(e) => updateSettlementLine(line.id, "date", e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded p-1 text-white text-[11px]"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="REC-001"
                            value={line.receiptNo}
                            onChange={(e) => updateSettlementLine(line.id, "receiptNo", e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded p-1 text-blue-400 font-mono text-[11px] w-24"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="بيان التكلفة..."
                            value={line.description}
                            onChange={(e) => updateSettlementLine(line.id, "description", e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded p-1 text-white text-[11px] w-full"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={line.expenseAccountId}
                            onChange={(e) => updateSettlementLine(line.id, "expenseAccountId", e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded p-1 text-white text-[11px] max-w-[150px]"
                          >
                            {accounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.code} - {acc.nameAr}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            value={line.amount}
                            onChange={(e) => updateSettlementLine(line.id, "amount", Number(e.target.value))}
                            className="bg-slate-950 border border-slate-700 rounded p-1 text-emerald-400 font-bold text-[11px] w-24 text-right"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeSettlementLine(line.id)}
                            className="p-1 text-rose-400 hover:bg-slate-800 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Settlement Totals Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[11px]">مبلغ العهدة المتبقي قبل التسوية:</span>
                  <span className="text-base font-bold text-slate-200">
                    {(selectedCustody.amount - selectedCustody.settledAmount).toLocaleString()} {companySettings.currency}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">إجمالي فواتير ومصروفات التسوية:</span>
                  <span className="text-base font-bold text-rose-400">
                    {totalSettlementExpenses.toLocaleString()} {companySettings.currency}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">الرصيد المتبقي لإعادة التسليم / الصرف:</span>
                  <span className="text-base font-bold text-emerald-400">
                    {(
                      selectedCustody.amount -
                      (selectedCustody.settledAmount + totalSettlementExpenses)
                    ).toLocaleString()}{" "}
                    {companySettings.currency}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">ملاحظات وقرار لجنة التسوية</label>
                <textarea
                  rows={2}
                  value={settlementNotes}
                  onChange={(e) => setSettlementNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap justify-between items-center gap-2">
              <button
                type="button"
                onClick={handlePrintSettlementSheet}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded font-semibold transition shadow"
              >
                <FileText className="w-4 h-4" />
                <span>تصدير وطباعة شيت التسوية (PDF)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettlementSheetModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettlementSheet}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold transition flex items-center gap-1.5 shadow"
                >
                  <Receipt className="w-4 h-4" />
                  <span>اعتماد وإقفال التسوية (رحّل القيد)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voucher Electronic Signature & Print Modal */}
      {selectedVoucherForPrint && (
        <VoucherPrintSignatureModal
          voucher={selectedVoucherForPrint}
          voucherKind="treasury"
          companySettings={companySettings}
          accounts={accounts}
          isOpen={!!selectedVoucherForPrint}
          onClose={() => setSelectedVoucherForPrint(null)}
          onUpdateVoucherSignature={(voucherId, sigData) => {
            const target = treasuryVouchers.find((v) => v.id === voucherId);
            if (target) {
              onSaveTreasuryVoucher({
                ...target,
                ...sigData,
              });
            }
          }}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirm}
        message={`هل أنت تأكد من حذف (${deleteConfirm?.name}) نهائياً؟`}
        onConfirm={() => {
          if (deleteConfirm) {
            if (deleteConfirm.type === "VOUCHER" && onDeleteTreasuryVoucher) {
              onDeleteTreasuryVoucher(deleteConfirm.id);
            } else if (deleteConfirm.type === "CUSTODY" && onDeleteCustody) {
              onDeleteCustody(deleteConfirm.id);
            } else if (deleteConfirm.type === "ADVANCE" && onDeleteAdvance) {
              onDeleteAdvance(deleteConfirm.id);
            }
            setDeleteConfirm(null);
          }
        }}
        onCancel={() => setDeleteConfirm(null)}
      />

    </div>
  );
};
