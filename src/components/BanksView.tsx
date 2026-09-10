import React, { useState } from "react";
import {
  Landmark,
  Plus,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  FileCheck2,
  ArrowRightLeft,
  Scale,
  Trash2,
  Edit2,
  CreditCard,
  Building2,
} from "lucide-react";
import { Account, BankVoucher, CompanySettings, FilterParams } from "../types";
import { exportToExcel, printReport } from "../utils/export";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { VoucherPrintSignatureModal } from "./VoucherPrintSignatureModal";

interface BanksViewProps {
  accounts: Account[];
  bankVouchers: BankVoucher[];
  companySettings: CompanySettings;
  filterParams: FilterParams;
  onSaveBankVoucher: (voucher: BankVoucher) => void;
  onToggleReconcileVoucher: (voucherId: string) => void;
  onDeleteBankVoucher?: (voucherId: string) => void;
  onSaveAccount?: (account: Account) => void;
}

function getArabicMonthName(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "-";
  const months = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

export const BanksView: React.FC<BanksViewProps> = ({
  accounts,
  bankVouchers,
  companySettings,
  filterParams,
  onSaveBankVoucher,
  onToggleReconcileVoucher,
  onDeleteBankVoucher,
  onSaveAccount,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<BankVoucher | null>(null);
  const [deleteConfirmVoucher, setDeleteConfirmVoucher] = useState<{ id: string; num: string } | null>(null);

  // Bank accounts list (non-header sub-accounts)
  const bankAccounts = accounts.filter(
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

  // Bank Account Add / Edit Modal State
  const [showBankAccModal, setShowBankAccModal] = useState(false);
  const [editingBankAcc, setEditingBankAcc] = useState<Account | null>(null);
  const [accCode, setAccCode] = useState("");
  const [accNameAr, setAccNameAr] = useState("");
  const [accNameEn, setAccNameEn] = useState("");
  const [accNumber, setAccNumber] = useState("");
  const [accOpeningBalance, setAccOpeningBalance] = useState<number | "">("");

  // Form state for Vouchers
  const [editingVoucher, setEditingVoucher] = useState<BankVoucher | null>(null);
  const [manualVoucherNumber, setManualVoucherNumber] = useState(`بنك-${String(bankVouchers.length + 1).padStart(3, "0")}`);
  const [type, setType] = useState<"DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | "BANK_EXPENSE" | "BANK_INTEREST">("DEPOSIT");
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split("T")[0]);
  const [dateRef, setDateRef] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [selectedBankId, setSelectedBankId] = useState(bankAccounts[0]?.id || "1113");
  const [toBankAccountId, setToBankAccountId] = useState("");
  const [oppositeAccountId, setOppositeAccountId] = useState(accounts[0]?.id || "");
  const [checkNumber, setCheckNumber] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [notes, setNotes] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  // Reconciliation Statement Form State
  const [statementBalance, setStatementBalance] = useState<number | "">("");
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split("T")[0]);

  const currentBankBookBalance = accounts.find((a) => a.id === selectedBankId)?.balance || 0;
  const unreconciledVouchers = bankVouchers.filter((v) => v.bankAccountId === selectedBankId && !v.isReconciled);
  const reconciledVouchers = bankVouchers.filter((v) => v.bankAccountId === selectedBankId && v.isReconciled);

  // Open modal for a new voucher
  const handleOpenAddVoucher = () => {
    setEditingVoucher(null);
    setManualVoucherNumber(`بنك-${String(bankVouchers.length + 1).padStart(3, "0")}`);
    setType("DEPOSIT");
    setVoucherDate(new Date().toISOString().split("T")[0]);
    setDateRef("");
    setAmount("");
    setCheckNumber("");
    setBeneficiary("");
    setNotes("");
    setOppositeAccountId(accounts[0]?.id || "");
    setToBankAccountId(bankAccounts[1]?.id || bankAccounts[0]?.id || "");
    setShowModal(true);
  };

  // Open modal to edit existing voucher
  const handleOpenEditVoucher = (v: BankVoucher) => {
    setEditingVoucher(v);
    setManualVoucherNumber(v.voucherNumber);
    setType(v.type);
    setVoucherDate(v.date);
    setDateRef(v.dateRef || "");
    setAmount(v.amount);
    setSelectedBankId(v.bankAccountId);
    setToBankAccountId(v.toBankAccountId || "");
    setOppositeAccountId(v.oppositeAccountId || accounts[0]?.id || "");
    setCheckNumber(v.checkNumber || "");
    setBeneficiary(v.beneficiary || "");
    setNotes(v.notes || "");
    setShowModal(true);
  };

  // Open modal to add a new bank account
  const handleOpenAddBankAcc = () => {
    setEditingBankAcc(null);
    const nextNum = bankAccounts.length + 1;
    setAccCode(`11130${nextNum}`);
    setAccNameAr("");
    setAccNameEn("");
    setAccNumber("");
    setAccOpeningBalance("");
    setShowBankAccModal(true);
  };

  // Open modal to edit existing bank account
  const handleOpenEditBankAcc = (acc: Account) => {
    setEditingBankAcc(acc);
    setAccCode(acc.code);
    setAccNameAr(acc.nameAr);
    setAccNameEn(acc.nameEn || "");
    setAccNumber(acc.accountNumber || "");
    setAccOpeningBalance(acc.openingBalance ?? acc.balance ?? 0);
    setShowBankAccModal(true);
  };

  // Handle saving bank account details
  const handleSaveBankAccSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accNameAr.trim() || !onSaveAccount) return;

    const openingVal = Number(accOpeningBalance) || 0;

    const updatedAcc: Account = {
      id: editingBankAcc ? editingBankAcc.id : `acc-bank-${Date.now()}`,
      code: accCode || `11130${bankAccounts.length + 1}`,
      nameAr: accNameAr.trim(),
      nameEn: accNameEn.trim() || accNameAr.trim(),
      type: "ASSET",
      category: "CURRENT_ASSET",
      parentId: "1113",
      balance: editingBankAcc ? editingBankAcc.balance : openingVal,
      openingBalance: openingVal,
      accountNumber: accNumber.trim(),
      isActive: true,
      isHeader: false,
      level: 4,
    };

    onSaveAccount(updatedAcc);
    setSelectedBankId(updatedAcc.id);
    setShowBankAccModal(false);
  };

  const handleSubmitVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    const savedVoucher: BankVoucher = {
      id: editingVoucher ? editingVoucher.id : "BV-" + Date.now(),
      voucherNumber: manualVoucherNumber,
      type,
      date: voucherDate,
      dateRef,
      amount: Number(amount),
      bankAccountId: selectedBankId,
      toBankAccountId: type === "TRANSFER" ? toBankAccountId : undefined,
      oppositeAccountId: oppositeAccountId || undefined,
      beneficiary,
      notes,
      checkNumber,
      isReconciled: editingVoucher ? editingVoucher.isReconciled : false,
      createdAt: editingVoucher ? editingVoucher.createdAt : new Date().toISOString(),
    };

    onSaveBankVoucher(savedVoucher);
    setShowModal(false);
    setEditingVoucher(null);
    setAmount("");
    setBeneficiary("");
    setNotes("");
    setDateRef("");
  };

  // Print Bank Reconciliation Report
  const handlePrintReconciliation = () => {
    const stmtVal = Number(statementBalance) || currentBankBookBalance;
    const diff = stmtVal - currentBankBookBalance;

    const rows = bankVouchers
      .filter((v) => v.bankAccountId === selectedBankId)
      .map(
        (v) => `
        <tr>
          <td>${v.date}</td>
          <td>${v.checkNumber || "-"}</td>
          <td>${
            v.type === "DEPOSIT"
              ? "إيداع (+)"
              : v.type === "WITHDRAWAL"
              ? "سحب / شيك (-)"
              : v.type === "TRANSFER"
              ? "تحويل"
              : v.type === "BANK_EXPENSE"
              ? "مصروفات بنكية"
              : "فوائد بنكية"
          }</td>
          <td>${v.beneficiary || v.notes || "-"}</td>
          <td style="font-weight: bold;">${v.amount.toLocaleString()} ${companySettings.currency}</td>
          <td style="color: ${v.isReconciled ? "green" : "red"}; font-weight: bold;">
            ${v.isReconciled ? "مطابق بكشف البنك" : "معلق / لم يظهر بكشف البنك"}
          </td>
        </tr>
      `
      )
      .join("");

    const bankAcc = accounts.find((a) => a.id === selectedBankId);

    const html = `
      <div style="background: #f8fafc; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 20px;">
        <p><strong>حساب البنك:</strong> ${bankAcc ? `${bankAcc.code} - ${bankAcc.nameAr}${bankAcc.accountNumber ? ` (رقم الحساب / IBAN: ${bankAcc.accountNumber})` : ""}` : "البنك"}</p>
        <p><strong>تاريخ التسوية:</strong> ${statementDate}</p>
        <p><strong>رصيد الدفاتر الحالي:</strong> ${currentBankBookBalance.toLocaleString()} ${companySettings.currency}</p>
        <p><strong>رصيد كشف البنك الفعلي:</strong> ${stmtVal.toLocaleString()} ${companySettings.currency}</p>
        <p style="font-weight: bold; color: ${diff === 0 ? "green" : "red"};">
          الفارق بين الدفاتر والكشف: ${diff.toLocaleString()} ${companySettings.currency} (${diff === 0 ? "متطابق تماماً" : "يوجد معلقات"})
        </p>
      </div>

      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>رقم الشيك</th>
            <th>نوع المعاملة</th>
            <th>المستفيد / البيان والتفاصيل</th>
            <th>المبلغ</th>
            <th>حالة المطابقة</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    printReport(`مذكرة تسوية البنك - ${bankAcc?.nameAr}`, html, companySettings);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Landmark className="w-5 h-5 text-blue-400" />
            <span>إدارة البنوك وتسوية الحسابات البنكية</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            تسجيل الإيداعات والسحوبات والشيكات ومطابقة المعاملات مع كشوف الحسابات البنكية المعتمدة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSaveAccount && (
            <button
              onClick={handleOpenAddBankAcc}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
            >
              <Building2 className="w-4 h-4" />
              <span>إضافة حساب بنكي جديد</span>
            </button>
          )}
          <button
            onClick={handleOpenAddVoucher}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            <span>سند بنكي جديد</span>
          </button>
          <button
            onClick={() => setShowReconciliationModal(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
          >
            <Scale className="w-4 h-4 text-emerald-400" />
            <span>مذكرة تسوية البنك</span>
          </button>
        </div>
      </div>

      {/* Bank Account Overview Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {bankAccounts.map((b) => (
          <div
            key={b.id}
            onClick={() => setSelectedBankId(b.id)}
            className={`p-4 rounded-xl border cursor-pointer transition relative group ${
              selectedBankId === b.id
                ? "bg-blue-950/40 border-blue-500 text-white shadow-lg"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-bold text-blue-400">{b.code}</span>
              <div className="flex items-center gap-1.5">
                {onSaveAccount && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditBankAcc(b);
                    }}
                    className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition"
                    title="تعديل بيانات الحساب ورقم الحساب البنكي"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <Landmark className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            <p className="font-bold text-sm text-slate-100">{b.nameAr}</p>

            {/* Account Number / IBAN Badge */}
            <div className="mt-2 flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-800/60 px-2 py-1 rounded border border-slate-700/50 w-fit">
              <CreditCard className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>رقم الحساب / IBAN:</span>
              <span className="font-bold text-slate-200">
                {b.accountNumber ? b.accountNumber : "غير محدد"}
              </span>
            </div>

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-400">الرصيد الدفتري الحالي:</span>
              <p className="text-lg font-extrabold font-mono text-emerald-400">
                {b.balance.toLocaleString()} <span className="text-[10px] text-emerald-300/70">{companySettings.currency}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bank Vouchers & Reconciliation Match Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
          <div>
            <h3 className="font-bold text-slate-100 text-sm">حركات وحسابات البنك المختارة للمطابقة</h3>
            <span className="text-xs text-slate-400">
              انقر على خانة "حالة المطابقة" لتعليم المعاملة كمطابقة لكشف البنك الفعلي
            </span>
          </div>

          {/* Month Search Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 whitespace-nowrap">البحث بالشهور:</span>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            {filterMonth && (
              <button
                onClick={() => setFilterMonth("")}
                className="px-2 py-1 bg-slate-800 text-slate-400 hover:text-white rounded text-xs"
              >
                إلغاء
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right text-slate-300">
            <thead className="bg-slate-800 text-slate-400">
              <tr>
                <th className="p-2.5">رقم السند اليدوي</th>
                <th className="p-2.5">رقم/مرجع التاريخ</th>
                <th className="p-2.5">رقم الشيك</th>
                <th className="p-2.5">النوع</th>
                <th className="p-2.5">التاريخ</th>
                <th className="p-2.5">اسم الشهر</th>
                <th className="p-2.5">المبلغ</th>
                <th className="p-2.5">المستفيد</th>
                <th className="p-2.5">البيان</th>
                <th className="p-2.5 text-center">حالة المطابقة التسوية</th>
                <th className="p-2.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {bankVouchers
                .filter((v) => v.bankAccountId === selectedBankId && (filterMonth ? v.date.startsWith(filterMonth) : true))
                .map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40">
                    <td className="p-2.5 font-bold font-mono text-blue-400">{v.voucherNumber}</td>
                    <td className="p-2.5 font-mono text-slate-300">{v.dateRef || "-"}</td>
                    <td className="p-2.5 font-mono text-amber-400">{v.checkNumber || "-"}</td>
                    <td className="p-2.5 font-semibold">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        v.type === "DEPOSIT"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : v.type === "WITHDRAWAL"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : v.type === "TRANSFER"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : v.type === "BANK_EXPENSE"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                      }`}>
                        {v.type === "DEPOSIT"
                          ? "إيداع"
                          : v.type === "WITHDRAWAL"
                          ? "سحب/شيك"
                          : v.type === "TRANSFER"
                          ? "تحويل"
                          : v.type === "BANK_EXPENSE"
                          ? "مصروفات بنكية"
                          : "فوائد بنكية"}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono">{v.date}</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-bold">
                        {getArabicMonthName(v.date)}
                      </span>
                    </td>
                    <td className="p-2.5 font-bold text-white">
                      {v.amount.toLocaleString()} {companySettings.currency}
                    </td>
                    <td className="p-2.5">{v.beneficiary || "-"}</td>
                    <td className="p-2.5 max-w-xs truncate">{v.notes}</td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => onToggleReconcileVoucher(v.id)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold border transition ${
                          v.isReconciled
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
                        }`}
                      >
                        {v.isReconciled ? "✓ مطابق بكشف البنك" : "✗ معلق / غائب عن الكشف"}
                      </button>
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedVoucherForPrint(v)}
                          className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded transition"
                          title="طباعة السند البنكي بالتوقيع الإلكتروني للمسؤول المعتمد"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditVoucher(v)}
                          className="p-1 text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded transition"
                          title="تعديل السند البنكي"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteBankVoucher && (
                          <button
                            onClick={() => setDeleteConfirmVoucher({ id: v.id, num: v.voucherNumber })}
                            className="p-1 text-rose-400 hover:text-rose-300 hover:bg-slate-800 rounded transition"
                            title="حذف السند البنكي"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bank Voucher Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-5 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-blue-400">
                {editingVoucher ? "تعديل السند البنكي" : "إضافة سند بنكي جديد"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingVoucher(null);
                }}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitVoucher} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">نوع السند البنكي *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-semibold"
                  >
                    <option value="DEPOSIT">إيداع بنكي (+)</option>
                    <option value="WITHDRAWAL">سحب / شيك صادرة (-)</option>
                    <option value="TRANSFER">تحويل بين الحسابات</option>
                    <option value="BANK_EXPENSE">مصروفات وخدمات بنكية (-)</option>
                    <option value="BANK_INTEREST">فوائد وعوائد بنكية (+)</option>
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
                  <label className="block text-slate-400 mb-1">الحساب البنكي الرئيسي *</label>
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-semibold"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                {type === "TRANSFER" ? (
                  <div>
                    <label className="block text-slate-400 mb-1">إلى البنك المحول إليه *</label>
                    <select
                      value={toBankAccountId}
                      onChange={(e) => setToBankAccountId(e.target.value)}
                      className="w-full bg-slate-800 border border-blue-500/50 rounded p-2 text-blue-300 font-semibold"
                    >
                      {bankAccounts
                        .filter((b) => b.id !== selectedBankId)
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.code} - {b.nameAr}
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-400 mb-1">الحساب المقابل</label>
                    <select
                      value={oppositeAccountId}
                      onChange={(e) => setOppositeAccountId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-semibold"
                    >
                      <option value="">بدون اختيار</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">التاريخ *</label>
                  <input
                    type="date"
                    required
                    value={voucherDate}
                    onChange={(e) => setVoucherDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">رقم/مرجع التاريخ والتسجيل</label>
                  <input
                    type="text"
                    placeholder="TRX-2026-07..."
                    value={dateRef}
                    onChange={(e) => setDateRef(e.target.value)}
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
                  <label className="block text-slate-400 mb-1">رقم الشيك (إن وجد)</label>
                  <input
                    type="text"
                    value={checkNumber}
                    onChange={(e) => setCheckNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">المستفيد / الجهة المحول إليها *</label>
                <input
                  type="text"
                  required
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
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
                  onClick={() => {
                    setShowModal(false);
                    setEditingVoucher(null);
                  }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded transition"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded transition">
                  {editingVoucher ? "تحديث السند البنكي" : "حفظ السند البنكي"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bank Reconciliation Statement Modal */}
      {showReconciliationModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-5 text-slate-100 space-y-4">
            <h3 className="font-bold border-b border-slate-800 pb-2">إصدار مذكرة تسوية البنك الشاملة</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">تاريخ كشف البنك الفعلي</label>
                <input
                  type="date"
                  value={statementDate}
                  onChange={(e) => setStatementDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">الرصيد الفعلي الوارد بكشف البنك الورقي *</label>
                <input
                  type="number"
                  step="0.01"
                  value={statementBalance}
                  onChange={(e) => setStatementBalance(e.target.value ? Number(e.target.value) : "")}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-emerald-400 font-bold"
                  placeholder="أدخل الرصيد النهائي لكشف البنك..."
                />
              </div>

              <div className="bg-slate-800 p-3 rounded-lg space-y-1">
                <div className="flex justify-between">
                  <span>رصيد الدفاتر الحالي:</span>
                  <span className="font-bold">{currentBankBookBalance.toLocaleString()} {companySettings.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>عدد المعاملات المعلقة الغير مطابقة:</span>
                  <span className="font-bold text-amber-400">{unreconciledVouchers.length} معاملات</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReconciliationModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded"
                >
                  إغلاق
                </button>
                <button
                  onClick={handlePrintReconciliation}
                  className="px-4 py-2 bg-emerald-600 text-white rounded flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة مذكرة التسوية المعتمدة</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank Account Add / Edit Modal */}
      {showBankAccModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-5 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>{editingBankAcc ? "تعديل الحساب البنكي ورقم الحساب / IBAN" : "إضافة حساب بنكي جديد"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBankAccModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBankAccSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">كود الحساب *</label>
                  <input
                    type="text"
                    required
                    value={accCode}
                    onChange={(e) => setAccCode(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                    placeholder="111301"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">اسم البنك / الحساب (عربي) *</label>
                  <input
                    type="text"
                    required
                    value={accNameAr}
                    onChange={(e) => setAccNameAr(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-semibold"
                    placeholder="بنك مصر - الحساب الجاري"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">اسم البنك / الحساب (إنجليزي)</label>
                <input
                  type="text"
                  value={accNameEn}
                  onChange={(e) => setAccNameEn(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  placeholder="Banque Misr - Current Account"
                />
              </div>

              <div>
                <label className="block text-amber-300 font-semibold mb-1 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                  <span>رقم الحساب البنكي / IBAN *</span>
                </label>
                <input
                  type="text"
                  value={accNumber}
                  onChange={(e) => setAccNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-amber-500/50 rounded p-2 text-amber-300 font-mono font-bold focus:border-amber-400 focus:outline-none"
                  placeholder="EG6000020001000000000123456"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  * يمكنك إدخال رقم الحساب المصرفي المحلي أو رقم الآيبان الدولية (IBAN).
                </p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">الرصيد الافتتاحي للبنك</label>
                <input
                  type="number"
                  step="0.01"
                  value={accOpeningBalance}
                  onChange={(e) => setAccOpeningBalance(e.target.value ? Number(e.target.value) : "")}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-emerald-400 font-bold font-mono"
                  placeholder="0.00"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBankAccModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded transition"
                >
                  حفظ بيانات البنك
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voucher Electronic Signature & Print Modal */}
      {selectedVoucherForPrint && (
        <VoucherPrintSignatureModal
          voucher={selectedVoucherForPrint}
          voucherKind="bank"
          companySettings={companySettings}
          accounts={accounts}
          isOpen={!!selectedVoucherForPrint}
          onClose={() => setSelectedVoucherForPrint(null)}
          onUpdateVoucherSignature={(voucherId, sigData) => {
            const target = bankVouchers.find((v) => v.id === voucherId);
            if (target) {
              onSaveBankVoucher({
                ...target,
                ...sigData,
              });
            }
          }}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmVoucher}
        message={`هل أنت تأكد من حذف السند البنكي رقم (${deleteConfirmVoucher?.num}) نهائياً؟`}
        onConfirm={() => {
          if (deleteConfirmVoucher && onDeleteBankVoucher) {
            onDeleteBankVoucher(deleteConfirmVoucher.id);
            setDeleteConfirmVoucher(null);
          }
        }}
        onCancel={() => setDeleteConfirmVoucher(null)}
      />

    </div>
  );
};
