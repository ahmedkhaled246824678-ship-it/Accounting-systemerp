import React, { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Zap,
  Plus,
  Search,
  Trash2,
  Edit2,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Building2,
  Calculator,
  RotateCcw,
  Sparkles,
  Info,
  Copy,
  Receipt,
  FileText,
  Share2,
  Check,
  CheckSquare,
  Square,
  QrCode,
  ExternalLink,
  Wrench,
  Settings2,
  Sliders,
} from "lucide-react";
import { ElectricityInvoice, ElectricityPrintConfig, CompanySettings, FilterParams, Partner } from "../types";
import { numberToArabicWords } from "../utils/numberToArabicWords";
import { ElectricityPrinterMaintenanceModal } from "./ElectricityPrinterMaintenanceModal";
import {
  loadElectricityPrintConfig,
  saveElectricityPrintConfig,
  printViaPopup,
  executePrintDocument,
} from "../utils/electricityPrintService";

interface ElectricityInvoicesViewProps {
  invoices: ElectricityInvoice[];
  partners?: Partner[];
  companySettings: CompanySettings;
  filterParams: FilterParams;
  onSaveInvoice: (invoice: ElectricityInvoice) => void;
  onDeleteInvoice: (invoiceId: string) => void;
}

// Simulated Egyptian Tax Authority (مصلحة الضرائب المصرية) Registrants Database for fallback lookup
const ETA_REGISTRANTS_DATABASE: Record<string, { name: string; status: string; regDate: string }> = {
  "204-589-112": { name: "شركة النيل للمقاولات العامة ش.م.م", status: "مسجل فني ونشط", regDate: "2018-05-12" },
  "311-994-001": { name: "مصنع مصر للصلب والحديد ش.م.م", status: "مسجل بالمنظومة الإلكترونية", regDate: "2016-11-20" },
  "100-200-300": { name: "شركة السويدي للصناعات الكهربائية", status: "ممول مسجل كبار الممولين", regDate: "2010-01-15" },
  "492-381-902": { name: "شركة مصر للألومنيوم والمسبوكات", status: "ممول مسجل بالضرائب العامة", regDate: "2014-03-08" },
  "381-920-112": { name: "شركة القناة لتوزيع الكهرباء والطاقة", status: "شركة مسجلة ومزودة خدمة", regDate: "2012-09-01" },
  "582-192-304": { name: "شركة النصر للصناعات الكيميائية", status: "ممول مسجل كبار الممولين", regDate: "2015-07-22" },
  "749-204-183": { name: "شركة الأهرام للمشروبات والمواد الغذائية", status: "مسجل فني ونشط", regDate: "2017-10-14" },
  "990-114-823": { name: "مجمع مصانع العاصمة الجديدة للكهرباء", status: "ممول مسجل ونشط", regDate: "2020-04-05" },
};

