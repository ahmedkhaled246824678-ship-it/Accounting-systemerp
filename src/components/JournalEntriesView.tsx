import React, { useState } from "react";
import {
  BookOpen,
  Plus,
  Printer,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Edit2,
  CreditCard,
  Paperclip,
  FileImage,
  ShoppingCart,
  Package,
  Users,
  Building,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Info,
  MessageSquare,
  Send,
  Download,
} from "lucide-react";
import {
  Account,
  CompanySettings,
  CostCenter,
  InventoryItem,
  JournalEntry,
  JournalEntryLine,
  FilterParams,
  Partner,
} from "../types";
import { exportToExcel, printReport, exportReportToPdf } from "../utils/export";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface JournalEntriesViewProps {
  accounts: Account[];
  journalEntries: JournalEntry[];
  costCenters: CostCenter[];
  inventoryItems?: InventoryItem[];
  partners?: Partner[];
  companySettings: CompanySettings;
  filterParams: FilterParams;
  onSaveJournalEntry: (entry: JournalEntry) => void;
  onDeleteJournalEntry: (entryId: string) => void;
}

type ModalMode = "MANUAL" | "SALES" | "PURCHASES";

export const JournalEntriesView: React.FC<JournalEntriesViewProps> = ({
  accounts,
  journalEntries,
  costCenters,
  inventoryItems = [],
  partners = [],
  companySettings,
  filterParams,
  onSaveJournalEntry,
  onDeleteJournalEntry,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("MANUAL");
  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState<{ id: string; num: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState(filterParams.query || "");
  const [filterYear, setFilterYear] = useState(filterParams.financialYear || companySettings.financialYear);
  const [filterStartDate, setFilterStartDate] = useState(filterParams.startDate || "");
  const [filterEndDate, setFilterEndDate] = useState(filterParams.endDate || "");
  const [filterMonth, setFilterMonth] = useState<string>("ALL");

  // Sub-accounts filtering: only non-header accounts that can receive transactional entries
  const subAccounts = React.useMemo(() => {
    return accounts.filter((a) => !a.isHeader && !accounts.some((child) => child.parentId === a.id));
  }, [accounts]);

  // Group sub-accounts by parent header account for clear dropdown categorization
  const groupedSubAccounts = React.useMemo(() => {
    const groups: { parentName: string; items: Account[] }[] = [];
    const map = new Map<string, Account[]>();

    subAccounts.forEach((acc) => {
      let parentName = "حسابات فرعية تابعة";
      if (acc.parentId) {
        const parentAcc = accounts.find((p) => p.id === acc.parentId);
        if (parentAcc) {
          parentName = `${parentAcc.code} - ${parentAcc.nameAr}`;
        }
      } else if (acc.code) {
        const parentAcc = accounts.find(
          (p) => p.isHeader && p.id !== acc.id && acc.code.startsWith(p.code) && p.code.length < acc.code.length
        );
        if (parentAcc) {
          parentName = `${parentAcc.code} - ${parentAcc.nameAr}`;
        }
      }
      if (!map.has(parentName)) {
        map.set(parentName, []);
      }
      map.get(parentName)!.push(acc);
    });

    map.forEach((items, parentName) => {
      groups.push({ parentName, items });
    });

    return groups;
  }, [subAccounts, accounts]);

  // Helper to generate the next non-duplicate sequential entry number
  const getNextEntryNumber = (entries: JournalEntry[]) => {
    let maxNum = 0;
    entries.forEach((e) => {
      const match = e.entryNumber.replace(/\D/g, "");
      if (match) {
        const val = parseInt(match, 10);
        if (val > maxNum) maxNum = val;
      }
    });
    const next = Math.max(maxNum + 1, entries.length + 1);
    return `قيد-${String(next).padStart(3, "0")}`;
  };

  // Form State for Journal Entry
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [manualEntryNumber, setManualEntryNumber] = useState(getNextEntryNumber(journalEntries));
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string>("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [lines, setLines] = useState<JournalEntryLine[]>([
    { id: "line-1", accountId: subAccounts[0]?.id || accounts[0]?.id || "", debit: 0, credit: 0, costCenterId: "", note: "" },
    { id: "line-2", accountId: subAccounts[1]?.id || subAccounts[0]?.id || accounts[1]?.id || "", debit: 0, credit: 0, costCenterId: "", note: "" },
  ]);

  // ==================== Sales Wizard State ====================
  const [salesPartnerType, setSalesPartnerType] = useState<"CUSTOMER" | "CASH" | "BANK">("CUSTOMER");
  const [salesPartnerId, setSalesPartnerId] = useState<string>(partners.find((p) => p.type === "CUSTOMER")?.id || "");
  const [salesBankAccountId, setSalesBankAccountId] = useState<string>(
    accounts.find((a) => a.code.startsWith("1113") || a.nameAr.includes("بنك"))?.id || ""
  );
  const [salesTreasuryAccountId, setSalesTreasuryAccountId] = useState<string>(
    accounts.find((a) => a.code === "1111" || a.nameAr.includes("خزينة"))?.id || ""
  );
  const [salesRevenueAccountId, setSalesRevenueAccountId] = useState<string>(
    accounts.find((a) => a.code.startsWith("4100") || a.code.startsWith("41") || a.nameAr.includes("مبيعات"))?.id || ""
  );
  const [salesItemId, setSalesItemId] = useState<string>(inventoryItems[0]?.id || "");
  const [salesQuantity, setSalesQuantity] = useState<number>(1);
  const [salesUnitPrice, setSalesUnitPrice] = useState<number>(0);
  const [salesVatRate, setSalesVatRate] = useState<number>(14);
  const [salesCostCenterId, setSalesCostCenterId] = useState<string>("");

  // ==================== Purchases Wizard State ====================
  const [purchasesPartnerType, setPurchasesPartnerType] = useState<"SUPPLIER" | "CASH" | "BANK">("SUPPLIER");
  const [purchasesPartnerId, setPurchasesPartnerId] = useState<string>(partners.find((p) => p.type === "SUPPLIER")?.id || "");
  const [purchasesBankAccountId, setPurchasesBankAccountId] = useState<string>(
    accounts.find((a) => a.code.startsWith("1113") || a.nameAr.includes("بنك"))?.id || ""
  );
  const [purchasesTreasuryAccountId, setPurchasesTreasuryAccountId] = useState<string>(
    accounts.find((a) => a.code === "1111" || a.nameAr.includes("خزينة"))?.id || ""
  );
  const [purchasesInventoryAccountId, setPurchasesInventoryAccountId] = useState<string>(
    accounts.find((a) => a.code.startsWith("114") || a.code.startsWith("1115") || a.nameAr.includes("مخزون"))?.id ||
      accounts.find((a) => a.code.startsWith("5110") || a.nameAr.includes("مشتريات"))?.id ||
      ""
  );
  const [purchasesItemId, setPurchasesItemId] = useState<string>(inventoryItems[0]?.id || "");
  const [purchasesQuantity, setPurchasesQuantity] = useState<number>(1);
  const [purchasesUnitCost, setPurchasesUnitCost] = useState<number>(0);
  const [purchasesVatRate, setPurchasesVatRate] = useState<number>(14);
  const [purchasesCostCenterId, setPurchasesCostCenterId] = useState<string>("");

  // Update unit prices when item changes in wizard
  React.useEffect(() => {
    if (salesItemId) {
      const itm = inventoryItems.find((i) => i.id === salesItemId);
      if (itm && itm.unitCost && salesUnitPrice === 0) {
        setSalesUnitPrice(Math.round(itm.unitCost * 1.2)); // Suggest 20% margin default
      }
    }
  }, [salesItemId, inventoryItems]);

  React.useEffect(() => {
    if (purchasesItemId) {
      const itm = inventoryItems.find((i) => i.id === purchasesItemId);
      if (itm && itm.unitCost && purchasesUnitCost === 0) {
        setPurchasesUnitCost(itm.unitCost);
      }
    }
  }, [purchasesItemId, inventoryItems]);

  // Handle receipt image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("حجم ملف المستند يجب ألا يتجاوز 5 ميجابايت");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachmentUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenNewModal = (mode: ModalMode = "MANUAL") => {
    setEditingEntry(null);
    setModalMode(mode);
    setManualEntryNumber(getNextEntryNumber(journalEntries));
    setEntryDate(new Date().toISOString().split("T")[0]);
    setReference("");
    setNotes("");
    setAttachmentUrl("");
    setLines([
      { id: "line-1", accountId: subAccounts[0]?.id || accounts[0]?.id || "", debit: 0, credit: 0, costCenterId: "", note: "" },
      { id: "line-2", accountId: subAccounts[1]?.id || subAccounts[0]?.id || accounts[1]?.id || "", debit: 0, credit: 0, costCenterId: "", note: "" },
    ]);
    setShowModal(true);
  };

  const handleEditJournal = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setModalMode("MANUAL");
    setManualEntryNumber(entry.entryNumber);
    setEntryDate(entry.date);
    setReference(entry.reference || "");
    setNotes(entry.notes || "");
    setAttachmentUrl(entry.attachmentUrl || "");
    setLines(entry.lines.map((l, idx) => ({ ...l, id: l.id || `line-${idx}` })));
    setShowModal(true);
  };

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      { id: `line-${Date.now()}`, accountId: subAccounts[0]?.id || accounts[0]?.id || "", debit: 0, credit: 0, costCenterId: "", note: "" },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleLineChange = (id: string, field: keyof JournalEntryLine, value: any) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const updated = { ...l, [field]: value };
          if (field === "debit" && value > 0) updated.credit = 0;
          if (field === "credit" && value > 0) updated.debit = 0;
          return updated;
        }
        return l;
      })
    );
  };

  // Build lines from Sales Wizard
  const applySalesWizard = () => {
    const item = inventoryItems.find((i) => i.id === salesItemId);
    const partner = partners.find((p) => p.id === salesPartnerId);
    const subtotal = Math.round(salesQuantity * salesUnitPrice * 100) / 100;
    const vat = salesVatRate > 0 ? Math.round((subtotal * (salesVatRate / 100)) * 100) / 100 : 0;
    const total = subtotal + vat;

    // Accounts resolution
    const customerAccount = partner?.accountId
      ? accounts.find((a) => a.id === partner.accountId) || accounts.find((a) => a.code === "1120" || a.nameAr.includes("عملاء"))
      : accounts.find((a) => a.code === "1120" || a.nameAr.includes("عملاء")) || accounts[0];

    const treasuryAccount =
      accounts.find((a) => a.id === salesTreasuryAccountId) ||
      accounts.find((a) => a.code === "1111" || a.nameAr.includes("خزينة")) ||
      accounts[0];

    const bankAccount =
      accounts.find((a) => a.id === salesBankAccountId) ||
      accounts.find((a) => a.code.startsWith("1113") || a.nameAr.includes("بنك")) ||
      accounts[0];

    const revenueAccount =
      accounts.find((a) => a.id === salesRevenueAccountId) ||
      accounts.find((a) => a.code.startsWith("4100") || a.code.startsWith("41") || a.nameAr.includes("مبيعات")) ||
      accounts.find((a) => a.type === "REVENUE") ||
      accounts[0];

    const vatOutputAccount =
      accounts.find((a) => a.code === "2120" || a.code.startsWith("212") || a.nameAr.includes("قيمة مضافة") || a.nameAr.includes("ضريبة")) ||
      accounts[0];

    // Debit Line: Customer, Treasury, or Bank
    let debitAccountId = customerAccount?.id || "";
    let partnerIdForLine: string | undefined = undefined;
    let paymentDesc = "";

    if (salesPartnerType === "CUSTOMER") {
      debitAccountId = customerAccount?.id || "";
      partnerIdForLine = partner?.id;
      paymentDesc = `آجل على حساب العميل: ${partner?.name || "عميل"}`;
    } else if (salesPartnerType === "CASH") {
      debitAccountId = treasuryAccount?.id || "";
      paymentDesc = `نقداً بالخزينة`;
    } else {
      debitAccountId = bankAccount?.id || "";
      paymentDesc = `تحويل بنكي`;
    }

    const generatedLines: JournalEntryLine[] = [];

    // 1) Debit Account (Receivable/Cash/Bank)
    generatedLines.push({
      id: `line-${Date.now()}-1`,
      accountId: debitAccountId,
      debit: total,
      credit: 0,
      partnerId: partnerIdForLine,
      employeeName: partner?.name,
      costCenterId: salesCostCenterId || "",
      note: `مبيعات ${item ? item.name : "بضاعة"} - ${paymentDesc}`,
    });

    // 2) Credit Account (Sales Revenue) with inventory reduction link
    generatedLines.push({
      id: `line-${Date.now()}-2`,
      accountId: revenueAccount?.id || "",
      debit: 0,
      credit: subtotal,
      inventoryItemId: item?.id,
      inventoryQuantity: salesQuantity,
      costCenterId: salesCostCenterId || "",
      note: `إيرادات مبيعات: ${item ? item.name : "صنف"} (${salesQuantity} ${item?.unit || "وحدة"} × ${salesUnitPrice})`,
    });

    // 3) Credit Account (VAT Output) if applicable
    if (vat > 0) {
      generatedLines.push({
        id: `line-${Date.now()}-3`,
        accountId: vatOutputAccount?.id || "",
        debit: 0,
        credit: vat,
        costCenterId: salesCostCenterId || "",
        note: `ضريبة القيمة المضافة مخرجات مستحقة (${salesVatRate}%)`,
      });
    }

    setLines(generatedLines);
    setNotes(`فاتورة وقيد مبيعات: ${item?.name || "بضاعة"} - كمية ${salesQuantity} ${item?.unit || "وحدة"} - ${paymentDesc}`);
    setModalMode("MANUAL");
  };

  // Build lines from Purchases Wizard
  const applyPurchasesWizard = () => {
    const item = inventoryItems.find((i) => i.id === purchasesItemId);
    const partner = partners.find((p) => p.id === purchasesPartnerId);
    const subtotal = Math.round(purchasesQuantity * purchasesUnitCost * 100) / 100;
    const vat = purchasesVatRate > 0 ? Math.round((subtotal * (purchasesVatRate / 100)) * 100) / 100 : 0;
    const total = subtotal + vat;

    // Accounts resolution
    const supplierAccount = partner?.accountId
      ? accounts.find((a) => a.id === partner.accountId) || accounts.find((a) => a.code === "2110" || a.nameAr.includes("موردين"))
      : accounts.find((a) => a.code === "2110" || a.nameAr.includes("موردين")) || accounts[0];

    const treasuryAccount =
      accounts.find((a) => a.id === purchasesTreasuryAccountId) ||
      accounts.find((a) => a.code === "1111" || a.nameAr.includes("خزينة")) ||
      accounts[0];

    const bankAccount =
      accounts.find((a) => a.id === purchasesBankAccountId) ||
      accounts.find((a) => a.code.startsWith("1113") || a.nameAr.includes("بنك")) ||
      accounts[0];

    const inventoryAccount =
      accounts.find((a) => a.id === purchasesInventoryAccountId) ||
      accounts.find((a) => a.code.startsWith("114") || a.code.startsWith("1115") || a.nameAr.includes("مخزون")) ||
      accounts.find((a) => a.code.startsWith("5110") || a.nameAr.includes("مشتريات")) ||
      accounts[0];

    const vatInputAccount =
      accounts.find((a) => a.code === "2120" || a.code.startsWith("212") || a.nameAr.includes("قيمة مضافة") || a.nameAr.includes("ضريبة")) ||
      accounts[0];

    // Credit Line: Supplier, Treasury, or Bank
    let creditAccountId = supplierAccount?.id || "";
    let partnerIdForLine: string | undefined = undefined;
    let paymentDesc = "";

    if (purchasesPartnerType === "SUPPLIER") {
      creditAccountId = supplierAccount?.id || "";
      partnerIdForLine = partner?.id;
      paymentDesc = `آجل على حساب المورد: ${partner?.name || "مورد"}`;
    } else if (purchasesPartnerType === "CASH") {
      creditAccountId = treasuryAccount?.id || "";
      paymentDesc = `نقداً بالخزينة`;
    } else {
      creditAccountId = bankAccount?.id || "";
      paymentDesc = `سداد تحويل بنكي`;
    }

    const generatedLines: JournalEntryLine[] = [];

    // 1) Debit Account (Inventory / Purchases) with inventory addition link
    generatedLines.push({
      id: `line-${Date.now()}-1`,
      accountId: inventoryAccount?.id || "",
      debit: subtotal,
      credit: 0,
      inventoryItemId: item?.id,
      inventoryQuantity: purchasesQuantity,
      costCenterId: purchasesCostCenterId || "",
      note: `مشتريات وتوريد مخزني: ${item ? item.name : "بضاعة"} (${purchasesQuantity} ${item?.unit || "وحدة"} × ${purchasesUnitCost})`,
    });

    // 2) Debit Account (VAT Input) if applicable
    if (vat > 0) {
      generatedLines.push({
        id: `line-${Date.now()}-2`,
        accountId: vatInputAccount?.id || "",
        debit: vat,
        credit: 0,
        costCenterId: purchasesCostCenterId || "",
        note: `ضريبة القيمة المضافة مدخلات مخصومة (${purchasesVatRate}%)`,
      });
    }

    // 3) Credit Account (Supplier / Treasury / Bank)
    generatedLines.push({
      id: `line-${Date.now()}-3`,
      accountId: creditAccountId,
      debit: 0,
      credit: total,
      partnerId: partnerIdForLine,
      employeeName: partner?.name,
      costCenterId: purchasesCostCenterId || "",
      note: `مستحقات مشتريات ${item ? item.name : "بضاعة"} - ${paymentDesc}`,
    });

    setLines(generatedLines);
    setNotes(`فاتورة وقيد مشتريات: ${item?.name || "بضاعة"} - كمية ${purchasesQuantity} ${item?.unit || "وحدة"} - ${paymentDesc}`);
    setModalMode("MANUAL");
  };

  // Available financial years from journal entries & settings
  const availableYears = React.useMemo(() => {
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

  const handleSubmitJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      alert("القيد غير متوازن! يجب أن يتساوى إجمالي الجانب المدين مع الجانب الدائن.");
      return;
    }

    const trimmedNumber = manualEntryNumber.trim();
    if (!trimmedNumber) {
      alert("يرجى إدخال رقم القيد المحاسبي!");
      return;
    }

    // Check for duplicate entry numbers across all journal entries
    const isDuplicate = journalEntries.some(
      (je) =>
        je.entryNumber.trim().toLowerCase() === trimmedNumber.toLowerCase() &&
        (!editingEntry || je.id !== editingEntry.id)
    );

    if (isDuplicate) {
      alert(`تنبيه: رقم القيد "${trimmedNumber}" مستخدم بالفعل! لا يمكن تكرار رقم القيد في أي شيت أو قائمة.`);
      return;
    }

    const computedYear = entryDate
      ? entryDate.split("-")[0]
      : filterYear !== "ALL"
      ? filterYear
      : companySettings.financialYear || "2026";

    const savedEntry: JournalEntry = {
      id: editingEntry ? editingEntry.id : "JE-" + Date.now(),
      entryNumber: trimmedNumber,
      date: entryDate,
      financialYear: computedYear,
      reference,
      notes,
      attachmentUrl,
      createdAt: editingEntry ? editingEntry.createdAt : new Date().toISOString(),
      createdBy: editingEntry ? editingEntry.createdBy : "المحاسب المسجل",
      isPosted: true,
      lines: lines.map((l) => ({
        ...l,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      })),
    };

    onSaveJournalEntry(savedEntry);
    setShowModal(false);
    setEditingEntry(null);

    // Reset Form
    setManualEntryNumber(getNextEntryNumber(journalEntries));
    setReference("");
    setNotes("");
    setLines([
      { id: "line-1", accountId: subAccounts[0]?.id || accounts[0]?.id || "", debit: 0, credit: 0, costCenterId: "", note: "" },
      { id: "line-2", accountId: subAccounts[1]?.id || subAccounts[0]?.id || accounts[1]?.id || "", debit: 0, credit: 0, costCenterId: "", note: "" },
    ]);
  };

  // Filter Journal Entries by Search, Year, Month, and Date Range
  const filteredEntries = React.useMemo(() => {
    const list = journalEntries.filter((je) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        je.entryNumber.toLowerCase().includes(q) ||
        (je.reference && je.reference.toLowerCase().includes(q)) ||
        (je.notes && je.notes.toLowerCase().includes(q)) ||
        (je.description && je.description.toLowerCase().includes(q)) ||
        je.lines.some((l) => {
          const acc = accounts.find((a) => a.id === l.accountId);
          const cc = costCenters.find((c) => c.id === l.costCenterId);
          const part = partners.find((p) => p.id === l.partnerId);
          const itm = inventoryItems.find((i) => i.id === l.inventoryItemId);
          return (
            (l.note && l.note.toLowerCase().includes(q)) ||
            (l.employeeName && l.employeeName.toLowerCase().includes(q)) ||
            (part && part.name.toLowerCase().includes(q)) ||
            (itm && (itm.name.toLowerCase().includes(q) || itm.sku.toLowerCase().includes(q))) ||
            (acc && (acc.nameAr.toLowerCase().includes(q) || acc.code.includes(q))) ||
            (cc && cc.name.toLowerCase().includes(q))
          );
        });

      const entryYear = je.date ? je.date.split("-")[0] : je.financialYear;
      const matchesYear =
        !filterYear ||
        filterYear === "ALL" ||
        je.financialYear === filterYear ||
        entryYear === filterYear;

      const entryMonth = je.date ? parseInt(je.date.split("-")[1], 10).toString() : "";
      const matchesMonth =
        !filterMonth ||
        filterMonth === "ALL" ||
        entryMonth === filterMonth;

      const matchesStart = !filterStartDate || je.date >= filterStartDate;
      const matchesEnd = !filterEndDate || je.date <= filterEndDate;

      return matchesSearch && matchesYear && matchesMonth && matchesStart && matchesEnd;
    });

    return list.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.entryNumber.localeCompare(a.entryNumber);
    });
  }, [
    journalEntries,
    searchQuery,
    filterYear,
    filterMonth,
    filterStartDate,
    filterEndDate,
    accounts,
    costCenters,
    partners,
    inventoryItems,
  ]);

  // Helper for printing
  const handlePrintJournalVoucher = (entry: JournalEntry) => {
    const totalD = entry.lines.reduce((s, l) => s + l.debit, 0);

    const rows = entry.lines
      .map((l) => {
        const acc = accounts.find((a) => a.id === l.accountId);
        const cc = costCenters.find((c) => c.id === l.costCenterId);
        const part = partners.find((p) => p.id === l.partnerId);
        const itm = inventoryItems.find((i) => i.id === l.inventoryItemId);

        return `
        <tr>
          <td>${acc ? `${acc.code} - ${acc.nameAr}` : "-"}</td>
          <td>${cc ? cc.name : "-"}</td>
          <td>${part ? `👤 ${part.name}` : itm ? `📦 ${itm.name}` : "-"}</td>
          <td style="font-weight: bold; color: green;">${l.debit > 0 ? l.debit.toLocaleString() : "-"}</td>
          <td style="font-weight: bold; color: red;">${l.credit > 0 ? l.credit.toLocaleString() : "-"}</td>
          <td>${l.note || "-"}</td>
        </tr>
      `;
      })
      .join("");

    const html = `
      <div style="border-bottom: 2px solid #334155; padding-bottom: 12px; margin-bottom: 20px;">
        <h2>سند قيد يومية محاسبي</h2>
        <p><strong>رقم القيد:</strong> ${entry.entryNumber} | <strong>التاريخ:</strong> ${entry.date} | <strong>السنة المالية:</strong> ${entry.financialYear || "-"}</p>
        <p><strong>المرجع:</strong> ${entry.reference || "-"} | <strong>المسؤول:</strong> ${entry.createdBy || "-"}</p>
        <p><strong>البيان والملحوظات:</strong> ${entry.notes || "-"}</p>
      </div>

      ${
        entry.attachmentUrl
          ? `
        <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff8f0;">
          <p style="font-weight: bold; margin-bottom: 8px; color: #b45309;">صورة المستند / الإيصال المرفق بالسند:</p>
          <img src="${entry.attachmentUrl}" style="max-width: 380px; max-height: 250px; object-fit: contain; border-radius: 6px; border: 1px solid #f59e0b;" />
        </div>
      `
          : ""
      }

      <table>
        <thead>
          <tr>
            <th>اسم الحساب والكود</th>
            <th>مركز التكلفة / المشروع</th>
            <th>الطرف المرتبط (عميل/مورد/صنف)</th>
            <th>مدين (+)</th>
            <th>دائن (-)</th>
            <th>شرح البند</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="font-weight: bold; background-color: #f1f5f9;">
            <td colspan="3">الإجمالي المتوازن:</td>
            <td style="color: green;">${totalD.toLocaleString()} ${companySettings.currency}</td>
            <td style="color: red;">${totalD.toLocaleString()} ${companySettings.currency}</td>
            <td>قيد متوازن ومرحل</td>
          </tr>
        </tbody>
      </table>
    `;

    printReport(`سند قيد يومية - ${entry.entryNumber}`, html, companySettings);
  };

  // Export Individual Journal Voucher to PDF
  const handleExportPdfJournalVoucher = async (entry: JournalEntry) => {
    const totalD = entry.lines.reduce((s, l) => s + l.debit, 0);

    const rows = entry.lines
      .map((l) => {
        const acc = accounts.find((a) => a.id === l.accountId);
        const cc = costCenters.find((c) => c.id === l.costCenterId);
        const part = partners.find((p) => p.id === l.partnerId);
        const itm = inventoryItems.find((i) => i.id === l.inventoryItemId);

        return `
        <tr>
          <td>${acc ? `${acc.code} - ${acc.nameAr}` : "-"}</td>
          <td>${cc ? cc.name : "-"}</td>
          <td>${part ? `👤 ${part.name}` : itm ? `📦 ${itm.name}` : "-"}</td>
          <td style="font-weight: bold; color: green;">${l.debit > 0 ? l.debit.toLocaleString() : "-"}</td>
          <td style="font-weight: bold; color: red;">${l.credit > 0 ? l.credit.toLocaleString() : "-"}</td>
          <td>${l.note || "-"}</td>
        </tr>
      `;
      })
      .join("");

    const html = `
      <div style="border-bottom: 2px solid #334155; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="font-size: 16px; margin: 0 0 6px 0;">سند قيد يومية محاسبي موثق</h2>
        <p style="margin: 2px 0;"><strong>رقم القيد:</strong> ${entry.entryNumber} | <strong>التاريخ:</strong> ${entry.date} | <strong>السنة المالية:</strong> ${entry.financialYear || "-"}</p>
        <p style="margin: 2px 0;"><strong>المرجع:</strong> ${entry.reference || "-"} | <strong>المسؤول:</strong> ${entry.createdBy || "-"}</p>
        <p style="margin: 2px 0;"><strong>البيان والملحوظات:</strong> ${entry.notes || "-"}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>اسم الحساب والكود</th>
            <th>مركز التكلفة / المشروع</th>
            <th>الطرف المرتبط (عميل/مورد/صنف)</th>
            <th>مدين (+)</th>
            <th>دائن (-)</th>
            <th>شرح البند</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="font-weight: bold; background-color: #f1f5f9;">
            <td colspan="3">الإجمالي المتوازن:</td>
            <td style="color: green;">${totalD.toLocaleString()} ${companySettings.currency}</td>
            <td style="color: red;">${totalD.toLocaleString()} ${companySettings.currency}</td>
            <td>قيد متوازن ومرحل آلياً</td>
          </tr>
        </tbody>
      </table>
    `;

    await exportReportToPdf(`سند_قيد_${entry.entryNumber}`, html, companySettings);
  };

  // Direct WhatsApp Share for Journal Entry
  const handleSendWhatsAppJournalEntry = (entry: JournalEntry) => {
    const totalD = entry.lines.reduce((s, l) => s + l.debit, 0);
    const linesSummary = entry.lines
      .slice(0, 8)
      .map((l) => {
        const acc = accounts.find((a) => a.id === l.accountId);
        const name = acc ? acc.nameAr : "حساب";
        const val = l.debit > 0 ? `مدين: ${l.debit.toLocaleString()}` : `دائن: ${l.credit.toLocaleString()}`;
        return `▫️ ${name} (${val})`;
      })
      .join("\n");

    const moreText = entry.lines.length > 8 ? `\n...وعدد ${entry.lines.length - 8} بنود إضافية` : "";

    const msg = `🏢 *${companySettings.companyName || "نظام المحاسب ERP"}*\n📑 *سند قيد محاسبي رقم:* ${entry.entryNumber}\n\n📅 *التاريخ:* ${entry.date}\n📝 *البيان:* ${entry.notes || "قيد يومية معتمد"}\n💵 *الإجمالي المتوازن:* ${totalD.toLocaleString()} ${companySettings.currency}\n\n*بنود القيد:*\n${linesSummary}${moreText}\n\n✅ القيد مرحل ومتوازن بدفاتر الحسابات.`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  // Export Entire Filtered Journal to PDF
  const handleExportJournalToPdf = async () => {
    const rows = filteredEntries
      .map((je) => {
        const tot = je.lines.reduce((s, l) => s + l.debit, 0);
        return `
        <tr>
          <td style="font-weight: bold; text-align: center;">${je.entryNumber}</td>
          <td style="text-align: center;">${je.date}</td>
          <td>${je.notes || "-"}</td>
          <td style="text-align: center;">${je.lines.length} طرف</td>
          <td style="font-weight: bold; text-align: right; color: green;">${tot.toLocaleString()} ${companySettings.currency}</td>
          <td style="text-align: center;">مرحل</td>
        </tr>
      `;
      })
      .join("");

    const totalSum = filteredEntries.reduce(
      (sum, je) => sum + je.lines.reduce((s, l) => s + l.debit, 0),
      0
    );

    const html = `
      <div style="margin-bottom: 12px;">
        <p><strong>كشف دفتر اليومية العامة:</strong> عدد ${filteredEntries.length} قيود محاسبية</p>
        <p><strong>الفترة:</strong> من ${filterStartDate || "بداية الفترة"} إلى ${filterEndDate || "نهاية الفترة"}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>رقم القيد</th>
            <th>التاريخ</th>
            <th>البيان والتفاصيل</th>
            <th>الأطراف</th>
            <th>القيمة المتوازنة</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="font-weight: bold; background-color: #f1f5f9;">
            <td colspan="4" style="text-align: right;">إجمالي حركة القيود:</td>
            <td style="color: green; text-align: right;">${totalSum.toLocaleString()} ${companySettings.currency}</td>
            <td style="text-align: center;">معتمد</td>
          </tr>
        </tbody>
      </table>
    `;

    await exportReportToPdf(`دفتر_اليومية_${companySettings.companyName}`, html, companySettings);
  };

  // Export Journal to Excel
  const handleExportJournalToExcel = () => {
    const data = filteredEntries.flatMap((je) =>
      je.lines.map((l) => {
        const acc = accounts.find((a) => a.id === l.accountId);
        const cc = costCenters.find((c) => c.id === l.costCenterId);
        const part = partners.find((p) => p.id === l.partnerId);
        const itm = inventoryItems.find((i) => i.id === l.inventoryItemId);

        return {
          "رقم القيد اليدوي": je.entryNumber,
          التاريخ: je.date,
          "السنة المالية": je.financialYear,
          المرجع: je.reference || "-",
          "كود الحساب": acc?.code || "-",
          "اسم الحساب": acc?.nameAr || "-",
          "الطرف المرتبط (عميل/مورد)": part?.name || l.employeeName || "-",
          "الصنف المخزني": itm ? `${itm.sku} - ${itm.name}` : "-",
          "الكمية التأثيرية": l.inventoryQuantity || "-",
          "مركز التكلفة / المشروع": cc?.name || "-",
          "مدين (+)": l.debit,
          "دائن (-)": l.credit,
          "البيان والتفاصيل": l.note || je.notes || "-",
        };
      })
    );

    exportToExcel(data, `دفتر_اليومية_العامة_${companySettings.companyName}`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <span>قيود اليومية العامة والمعاملات المالية</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            تسجيل القيود المحاسبية، والتأثير المباشر والآلي على حسابات المبيعات والمشتريات والعملاء والموردين والمخزون
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenNewModal("SALES")}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-md shadow-emerald-950"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>قيد مبيعات فوري</span>
          </button>
          <button
            onClick={() => handleOpenNewModal("PURCHASES")}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-md shadow-purple-950"
          >
            <Package className="w-4 h-4" />
            <span>قيد مشتريات وتوريد</span>
          </button>
          <button
            onClick={() => handleOpenNewModal("MANUAL")}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            <span>قيد يدوي عام</span>
          </button>
          <button
            onClick={handleExportJournalToExcel}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير إكسل</span>
          </button>
          <button
            onClick={handleExportJournalToPdf}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
            title="تصدير دفتر اليومية كاملاً إلى ملف PDF"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>تصدير اليومية PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="بحث برقم القيد، المرجع، اسم الحساب، العميل، المورد، أو الصنف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-9 pl-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">السنة المالية:</span>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 font-bold"
          >
            <option value="ALL">جميع السنوات (الكل)</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                سنة {yr}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">الشهر:</span>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 font-bold"
          >
            <option value="ALL">جميع الشهور (الكل)</option>
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

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400">من:</span>
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
          />
          <span className="text-slate-400">إلى:</span>
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        {(searchQuery || filterStartDate || filterEndDate || filterYear !== "ALL" || filterMonth !== "ALL") && (
          <button
            onClick={() => {
              setSearchQuery("");
              setFilterYear("ALL");
              setFilterMonth("ALL");
              setFilterStartDate("");
              setFilterEndDate("");
            }}
            className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs px-2.5 py-1.5 rounded-lg border border-rose-800/40 transition"
          >
            إعادة ضبط التصفية
          </button>
        )}
      </div>

      {/* Filter Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <span className="text-slate-400">عدد القيود في النطاق المحدد:</span>
          <span className="font-bold text-blue-400 font-mono text-sm">{filteredEntries.length} قيد</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <span className="text-slate-400">إجمالي حركة الفترة/السنة:</span>
          <span className="font-bold text-emerald-400 font-mono text-sm">
            {filteredEntries
              .reduce((acc, entry) => acc + entry.lines.reduce((s, l) => s + (l.debit || 0), 0), 0)
              .toLocaleString()}{" "}
            {companySettings.currency}
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <span className="text-slate-400">التصفية الحالية بحسب السنة:</span>
          <span className="font-bold text-amber-400 bg-amber-950/40 px-2.5 py-0.5 rounded border border-amber-500/30">
            {filterYear === "ALL" ? "جميع السنوات" : `سنة ${filterYear}`}
          </span>
        </div>
      </div>

      {/* Journal Entries List */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-2">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-slate-300 font-semibold text-sm">لا توجد قيود يومية تطابق معايير التصفية والتاريخ المحددة</p>
            <p className="text-slate-500 text-xs">جرّب تغيير السنة المالية أو نطاق التاريخ أو كلمة البحث.</p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const entryTotalDebit = entry.lines.reduce((s, l) => s + l.debit, 0);
            const entryYear = entry.financialYear || (entry.date ? entry.date.split("-")[0] : "");

            // Identify special attributes
            const hasInventoryLine = entry.lines.some((l) => !!l.inventoryItemId);
            const hasPartnerLine = entry.lines.some((l) => !!l.partnerId);

            return (
              <div
                key={entry.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-blue-400 bg-blue-950/40 px-2.5 py-1 rounded border border-blue-500/30">
                      {entry.entryNumber}
                    </span>
                    <span className="text-xs text-amber-300 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                      سنة {entryYear}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold">{entry.date}</span>
                    {entry.reference && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        مرجع: {entry.reference}
                      </span>
                    )}
                    {hasInventoryLine && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-500/40">
                        <Package className="w-3 h-3 text-blue-400" />
                        <span>مؤثر بالمخزون</span>
                      </span>
                    )}
                    {hasPartnerLine && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/40">
                        <Users className="w-3 h-3 text-purple-400" />
                        <span>مؤثر بحسابات الشركاء</span>
                      </span>
                    )}
                    {entry.attachmentUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(entry.attachmentUrl!)}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/40 hover:bg-amber-900/60 transition cursor-pointer font-medium"
                      >
                        <Paperclip className="w-3 h-3 text-amber-400" />
                        <span>مرفق مستند/إيصال</span>
                      </button>
                    )}
                    <span className="text-xs text-slate-400">• بواسطة: {entry.createdBy}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white bg-slate-800 px-3 py-1 rounded-lg">
                      الإجمالي: {entryTotalDebit.toLocaleString()} {companySettings.currency}
                    </span>
                    <button
                      onClick={() => handleSendWhatsAppJournalEntry(entry)}
                      className="p-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 border border-emerald-500/30 rounded-lg transition text-xs flex items-center gap-1 font-semibold"
                      title="إرسال سند القيد وتفاصيل البنود عبر واتساب"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>واتساب</span>
                    </button>
                    <button
                      onClick={() => handleExportPdfJournalVoucher(entry)}
                      className="p-1.5 bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/30 rounded-lg transition text-xs flex items-center gap-1 font-semibold"
                      title="تنزيل سند القيد بصيغة PDF"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={() => handlePrintJournalVoucher(entry)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition text-xs flex items-center gap-1"
                      title="طباعة سند القيد"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة</span>
                    </button>
                    <button
                      onClick={() => handleEditJournal(entry)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition text-xs flex items-center gap-1"
                      title="تعديل القيد المحاسبي"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>
                    <button
                      onClick={() => setDeleteConfirmEntry({ id: entry.id, num: entry.entryNumber })}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg transition text-xs flex items-center gap-1"
                      title="حذف القيد"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 font-medium">{entry.notes}</p>

                {/* Lines Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right text-slate-300">
                    <thead className="bg-slate-800/60 text-slate-400">
                      <tr>
                        <th className="p-2">الحساب</th>
                        <th className="p-2">مركز التكلفة / المشروع</th>
                        <th className="p-2">مدين (+)</th>
                        <th className="p-2">دائن (-)</th>
                        <th className="p-2">الطرف المرتبط / الصنف المخزني</th>
                        <th className="p-2">البيان الشارح</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {entry.lines.map((l) => {
                        const acc = accounts.find((a) => a.id === l.accountId);
                        const cc = costCenters.find((c) => c.id === l.costCenterId);
                        const part = partners.find((p) => p.id === l.partnerId);
                        const itm = inventoryItems.find((i) => i.id === l.inventoryItemId);

                        return (
                          <tr key={l.id}>
                            <td className="p-2 font-medium">
                              <div>{acc ? `${acc.code} - ${acc.nameAr}` : "-"}</div>
                              {l.chequeNumber && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-mono font-bold mt-0.5 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                  <CreditCard className="w-3 h-3" />
                                  <span>شيك #: {l.chequeNumber}</span>
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-slate-400">{cc ? cc.name : "-"}</td>
                            <td className="p-2 font-bold text-emerald-400">
                              {l.debit > 0 ? l.debit.toLocaleString() : "-"}
                            </td>
                            <td className="p-2 font-bold text-rose-400">
                              {l.credit > 0 ? l.credit.toLocaleString() : "-"}
                            </td>
                            <td className="p-2 text-slate-300">
                              {part && (
                                <div className="inline-flex items-center gap-1 bg-purple-950/40 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                                  <Users className="w-3 h-3" />
                                  <span>{part.type === "CUSTOMER" ? "عميل:" : "مورد:"} {part.name}</span>
                                </div>
                              )}
                              {itm && (
                                <div className="inline-flex items-center gap-1 bg-blue-950/40 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-bold mt-0.5">
                                  <Package className="w-3 h-3" />
                                  <span>
                                    {itm.name} ({l.debit > 0 ? "+" : "-"}{l.inventoryQuantity || 1} {itm.unit})
                                  </span>
                                </div>
                              )}
                              {!part && !itm && l.employeeName && (
                                <div className="text-[10px] text-amber-300 font-semibold">
                                  {l.employeeName}
                                </div>
                              )}
                              {!part && !itm && !l.employeeName && "-"}
                            </td>
                            <td className="p-2 text-slate-400">{l.note || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New / Edit Journal Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-5 shadow-2xl text-slate-100 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingEntry ? "تعديل القيد المحاسبي" : "إنشاء قيد محاسبي جديد"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    يمكنك استخدام القوالب الذكية للمبيعات والمشتريات لتحديث الحسابات والمخزون آلياً
                  </p>
                </div>
              </div>

              {/* Mode Switcher Tabs */}
              {!editingEntry && (
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalMode("MANUAL")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      modalMode === "MANUAL"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    قيد يدوي حر
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode("SALES")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      modalMode === "SALES"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-emerald-400 hover:text-emerald-300"
                    }`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>قالب مبيعات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode("PURCHASES")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      modalMode === "PURCHASES"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-purple-400 hover:text-purple-300"
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>قالب مشتريات</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* ========================================================================= */}
            {/* SALES WIZARD VIEW */}
            {/* ========================================================================= */}
            {modalMode === "SALES" && (
              <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-emerald-500/30">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-sm text-emerald-300">مساعد إدخال قيد مبيعات فوري (تأثير المخزون والعميل)</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold">
                    يتم خصم الكمية من المخزون وترحيل المديونية تلقائياً
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">طريقة التحصيل / الحساب المدين *</label>
                    <div className="grid grid-cols-3 gap-1 mb-2">
                      <button
                        type="button"
                        onClick={() => setSalesPartnerType("CUSTOMER")}
                        className={`py-1 rounded text-center font-bold ${
                          salesPartnerType === "CUSTOMER" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        آجل (عميل)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSalesPartnerType("CASH")}
                        className={`py-1 rounded text-center font-bold ${
                          salesPartnerType === "CASH" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        نقدي (خزينة)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSalesPartnerType("BANK")}
                        className={`py-1 rounded text-center font-bold ${
                          salesPartnerType === "BANK" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        بنك
                      </button>
                    </div>

                    {salesPartnerType === "CUSTOMER" && (
                      <select
                        value={salesPartnerId}
                        onChange={(e) => setSalesPartnerId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
                      >
                        <option value="">-- اختر العميل --</option>
                        {partners
                          .filter((p) => p.type === "CUSTOMER")
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (رصيد: {p.balance.toLocaleString()})
                            </option>
                          ))}
                      </select>
                    )}

                    {salesPartnerType === "BANK" && (
                      <select
                        value={salesBankAccountId}
                        onChange={(e) => setSalesBankAccountId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
                      >
                        {accounts
                          .filter((a) => a.code.startsWith("1113") || a.nameAr.includes("بنك"))
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} - {a.nameAr}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">الصنف المخزني المباع *</label>
                    <select
                      value={salesItemId}
                      onChange={(e) => setSalesItemId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
                    >
                      {inventoryItems.map((itm) => (
                        <option key={itm.id} value={itm.id}>
                          {itm.sku} - {itm.name} (المتوفر: {itm.quantity} {itm.unit})
                        </option>
                      ))}
                    </select>
                    {salesItemId && (
                      <div className="text-[11px] text-blue-400 mt-1 font-semibold">
                        الرصيد المتاح: {inventoryItems.find((i) => i.id === salesItemId)?.quantity}{" "}
                        {inventoryItems.find((i) => i.id === salesItemId)?.unit} | تكلفة الوحدة:{" "}
                        {inventoryItems.find((i) => i.id === salesItemId)?.unitCost.toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">حساب إيرادات المبيعات *</label>
                    <select
                      value={salesRevenueAccountId}
                      onChange={(e) => setSalesRevenueAccountId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
                    >
                      {accounts
                        .filter((a) => a.code.startsWith("4") || a.type === "REVENUE" || a.nameAr.includes("مبيعات"))
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.nameAr}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">الكمية المباعة *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={salesQuantity}
                      onChange={(e) => setSalesQuantity(Number(e.target.value) || 0)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">سعر بيع الوحدة *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={salesUnitPrice}
                      onChange={(e) => setSalesUnitPrice(Number(e.target.value) || 0)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-emerald-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">ضريبة القيمة المضافة (VAT)</label>
                    <select
                      value={salesVatRate}
                      onChange={(e) => setSalesVatRate(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white font-bold"
                    >
                      <option value="14">14% - ضريبة القيمة المضافة القياسية</option>
                      <option value="0">0% - معفاة من الضريبة</option>
                    </select>
                  </div>
                </div>

                {/* Calculation Preview */}
                {(() => {
                  const sub = Math.round(salesQuantity * salesUnitPrice * 100) / 100;
                  const vat = salesVatRate > 0 ? Math.round((sub * (salesVatRate / 100)) * 100) / 100 : 0;
                  const tot = sub + vat;
                  const selItm = inventoryItems.find((i) => i.id === salesItemId);

                  return (
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
                      <div className="flex flex-wrap items-center justify-between text-xs font-bold gap-2">
                        <span className="text-slate-300">
                          صافي المبيعات: <strong className="text-white">{sub.toLocaleString()} {companySettings.currency}</strong>
                        </span>
                        <span className="text-blue-300">
                          قيمة الضريبة (14%): <strong>{vat.toLocaleString()} {companySettings.currency}</strong>
                        </span>
                        <span className="text-emerald-400 text-sm">
                          الإجمالي الشامل: <strong>{tot.toLocaleString()} {companySettings.currency}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-amber-300 bg-amber-950/40 p-1.5 rounded border border-amber-500/20">
                        <Info className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>
                          الأثر الفوري: سيتم تخفيض رصيد الصنف ({selItm?.name || "الصنف"}) في المخزون بمقدار (
                          {salesQuantity} {selItm?.unit || "وحدة"}) فور حفظ القيد!
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMode("MANUAL")}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded font-medium text-xs"
                  >
                    تراجع إلى القيد اليدوي
                  </button>
                  <button
                    type="button"
                    onClick={applySalesWizard}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-950"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>توليد وتطبيق أسطر قيد المبيعات</span>
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PURCHASES WIZARD VIEW */}
            {/* ========================================================================= */}
            {modalMode === "PURCHASES" && (
              <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-purple-500/30">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-400" />
                    <span className="font-bold text-sm text-purple-300">مساعد إدخال قيد مشتريات وتوريد (تأثير المخزون والمورد)</span>
                  </div>
                  <span className="text-[11px] text-purple-400 bg-purple-950/50 px-2 py-0.5 rounded border border-purple-500/30 font-semibold">
                    يتم إضافة الكمية للمخزون وترحيل مستحقات المورد تلقائياً
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">طريقة السداد / الحساب الدائن *</label>
                    <div className="grid grid-cols-3 gap-1 mb-2">
                      <button
                        type="button"
                        onClick={() => setPurchasesPartnerType("SUPPLIER")}
                        className={`py-1 rounded text-center font-bold ${
                          purchasesPartnerType === "SUPPLIER" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        آجل (مورد)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPurchasesPartnerType("CASH")}
                        className={`py-1 rounded text-center font-bold ${
                          purchasesPartnerType === "CASH" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        نقدي (خزينة)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPurchasesPartnerType("BANK")}
                        className={`py-1 rounded text-center font-bold ${
                          purchasesPartnerType === "BANK" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        بنك
                      </button>
                    </div>

                    {purchasesPartnerType === "SUPPLIER" && (
                      <select
                        value={purchasesPartnerId}
                        onChange={(e) => setPurchasesPartnerId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
                      >
                        <option value="">-- اختر المورد --</option>
                        {partners
                          .filter((p) => p.type === "SUPPLIER")
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (مستحقات: {p.balance.toLocaleString()})
                            </option>
                          ))}
                      </select>
                    )}

                    {purchasesPartnerType === "BANK" && (
                      <select
                        value={purchasesBankAccountId}
                        onChange={(e) => setPurchasesBankAccountId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
                      >
                        {accounts
                          .filter((a) => a.code.startsWith("1113") || a.nameAr.includes("بنك"))
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} - {a.nameAr}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">الصنف المخزني المشتري *</label>
                    <select
                      value={purchasesItemId}
                      onChange={(e) => setPurchasesItemId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
                    >
                      {inventoryItems.map((itm) => (
                        <option key={itm.id} value={itm.id}>
                          {itm.sku} - {itm.name} (المتوفر حالياً: {itm.quantity} {itm.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">حساب المخزون / المشتريات *</label>
                    <select
                      value={purchasesInventoryAccountId}
                      onChange={(e) => setPurchasesInventoryAccountId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
                    >
                      {accounts
                        .filter(
                          (a) =>
                            a.code.startsWith("114") ||
                            a.code.startsWith("1115") ||
                            a.code.startsWith("5110") ||
                            a.nameAr.includes("مخزون") ||
                            a.nameAr.includes("مشتريات")
                        )
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.nameAr}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">الكمية المشتراة *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={purchasesQuantity}
                      onChange={(e) => setPurchasesQuantity(Number(e.target.value) || 0)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">سعر شراء الوحدة / التكلفة *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={purchasesUnitCost}
                      onChange={(e) => setPurchasesUnitCost(Number(e.target.value) || 0)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-purple-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">ضريبة القيمة المضافة (مدخلات)</label>
                    <select
                      value={purchasesVatRate}
                      onChange={(e) => setPurchasesVatRate(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white font-bold"
                    >
                      <option value="14">14% - ضريبة القيمة المضافة القياسية (مدخلات)</option>
                      <option value="0">0% - بدون ضريبة</option>
                    </select>
                  </div>
                </div>

                {/* Calculation Preview */}
                {(() => {
                  const sub = Math.round(purchasesQuantity * purchasesUnitCost * 100) / 100;
                  const vat = purchasesVatRate > 0 ? Math.round((sub * (purchasesVatRate / 100)) * 100) / 100 : 0;
                  const tot = sub + vat;
                  const selItm = inventoryItems.find((i) => i.id === purchasesItemId);

                  return (
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
                      <div className="flex flex-wrap items-center justify-between text-xs font-bold gap-2">
                        <span className="text-slate-300">
                          صافي المشتريات: <strong className="text-white">{sub.toLocaleString()} {companySettings.currency}</strong>
                        </span>
                        <span className="text-blue-300">
                          ضريبة المدخلات (14%): <strong>{vat.toLocaleString()} {companySettings.currency}</strong>
                        </span>
                        <span className="text-purple-400 text-sm">
                          الإجمالي المستحق: <strong>{tot.toLocaleString()} {companySettings.currency}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-amber-300 bg-amber-950/40 p-1.5 rounded border border-amber-500/20">
                        <Info className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>
                          الأثر الفوري: سيتم زيادة رصيد الصنف ({selItm?.name || "الصنف"}) في المخزون بمقدار (
                          {purchasesQuantity} {selItm?.unit || "وحدة"}) فور حفظ القيد!
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMode("MANUAL")}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded font-medium text-xs"
                  >
                    تراجع إلى القيد اليدوي
                  </button>
                  <button
                    type="button"
                    onClick={applyPurchasesWizard}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold text-xs flex items-center gap-1 shadow-md shadow-purple-950"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>توليد وتطبيق أسطر قيد المشتريات</span>
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* MANUAL / DETAILED MULTI-LINE FORM */}
            {/* ========================================================================= */}
            <form onSubmit={handleSubmitJournal} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">رقم القيد المحاسبي *</label>
                  <input
                    type="text"
                    required
                    value={manualEntryNumber}
                    onChange={(e) => setManualEntryNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono font-bold"
                    placeholder="مثال: قيد-101"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">التاريخ *</label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">المرجع المستندي</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                    placeholder="رقم الفاتورة أو العقد..."
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 flex items-center justify-between font-semibold">
                    <span>صورة المستند / الإيصال</span>
                    {attachmentUrl && (
                      <button
                        type="button"
                        onClick={() => setAttachmentUrl("")}
                        className="text-[10px] text-rose-400 hover:underline"
                      >
                        حذف
                      </button>
                    )}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <label className="cursor-pointer flex items-center justify-center gap-1 px-2 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-amber-400 w-full transition">
                      <Paperclip className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate text-[11px]">
                        {attachmentUrl ? "تغيير المستند" : "إرفاق صورة/إيصال"}
                      </span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    {attachmentUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(attachmentUrl)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded border border-amber-500/50 text-amber-300 shrink-0"
                        title="معاينة المستند المرفق"
                      >
                        <FileImage className="w-4 h-4 text-amber-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">البيان العام والشرح للقيد *</label>
                <input
                  type="text"
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-medium"
                  placeholder="شرح وتفاصيل المعاملة المالية..."
                />
              </div>

              {/* Multi-Line Entry Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-2">
                    <span>بنود القيد المحاسبي (مدين / دائن)</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      (يمكن ربط البند بعميل، مورد، أو صنف مخزني للتأثير الآلي)
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 px-2.5 py-1 rounded font-semibold border border-slate-700"
                  >
                    + إضافة بند آخر
                  </button>
                </div>

                <div className="space-y-3">
                  {lines.map((line) => {
                    const selAcc = accounts.find((a) => a.id === line.accountId);
                    const isBankAcc =
                      selAcc &&
                      (selAcc.code.startsWith("1113") || selAcc.code.startsWith("1114") || selAcc.nameAr.includes("بنك"));
                    const isInventoryAcc =
                      selAcc &&
                      (selAcc.code.startsWith("114") ||
                        selAcc.code.startsWith("1115") ||
                        selAcc.code.startsWith("115") ||
                        selAcc.code.startsWith("112") ||
                        selAcc.nameAr.includes("مخزون") ||
                        selAcc.nameAr.includes("بضاعة"));
                    const isSalesAcc =
                      selAcc &&
                      (selAcc.code.startsWith("4") ||
                        selAcc.type === "REVENUE" ||
                        selAcc.nameAr.includes("مبيعات") ||
                        selAcc.nameAr.includes("إيرادات"));
                    const isPurchasesAcc =
                      selAcc &&
                      (selAcc.code.startsWith("5110") ||
                        selAcc.code.startsWith("511") ||
                        selAcc.nameAr.includes("مشتريات"));
                    const isCustomerAcc =
                      selAcc &&
                      (selAcc.code.startsWith("1120") ||
                        selAcc.code.startsWith("112") ||
                        selAcc.nameAr.includes("عملاء") ||
                        selAcc.nameAr.includes("عميل"));
                    const isSupplierAcc =
                      selAcc &&
                      (selAcc.code.startsWith("2110") ||
                        selAcc.code.startsWith("211") ||
                        selAcc.nameAr.includes("موردين") ||
                        selAcc.nameAr.includes("مورد"));

                    // Determine auto inventory effect
                    const willAddStock =
                      (isPurchasesAcc || (isInventoryAcc && (line.debit || 0) > 0)) && (line.debit || 0) > 0;
                    const willReduceStock =
                      (isSalesAcc || (isInventoryAcc && (line.credit || 0) > 0)) && (line.credit || 0) > 0;

                    return (
                      <div
                        key={line.id}
                        className={`p-3 rounded-xl border transition space-y-2.5 ${
                          isSalesAcc
                            ? "bg-emerald-950/20 border-emerald-500/40"
                            : isPurchasesAcc
                            ? "bg-purple-950/20 border-purple-500/40"
                            : isBankAcc
                            ? "bg-amber-950/20 border-amber-500/40"
                            : isInventoryAcc
                            ? "bg-blue-950/20 border-blue-500/40"
                            : isCustomerAcc || isSupplierAcc
                            ? "bg-indigo-950/20 border-indigo-500/40"
                            : "bg-slate-800/40 border-slate-800"
                        }`}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                          <div className="md:col-span-4">
                            <label className="block text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                              <span className="font-semibold">الحساب الفرعي *</span>
                              {isSalesAcc && (
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                                  🛍️ حساب مبيعات
                                </span>
                              )}
                              {isPurchasesAcc && (
                                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold">
                                  🛒 حساب مشتريات
                                </span>
                              )}
                              {isInventoryAcc && (
                                <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">
                                  📦 حساب مخزون
                                </span>
                              )}
                              {isCustomerAcc && (
                                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-bold">
                                  👥 حساب عملاء
                                </span>
                              )}
                              {isSupplierAcc && (
                                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-bold">
                                  🏢 حساب موردين
                                </span>
                              )}
                              {isBankAcc && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                                  🏦 حساب بنكي
                                </span>
                              )}
                            </label>
                            <select
                              value={line.accountId}
                              onChange={(e) => handleLineChange(line.id, "accountId", e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white text-xs font-semibold"
                            >
                              <option value="" disabled>-- اختر الحساب الفرعي --</option>
                              {groupedSubAccounts.map((group) => (
                                <optgroup key={group.parentName} label={`📂 ${group.parentName}`}>
                                  {group.items.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {a.code} - {a.nameAr}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </div>

                          {isBankAcc && (
                            <div className="md:col-span-2">
                              <label className="block text-[10px] text-amber-300 font-semibold mb-1 flex items-center gap-1">
                                <CreditCard className="w-3 h-3 text-amber-400 shrink-0" />
                                <span>رقم الشيك</span>
                              </label>
                              <input
                                type="text"
                                value={line.chequeNumber || ""}
                                onChange={(e) => handleLineChange(line.id, "chequeNumber", e.target.value)}
                                className="w-full bg-slate-900 border border-amber-500/60 rounded p-1.5 text-amber-300 font-mono font-bold text-xs"
                                placeholder="أدخل رقم الشيك..."
                              />
                            </div>
                          )}

                          <div className={isBankAcc ? "md:col-span-2" : "md:col-span-2"}>
                            <label className="block text-[10px] text-slate-400 mb-1">مركز التكلفة</label>
                            <select
                              value={line.costCenterId || ""}
                              onChange={(e) => handleLineChange(line.id, "costCenterId", e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white text-xs"
                            >
                              <option value="">بدون مركز تكلفة</option>
                              {costCenters.map((cc) => (
                                <option key={cc.id} value={cc.id}>
                                  {cc.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="md:col-span-1.5">
                            <label className="block text-[10px] text-slate-400 mb-1 font-bold text-emerald-400">
                              مدين (+)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={line.debit || ""}
                              onChange={(e) => handleLineChange(line.id, "debit", e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-emerald-400 font-bold text-xs"
                              placeholder="0.00"
                            />
                          </div>

                          <div className="md:col-span-1.5">
                            <label className="block text-[10px] text-slate-400 mb-1 font-bold text-rose-400">
                              دائن (-)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={line.credit || ""}
                              onChange={(e) => handleLineChange(line.id, "credit", e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-rose-400 font-bold text-xs"
                              placeholder="0.00"
                            />
                          </div>

                          <div className={isBankAcc ? "md:col-span-2" : "md:col-span-2.5"}>
                            <label className="block text-[10px] text-slate-400 mb-1">شرح البند</label>
                            <input
                              type="text"
                              value={line.note || ""}
                              onChange={(e) => handleLineChange(line.id, "note", e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white text-xs"
                              placeholder="شرح البند..."
                            />
                          </div>

                          <div className="md:col-span-0.5 flex items-center justify-center pb-1">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(line.id)}
                              className="p-1.5 text-rose-400 hover:bg-slate-700 rounded transition"
                              title="حذف البند"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Extended Connection Controls (Partners & Inventory) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                          {/* Partner Connection */}
                          <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 flex items-center gap-2">
                            <span className="text-[11px] text-purple-300 font-semibold shrink-0 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-purple-400" />
                              <span>العميل / المورد:</span>
                            </span>
                            <select
                              value={line.partnerId || ""}
                              onChange={(e) => handleLineChange(line.id, "partnerId", e.target.value || undefined)}
                              className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-white text-xs"
                            >
                              <option value="">-- بدون ربط بشريك محدد --</option>
                              <optgroup label="👥 العملاء">
                                {partners
                                  .filter((p) => p.type === "CUSTOMER")
                                  .map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} (عميل - رصيد: {p.balance.toLocaleString()})
                                    </option>
                                  ))}
                              </optgroup>
                              <optgroup label="🏢 الموردون">
                                {partners
                                  .filter((p) => p.type === "SUPPLIER")
                                  .map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} (مورد - رصيد: {p.balance.toLocaleString()})
                                    </option>
                                  ))}
                              </optgroup>
                            </select>
                          </div>

                          {/* Inventory Item Connection */}
                          <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 flex flex-wrap sm:flex-nowrap items-center gap-2">
                            <span className="text-[11px] text-blue-300 font-semibold shrink-0 flex items-center gap-1">
                              <Package className="w-3.5 h-3.5 text-blue-400" />
                              <span>الصنف المخزني:</span>
                            </span>
                            <select
                              value={line.inventoryItemId || ""}
                              onChange={(e) => handleLineChange(line.id, "inventoryItemId", e.target.value || undefined)}
                              className="flex-1 bg-slate-800 border border-slate-700 rounded p-1 text-white text-xs"
                            >
                              <option value="">-- بدون ربط بمخزون --</option>
                              {inventoryItems.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                  {inv.sku} - {inv.name} (المتوفر: {inv.quantity} {inv.unit})
                                </option>
                              ))}
                            </select>

                            {line.inventoryItemId && (
                              <div className="flex items-center gap-1 shrink-0">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={line.inventoryQuantity || ""}
                                  onChange={(e) =>
                                    handleLineChange(
                                      line.id,
                                      "inventoryQuantity",
                                      e.target.value ? Number(e.target.value) : undefined
                                    )
                                  }
                                  className="w-16 bg-slate-800 border border-blue-500/50 rounded p-1 text-white text-xs font-bold text-center"
                                  placeholder="الكمية"
                                />
                                <span className="text-blue-300 font-semibold text-[10px]">
                                  {inventoryItems.find((inv) => inv.id === line.inventoryItemId)?.unit || "وحدة"}
                                </span>
                              </div>
                            )}

                            {line.inventoryItemId && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                  willAddStock
                                    ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                                    : willReduceStock
                                    ? "bg-rose-950 text-rose-300 border border-rose-500/40"
                                    : "bg-blue-950 text-blue-300 border border-blue-500/40"
                                }`}
                              >
                                {willAddStock
                                  ? "🟢 وارد (+)"
                                  : willReduceStock
                                  ? "🔴 صرف (-)"
                                  : "📦 ربط صنف"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Balancing Bar */}
              <div
                className={`p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between text-xs font-bold ${
                  isBalanced
                    ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-950/40 text-rose-400 border border-rose-500/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isBalanced ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>
                    {isBalanced
                      ? "القيد متوازن وجاهز للترحيل"
                      : "تنبيه: القيد غير متوازن! الفارق: " + Math.abs(totalDebit - totalCredit).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-2 md:mt-0">
                  <span>إجمالي المدين: {totalDebit.toLocaleString()}</span>
                  <span>إجمالي الدائن: {totalCredit.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!isBalanced}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-lg font-bold shadow-md transition"
                >
                  حفظ وترحيل القيد المحاسبي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmEntry}
        message={`هل أنت متأكد من حذف القيد المحاسبي رقم (${deleteConfirmEntry?.num}) نهائياً من الدفاتر؟ سيتم التراجع عن التأثيرات في الحسابات والأستاذ العام والمخزون وحسابات الشركاء.`}
        onConfirm={() => {
          if (deleteConfirmEntry) {
            onDeleteJournalEntry(deleteConfirmEntry.id);
            setDeleteConfirmEntry(null);
          }
        }}
        onCancel={() => setDeleteConfirmEntry(null)}
      />

      {/* Document/Receipt Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 max-w-2xl w-full max-h-[90vh] flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileImage className="w-4 h-4 text-amber-400" />
                <span>معاينة صورة المستند / الإيصال المرفق</span>
              </h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-950 p-2 rounded-xl border border-slate-800 min-h-[250px]">
              <img
                src={previewImage}
                alt="صورة المستند المرفق"
                className="max-w-full max-h-[65vh] object-contain rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <a
                href={previewImage}
                download="document_receipt.png"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg"
              >
                تحميل الصورة
              </a>
              <button
                onClick={() => setPreviewImage(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
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
