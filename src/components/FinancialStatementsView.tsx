import React, { useState, useMemo } from "react";
import {
  PieChart,
  Scale,
  TrendingUp,
  Landmark,
  Printer,
  FileSpreadsheet,
  Receipt,
  CheckCircle2,
  AlertCircle,
  FileText,
  FolderKanban,
  Filter,
  Search,
  Calendar,
  RefreshCw,
  Download,
  Check,
  ChevronDown,
  Layers,
  MessageSquare,
} from "lucide-react";
import { Account, CompanySettings, CostCenter, JournalEntry, FilterParams } from "../types";
import { exportToExcel, exportMultipleSheetsToExcel, printReport, exportReportToPdf } from "../utils/export";

interface FinancialStatementsViewProps {
  accounts: Account[];
  journalEntries?: JournalEntry[];
  costCenters?: CostCenter[];
  companySettings: CompanySettings;
  filterParams: FilterParams;
}

export const FinancialStatementsView: React.FC<FinancialStatementsViewProps> = ({
  accounts,
  journalEntries = [],
  costCenters = [],
  companySettings,
  filterParams,
}) => {
  const [activeStatement, setActiveStatement] = useState<
    "income" | "balance_sheet" | "trial_balance" | "cash_flow" | "equity" | "taxes" | "cost_center_bs"
  >("income");
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>(filterParams.query || "");
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // Available Financial Years
  const availableYears = useMemo(() => {
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

  // Compute period start & end dates based on selectedYear and selectedMonth
  const { periodStartDate, periodEndDate } = useMemo(() => {
    if (selectedYear === "ALL" && selectedMonth === "ALL") {
      return { periodStartDate: "", periodEndDate: "" };
    }

    const yr = selectedYear !== "ALL" ? selectedYear : new Date().getFullYear().toString();

    if (selectedMonth !== "ALL") {
      const m = parseInt(selectedMonth, 10);
      const monthFormatted = m < 10 ? `0${m}` : `${m}`;
      const start = `${yr}-${monthFormatted}-01`;
      const lastDay = new Date(parseInt(yr, 10), m, 0).getDate();
      const lastDayFormatted = lastDay < 10 ? `0${lastDay}` : `${lastDay}`;
      const end = `${yr}-${monthFormatted}-${lastDayFormatted}`;
      return { periodStartDate: start, periodEndDate: end };
    } else {
      return { periodStartDate: `${yr}-01-01`, periodEndDate: `${yr}-12-31` };
    }
  }, [selectedYear, selectedMonth]);

  // Calculate effective accounts based on selected Year, Month, and Cost Center
  const effectiveAccounts = useMemo(() => {
    // If no entries, return base accounts
    if (!journalEntries.length) return accounts;

    const periodDeltas: Record<string, number> = {};
    const cumulativeDeltas: Record<string, number> = {};

    journalEntries.forEach((je) => {
      if (je.isPosted === false) return;

      const jeDate = je.date || "";

      const isInPeriod =
        (!periodStartDate || jeDate >= periodStartDate) &&
        (!periodEndDate || jeDate <= periodEndDate);

      const isUpToPeriodEnd = !periodEndDate || jeDate <= periodEndDate;

      je.lines.forEach((l) => {
        if (!l.accountId) return;
        if (selectedCostCenterId && l.costCenterId !== selectedCostCenterId) return;

        const net = (Number(l.debit) || 0) - (Number(l.credit) || 0);

        if (isInPeriod) {
          periodDeltas[l.accountId] = (periodDeltas[l.accountId] || 0) + net;
        }

        if (isUpToPeriodEnd) {
          cumulativeDeltas[l.accountId] = (cumulativeDeltas[l.accountId] || 0) + net;
        }
      });
    });

    return accounts.map((acc) => {
      const isIncomeStatement = acc.type === "REVENUE" || acc.type === "EXPENSE";
      const isDebitNormal = acc.type === "ASSET" || acc.type === "EXPENSE";

      if (isIncomeStatement) {
        // Income statement shows net movement during the selected period
        const netMovement = periodDeltas[acc.id] || 0;
        return {
          ...acc,
          balance: acc.type === "EXPENSE" ? netMovement : -netMovement,
        };
      } else {
        // Balance sheet shows base opening balance + cumulative movements up to period end
        const baseOpening = acc.openingBalance ?? 0;
        const cumNet = cumulativeDeltas[acc.id] || 0;
        const totalNet = isDebitNormal ? baseOpening + cumNet : baseOpening - cumNet;
        return {
          ...acc,
          balance: totalNet,
        };
      }
    });
  }, [accounts, journalEntries, selectedCostCenterId, periodStartDate, periodEndDate]);

  // Apply Search Query Filter to Effective Accounts
  const searchFilteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return effectiveAccounts;
    const q = searchQuery.toLowerCase().trim();
    return effectiveAccounts.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.nameAr.toLowerCase().includes(q) ||
        (a.nameEn && a.nameEn.toLowerCase().includes(q))
    );
  }, [effectiveAccounts, searchQuery]);

  // Calculations using searchFilteredAccounts
  const assetAccounts = searchFilteredAccounts.filter((a) => a.type === "ASSET");
  const liabilityAccounts = searchFilteredAccounts.filter((a) => a.type === "LIABILITY");
  const equityAccounts = searchFilteredAccounts.filter((a) => a.type === "EQUITY");
  const revenueAccounts = searchFilteredAccounts.filter((a) => a.type === "REVENUE");
  const expenseAccounts = searchFilteredAccounts.filter((a) => a.type === "EXPENSE");

  const totalAssets = assetAccounts.reduce((s, a) => s + (a.balance || 0), 0);
  const totalLiabilities = liabilityAccounts.reduce((s, a) => s + (a.balance || 0), 0);
  const totalEquity = equityAccounts.reduce((s, a) => s + (a.balance || 0), 0);
  const totalRevenues = revenueAccounts.reduce((s, a) => s + (a.balance || 0), 0);
  const totalExpenses = expenseAccounts.reduce((s, a) => s + (a.balance || 0), 0);
  const netProfit = totalRevenues - totalExpenses;

  // Detailed Balance Sheet Breakdown per Cost Center
  const costCenterStatements = useMemo(() => {
    return costCenters.map((cc) => {
      let ccAssets = 0;
      let ccLiabilities = 0;
      let ccRevenues = 0;
      let ccExpenses = 0;

      journalEntries.forEach((je) => {
        je.lines.forEach((l) => {
          if (l.costCenterId === cc.id && l.accountId) {
            const acc = accounts.find((a) => a.id === l.accountId);
            if (!acc) return;
            const netDebit = (l.debit || 0) - (l.credit || 0);

            if (acc.type === "ASSET") ccAssets += netDebit;
            else if (acc.type === "LIABILITY") ccLiabilities += -netDebit;
            else if (acc.type === "REVENUE") ccRevenues += -netDebit;
            else if (acc.type === "EXPENSE") ccExpenses += netDebit;
          }
        });
      });

      const ccNetProfit = ccRevenues - ccExpenses;
      const variance = cc.budget - ccExpenses;

      return {
        costCenter: cc,
        assets: ccAssets,
        liabilities: ccLiabilities,
        revenues: ccRevenues,
        expenses: ccExpenses,
        netProfit: ccNetProfit,
        variance,
      };
    });
  }, [costCenters, journalEntries, accounts]);

  // Taxes
  const vatAccount = accounts.find((a) => a.code === "2120");
  const withholdingTaxAccount = accounts.find((a) => a.code === "2130");
  const vatDue = vatAccount ? vatAccount.balance : 0;
  const withholdingTaxDue = withholdingTaxAccount ? withholdingTaxAccount.balance : 0;

  const showSuccessBanner = (msg: string) => {
    setExportSuccessMsg(msg);
    setTimeout(() => setExportSuccessMsg(null), 3500);
  };

  // 1. Export Active Statement to Excel
  const handleExportActiveStatementToExcel = () => {
    const periodLabel = selectedMonth !== "ALL" ? `شهر_${selectedMonth}_${selectedYear}` : `سنة_${selectedYear}`;
    const companyTag = companySettings.companyName ? `_${companySettings.companyName}` : "";

    if (activeStatement === "income") {
      const data: any[] = [];
      
      // Revenues
      revenueAccounts.forEach((a) => {
        data.push({
          "القسم": "1. إيرادات النشاط والمبيعات",
          "كود الحساب": a.code,
          "اسم الحساب": a.nameAr,
          "المبلغ": a.balance,
          "العملة": companySettings.currency,
        });
      });
      data.push({
        "القسم": "1. إيرادات النشاط والمبيعات",
        "كود الحساب": "TOTAL_REV",
        "اسم الحساب": "إجمالي الإيرادات المكتسبة",
        "المبلغ": totalRevenues,
        "العملة": companySettings.currency,
      });

      // Expenses
      expenseAccounts.forEach((a) => {
        data.push({
          "القسم": "2. المصروفات والتكاليف التشغيلية",
          "كود الحساب": a.code,
          "اسم الحساب": a.nameAr,
          "المبلغ": a.balance,
          "العملة": companySettings.currency,
        });
      });
      data.push({
        "القسم": "2. المصروفات والتكاليف التشغيلية",
        "كود الحساب": "TOTAL_EXP",
        "اسم الحساب": "إجمالي المصروفات التشغيلية",
        "المبلغ": totalExpenses,
        "العملة": companySettings.currency,
      });

      // Net Profit
      data.push({
        "القسم": "النتيجة النهائية",
        "كود الحساب": "NET_PROFIT",
        "اسم الحساب": netProfit >= 0 ? "صافي أرباح التشغيل للفترة (ربح)" : "صافي أرباح التشغيل للفترة (خسارة)",
        "المبلغ": netProfit,
        "العملة": companySettings.currency,
      });

      exportToExcel(data, `قائمة_الدخل${companyTag}_${periodLabel}`, "قائمة الدخل");
      showSuccessBanner("تم تصدير قائمة الدخل إلى ملف Excel بنجاح!");
    } else if (activeStatement === "balance_sheet") {
      const data: any[] = [];

      // Assets
      assetAccounts.forEach((a) => {
        data.push({
          "الجانب": "الأصول (Assets)",
          "كود الحساب": a.code,
          "اسم الحساب": a.nameAr,
          "الرصيد": a.balance,
          "العملة": companySettings.currency,
        });
      });
      data.push({
        "الجانب": "الأصول (Assets)",
        "كود الحساب": "TOTAL_ASSETS",
        "اسم الحساب": "مجموع الأصول",
        "الرصيد": totalAssets,
        "العملة": companySettings.currency,
      });

      // Liabilities
      liabilityAccounts.forEach((a) => {
        data.push({
          "الجانب": "الالتزامات (Liabilities)",
          "كود الحساب": a.code,
          "اسم الحساب": a.nameAr,
          "الرصيد": a.balance,
          "العملة": companySettings.currency,
        });
      });
      data.push({
        "الجانب": "الالتزامات (Liabilities)",
        "كود الحساب": "TOTAL_LIAB",
        "اسم الحساب": "مجموع الالتزامات",
        "الرصيد": totalLiabilities,
        "العملة": companySettings.currency,
      });

      // Equity
      equityAccounts.forEach((a) => {
        data.push({
          "الجانب": "حقوق الملكية (Equity)",
          "كود الحساب": a.code,
          "اسم الحساب": a.nameAr,
          "الرصيد": a.balance,
          "العملة": companySettings.currency,
        });
      });
      data.push({
        "الجانب": "حقوق الملكية (Equity)",
        "كود الحساب": "CURR_PROFIT",
        "اسم الحساب": "أرباح / (خسائر) الفترة الحالية",
        "الرصيد": netProfit,
        "العملة": companySettings.currency,
      });
      data.push({
        "الجانب": "الالتزامات وحقوق الملكية",
        "كود الحساب": "TOTAL_LIAB_EQUITY",
        "اسم الحساب": "مجموع الالتزامات وحقوق الملكية",
        "الرصيد": totalLiabilities + totalEquity + netProfit,
        "العملة": companySettings.currency,
      });
      data.push({
        "الجانب": "المطابقة والتوازن",
        "كود الحساب": "DIFF_CHECK",
        "اسم الحساب": Math.abs(totalAssets - (totalLiabilities + totalEquity + netProfit)) < 0.01 ? "الميزانية متوازنة 100% ✓" : "تنبيه: يوجد فارق في الميزانية",
        "الرصيد": Math.abs(totalAssets - (totalLiabilities + totalEquity + netProfit)),
        "العملة": companySettings.currency,
      });

      exportToExcel(data, `الميزانية_العمومية${companyTag}_${periodLabel}`, "الميزانية العمومية");
      showSuccessBanner("تم تصدير الميزانية العمومية إلى ملف Excel بنجاح!");
    } else if (activeStatement === "cost_center_bs") {
      const data = costCenterStatements.map((item) => ({
        "كود المركز": item.costCenter.code,
        "اسم مركز التكلفة": item.costCenter.name,
        "الأصول المخصصة": item.assets,
        "الالتزامات المستحقة": item.liabilities,
        "الإيرادات المحققة": item.revenues,
        "المصروفات الفعلية": item.expenses,
        "صافي الأرباح / (الخسائر)": item.netProfit,
        "الميزانية التقديرية": item.costCenter.budget,
        "انحراف الميزانية": item.variance,
        "العملة": companySettings.currency,
      }));

      // Totals
      data.push({
        "كود المركز": "TOTAL",
        "اسم مركز التكلفة": "الإجمالي العام لمراكز التكلفة",
        "الأصول المخصصة": costCenterStatements.reduce((s, i) => s + i.assets, 0),
        "الالتزامات المستحقة": costCenterStatements.reduce((s, i) => s + i.liabilities, 0),
        "الإيرادات المحققة": costCenterStatements.reduce((s, i) => s + i.revenues, 0),
        "المصروفات الفعلية": costCenterStatements.reduce((s, i) => s + i.expenses, 0),
        "صافي الأرباح / (الخسائر)": costCenterStatements.reduce((s, i) => s + i.netProfit, 0),
        "الميزانية التقديرية": costCenterStatements.reduce((s, i) => s + i.costCenter.budget, 0),
        "انحراف الميزانية": costCenterStatements.reduce((s, i) => s + i.variance, 0),
        "العملة": companySettings.currency,
      });

      exportToExcel(data, `ميزانية_مراكز_التكلفة${companyTag}_${periodLabel}`, "مراكز التكلفة");
      showSuccessBanner("تم تصدير ميزانية مراكز التكلفة إلى ملف Excel بنجاح!");
    } else if (activeStatement === "trial_balance") {
      const data = accounts.map((a) => {
        const isDebit = a.type === "ASSET" || a.type === "EXPENSE";
        const debitVal = isDebit && a.balance >= 0 ? a.balance : !isDebit && a.balance < 0 ? Math.abs(a.balance) : 0;
        const creditVal = !isDebit && a.balance >= 0 ? a.balance : isDebit && a.balance < 0 ? Math.abs(a.balance) : 0;
        return {
          "كود الحساب": a.code,
          "اسم الحساب": a.nameAr,
          "نوع الحساب": a.type,
          "الرصيد المدين (+)": debitVal,
          "الرصيد الدائن (-)": creditVal,
          "الرصيد الصافي": a.balance,
          "العملة": companySettings.currency,
        };
      });

      exportToExcel(data, `ميزان_المراجعة${companyTag}_${periodLabel}`, "ميزان المراجعة");
      showSuccessBanner("تم تصدير ميزان المراجعة إلى ملف Excel بنجاح!");
    } else if (activeStatement === "cash_flow") {
      const totalCashBanks = accounts.filter((a) => a.code.startsWith("111")).reduce((s, a) => s + a.balance, 0);
      const data = [
        {
          "البند المالي": "صافي أرباح التشغيل للفترة",
          "التصنيف": "التدفقات النقدية من الأنشطة التشغيلية",
          "المبلغ": netProfit,
          "العملة": companySettings.currency,
        },
        {
          "البند المالي": "إجمالي أرصدة الخزينة والبنوك النقدية الحالية",
          "التصنيف": "النقدية وما في حكمها بالنظام",
          "المبلغ": totalCashBanks,
          "العملة": companySettings.currency,
        },
      ];

      exportToExcel(data, `قائمة_التدفقات_النقدية${companyTag}_${periodLabel}`, "التدفقات النقدية");
      showSuccessBanner("تم تصدير قائمة التدفقات النقدية إلى ملف Excel بنجاح!");
    } else if (activeStatement === "equity") {
      const data = equityAccounts.map((a) => ({
        "كود الحساب": a.code,
        "اسم الحساب": a.nameAr,
        "رصيد أول الفترة": a.balance,
        "أرباح الفترة الحالية": a.code === "3120" || a.nameAr.includes("أرباح") ? netProfit : 0,
        "رصيد آخر الفترة": a.balance + (a.code === "3120" || a.nameAr.includes("أرباح") ? netProfit : 0),
        "العملة": companySettings.currency,
      }));

      data.push({
        "كود الحساب": "TOTAL",
        "اسم الحساب": "مجموع حقوق الملكية",
        "رصيد أول الفترة": equityAccounts.reduce((s, a) => s + a.balance, 0),
        "أرباح الفترة الحالية": netProfit,
        "رصيد آخر الفترة": equityAccounts.reduce((s, a) => s + a.balance, 0) + netProfit,
        "العملة": companySettings.currency,
      });

      exportToExcel(data, `قائمة_التغير_في_حقوق_الملكية${companyTag}_${periodLabel}`, "حقوق الملكية");
      showSuccessBanner("تم تصدير قائمة التغير في حقوق الملكية إلى ملف Excel بنجاح!");
    } else if (activeStatement === "taxes") {
      const citEstimate = netProfit > 0 ? netProfit * 0.225 : 0;
      const data = [
        {
          "بند الضريبة": "ضريبة القيمة المضافة المستحقة (VAT 14%)",
          "الحساب التجميعي": vatAccount ? vatAccount.nameAr : "حساب ضريبة القيمة المضافة",
          "المبلغ المستحق": vatDue,
          "البيان والجهة": "مستحقة السداد للهيئة العامة للضرائب المصرية",
          "العملة": companySettings.currency,
        },
        {
          "بند الضريبة": "ضريبة الخصم والتحصيل تحت حساب الضريبة",
          "الحساب التجميعي": withholdingTaxAccount ? withholdingTaxAccount.nameAr : "حساب ضريبة الخصم والتحصيل",
          "المبلغ المستحق": withholdingTaxDue,
          "البيان والجهة": "محتجزة لحساب الموردين والمقاولين",
          "العملة": companySettings.currency,
        },
        {
          "بند الضريبة": "تقدير ضريبة أرباح الشركات السنوية (22.5%)",
          "الحساب التجميعي": "مخصص ضريبة الدخل التقديري",
          "المبلغ المستحق": citEstimate,
          "البيان والجهة": "محسوبة بناءً على صافي أرباح قائمة الدخل",
          "العملة": companySettings.currency,
        },
        {
          "بند الضريبة": "إجمالي الضرائب والالتزامات المستحقة",
          "الحساب التجميعي": "مجموع الضرائب المستحقة والتقديرية",
          "المبلغ المستحق": vatDue + withholdingTaxDue + citEstimate,
          "البيان والجهة": "إجمالي مستحقات مصلحة الضرائب",
          "العملة": companySettings.currency,
        },
      ];

      exportToExcel(data, `موقف_الضرائب_المستحقة${companyTag}_${periodLabel}`, "الضرائب المستحقة");
      showSuccessBanner("تم تصدير تقرير الضرائب إلى ملف Excel بنجاح!");
    }
  };

  // 2. Export Full Multi-Sheet Financial Package (All in One)
  const handleExportFullFinancialPackage = () => {
    const periodLabel = selectedMonth !== "ALL" ? `شهر_${selectedMonth}_${selectedYear}` : `سنة_${selectedYear}`;
    const companyTag = companySettings.companyName ? `_${companySettings.companyName}` : "";

    // Sheet 1: Income Statement
    const incomeData: any[] = [];
    revenueAccounts.forEach((a) => {
      incomeData.push({
        "القسم": "1. إيرادات النشاط والمبيعات",
        "كود الحساب": a.code,
        "اسم الحساب": a.nameAr,
        "المبلغ": a.balance,
        "العملة": companySettings.currency,
      });
    });
    incomeData.push({
      "القسم": "1. إيرادات النشاط والمبيعات",
      "كود الحساب": "TOTAL_REV",
      "اسم الحساب": "إجمالي الإيرادات المكتسبة",
      "المبلغ": totalRevenues,
      "العملة": companySettings.currency,
    });
    expenseAccounts.forEach((a) => {
      incomeData.push({
        "القسم": "2. المصروفات والتكاليف التشغيلية",
        "كود الحساب": a.code,
        "اسم الحساب": a.nameAr,
        "المبلغ": a.balance,
        "العملة": companySettings.currency,
      });
    });
    incomeData.push({
      "القسم": "2. المصروفات والتكاليف التشغيلية",
      "كود الحساب": "TOTAL_EXP",
      "اسم الحساب": "إجمالي المصروفات التشغيلية",
      "المبلغ": totalExpenses,
      "العملة": companySettings.currency,
    });
    incomeData.push({
      "القسم": "النتيجة النهائية",
      "كود الحساب": "NET_PROFIT",
      "اسم الحساب": netProfit >= 0 ? "صافي أرباح التشغيل للفترة (ربح)" : "صافي أرباح التشغيل للفترة (خسارة)",
      "المبلغ": netProfit,
      "العملة": companySettings.currency,
    });

    // Sheet 2: Balance Sheet
    const bsData: any[] = [];
    assetAccounts.forEach((a) => {
      bsData.push({
        "الجانب": "الأصول (Assets)",
        "كود الحساب": a.code,
        "اسم الحساب": a.nameAr,
        "الرصيد": a.balance,
        "العملة": companySettings.currency,
      });
    });
    bsData.push({
      "الجانب": "الأصول (Assets)",
      "كود الحساب": "TOTAL_ASSETS",
      "اسم الحساب": "مجموع الأصول",
      "الرصيد": totalAssets,
      "العملة": companySettings.currency,
    });
    liabilityAccounts.forEach((a) => {
      bsData.push({
        "الجانب": "الالتزامات (Liabilities)",
        "كود الحساب": a.code,
        "اسم الحساب": a.nameAr,
        "الرصيد": a.balance,
        "العملة": companySettings.currency,
      });
    });
    bsData.push({
      "الجانب": "الالتزامات (Liabilities)",
      "كود الحساب": "TOTAL_LIAB",
      "اسم الحساب": "مجموع الالتزامات",
      "الرصيد": totalLiabilities,
      "العملة": companySettings.currency,
    });
    equityAccounts.forEach((a) => {
      bsData.push({
        "الجانب": "حقوق الملكية (Equity)",
        "كود الحساب": a.code,
        "اسم الحساب": a.nameAr,
        "الرصيد": a.balance,
        "العملة": companySettings.currency,
      });
    });
    bsData.push({
      "الجانب": "حقوق الملكية (Equity)",
      "كود الحساب": "CURR_PROFIT",
      "اسم الحساب": "أرباح / (خسائر) الفترة الحالية",
      "الرصيد": netProfit,
      "العملة": companySettings.currency,
    });
    bsData.push({
      "الجانب": "الالتزامات وحقوق الملكية",
      "كود الحساب": "TOTAL_LIAB_EQUITY",
      "اسم الحساب": "مجموع الالتزامات وحقوق الملكية",
      "الرصيد": totalLiabilities + totalEquity + netProfit,
      "العملة": companySettings.currency,
    });

    // Sheet 3: Cost Center BS
    const ccData = costCenterStatements.map((item) => ({
      "كود المركز": item.costCenter.code,
      "اسم مركز التكلفة": item.costCenter.name,
      "الأصول المخصصة": item.assets,
      "الالتزامات المستحقة": item.liabilities,
      "الإيرادات المحققة": item.revenues,
      "المصروفات الفعلية": item.expenses,
      "صافي الأرباح / (الخسائر)": item.netProfit,
      "الميزانية التقديرية": item.costCenter.budget,
      "انحراف الميزانية": item.variance,
      "العملة": companySettings.currency,
    }));
    ccData.push({
      "كود المركز": "TOTAL",
      "اسم مركز التكلفة": "الإجمالي العام لمراكز التكلفة",
      "الأصول المخصصة": costCenterStatements.reduce((s, i) => s + i.assets, 0),
      "الالتزامات المستحقة": costCenterStatements.reduce((s, i) => s + i.liabilities, 0),
      "الإيرادات المحققة": costCenterStatements.reduce((s, i) => s + i.revenues, 0),
      "المصروفات الفعلية": costCenterStatements.reduce((s, i) => s + i.expenses, 0),
      "صافي الأرباح / (الخسائر)": costCenterStatements.reduce((s, i) => s + i.netProfit, 0),
      "الميزانية التقديرية": costCenterStatements.reduce((s, i) => s + i.costCenter.budget, 0),
      "انحراف الميزانية": costCenterStatements.reduce((s, i) => s + i.variance, 0),
      "العملة": companySettings.currency,
    });

    // Sheet 4: Trial Balance
    const tbData = accounts.map((a) => {
      const isDebit = a.type === "ASSET" || a.type === "EXPENSE";
      const debitVal = isDebit && a.balance >= 0 ? a.balance : !isDebit && a.balance < 0 ? Math.abs(a.balance) : 0;
      const creditVal = !isDebit && a.balance >= 0 ? a.balance : isDebit && a.balance < 0 ? Math.abs(a.balance) : 0;
      return {
        "كود الحساب": a.code,
        "اسم الحساب": a.nameAr,
        "نوع الحساب": a.type,
        "الرصيد المدين (+)": debitVal,
        "الرصيد الدائن (-)": creditVal,
        "الرصيد الصافي": a.balance,
        "العملة": companySettings.currency,
      };
    });

    // Sheet 5: Cash Flow
    const totalCashBanks = accounts.filter((a) => a.code.startsWith("111")).reduce((s, a) => s + a.balance, 0);
    const cfData = [
      {
        "البند المالي": "صافي أرباح التشغيل للفترة",
        "التصنيف": "التدفقات النقدية من الأنشطة التشغيلية",
        "المبلغ": netProfit,
        "العملة": companySettings.currency,
      },
      {
        "البند المالي": "إجمالي أرصدة الخزينة والبنوك النقدية الحالية",
        "التصنيف": "النقدية وما في حكمها بالنظام",
        "المبلغ": totalCashBanks,
        "العملة": companySettings.currency,
      },
    ];

    // Sheet 6: Equity Changes
    const eqData = equityAccounts.map((a) => ({
      "كود الحساب": a.code,
      "اسم الحساب": a.nameAr,
      "رصيد أول الفترة": a.balance,
      "أرباح الفترة الحالية": a.code === "3120" || a.nameAr.includes("أرباح") ? netProfit : 0,
      "رصيد آخر الفترة": a.balance + (a.code === "3120" || a.nameAr.includes("أرباح") ? netProfit : 0),
      "العملة": companySettings.currency,
    }));
    eqData.push({
      "كود الحساب": "TOTAL",
      "اسم الحساب": "مجموع حقوق الملكية",
      "رصيد أول الفترة": equityAccounts.reduce((s, a) => s + a.balance, 0),
      "أرباح الفترة الحالية": netProfit,
      "رصيد آخر الفترة": equityAccounts.reduce((s, a) => s + a.balance, 0) + netProfit,
      "العملة": companySettings.currency,
    });

    // Sheet 7: Taxes
    const citEstimate = netProfit > 0 ? netProfit * 0.225 : 0;
    const taxData = [
      {
        "بند الضريبة": "ضريبة القيمة المضافة المستحقة (VAT 14%)",
        "الحساب التجميعي": vatAccount ? vatAccount.nameAr : "حساب ضريبة القيمة المضافة",
        "المبلغ المستحق": vatDue,
        "البيان والجهة": "مستحقة السداد للهيئة العامة للضرائب المصرية",
        "العملة": companySettings.currency,
      },
      {
        "بند الضريبة": "ضريبة الخصم والتحصيل تحت حساب الضريبة",
        "الحساب التجميعي": withholdingTaxAccount ? withholdingTaxAccount.nameAr : "حساب ضريبة الخصم والتحصيل",
        "المبلغ المستحق": withholdingTaxDue,
        "البيان والجهة": "محتجزة لحساب الموردين والمقاولين",
        "العملة": companySettings.currency,
      },
      {
        "بند الضريبة": "تقدير ضريبة أرباح الشركات السنوية (22.5%)",
        "الحساب التجميعي": "مخصص ضريبة الدخل التقديري",
        "المبلغ المستحق": citEstimate,
        "البيان والجهة": "محسوبة بناءً على صافي أرباح قائمة الدخل",
        "العملة": companySettings.currency,
      },
      {
        "بند الضريبة": "إجمالي الضرائب والالتزامات المستحقة",
        "الحساب التجميعي": "مجموع الضرائب المستحقة والتقديرية",
        "المبلغ المستحق": vatDue + withholdingTaxDue + citEstimate,
        "البيان والجهة": "إجمالي مستحقات مصلحة الضرائب",
        "العملة": companySettings.currency,
      },
    ];

    const sheets = [
      { sheetName: "1- قائمة الدخل", data: incomeData },
      { sheetName: "2- الميزانية العمومية", data: bsData },
      { sheetName: "3- ميزانية مراكز التكلفة", data: ccData },
      { sheetName: "4- ميزان المراجعة", data: tbData },
      { sheetName: "5- التدفقات النقدية", data: cfData },
      { sheetName: "6- حقوق الملكية", data: eqData },
      { sheetName: "7- الإقرار الضريبي", data: taxData },
    ];

    exportMultipleSheetsToExcel(sheets, `الحزمة_المالية_المتكاملة${companyTag}_${periodLabel}`);
    showSuccessBanner("تم تصدير الحزمة المالية الكاملة (7 قوائم في ملف Excel واحد) بنجاح!");
  };

  // Print / Export PDF Active Statement
  const handlePrintStatement = () => {
    let title = "";
    let contentHtml = "";

    if (activeStatement === "income") {
      title = "قائمة الدخل (تقرير الأرباح والخسائر)";
      contentHtml = `
        <h3>إيرادات النشاط والمبيعات:</h3>
        <table>
          <thead>
            <tr><th>كود الحساب</th><th>اسم الحساب</th><th>المبلغ</th></tr>
          </thead>
          <tbody>
            ${revenueAccounts
              .map((a) => `<tr><td>${a.code}</td><td>${a.nameAr}</td><td>${a.balance.toLocaleString()} ${companySettings.currency}</td></tr>`)
              .join("")}
            <tr style="font-weight: bold; background: #f1f5f9;">
              <td colspan="2">إجمالي الإيرادات:</td>
              <td style="color: green;">${totalRevenues.toLocaleString()} ${companySettings.currency}</td>
            </tr>
          </tbody>
        </table>

        <h3 style="margin-top: 20px;">المصروفات والتكاليف التشغيلية والإدارية:</h3>
        <table>
          <thead>
            <tr><th>كود الحساب</th><th>اسم الحساب</th><th>المبلغ</th></tr>
          </thead>
          <tbody>
            ${expenseAccounts
              .map((a) => `<tr><td>${a.code}</td><td>${a.nameAr}</td><td>${a.balance.toLocaleString()} ${companySettings.currency}</td></tr>`)
              .join("")}
            <tr style="font-weight: bold; background: #f1f5f9;">
              <td colspan="2">إجمالي المصروفات:</td>
              <td style="color: red;">${totalExpenses.toLocaleString()} ${companySettings.currency}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 20px; padding: 12px; background: #eff6ff; border: 1px solid #3b82f6; font-size: 15px; font-weight: bold; text-align: center;">
          صافي أرباح النشاط (قبل الضريبة): ${netProfit.toLocaleString()} ${companySettings.currency}
        </div>
      `;
    } else if (activeStatement === "balance_sheet") {
      title = "الميزانية العمومية (قائمة المركز المالي)";
      contentHtml = `
        <div style="display: flex; gap: 20px;">
          <div style="flex: 1;">
            <h3>الأصول (Assets)</h3>
            <table>
              <thead><tr><th>كود</th><th>الحساب</th><th>الرصيد</th></tr></thead>
              <tbody>
                ${assetAccounts.map((a) => `<tr><td>${a.code}</td><td>${a.nameAr}</td><td>${a.balance.toLocaleString()}</td></tr>`).join("")}
                <tr style="font-weight: bold; background: #f1f5f9;"><td colspan="2">إجمالي الأصول:</td><td>${totalAssets.toLocaleString()}</td></tr>
              </tbody>
            </table>
          </div>

          <div style="flex: 1;">
            <h3>الالتزامات وحقوق الملكية (Liabilities & Equity)</h3>
            <table>
              <thead><tr><th>كود</th><th>الحساب</th><th>الرصيد</th></tr></thead>
              <tbody>
                ${liabilityAccounts.map((a) => `<tr><td>${a.code}</td><td>${a.nameAr}</td><td>${a.balance.toLocaleString()}</td></tr>`).join("")}
                ${equityAccounts.map((a) => `<tr><td>${a.code}</td><td>${a.nameAr}</td><td>${a.balance.toLocaleString()}</td></tr>`).join("")}
                <tr style="font-weight: bold;"><td>-</td><td>أرباح الفترة الحالية:</td><td>${netProfit.toLocaleString()}</td></tr>
                <tr style="font-weight: bold; background: #f1f5f9;"><td colspan="2">مجموع الالتزامات وحقوق الملكية:</td><td>${(totalLiabilities + totalEquity + netProfit).toLocaleString()}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (activeStatement === "trial_balance") {
      title = "ميزان المراجعة بالإجماليات والأرصدة";
      contentHtml = `
        <table>
          <thead>
            <tr><th>كود الحساب</th><th>اسم الحساب</th><th>النوع</th><th>الرصيد النهائي</th></tr>
          </thead>
          <tbody>
            ${accounts.map((a) => `<tr><td>${a.code}</td><td>${a.nameAr}</td><td>${a.type}</td><td>${a.balance.toLocaleString()} ${companySettings.currency}</td></tr>`).join("")}
          </tbody>
        </table>
      `;
    } else if (activeStatement === "taxes") {
      title = "تقرير الإقرار الضريبي والالتزامات المستحقة";
      contentHtml = `
        <table>
          <thead><tr><th>بند الضريبة</th><th>الحساب التجميعي</th><th>المبلغ المستحق</th></tr></thead>
          <tbody>
            <tr><td>ضريبة القيمة المضافة VAT (14%)</td><td>${vatAccount ? vatAccount.nameAr : "حساب ضريبة القيمة المضافة"}</td><td>${vatDue.toLocaleString()} ${companySettings.currency}</td></tr>
            <tr><td>ضريبة الخصم والإضافة من المنبع</td><td>${withholdingTaxAccount ? withholdingTaxAccount.nameAr : "حساب ضريبة الخصم والتحصيل"}</td><td>${withholdingTaxDue.toLocaleString()} ${companySettings.currency}</td></tr>
            <tr style="font-weight: bold; background: #f1f5f9;">
              <td colspan="2">إجمالي الضرائب المستحقة للسداد:</td>
              <td style="color: #dc2626;">${(vatDue + withholdingTaxDue).toLocaleString()} ${companySettings.currency}</td>
            </tr>
          </tbody>
        </table>
      `;
    } else {
      title = "القوائم المالية للشركة";
      contentHtml = `
        <table>
          <thead><tr><th>اسم الحساب</th><th>النوع</th><th>الرصيد</th></tr></thead>
          <tbody>
            ${accounts.map((a) => `<tr><td>${a.nameAr}</td><td>${a.type}</td><td>${a.balance.toLocaleString()}</td></tr>`).join("")}
          </tbody>
        </table>
      `;
    }

    printReport(title, contentHtml, companySettings);
  };

  // Export Active Statement to true PDF download
  const handleExportPdfStatement = async () => {
    let title = "";
    let contentHtml = "";

    if (activeStatement === "income") {
      title = "قائمة الدخل (تقرير الأرباح والخسائر)";
      contentHtml = `
        <h3 style="margin-bottom: 8px;">إيرادات النشاط والمبيعات:</h3>
        <table>
          <thead>
            <tr><th>كود الحساب</th><th>اسم الحساب</th><th>المبلغ</th></tr>
          </thead>
          <tbody>
            ${revenueAccounts
              .map((a) => `<tr><td>${a.code}</td><td>${a.nameAr}</td><td style="font-weight:bold; color:green;">${a.balance.toLocaleString()} ${companySettings.currency}</td></tr>`)
              .join("")}
            <tr style="font-weight: bold; background: #f1f5f9;">
              <td colspan="2">إجمالي الإيرادات:</td>
              <td style="color: green;">${totalRevenues.toLocaleString()} ${companySettings.currency}</td>
            </tr>
          </tbody>
        </table>

        <h3 style="margin-top: 20px; margin-bottom: 8px;">المصروفات والتكاليف التشغيلية والإدارية:</h3>
        <table>
          <thead>
            <tr><th>كود الحساب</th><th>اسم الحساب</th><th>المبلغ</th></tr>
          </thead>
          <tbody>
            ${expenseAccounts
              .map((a) => `<tr><td>${a.code}</td><td>${a.nameAr}</td><td style="font-weight:bold; color:red;">${a.balance.toLocaleString()} ${companySettings.currency}</td></tr>`)
              .join("")}
            <tr style="font-weight: bold; background: #f1f5f9;">
              <td colspan="2">إجمالي المصروفات:</td>
              <td style="color: red;">${totalExpenses.toLocaleString()} ${companySettings.currency}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 20px; padding: 12px; background: #eff6ff; border: 1px solid #3b82f6; font-size: 15px; font-weight: bold; text-align: center;">
          صافي أرباح النشاط (قبل الضريبة): ${netProfit.toLocaleString()} ${companySettings.currency}
        </div>
      `;
    } else {
      title = getStatementTitle();
      contentHtml = `
        <div style="margin-bottom: 15px;">
          <h3>تقرير ${title}</h3>
          <p>السنة المالية: ${selectedYear} | الفترة: ${selectedMonth === "ALL" ? "كامل السنة" : `شهر ${selectedMonth}`}</p>
        </div>
        <table>
          <thead>
            <tr><th>المؤشر المالي</th><th>القيمة الحالية</th></tr>
          </thead>
          <tbody>
            <tr><td>مجموع الأصول</td><td style="color: green; font-weight: bold;">${totalAssets.toLocaleString()} ${companySettings.currency}</td></tr>
            <tr><td>مجموع الالتزامات</td><td style="color: red; font-weight: bold;">${totalLiabilities.toLocaleString()} ${companySettings.currency}</td></tr>
            <tr><td>حقوق الملكية</td><td>${totalEquity.toLocaleString()} ${companySettings.currency}</td></tr>
            <tr style="font-weight: bold; background: #f1f5f9;"><td>صافي أرباح الفترة</td><td>${netProfit.toLocaleString()} ${companySettings.currency}</td></tr>
          </tbody>
        </table>
      `;
    }

    await exportReportToPdf(`تقرير_${title}_${selectedYear}`, contentHtml, companySettings);
  };

  // Direct WhatsApp Share for Financial Statement Summary
  const handleSendWhatsAppFinancialSummary = () => {
    const title = getStatementTitle();
    const msg = `🏢 *${companySettings.companyName}*\n📊 *ملخص ${title}:*\n\n📅 *السنة المالية:* ${selectedYear}\n📈 *إجمالي الإيرادات:* ${totalRevenues.toLocaleString()} ${companySettings.currency}\n📉 *إجمالي المصروفات:* ${totalExpenses.toLocaleString()} ${companySettings.currency}\n💰 *صافي أرباح الفترة:* ${netProfit.toLocaleString()} ${companySettings.currency}\n🏛️ *مجموع الأصول:* ${totalAssets.toLocaleString()} ${companySettings.currency}\n📑 *مجموع الالتزامات:* ${totalLiabilities.toLocaleString()} ${companySettings.currency}\n\n✅ صادر ومعتمد من الإدارة المالية ERP.`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const getStatementTitle = () => {
    switch (activeStatement) {
      case "income":
        return "قائمة الدخل";
      case "balance_sheet":
        return "الميزانية العمومية";
      case "cost_center_bs":
        return "ميزانية مراكز التكلفة";
      case "trial_balance":
        return "ميزان المراجعة";
      case "cash_flow":
        return "التدفقات النقدية";
      case "equity":
        return "حقوق الملكية";
      case "taxes":
        return "الإقرار الضريبي";
      default:
        return "القوائم المالية";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Success Notification Banner */}
      {exportSuccessMsg && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-bold shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{exportSuccessMsg}</span>
          </div>
          <button
            onClick={() => setExportSuccessMsg(null)}
            className="text-emerald-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-400" />
            <span>القوائم المالية المعتمدة والضرائب المستحقة</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            عرض وتصدير قائمة الدخل، الميزانية العمومية، ميزان المراجعة، التدفقات النقدية، وإقرار الضرائب
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export to Excel Main Button */}
          <button
            onClick={handleExportActiveStatementToExcel}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow transition"
            title={`تصدير ${getStatementTitle()} الحالية إلى Excel`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير {getStatementTitle()} إلى Excel</span>
          </button>

          {/* Export Full Financial Package Button */}
          <button
            onClick={handleExportFullFinancialPackage}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow transition"
            title="تصدير جميع القوائم السبعة في مصنف Excel واحد متعدد التبويبات"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">تصدير الحزمة المالية الشاملة (All-in-One)</span>
            <span className="sm:hidden">كل القوائم Excel</span>
          </button>

          <button
            onClick={handleSendWhatsAppFinancialSummary}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow transition"
            title="إرسال ملخص القائمة المالية الحالية عبر واتساب"
          >
            <MessageSquare className="w-4 h-4" />
            <span>إرسال واتساب</span>
          </button>

          <button
            onClick={handleExportPdfStatement}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow transition"
            title="تحميل وتصدير القائمة المالية بصيغة ملف PDF معتمد"
          >
            <FileText className="w-4 h-4" />
            <span>تصدير إلى PDF</span>
          </button>
          <button
            onClick={handlePrintStatement}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>طباعة القائمة</span>
          </button>
        </div>
      </div>

      {/* Filter Bar (Year, Month, Search Query, Cost Center) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3 text-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Year & Month Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-2.5 py-1.5 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300 font-semibold text-[11px]">السنة المالية:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-900 text-amber-300 font-bold border border-slate-700 rounded px-2 py-0.5 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">جميع السنوات (الكل)</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    سنة {yr}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-2.5 py-1.5 rounded-lg">
              <Filter className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-300 font-semibold text-[11px]">الشهر:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-900 text-blue-300 font-bold border border-slate-700 rounded px-2 py-0.5 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">جميع الشهور (إجمالي السنة)</option>
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

            {/* Cost Center Selector */}
            {costCenters.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-2.5 py-1.5 rounded-lg">
                <FolderKanban className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300 font-semibold text-[11px]">مركز التكلفة:</span>
                <select
                  value={selectedCostCenterId}
                  onChange={(e) => setSelectedCostCenterId(e.target.value)}
                  className="bg-slate-900 text-emerald-300 font-bold border border-slate-700 rounded px-2 py-0.5 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">جميع المراكز (الشركة ككل)</option>
                  {costCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.code} - {cc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(selectedYear !== "ALL" || selectedMonth !== "ALL" || selectedCostCenterId || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedYear("ALL");
                  setSelectedMonth("ALL");
                  setSelectedCostCenterId("");
                  setSearchQuery("");
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 rounded-lg transition font-semibold"
              >
                <RefreshCw className="w-3 h-3 text-rose-400" />
                <span>إعادة ضبط التصفية</span>
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md min-w-[240px]">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="بحث في القوائم بالكود أو اسم الحساب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3 text-xs font-semibold">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveStatement("income")}
            className={`px-3 py-1.5 rounded-lg transition ${activeStatement === "income" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
          >
            قائمة الدخل (الأرباح والخسائر)
          </button>
          <button
            onClick={() => setActiveStatement("balance_sheet")}
            className={`px-3 py-1.5 rounded-lg transition ${activeStatement === "balance_sheet" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
          >
            الميزانية العمومية (المركز المالي)
          </button>
          <button
            onClick={() => setActiveStatement("cost_center_bs")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${activeStatement === "cost_center_bs" ? "bg-emerald-600 text-white" : "bg-slate-800 text-emerald-400 hover:text-white border border-emerald-500/20"}`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>ميزانية مراكز التكلفة</span>
          </button>
          <button
            onClick={() => setActiveStatement("trial_balance")}
            className={`px-3 py-1.5 rounded-lg transition ${activeStatement === "trial_balance" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
          >
            ميزان المراجع بالأرصدة
          </button>
          <button
            onClick={() => setActiveStatement("cash_flow")}
            className={`px-3 py-1.5 rounded-lg transition ${activeStatement === "cash_flow" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
          >
            قائمة التدفقات النقدية
          </button>
          <button
            onClick={() => setActiveStatement("equity")}
            className={`px-3 py-1.5 rounded-lg transition ${activeStatement === "equity" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
          >
            التغير في حقوق الملكية
          </button>
          <button
            onClick={() => setActiveStatement("taxes")}
            className={`px-3 py-1.5 rounded-lg transition ${activeStatement === "taxes" ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
          >
            الضرائب المستحقة والإقرارات
          </button>
        </div>

        {/* Cost Center Filter Selector */}
        {costCenters.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-lg border border-slate-700">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-300 text-xs">تصفية القائمة بمركز تكلفة:</span>
            <select
              value={selectedCostCenterId}
              onChange={(e) => setSelectedCostCenterId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
            >
              <option value="">جميع مراكز التكلفة (شامل الشركة)</option>
              {costCenters.map((cc) => (
                <option key={cc.id} value={cc.id}>
                  {cc.code} - {cc.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* View Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        {activeStatement === "income" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">قائمة الدخل - عن السنة المالية {companySettings.financialYear}</h3>
              <button
                onClick={handleExportActiveStatementToExcel}
                className="flex items-center gap-1.5 self-start sm:self-auto bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-lg text-xs font-semibold transition shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>تصدير قائمة الدخل إلى Excel</span>
              </button>
            </div>
            
            <div className="space-y-2">
              <span className="font-bold text-emerald-400 text-xs block">1. إيرادات النشاط والمبيعات</span>
              <table className="w-full text-xs text-right text-slate-300">
                <tbody className="divide-y divide-slate-800">
                  {revenueAccounts.map((a) => (
                    <tr key={a.id}>
                      <td className="p-2">{a.code} - {a.nameAr}</td>
                      <td className="p-2 font-bold text-emerald-400 text-left">{a.balance.toLocaleString()} {companySettings.currency}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-800 font-bold text-emerald-300">
                    <td className="p-2">إجمالي الإيرادات المكتسبة:</td>
                    <td className="p-2 text-left">{totalRevenues.toLocaleString()} {companySettings.currency}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-2 pt-2">
              <span className="font-bold text-rose-400 text-xs block">2. المصروفات العمومية والتشغيلية</span>
              <table className="w-full text-xs text-right text-slate-300">
                <tbody className="divide-y divide-slate-800">
                  {expenseAccounts.map((a) => (
                    <tr key={a.id}>
                      <td className="p-2">{a.code} - {a.nameAr}</td>
                      <td className="p-2 font-bold text-rose-400 text-left">{a.balance.toLocaleString()} {companySettings.currency}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-800 font-bold text-rose-300">
                    <td className="p-2">إجمالي المصروفات التشغيلية:</td>
                    <td className="p-2 text-left">{totalExpenses.toLocaleString()} {companySettings.currency}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-blue-950/40 border border-blue-500/30 rounded-xl flex justify-between items-center text-sm font-extrabold text-white">
              <span>صافي الأرباح التشغيلية للفترة:</span>
              <span className={netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {netProfit.toLocaleString()} {companySettings.currency}
              </span>
            </div>
          </div>
        )}

        {activeStatement === "balance_sheet" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">الميزانية العمومية (قائمة المركز المالي) - كما في نهاية الفترة</h3>
              <button
                onClick={handleExportActiveStatementToExcel}
                className="flex items-center gap-1.5 self-start sm:self-auto bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-lg text-xs font-semibold transition shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>تصدير الميزانية العمومية إلى Excel</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assets Column */}
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-emerald-400 text-sm border-b border-slate-800 pb-2">جانب الأصول (Assets)</h4>
                <table className="w-full text-xs text-right text-slate-300">
                  <tbody className="divide-y divide-slate-800">
                    {assetAccounts.map((a) => (
                      <tr key={a.id}>
                        <td className="p-2"><span className="font-mono text-slate-500 mr-1">[{a.code}]</span> {a.nameAr}</td>
                        <td className="p-2 font-bold text-emerald-400 text-left dir-ltr">{a.balance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-950/40 border-t border-emerald-500/30 font-bold text-emerald-300 text-sm">
                      <td className="p-3">مجموع الأصول:</td>
                      <td className="p-3 text-left dir-ltr">{totalAssets.toLocaleString()} {companySettings.currency}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Liabilities & Equity Column */}
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-blue-400 text-sm border-b border-slate-800 pb-2">الالتزامات وحقوق الملكية (Liabilities & Equity)</h4>
                
                <span className="text-xs font-semibold text-rose-400 block pt-1">1. الالتزامات (الخصوم)</span>
                <table className="w-full text-xs text-right text-slate-300">
                  <tbody className="divide-y divide-slate-800">
                    {liabilityAccounts.map((a) => (
                      <tr key={a.id}>
                        <td className="p-2"><span className="font-mono text-slate-500 mr-1">[{a.code}]</span> {a.nameAr}</td>
                        <td className="p-2 font-bold text-rose-400 text-left dir-ltr">{a.balance.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-800 font-bold text-slate-300">
                      <td className="p-2">مجموع الالتزامات:</td>
                      <td className="p-2 text-left dir-ltr">{totalLiabilities.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>

                <span className="text-xs font-semibold text-purple-400 block pt-2">2. حقوق الملكية</span>
                <table className="w-full text-xs text-right text-slate-300">
                  <tbody className="divide-y divide-slate-800">
                    {equityAccounts.map((a) => (
                      <tr key={a.id}>
                        <td className="p-2"><span className="font-mono text-slate-500 mr-1">[{a.code}]</span> {a.nameAr}</td>
                        <td className="p-2 font-bold text-purple-400 text-left dir-ltr">{a.balance.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-blue-950/30 font-bold text-blue-300">
                      <td className="p-2">أرباح / (خسائر) الفترة الحالية:</td>
                      <td className="p-2 text-left dir-ltr">{netProfit.toLocaleString()}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-950/60 border-t border-blue-500/30 font-bold text-blue-300 text-sm">
                      <td className="p-3">مجموع الالتزامات وحقوق الملكية:</td>
                      <td className="p-3 text-left dir-ltr">{(totalLiabilities + totalEquity + netProfit).toLocaleString()} {companySettings.currency}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Balance Status Card */}
            <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
              Math.abs(totalAssets - (totalLiabilities + totalEquity + netProfit)) < 0.01
                ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-400"
                : "bg-rose-950/30 border-rose-500/40 text-rose-400"
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  {Math.abs(totalAssets - (totalLiabilities + totalEquity + netProfit)) < 0.01
                    ? "الميزانية متوازنة تماماً (الأصول = الخصوم + حقوق الملكية)"
                    : "تنبيه: يوجد فارق في توازن الميزانية العمومية!"}
                </span>
              </div>
              <span>
                الفارق: {Math.abs(totalAssets - (totalLiabilities + totalEquity + netProfit)).toLocaleString()} {companySettings.currency}
              </span>
            </div>
          </div>
        )}

        {/* Cost Center Balance Sheet & Performance Statement */}
        {activeStatement === "cost_center_bs" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-emerald-400" />
                  <span>الميزانية والمركز المالي لمراكز التكلفة (Cost Center Balance Sheets)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  تحليل مالي شامل لتخصيص الأصول، الالتزامات، الإيرادات، والمصروفات والانحراف عن الميزانية المعتمدة لكل مركز تكلفة
                </p>
              </div>
              <button
                onClick={handleExportActiveStatementToExcel}
                className="flex items-center gap-1.5 self-start sm:self-auto bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-lg text-xs font-semibold transition shadow-sm whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>تصدير إلى Excel</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-xs text-right text-slate-300">
                <thead className="bg-slate-800 text-slate-200 font-bold">
                  <tr>
                    <th className="p-3">الكود</th>
                    <th className="p-3">اسم مركز التكلفة</th>
                    <th className="p-3 text-emerald-400">الأصول المخصصة</th>
                    <th className="p-3 text-rose-400">الالتزامات المستحقة</th>
                    <th className="p-3 text-blue-400">الإيرادات المحققة</th>
                    <th className="p-3 text-amber-400">المصروفات الفعلية</th>
                    <th className="p-3 text-purple-400">صافي الأرباح / (الخسائر)</th>
                    <th className="p-3">الميزانية التقديرية</th>
                    <th className="p-3">انحراف الميزانية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {costCenterStatements.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-slate-500">
                        لا توجد مراكز تكلفة معرفة في النظام
                      </td>
                    </tr>
                  ) : (
                    costCenterStatements.map((item) => (
                      <tr key={item.costCenter.id} className="hover:bg-slate-800/50 transition">
                        <td className="p-3 font-mono text-slate-400 font-semibold">{item.costCenter.code}</td>
                        <td className="p-3 font-bold text-white">{item.costCenter.name}</td>
                        <td className="p-3 font-bold text-emerald-400">{item.assets.toLocaleString()} {companySettings.currency}</td>
                        <td className="p-3 font-bold text-rose-400">{item.liabilities.toLocaleString()} {companySettings.currency}</td>
                        <td className="p-3 font-bold text-blue-400">{item.revenues.toLocaleString()} {companySettings.currency}</td>
                        <td className="p-3 font-bold text-amber-400">{item.expenses.toLocaleString()} {companySettings.currency}</td>
                        <td className={`p-3 font-bold ${item.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {item.netProfit.toLocaleString()} {companySettings.currency}
                        </td>
                        <td className="p-3 font-semibold text-slate-300">{item.costCenter.budget.toLocaleString()} {companySettings.currency}</td>
                        <td className={`p-3 font-bold ${item.variance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {item.variance >= 0 ? "+" : ""}{item.variance.toLocaleString()} {companySettings.currency}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-950 font-bold border-t border-slate-700 text-white">
                  <tr>
                    <td colSpan={2} className="p-3 text-left">إجمالي مراكز التكلفة:</td>
                    <td className="p-3 text-emerald-400">
                      {costCenterStatements.reduce((s, i) => s + i.assets, 0).toLocaleString()} {companySettings.currency}
                    </td>
                    <td className="p-3 text-rose-400">
                      {costCenterStatements.reduce((s, i) => s + i.liabilities, 0).toLocaleString()} {companySettings.currency}
                    </td>
                    <td className="p-3 text-blue-400">
                      {costCenterStatements.reduce((s, i) => s + i.revenues, 0).toLocaleString()} {companySettings.currency}
                    </td>
                    <td className="p-3 text-amber-400">
                      {costCenterStatements.reduce((s, i) => s + i.expenses, 0).toLocaleString()} {companySettings.currency}
                    </td>
                    <td className="p-3 text-purple-400">
                      {costCenterStatements.reduce((s, i) => s + i.netProfit, 0).toLocaleString()} {companySettings.currency}
                    </td>
                    <td className="p-3 text-slate-300">
                      {costCenterStatements.reduce((s, i) => s + i.costCenter.budget, 0).toLocaleString()} {companySettings.currency}
                    </td>
                    <td className="p-3 text-emerald-400">
                      {costCenterStatements.reduce((s, i) => s + i.variance, 0).toLocaleString()} {companySettings.currency}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {activeStatement === "trial_balance" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">ميزان المراجعة بالإجماليات والأرصدة</h3>
              <button
                onClick={handleExportActiveStatementToExcel}
                className="flex items-center gap-1.5 self-start sm:self-auto bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-lg text-xs font-semibold transition shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>تصدير ميزان المراجعة إلى Excel</span>
              </button>
            </div>
            
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-xs text-right text-slate-300">
                <thead className="bg-slate-800 text-slate-300 font-bold">
                  <tr>
                    <th className="p-3">كود الحساب</th>
                    <th className="p-3">اسم الحساب</th>
                    <th className="p-3">نوع الحساب</th>
                    <th className="p-3 text-emerald-400">الرصيد المدين (+)</th>
                    <th className="p-3 text-rose-400">الرصيد الدائن (-)</th>
                    <th className="p-3 text-blue-300">الرصيد الصافي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {accounts.map((a) => {
                    const isDebit = a.type === "ASSET" || a.type === "EXPENSE";
                    const debitVal = isDebit && a.balance >= 0 ? a.balance : !isDebit && a.balance < 0 ? Math.abs(a.balance) : 0;
                    const creditVal = !isDebit && a.balance >= 0 ? a.balance : isDebit && a.balance < 0 ? Math.abs(a.balance) : 0;

                    return (
                      <tr key={a.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-slate-400">{a.code}</td>
                        <td className="p-3 font-medium text-white">{a.nameAr}</td>
                        <td className="p-3 text-slate-400">{a.type}</td>
                        <td className="p-3 font-bold text-emerald-400 text-left dir-ltr">
                          {debitVal > 0 ? debitVal.toLocaleString() : "-"}
                        </td>
                        <td className="p-3 font-bold text-rose-400 text-left dir-ltr">
                          {creditVal > 0 ? creditVal.toLocaleString() : "-"}
                        </td>
                        <td className="p-3 font-bold text-blue-300 text-left dir-ltr">
                          {a.balance.toLocaleString()} {companySettings.currency}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeStatement === "cash_flow" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">قائمة التدفقات النقدية (الأنشطة التشغيلية والاستثمارية والتمويلية)</h3>
              <button
                onClick={handleExportActiveStatementToExcel}
                className="flex items-center gap-1.5 self-start sm:self-auto bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-lg text-xs font-semibold transition shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>تصدير التدفقات النقدية إلى Excel</span>
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-2">
                <span className="text-xs font-bold text-emerald-400">1. التدفقات النقدية من الأنشطة التشغيلية:</span>
                <div className="flex justify-between text-xs text-slate-300 border-b border-slate-700/60 pb-1">
                  <span>صافي أرباح التشغيل:</span>
                  <span className="font-bold text-white dir-ltr">{netProfit.toLocaleString()} {companySettings.currency}</span>
                </div>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-2">
                <span className="text-xs font-bold text-blue-400">2. النقدية وما في حكمها بالنظام:</span>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>إجمالي أرصدة الخزينة والبنوك النقدية الحالية:</span>
                  <span className="font-bold text-blue-400 dir-ltr">
                    {accounts
                      .filter((a) => a.code.startsWith("111"))
                      .reduce((s, a) => s + a.balance, 0)
                      .toLocaleString()}{" "}
                    {companySettings.currency}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeStatement === "equity" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">قائمة التغيرات في حقوق الملكية</h3>
              <button
                onClick={handleExportActiveStatementToExcel}
                className="flex items-center gap-1.5 self-start sm:self-auto bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-lg text-xs font-semibold transition shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>تصدير حقوق الملكية إلى Excel</span>
              </button>
            </div>
            
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-xs text-right text-slate-300">
                <thead className="bg-slate-800 text-slate-300 font-bold">
                  <tr>
                    <th className="p-3">الحساب</th>
                    <th className="p-3">رصيد أول الفترة</th>
                    <th className="p-3">أرباح الفترة الحالية</th>
                    <th className="p-3">رصيد آخر الفترة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {equityAccounts.map((a) => (
                    <tr key={a.id}>
                      <td className="p-3 font-medium text-white">{a.code} - {a.nameAr}</td>
                      <td className="p-3 font-bold text-slate-400 dir-ltr">{a.balance.toLocaleString()}</td>
                      <td className="p-3 font-bold text-emerald-400 dir-ltr">
                        {a.code === "3120" || a.nameAr.includes("أرباح") ? netProfit.toLocaleString() : "-"}
                      </td>
                      <td className="p-3 font-bold text-purple-300 dir-ltr">
                        {(a.balance + (a.code === "3120" || a.nameAr.includes("أرباح") ? netProfit : 0)).toLocaleString()} {companySettings.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeStatement === "taxes" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                <span>موقف الضرائب المستحقة والإقرارات الضريبية (قانون الضرائب المصري)</span>
              </h3>
              <button
                onClick={handleExportActiveStatementToExcel}
                className="flex items-center gap-1.5 self-start sm:self-auto bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-lg text-xs font-semibold transition shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>تصدير الإقرار الضريبي إلى Excel</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-2">
                <span className="text-xs text-slate-400 font-medium">ضريبة القيمة المضافة المستحقة (VAT 14%):</span>
                <p className="text-2xl font-extrabold text-amber-400">
                  {vatDue.toLocaleString()} {companySettings.currency}
                </p>
                <p className="text-[11px] text-slate-400">مستحقة السداد للهيئة العامة للضرائب المصرية</p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-2">
                <span className="text-xs text-slate-400 font-medium">ضريبة الخصم والتحصيل تحت حساب الضريبة:</span>
                <p className="text-2xl font-extrabold text-blue-400">
                  {withholdingTaxDue.toLocaleString()} {companySettings.currency}
                </p>
                <p className="text-[11px] text-slate-400">محتجزة لحساب الموردين والمقاولين</p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-2">
                <span className="text-xs text-slate-400 font-medium">تقدير ضريبة أرباح الشركات (22.5%):</span>
                <p className="text-2xl font-extrabold text-purple-400">
                  {netProfit > 0 ? (netProfit * 0.225).toLocaleString() : 0} {companySettings.currency}
                </p>
                <p className="text-[11px] text-slate-400">محسوبة بناءً على صافي أرباح قائمة الدخل</p>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
