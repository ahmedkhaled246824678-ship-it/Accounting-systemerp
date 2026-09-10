import React, { useState } from "react";
import {
  Building2,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  X,
  Search,
  Send,
  Sparkles,
  CheckCircle2,
  TrendingDown,
  Layers,
  Calendar,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import { FixedAsset, CompanySettings, CostCenter, JournalEntry } from "../types";
import { exportToExcel, exportReportToPdf, printReport } from "../utils/export";
import { printAssetDepreciationCard } from "../utils/printAssetDepreciation";

interface ConsolidatedAssetsDepreciationModalProps {
  isOpen: boolean;
  onClose: () => void;
  fixedAssets: FixedAsset[];
  costCenters?: CostCenter[];
  companySettings: CompanySettings;
  onSaveJournalEntry?: (entry: JournalEntry) => void;
}

export const ConsolidatedAssetsDepreciationModal: React.FC<
  ConsolidatedAssetsDepreciationModalProps
> = ({
  isOpen,
  onClose,
  fixedAssets,
  costCenters = [],
  companySettings,
  onSaveJournalEntry,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [generatedEntrySuccess, setGeneratedEntrySuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // Categories list
  const categories = Array.from(
    new Set(fixedAssets.map((a) => a.category || "أصول عامة"))
  );

  // Compute calculated metrics for each asset
  const enrichedAssets = fixedAssets.map((asset) => {
    const salvageValue = (asset as any).salvageValue || 0;
    const depreciableBase = Math.max(0, asset.cost - salvageValue);
    const usefulYears = asset.usefulLifeYears || 10;
    const ratePercent =
      asset.depreciationRate || (usefulYears > 0 ? +(100 / usefulYears).toFixed(2) : 10);
    const annualDepreciation = (depreciableBase * ratePercent) / 100;
    const accumulatedDep = asset.accumulatedDepreciation || 0;
    const netBookValue = Math.max(salvageValue, asset.cost - accumulatedDep);
    const consumptionRate =
      asset.cost > 0 ? Math.min(100, Math.round((accumulatedDep / asset.cost) * 100)) : 0;

    const costCenter = costCenters.find((c) => c.id === asset.costCenterId);

    return {
      ...asset,
      salvageValue,
      depreciableBase,
      usefulYears,
      ratePercent,
      annualDepreciation,
      accumulatedDep,
      netBookValue,
      consumptionRate,
      costCenterName: costCenter ? costCenter.nameAr : asset.costCenterId || "-",
      method: "قسط ثابت (Straight-Line)",
    };
  });

  // Filtered list
  const filteredAssets = enrichedAssets.filter((a) => {
    const matchesCat = selectedCategory === "ALL" || a.category === selectedCategory;
    const matchesSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.location && a.location.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  // Totals
  const totalCost = filteredAssets.reduce((sum, a) => sum + a.cost, 0);
  const totalSalvage = filteredAssets.reduce((sum, a) => sum + a.salvageValue, 0);
  const totalDepreciable = filteredAssets.reduce((sum, a) => sum + a.depreciableBase, 0);
  const totalAnnualDep = filteredAssets.reduce((sum, a) => sum + a.annualDepreciation, 0);
  const totalAccumulatedDep = filteredAssets.reduce((sum, a) => sum + a.accumulatedDep, 0);
  const totalNetBookValue = filteredAssets.reduce((sum, a) => sum + a.netBookValue, 0);
  const averageConsumption =
    totalCost > 0 ? Math.round((totalAccumulatedDep / totalCost) * 100) : 0;

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredAssets.map((a) => ({
      "كود الأصل": a.code,
      "اسم الأصل الثابت ومواصفاته": a.name,
      "التصنيف / المجموعة": a.category,
      "مركز التكلفة المرتبط": a.costCenterName,
      "موقع الأصل والمسؤول": a.location || "-",
      "تاريخ الشراء والتشغيل": a.purchaseDate,
      "تكلفة الاقتناء التاريخية": a.cost,
      "القيمة التخريدية المقدرة": a.salvageValue,
      "الوعاء القابل للإهلاك": a.depreciableBase,
      "العمر الإنتاجي (سنوات)": a.usefulYears,
      "طريقة الإهلاك": a.method,
      "نسبة الإهلاك السنوية (%)": `${a.ratePercent}%`,
      "مجمع الإهلاك المتراكم حتى تاريخه": a.accumulatedDep,
      "إهلاك العام المالي": a.annualDepreciation,
      "صافي القيمة الدفترية المتبقية": a.netBookValue,
      "نسبة الاستهلاك الفعلي": `${a.consumptionRate}%`,
      "الحالة الفنية للأصل": a.status || (a.netBookValue <= a.salvageValue ? "مستهلك دفترياً" : "يعمل بكفاءة"),
    }));

    exportToExcel(
      rows,
      `شيت_مجمع_إهلاك_الأصول_الشامل_${companySettings.companyName}`,
      "شيت مجمع إهلاك الأصول"
    );
  };

  // Export to PDF
  const handleExportPdf = () => {
    const tableHtml = `
      <div style="font-family: 'Cairo', sans-serif; direction: rtl; padding: 10px;">
        <h2 style="text-align: center; color: #1e3a8a; margin-bottom: 4px;">شيت مجمع إهلاك الأصول الثابتة الشامل</h2>
        <p style="text-align: center; color: #475569; font-size: 12px; margin-bottom: 16px;">
          شركة: ${companySettings.companyName} | السنة المالية: ${companySettings.fiscalYear}
        </p>

        <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 14px;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff;">
              <th style="padding: 6px; border: 1px solid #334155;">الكود</th>
              <th style="padding: 6px; border: 1px solid #334155;">اسم الأصل</th>
              <th style="padding: 6px; border: 1px solid #334155;">التصنيف</th>
              <th style="padding: 6px; border: 1px solid #334155;">مركز التكلفة</th>
              <th style="padding: 6px; border: 1px solid #334155;">تاريخ الشراء</th>
              <th style="padding: 6px; border: 1px solid #334155;">التكلفة التاريخية</th>
              <th style="padding: 6px; border: 1px solid #334155;">الخردة</th>
              <th style="padding: 6px; border: 1px solid #334155;">العمر (سنة)</th>
              <th style="padding: 6px; border: 1px solid #334155;">النسبة</th>
              <th style="padding: 6px; border: 1px solid #334155;">مجمع الإهلاك</th>
              <th style="padding: 6px; border: 1px solid #334155;">صافي الدفتري</th>
              <th style="padding: 6px; border: 1px solid #334155;">نسبة الاستهلاك</th>
            </tr>
          </thead>
          <tbody>
            ${filteredAssets
              .map(
                (a, i) => `
              <tr style="background-color: ${i % 2 === 0 ? "#ffffff" : "#f8fafc"};">
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: center;">${a.code}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: bold;">${a.name}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1;">${a.category}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1;">${a.costCenterName}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: center;">${a.purchaseDate}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace;">${a.cost.toLocaleString()}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace;">${a.salvageValue.toLocaleString()}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: center;">${a.usefulYears}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: center;">${a.ratePercent}%</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; color: #dc2626;">${a.accumulatedDep.toLocaleString()}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: bold; color: #16a34a;">${a.netBookValue.toLocaleString()}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: center;">${a.consumptionRate}%</td>
              </tr>
            `
              )
              .join("")}
            <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #0f172a;">
              <td colspan="5" style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">الإجماليات العامة للأصول</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace;">${totalCost.toLocaleString()}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace;">${totalSalvage.toLocaleString()}</td>
              <td colspan="2" style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">-</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; color: #dc2626;">${totalAccumulatedDep.toLocaleString()}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; color: #16a34a;">${totalNetBookValue.toLocaleString()}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${averageConsumption}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    exportReportToPdf(
      "شيت مجمع إهلاك الأصول الثابتة",
      tableHtml,
      companySettings,
      `شيت_مجمع_إهلاك_الأصول_${companySettings.companyName}`
    );
  };

  // Direct Print
  const handlePrint = () => {
    printReport(
      "شيت مجمع إهلاك الأصول الثابتة الشامل",
      filteredAssets.map((a) => ({
        "كود الأصل": a.code,
        "اسم الأصل": a.name,
        "التصنيف": a.category,
        "تاريخ الشراء": a.purchaseDate,
        "التكلفة التاريخية": a.cost.toLocaleString(),
        "العمر (سنوات)": a.usefulYears,
        "نسبة الإهلاك": `${a.ratePercent}%`,
        "مجمع الإهلاك": a.accumulatedDep.toLocaleString(),
        "صافي القيمة الدفترية": a.netBookValue.toLocaleString(),
        "نسبة الاستهلاك": `${a.consumptionRate}%`,
      })),
      companySettings
    );
  };

  // WhatsApp Share
  const handleWhatsAppShare = () => {
    const msg = `🏢 *${companySettings.companyName}*\n📊 *شيت مجمع إهلاك الأصول الثابتة الشامل*\n\n🔹 عدد الأصول: ${filteredAssets.length}\n💰 إجمالي التكلفة التاريخية: ${totalCost.toLocaleString()} ${companySettings.currency}\n📉 إجمالي مجمع الإهلاك: ${totalAccumulatedDep.toLocaleString()} ${companySettings.currency}\n💎 صافي القيمة الدفترية للأصول: ${totalNetBookValue.toLocaleString()} ${companySettings.currency}\n📈 متوسط نسبة الاستهلاك الفعلي: ${averageConsumption}%\n\n🔗 تم إصدار التقرير عبر نظام المحاسب ERP المتكامل.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Generate Automatic Depreciation Journal Entry
  const handleGenerateDepreciationJournalEntry = () => {
    if (totalAnnualDep <= 0) {
      alert("لا يوجد مبالغ إهلاك سنوية مستحقة لتوليد القيد.");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const entryNum = `قيد-إهلاك-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    const newEntry: JournalEntry = {
      id: "JE-DEP-" + Date.now(),
      entryNumber: entryNum,
      date: today,
      isPosted: true,
      reference: `قيد إهلاك أصول ${companySettings.fiscalYear}`,
      notes: `قيد إثبات إهلاك الأصول الثابتة السنوي بمبلغ ${totalAnnualDep.toLocaleString()} ${companySettings.currency} وفقاً لشيت مجمع الإهلاك المعتمد`,
      lines: [
        {
          id: "L1-" + Date.now(),
          accountId: "5105", // مصروف إهلاك الأصول
          debit: totalAnnualDep,
          credit: 0,
          note: `مصروف إهلاك الأصول الثابتة عن الفترة المالية`,
        },
        {
          id: "L2-" + Date.now(),
          accountId: "1200", // مجمع إهلاك الأصول الثابتة
          debit: 0,
          credit: totalAnnualDep,
          note: `إثبات مجمع إهلاك الأصول الثابتة المتراكم`,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    if (onSaveJournalEntry) {
      onSaveJournalEntry(newEntry);
      setGeneratedEntrySuccess(
        `تم توليد وترحيل قيد إهلاك الأصول رقم (${entryNum}) بقيمة ${totalAnnualDep.toLocaleString()} ${companySettings.currency} إلى دفتر اليومية بنجاح.`
      );
      setTimeout(() => setGeneratedEntrySuccess(null), 5000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#0F131A] border border-gray-700 w-full max-w-7xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-right">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gray-800 flex items-center justify-between bg-[#141A23]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 rounded-xl border border-purple-500/30">
              <Building2 className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>شيت مجمع إهلاك الأصول الثابتة الشامل</span>
                <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                  شامل كافة التفاصيل والنسب
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                حساب التكلفة التاريخية، العمر الإنتاجي، نسبة ومجمع الإهلاك وصافي القيمة الدفترية لكل أصل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow transition"
              title="تصدير شيت مجمع الإهلاك إلى Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">تصدير إكسيل</span>
            </button>

            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow transition"
              title="تصدير تقرير PDF"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">تصدير PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition"
              title="طباعة"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="p-2 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 rounded-lg transition"
              title="مشاركة عبر واتساب"
            >
              <Send className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition mr-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert if Entry Generated */}
        {generatedEntrySuccess && (
          <div className="mx-5 mt-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{generatedEntrySuccess}</span>
            </div>
            <button
              onClick={() => setGeneratedEntrySuccess(null)}
              className="text-emerald-400 hover:text-white text-xs"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* Metric Summary Cards */}
        <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 border-b border-gray-800/80 bg-[#0B0E14]">
          <div className="bg-[#141A23] p-3 rounded-xl border border-gray-800">
            <span className="text-[11px] text-gray-400 block mb-1">إجمالي التكلفة التاريخية</span>
            <span className="text-sm sm:text-base font-bold text-white font-mono">
              {totalCost.toLocaleString()}
            </span>
            <span className="text-[10px] text-gray-500 block">{companySettings.currency}</span>
          </div>

          <div className="bg-[#141A23] p-3 rounded-xl border border-gray-800">
            <span className="text-[11px] text-gray-400 block mb-1">القيمة التخريدية المقدرة</span>
            <span className="text-sm sm:text-base font-bold text-amber-400 font-mono">
              {totalSalvage.toLocaleString()}
            </span>
            <span className="text-[10px] text-gray-500 block">{companySettings.currency}</span>
          </div>

          <div className="bg-[#141A23] p-3 rounded-xl border border-gray-800">
            <span className="text-[11px] text-gray-400 block mb-1">الوعاء القابل للإهلاك</span>
            <span className="text-sm sm:text-base font-bold text-blue-400 font-mono">
              {totalDepreciable.toLocaleString()}
            </span>
            <span className="text-[10px] text-gray-500 block">{companySettings.currency}</span>
          </div>

          <div className="bg-[#141A23] p-3 rounded-xl border border-gray-800">
            <span className="text-[11px] text-gray-400 block mb-1">مجمع الإهلاك المتراكم</span>
            <span className="text-sm sm:text-base font-bold text-rose-400 font-mono">
              {totalAccumulatedDep.toLocaleString()}
            </span>
            <span className="text-[10px] text-gray-500 block">{companySettings.currency}</span>
          </div>

          <div className="bg-[#141A23] p-3 rounded-xl border border-gray-800">
            <span className="text-[11px] text-gray-400 block mb-1">صافي القيمة الدفترية</span>
            <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono">
              {totalNetBookValue.toLocaleString()}
            </span>
            <span className="text-[10px] text-gray-500 block">{companySettings.currency}</span>
          </div>

          <div className="bg-[#141A23] p-3 rounded-xl border border-gray-800 flex flex-col justify-between">
            <div>
              <span className="text-[11px] text-gray-400 block mb-1">متوسط نسبة الاستهلاك</span>
              <span className="text-sm sm:text-base font-bold text-purple-300 font-mono">
                {averageConsumption}%
              </span>
            </div>
            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-purple-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, averageConsumption)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filters & Actions Bar */}
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 bg-[#10141C]">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث بكود أو اسم الأصل أو موقعه..."
                className="w-full bg-[#181D26] border border-gray-700 text-white rounded-lg pr-8 pl-3 py-1.5 text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-400">التصنيف:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[#181D26] border border-gray-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:border-purple-500 focus:outline-none"
              >
                <option value="ALL">جميع التصنيفات ({fixedAssets.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Action: Generate Depreciation Entry */}
          {onSaveJournalEntry && (
            <button
              onClick={handleGenerateDepreciationJournalEntry}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow transition"
              title="توليد قيد إهلاك الأصول في دفتر اليومية العامة آلياً"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>توليد قيد إهلاك الأصول السنوي آلياً</span>
            </button>
          )}
        </div>

        {/* Assets Detailed Table */}
        <div className="flex-1 overflow-x-auto p-4">
          <table className="w-full text-xs text-right text-slate-300 border-collapse">
            <thead className="bg-[#0B0E14] text-gray-300 border-b border-gray-800 sticky top-0 z-10 font-bold">
              <tr>
                <th className="p-3">كود الأصل</th>
                <th className="p-3">اسم الأصل الثابت ومواصفاته</th>
                <th className="p-3">التصنيف</th>
                <th className="p-3">مركز التكلفة</th>
                <th className="p-3">الموقع / المسؤول</th>
                <th className="p-3">تاريخ الشراء</th>
                <th className="p-3 text-left">التكلفة التاريخية</th>
                <th className="p-3 text-left">الخردة</th>
                <th className="p-3 text-left">الوعاء للإهلاك</th>
                <th className="p-3 text-center">العمر</th>
                <th className="p-3 text-center">النسبة</th>
                <th className="p-3 text-left">مجمع الإهلاك</th>
                <th className="p-3 text-left">إهلاك العام</th>
                <th className="p-3 text-left">صافي الدفتري</th>
                <th className="p-3 text-center">الاستهلاك</th>
                <th className="p-3 text-center">الحالة</th>
                <th className="p-3 text-center">طباعة كارت الإهلاك</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={17} className="text-center p-8 text-gray-500">
                    لا توجد أصول ثابتة مطابقة لمعايير البحث
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-800/30 transition">
                    <td className="p-3 font-mono font-bold text-purple-400">{asset.code}</td>
                    <td className="p-3 font-bold text-white max-w-xs">{asset.name}</td>
                    <td className="p-3">
                      <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-[11px] border border-gray-700">
                        {asset.category}
                      </span>
                    </td>
                    <td className="p-3 text-gray-300">{asset.costCenterName}</td>
                    <td className="p-3 text-gray-400">{asset.location || "-"}</td>
                    <td className="p-3 text-gray-400 font-mono text-[11px]">{asset.purchaseDate}</td>
                    <td className="p-3 text-left font-mono font-bold text-white">
                      {asset.cost.toLocaleString()}
                    </td>
                    <td className="p-3 text-left font-mono text-amber-300">
                      {asset.salvageValue.toLocaleString()}
                    </td>
                    <td className="p-3 text-left font-mono text-blue-300">
                      {asset.depreciableBase.toLocaleString()}
                    </td>
                    <td className="p-3 text-center font-mono">{asset.usefulYears} سنة</td>
                    <td className="p-3 text-center font-mono font-bold text-purple-400">
                      {asset.ratePercent}%
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-mono font-bold text-rose-400">
                          {asset.accumulatedDep.toLocaleString()}
                        </span>
                        <button
                          onClick={() => printAssetDepreciationCard(asset, companySettings, asset.costCenterName)}
                          className="p-1 bg-gray-800/90 hover:bg-gray-700 text-amber-400 hover:text-amber-300 rounded border border-gray-700/80 transition"
                          title="طباعة كارت مجمع إهلاك هذا الأصل"
                        >
                          <Printer className="w-3 h-3 text-amber-400" />
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-left font-mono text-gray-300">
                      {asset.annualDepreciation.toLocaleString()}
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-emerald-400">
                      {asset.netBookValue.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center gap-1.5 justify-center">
                        <div className="w-12 bg-gray-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              asset.consumptionRate > 80
                                ? "bg-rose-500"
                                : asset.consumptionRate > 50
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${asset.consumptionRate}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-gray-300">
                          {asset.consumptionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          asset.netBookValue <= asset.salvageValue
                            ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                        }`}
                      >
                        {asset.netBookValue <= asset.salvageValue ? "مستهلك بالكامل" : "يعمل بكفاءة"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => printAssetDepreciationCard(asset, companySettings, asset.costCenterName)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/80 text-amber-300 hover:text-white rounded border border-purple-800/60 text-[11px] font-semibold transition"
                        title="طباعة كارت مجمع إهلاك الأصل وسجل الإهلاك"
                      >
                        <Printer className="w-3 h-3 text-amber-400" />
                        <span>طباعة الكارت</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Table Footer with Totals */}
            {filteredAssets.length > 0 && (
              <tfoot className="bg-[#0B0E14] text-white border-t-2 border-gray-700 font-bold sticky bottom-0">
                <tr>
                  <td colSpan={6} className="p-3 text-center">
                    الإجمالي العام ({filteredAssets.length} أصل)
                  </td>
                  <td className="p-3 text-left font-mono text-white">
                    {totalCost.toLocaleString()}
                  </td>
                  <td className="p-3 text-left font-mono text-amber-400">
                    {totalSalvage.toLocaleString()}
                  </td>
                  <td className="p-3 text-left font-mono text-blue-400">
                    {totalDepreciable.toLocaleString()}
                  </td>
                  <td className="p-3 text-center">-</td>
                  <td className="p-3 text-center">-</td>
                  <td className="p-3 text-left font-mono text-rose-400">
                    {totalAccumulatedDep.toLocaleString()}
                  </td>
                  <td className="p-3 text-left font-mono text-white">
                    {totalAnnualDep.toLocaleString()}
                  </td>
                  <td className="p-3 text-left font-mono text-emerald-400">
                    {totalNetBookValue.toLocaleString()}
                  </td>
                  <td className="p-3 text-center font-mono text-purple-300">
                    {averageConsumption}%
                  </td>
                  <td className="p-3 text-center">-</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={handlePrint}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-amber-300 rounded text-[10px] font-bold border border-gray-700"
                    >
                      <Printer className="w-3 h-3" />
                      <span>طباعة الكل</span>
                    </button>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-gray-800 bg-[#0B0E14] text-xs text-gray-500 flex items-center justify-between">
          <span>* يتم حساب الإهلاك وفقاً لمعيار المحاسبة الدولي (IAS 16) بطريقة القسط الثابت.</span>
          <span>العملة المعتمدة: {companySettings.currency}</span>
        </div>

      </div>
    </div>
  );
};
