import React, { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Printer,
  Download,
  Edit2,
  Trash2,
  Calendar,
  AlertTriangle,
  BarChart3,
  Building2,
  DollarSign,
  FileText,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Settings2,
  Tag,
  X,
  Eye,
  Grid,
} from "lucide-react";
import { CompanySettings, CostCenter, FilterParams, SiteAdjustment } from "../types";
import { exportToExcel, printReport } from "../utils/export";
import { numberToArabicWords } from "../utils/numberToArabicWords";

interface SiteAdjustmentsViewProps {
  siteAdjustments: SiteAdjustment[];
  siteOrientations: string[];
  onAddAdjustment: (adj: Omit<SiteAdjustment, "id" | "createdAt">) => void;
  onUpdateAdjustment: (adj: SiteAdjustment) => void;
  onDeleteAdjustment: (id: string) => void;
  onAddOrientation: (orientation: string) => void;
  onDeleteOrientation: (orientation: string) => void;
  costCenters: CostCenter[];
  companySettings: CompanySettings;
  filterParams: FilterParams;
}

const MONTH_NAMES: { [key: string]: string } = {
  "01": "يناير (شهر 1)",
  "02": "فبراير (شهر 2)",
  "03": "مارس (شهر 3)",
  "04": "أبريل (شهر 4)",
  "05": "مايو (شهر 5)",
  "06": "يونيو (شهر 6)",
  "07": "يوليو (شهر 7)",
  "08": "أغسطس (شهر 8)",
  "09": "سبتمبر (شهر 9)",
  "10": "أكتوبر (شهر 10)",
  "11": "نوفمبر (شهر 11)",
  "12": "ديسمبر (شهر 12)",
};

const SHORT_MONTH_NAMES: { [key: string]: string } = {
  "01": "يناير",
  "02": "فبراير",
  "03": "مارس",
  "04": "أبريل",
  "05": "مايو",
  "06": "يونيو",
  "07": "يوليو",
  "08": "أغسطس",
  "09": "سبتمبر",
  "10": "أكتوبر",
  "11": "نوفمبر",
  "12": "ديسمبر",
};

