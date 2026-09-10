import React, { useState } from "react";
import {
  Users,
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Printer,
  FileSpreadsheet,
  FileText,
  Phone,
  Mail,
  MapPin,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  FileCheck,
  Calculator,
} from "lucide-react";
import { Partner, CompanySettings, Account, JournalEntry } from "../types";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { printReport, exportToExcel } from "../utils/export";

interface PartnersViewProps {
  partners: Partner[];
  accounts: Account[];
  journalEntries?: JournalEntry[];
  companySettings: CompanySettings;
  onSavePartner: (partner: Partner) => void;
  onDeletePartner: (id: string) => void;
  onSaveJournalEntry?: (entry: JournalEntry) => void;
}

export const PartnersView: React.FC<PartnersViewProps> = ({
  partners,
  accounts,
  journalEntries = [],
  companySettings,
  onSavePartner,
  onDeletePartner,
  onSaveJournalEntry,
}) => {
  const [filterType, setFilterType] = useState<"ALL" | "CUSTOMER" | "SUPPLIER">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [statementPartner, setStatementPartner] = useState<Partner | null>(null);
  const [deleteConfirmPartner, setDeleteConfirmPartner] = useState<{ id: string; name: string } | null>(null);

  // Invoice Modal State
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invPartnerId, setInvPartnerId] = useState("");
  const [invType, setInvType] = useState<"CUSTOMER" | "SUPPLIER">("CUSTOMER");
  const [invNumber, setInvNumber] = useState("");
  const [invDate, setInvDate] = useState(new Date().toISOString().split("T")[0]);
  const [invNetAmount, setInvNetAmount] = useState<number | "">(0);
  const [invVatRate, setInvVatRate] = useState<number>(14);
  const [invOppAccountId, setInvOppAccountId] = useState("");
  const [invNotes, setInvNotes] = useState("");
  const [createdInvoiceSuccess, setCreatedInvoiceSuccess] = useState<any | null>(null);

  // Form State
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"CUSTOMER" | "SUPPLIER">("CUSTOMER");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [commercialRegister, setCommercialRegister] = useState("");
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState<number | "">(0);
  const [accountId, setAccountId] = useState("");
  const [notes, setNotes] = useState("");

  const openInvoiceModal = (targetPartner?: Partner) => {
    const pType = targetPartner ? targetPartner.type : "CUSTOMER";
    setInvType(pType);
    setInvPartnerId(targetPartner ? targetPartner.id : partners.find((p) => p.type === pType)?.id || "");
    const randNum = Math.floor(1000 + Math.random() * 9000);
    setInvNumber(`INV-${new Date().getFullYear()}-${randNum}`);
    setInvDate(new Date().toISOString().split("T")[0]);
    setInvNetAmount(0);
    setInvVatRate(14);
    setInvNotes("");
    setCreatedInvoiceSuccess(null);

    // Default opp account: Sales (4110) or Purchases/Expenses (5110)
    const defaultAcc = pType === "CUSTOMER" 
      ? accounts.find((a) => a.code.startsWith("4") || a.type === "REVENUE")?.id || ""
      : accounts.find((a) => a.code.startsWith("5") || a.type === "EXPENSE")?.id || "";
    setInvOppAccountId(defaultAcc);

    setShowInvoiceModal(true);
  };

  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const partner = partners.find((p) => p.id === invPartnerId);
    if (!partner) return;

    const net = Number(invNetAmount) || 0;
    if (net <= 0) return;

    const vat = (net * invVatRate) / 100;
    const total = net + vat;

    // Find partner account (or fall back to Receivables 1121 / Payables 2111)
    const partnerAcc =
      accounts.find((a) => a.id === partner.accountId) ||
      accounts.find((a) => a.code === (partner.type === "CUSTOMER" ? "1121" : "2111")) ||
      accounts[0];

    const oppAcc = accounts.find((a) => a.id === invOppAccountId) || accounts[0];
    const vatAcc = accounts.find((a) => a.code === "2120") || accounts[0];

    // Build Journal Entry Lines
    const entryLines = [];
    if (partner.type === "CUSTOMER") {
      entryLines.push({
        id: `L-${Date.now()}-1`,
        accountId: partnerAcc.id,
        debit: total,
        credit: 0,
        description: `فاتورة مبيعات رقم ${invNumber} - ${partner.name}`,
      });
      entryLines.push({
        id: `L-${Date.now()}-2`,
        accountId: oppAcc.id,
        debit: 0,
        credit: net,
        description: `إيرادات مبيعات فاتورة رقم ${invNumber}`,
      });
      if (vat > 0) {
        entryLines.push({
          id: `L-${Date.now()}-3`,
          accountId: vatAcc.id,
          debit: 0,
          credit: vat,
          description: `ضريبة قيمة مضافة (14%) فاتورة ${invNumber}`,
        });
      }
    } else {
      entryLines.push({
        id: `L-${Date.now()}-1`,
        accountId: oppAcc.id,
        debit: net,
        credit: 0,
        description: `فاتورة مشتريات رقم ${invNumber} - ${partner.name}`,
      });
      if (vat > 0) {
        entryLines.push({
          id: `L-${Date.now()}-2`,
          accountId: vatAcc.id,
          debit: vat,
          credit: 0,
          description: `ضريبة قيمة مضافة مشتريات (14%) فاتورة ${invNumber}`,
        });
      }
      entryLines.push({
        id: `L-${Date.now()}-3`,
        accountId: partnerAcc.id,
        debit: 0,
        credit: total,
        description: `مستحقات مورد فاتورة رقم ${invNumber}`,
      });
    }

    const journalEntry: JournalEntry = {
      id: `JE-INV-${Date.now()}`,
      entryNumber: `JV-${Math.floor(1000 + Math.random() * 9000)}`,
      date: invDate,
      description: `قيد فاتورة ${partner.type === "CUSTOMER" ? "عميل" : "مورد"} رقم (${invNumber}) - ${partner.name}`,
      lines: entryLines,
      reference: invNumber,
      isPosted: true,
      postedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    if (onSaveJournalEntry) {
      onSaveJournalEntry(journalEntry);
    }

    // Update Partner balance
    const updatedPartner: Partner = {
      ...partner,
      balance: partner.balance + total,
    };
    onSavePartner(updatedPartner);

    const invoiceData = {
      invNumber,
      invDate,
      partnerName: partner.name,
      partnerType: partner.type,
      taxNumber: partner.taxNumber,
      address: partner.address,
      netAmount: net,
      vatAmount: vat,
      totalAmount: total,
      notes: invNotes,
      oppAccName: oppAcc.nameAr,
    };

    setCreatedInvoiceSuccess(invoiceData);
  };

  const handlePrintInvoice = (inv: any) => {
    const html = `
      <div style="border: 2px solid #0f172a; padding: 20px; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; border-b: 2px solid #334155; padding-bottom: 12px; margin-bottom: 20px;">
          <div>
            <h2 style="margin:0; color:#0f172a;">${inv.partnerType === "CUSTOMER" ? "فاتورة مبيعات ضريبية" : "فاتورة مشتريات ضريبية"}</h2>
            <p style="margin: 4px 0; font-size: 13px; color: #475569;">رقم الفاتورة: <strong>${inv.invNumber}</strong></p>
            <p style="margin: 4px 0; font-size: 13px; color: #475569;">تاريخ الفاتورة: <strong>${inv.invDate}</strong></p>
          </div>
          <div style="text-align: left;">
            <p style="margin: 2px 0; font-weight: bold;">الجهة: ${inv.partnerName}</p>
            <p style="margin: 2px 0; font-size: 12px;">الرقم الضريبي: ${inv.taxNumber || "-"}</p>
            <p style="margin: 2px 0; font-size: 12px;">العنوان: ${inv.address || "-"}</p>
          </div>
        </div>

        <table style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background:#0f172a; color:white;">
              <th style="padding:10px; border:1px solid #334155;">البيان والتفاصيل</th>
              <th style="padding:10px; border:1px solid #334155;">الحساب</th>
              <th style="padding:10px; border:1px solid #334155;">صافي المبلغ</th>
              <th style="padding:10px; border:1px solid #334155;">ضريبة VAT (14%)</th>
              <th style="padding:10px; border:1px solid #334155;">الإجمالي الشامل</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:10px; border:1px solid #cbd5e1;">${inv.notes || (inv.partnerType === "CUSTOMER" ? "توريدات مبيعات حسب العقد" : "مشتريات خدمات ومواد")}</td>
              <td style="padding:10px; border:1px solid #cbd5e1;">${inv.oppAccName}</td>
              <td style="padding:10px; border:1px solid #cbd5e1; text-align:right;">${inv.netAmount.toLocaleString()} ${companySettings.currency}</td>
              <td style="padding:10px; border:1px solid #cbd5e1; text-align:right; color:#2563eb;">${inv.vatAmount.toLocaleString()} ${companySettings.currency}</td>
              <td style="padding:10px; border:1px solid #cbd5e1; text-align:right; font-weight:bold; color:#16a34a;">${inv.totalAmount.toLocaleString()} ${companySettings.currency}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:20px; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; font-size:12px;">
          <p style="margin:0; font-weight:bold; color:#1e293b;">تم رحيل هذه الفاتورة تلقائياً إلى قيد اليومية وحساب الأستاذ العام للحسابات المختصة.</p>
        </div>
      </div>
    `;

    printReport(`فاتورة_${inv.invNumber}`, html, companySettings);
  };

  const openAddModal = () => {
    setEditingPartner(null);
    const count = partners.length + 1;
    setCode(`P-${String(count).padStart(4, "0")}`);
    setName("");
    setType("CUSTOMER");
    setPhone("");
    setEmail("");
    setTaxNumber("");
    setCommercialRegister("");
    setAddress("");
    setBalance(0);
    setAccountId("");
    setNotes("");
    setShowModal(true);
  };

  const openEditModal = (p: Partner) => {
    setEditingPartner(p);
    setCode(p.code);
    setName(p.name);
    setType(p.type);
    setPhone(p.phone || "");
    setEmail(p.email || "");
    setTaxNumber(p.taxNumber || "");
    setCommercialRegister(p.commercialRegister || "");
    setAddress(p.address || "");
    setBalance(p.balance);
    setAccountId(p.accountId || "");
    setNotes(p.notes || "");
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const partnerData: Partner = {
      id: editingPartner ? editingPartner.id : "P-" + Date.now(),
      code: code || `P-${Date.now()}`,
      name: name.trim(),
      type,
      phone,
      email,
      taxNumber,
      commercialRegister,
      address,
      balance: Number(balance) || 0,
      accountId,
      notes,
      createdAt: editingPartner ? editingPartner.createdAt : new Date().toISOString(),
    };

    onSavePartner(partnerData);
    setShowModal(false);
  };

  const filteredPartners = partners.filter((p) => {
    const matchesType = filterType === "ALL" || p.type === filterType;
    const matchesQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.phone && p.phone.includes(searchQuery)) ||
      (p.taxNumber && p.taxNumber.includes(searchQuery));
    return matchesType && matchesQuery;
  });

  const totalCustomersBalance = partners
    .filter((p) => p.type === "CUSTOMER")
    .reduce((acc, p) => acc + p.balance, 0);

  const totalSuppliersBalance = partners
    .filter((p) => p.type === "SUPPLIER")
    .reduce((acc, p) => acc + p.balance, 0);

  const handlePrint = () => {
    const rows = filteredPartners
      .map(
        (p) => `
        <tr>
          <td>${p.code}</td>
          <td>${p.name}</td>
          <td>${p.type === "CUSTOMER" ? "عميل" : "مورد"}</td>
          <td>${p.phone || "-"}</td>
          <td>${p.taxNumber || "-"}</td>
          <td style="font-weight: bold; color: ${p.balance >= 0 ? "green" : "red"};">
            ${p.balance.toLocaleString()} ${companySettings.currency}
          </td>
        </tr>
      `
      )
      .join("");

    const html = `
      <table>
        <thead>
          <tr>
            <th>الكود</th>
            <th>اسم الجهة / العميل / المورد</th>
            <th>النوع</th>
            <th>الهاتف</th>
            <th>الرقم الضريبي</th>
            <th>الرصيد الحسابي الحالي</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    printReport("دليل الموردين والعملاء والمعاملات", html, companySettings);
  };

  const handleExport = () => {
    const exportData = filteredPartners.map((p) => ({
      كود: p.code,
      الاسم: p.name,
      النوع: p.type === "CUSTOMER" ? "عميل" : "مورد",
      الهاتف: p.phone || "-",
      "البريد الإلكتروني": p.email || "-",
      "الرقم الضريبي": p.taxNumber || "-",
      "السجل التجاري": p.commercialRegister || "-",
      العنوان: p.address || "-",
      "الرصيد الحالي": p.balance,
    }));
    exportToExcel(exportData, "الموردين_والعملاء");
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">إدارة الموردين والعملاء</h2>
            <p className="text-xs text-slate-400">
              دليل بيانات الموردين والعملاء ومتابعة الأرصدة والحسابات المستحقة
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openInvoiceModal()}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-md"
          >
            <Receipt className="w-4 h-4" />
            <span>إنشاء فاتورة جديدة (ترحيل آلي)</span>
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مورد / عميل</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-md"
          >
            <FileText className="w-4 h-4" />
            <span>تصدير إلى PDF</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الدليل</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              إجمالي مستحقات العملاء (أرصدة مدين)
            </span>
            <p className="text-2xl font-extrabold text-emerald-400">
              {totalCustomersBalance.toLocaleString()} {companySettings.currency}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 font-bold text-xs">
            {partners.filter((p) => p.type === "CUSTOMER").length} عميل
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <ArrowDownLeft className="w-4 h-4 text-rose-400" />
              إجمالي التزامات الموردين (أرصدة دائن)
            </span>
            <p className="text-2xl font-extrabold text-rose-400">
              {totalSuppliersBalance.toLocaleString()} {companySettings.currency}
            </p>
          </div>
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 font-bold text-xs">
            {partners.filter((p) => p.type === "SUPPLIER").length} مورد
          </div>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800 pb-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                filterType === "ALL" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              الكل ({partners.length})
            </button>
            <button
              onClick={() => setFilterType("CUSTOMER")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                filterType === "CUSTOMER" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              العملاء ({partners.filter((p) => p.type === "CUSTOMER").length})
            </button>
            <button
              onClick={() => setFilterType("SUPPLIER")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                filterType === "SUPPLIER" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              الموردين ({partners.filter((p) => p.type === "SUPPLIER").length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث باسم الجهة، الهاتف، أو الرقم الضريبي..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right text-slate-300">
            <thead className="bg-slate-800 text-slate-400">
              <tr>
                <th className="p-2.5">الكود</th>
                <th className="p-2.5">اسم الجهة</th>
                <th className="p-2.5">النوع</th>
                <th className="p-2.5">الهاتف والتواصل</th>
                <th className="p-2.5">الرقم الضريبي / السجل</th>
                <th className="p-2.5">الرصيد الحسابي الحالي</th>
                <th className="p-2.5 text-center">إصدار فاتورة</th>
                <th className="p-2.5 text-center">تعديل</th>
                <th className="p-2.5 text-center">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-500">
                    لا يوجد موردين أو عملاء مطبق عليهم شرط البحث
                  </td>
                </tr>
              ) : (
                filteredPartners.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-2.5 font-bold font-mono text-blue-400">{p.code}</td>
                    <td className="p-2.5 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        {p.type === "CUSTOMER" ? (
                          <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Building2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        )}
                        <span>{p.name}</span>
                      </div>
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.type === "CUSTOMER"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {p.type === "CUSTOMER" ? "عميل" : "مورد"}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <div className="space-y-0.5">
                        {p.phone && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {p.phone}
                          </span>
                        )}
                        {p.email && (
                          <span className="flex items-center gap-1 text-slate-400 text-[10px]">
                            <Mail className="w-3 h-3 text-slate-500" />
                            {p.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2.5 font-mono text-slate-300">
                      <div>ضريبي: {p.taxNumber || "-"}</div>
                      {p.commercialRegister && (
                        <div className="text-[10px] text-slate-500">سجل: {p.commercialRegister}</div>
                      )}
                    </td>
                    <td className="p-2.5 font-bold font-mono text-white">
                      <span className={p.balance > 0 ? "text-emerald-400" : p.balance < 0 ? "text-rose-400" : "text-slate-400"}>
                        {p.balance.toLocaleString()} {companySettings.currency}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setStatementPartner(p)}
                          className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                          title="عرض كشف الحساب التفصيلي"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>كشف حساب</span>
                        </button>
                        <button
                          onClick={() => openInvoiceModal(p)}
                          className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                          title="إصدار فاتورة ضريبية وتوليد قيد تلقائي"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>فاتورة</span>
                        </button>
                      </div>
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1 text-blue-400 hover:bg-slate-800 rounded transition"
                        title="تعديل البيانات"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => setDeleteConfirmPartner({ id: p.id, name: p.name })}
                        className="p-1 text-rose-400 hover:bg-slate-800 rounded transition"
                        title="حذف"
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
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-5 text-slate-100 space-y-4 shadow-xl">
            <h3 className="font-bold border-b border-slate-800 pb-2">
              {editingPartner ? "تعديل بيانات الجهة / المورد / العميل" : "إضافة جهة جديدة (عميل / مورد)"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">نوع الجهة *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-semibold"
                  >
                    <option value="CUSTOMER">عميل (مستحقات مدين)</option>
                    <option value="SUPPLIER">مورد (التزامات دائن)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">الكود *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">اسم العميل / المورد *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة النيل للتوريدات / عميل أحمد علي..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    placeholder="01000000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    placeholder="info@partner.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">الرقم الضريبي</label>
                  <input
                    type="text"
                    placeholder="123-456-789"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">السجل التجاري</label>
                  <input
                    type="text"
                    placeholder="CR-998811"
                    value={commercialRegister}
                    onChange={(e) => setCommercialRegister(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">الرصيد الافتتاحي / الحالي</label>
                  <input
                    type="number"
                    step="0.01"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-emerald-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">ربط مع حساب بدليل الحسابات</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="">-- بدون ربط مباشر --</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">العنوان</label>
                <input
                  type="text"
                  placeholder="القاهرة - مدينة نصر..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">ملاحظات وشروط التعامل</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-semibold">
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span>إصدار فاتورة ضريبية جديدة مع الترحيل التلقائي للقيد</span>
              </h3>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            {createdInvoiceSuccess ? (
              <div className="p-6 space-y-4 text-center">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">تم إنشاء الفاتورة وترحيل القيد بنجاح!</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    تم إنشاء قيد اليومية المزدوج وتحديث رصيد الجهة ({createdInvoiceSuccess.partnerName}) بمبلغ {createdInvoiceSuccess.totalAmount.toLocaleString()} {companySettings.currency}
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-right space-y-2">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">رقم الفاتورة:</span>
                    <span className="font-mono font-bold text-blue-400">{createdInvoiceSuccess.invNumber}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">تاريخ الفاتورة:</span>
                    <span className="text-slate-200">{createdInvoiceSuccess.invDate}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">صافي المبلغ:</span>
                    <span className="text-slate-200">{createdInvoiceSuccess.netAmount.toLocaleString()} {companySettings.currency}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">ضريبة القيمة المضافة (14%):</span>
                    <span className="text-blue-400">{createdInvoiceSuccess.vatAmount.toLocaleString()} {companySettings.currency}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm">
                    <span className="text-slate-300">الإجمالي النهائي:</span>
                    <span className="text-emerald-400">{createdInvoiceSuccess.totalAmount.toLocaleString()} {companySettings.currency}</span>
                  </div>
                </div>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => handlePrintInvoice(createdInvoiceSuccess)}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded font-semibold text-xs transition"
                  >
                    <FileText className="w-4 h-4" />
                    <span>طباعة الفاتورة (PDF)</span>
                  </button>
                  <button
                    onClick={() => {
                      setCreatedInvoiceSuccess(null);
                      setShowInvoiceModal(false);
                    }}
                    className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded text-xs"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateInvoiceSubmit} className="p-4 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">نوع الفاتورة</label>
                    <select
                      value={invType}
                      onChange={(e) => {
                        const newType = e.target.value as "CUSTOMER" | "SUPPLIER";
                        setInvType(newType);
                        const firstP = partners.find((p) => p.type === newType);
                        if (firstP) setInvPartnerId(firstP.id);
                        const defaultAcc = newType === "CUSTOMER"
                          ? accounts.find((a) => a.code.startsWith("4") || a.type === "REVENUE")?.id || ""
                          : accounts.find((a) => a.code.startsWith("5") || a.type === "EXPENSE")?.id || "";
                        setInvOppAccountId(defaultAcc);
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-bold"
                    >
                      <option value="CUSTOMER">فاتورة مبيعات عميل (Customer Invoice)</option>
                      <option value="SUPPLIER">فاتورة مشتريات مورد (Supplier Invoice)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">اختيار الجهة (العميل / المورد)</label>
                    <select
                      value={invPartnerId}
                      onChange={(e) => setInvPartnerId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-bold"
                      required
                    >
                      <option value="">-- اختر الجهة --</option>
                      {partners
                        .filter((p) => p.type === invType)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.code} - {p.name} ({p.balance.toLocaleString()} {companySettings.currency})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">رقم الفاتورة</label>
                    <input
                      type="text"
                      value={invNumber}
                      onChange={(e) => setInvNumber(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-blue-400 font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">تاريخ الفاتورة</label>
                    <input
                      type="date"
                      value={invDate}
                      onChange={(e) => setInvDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">صافي الفاتورة (بدون ضريبة)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={invNetAmount}
                      onChange={(e) => setInvNetAmount(e.target.value ? Number(e.target.value) : "")}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-emerald-400 font-bold text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">نسبة ضريبة القيمة المضافة %</label>
                    <input
                      type="number"
                      value={invVatRate}
                      onChange={(e) => setInvVatRate(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">إجمالي الفاتورة النهائي</label>
                    <div className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-emerald-400 font-bold text-sm text-center">
                      {(
                        (Number(invNetAmount) || 0) +
                        ((Number(invNetAmount) || 0) * invVatRate) / 100
                      ).toLocaleString()}{" "}
                      {companySettings.currency}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    {invType === "CUSTOMER"
                      ? "حساب المبيعات / الإيرادات المقابل"
                      : "حساب المشتريات / المصروفات المقابل"}
                  </label>
                  <select
                    value={invOppAccountId}
                    onChange={(e) => setInvOppAccountId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                    required
                  >
                    <option value="">-- اختر الحساب المقابل --</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.nameAr} ({acc.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">ملاحظات الفاتورة والتفاصيل</label>
                  <textarea
                    rows={2}
                    placeholder="بيان الفاتورة وتفاصيل التوريدات..."
                    value={invNotes}
                    onChange={(e) => setInvNotes(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  />
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-lg text-blue-300 text-[11px] flex items-center gap-2">
                  <Calculator className="w-4 h-4 shrink-0 text-blue-400" />
                  <span>
                    عند حفظ الفاتورة سيقوم النظام تلقائياً بإنشاء قيد محاسبي مزدوج وتحديث حساب الأستاذ ورصيد الجهة في نفس اللحظة.
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowInvoiceModal(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold transition flex items-center gap-1.5"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>حفظ وتوليد القيد آلياً</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Partner Detailed Statement of Account Modal */}
      {statementPartner && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl p-5 text-slate-100 space-y-4 max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <span>كشف حساب تفصيلي: {statementPartner.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    statementPartner.type === "CUSTOMER" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                  }`}>
                    {statementPartner.type === "CUSTOMER" ? "عميل" : "مورد"}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  كود: <span className="font-mono text-slate-300">{statementPartner.code}</span> | الهاتف: {statementPartner.phone || "-"} | الرقم الضريبي: {statementPartner.taxNumber || "-"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Generate Print HTML for statement
                    const partnerLines: {
                      date: string;
                      docNo: string;
                      description: string;
                      debit: number;
                      credit: number;
                    }[] = [];

                    journalEntries.forEach((je) => {
                      je.lines.forEach((l) => {
                        if (l.partnerId === statementPartner.id || (statementPartner.accountId && l.accountId === statementPartner.accountId)) {
                          partnerLines.push({
                            date: je.date,
                            docNo: je.entryNumber,
                            description: l.note || je.description || "حرث حساب",
                            debit: l.debit || 0,
                            credit: l.credit || 0,
                          });
                        }
                      });
                    });

                    let running = 0;
                    const rowsHtml = partnerLines.map((line, idx) => {
                      running += (line.debit - line.credit);
                      return `
                        <tr>
                          <td style="text-align:center;">${idx + 1}</td>
                          <td>${line.date}</td>
                          <td style="font-weight:bold; color:#1e40af;">${line.docNo}</td>
                          <td>${line.description}</td>
                          <td style="text-align:right; color:#16a34a; font-weight:bold;">${line.debit ? line.debit.toLocaleString() : "-"}</td>
                          <td style="text-align:right; color:#dc2626; font-weight:bold;">${line.credit ? line.credit.toLocaleString() : "-"}</td>
                          <td style="text-align:right; font-weight:bold;">${running.toLocaleString()} ${companySettings.currency}</td>
                        </tr>
                      `;
                    }).join("");

                    const html = `
                      <div style="border: 2px solid #0f172a; padding: 20px; border-radius: 8px;">
                        <div style="display:flex; justify-between; border-b:2px solid #334155; padding-bottom:12px; margin-bottom:15px;">
                          <div>
                            <h2 style="margin:0;">كشف حساب تفصيلي (${statementPartner.type === "CUSTOMER" ? "عميل" : "مورد"})</h2>
                            <p style="margin:4px 0;">الجهة: <strong>${statementPartner.name}</strong> (${statementPartner.code})</p>
                            <p style="margin:4px 0;">الرقم الضريبي: ${statementPartner.taxNumber || "-"}</p>
                          </div>
                          <div style="text-align:left;">
                            <p style="margin:4px 0;">تاريخ التقرير: <strong>${new Date().toISOString().split("T")[0]}</strong></p>
                            <p style="margin:4px 0; font-size:16px;">الرصيد النهائي: <strong>${statementPartner.balance.toLocaleString()} ${companySettings.currency}</strong></p>
                          </div>
                        </div>

                        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:12px;">
                          <thead>
                            <tr style="background:#0f172a; color:white;">
                              <th style="padding:8px; border:1px solid #334155;">#</th>
                              <th style="padding:8px; border:1px solid #334155;">التاريخ</th>
                              <th style="padding:8px; border:1px solid #334155;">رقم القيد</th>
                              <th style="padding:8px; border:1px solid #334155;">البيان والشرح</th>
                              <th style="padding:8px; border:1px solid #334155;">مدين (+)</th>
                              <th style="padding:8px; border:1px solid #334155;">دائن (-)</th>
                              <th style="padding:8px; border:1px solid #334155;">الرصيد التراكمي</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${rowsHtml}
                          </tbody>
                        </table>
                      </div>
                    `;
                    printReport(`كشف_حساب_${statementPartner.name}`, html, companySettings);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة كشف الحساب</span>
                </button>
                <button
                  onClick={() => setStatementPartner(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  إغلاق
                </button>
              </div>
            </div>

            {/* Statement Content Table */}
            <div className="overflow-y-auto flex-1 space-y-4">
              {(() => {
                const partnerLines: {
                  date: string;
                  docNo: string;
                  description: string;
                  debit: number;
                  credit: number;
                }[] = [];

                journalEntries.forEach((je) => {
                  je.lines.forEach((l) => {
                    if (l.partnerId === statementPartner.id || (statementPartner.accountId && l.accountId === statementPartner.accountId)) {
                      partnerLines.push({
                        date: je.date,
                        docNo: je.entryNumber,
                        description: l.note || je.description || "حركة مالية",
                        debit: l.debit || 0,
                        credit: l.credit || 0,
                      });
                    }
                  });
                });

                let runningAcc = 0;

                return (
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-xs text-right text-slate-300">
                      <thead className="bg-slate-800 text-slate-300 font-bold">
                        <tr>
                          <th className="p-2.5">التاريخ</th>
                          <th className="p-2.5">رقم القيد</th>
                          <th className="p-2.5">البيان والشرح</th>
                          <th className="p-2.5 text-emerald-400">مدين (+)</th>
                          <th className="p-2.5 text-rose-400">دائن (-)</th>
                          <th className="p-2.5 text-blue-300">الرصيد المتبقي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {partnerLines.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-500">
                              لا توجد حركات قيود يومية مسجلة مباشرة لهذا الحساب/الجهة حتى الآن.
                            </td>
                          </tr>
                        ) : (
                          partnerLines.map((line, idx) => {
                            runningAcc += (line.debit - line.credit);
                            return (
                              <tr key={idx} className="hover:bg-slate-800/40">
                                <td className="p-2.5">{line.date}</td>
                                <td className="p-2.5 font-bold font-mono text-blue-400">{line.docNo}</td>
                                <td className="p-2.5">{line.description}</td>
                                <td className="p-2.5 font-bold text-emerald-400">
                                  {line.debit ? line.debit.toLocaleString() : "-"}
                                </td>
                                <td className="p-2.5 font-bold text-rose-400">
                                  {line.credit ? line.credit.toLocaleString() : "-"}
                                </td>
                                <td className={`p-2.5 font-bold font-mono ${runningAcc >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                  {runningAcc.toLocaleString()} {companySettings.currency}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      <tfoot className="bg-slate-950 font-bold text-white border-t border-slate-700">
                        <tr>
                          <td colSpan={3} className="p-3 text-left">الرصيد النهائي المستحق:</td>
                          <td className="p-3 text-emerald-400">
                            {partnerLines.reduce((s, l) => s + l.debit, 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-rose-400">
                            {partnerLines.reduce((s, l) => s + l.credit, 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-blue-400 font-mono">
                            {statementPartner.balance.toLocaleString()} {companySettings.currency}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmPartner}
        message={`هل أنت تأكد من حذف الجهة (${deleteConfirmPartner?.name}) نهائياً؟`}
        onConfirm={() => {
          if (deleteConfirmPartner) {
            onDeletePartner(deleteConfirmPartner.id);
            setDeleteConfirmPartner(null);
          }
        }}
        onCancel={() => setDeleteConfirmPartner(null)}
      />
    </div>
  );
};