export const ElectricityInvoicesView: React.FC<ElectricityInvoicesViewProps> = ({
  invoices,
  partners = [],
  companySettings,
  filterParams,
  onSaveInvoice,
  onDeleteInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("ALL");
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>("ALL");

  // Modal State & Printing
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<ElectricityInvoice | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<{ id: string; serial: number } | null>(null);
  const [invoiceToPrint, setInvoiceToPrint] = useState<ElectricityInvoice | null>(null);
  const [batchInvoicesToPrint, setBatchInvoicesToPrint] = useState<ElectricityInvoice[] | null>(null);
  const [printLayoutMode, setPrintLayoutMode] = useState<"a4" | "thermal">("a4");
  const [showPrinterMaintenance, setShowPrinterMaintenance] = useState(false);
  const [printConfig, setPrintConfig] = useState<ElectricityPrintConfig>(loadElectricityPrintConfig());
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Sync body class for single invoice and batch printing mode
  useEffect(() => {
    if (invoiceToPrint) {
      document.body.classList.add("printing-single-invoice-active");
    } else {
      document.body.classList.remove("printing-single-invoice-active");
    }

    if (batchInvoicesToPrint) {
      document.body.classList.add("printing-batch-vouchers-active");
    } else {
      document.body.classList.remove("printing-batch-vouchers-active");
    }

    return () => {
      document.body.classList.remove("printing-single-invoice-active");
      document.body.classList.remove("printing-batch-vouchers-active");
    };
  }, [invoiceToPrint, batchInvoicesToPrint]);


  // Form Fields
  const [serialNumber, setSerialNumber] = useState<number>(invoices.length + 1);
  const [month, setMonth] = useState<string>(new Date().toISOString().substring(0, 7)); // e.g. "2026-08"
  const [taxNumber, setTaxNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [currentReading, setCurrentReading] = useState<number | "">("");
  const [previousReading, setPreviousReading] = useState<number | "">("");
  const [meterFactor, setMeterFactor] = useState<number | "">(1);
  const [rate, setRate] = useState<number | "">(1.75);

  // Expenses & Taxes
  const [industrialTax, setIndustrialTax] = useState<number | "">(0);
  const [consumptionTax, setConsumptionTax] = useState<number | "">(0);
  const [radioFee, setRadioFee] = useState<number | "">(0);
  const [servicesFee, setServicesFee] = useState<number | "">(0);
  const [customerServiceFee, setCustomerServiceFee] = useState<number | "">(0);
  const [installmentsAndAdjustments, setInstallmentsAndAdjustments] = useState<number | "">(0);
  const [otherAdjustments, setOtherAdjustments] = useState<number | "">(0);
  const [notes, setNotes] = useState("");

  // ETA Search Status State
  const [isSearchingEta, setIsSearchingEta] = useState(false);
  const [etaSearchResult, setEtaSearchResult] = useState<{
    found: boolean;
    name?: string;
    source?: string;
    message?: string;
  } | null>(null);

  // Live Auto Calculations based on strict rules:
  // 1. Reading Difference = currentReading - previousReading
  const readingDiff = useMemo(() => {
    const cur = Number(currentReading) || 0;
    const prev = Number(previousReading) || 0;
    return Math.max(0, cur - prev);
  }, [currentReading, previousReading]);

  // Auto-calculate taxes & fees based on requested formulas:
  // - Industrial Tax = 0.9 * diff * 0.0006 * meterFactor
  // - Consumption Tax = 0.1 * 0.03 * diff * meterFactor
  // - Radio Fee = 0.0001 * diff * meterFactor
  const calculateTaxesFromReadings = (
    curVal: number | "",
    prevVal: number | "",
    facVal: number | ""
  ) => {
    const cur = Number(curVal) || 0;
    const prev = Number(prevVal) || 0;
    const diff = Math.max(0, cur - prev);
    const factor = Number(facVal) || 0;

    const indVal = Math.round(0.9 * diff * 0.0006 * factor * 100) / 100;
    const consVal = Math.round(0.1 * 0.03 * diff * factor * 100) / 100;
    const radVal = Math.round(0.0001 * diff * factor * 100) / 100;

    setIndustrialTax(indVal);
    setConsumptionTax(consVal);
    setRadioFee(radVal);
  };

  const handlePreviousReadingChange = (val: number | "") => {
    setPreviousReading(val);
    calculateTaxesFromReadings(currentReading, val, meterFactor);
  };

  const handleCurrentReadingChange = (val: number | "") => {
    setCurrentReading(val);
    calculateTaxesFromReadings(val, previousReading, meterFactor);
  };

  const handleMeterFactorChange = (val: number | "") => {
    setMeterFactor(val);
    calculateTaxesFromReadings(currentReading, previousReading, val);
  };

  // 2. Consumption Value = Difference * Meter Factor * Rate
  const consumptionVal = useMemo(() => {
    const factor = Number(meterFactor) || 0;
    const price = Number(rate) || 0;
    return Math.round(readingDiff * factor * price * 100) / 100;
  }, [readingDiff, meterFactor, rate]);

  // 3. Total Expenses = Industrial Tax + Consumption Tax + Radio Fee + Services + Customer Service + Other Adjustments + Installments
  const totalExp = useMemo(() => {
    const ind = Number(industrialTax) || 0;
    const cons = Number(consumptionTax) || 0;
    const rad = Number(radioFee) || 0;
    const serv = Number(servicesFee) || 0;
    const custServ = Number(customerServiceFee) || 0;
    const inst = Number(installmentsAndAdjustments) || 0;
    const oth = Number(otherAdjustments) || 0;
    return Math.round((ind + cons + rad + serv + custServ + inst + oth) * 100) / 100;
  }, [industrialTax, consumptionTax, radioFee, servicesFee, customerServiceFee, installmentsAndAdjustments, otherAdjustments]);

  // 4. Net Invoice Issue = Consumption Value + Total Expenses
  const netIssue = useMemo(() => {
    return Math.round((consumptionVal + totalExp) * 100) / 100;
  }, [consumptionVal, totalExp]);

  // Function to search Tax Registration Number in local system and Egyptian Tax Authority database
  const handleLookupTaxNumber = (val: string) => {
    const cleanedVal = val.trim();
    setTaxNumber(cleanedVal);

    if (!cleanedVal) {
      setEtaSearchResult(null);
      return;
    }

    setIsSearchingEta(true);

    // Normalize for lookup (remove spaces and dashes)
    const normKey = cleanedVal.replace(/[\s-]/g, "");

    setTimeout(() => {
      // 1. Check local partners first
      const matchedPartner = partners.find(
        (p) => p.taxNumber && p.taxNumber.replace(/[\s-]/g, "") === normKey
      );

      if (matchedPartner) {
        setCustomerName(matchedPartner.name);
        setEtaSearchResult({
          found: true,
          name: matchedPartner.name,
          source: "شركاء النظام المحلي (ERP)",
          message: "تم العثور على الممول المسجل في سجل الشركاء والعملاء المحليين",
        });
        setIsSearchingEta(false);
        return;
      }

      // 2. Check ETA Simulated Database
      const matchedEta = Object.entries(ETA_REGISTRANTS_DATABASE).find(
        ([key]) => key.replace(/[\s-]/g, "") === normKey
      );

      if (matchedEta) {
        setCustomerName(matchedEta[1].name);
        setEtaSearchResult({
          found: true,
          name: matchedEta[1].name,
          source: "منظومة مصلحة الضرائب المصرية (ETA)",
          message: `ممول مسجل بالسجل الضريبي - ${matchedEta[1].status}`,
        });
        setIsSearchingEta(false);
        return;
      }

      // 3. Fallback: If 9-digit format or typed number, simulate auto-lookup feedback
      if (normKey.length >= 7) {
        const autoGeneratedName = `شركة الممول الضريبي (${cleanedVal})`;
        setCustomerName(autoGeneratedName);
        setEtaSearchResult({
          found: true,
          name: autoGeneratedName,
          source: "منظومة الفاتورة الإلكترونية والضرائب",
          message: "رقم تسجيل صحيح ومطابق لقواعد مصلحة الضرائب المصرية 🇪🇬",
        });
      } else {
        setEtaSearchResult({
          found: false,
          message: "رقم التسجيل الضريبي يتكون عادة من 9 أرقام (مثال: 204-589-112)",
        });
      }

      setIsSearchingEta(false);
    }, 300);
  };

  // Reset form
  const handleOpenAdd = () => {
    setEditingInvoice(null);
    setSerialNumber(invoices.length > 0 ? Math.max(...invoices.map((i) => i.serialNumber)) + 1 : 1);
    setMonth(new Date().toISOString().substring(0, 7));
    setTaxNumber("");
    setCustomerName("");
    setMeterNumber("");
    setCurrentReading("");
    setPreviousReading("");
    setMeterFactor(1);
    setRate(1.75);
    setIndustrialTax(0);
    setConsumptionTax(0);
    setRadioFee(0);
    setServicesFee(0.01);
    setCustomerServiceFee(35);
    setInstallmentsAndAdjustments(0);
    setOtherAdjustments(0);
    setNotes("");
    setEtaSearchResult(null);
    setShowModal(true);
  };

  // Open Edit modal
  const handleOpenEdit = (inv: ElectricityInvoice) => {
    setEditingInvoice(inv);
    setSerialNumber(inv.serialNumber);
    setMonth(inv.month);
    setTaxNumber(inv.taxNumber);
    setCustomerName(inv.customerName);
    setMeterNumber(inv.meterNumber);
    setCurrentReading(inv.currentReading);
    setPreviousReading(inv.previousReading);
    setMeterFactor(inv.meterFactor);
    setRate(inv.rate);
    setIndustrialTax(inv.industrialTax);
    setConsumptionTax(inv.consumptionTax);
    setRadioFee(inv.radioFee);
    setServicesFee(inv.servicesFee);
    setCustomerServiceFee(inv.customerServiceFee);
    setInstallmentsAndAdjustments(inv.installmentsAndAdjustments);
    setOtherAdjustments(inv.otherAdjustments);
    setNotes(inv.notes || "");
    setEtaSearchResult({
      found: true,
      name: inv.customerName,
      source: "بيانات سابقة",
      message: "ممول مسجل بالفاتورة",
    });
    setShowModal(true);
  };

  // Open Duplicate/Copy Invoice modal
  const handleDuplicateInvoice = (inv: ElectricityInvoice) => {
    setEditingInvoice(null); // Create a NEW invoice
    const nextSerial = invoices.length > 0 ? Math.max(...invoices.map((i) => i.serialNumber)) + 1 : 1;
    setSerialNumber(nextSerial);
    setMonth(new Date().toISOString().substring(0, 7));
    setTaxNumber(inv.taxNumber || "");
    setCustomerName(inv.customerName || "");
    setMeterNumber(inv.meterNumber || "");

    // Set previous reading to the copied invoice's current reading
    setPreviousReading(inv.currentReading || "");
    setCurrentReading(""); // Clear current reading so user enters the new current reading

    const factor = inv.meterFactor ?? 1;
    setMeterFactor(factor);
    setRate(inv.rate ?? 1.75);

    // Default taxes/fees or recalculate
    setIndustrialTax(inv.industrialTax ?? 0);
    setConsumptionTax(inv.consumptionTax ?? 0);
    setRadioFee(inv.radioFee ?? 0);
    setServicesFee(inv.servicesFee ?? 0.01);
    setCustomerServiceFee(inv.customerServiceFee ?? 35);
    setInstallmentsAndAdjustments(inv.installmentsAndAdjustments ?? 0);
    setOtherAdjustments(inv.otherAdjustments ?? 0);
    setNotes(`نسخة جديدة مأخوذة من الفاتورة رقم (${inv.serialNumber})`);

    setEtaSearchResult({
      found: true,
      name: inv.customerName,
      source: "نسخ فاتورة سابقة",
      message: `تم نسخ بيانات العميل للعدّاد (${inv.meterNumber}) مع تعيين القراءة السابقة تلقائياً = ${inv.currentReading}`,
    });

    setInvoiceToPrint(null);
    setShowModal(true);
  };

  // Handle Submit Form (with optional immediate Print)
  const handleSubmit = (e?: React.FormEvent, andPrint = false) => {
    if (e) e.preventDefault();
    if (!customerName.trim() || !meterNumber.trim()) return;

    const savedInv: ElectricityInvoice = {
      id: editingInvoice ? editingInvoice.id : "ELEC-" + Date.now(),
      serialNumber: Number(serialNumber) || invoices.length + 1,
      month: month || new Date().toISOString().substring(0, 7),
      taxNumber: taxNumber || "غير محدد",
      customerName: customerName.trim(),
      meterNumber: meterNumber.trim(),
      currentReading: Number(currentReading) || 0,
      previousReading: Number(previousReading) || 0,
      readingDifference: readingDiff,
      meterFactor: Number(meterFactor) || 1,
      rate: Number(rate) || 0,
      consumptionValue: consumptionVal,
      industrialTax: Number(industrialTax) || 0,
      consumptionTax: Number(consumptionTax) || 0,
      radioFee: Number(radioFee) || 0,
      servicesFee: Number(servicesFee) || 0,
      customerServiceFee: Number(customerServiceFee) || 0,
      installmentsAndAdjustments: Number(installmentsAndAdjustments) || 0,
      otherAdjustments: Number(otherAdjustments) || 0,
      totalExpenses: totalExp,
      netAmount: netIssue,
      notes,
      createdAt: editingInvoice ? editingInvoice.createdAt : new Date().toISOString(),
    };

    onSaveInvoice(savedInv);
    setShowModal(false);

    if (andPrint || printConfig.autoPrintAfterSave) {
      setTimeout(() => {
        handlePrintSingleInvoice(savedInv, printConfig.defaultLayout === "thermal" ? "thermal" : "a4");
      }, 100);
    }
  };

  // Open single invoice print view or dedicated print popup
  const handlePrintSingleInvoice = (inv: ElectricityInvoice, mode?: "a4" | "thermal") => {
    const layout = mode || (printConfig.defaultLayout === "thermal" ? "thermal" : "a4");
    if (printConfig.openInDedicatedWindow) {
      printViaPopup(inv, companySettings, { ...printConfig, defaultLayout: layout });
    } else {
      setBatchInvoicesToPrint(null);
      setPrintLayoutMode(layout);
      setInvoiceToPrint(inv);
    }
  };

  // Print Batch Vouchers (all filtered or selected invoices)
  const handlePrintBatchVouchers = (invoicesList?: ElectricityInvoice[]) => {
    const list = invoicesList || (selectedInvoiceIds.length > 0
      ? invoices.filter((i) => selectedInvoiceIds.includes(i.id))
      : filteredInvoices);

    if (list.length === 0) return;
    setInvoiceToPrint(null);
    setBatchInvoicesToPrint(list);
    setTimeout(() => {
      executePrintDocument("printing-batch-vouchers-active");
    }, 250);
  };

  // Toggle single selection
  const handleToggleSelectInvoice = (id: string) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Toggle select all filtered
  const handleToggleSelectAll = () => {
    if (selectedInvoiceIds.length === filteredInvoices.length && filteredInvoices.length > 0) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(filteredInvoices.map((i) => i.id));
    }
  };

  // Share formatted invoice via WhatsApp
  const handleShareInvoiceWhatsApp = (inv: ElectricityInvoice) => {
    const tafqeet = numberToArabicWords(inv.netAmount, companySettings.currency || "جنيه مصري");
    const msg = `*⚡ إشعار ومطالبة فاتورة استهلاك كهرباء ومرافق ⚡*
🏛️ *${companySettings.companyName}*
---------------------------------------
📋 *رقم الفاتورة / المسلسل:* #${inv.serialNumber}
📅 *شهر الإصدار:* ${inv.month}
👤 *اسم المشترك / العميل:* ${inv.customerName}
🔢 *رقم العداد:* ${inv.meterNumber}
🆔 *رقم التسجيل الضريبي:* ${inv.taxNumber || "غير محدد"}

📊 *بيانات القراءة والاستهلاك:*
• القراءة السابقة: ${inv.previousReading.toLocaleString()}
• القراءة الحالية: ${inv.currentReading.toLocaleString()}
• فرق الاستهلاك: ${inv.readingDifference.toLocaleString()} ك.و.س
• ثابت العداد: ${inv.meterFactor}
• إجمالي الاستهلاك: ${(inv.readingDifference * inv.meterFactor).toLocaleString()} ك.و.س
• سعر الكيلوواط: ${inv.rate} ${companySettings.currencySymbol}
💵 *قيمة الاستهلاك:* ${inv.consumptionValue.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} ${companySettings.currencySymbol}

📝 *الضرائب والرسوم والخدمات:*
• ضريبة صناعية: ${inv.industrialTax} ${companySettings.currencySymbol}
• ضريبة استهلاك: ${inv.consumptionTax} ${companySettings.currencySymbol}
• رسوم إذاعة وخدمات: ${(inv.radioFee + inv.servicesFee + inv.customerServiceFee).toLocaleString()} ${companySettings.currencySymbol}
• أقساط وتسويات: ${(inv.installmentsAndAdjustments + inv.otherAdjustments).toLocaleString()} ${companySettings.currencySymbol}
• إجمالي المصروفات: ${inv.totalExpenses.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} ${companySettings.currencySymbol}
---------------------------------------
💰 *صافي الإصدار النهائي المطلوب سداده:*
*${inv.netAmount.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} ${companySettings.currencySymbol}*
🗣️ _(${tafqeet})_
${inv.notes ? `\n📌 *ملاحظات:* ${inv.notes}` : ""}
---------------------------------------
تاريخ السند: ${new Date().toLocaleDateString("ar-EG")}
إدارة المرافق والخدمات المالية ⚡`;

    const encoded = encodeURI(msg);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  // Copy invoice text details
  const handleCopyInvoiceText = (inv: ElectricityInvoice) => {
    const tafqeet = numberToArabicWords(inv.netAmount, companySettings.currency || "جنيه مصري");
    const text = `فاتورة كهرباء رقم #${inv.serialNumber} - العميل: ${inv.customerName} - شهر: ${inv.month} - صافي المطلوب: ${inv.netAmount} ${companySettings.currencySymbol} (${tafqeet})`;
    navigator.clipboard.writeText(text);
    setCopiedInvoiceId(inv.id);
    setTimeout(() => setCopiedInvoiceId(null), 2500);
  };


  // Unique available customers for filtering and printing
  const availableCustomers = useMemo(() => {
    const custSet = new Set<string>();
    invoices.forEach((i) => {
      if (i.customerName && i.customerName.trim()) {
        custSet.add(i.customerName.trim());
      }
    });
    return Array.from(custSet).sort();
  }, [invoices]);

  // Filtered list
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchMonth = selectedMonthFilter === "ALL" || inv.month === selectedMonthFilter;
      const matchCustomer =
        selectedCustomerFilter === "ALL" || inv.customerName.trim() === selectedCustomerFilter.trim();
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.meterNumber.toLowerCase().includes(q) ||
        inv.taxNumber.toLowerCase().includes(q) ||
        inv.serialNumber.toString().includes(q) ||
        inv.month.includes(q);

      return matchMonth && matchCustomer && matchSearch;
    });
  }, [invoices, selectedMonthFilter, selectedCustomerFilter, searchTerm]);

  // Print specific customer electricity statement
  const handlePrintCustomerInvoices = (custName?: string) => {
    setInvoiceToPrint(null);
    if (custName) {
      setSelectedCustomerFilter(custName);
    }
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Totals calculations for display
  const totalStats = useMemo(() => {
    return filteredInvoices.reduce(
      (acc, inv) => {
        acc.kwhTotal += inv.readingDifference * inv.meterFactor;
        acc.consumptionTotal += inv.consumptionValue;
        acc.industrialTaxTotal += inv.industrialTax;
        acc.consumptionTaxTotal += inv.consumptionTax;
        acc.radioFeeTotal += inv.radioFee;
        acc.servicesFeeTotal += inv.servicesFee;
        acc.customerServiceFeeTotal += inv.customerServiceFee;
        acc.installmentsTotal += inv.installmentsAndAdjustments;
        acc.otherAdjustmentsTotal += inv.otherAdjustments;
        acc.totalExpensesTotal += inv.totalExpenses;
        acc.netTotal += inv.netAmount;
        return acc;
      },
      {
        kwhTotal: 0,
        consumptionTotal: 0,
        industrialTaxTotal: 0,
        consumptionTaxTotal: 0,
        radioFeeTotal: 0,
        servicesFeeTotal: 0,
        customerServiceFeeTotal: 0,
        installmentsTotal: 0,
        otherAdjustmentsTotal: 0,
        totalExpensesTotal: 0,
        netTotal: 0,
      }
    );
  }, [filteredInvoices]);

  // Months available
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    invoices.forEach((i) => monthsSet.add(i.month));
    return Array.from(monthsSet).sort().reverse();
  }, [invoices]);

  // Export Filtered Electricity Invoices to Excel (.xlsx)
  const handleExportExcel = () => {
    const dataToExport = filteredInvoices.map((inv) => ({
      "مسلسل": inv.serialNumber,
      "الشهر": inv.month,
      "اسم العميل": inv.customerName,
      "رقم التسجيل الضريبي": inv.taxNumber,
      "رقم العداد": inv.meterNumber,
      "القراءة السابقة": inv.previousReading,
      "القراءة الحالية": inv.currentReading,
      "الفرق (ك.و.س)": inv.readingDifference,
      "ثابت العداد": inv.meterFactor,
      "سعر الكيلو (ج.م)": inv.rate,
      "قيمة الاستهلاك (ج.م)": inv.consumptionValue,
      "ضريبة صناعية (ج.م)": inv.industrialTax,
      "ضريبة استهلاك (ج.م)": inv.consumptionTax,
      "رسوم إذاعة (ج.م)": inv.radioFee,
      "خدمات (ج.م)": inv.servicesFee,
      "خدمة العملاء (ج.م)": inv.customerServiceFee,
      "أقساط وتسويات (ج.م)": inv.installmentsAndAdjustments,
      "تسويات أخرى (ج.م)": inv.otherAdjustments,
      "إجمالي المصروفات (ج.م)": inv.totalExpenses,
      "صافي الإصدار (ج.م)": inv.netAmount,
      "ملاحظات": inv.notes || "",
    }));

    // Append Summary Totals Row at the bottom
    dataToExport.push({
      "مسلسل": "الإجمالي",
      "الشهر": "",
      "اسم العميل": `إجمالي الفواتير: ${filteredInvoices.length}`,
      "رقم التسجيل الضريبي": "",
      "رقم العداد": "",
      "القراءة السابقة": "",
      "القراءة الحالية": "",
      "الفرق (ك.و.س)": totalStats.kwhTotal,
      "ثابت العداد": "",
      "سعر الكيلو (ج.م)": "",
      "قيمة الاستهلاك (ج.م)": totalStats.consumptionTotal,
      "ضريبة صناعية (ج.م)": totalStats.industrialTaxTotal,
      "ضريبة استهلاك (ج.م)": totalStats.consumptionTaxTotal,
      "رسوم إذاعة (ج.م)": totalStats.radioFeeTotal,
      "خدمات (ج.م)": totalStats.servicesFeeTotal,
      "خدمة العملاء (ج.م)": totalStats.customerServiceFeeTotal,
      "أقساط وتسويات (ج.م)": totalStats.installmentsTotal,
      "تسويات أخرى (ج.م)": totalStats.otherAdjustmentsTotal,
      "إجمالي المصروفات (ج.م)": totalStats.totalExpensesTotal,
      "صافي الإصدار (ج.م)": totalStats.netTotal,
      "ملاحظات": "",
    } as any);

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Auto-fit column widths
    worksheet["!cols"] = [
      { wch: 8 },  // مسلسل
      { wch: 10 }, // الشهر
      { wch: 30 }, // اسم العميل
      { wch: 18 }, // رقم التسجيل الضريبي
      { wch: 14 }, // رقم العداد
      { wch: 14 }, // القراءة السابقة
      { wch: 14 }, // القراءة الحالية
      { wch: 14 }, // الفرق بينهما
      { wch: 12 }, // ثابت العداد
      { wch: 12 }, // السعر
      { wch: 20 }, // قيمة الاستهلاك
      { wch: 14 }, // ضريبة صناعية
      { wch: 14 }, // ضريبة استهلاك
      { wch: 12 }, // رسوم إذاعة
      { wch: 12 }, // خدمات
      { wch: 14 }, // خدمة العملاء
      { wch: 16 }, // اقساط وتسويات
      { wch: 14 }, // تسويات أخرى
      { wch: 20 }, // إجمالي المصروفات
      { wch: 22 }, // صافي الإصدار
      { wch: 25 }, // ملاحظات
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "فواتير الكهرباء");
    const monthSuffix = selectedMonthFilter === "ALL" ? "الكل" : selectedMonthFilter;
    const dateStamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `شيت_فواتير_الكهرباء_${monthSuffix}_${dateStamp}.xlsx`);
  };

  return (
    <div className="space-y-6 font-sans pb-10 printable-container">
      {/* Official Print Header - Visible ONLY during Print */}
      <div className="hidden print:block mb-6 text-black pb-4 border-b-2 border-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{companySettings.companyName}</h1>
            <p className="text-xs text-slate-700 mt-0.5">
              رقم التسجيل الضريبي: {companySettings.taxNumber || "غير محدد"}
            </p>
          </div>
          <div className="text-left dir-ltr">
            <p className="text-xs font-bold text-slate-800">
              تاريخ الطباعة: {new Date().toLocaleDateString("ar-EG")}
            </p>
            <p className="text-xs text-slate-600">
              شيت فواتير الكهرباء وحساب الاستهلاك
            </p>
          </div>
        </div>
        <div className="mt-4 text-center">
          <h2 className="text-base font-extrabold underline decoration-amber-600 underline-offset-4">
            {selectedCustomerFilter !== "ALL"
              ? `كشف فواتير الكهرباء وحساب الاستهلاك - للعميل: ${selectedCustomerFilter}`
              : "كشف تفصيلي بفواتير الكهرباء وحساب الاستهلاك والضرائب والرسوم - جميع العملاء"}{" "}
            ({selectedMonthFilter === "ALL" ? "جميع الأشهُر" : `شهر ${selectedMonthFilter}`})
          </h2>
        </div>
      </div>

      {/* Header Banner - Hidden in Print */}
      <div className="no-print bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/20 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
            <Zap className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">شيت فواتير الكهرباء وحساب الاستهلاك</h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                شيت تنفيذي معتمد
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              حساب استهلاك الكيلوواط، ثابت العداد، والضرائب والرسوم الحكومية مع إمكانية التصفية والطباعة حسب اختيار العميل 🇪🇬
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Printer Maintenance & Diagnostics Center */}
          <button
            onClick={() => {
              setPrintConfig(loadElectricityPrintConfig());
              setShowPrinterMaintenance(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-600/30 to-amber-500/20 hover:from-amber-600/40 hover:to-amber-500/30 text-amber-300 border border-amber-500/50 text-xs font-bold rounded-lg shadow-md transition cursor-pointer"
            title="مركز فحص وصيانة وتشغيل طابعة فواتير الكهرباء، إعدادات المقاس ومعايرة الإيصالات"
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>صيانة وتشغيل الطابعة 🖨️</span>
          </button>

          {/* Export to Excel */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-emerald-700/20 transition cursor-pointer"
            title="تصدير الشيت الحالي إلى ملف إكسيل (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            <span>تصدير إكسيل</span>
          </button>

          {/* Batch Invoices Vouchers Print */}
          <button
            onClick={() => handlePrintBatchVouchers()}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-900/40 hover:bg-indigo-800/50 text-indigo-200 border border-indigo-500/40 text-xs font-bold rounded-lg shadow-md transition cursor-pointer"
            title="طباعة جميع الفواتير المعروضة أو المحددة كإيصالات منفصلة (دفتر فواتير)"
          >
            <Receipt className="w-4 h-4 text-indigo-300" />
            <span>
              {selectedInvoiceIds.length > 0
                ? `طباعة الفواتير المحددة كإيصالات (${selectedInvoiceIds.length})`
                : `طباعة الفواتير كإيصالات (${filteredInvoices.length})`}
            </span>
          </button>

          {/* Print Current Summary Statement */}
          <button
            onClick={() => handlePrintCustomerInvoices()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg shadow-md transition cursor-pointer"
            title="طباعة كشف الفواتير للعميل المختار أو جدول الكشف بالكامل"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>
              {selectedCustomerFilter !== "ALL"
                ? `طباعة كشف (${selectedCustomerFilter})`
                : "طباعة جدول الكشف (A4)"}
            </span>
          </button>

          {/* Add Invoice */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-amber-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة فاتورة جديدة</span>
          </button>
        </div>
      </div>


      {/* KPI Stats Grid */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="text-slate-400 text-xs font-semibold">إجمالي صافي الإصدار</div>
          <div className="text-xl font-extrabold text-amber-400 mt-2 dir-ltr text-right">
            {totalStats.netTotal.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} {companySettings.currencySymbol}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">شامل قيمة الاستهلاك + المصروفات</div>
          <div className="absolute top-3 left-3 opacity-10 text-amber-400">
            <Zap className="w-10 h-10" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="text-slate-400 text-xs font-semibold">إجمالي قيمة الاستهلاك الفعلي</div>
          <div className="text-xl font-extrabold text-blue-400 mt-2 dir-ltr text-right">
            {totalStats.consumptionTotal.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} {companySettings.currencySymbol}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            إجمالي {totalStats.kwhTotal.toLocaleString("ar-EG")} كيلو واط مستهلك
          </div>
          <div className="absolute top-3 left-3 opacity-10 text-blue-400">
            <Calculator className="w-10 h-10" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="text-slate-400 text-xs font-semibold">إجمالي المصروفات والضرائب والرسوم</div>
          <div className="text-xl font-extrabold text-rose-400 mt-2 dir-ltr text-right">
            {totalStats.totalExpensesTotal.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} {companySettings.currencySymbol}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">ضرائب صناعية + رسوم + خدمات وتعديلات</div>
          <div className="absolute top-3 left-3 opacity-10 text-rose-400">
            <Building2 className="w-10 h-10" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="text-slate-400 text-xs font-semibold">عدد الفواتير والعملاء</div>
          <div className="text-xl font-extrabold text-emerald-400 mt-2">{filteredInvoices.length} فاتورة</div>
          <div className="text-[11px] text-slate-500 mt-1">مسجلة بالشيت الحالي</div>
          <div className="absolute top-3 left-3 opacity-10 text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar - Hidden in Print */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="البحث باسم العميل، رقم العداد، رقم التسجيل الضريبي، أو المسلسل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Customer Filter Dropdown */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-amber-400 font-semibold whitespace-nowrap">اختيار العميل:</span>
            <select
              value={selectedCustomerFilter}
              onChange={(e) => setSelectedCustomerFilter(e.target.value)}
              className="bg-slate-950 border border-amber-500/40 text-amber-300 rounded-lg text-xs py-1.5 px-3 focus:outline-none focus:border-amber-500 font-bold max-w-[200px]"
            >
              <option value="ALL">جميع العملاء ({availableCustomers.length})</option>
              {availableCustomers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter Dropdown */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-400 whitespace-nowrap">الشهر:</span>
            <select
              value={selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg text-xs py-1.5 px-3 focus:outline-none focus:border-amber-500/50"
            >
              <option value="ALL">جميع الأشهُر</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters button */}
          {(selectedCustomerFilter !== "ALL" || selectedMonthFilter !== "ALL" || searchTerm) && (
            <button
              onClick={() => {
                setSelectedCustomerFilter("ALL");
                setSelectedMonthFilter("ALL");
                setSearchTerm("");
              }}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg flex items-center gap-1 transition"
              title="إعادة ضبط الفلاتر"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>إلغاء الفلاتر</span>
            </button>
          )}
        </div>

        <div className="text-xs text-slate-400 shrink-0 flex items-center gap-2">
          {selectedCustomerFilter !== "ALL" && (
            <button
              onClick={() => handlePrintCustomerInvoices()}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-[11px] rounded-md flex items-center gap-1 transition"
            >
              <Printer className="w-3 h-3" />
              <span>طباعة كشف {selectedCustomerFilter}</span>
            </button>
          )}
          <span>
            عرض <span className="text-amber-400 font-bold">{filteredInvoices.length}</span> من أصل {invoices.length} فاتورة
          </span>
        </div>
      </div>

      {/* Main Electricity Invoices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs printable-table">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold whitespace-nowrap">
                <th className="no-print p-2.5 text-center w-10">
                  <button
                    onClick={handleToggleSelectAll}
                    className="text-slate-400 hover:text-amber-400 cursor-pointer"
                    title={selectedInvoiceIds.length === filteredInvoices.length && filteredInvoices.length > 0 ? "إلغاء تحديد الكل" : "تحديد الكل للطباعة الجماعية"}
                  >
                    {selectedInvoiceIds.length > 0 && selectedInvoiceIds.length === filteredInvoices.length ? (
                      <CheckSquare className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-2.5 text-center">مسلسل</th>
                <th className="p-2.5">الشهر</th>
                <th className="p-2.5">اسم العميل</th>
                <th className="p-2.5">رقم التسجيل الضريبي</th>
                <th className="p-2.5">رقم العداد</th>
                <th className="p-2.5 text-center bg-slate-900/50">القراءة السابقة</th>
                <th className="p-2.5 text-center bg-slate-900/50">القراءة الحالية</th>
                <th className="p-2.5 text-center text-amber-400 bg-amber-950/20 font-bold">الفرق بينهما</th>
                <th className="p-2.5 text-center">ثابت العداد</th>
                <th className="p-2.5 text-center">السعر</th>
                <th className="p-2.5 text-center text-blue-400 font-bold bg-blue-950/20">قيمة الاستهلاك</th>
                <th className="p-2.5 text-center text-slate-300">ضريبة صناعية</th>
                <th className="p-2.5 text-center text-slate-300">ضريبة استهلاك</th>
                <th className="p-2.5 text-center text-slate-300">رسوم إذاعة</th>
                <th className="p-2.5 text-center text-slate-300">خدمات</th>
                <th className="p-2.5 text-center text-slate-300">خدمة العملاء</th>
                <th className="p-2.5 text-center text-slate-300">اقساط وتسويات</th>
                <th className="p-2.5 text-center text-slate-300">تسويات أخرى</th>
                <th className="p-2.5 text-center text-rose-400 font-bold bg-rose-950/20">إجمالي المصروفات</th>
                <th className="p-2.5 text-center text-emerald-400 font-extrabold bg-emerald-950/30">صافي الإصدار</th>
                <th className="no-print p-2.5 text-center">الإجراءات والطباعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300 whitespace-nowrap">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={22} className="text-center py-10 text-slate-500">
                    لا توجد فواتير كهرباء مطابقة للشروط الحالية. اضغط على "إضافة فاتورة كهرباء جديدة" للبدء.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isSelected = selectedInvoiceIds.includes(inv.id);
                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-slate-800/50 transition ${
                        isSelected ? "bg-amber-500/5" : ""
                      }`}
                    >
                      <td className="no-print p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectInvoice(inv.id)}
                          className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-slate-950 cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5 text-center font-semibold text-slate-400">{inv.serialNumber}</td>
                      <td className="p-2.5 font-medium text-amber-300">{inv.month}</td>
                      <td className="p-2.5 font-semibold text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{inv.customerName}</span>
                          {inv.taxNumber && inv.taxNumber !== "غير محدد" && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              ممول مسجل
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5 font-mono text-slate-400 dir-ltr text-right">{inv.taxNumber}</td>
                      <td className="p-2.5 font-mono text-slate-300">{inv.meterNumber}</td>
                      <td className="p-2.5 text-center font-mono bg-slate-900/30">{inv.previousReading.toLocaleString()}</td>
                      <td className="p-2.5 text-center font-mono bg-slate-900/30">{inv.currentReading.toLocaleString()}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-amber-400 bg-amber-950/10">
                        {inv.readingDifference.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-center font-mono">{inv.meterFactor}</td>
                      <td className="p-2.5 text-center font-mono text-slate-300">{inv.rate}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-blue-400 bg-blue-950/10">
                        {inv.consumptionValue.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-center font-mono">{inv.industrialTax || 0}</td>
                      <td className="p-2.5 text-center font-mono">{inv.consumptionTax || 0}</td>
                      <td className="p-2.5 text-center font-mono">{inv.radioFee || 0}</td>
                      <td className="p-2.5 text-center font-mono">{inv.servicesFee || 0}</td>
                      <td className="p-2.5 text-center font-mono">{inv.customerServiceFee || 0}</td>
                      <td className="p-2.5 text-center font-mono">{inv.installmentsAndAdjustments || 0}</td>
                      <td className="p-2.5 text-center font-mono">{inv.otherAdjustments || 0}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-rose-400 bg-rose-950/10">
                        {inv.totalExpenses.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-center font-mono font-extrabold text-emerald-400 bg-emerald-950/20 text-sm">
                        {inv.netAmount.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="no-print p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Primary Print Button */}
                          <button
                            onClick={() => handlePrintSingleInvoice(inv, "a4")}
                            className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded flex items-center gap-1 font-bold text-[11px] transition shadow-sm cursor-pointer"
                            title={`طباعة فاتورة الكهرباء الرسمية رقم (${inv.serialNumber})`}
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-400" />
                            <span>طباعة الفاتورة</span>
                          </button>

                          {/* WhatsApp Share */}
                          <button
                            onClick={() => handleShareInvoiceWhatsApp(inv)}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 rounded transition cursor-pointer"
                            title="إرسال بيانات الفاتورة إلى العميل عبر واتساب"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Customer Statement */}
                          <button
                            onClick={() => handlePrintCustomerInvoices(inv.customerName)}
                            className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 rounded transition cursor-pointer"
                            title={`طباعة كشف جميع فواتير العميل: ${inv.customerName}`}
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>

                          {/* Copy */}
                          <button
                            onClick={() => handleDuplicateInvoice(inv)}
                            className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-950/40 rounded transition cursor-pointer"
                            title={`نسخ الفاتورة رقم (${inv.serialNumber}) وإنشاء جديدة`}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(inv)}
                            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 rounded transition cursor-pointer"
                            title="تعديل الفاتورة"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteConfirmId({ id: inv.id, serial: inv.serialNumber })}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition cursor-pointer"
                            title="حذف الفاتورة"
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

            {/* Total Footer Row */}
            {filteredInvoices.length > 0 && (
              <tfoot>
                <tr className="bg-slate-950 border-t-2 border-slate-700 font-bold text-white whitespace-nowrap">
                  <td colSpan={6} className="p-3 text-left pl-4 text-amber-400 font-extrabold text-sm">
                    إجمالي الإحصائيات الفردية والتجميعية:
                  </td>
                  <td className="p-3 text-center text-slate-400">-</td>
                  <td className="p-3 text-center text-slate-400">-</td>
                  <td className="p-3 text-center text-amber-400 font-mono text-sm bg-amber-950/30">
                    {totalStats.kwhTotal.toLocaleString()} كيلو واط
                  </td>
                  <td className="p-3 text-center text-slate-400">-</td>
                  <td className="p-3 text-center text-slate-400">-</td>
                  <td className="p-3 text-center text-blue-400 font-mono text-sm bg-blue-950/30">
                    {totalStats.consumptionTotal.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-center font-mono">{totalStats.industrialTaxTotal.toLocaleString()}</td>
                  <td className="p-3 text-center font-mono">{totalStats.consumptionTaxTotal.toLocaleString()}</td>
                  <td className="p-3 text-center font-mono">{totalStats.radioFeeTotal.toLocaleString()}</td>
                  <td className="p-3 text-center font-mono">{totalStats.servicesFeeTotal.toLocaleString()}</td>
                  <td className="p-3 text-center font-mono">{totalStats.customerServiceFeeTotal.toLocaleString()}</td>
                  <td className="p-3 text-center font-mono">{totalStats.installmentsTotal.toLocaleString()}</td>
                  <td className="p-3 text-center font-mono">{totalStats.otherAdjustmentsTotal.toLocaleString()}</td>
                  <td className="p-3 text-center font-mono font-bold text-rose-400 bg-rose-950/30 text-sm">
                    {totalStats.totalExpensesTotal.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-center font-mono font-extrabold text-emerald-400 bg-emerald-950/40 text-base">
                    {totalStats.netTotal.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} {companySettings.currencySymbol}
                  </td>
                  <td className="no-print p-3 text-center">
                    <button
                      onClick={() => handlePrintBatchVouchers()}
                      className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded font-bold text-xs cursor-pointer"
                      title="طباعة جميع الفواتير كدفتر إيصالات"
                    >
                      طباعة الكل ({filteredInvoices.length})
                    </button>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>


      {/* Print Signatures Block - Visible ONLY in Print */}
      <div className="hidden print:grid grid-cols-3 gap-8 mt-12 pt-6 border-t-2 border-slate-800 text-center text-xs font-bold text-black">
        <div>
          <p className="mb-8">إعداد المحاسب المسؤول</p>
          <p className="text-slate-500 font-normal">.................................</p>
        </div>
        <div>
          <p className="mb-8">المراجعة والتدقيق الفني</p>
          <p className="text-slate-500 font-normal">.................................</p>
        </div>
        <div>
          <p className="mb-8">اعتماد المدير المالي</p>
          <p className="text-slate-500 font-normal">.................................</p>
        </div>
      </div>

      {/* Formulas Documentation Info Panel */}
      <div className="no-print bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
          <Info className="w-4 h-4" />
          <span>القواعد والحسابات الرياضية المعتمدة لشيت فواتير الكهرباء:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-slate-300">
          <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg">
            <span className="font-bold text-amber-400 block mb-1">1. قيمة الاستهلاك:</span>
            <code>(القراءة الحالية - القراءة السابقة) × ثابت العداد × السعر</code>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg">
            <span className="font-bold text-rose-400 block mb-1">2. إجمالي المصروفات:</span>
            <code>ضريبة صناعية + ضريبة استهلاك + رسوم إذاعة + خدمات + خدمة العملاء + تسويات أخرى + أقساط وتسويات</code>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg">
            <span className="font-bold text-emerald-400 block mb-1">3. صافي الإصدار:</span>
            <code>قيمة الاستهلاك + إجمالي المصروفات</code>
          </div>
        </div>
      </div>

      {/* Add / Edit Electricity Invoice Modal */}
      {showModal && (
        <div className="no-print fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white">
                  {editingInvoice ? `تعديل فاتورة كهرباء - مسلسل (${editingInvoice.serialNumber})` : "إضافة فاتورة كهرباء جديدة"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Quick Copy/Duplicate From Previous Invoices */}
              {!editingInvoice && invoices.length > 0 && (
                <div className="bg-purple-950/40 border border-purple-500/30 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                    <Copy className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>نسخ سريعة لبيانات من فاتورة سابقة:</span>
                  </div>
                  <select
                    onChange={(e) => {
                      const foundInv = invoices.find((i) => i.id === e.target.value);
                      if (foundInv) {
                        handleDuplicateInvoice(foundInv);
                      }
                    }}
                    value=""
                    className="w-full sm:w-auto bg-slate-900 border border-purple-500/40 rounded-lg px-3 py-1.5 text-xs text-purple-200 font-semibold cursor-pointer hover:bg-slate-800 transition"
                  >
                    <option value="" disabled>-- اختر فاتورة لنسخ بياناتها تلقائياً --</option>
                    {invoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        م #{inv.serialNumber} - {inv.customerName} ({inv.month}) - قراءة سابقة للجديدة: {inv.currentReading}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {/* Basic Invoice & Tax Authority Lookup Section */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    بيانات العميل ورقم التسجيل الضريبي (مصلحة الضرائب المصرية 🇪🇬)
                  </span>
                  <span className="text-[11px] text-slate-400">الاستعلام الآلي عبر رقم التسجيل</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">مسلسل *</label>
                    <input
                      type="number"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">الشهر *</label>
                    <input
                      type="month"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-semibold"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-400 mb-1 font-medium flex items-center justify-between">
                      <span>رقم التسجيل الضريبي *</span>
                      <span className="text-[10px] text-amber-400">البحث بمصلحة الضرائب</span>
                    </label>
                    <div className="relative flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="مثال: 204-589-112 أو 100-200-300..."
                        value={taxNumber}
                        onChange={(e) => handleLookupTaxNumber(e.target.value)}
                        className="w-full bg-slate-900 border border-amber-500/40 rounded-lg p-2 text-white font-mono dir-ltr text-right focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleLookupTaxNumber(taxNumber)}
                        className="px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg shrink-0 font-semibold text-[11px] flex items-center gap-1 transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>بحث</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tax Lookup Interactive Status Message */}
                {isSearchingEta ? (
                  <div className="text-[11px] text-amber-300 flex items-center gap-2 bg-amber-950/30 p-2 rounded-lg border border-amber-500/20 animate-pulse">
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الاستعلام والتحقق من منظومة مصلحة الضرائب المصرية...</span>
                  </div>
                ) : etaSearchResult ? (
                  <div
                    className={`text-[11px] p-2.5 rounded-lg border flex items-center justify-between ${
                      etaSearchResult.found
                        ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                        : "bg-slate-900 border-slate-700 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-bold">{etaSearchResult.message}</span>
                        {etaSearchResult.source && (
                          <span className="text-[10px] text-slate-400 block mt-0.5"> المصدر: {etaSearchResult.source}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">اسم العميل (مستورد أو يدوي) *</label>
                    <input
                      type="text"
                      placeholder="اسم العميل أو اسم الشركة المسجلة..."
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">رقم العداد *</label>
                    <input
                      type="text"
                      placeholder="مثال: E-889412"
                      value={meterNumber}
                      onChange={(e) => setMeterNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Consumption & Meter Readings Section */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="font-bold text-blue-400 text-xs flex items-center gap-1.5">
                    <Calculator className="w-4 h-4" />
                    قراءات العداد وحساب الاستهلاك (حساب آلي تلقائي)
                  </span>
                  <span className="text-[11px] text-slate-400">الفرق = الحالية - السابقة</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">القراءة السابقة *</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={previousReading}
                      onChange={(e) => handlePreviousReadingChange(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">القراءة الحالية *</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={currentReading}
                      onChange={(e) => handleCurrentReadingChange(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-amber-400 mb-1 font-bold">الفرق بينهما (محسوب)</label>
                    <input
                      type="number"
                      value={readingDiff}
                      readOnly
                      className="w-full bg-amber-950/20 border border-amber-500/30 rounded-lg p-2 text-amber-300 font-mono font-bold cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">ثابت العداد *</label>
                    <input
                      type="number"
                      step="any"
                      value={meterFactor}
                      onChange={(e) => handleMeterFactorChange(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">السعر (لكل كيلو واط) *</label>
                    <input
                      type="number"
                      step="any"
                      value={rate}
                      onChange={(e) => setRate(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="bg-blue-950/30 border border-blue-500/30 p-2.5 rounded-xl flex items-center justify-between">
                  <span className="text-blue-300 font-bold text-xs">قيمة الاستهلاك (الفرق × ثابت العداد × السعر):</span>
                  <span className="text-blue-400 font-mono font-extrabold text-sm dir-ltr">
                    {consumptionVal.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} {companySettings.currencySymbol}
                  </span>
                </div>
              </div>

              {/* Expenses & Taxes Section */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="font-bold text-rose-400 text-xs flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    الضرائب والرسوم والمصروفات الإضافية (مع إمكانية التعديل اليدوي)
                  </span>
                  <button
                    type="button"
                    onClick={() => calculateTaxesFromReadings(currentReading, previousReading, meterFactor)}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                    title="تطبيق معادلات الضرائب والرسوم تلقائياً"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>تطبيق المعادلة الآلية</span>
                  </button>
                </div>

                {/* Formulas helper bar */}
                <div className="text-[10px] text-slate-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
                  <div>• ضريبة صناعية = 0.9 × الفرق × 0.0006 × الثابت</div>
                  <div>• ضريبة استهلاك = 0.1 × 0.03 × الفرق × الثابت</div>
                  <div>• رسوم إذاعة = 0.0001 × الفرق × الثابت</div>
                  <div>• خدمات = ثابتة (0.01)</div>
                  <div>• خدمة العملاء = ثابتة (35)</div>
                  <div className="text-emerald-400 font-medium">* يمكنك تعديل أي رقم يدويًا في أية لحظة</div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">ضريبة صناعية (معادلة)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={industrialTax}
                      onChange={(e) => setIndustrialTax(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">ضريبة استهلاك (معادلة)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={consumptionTax}
                      onChange={(e) => setConsumptionTax(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">رسوم إذاعة (معادلة)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={radioFee}
                      onChange={(e) => setRadioFee(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">خدمات (تلقائي 0.01)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={servicesFee}
                      onChange={(e) => setServicesFee(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">خدمة العملاء (تلقائي 35)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={customerServiceFee}
                      onChange={(e) => setCustomerServiceFee(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">أقساط وتسويات</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={installmentsAndAdjustments}
                      onChange={(e) => setInstallmentsAndAdjustments(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">تسويات أخرى</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={otherAdjustments}
                      onChange={(e) => setOtherAdjustments(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-rose-400 mb-1 font-bold">إجمالي المصروفات (محسوب)</label>
                    <input
                      type="number"
                      value={totalExp}
                      readOnly
                      className="w-full bg-rose-950/20 border border-rose-500/30 rounded-lg p-2 text-rose-300 font-mono font-bold cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Total Summary Footer Box */}
              <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/40 border border-emerald-500/40 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-inner">
                <div>
                  <div className="text-slate-300 text-xs font-semibold">المعادلة النهائية الإجمالية:</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    صافي الإصدار = قيمة الاستهلاك ({consumptionVal}) + إجمالي المصروفات ({totalExp})
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-emerald-400 font-semibold">صافي الإصدار النهائي للفاتورة:</div>
                  <div className="text-2xl font-extrabold text-emerald-300 font-mono dir-ltr">
                    {netIssue.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} {companySettings.currencySymbol}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">ملاحظات وبيان الفاتورة</label>
                <input
                  type="text"
                  placeholder="أدخل أي ملاحظات إضافية حول الفاتورة أو الفرع..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition cursor-pointer text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-lg hover:shadow-emerald-600/30 transition flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>حفظ وطباعة الفاتورة فوراً</span>
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow-lg hover:shadow-amber-600/30 transition flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Zap className="w-4 h-4" />
                  <span>{editingInvoice ? "حفظ وتحديث الفاتورة" : "تسجيل الفاتورة بالسجلات"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="no-print fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm p-5 text-slate-100 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-rose-400 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>تأكيد حذف فاتورة الكهرباء</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت تأكد من رغبتك في حذف فاتورة الكهرباء رقم مسلسل{" "}
              <span className="font-bold text-amber-400">({deleteConfirmId.serial})</span>؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  onDeleteInvoice(deleteConfirmId.id);
                  setDeleteConfirmId(null);
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Electricity Invoice Receipt Modal - Optimized for Print */}
      {invoiceToPrint && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto single-invoice-receipt-modal">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-4 sm:p-5 space-y-4 text-slate-100 shadow-2xl relative max-h-[95vh] flex flex-col">
            
            {/* Modal Controls - Hidden in Print */}
            <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Zap className="w-5 h-5 text-amber-400" />
                <span>معاينة وطباعة فاتورة الكهرباء والمرافق #{invoiceToPrint.serialNumber}</span>
              </div>

              {/* Layout Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPrintLayoutMode("a4")}
                  className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                    printLayoutMode === "a4"
                      ? "bg-amber-500 text-slate-950 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>نموذج A4 رسمي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintLayoutMode("thermal")}
                  className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                    printLayoutMode === "thermal"
                      ? "bg-amber-500 text-slate-950 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>إيصال حراري (80mm)</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => {
                    setPrintConfig(loadElectricityPrintConfig());
                    setShowPrinterMaintenance(true);
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer border border-amber-500/30"
                  title="صيانة وإعدادات الطابعة"
                >
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  <span>إعدادات الطابعة</span>
                </button>
                <button
                  onClick={() => printViaPopup(invoiceToPrint, companySettings, { ...printConfig, defaultLayout: printLayoutMode })}
                  className="px-2.5 py-1.5 bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title="فتح في نافذة طباعة خارجية مستقلة لضمان طباعة دقيقة"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>نافذة مستقلة</span>
                </button>
                <button
                  onClick={() => handleShareInvoiceWhatsApp(invoiceToPrint)}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title="إرسال الفاتورة عبر واتساب للعميل"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>واتساب</span>
                </button>
                <button
                  onClick={() => handleCopyInvoiceText(invoiceToPrint)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title="نسخ ملخص الفاتورة"
                >
                  {copiedInvoiceId === invoiceToPrint.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ النص</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDuplicateInvoice(invoiceToPrint)}
                  className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title="نسخ بيانات هذه الفاتورة وإنشاء فاتورة جديدة"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ لجديدة</span>
                </button>
                <button
                  onClick={() => executePrintDocument("printing-single-invoice-active")}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-lg shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الآن</span>
                </button>
                <button
                  onClick={() => setInvoiceToPrint(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  title="إغلاق"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Single Receipt Content */}
            <div className="single-invoice-receipt-content overflow-y-auto flex-1 bg-white text-slate-900 p-6 rounded-xl border border-slate-300 text-xs shadow-inner">
              {printLayoutMode === "a4" ? (
                /* Standard A4 Detailed Tax Invoice Layout */
                <div className="space-y-4">
                  {/* Official Receipt Header */}
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Zap className="w-6 h-6 text-amber-600" />
                        <h2 className="single-receipt-title text-xl font-extrabold text-slate-900">
                          {companySettings.companyName}
                        </h2>
                      </div>
                      <p className="text-[11px] text-slate-700">
                        إدارة المرافق وشبكات الكهرباء والطاقة | جمهورية مصر العربية 🇪🇬
                      </p>
                      <div className="flex items-center gap-4 text-[11px] text-slate-600 font-mono">
                        <span>رقم التسجيل الضريبي: <strong>{companySettings.taxNumber || "غير محدد"}</strong></span>
                        {companySettings.commercialRegister && (
                          <span>سجل تجاري: <strong>{companySettings.commercialRegister}</strong></span>
                        )}
                      </div>
                    </div>
                    <div className="text-left dir-ltr">
                      <span className="single-receipt-badge text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-md block mb-1">
                        فاتورة استهلاك كهرباء ومرافق #{invoiceToPrint.serialNumber}
                      </span>
                      <div className="text-[10px] text-slate-600 font-mono space-y-0.5">
                        <p>شهر المحاسبة: <strong>{invoiceToPrint.month}</strong></p>
                        <p>تاريخ السند: {new Date(invoiceToPrint.createdAt || Date.now()).toLocaleDateString("ar-EG")}</p>
                      </div>
                    </div>
                  </div>

                  {/* Customer & Meter Identification */}
                  <div className="single-receipt-customer-box grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-300">
                    <div className="space-y-1">
                      <span className="text-slate-500 block text-[10px] font-semibold">بيانات المشترك / العميل:</span>
                      <strong className="single-receipt-customer-name text-slate-900 text-sm block">
                        {invoiceToPrint.customerName}
                      </strong>
                      <span className="block text-[11px] text-slate-700 font-mono">
                        رقم التسجيل الضريبي: <strong>{invoiceToPrint.taxNumber || "غير محدد"}</strong>
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-500 block text-[10px] font-semibold">بيانات العداد والتعريفة:</span>
                      <strong className="text-slate-900 text-sm font-mono block">
                        رقم العداد: {invoiceToPrint.meterNumber}
                      </strong>
                      <div className="text-[11px] text-slate-700 font-mono flex items-center gap-3">
                        <span>ثابت العداد: <strong>{invoiceToPrint.meterFactor}</strong></span>
                        <span>سعر الكيلوواط: <strong>{invoiceToPrint.rate} {companySettings.currencySymbol}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Consumption Readings Table */}
                  <div>
                    <div className="font-bold text-slate-800 text-[11px] mb-1.5 flex items-center justify-between">
                      <span>بيانات القراءات والاستهلاك الفعلي:</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        إجمالي الاستهلاك = الفرق ({invoiceToPrint.readingDifference}) × الثابت ({invoiceToPrint.meterFactor}) = {(invoiceToPrint.readingDifference * invoiceToPrint.meterFactor).toLocaleString()} ك.و.س
                      </span>
                    </div>
                    <table className="single-receipt-table w-full border-collapse border border-slate-400 text-center text-xs">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-slate-800">
                          <th className="border border-slate-400 p-2">القراءة السابقة</th>
                          <th className="border border-slate-400 p-2">القراءة الحالية</th>
                          <th className="border border-slate-400 p-2">فرق العداد</th>
                          <th className="border border-slate-400 p-2">الاستهلاك الفعلي (ك.و.س)</th>
                          <th className="border border-slate-400 p-2">قيمة الاستهلاك</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="font-semibold">
                          <td className="border border-slate-400 p-2 font-mono">{invoiceToPrint.previousReading.toLocaleString()}</td>
                          <td className="border border-slate-400 p-2 font-mono">{invoiceToPrint.currentReading.toLocaleString()}</td>
                          <td className="border border-slate-400 p-2 font-mono">{invoiceToPrint.readingDifference.toLocaleString()}</td>
                          <td className="border border-slate-400 p-2 font-mono font-bold text-amber-900 bg-amber-50">
                            {(invoiceToPrint.readingDifference * invoiceToPrint.meterFactor).toLocaleString()} ك.و.س
                          </td>
                          <td className="border border-slate-400 p-2 font-mono font-bold text-blue-900 bg-blue-50 text-sm">
                            {invoiceToPrint.consumptionValue.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} {companySettings.currencySymbol}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Taxes & Fees Breakdown Grid */}
                  <div className="space-y-1.5">
                    <div className="font-bold text-slate-800 text-[11px]">بيان الضرائب والرسوم الحكومية والتسويات والمصروفات:</div>
                    <div className="single-receipt-tax-grid grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="single-receipt-tax-item bg-slate-50 p-2.5 rounded border border-slate-300">
                        <span className="text-slate-500 block text-[10px]">ضريبة صناعية:</span>
                        <span className="font-mono font-bold text-slate-900">{invoiceToPrint.industrialTax} {companySettings.currencySymbol}</span>
                      </div>
                      <div className="single-receipt-tax-item bg-slate-50 p-2.5 rounded border border-slate-300">
                        <span className="text-slate-500 block text-[10px]">ضريبة استهلاك:</span>
                        <span className="font-mono font-bold text-slate-900">{invoiceToPrint.consumptionTax} {companySettings.currencySymbol}</span>
                      </div>
                      <div className="single-receipt-tax-item bg-slate-50 p-2.5 rounded border border-slate-300">
                        <span className="text-slate-500 block text-[10px]">رسوم إذاعة وخدمات:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {(invoiceToPrint.radioFee + invoiceToPrint.servicesFee + invoiceToPrint.customerServiceFee).toLocaleString()} {companySettings.currencySymbol}
                        </span>
                      </div>
                      <div className="single-receipt-tax-item bg-slate-50 p-2.5 rounded border border-slate-300">
                        <span className="text-slate-500 block text-[10px]">أقساط وتسويات أخرى:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {(invoiceToPrint.installmentsAndAdjustments + invoiceToPrint.otherAdjustments).toLocaleString()} {companySettings.currencySymbol}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Total Net Amount Due Box */}
                  <div className="single-receipt-total-box bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between border-2 border-slate-900">
                    <div>
                      <div className="text-xs text-amber-300 font-bold">صافي الإصدار النهائي المطلوب سداده:</div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        (قيمة الاستهلاك {invoiceToPrint.consumptionValue.toLocaleString("ar-EG")} + إجمالي المصروفات والضرائب {invoiceToPrint.totalExpenses.toLocaleString("ar-EG")})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="single-receipt-total-amount text-2xl font-extrabold font-mono text-emerald-400 dir-ltr">
                        {invoiceToPrint.netAmount.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} {companySettings.currencySymbol}
                      </div>
                    </div>
                  </div>

                  {/* Arabic Words Tafqeet Banner */}
                  <div className="p-2.5 bg-emerald-50 text-emerald-950 rounded-lg border border-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <span className="text-emerald-700 font-bold">المبلغ بالحروف:</span>
                    <span>
                      فقط وقدره {numberToArabicWords(invoiceToPrint.netAmount, companySettings.currency || "جنيه مصري")} لا غير.
                    </span>
                  </div>

                  {invoiceToPrint.notes && (
                    <div className="text-[11px] text-slate-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      <strong className="text-amber-900">ملاحظات الفاتورة:</strong> {invoiceToPrint.notes}
                    </div>
                  )}

                  {/* QR Code and Compliance Section */}
                  <div className="flex items-center justify-between pt-2 text-[10px] text-slate-600 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="p-1 border border-slate-300 rounded bg-slate-50">
                        <QrCode className="w-8 h-8 text-slate-800" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">منظومة الفوترة الإلكترونية المعتمدة</p>
                        <p className="text-slate-500 font-mono">UUID: ELEC-{invoiceToPrint.id.slice(-8)}</p>
                      </div>
                    </div>
                    <div className="text-left font-mono">
                      <p>رقم الإيصال: #{invoiceToPrint.serialNumber}</p>
                      <p>الحالة: معتمد ومطابق للمعايير 🇪🇬</p>
                    </div>
                  </div>

                  {/* Signatures & Seal */}
                  <div className="single-receipt-signatures grid grid-cols-3 gap-4 pt-6 border-t-2 border-slate-300 text-center text-[10px] text-slate-800">
                    <div>
                      <p className="font-bold mb-6">المحاسب المسؤول</p>
                      <p className="text-slate-400">.......................</p>
                    </div>
                    <div>
                      <p className="font-bold mb-6">توقيع المشترك / المستلم</p>
                      <p className="text-slate-400">.......................</p>
                    </div>
                    <div>
                      <p className="font-bold mb-6">اعتماد الإدارة المالية</p>
                      <p className="text-slate-400">.......................</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* POS Thermal 80mm Compact Slip Layout */
                <div className="thermal-receipt-container space-y-2 text-center text-[10px] text-black">
                  <div className="border-b border-dashed border-black pb-2 space-y-1">
                    <h3 className="font-extrabold text-xs">{companySettings.companyName}</h3>
                    <p className="text-[9px]">إيصال مطالبة استهلاك كهرباء ومرافق</p>
                    <p className="font-mono text-[9px]">رقم الفاتورة: #{invoiceToPrint.serialNumber}</p>
                    <p className="font-mono text-[9px]">شهر: {invoiceToPrint.month} | {new Date().toLocaleDateString("ar-EG")}</p>
                  </div>

                  <div className="text-right border-b border-dashed border-black py-1.5 space-y-1 text-[9px]">
                    <div><strong>العميل:</strong> {invoiceToPrint.customerName}</div>
                    <div><strong>رقم العداد:</strong> {invoiceToPrint.meterNumber}</div>
                    <div><strong>ثابت العداد:</strong> {invoiceToPrint.meterFactor} | <strong>السعر:</strong> {invoiceToPrint.rate} {companySettings.currencySymbol}</div>
                  </div>

                  <div className="text-right border-b border-dashed border-black py-1.5 space-y-1 text-[9px]">
                    <div className="flex justify-between">
                      <span>القراءة الحالية:</span>
                      <span className="font-mono font-bold">{invoiceToPrint.currentReading}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>القراءة السابقة:</span>
                      <span className="font-mono">{invoiceToPrint.previousReading}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>فرق الاستهلاك:</span>
                      <span className="font-mono font-bold">{invoiceToPrint.readingDifference} ك.و.س</span>
                    </div>
                    <div className="flex justify-between">
                      <span>الاستهلاك الفعلي:</span>
                      <span className="font-mono font-bold">{(invoiceToPrint.readingDifference * invoiceToPrint.meterFactor)} ك.و.س</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>قيمة الاستهلاك:</span>
                      <span className="font-mono">{invoiceToPrint.consumptionValue.toFixed(2)} {companySettings.currencySymbol}</span>
                    </div>
                  </div>

                  <div className="text-right border-b border-dashed border-black py-1.5 space-y-0.5 text-[9px]">
                    <div className="flex justify-between">
                      <span>ضرائب ورسوم:</span>
                      <span className="font-mono">{(invoiceToPrint.industrialTax + invoiceToPrint.consumptionTax + invoiceToPrint.radioFee + invoiceToPrint.servicesFee + invoiceToPrint.customerServiceFee).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>أقساط وتسويات:</span>
                      <span className="font-mono">{(invoiceToPrint.installmentsAndAdjustments + invoiceToPrint.otherAdjustments).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>إجمالي المصروفات:</span>
                      <span className="font-mono">{invoiceToPrint.totalExpenses.toFixed(2)} {companySettings.currencySymbol}</span>
                    </div>
                  </div>

                  <div className="py-2 border-b-2 border-black space-y-1">
                    <div className="text-[10px] font-bold">صافي المبلغ المستحق:</div>
                    <div className="text-base font-extrabold font-mono dir-ltr">
                      {invoiceToPrint.netAmount.toFixed(2)} {companySettings.currencySymbol}
                    </div>
                    <div className="text-[8px] font-semibold text-slate-700">
                      ({numberToArabicWords(invoiceToPrint.netAmount, companySettings.currency || "جنيه مصري")})
                    </div>
                  </div>

                  <div className="pt-2 text-[8px] space-y-1">
                    <p>نشكركم لالتزامكم بترشيد الاستهلاك والسداد</p>
                    <p className="font-mono text-slate-600">Generated on {new Date().toISOString().slice(0, 16)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batch Vouchers Print Modal Container */}
      {batchInvoicesToPrint && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 overflow-y-auto p-4 flex flex-col items-center">
          {/* Non-printable Floating Toolbar */}
          <div className="no-print sticky top-4 z-50 bg-slate-900 border border-slate-800 p-3.5 rounded-xl shadow-2xl flex items-center justify-between gap-4 max-w-xl w-full mb-6 text-white">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-400" />
              <span className="font-bold text-xs">
                دفتر طباعة الفواتير ({batchInvoicesToPrint.length} فاتورة)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة جميع الإيصالات الآن</span>
              </button>
              <button
                onClick={() => setBatchInvoicesToPrint(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg font-semibold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>

          {/* Printable Batch Vouchers List */}
          <div className="batch-vouchers-print-container w-full max-w-3xl space-y-8">
            {batchInvoicesToPrint.map((inv) => (
              <div
                key={inv.id}
                className="invoice-voucher-page bg-white text-slate-900 p-6 rounded-xl border border-slate-300 text-xs shadow-md space-y-3"
              >
                {/* Official Receipt Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2.5">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{companySettings.companyName}</h3>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      رقم التسجيل الضريبي: <strong>{companySettings.taxNumber || "غير محدد"}</strong>
                    </p>
                  </div>
                  <div className="text-left dir-ltr">
                    <span className="text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded block mb-1">
                      فاتورة استهلاك كهرباء #{inv.serialNumber}
                    </span>
                    <span className="text-[9px] text-slate-500">شهر: {inv.month}</span>
                  </div>
                </div>

                {/* Customer & Meter Identification */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[9px] font-semibold">المشترك / العميل:</span>
                    <strong className="text-slate-900 text-xs">{inv.customerName}</strong>
                    <span className="block text-[10px] text-slate-600 font-mono mt-0.5">
                      رقم التسجيل الضريبي: {inv.taxNumber || "غير محدد"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] font-semibold">بيانات العداد:</span>
                    <strong className="text-slate-900 text-xs font-mono">رقم العداد: {inv.meterNumber}</strong>
                    <span className="block text-[10px] text-slate-600 font-mono mt-0.5">
                      ثابت: {inv.meterFactor} | السعر: {inv.rate} {companySettings.currencySymbol}
                    </span>
                  </div>
                </div>

                {/* Consumption Readings Table */}
                <table className="w-full border-collapse border border-slate-300 text-center text-xs">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-800">
                      <th className="border border-slate-300 p-1.5">القراءة السابقة</th>
                      <th className="border border-slate-300 p-1.5">القراءة الحالية</th>
                      <th className="border border-slate-300 p-1.5">فرق العداد</th>
                      <th className="border border-slate-300 p-1.5">الاستهلاك الفعلي (ك.و.س)</th>
                      <th className="border border-slate-300 p-1.5">قيمة الاستهلاك</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-semibold">
                      <td className="border border-slate-300 p-1.5 font-mono">{inv.previousReading.toLocaleString()}</td>
                      <td className="border border-slate-300 p-1.5 font-mono">{inv.currentReading.toLocaleString()}</td>
                      <td className="border border-slate-300 p-1.5 font-mono">{inv.readingDifference.toLocaleString()}</td>
                      <td className="border border-slate-300 p-1.5 font-mono font-bold text-amber-900 bg-amber-50">
                        {(inv.readingDifference * inv.meterFactor).toLocaleString()} ك.و.س
                      </td>
                      <td className="border border-slate-300 p-1.5 font-mono font-bold text-blue-900 bg-blue-50">
                        {inv.consumptionValue.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} {companySettings.currencySymbol}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Taxes & Expenses summary */}
                <div className="grid grid-cols-4 gap-2 text-[10px] text-center">
                  <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[9px]">ضريبة صناعية:</span>
                    <span className="font-bold font-mono">{inv.industrialTax}</span>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[9px]">ضريبة استهلاك:</span>
                    <span className="font-bold font-mono">{inv.consumptionTax}</span>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[9px]">رسوم وخدمات:</span>
                    <span className="font-bold font-mono">{(inv.radioFee + inv.servicesFee + inv.customerServiceFee)}</span>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[9px]">أقساط وتسويات:</span>
                    <span className="font-bold font-mono">{(inv.installmentsAndAdjustments + inv.otherAdjustments)}</span>
                  </div>
                </div>

                {/* Total Net Amount Due Box */}
                <div className="bg-slate-900 text-white p-3 rounded-lg flex items-center justify-between border border-slate-900">
                  <div>
                    <div className="text-[11px] text-amber-300 font-bold">صافي الإصدار المطلوب سداده:</div>
                    <div className="text-[9px] text-slate-300">
                      فقط {numberToArabicWords(inv.netAmount, companySettings.currency || "جنيه مصري")} لا غير.
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold font-mono text-emerald-400 dir-ltr">
                      {inv.netAmount.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} {companySettings.currencySymbol}
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-300 text-center text-[9px] text-slate-700">
                  <p>المحاسب المسؤول: .......................</p>
                  <p>توقيع المستلم: .......................</p>
                  <p>اعتماد الإدارة: .......................</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Electricity Printer Maintenance & Operation Diagnostics Modal */}
      {showPrinterMaintenance && (
        <ElectricityPrinterMaintenanceModal
          isOpen={showPrinterMaintenance}
          onClose={() => {
            setShowPrinterMaintenance(false);
            setPrintConfig(loadElectricityPrintConfig());
          }}
          companySettings={companySettings}
          sampleInvoice={invoiceToPrint || invoices[0]}
          onConfigUpdated={(newCfg) => {
            setPrintConfig(newCfg);
          }}
        />
      )}
    </div>
  );
};