export const SiteAdjustmentsView: React.FC<SiteAdjustmentsViewProps> = ({
  siteAdjustments,
  siteOrientations,
  onAddAdjustment,
  onUpdateAdjustment,
  onDeleteAdjustment,
  onAddOrientation,
  onDeleteOrientation,
  costCenters,
  companySettings,
  filterParams,
}) => {
  // Navigation View Modes: 'sheet' | 'orientations_matrix' | 'analysis'
  const [activeViewMode, setActiveViewMode] = useState<
    "sheet" | "orientations_matrix" | "analysis"
  >("sheet");

  // Filter States
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedOrientation, setSelectedOrientation] = useState<string>("ALL");
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Adjustment Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingAdj, setEditingAdj] = useState<SiteAdjustment | null>(null);

  // Orientations Modal & Addition State
  const [showOrientationsModal, setShowOrientationsModal] = useState<boolean>(false);
  const [newOrientationName, setNewOrientationName] = useState<string>("");
  const [deleteConfirmOrientation, setDeleteConfirmOrientation] = useState<string | null>(null);

  // Adjustment Deletion Confirmation Modal
  const [deleteConfirmAdj, setDeleteConfirmAdj] = useState<SiteAdjustment | null>(null);

  // Cell Drilldown Modal for Matrix View
  const [drilldownCell, setDrilldownCell] = useState<{
    monthKey: string;
    monthName: string;
    orientation: string;
    items: SiteAdjustment[];
  } | null>(null);

  // Form Fields for Add/Edit Site Adjustment
  const [formData, setFormData] = useState({
    month: "01",
    year: "2026",
    date: new Date().toISOString().split("T")[0],
    orientation: siteOrientations[0] || "تسوية عهدة الموقع",
    customOrientation: "",
    statement: "",
    amount: "",
    costCenterId: costCenters[0]?.id || "",
    reasonForVariance: "",
    notes: "",
  });

  // Dynamic Detail Line Items for Site Adjustment (مع تاريخ لكل بند)
  const [detailItems, setDetailItems] = useState<
    { id: string; date: string; statement: string; amount: string }[]
  >([{ id: "1", date: new Date().toISOString().split("T")[0], statement: "", amount: "" }]);

  const handleAddDetailItem = () => {
    setDetailItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        date: formData.date || new Date().toISOString().split("T")[0],
        statement: "",
        amount: "",
      },
    ]);
  };

  const handleRemoveDetailItem = (index: number) => {
    setDetailItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateDetailItem = (
    index: number,
    field: "date" | "statement" | "amount",
    value: string
  ) => {
    setDetailItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const computedDetailTotal = useMemo(() => {
    return detailItems.reduce(
      (sum, item) => sum + (parseFloat(item.amount) || 0),
      0
    );
  }, [detailItems]);

  // Combine orientations list with any custom orientation from existing adjustments
  const allOrientations = useMemo(() => {
    const set = new Set<string>(siteOrientations);
    siteAdjustments.forEach((adj) => {
      if (adj.orientation && adj.orientation.trim()) {
        set.add(adj.orientation.trim());
      }
    });
    return Array.from(set);
  }, [siteOrientations, siteAdjustments]);

  // Available Years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    siteAdjustments.forEach((adj) => {
      if (adj.year) yearsSet.add(adj.year);
    });
    yearsSet.add("2026");
    return Array.from(yearsSet).sort().reverse();
  }, [siteAdjustments]);

  // Filtered Site Adjustments for main log sheet
  const filteredAdjustments = useMemo(() => {
    return siteAdjustments
      .filter((adj) => {
        // Year match
        if (selectedYear !== "ALL" && adj.year !== selectedYear) return false;

        // Month match
        if (selectedMonth !== "ALL" && adj.month !== selectedMonth) return false;

        // Orientation match
        if (selectedOrientation !== "ALL" && adj.orientation !== selectedOrientation) return false;

        // Cost center match
        if (selectedCostCenter !== "ALL" && adj.costCenterId !== selectedCostCenter) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchStatement = adj.statement.toLowerCase().includes(q);
          const matchOrientation = adj.orientation.toLowerCase().includes(q);
          const matchNotes = (adj.notes || "").toLowerCase().includes(q);
          const matchReason = (adj.reasonForVariance || "").toLowerCase().includes(q);
          if (!matchStatement && !matchOrientation && !matchNotes && !matchReason) return false;
        }

        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [siteAdjustments, selectedYear, selectedMonth, selectedOrientation, selectedCostCenter, searchQuery]);

  // Total summary calculations
  const totalAmount = useMemo(() => {
    return filteredAdjustments.reduce((sum, adj) => sum + adj.amount, 0);
  }, [filteredAdjustments]);

  const avgMonthlyAmount = useMemo(() => {
    const monthsSet = new Set(filteredAdjustments.map((a) => `${a.year}-${a.month}`));
    if (monthsSet.size === 0) return 0;
    return totalAmount / monthsSet.size;
  }, [filteredAdjustments, totalAmount]);

  // Handle Add/Edit Site Adjustment Modal
  const handleOpenAddModal = () => {
    const today = new Date().toISOString().split("T")[0];
    setEditingAdj(null);
    setDetailItems([{ id: "1", date: today, statement: "", amount: "" }]);
    setFormData({
      month: selectedMonth !== "ALL" ? selectedMonth : "01",
      year: selectedYear !== "ALL" ? selectedYear : "2026",
      date: today,
      orientation: allOrientations[0] || "تسوية عامة",
      customOrientation: "",
      statement: "",
      amount: "",
      costCenterId: costCenters[0]?.id || "",
      reasonForVariance: "",
      notes: "",
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (adj: SiteAdjustment) => {
    setEditingAdj(adj);
    const existsInList = allOrientations.includes(adj.orientation);

    if (adj.items && adj.items.length > 0) {
      setDetailItems(
        adj.items.map((it, i) => ({
          id: it.id || i.toString(),
          date: it.date || adj.date || new Date().toISOString().split("T")[0],
          statement: it.statement,
          amount: it.amount.toString(),
        }))
      );
    } else {
      setDetailItems([
        { id: "1", date: adj.date || new Date().toISOString().split("T")[0], statement: adj.statement, amount: adj.amount.toString() },
      ]);
    }

    // Clean up summary statement if it was an auto-generated bullet list
    const isBulletedStatement = adj.statement.startsWith("•") || adj.statement.includes("\n•");
    const cleanedStatement = isBulletedStatement ? "" : adj.statement;

    setFormData({
      month: adj.month,
      year: adj.year,
      date: adj.date,
      orientation: existsInList ? adj.orientation : "تسوية أخرى",
      customOrientation: existsInList ? "" : adj.orientation,
      statement: cleanedStatement,
      amount: adj.amount.toString(),
      costCenterId: adj.costCenterId || "",
      reasonForVariance: adj.reasonForVariance || "",
      notes: adj.notes || "",
    });
    setShowModal(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    const finalOrientation =
      formData.orientation === "تسوية أخرى"
        ? formData.customOrientation || "تسوية أخرى"
        : formData.orientation;

    // Filter valid detail items (مع حفظ التاريخ لكل بند)
    const validItems = detailItems
      .filter((i) => i.statement.trim() || (parseFloat(i.amount) || 0) > 0)
      .map((i) => ({
        id: i.id,
        date: i.date || formData.date,
        statement: i.statement.trim() || "بند تفصيلي",
        amount: parseFloat(i.amount) || 0,
      }));

    let finalAmount = computedDetailTotal;
    if (validItems.length === 0 || computedDetailTotal <= 0) {
      finalAmount = parseFloat(formData.amount);
    }

    if (isNaN(finalAmount) || finalAmount <= 0) {
      alert("يرجى إدخال قيم ومبالغ صحيحة للبسط والبنود التفصيلية للتسوية");
      return;
    }

    // Build concise, clean statement once (بدون تكرار أو حشو)
    let finalStatement = formData.statement.trim();
    if (!finalStatement) {
      if (validItems.length === 1) {
        finalStatement = validItems[0].statement;
      } else if (validItems.length > 1) {
        finalStatement = validItems.map((it) => it.statement).join(" + ");
      } else {
        finalStatement = "تسوية موقع";
      }
    }

    if (!finalStatement) {
      alert("يرجى إدخال بيان التسوية التفصيلي أو إضافة بنود بيان لها قيم");
      return;
    }

    // Automatically extract month and year from date
    const dateParts = formData.date.split("-");
    const extractedYear = dateParts[0] || formData.year;
    const extractedMonth = dateParts[1] || formData.month;

    if (editingAdj) {
      onUpdateAdjustment({
        ...editingAdj,
        month: extractedMonth,
        year: extractedYear,
        date: formData.date,
        orientation: finalOrientation,
        statement: finalStatement,
        amount: finalAmount,
        costCenterId: formData.costCenterId,
        reasonForVariance: formData.reasonForVariance,
        notes: formData.notes,
        items: validItems.length > 0 ? validItems : undefined,
      });
    } else {
      onAddAdjustment({
        month: extractedMonth,
        year: extractedYear,
        date: formData.date,
        orientation: finalOrientation,
        statement: finalStatement,
        amount: finalAmount,
        costCenterId: formData.costCenterId,
        reasonForVariance: formData.reasonForVariance,
        notes: formData.notes,
        items: validItems.length > 0 ? validItems : undefined,
      });
    }

    setShowModal(false);
  };

  // Orientation Addition Handler
  const handleAddNewOrientation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrientationName.trim()) return;
    onAddOrientation(newOrientationName.trim());
    setNewOrientationName("");
  };

  // Orientation Deletion Confirmation Handler
  const handleConfirmDeleteOrientation = () => {
    if (!deleteConfirmOrientation) return;
    onDeleteOrientation(deleteConfirmOrientation);
    setDeleteConfirmOrientation(null);
  };

  // Site Adjustment Deletion Handler
  const handleConfirmDeleteAdjustment = () => {
    if (!deleteConfirmAdj) return;
    onDeleteAdjustment(deleteConfirmAdj.id);
    setDeleteConfirmAdj(null);
  };

  // Matrix Sheet Calculations (تكلفة كل توجيه في كل شهر لوحده)
  const matrixData = useMemo(() => {
    // Filter adjustments for the chosen year and cost center
    const yearAdjs = siteAdjustments.filter((adj) => {
      if (selectedYear !== "ALL" && adj.year !== selectedYear) return false;
      if (selectedCostCenter !== "ALL" && adj.costCenterId !== selectedCostCenter) return false;
      return true;
    });

    const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

    // Initialize map for each orientation
    const orientationRows: {
      [orientationName: string]: {
        monthTotals: { [monthKey: string]: number };
        monthItems: { [monthKey: string]: SiteAdjustment[] };
        rowTotal: number;
      };
    } = {};

    allOrientations.forEach((orient) => {
      const monthTotalsMap: { [monthKey: string]: number } = {};
      const monthItemsMap: { [monthKey: string]: SiteAdjustment[] } = {};
      months.forEach((m) => {
        monthTotalsMap[m] = 0;
        monthItemsMap[m] = [];
      });
      orientationRows[orient] = {
        monthTotals: monthTotalsMap,
        monthItems: monthItemsMap,
        rowTotal: 0,
      };
    });

    // Populate data
    yearAdjs.forEach((adj) => {
      const orient = adj.orientation || "غير محدد";
      const mStr = adj.month.padStart(2, "0");

      if (!orientationRows[orient]) {
        const monthTotalsMap: { [monthKey: string]: number } = {};
        const monthItemsMap: { [monthKey: string]: SiteAdjustment[] } = {};
        months.forEach((m) => {
          monthTotalsMap[m] = 0;
          monthItemsMap[m] = [];
        });
        orientationRows[orient] = {
          monthTotals: monthTotalsMap,
          monthItems: monthItemsMap,
          rowTotal: 0,
        };
      }

      if (orientationRows[orient].monthTotals[mStr] !== undefined) {
        orientationRows[orient].monthTotals[mStr] += adj.amount;
        orientationRows[orient].monthItems[mStr].push(adj);
        orientationRows[orient].rowTotal += adj.amount;
      }
    });

    // Column Totals across all orientations
    const colTotals: { [monthKey: string]: number } = {};
    months.forEach((m) => {
      colTotals[m] = 0;
    });

    let grandTotal = 0;

    Object.values(orientationRows).forEach((row) => {
      months.forEach((m) => {
        colTotals[m] += row.monthTotals[m];
      });
      grandTotal += row.rowTotal;
    });

    // Filter rows if search query exists or selected orientation
    const rowsList = Object.entries(orientationRows)
      .map(([orient, rowData]) => ({
        orientation: orient,
        ...rowData,
      }))
      .filter((row) => {
        if (selectedOrientation !== "ALL" && row.orientation !== selectedOrientation) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return row.orientation.toLowerCase().includes(q);
        }
        return true;
      });

    return {
      months,
      rowsList,
      colTotals,
      grandTotal,
    };
  }, [siteAdjustments, allOrientations, selectedYear, selectedCostCenter, selectedOrientation, searchQuery]);

  // Monthly comparative analysis logic
  const monthlyAnalysis = useMemo(() => {
    const yearAdjs = siteAdjustments.filter((adj) => adj.year === selectedYear);

    const monthGroup: { [monthKey: string]: { month: string; total: number; items: SiteAdjustment[] } } = {};

    for (let m = 1; m <= 12; m++) {
      const monthStr = m.toString().padStart(2, "0");
      monthGroup[monthStr] = {
        month: monthStr,
        total: 0,
        items: [],
      };
    }

    yearAdjs.forEach((adj) => {
      const mStr = adj.month.padStart(2, "0");
      if (monthGroup[mStr]) {
        monthGroup[mStr].total += adj.amount;
        monthGroup[mStr].items.push(adj);
      }
    });

    const activeMonths = Object.keys(monthGroup)
      .sort()
      .filter((m) => monthGroup[m].total > 0 || monthGroup[m].items.length > 0);

    let maxMonthVal = 0;
    activeMonths.forEach((m) => {
      if (monthGroup[m].total > maxMonthVal) maxMonthVal = monthGroup[m].total;
    });

    const comparisonList = activeMonths.map((mStr, idx) => {
      const current = monthGroup[mStr];
      const prevMonthStr = idx > 0 ? activeMonths[idx - 1] : null;
      const prevTotal = prevMonthStr ? monthGroup[prevMonthStr].total : 0;

      const diff = current.total - prevTotal;
      const pctChange = prevTotal > 0 ? (diff / prevTotal) * 100 : idx === 0 ? 0 : 100;

      const orientationTotals: { [orient: string]: number } = {};
      current.items.forEach((item) => {
        orientationTotals[item.orientation] = (orientationTotals[item.orientation] || 0) + item.amount;
      });

      let topOrient = "";
      let topOrientVal = 0;
      Object.entries(orientationTotals).forEach(([orient, val]) => {
        if (val > topOrientVal) {
          topOrientVal = val;
          topOrient = orient;
        }
      });

      const reasonsList = current.items
        .map((i) => i.reasonForVariance)
        .filter((r): r is string => Boolean(r && r.trim()));

      return {
        monthKey: mStr,
        monthName: MONTH_NAMES[mStr] || `شهر ${mStr}`,
        total: current.total,
        count: current.items.length,
        prevTotal,
        diff,
        pctChange,
        topOrientation: topOrient,
        topOrientationAmount: topOrientVal,
        reasons: Array.from(new Set(reasonsList)),
        percentageOfMax: maxMonthVal > 0 ? (current.total / maxMonthVal) * 100 : 0,
      };
    });

    return {
      comparisonList,
      maxMonthVal,
      grandYearTotal: yearAdjs.reduce((s, a) => s + a.amount, 0),
    };
  }, [siteAdjustments, selectedYear]);

  // Export & Print handlers for main log
  const handleExportExcel = () => {
    if (activeViewMode === "orientations_matrix") {
      // Export Matrix Sheet
      const exportData = matrixData.rowsList.map((row, idx) => {
        const itemObj: { [key: string]: any } = {
          "م": idx + 1,
          "التوجيه / بند المصروف": row.orientation,
        };
        matrixData.months.forEach((mKey) => {
          itemObj[SHORT_MONTH_NAMES[mKey] || mKey] = row.monthTotals[mKey] || 0;
        });
        itemObj["إجمالي التوجيه السنوي"] = row.rowTotal;
        return itemObj;
      });

      // Add Total Row
      const totalRow: { [key: string]: any } = {
        "م": "الإجمالي",
        "التوجيه / بند المصروف": "إجمالي جميع التوجيهات",
      };
      matrixData.months.forEach((mKey) => {
        totalRow[SHORT_MONTH_NAMES[mKey] || mKey] = matrixData.colTotals[mKey] || 0;
      });
      totalRow["إجمالي التوجيه السنوي"] = matrixData.grandTotal;
      exportData.push(totalRow);

      exportToExcel(exportData, `شيت_تكلفة_التوجيهات_حسب_الشهور_${selectedYear}`);
    } else {
      // Export Log Sheet
      const exportData = filteredAdjustments.map((adj, idx) => {
        const cc = costCenters.find((c) => c.id === adj.costCenterId);
        const detailedItemsText = adj.items && adj.items.length > 0
          ? adj.items.map((it, i) => `${i + 1}) [${it.date || adj.date}] ${it.statement}`).join(" | ")
          : adj.statement;
        const detailedValuesText = adj.items && adj.items.length > 0
          ? adj.items.map((it, i) => `${i + 1}) ${it.amount} ${companySettings.currency}`).join(" | ")
          : `${adj.amount} ${companySettings.currency}`;

        return {
          "م": idx + 1,
          "السنة": adj.year,
          "الشهر": MONTH_NAMES[adj.month] || adj.month,
          "التاريخ": adj.date,
          "التوجيه": adj.orientation,
          "البيان وبنود التسوية": detailedItemsText,
          "القيمة لكل بند": detailedValuesText,
          "إجمالي التسوية (ج.م)": adj.amount,
          "مركز التكلفة": cc ? cc.name : "عام",
          "سبب الزيادة/النقص": adj.reasonForVariance || "-",
          "ملاحظات": adj.notes || "-",
        };
      });

      exportToExcel(exportData, `شيت_تسويات_الموقع_${selectedYear}_${selectedMonth}`);
    }
  };

  const handlePrintSingleAdjustment = (adj: SiteAdjustment) => {
    const cc = costCenters.find((c) => c.id === adj.costCenterId);
    const amountInWords = numberToArabicWords(
      adj.amount,
      companySettings.currency === "ج.م" || companySettings.currency === "EGP" ? "جنيه مصري" : companySettings.currency
    );

    const itemsRows =
      adj.items && adj.items.length > 0
        ? adj.items
            .map(
              (it, i) => `
          <tr>
            <td style="text-align: center; font-weight: bold; padding: 8px; border: 1px solid #cbd5e1;">${i + 1}</td>
            <td style="text-align: center; font-family: monospace; padding: 8px; border: 1px solid #cbd5e1; color: #475569; font-size: 11px;">${it.date || adj.date}</td>
            <td style="text-align: right; font-weight: 600; padding: 8px; border: 1px solid #cbd5e1; color: #1e293b;">${it.statement}</td>
            <td style="text-align: left; font-weight: bold; color: #b45309; dir: ltr; padding: 8px; border: 1px solid #cbd5e1;">${it.amount.toLocaleString()} ${companySettings.currency}</td>
          </tr>
        `
            )
            .join("")
        : `
          <tr>
            <td style="text-align: center; font-weight: bold; padding: 8px; border: 1px solid #cbd5e1;">1</td>
            <td style="text-align: center; font-family: monospace; padding: 8px; border: 1px solid #cbd5e1; color: #475569; font-size: 11px;">${adj.date}</td>
            <td style="text-align: right; font-weight: 600; padding: 8px; border: 1px solid #cbd5e1; color: #1e293b;">${adj.statement}</td>
            <td style="text-align: left; font-weight: bold; color: #b45309; dir: ltr; padding: 8px; border: 1px solid #cbd5e1;">${adj.amount.toLocaleString()} ${companySettings.currency}</td>
          </tr>
        `;

    const html = `
      <div style="border: 2px solid #0f172a; padding: 24px; border-radius: 8px; max-width: 850px; margin: 0 auto;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e3a8a; padding-bottom: 14px; margin-bottom: 18px;">
          <div>
            <h2 style="margin: 0 0 6px 0; color: #1e3a8a; font-size: 20px;">سند تسوية موقع معتمد (Site Settlement Voucher)</h2>
            <p style="margin: 2px 0; font-size: 13px; color: #475569;">
              التوجيه المالي: <strong style="color: #0f172a;">${adj.orientation}</strong> 
              ${cc ? `| مركز التكلفة: <strong style="color: #1e3a8a;">${cc.name}</strong>` : ""}
            </p>
          </div>
          <div style="text-align: left; font-size: 12px; color: #475569;">
            <p style="margin: 2px 0;"><strong>التاريخ:</strong> ${adj.date}</p>
            <p style="margin: 2px 0;"><strong>الشهر المالي:</strong> ${MONTH_NAMES[adj.month] || adj.month} ${adj.year}</p>
          </div>
        </div>

        ${
          adj.statement &&
          !adj.statement.startsWith("•") &&
          (!adj.items ||
            (adj.items.length > 1 &&
              adj.statement !== adj.items.map((i) => i.statement).join(" + ") &&
              adj.statement !== adj.items[0]?.statement))
            ? `
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 13px;">
            <strong style="color: #0f172a;">البيان العام للتسوية: </strong> ${adj.statement}
          </div>
        `
            : ""
        }

        <h3 style="font-size: 14px; color: #0f172a; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
          كشف بنود وتفاصيل التسوية وتاريخ وقيمة كل بند:
        </h3>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px;">
          <thead>
            <tr style="background: #1e3a8a; color: white;">
              <th style="padding: 8px; border: 1px solid #cbd5e1; width: 35px; text-align: center;">#</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; width: 95px; text-align: center;">تاريخ البند</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">البيان والتفاصيل للبند</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; width: 140px; text-align: left; dir: ltr;">القيمة لكل بند</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: bold; font-size: 13px;">
              <td colspan="3" style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">إجمالي قيمة التسوية:</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; color: #b45309; dir: ltr; font-size: 14px; font-weight: 800;">
                ${adj.amount.toLocaleString()} ${companySettings.currency}
              </td>
            </tr>
          </tfoot>
        </table>

        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 13px; color: #92400e;">
          <strong>المبلغ بالحروف: </strong> فقط ${amountInWords} لا غير.
        </div>

        ${
          adj.reasonForVariance
            ? `
          <div style="margin-bottom: 12px; font-size: 12px; color: #475569;">
            <strong>سبب الزيادة / النقص (التحليل): </strong> ${adj.reasonForVariance}
          </div>
        `
            : ""
        }

        ${
          adj.notes
            ? `
          <div style="margin-bottom: 16px; font-size: 12px; color: #475569;">
            <strong>ملاحظات / المستندات: </strong> ${adj.notes}
          </div>
        `
            : ""
        }

        <div style="display: flex; justify-content: space-between; margin-top: 40px; text-align: center; font-size: 12px;">
          <div>
            <p><strong>إعداد / مهندس الموقع</strong></p>
            <p style="margin-top: 35px;">................................</p>
          </div>
          <div>
            <p><strong>المراجع المالي / المحاسب</strong></p>
            <p style="margin-top: 35px;">................................</p>
          </div>
          <div>
            <p><strong>اعتماد الإدارة المالية</strong></p>
            <p style="margin-top: 35px;">................................</p>
          </div>
        </div>
      </div>
    `;

    printReport(`سند_تسوية_${adj.orientation}_${adj.date}`, html, companySettings);
  };

  const handlePrint = () => {
    if (activeViewMode === "orientations_matrix") {
      // Print Matrix
      const monthsHeaders = matrixData.months
        .map((m) => `<th style="width: 60px; text-align: center;">${SHORT_MONTH_NAMES[m]}</th>`)
        .join("");

      const rowsHtml = matrixData.rowsList
        .map(
          (row, idx) => `
        <tr>
          <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="font-weight: bold; text-align: right;">${row.orientation}</td>
          ${matrixData.months
            .map(
              (m) =>
                `<td style="text-align: center; ${
                  row.monthTotals[m] > 0 ? "font-weight: bold; color: #b45309;" : "color: #94a3b8;"
                }">${row.monthTotals[m] > 0 ? row.monthTotals[m].toLocaleString() : "-"}</td>`
            )
            .join("")}
          <td style="text-align: center; font-weight: bold; color: #1e3a8a; background: #f1f5f9;">${row.rowTotal.toLocaleString()} ${companySettings.currency}</td>
        </tr>
      `
        )
        .join("");

      const footerHtml = `
        <tr style="background: #e2e8f0; font-weight: bold;">
          <td colSpan="2" style="text-align: right;">إجمالي الشهور (كافة التوجيهات):</td>
          ${matrixData.months
            .map(
              (m) =>
                `<td style="text-align: center; color: #1e3a8a;">${matrixData.colTotals[m].toLocaleString()}</td>`
            )
            .join("")}
          <td style="text-align: center; color: #0f172a; font-size: 13px;">${matrixData.grandTotal.toLocaleString()} ${companySettings.currency}</td>
        </tr>
      `;

      printReport(
        `شيت تكلفة كل توجيه لكل شهر - لسنة ${selectedYear}`,
        `
          <div style="margin-bottom: 12px; font-size: 11px; color: #475569;">
            جدول مصفوفة تفكيك تكلفة كل توجيه بنود التسويات الميدانية حسب الشهور لوحدها
          </div>
          <table style="font-size: 10px;">
            <thead>
              <tr>
                <th style="width: 30px;">م</th>
                <th>التوجيه / بند المصروف</th>
                ${monthsHeaders}
                <th style="width: 90px;">إجمالي التوجيه</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              ${footerHtml}
            </tbody>
          </table>
        `,
        companySettings
      );
    } else {
      // Print Detailed Log with itemized breakdown per item (البيان في خلية، القيمة لكل بند في خلية، والإجمالي في خلية)
      const rowsHtml = filteredAdjustments
        .map((adj, idx) => {
          const cc = costCenters.find((c) => c.id === adj.costCenterId);

          let statementCellHtml = "";
          let itemValuesCellHtml = "";

          if (adj.items && adj.items.length > 0) {
            statementCellHtml = `
              <div style="display: flex; flex-direction: column; gap: 3px;">
                ${adj.items
                  .map(
                    (it, i) => `
                  <div style="display: flex; align-items: baseline; gap: 4px; font-size: 11px; padding: 2px 0; border-bottom: ${
                    i < adj.items.length - 1 ? "1px dashed #e2e8f0" : "none"
                  };">
                    <span style="color: #64748b; font-size: 10px; font-family: monospace; white-space: nowrap;">[${it.date || adj.date}]</span>
                    <span style="font-weight: 600; color: #1e293b;"><strong style="color: #1e3a8a;">${i + 1}.</strong> ${it.statement}</span>
                  </div>
                `
                  )
                  .join("")}
              </div>
            `;

            itemValuesCellHtml = `
              <div style="display: flex; flex-direction: column; gap: 3px;">
                ${adj.items
                  .map(
                    (it, i) => `
                  <div style="font-size: 11px; font-weight: 700; color: #b45309; padding: 2px 0; border-bottom: ${
                    i < adj.items.length - 1 ? "1px dashed #e2e8f0" : "none"
                  }; white-space: nowrap; text-align: left; dir: ltr;">
                    ${it.amount.toLocaleString()} ${companySettings.currency}
                  </div>
                `
                  )
                  .join("")}
              </div>
            `;
          } else {
            statementCellHtml = `<div style="font-weight: 600; color: #1e293b; font-size: 11px;">${adj.statement}</div>`;
            itemValuesCellHtml = `<div style="font-size: 11px; font-weight: 700; color: #b45309; white-space: nowrap; text-align: left; dir: ltr;">${adj.amount.toLocaleString()} ${companySettings.currency}</div>`;
          }

          if (adj.notes) {
            statementCellHtml += `<div style="font-size: 10px; color: #64748b; margin-top: 4px; border-top: 1px dotted #cbd5e1; padding-top: 2px;"><strong>ملاحظات:</strong> ${adj.notes}</div>`;
          }

          const ccLabel = cc
            ? `<div style="font-size: 10px; color: #1e3a8a; font-weight: normal; margin-top: 2px;">مركز التكلفة: ${cc.name}</div>`
            : "";

          return `
            <tr>
              <td style="text-align: center; font-weight: bold; vertical-align: top; padding: 6px;">${idx + 1}</td>
              <td style="text-align: center; vertical-align: top; white-space: nowrap; font-family: monospace; font-size: 11px; padding: 6px;">${adj.date}</td>
              <td style="text-align: center; font-weight: bold; color: #1e3a8a; vertical-align: top; white-space: nowrap; font-size: 11px; padding: 6px;">${MONTH_NAMES[adj.month] || adj.month}</td>
              <td style="font-weight: bold; vertical-align: top; padding: 6px;">
                <div>${adj.orientation}</div>
                ${ccLabel}
              </td>
              <td style="vertical-align: top; padding: 6px 8px;">${statementCellHtml}</td>
              <td style="vertical-align: top; padding: 6px 8px; text-align: left; dir: ltr;">${itemValuesCellHtml}</td>
              <td style="text-align: left; font-weight: bold; color: #0f172a; dir: ltr; vertical-align: middle; white-space: nowrap; font-size: 13px; background: #f8fafc; padding: 6px 8px; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1;">
                ${adj.amount.toLocaleString()} ${companySettings.currency}
              </td>
              <td style="vertical-align: top; font-size: 11px; padding: 6px;">${adj.reasonForVariance || "-"}</td>
            </tr>
          `;
        })
        .join("");

      const reportTitle = `شيت تسويات الموقع التفصيلي - لسنة ${selectedYear} ${selectedMonth !== "ALL" ? `(${MONTH_NAMES[selectedMonth]})` : "جميع الشهور"}`;

      const htmlContent = `
        <div style="margin-bottom: 15px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 15px; font-size: 12px; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #cbd5e1;">
          <div><strong>إجمالي قيمة التسويات:</strong> <span style="color: #b45309; font-weight: bold; font-size: 13px;">${totalAmount.toLocaleString()} ${companySettings.currency}</span></div>
          <div><strong>عدد العمليات:</strong> <span style="font-weight: bold;">${filteredAdjustments.length}</span> عملية تسوية</div>
          <div><strong>متوسط التسويات الشهرية:</strong> <span style="font-weight: bold;">${Math.round(avgMonthlyAmount).toLocaleString()} ${companySettings.currency}</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">م</th>
              <th style="width: 80px; text-align: center;">التاريخ</th>
              <th style="width: 70px; text-align: center;">الشهر</th>
              <th style="width: 125px; text-align: right;">التوجيه / مركز التكلفة</th>
              <th style="text-align: right;">البيان / بنود التسوية</th>
              <th style="width: 110px; text-align: center;">القيمة لكل بند</th>
              <th style="width: 115px; text-align: center;">إجمالي التسوية</th>
              <th style="width: 125px; text-align: right;">سبب التغير / ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: bold; font-size: 13px;">
              <td colspan="5" style="text-align: right; padding: 10px;">إجمالي كافة تسويات الموقع المعروضة:</td>
              <td colspan="2" style="text-align: left; color: #b45309; dir: ltr; padding: 10px; font-size: 14px; font-weight: 800;">
                ${totalAmount.toLocaleString()} ${companySettings.currency}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 40px; text-align: center; font-size: 12px;">
          <div>
            <p><strong>إعداد وتدقيق مهندس الموقع</strong></p>
            <p style="margin-top: 35px;">................................</p>
          </div>
          <div>
            <p><strong>المراجع المالي / المحاسب</strong></p>
            <p style="margin-top: 35px;">................................</p>
          </div>
          <div>
            <p><strong>اعتماد الإدارة المالية</strong></p>
            <p style="margin-top: 35px;">................................</p>
          </div>
        </div>
      `;

      printReport(reportTitle, htmlContent, companySettings);
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#11141B] p-5 rounded-2xl border border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>تسويات الموقع الميدانية</span>
              <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-normal">
                القائمة التنفيذية
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              متابعة تسويات الموقع، تفكيك تكلفة كل توجيه بكل شهر، إدارة التوجيهات، وتحليل تغير التكاليف
            </p>
          </div>
        </div>

        {/* View Switcher Tabs & Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Tabs */}
          <div className="bg-[#1A1F26] p-1 rounded-xl border border-gray-800 flex items-center flex-wrap gap-1">
            <button
              onClick={() => setActiveViewMode("sheet")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeViewMode === "sheet"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>جدول التسويات</span>
            </button>

            <button
              onClick={() => setActiveViewMode("orientations_matrix")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeViewMode === "orientations_matrix"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>تكلفة التوجيهات بالشهور</span>
            </button>

            <button
              onClick={() => setActiveViewMode("analysis")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeViewMode === "analysis"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>تحليل التغير والفرق</span>
            </button>
          </div>

          {/* Manage Orientations Button */}
          <button
            onClick={() => setShowOrientationsModal(true)}
            className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition"
            title="إضافة أو حذف توجيهات الإنفاق"
          >
            <Settings2 className="w-4 h-4" />
            <span>إدارة التوجيهات</span>
          </button>

          {/* Export */}
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition"
          >
            <Download className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة</span>
          </button>

          {/* Add Adjustment */}
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/10 transition"
          >
            <Plus className="w-4 h-4" />
            <span>تسوية جديدة</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#11141B] p-4 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium">إجمالي التسويات الحالية</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 dir-ltr text-right">
            {(activeViewMode === "orientations_matrix"
              ? matrixData.grandTotal
              : totalAmount
            ).toLocaleString()}{" "}
            {companySettings.currency}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {selectedMonth !== "ALL" && activeViewMode === "sheet"
              ? `لشهر ${MONTH_NAMES[selectedMonth]}`
              : `لسنة ${selectedYear}`}
          </p>
        </div>

        <div className="bg-[#11141B] p-4 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium">عدد التوجيهات النشطة</span>
            <Tag className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {allOrientations.length} <span className="text-xs font-normal text-gray-400">توجيه إنفاق</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">يمكنك إضافة أو حذف توجيه في أي وقت</p>
        </div>

        <div className="bg-[#11141B] p-4 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium">عدد التسويات المقيدة</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {filteredAdjustments.length} <span className="text-xs font-normal text-gray-400">عملية</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">مع تفعيل إمكانية الحذف والتعديل المباشر</p>
        </div>

        <div className="bg-[#11141B] p-4 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium">متوسط التسويات الشهرية</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 dir-ltr text-right">
            {Math.round(
              activeViewMode === "orientations_matrix"
                ? matrixData.grandTotal / 12
                : avgMonthlyAmount
            ).toLocaleString()}{" "}
            {companySettings.currency}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">متوسط إنفاق الموقع الشهري</p>
        </div>
      </div>

      {/* Main Content Area */}

      {/* VIEW MODE 1: Detailed Adjustments Log Sheet */}
      {activeViewMode === "sheet" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-[#11141B] p-4 rounded-xl border border-gray-800 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Filter className="w-4 h-4 text-amber-400" />
                <span>أدوات البحث والفلترة بالشهور والسنة والتوجيه</span>
              </div>
              {(selectedYear !== "2026" ||
                selectedMonth !== "ALL" ||
                selectedOrientation !== "ALL" ||
                selectedCostCenter !== "ALL" ||
                searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedYear("2026");
                    setSelectedMonth("ALL");
                    setSelectedOrientation("ALL");
                    setSelectedCostCenter("ALL");
                    setSearchQuery("");
                  }}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  إعادة ضبط الفلاتر
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Year */}
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">السنة المالية</label>

                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-2.5" />
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full bg-[#1A1F26] border border-gray-700 rounded-lg pr-8 pl-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">جميع السنين</option>
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        سنة {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Month */}
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">الشهر</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-[#1A1F26] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">جميع الشهور (1 - 12)</option>
                  {Object.entries(MONTH_NAMES).map(([mKey, mName]) => (
                    <option key={mKey} value={mKey}>
                      {mName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Orientation */}
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">التوجيه / بند المصروف</label>
                <select
                  value={selectedOrientation}
                  onChange={(e) => setSelectedOrientation(e.target.value)}
                  className="w-full bg-[#1A1F26] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 truncate"
                >
                  <option value="ALL">جميع التوجيهات ({allOrientations.length})</option>
                  {allOrientations.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cost Center */}
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">مركز التكلفة / المشروع</label>
                <select
                  value={selectedCostCenter}
                  onChange={(e) => setSelectedCostCenter(e.target.value)}
                  className="w-full bg-[#1A1F26] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 truncate"
                >
                  <option value="ALL">جميع مراكز التكلفة</option>
                  {costCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Query */}
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">بحث نصي</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث في البيان والملاحظات..."
                    className="w-full bg-[#1A1F26] border border-gray-700 rounded-lg pr-8 pl-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Adjustments Table */}
          <div className="bg-[#11141B] rounded-xl border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-gray-300">
                <thead className="bg-[#1A1F26] text-gray-400 border-b border-gray-800 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">م</th>
                    <th className="px-4 py-3 whitespace-nowrap">الشهر</th>
                    <th className="px-4 py-3 whitespace-nowrap">التاريخ</th>
                    <th className="px-4 py-3 whitespace-nowrap">التوجيه</th>
                    <th className="px-4 py-3 min-w-[220px]">البيان وتفاصيل التسوية</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">القيمة</th>
                    <th className="px-4 py-3 min-w-[180px]">سبب الزيادة أو النقص</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">الإجراءات والعمليات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {filteredAdjustments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                        <FileSpreadsheet className="w-10 h-10 mx-auto text-gray-600 mb-2 opacity-50" />
                        <p className="text-sm font-semibold">لا توجد تسويات موقع مطابقة لشروط البحث</p>
                        <p className="text-xs text-gray-600 mt-1">
                          يمكنك إضافة تسوية جديدة أو ضبط فلاتر التصفية.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredAdjustments.map((adj, idx) => {
                      const cc = costCenters.find((c) => c.id === adj.costCenterId);
                      return (
                        <tr key={adj.id} className="hover:bg-gray-800/40 transition">
                          <td className="px-4 py-3 text-center text-gray-500 font-mono font-medium">
                            {idx + 1}
                          </td>

                          {/* Month */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold text-[11px]">
                              {MONTH_NAMES[adj.month] || `شهر ${adj.month}`}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-400">
                            {adj.date}
                          </td>

                          {/* Orientation */}
                          <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              <span>{adj.orientation}</span>
                            </div>
                            {cc && (
                              <span className="block text-[10px] text-gray-400 font-normal mt-0.5">
                                {cc.name}
                              </span>
                            )}
                          </td>

                          {/* Statement & Organized Details */}
                          <td className="px-4 py-3 text-gray-200">
                            {adj.items && adj.items.length > 0 ? (
                              <div className="space-y-1.5">
                                {/* Optional Distinct Group Title (if custom and not duplicate) */}
                                {adj.statement &&
                                  !adj.statement.startsWith("•") &&
                                  adj.statement !== adj.items.map((i) => i.statement).join(" + ") &&
                                  adj.statement !== adj.items[0]?.statement && (
                                    <div className="text-[11px] font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                      <span>{adj.statement}</span>
                                    </div>
                                  )}

                                {/* Organized Items Breakdown List */}
                                <div className="space-y-1">
                                  {adj.items.map((it, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center justify-between gap-2 bg-[#131720] hover:bg-[#181D28] px-2.5 py-1.5 rounded-lg border border-gray-800/90 transition text-xs"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        {adj.items!.length > 1 && (
                                          <span className="w-4 h-4 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold flex items-center justify-center shrink-0">
                                            {i + 1}
                                          </span>
                                        )}
                                        <span className="text-[9px] font-mono text-gray-400 bg-gray-800/80 px-1.5 py-0.5 rounded border border-gray-700/50 shrink-0">
                                          {it.date || adj.date}
                                        </span>
                                        <span className="font-medium text-gray-200 truncate">
                                          {it.statement}
                                        </span>
                                      </div>
                                      <span className="font-mono text-amber-300 font-bold text-xs dir-ltr whitespace-nowrap shrink-0">
                                        {it.amount.toLocaleString()} {companySettings.currency}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-mono text-gray-400 bg-gray-800/80 px-1.5 py-0.5 rounded border border-gray-700/50 shrink-0">
                                  {adj.date}
                                </span>
                                <span className="font-medium text-xs text-gray-200 leading-relaxed">
                                  {adj.statement}
                                </span>
                              </div>
                            )}

                            {adj.notes && (
                              <div className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1.5 bg-black/30 px-2 py-0.5 rounded border border-gray-800/60 w-fit">
                                <span className="text-gray-500">ملاحظات:</span>
                                <span>{adj.notes}</span>
                              </div>
                            )}
                          </td>

                          {/* Amount */}
                          <td className="px-4 py-3 text-right font-bold text-amber-400 whitespace-nowrap dir-ltr">
                            {adj.amount.toLocaleString()} {companySettings.currency}
                          </td>

                          {/* Reason for variance */}
                          <td className="px-4 py-3 text-gray-300">
                            {adj.reasonForVariance ? (
                              <span className="inline-block bg-slate-800/80 text-gray-300 text-[11px] px-2 py-1 rounded border border-gray-700/60 leading-tight">
                                {adj.reasonForVariance}
                              </span>
                            ) : (
                              <span className="text-gray-600 text-[11px]">-</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handlePrintSingleAdjustment(adj)}
                                className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 transition"
                                title="طباعة سند وتفاصيل هذه التسوية"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(adj)}
                                className="p-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded border border-blue-500/30 transition"
                                title="تعديل التسوية"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmAdj(adj)}
                                className="p-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 rounded border border-rose-500/30 transition"
                                title="حذف التسوية"
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
              </table>
            </div>

            {/* Table Footer */}
            {filteredAdjustments.length > 0 && (
              <div className="p-4 bg-[#1A1F26] border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-2">
                <div>
                  إجمالي تسويات المعاينة: <strong className="text-white">{filteredAdjustments.length}</strong> عملية
                </div>
                <div className="font-bold text-amber-400 text-sm">
                  مجموع التسويات المعروضة: {totalAmount.toLocaleString()} {companySettings.currency}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: Orientations Monthly Cost Matrix Sheet (شيت تكلفة كل توجيه في كل شهر لوحده) */}
      {activeViewMode === "orientations_matrix" && (
        <div className="space-y-4">
          {/* Header Note & Filters for Matrix */}
          <div className="bg-[#11141B] p-4 rounded-xl border border-gray-800 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-800/80 pb-3">
              <div>
                <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <Grid className="w-4 h-4 text-amber-400" />
                  <span>شيت تكلفة كل توجيه في كل شهر لوحده (Matrix Breakdown)</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  تفكيك إجمالي تكاليف تسويات الموقع وتوزيع كل توجيه عبر شهور السنة المحددة (اضغط على أي خلية لمعاينة التفاصيل)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-400">السنة:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-[#1A1F26] border border-gray-700 rounded-lg px-3 py-1 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-400">مركز التكلفة:</span>
                  <select
                    value={selectedCostCenter}
                    onChange={(e) => setSelectedCostCenter(e.target.value)}
                    className="bg-[#1A1F26] border border-gray-700 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-amber-500 max-w-[150px] truncate"
                  >
                    <option value="ALL">جميع المكونات</option>
                    {costCenters.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-right text-xs text-gray-300">
                <thead className="bg-[#1A1F26] text-gray-300 border-b border-gray-800 uppercase font-semibold">
                  <tr>
                    <th className="px-3 py-3 text-center w-10">م</th>
                    <th className="px-4 py-3 min-w-[200px] text-right sticky right-0 bg-[#1A1F26] z-10 shadow">
                      التوجيه / بند المصروف
                    </th>
                    {matrixData.months.map((mKey) => (
                      <th key={mKey} className="px-2 py-3 text-center min-w-[85px]">
                        {SHORT_MONTH_NAMES[mKey]}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center min-w-[120px] bg-slate-900 text-amber-400 font-bold">
                      إجمالي التوجيه السنوي
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {matrixData.rowsList.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="px-4 py-10 text-center text-gray-500">
                        لا توجد توجيهات تسوية مسجلة
                      </td>
                    </tr>
                  ) : (
                    matrixData.rowsList.map((row, idx) => {
                      return (
                        <tr key={row.orientation} className="hover:bg-gray-800/50 transition group">
                          <td className="px-3 py-2.5 text-center text-gray-500 font-mono">
                            {idx + 1}
                          </td>

                          {/* Orientation Name (Sticky) */}
                          <td className="px-4 py-2.5 font-semibold text-white sticky right-0 bg-[#11141B] group-hover:bg-[#1f2631] transition z-10 shadow">
                            <div className="flex items-center justify-between gap-2">
                              <span>{row.orientation}</span>
                              <button
                                onClick={() => {
                                  setSelectedOrientation(row.orientation);
                                  setActiveViewMode("sheet");
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-amber-400 text-[10px] transition"
                                title="عرض قيود هذا التوجيه فقط"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Months Cells (01..12) */}
                          {matrixData.months.map((mKey) => {
                            const val = row.monthTotals[mKey] || 0;
                            const items = row.monthItems[mKey] || [];
                            const hasVal = val > 0;

                            return (
                              <td
                                key={mKey}
                                onClick={() => {
                                  if (hasVal) {
                                    setDrilldownCell({
                                      monthKey: mKey,
                                      monthName: MONTH_NAMES[mKey] || mKey,
                                      orientation: row.orientation,
                                      items,
                                    });
                                  }
                                }}
                                className={`px-2 py-2.5 text-center transition ${
                                  hasVal
                                    ? "cursor-pointer font-bold text-amber-400 hover:bg-amber-500/20"
                                    : "text-gray-600"
                                }`}
                              >
                                {hasVal ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                                    {val.toLocaleString()}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                            );
                          })}

                          {/* Row Total */}
                          <td className="px-4 py-2.5 text-center font-bold text-amber-300 bg-slate-900/80 dir-ltr">
                            {row.rowTotal.toLocaleString()} {companySettings.currency}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Footer Totals Row */}
                <tfoot className="bg-[#1A1F26] border-t-2 border-gray-700 text-xs font-bold text-white">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-right sticky right-0 bg-[#1A1F26] z-10">
                      إجمالي كافة التوجيهات بالشهور:
                    </td>
                    {matrixData.months.map((mKey) => {
                      const colVal = matrixData.colTotals[mKey] || 0;
                      return (
                        <td key={mKey} className="px-2 py-3 text-center text-blue-300 dir-ltr">
                          {colVal > 0 ? colVal.toLocaleString() : "-"}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center text-amber-400 bg-slate-950 font-black text-sm dir-ltr">
                      {matrixData.grandTotal.toLocaleString()} {companySettings.currency}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: Comparative Monthly Analysis (تحليل التغير والفرق بين الشهور) */}
      {activeViewMode === "analysis" && (
        <div className="space-y-6">
          {/* Header Note */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <span>التحليل المالي المقارن لتسويات الموقع لسنة {selectedYear}</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                جدول مقارنة الشهور المتعاقبة لمعرفة قيمة وقدر التغير الزمني وتحديد أسباب ارتفاع أو انخفاض التكاليف الميدانية
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400">تصفية حسب السنة:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-[#1A1F26] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    سنة {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparative Cards & Analysis Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Trend Visualizer Bar Chart */}
            <div className="lg:col-span-1 bg-[#11141B] p-5 rounded-2xl border border-gray-800 space-y-4">
              <h3 className="text-xs font-bold text-white flex items-center justify-between border-b border-gray-800 pb-2">
                <span>تطور تكاليف الموقع بالشهور</span>
                <span className="text-[10px] text-amber-400 font-normal">ج.م</span>
              </h3>

              <div className="space-y-3 pt-2">
                {monthlyAnalysis.comparisonList.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-6">لا توجد بيانات تسويات لهذه السنة</p>
                ) : (
                  monthlyAnalysis.comparisonList.map((item) => (
                    <div key={item.monthKey} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-300">{item.monthName}</span>
                        <span className="font-bold text-amber-400 dir-ltr">
                          {item.total.toLocaleString()} {companySettings.currency}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(item.percentageOfMax, 5)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {monthlyAnalysis.grandYearTotal > 0 && (
                <div className="pt-3 border-t border-gray-800 text-xs flex items-center justify-between">
                  <span className="text-gray-400">إجمالي تسويات السنة:</span>
                  <span className="font-bold text-white text-sm dir-ltr">
                    {monthlyAnalysis.grandYearTotal.toLocaleString()} {companySettings.currency}
                  </span>
                </div>
              )}
            </div>

            {/* Detailed Month-over-Month Variance Table */}
            <div className="lg:col-span-2 bg-[#11141B] p-5 rounded-2xl border border-gray-800 space-y-4">
              <h3 className="text-xs font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>جدول فروق تكاليف التسويات وأسباب التغير بين الشهور</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-gray-300">
                  <thead className="bg-[#1A1F26] text-gray-400 uppercase font-semibold border-b border-gray-800">
                    <tr>
                      <th className="px-3 py-2.5">الشهر</th>
                      <th className="px-3 py-2.5 text-right">إجمالي التسويات</th>
                      <th className="px-3 py-2.5 text-right">الفرق عن الشهر السابق</th>
                      <th className="px-3 py-2.5 text-center">نسبة التغير</th>
                      <th className="px-3 py-2.5">أبرز توجيه مسبب بالتكلفة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {monthlyAnalysis.comparisonList.map((mItem, idx) => {
                      const isIncrease = mItem.diff > 0;
                      const isDecrease = mItem.diff < 0;
                      const isFirst = idx === 0;

                      return (
                        <tr key={mItem.monthKey} className="hover:bg-gray-800/40 transition">
                          <td className="px-3 py-3 font-bold text-white whitespace-nowrap">
                            {mItem.monthName}
                          </td>

                          <td className="px-3 py-3 font-bold text-amber-400 text-right whitespace-nowrap dir-ltr">
                            {mItem.total.toLocaleString()}
                          </td>

                          {/* Difference */}
                          <td className="px-3 py-3 text-right whitespace-nowrap dir-ltr">
                            {isFirst ? (
                              <span className="text-gray-500 text-[11px]">شهر الأساس</span>
                            ) : isIncrease ? (
                              <span className="text-rose-400 font-bold flex items-center justify-end gap-0.5">
                                <ArrowUpRight className="w-3 h-3" />
                                +{mItem.diff.toLocaleString()}
                              </span>
                            ) : isDecrease ? (
                              <span className="text-emerald-400 font-bold flex items-center justify-end gap-0.5">
                                <ArrowDownRight className="w-3 h-3" />
                                {mItem.diff.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>

                          {/* Percentage Badge */}
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            {isFirst ? (
                              <span className="text-gray-500 text-[10px]">-</span>
                            ) : isIncrease ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                                📈 +{mItem.pctChange.toFixed(1)}%
                              </span>
                            ) : isDecrease ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                📉 {mItem.pctChange.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px]">
                                مستقر
                              </span>
                            )}
                          </td>

                          {/* Top Orientation */}
                          <td className="px-3 py-3 text-gray-300 text-[11px]">
                            {mItem.topOrientation ? (
                              <div>
                                <span className="font-semibold text-white block">{mItem.topOrientation}</span>
                                <span className="text-gray-500 text-[10px]">
                                  بنسبة {Math.round((mItem.topOrientationAmount / mItem.total) * 100)}% من شهر {mItem.monthName}
                                </span>
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Manage Orientations Modal (إضافة أو حذف توجيه) */}
      {showOrientationsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141B] border border-gray-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-purple-400" />
                <span>إدارة التوجيهات وبنود التسوية بالموقع</span>
              </h3>
              <button
                onClick={() => setShowOrientationsModal(false)}
                className="text-gray-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Add New Orientation Form */}
            <form onSubmit={handleAddNewOrientation} className="space-y-2 bg-[#1A1F26] p-3 rounded-xl border border-gray-800">
              <label className="block font-bold text-white text-xs">إضافة توجيه جديد / بند مصروف جديد:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  placeholder="مثال: تسوية عهدة أمن وحراسة الموقع..."
                  value={newOrientationName}
                  onChange={(e) => setNewOrientationName(e.target.value)}
                  className="flex-1 bg-[#11141B] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition shrink-0"
                >
                  إضافة
                </button>
              </div>
            </form>

            {/* Current Orientations List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-gray-400 text-[11px] font-medium">
                <span>قائمة التوجيهات المسجلة بالنظام ({allOrientations.length}):</span>
                <span>إجراء الحذف</span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {allOrientations.map((orient) => {
                  const linkedCount = siteAdjustments.filter((a) => a.orientation === orient).length;

                  return (
                    <div
                      key={orient}
                      className="flex items-center justify-between bg-[#1A1F26] p-2.5 rounded-lg border border-gray-800 text-xs hover:border-gray-700 transition"
                    >
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="font-semibold text-white">{orient}</span>
                        {linkedCount > 0 && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/20">
                            {linkedCount} تسوية
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setDeleteConfirmOrientation(orient)}
                        className="p-1 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                        title="حذف هذا التوجيه"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-800">
              <button
                onClick={() => setShowOrientationsModal(false)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Delete Orientation Confirmation */}
      {deleteConfirmOrientation && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141B] border border-rose-500/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold text-white">تأكيد حذف التوجيه</h3>
            </div>

            <p className="text-gray-300 text-xs leading-relaxed">
              هل أنت متأكد من رغبتك في حذف التوجيه:{" "}
              <strong className="text-amber-300">"{deleteConfirmOrientation}"</strong> ؟
            </p>

            <p className="text-[11px] text-gray-500 bg-slate-900 p-2.5 rounded-lg border border-gray-800">
              ملاحظة: القيود والتسويات الحالية المسجلة تحت هذا التوجيه لن تُحذف، ولكن التوجيه لن يظهر القائمة الافتراضية للخيارات القادمة.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
              <button
                onClick={() => setDeleteConfirmOrientation(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmDeleteOrientation}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl"
              >
                نعم، تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Site Adjustment Confirmation (تفعيل ميزة الحذف في تسويات الموقع) */}
      {deleteConfirmAdj && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141B] border border-rose-500/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold text-white">تأكيد حذف تسوية الموقع</h3>
            </div>

            <div className="bg-[#1A1F26] p-3 rounded-xl border border-gray-800 space-y-1.5 text-gray-300">
              <div>
                <span className="text-gray-500">القيمة: </span>
                <strong className="text-amber-400 font-mono font-bold">
                  {deleteConfirmAdj.amount.toLocaleString()} {companySettings.currency}
                </strong>
              </div>
              <div>
                <span className="text-gray-500">التوجيه: </span>
                <span className="text-white font-semibold">{deleteConfirmAdj.orientation}</span>
              </div>
              <div>
                <span className="text-gray-500">التاريخ والشهر: </span>
                <span className="text-gray-300">{deleteConfirmAdj.date} ({MONTH_NAMES[deleteConfirmAdj.month]})</span>
              </div>
              <div>
                <span className="text-gray-500">البيان: </span>
                <span className="text-gray-200">{deleteConfirmAdj.statement}</span>
              </div>
            </div>

            <p className="text-gray-400 text-[11px]">
              هل أنت متأكد من حذف هذه التسوية نهائياً؟ لا يمكن التراجع عن هذه العملية بعد التأكيد.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
              <button
                onClick={() => setDeleteConfirmAdj(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmDeleteAdjustment}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-600/20"
              >
                حذف التسوية نهائياً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Matrix Cell Drilldown Modal */}
      {drilldownCell && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141B] border border-gray-800 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>تفاصيل تسويات {drilldownCell.orientation} - {drilldownCell.monthName}</span>
              </h3>
              <button
                onClick={() => setDrilldownCell(null)}
                className="text-gray-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {drilldownCell.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#1A1F26] p-3 rounded-xl border border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {item.items && item.items.length > 0 ? (
                      <div className="space-y-1">
                        {item.statement &&
                          !item.statement.startsWith("•") &&
                          item.statement !== item.items.map((i) => i.statement).join(" + ") &&
                          item.statement !== item.items[0]?.statement && (
                            <div className="font-bold text-amber-300 text-xs mb-1">
                              {item.statement}
                            </div>
                          )}
                        {item.items.map((sub, si) => (
                          <div
                            key={si}
                            className="flex items-center justify-between gap-2 bg-[#11141B] px-2.5 py-1.5 rounded-lg border border-gray-800/80 text-[11px]"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[9px] font-mono text-gray-400 bg-gray-800 px-1 rounded">
                                {sub.date || item.date}
                              </span>
                              <span className="text-gray-200 truncate">{sub.statement}</span>
                            </div>
                            <span className="font-mono text-amber-300 font-bold text-[11px] dir-ltr shrink-0">
                              {sub.amount.toLocaleString()} {companySettings.currency}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono text-gray-400 bg-gray-800 px-1 rounded">
                          {item.date}
                        </span>
                        <span className="font-semibold text-white text-xs">{item.statement}</span>
                      </div>
                    )}

                    <div className="text-[10px] text-gray-400 font-mono flex items-center gap-2 flex-wrap pt-0.5">
                      {item.notes && <span className="text-gray-400">ملاحظات: {item.notes}</span>}
                      {item.reasonForVariance && (
                        <span className="text-amber-400/90 font-sans">
                          • سبب التغير: {item.reasonForVariance}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="font-bold text-amber-400 text-sm font-mono dir-ltr shrink-0 bg-[#11141B] px-3 py-1.5 rounded-lg border border-amber-500/20">
                    {item.amount.toLocaleString()} {companySettings.currency}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-800 text-xs">
              <div className="font-bold text-white">
                إجمالي الفرعي:{" "}
                <span className="text-amber-400 font-mono">
                  {drilldownCell.items.reduce((s, i) => s + i.amount, 0).toLocaleString()} {companySettings.currency}
                </span>
              </div>
              <button
                onClick={() => setDrilldownCell(null)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Add / Edit Site Adjustment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#11141B] border border-gray-800 rounded-2xl max-w-2xl w-full p-5 shadow-2xl text-xs flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>{editingAdj ? "تعديل تسوية الموقع" : "إضافة تسوية موقع جديدة"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="flex flex-col flex-1 overflow-hidden mt-3">
              <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 pl-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Year */}
                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">السنة *</label>
                    <select
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className="w-full bg-[#1A1F26] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="2026">2026</option>
                      <option value="2025">2025</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>

                  {/* Month */}
                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">الشهر *</label>
                    <select
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                      className="w-full bg-[#1A1F26] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      {Object.entries(MONTH_NAMES).map(([mKey, mName]) => (
                        <option key={mKey} value={mKey}>
                          {mName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">التاريخ *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-[#1A1F26] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Orientation Selection + Custom Orientation */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-gray-400 font-medium">التوجيه / بند الإنفاق بالموقع *</label>
                    <button
                      type="button"
                      onClick={() => setShowOrientationsModal(true)}
                      className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <Settings2 className="w-3 h-3" />
                      <span>إدارة القائمة</span>
                    </button>
                  </div>

                  <select
                    value={formData.orientation}
                    onChange={(e) => setFormData({ ...formData, orientation: e.target.value })}
                    className="w-full bg-[#1A1F26] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    {allOrientations.map((orient) => (
                      <option key={orient} value={orient}>
                        {orient}
                      </option>
                    ))}
                    <option value="تسوية أخرى">تسوية أخرى (إدخال يدوياً)</option>
                  </select>

                  {formData.orientation === "تسوية أخرى" && (
                    <input
                      type="text"
                      required
                      placeholder="اكتب اسم التوجيه المخصص هنا..."
                      value={formData.customOrientation}
                      onChange={(e) => setFormData({ ...formData, customOrientation: e.target.value })}
                      className="w-full bg-[#1A1F26] border border-amber-500/50 rounded-lg px-3 py-2 text-white focus:outline-none mt-1"
                    />
                  )}
                </div>

                {/* Dynamic Detail Line Items Section */}
                <div className="bg-[#161B22] p-3.5 rounded-xl border border-gray-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-amber-400" />
                        <span>بيان التسوية بالتفصيل وقيمة كل بند (إضافة / حذف) *</span>
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        يمكنك إضافة بند بيان أو أكثر وتحديد قيمة كل بند، أو حذف البنود غير المرغوبة.
                      </p>
                    </div>
                    <div className="bg-[#1A1F26] px-3 py-1.5 rounded-lg border border-amber-500/30 text-right sm:text-left shrink-0">
                      <span className="text-[10px] text-gray-400 block">إجمالي التسوية المحسوب:</span>
                      <span className="text-sm font-bold text-amber-400 font-mono dir-ltr">
                        {computedDetailTotal > 0
                          ? computedDetailTotal.toLocaleString()
                          : (parseFloat(formData.amount) || 0).toLocaleString()}{" "}
                        {companySettings.currency}
                      </span>
                    </div>
                  </div>

                  {/* Detail Items List */}
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {detailItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[#1A1F26] p-2.5 rounded-lg border border-gray-700/80 hover:border-amber-500/30 transition"
                      >
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>

                          {/* Item Date Input */}
                          <div className="w-32 shrink-0">
                            <input
                              type="date"
                              required
                              value={item.date}
                              onChange={(e) =>
                                handleUpdateDetailItem(index, "date", e.target.value)
                              }
                              className="w-full bg-[#11141B] border border-gray-700 rounded-md px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500"
                              title="تاريخ هذا البند"
                            />
                          </div>
                        </div>

                        {/* Statement Input */}
                        <div className="flex-1 min-w-[150px]">
                          <input
                            type="text"
                            required
                            placeholder={`بيان البند ${index + 1} (مثال: شراء مواد بناء، أجور عمال...)...`}
                            value={item.statement}
                            onChange={(e) =>
                              handleUpdateDetailItem(index, "statement", e.target.value)
                            }
                            className="w-full bg-[#11141B] border border-gray-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* Amount Input */}
                        <div className="w-full sm:w-28 shrink-0">
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="القيمة (ج.م)"
                            value={item.amount}
                            onChange={(e) =>
                              handleUpdateDetailItem(index, "amount", e.target.value)
                            }
                            className="w-full bg-[#11141B] border border-gray-700 rounded-md px-2.5 py-1.5 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500 text-left dir-ltr"
                          />
                        </div>

                        {/* Delete Button */}
                        {detailItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDetailItem(index)}
                            className="p-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 rounded-md border border-rose-500/30 transition shrink-0 self-end sm:self-center cursor-pointer"
                            title="حذف هذا البند"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Item Action */}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-800">
                    <button
                      type="button"
                      onClick={handleAddDetailItem}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة بند بيان جديد للتسوية</span>
                    </button>

                    <div className="text-[11px] text-gray-400">
                      عدد البنود: <strong className="text-white">{detailItems.length}</strong>
                    </div>
                  </div>
                </div>

                {/* Cost Center & Additional Statement Note */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">مركز التكلفة / المشروع</label>
                    <select
                      value={formData.costCenterId}
                      onChange={(e) => setFormData({ ...formData, costCenterId: e.target.value })}
                      className="w-full bg-[#1A1F26] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                    >
                      <option value="">بدون تحديد (عام)</option>
                      {costCenters.map((cc) => (
                        <option key={cc.id} value={cc.id}>
                          {cc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">عنوان ملخص التسوية (اختياري)</label>
                    <input
                      type="text"
                      placeholder="يمكنك تخصيص عنوان رئيسي للمجموعة..."
                      value={formData.statement}
                      onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
                      className="w-full bg-[#1A1F26] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>
                </div>

                {/* Reason for variance */}
                <div>
                  <label className="block text-gray-400 mb-1 font-medium">سبب الزيادة أو النقص (تحليلي)</label>
                  <input
                    type="text"
                    placeholder="سبب اختلاف التكلفة عن الشهور السابقة..."
                    value={formData.reasonForVariance}
                    onChange={(e) => setFormData({ ...formData, reasonForVariance: e.target.value })}
                    className="w-full bg-[#1A1F26] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-gray-400 mb-1 font-medium">ملاحظات أو أرقام المستندات</label>
                  <input
                    type="text"
                    placeholder="رقم الإيصال أو اسم المهندس المعتمد..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-[#1A1F26] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Modal Actions - Always Visible Sticky Footer */}
              <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-gray-800 shrink-0 bg-[#11141B]">
                <div className="text-[11px] text-gray-400 hidden sm:block">
                  إجمالي بنود التسوية: <strong className="text-amber-400 font-mono">{detailItems.length}</strong>
                </div>
                <div className="flex items-center gap-2 mr-auto">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg transition cursor-pointer"
                  >
                    {editingAdj ? "حفظ التعديلات" : "إضافة التسوية"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
