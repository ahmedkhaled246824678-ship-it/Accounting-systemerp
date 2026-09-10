import React, { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  BookOpen,
  Scale,
  Layers,
  Wallet,
  Building,
  Package,
  Receipt,
  FileCheck,
  Sparkles,
} from "lucide-react";
import {
  Account,
  JournalEntry,
  TreasuryVoucher,
  BankVoucher,
  Custody,
  Advance,
  FixedAsset,
  InventoryItem,
  CompanySettings,
} from "../types";
import { exportToExcel, exportMultipleSheetsToExcel } from "../utils/export";

interface DashboardExcelHubProps {
  accounts: Account[];
  journalEntries: JournalEntry[];
  treasuryVouchers: TreasuryVoucher[];
  bankVouchers: BankVoucher[];
  custodies?: Custody[];
  advances?: Advance[];
  fixedAssets?: FixedAsset[];
  inventoryItems?: InventoryItem[];
  companySettings: CompanySettings;
}

export const DashboardExcelHub: React.FC<DashboardExcelHubProps> = ({
  accounts,
  journalEntries,
  treasuryVouchers,
  bankVouchers,
  custodies = [],
  advances = [],
  fixedAssets = [],
  inventoryItems = [],
  companySettings,
}) => {
  const [downloadedSheet, setDownloadedSheet] = useState<string | null>(null);

  const notifyDownloaded = (id: string) => {
    setDownloadedSheet(id);
    setTimeout(() => setDownloadedSheet(null), 2500);
  };

  // 1. General Journal Sheet
  const exportGeneralJournalExcel = () => {
    const rows: any[] = [];
    journalEntries.forEach((je) => {
      je.lines.forEach((line, idx) => {
        const acc = accounts.find((a) => a.id === line.accountId);
        rows.push({
          "رقم القيد": je.entryNumber,
          "التاريخ": je.date,
          "المرجع": je.reference || "-",
          "بيان القيد العام": je.notes,
          "بند": idx + 1,
          "كود الحساب": acc ? acc.code : "-",
          "اسم الحساب": acc ? acc.nameAr : "-",
          "مدين": line.debit || 0,
          "دائن": line.credit || 0,
          "مركز التكلفة": line.costCenterId || "-",
          "شرح البند": line.description || je.notes,
        });
      });
    });
    exportToExcel(rows, `شيت_اليومية_العامة_${companySettings.companyName}`, "اليومية العامة");
    notifyDownloaded("journal");
  };

  // 2. Trial Balance Sheet
  const exportTrialBalanceExcel = () => {
    const data = accounts.map((acc) => {
      let debit = 0;
      let credit = 0;
      journalEntries.forEach((je) => {
        je.lines.forEach((l) => {
          if (l.accountId === acc.id) {
            debit += l.debit;
            credit += l.credit;
          }
        });
      });

      const net = debit - credit;
      const closingDebit = net > 0 ? net : 0;
      const closingCredit = net < 0 ? Math.abs(net) : 0;

      return {
        "كود الحساب": acc.code,
        "اسم الحساب": acc.nameAr,
        "نوع الحساب": acc.type,
        "الرصيد الافتتاحي": acc.openingBalance || 0,
        "إجمالي الحركات المدين": debit,
        "إجمالي الحركات الدائن": credit,
        "رصيد ختامي مدين": closingDebit,
        "رصيد ختامي دائن": closingCredit,
      };
    });

    exportToExcel(data, `شيت_ميزان_المراجعة_${companySettings.companyName}`, "ميزان المراجعة");
    notifyDownloaded("trial_balance");
  };

  // 3. Combined Cash & Bank Sheet
  const exportCombinedCashBankExcel = () => {
    const rows: any[] = [];
    treasuryVouchers.forEach((v) => {
      const opp = accounts.find((a) => a.id === v.oppositeAccountId);
      rows.push({
        "المصدر": "خزينة نقدية",
        "رقم السند": v.voucherNumber,
        "التاريخ": v.date,
        "نوع الحركة": v.voucherType === "RECEIPT" ? "سند قبض نقدية" : "سند صرف نقدية",
        "المبلغ": v.amount,
        "المستفيد / المسلم": v.beneficiary || "-",
        "الحساب المقابل": opp ? opp.nameAr : "-",
        "البيان": v.notes,
        "المرجع اليدوي": v.manualRef || "-",
      });
    });

    bankVouchers.forEach((v) => {
      const bank = accounts.find((a) => a.id === v.bankAccountId);
      const opp = accounts.find((a) => a.id === v.oppositeAccountId);
      rows.push({
        "المصدر": bank ? bank.nameAr : "البنك",
        "رقم السند": v.voucherNumber,
        "التاريخ": v.date,
        "نوع الحركة":
          v.type === "DEPOSIT"
            ? "إيداع بنكي"
            : v.type === "WITHDRAWAL"
            ? "سحب / شيك بنكي"
            : v.type === "TRANSFER"
            ? "تحويل بنكي"
            : "مصروف بنكي",
        "المبلغ": v.amount,
        "المستفيد / المسلم": v.beneficiary || "-",
        "الحساب المقابل": opp ? opp.nameAr : "-",
        "البيان": v.notes,
        "رقم الشيك / المرجع": v.checkNumber || v.manualRef || "-",
      });
    });

    exportToExcel(rows, `الشيت_المجمع_للنقدية_والبنوك_${companySettings.companyName}`, "النقدية والبنوك");
    notifyDownloaded("combined");
  };

  // 4. Treasury, Custodies & Advances Sheet
  const exportTreasuryCustodyAdvanceExcel = () => {
    const sheets: { sheetName: string; data: any[] }[] = [];

    // Vouchers
    const vRows = treasuryVouchers.map((v) => ({
      "رقم السند": v.voucherNumber,
      "النوع": v.voucherType === "RECEIPT" ? "قبض" : "صرف",
      "التاريخ": v.date,
      "المبلغ": v.amount,
      "المستفيد": v.beneficiary || "-",
      "البيان": v.notes,
    }));
    sheets.push({ sheetName: "سندات الخزينة", data: vRows });

    // Custodies
    if (custodies.length > 0) {
      const cRows = custodies.map((c) => ({
        "كود العهدة": c.code,
        "الموظف المسؤول": c.employeeName,
        "مبلغ العهدة الأصلي": c.totalAmount,
        "المبلغ المنصرف": c.spentAmount,
        "الرصيد المتبقي": c.remainingAmount,
        "تاريخ الاستلام": c.date,
        "الحالة": c.status === "ACTIVE" ? "قائمة" : "تمت التصفية",
      }));
      sheets.push({ sheetName: "عهد الموظفين", data: cRows });
    }

    // Advances
    if (advances.length > 0) {
      const aRows = advances.map((a) => ({
        "كود السلفة": a.code,
        "اسم الموظف": a.employeeName,
        "إجمالي السلفة": a.totalAmount,
        "القسط الشهري": a.monthlyDeduction,
        "المتبقي": a.remainingAmount,
        "عدد الأقساط": a.installmentsCount || "-",
        "الحالة": a.status === "ACTIVE" ? "سارية" : "مسددة بالكامل",
      }));
      sheets.push({ sheetName: "سلف العاملين", data: aRows });
    }

    exportMultipleSheetsToExcel(sheets, `شيت_الخزينة_والعهد_والسلف_${companySettings.companyName}`);
    notifyDownloaded("treasury_custody");
  };

  // 5. Operating Expenses Sheet
  const exportOperatingExpensesExcel = () => {
    const expenseAccounts = accounts.filter(
      (a) => !a.isHeader && (a.code.startsWith("5") || a.type === "EXPENSE" || a.type === "المصروفات")
    );

    const rows: any[] = [];
    expenseAccounts.forEach((acc) => {
      let totalExp = 0;
      const matchingEntries: string[] = [];
      journalEntries.forEach((je) => {
        je.lines.forEach((l) => {
          if (l.accountId === acc.id && l.debit > 0) {
            totalExp += l.debit;
            matchingEntries.push(`${je.entryNumber} (${l.debit})`);
          }
        });
      });

      if (totalExp > 0 || acc.balance > 0) {
        rows.push({
          "كود الحساب": acc.code,
          "اسم بند المصروف": acc.nameAr,
          "المجموعة": acc.category || "مصروفات عمومية وإدارية",
          "إجمالي المنصرف الدفتري": totalExp || acc.balance,
          "العملة": companySettings.currency,
          "أرقام القيود المرتبطة": matchingEntries.slice(0, 5).join("، ") || "رصيد افتتاحي",
        });
      }
    });

    exportToExcel(rows, `شيت_المصروفات_التشغيلية_${companySettings.companyName}`, "المصروفات");
    notifyDownloaded("expenses");
  };

  // 6. Fixed Assets & Depreciation Consolidated Sheet
  const exportFixedAssetsDepreciationExcel = () => {
    const rows = fixedAssets.map((asset) => {
      const salvage = (asset as any).salvageValue || 0;
      const depreciableBase = Math.max(0, asset.cost - salvage);
      const usefulYears = asset.usefulLifeYears || 10;
      const annualRate = asset.depreciationRate || (usefulYears > 0 ? Math.round(100 / usefulYears) : 10);
      const currentYearDep = (depreciableBase * annualRate) / 100;
      const accDep = asset.accumulatedDepreciation || 0;
      const netBook = Math.max(salvage, asset.cost - accDep);
      const depProgress = asset.cost > 0 ? Math.min(100, Math.round((accDep / asset.cost) * 100)) : 0;

      return {
        "كود الأصل": asset.code,
        "اسم الأصل الثابت": asset.name,
        "التصنيف / المجموعة": asset.category || "أصول ثابتة",
        "مركز التكلفة": asset.costCenterId || "-",
        "الموقع والمسؤول": asset.location || "-",
        "تاريخ الشراء وبدء التشغيل": asset.purchaseDate,
        "تكلفة الاقتناء التاريخية": asset.cost,
        "القيمة التخريدية المقدرة": salvage,
        "القيمة الخاضعة للإهلاك": depreciableBase,
        "العمر الإنتاجي (سنوات)": usefulYears,
        "طريقة الإهلاك": "قسط ثابت",
        "نسبة الإهلاك السنوية (%)": `${annualRate}%`,
        "مجمع الإهلاك المتراكم": accDep,
        "إهلاك العام التقديري": currentYearDep,
        "صافي القيمة الدفترية": netBook,
        "نسبة الاستهلاك الفعلي": `${depProgress}%`,
        "حالة الأصل": asset.status || (netBook <= salvage ? "مستهلك بالكامل" : "يعمل بكفاءة"),
      };
    });

    exportToExcel(rows, `شيت_مجمع_إهلاك_الأصول_الشامل_${companySettings.companyName}`, "مجمع الإهلاك للأصول");
    notifyDownloaded("fixed_assets");
  };

  // 7. Inventory Stock Sheet
  const exportInventoryStockExcel = () => {
    const rows = inventoryItems.map((item) => ({
      "كود الصنف": item.code,
      "اسم الصنف المخزني": item.name,
      "الوحدة": item.unit || "قطعة",
      "الكمية الحالية بالمستودع": item.quantity,
      "متوسط تكلفة الوحدة": item.costPrice,
      "إجمالي القيمة المخزنية": item.quantity * item.costPrice,
      "سعر البيع المقترح": item.sellingPrice,
      "حد إعادة الطلب": item.minStockLevel || 10,
      "حالة المخزون": item.quantity <= (item.minStockLevel || 10) ? "تحت حد الأمان (ناقص)" : "متوفر ومستقر",
    }));

    exportToExcel(rows, `شيت_جرد_المخزون_والمستودعات_${companySettings.companyName}`, "جرد المخزون");
    notifyDownloaded("inventory");
  };

  // 8. All-in-One Comprehensive Financial Workbook (7 Sheets)
  const exportAllInOneFinancialWorkbook = () => {
    const sheets: { sheetName: string; data: any[] }[] = [];

    // Sheet 1: Journal
    const journalRows = journalEntries.slice(0, 150).flatMap((je) =>
      je.lines.map((l) => {
        const acc = accounts.find((a) => a.id === l.accountId);
        return {
          "رقم القيد": je.entryNumber,
          "التاريخ": je.date,
          "كود الحساب": acc?.code || "-",
          "اسم الحساب": acc?.nameAr || "-",
          "مدين": l.debit,
          "دائن": l.credit,
          "البيان": je.notes,
        };
      })
    );
    sheets.push({ sheetName: "اليومية العامة", data: journalRows });

    // Sheet 2: Trial Balance
    const tbRows = accounts.map((acc) => ({
      "كود الحساب": acc.code,
      "اسم الحساب": acc.nameAr,
      "نوع الحساب": acc.type,
      "الرصيد الدفتري": acc.balance,
    }));
    sheets.push({ sheetName: "ميزان المراجعة", data: tbRows });

    // Sheet 3: Cash & Banks
    const cashRows = treasuryVouchers.map((v) => ({
      "رقم السند": v.voucherNumber,
      "التاريخ": v.date,
      "النوع": v.voucherType === "RECEIPT" ? "قبض" : "صرف",
      "المبلغ": v.amount,
      "المستفيد": v.beneficiary || "-",
      "البيان": v.notes,
    }));
    sheets.push({ sheetName: "حركة الخزينة", data: cashRows });

    // Sheet 4: Fixed Assets
    if (fixedAssets.length > 0) {
      const faRows = fixedAssets.map((a) => ({
        "كود الأصل": a.code,
        "الاسم": a.name,
        "التكلفة": a.cost,
        "مجمع الإهلاك": a.accumulatedDepreciation,
        "صافي القيمة الدفترية": a.bookValue,
      }));
      sheets.push({ sheetName: "مجمع الأصول والإهلاك", data: faRows });
    }

    // Sheet 5: Inventory
    if (inventoryItems.length > 0) {
      const invRows = inventoryItems.map((i) => ({
        "كود الصنف": i.code,
        "الاسم": i.name,
        "الكمية": i.quantity,
        "متوسط التكلفة": i.costPrice,
        "إجمالي القيمة": i.quantity * i.costPrice,
      }));
      sheets.push({ sheetName: "جرد المخزون", data: invRows });
    }

    exportMultipleSheetsToExcel(sheets, `الحزمة_المحاسبية_الشاملة_${companySettings.companyName}`);
    notifyDownloaded("all_in_one");
  };

  const sheetsList = [
    {
      id: "journal",
      title: "شيت اليومية العامة الشامل",
      desc: "جميع قيود اليومية بتفاصيل الأطراف المدينة والدائنة والمراجع ومراكز التكلفة",
      count: `${journalEntries.length} قيد محاسبي`,
      icon: <BookOpen className="w-5 h-5 text-blue-400" />,
      color: "border-blue-500/30 hover:border-blue-500/60 bg-blue-950/20",
      action: exportGeneralJournalExcel,
    },
    {
      id: "trial_balance",
      title: "شيت ميزان المراجعة بالأرصدة والمجاميع",
      desc: "حركة الحسابات، الأرصدة الافتتاحية، مجاميع المدين والدائن والأرصدة الختامية",
      count: `${accounts.length} حساب مالي`,
      icon: <Scale className="w-5 h-5 text-emerald-400" />,
      color: "border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-950/20",
      action: exportTrialBalanceExcel,
    },
    {
      id: "combined",
      title: "الشيت المجمع للنقدية والبنوك",
      desc: "كشف الحركة المشتركة لكافة صناديق الخزينة وحسابات البنوك مع التدفقات النقدية",
      count: `${treasuryVouchers.length + bankVouchers.length} سند وحركة`,
      icon: <Layers className="w-5 h-5 text-indigo-400" />,
      color: "border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-950/20",
      action: exportCombinedCashBankExcel,
    },
    {
      id: "fixed_assets",
      title: "شيت مجمع إهلاك الأصول الثابتة الشامل",
      desc: "التكلفة التاريخية، العمر الإنتاجي، نسبة الإهلاك، مجمع الإهلاك وصافي القيمة الدفترية لكل أصل",
      count: `${fixedAssets.length} أصل ثابت`,
      icon: <Building className="w-5 h-5 text-purple-400" />,
      color: "border-purple-500/30 hover:border-purple-500/60 bg-purple-950/20",
      action: exportFixedAssetsDepreciationExcel,
    },
    {
      id: "treasury_custody",
      title: "شيت حركة الخزينة والعهد وسلف الموظفين",
      desc: "سندات القبض والصرف، تسويات عهد المشاريع، أقساط سلف العاملين والمسدد منها",
      count: `${treasuryVouchers.length} سند / ${custodies.length} عهدة`,
      icon: <Wallet className="w-5 h-5 text-amber-400" />,
      color: "border-amber-500/30 hover:border-amber-500/60 bg-amber-950/20",
      action: exportTreasuryCustodyAdvanceExcel,
    },
    {
      id: "expenses",
      title: "شيت المصروفات والتكاليف التشغيلية",
      desc: "تفصيل كافة بنود النفقات والمصروفات الإدارية والعمومية ومقارنتها بالبنود",
      count: "مصروفات وبنود",
      icon: <Receipt className="w-5 h-5 text-rose-400" />,
      color: "border-rose-500/30 hover:border-rose-500/60 bg-rose-950/20",
      action: exportOperatingExpensesExcel,
    },
    {
      id: "inventory",
      title: "شيت جرد المخزون والمستودعات",
      desc: "أرصدة الأصناف الحالية، متوسط تكلفة الشراء، القيمة الإجمالية وحدود الأمان",
      count: `${inventoryItems.length} صنف مخزني`,
      icon: <Package className="w-5 h-5 text-teal-400" />,
      color: "border-teal-500/30 hover:border-teal-500/60 bg-teal-950/20",
      action: exportInventoryStockExcel,
    },
    {
      id: "all_in_one",
      title: "الحزمة المحاسبية الشاملة (All-in-One)",
      desc: "تصدير مصنف إكسيل موحد متكامل يحتوي على 7 أوراق عمل بكافة القوائم والبيانات",
      count: "مصنف متعدد الأوراق",
      icon: <Sparkles className="w-5 h-5 text-amber-300" />,
      color: "border-amber-400/40 hover:border-amber-400/80 bg-gradient-to-br from-amber-950/30 to-blue-950/30",
      action: exportAllInOneFinancialWorkbook,
    },
  ];

  return (
    <div className="bg-[#11141B] border border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
        <div>
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>مركز شيتات الإكسيل والتقارير الفورية</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            تنزيل شيتات إكسيل جاهزة ومحدثة ببيانات النظام بضغطة زر واحدة (Excel .XLSX)
          </p>
        </div>

        <button
          onClick={exportAllInOneFinancialWorkbook}
          className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow transition"
          title="تحميل جميع الشيتات معاً في ملف إكسيل واحد"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>تحميل الحزمة الشاملة All-in-One</span>
        </button>
      </div>

      {/* Grid of Excel Sheets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {sheetsList.map((item) => {
          const isDone = downloadedSheet === item.id;
          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${item.color}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="p-2 bg-gray-900/80 rounded-lg border border-gray-800">
                    {item.icon}
                  </div>
                  <span className="text-[10px] text-gray-400 bg-gray-900/60 px-2 py-0.5 rounded-full border border-gray-800">
                    {item.count}
                  </span>
                </div>

                <h4 className="font-bold text-white text-xs leading-snug mb-1">
                  {item.title}
                </h4>
                <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-gray-800/60 flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-mono">.XLSX مباشر</span>
                <button
                  onClick={item.action}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow ${
                    isDone
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-800 hover:bg-emerald-600 text-gray-200 hover:text-white"
                  }`}
                  title="تصدير وتحميل هذا الشيت فوراً"
                >
                  {isDone ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>تم التنزيل!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل الشيت</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
