import React, { useState } from "react";
import {
  Building2,
  Plus,
  Printer,
  FileSpreadsheet,
  Calculator,
  Calendar,
  Trash2,
} from "lucide-react";
import { CompanySettings, FixedAsset, FilterParams, CostCenter, JournalEntry } from "../types";
import { exportToExcel, printReport } from "../utils/export";
import { printAssetDepreciationCard } from "../utils/printAssetDepreciation";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { ConsolidatedAssetsDepreciationModal } from "./ConsolidatedAssetsDepreciationModal";

interface FixedAssetsViewProps {
  fixedAssets: FixedAsset[];
  companySettings: CompanySettings;
  filterParams: FilterParams;
  costCenters?: CostCenter[];
  onSaveFixedAsset: (asset: FixedAsset) => void;
  onCalculateDepreciation: (assetId: string) => void;
  onDeleteFixedAsset?: (assetId: string) => void;
  onSaveJournalEntry?: (entry: JournalEntry) => void;
}

export const FixedAssetsView: React.FC<FixedAssetsViewProps> = ({
  fixedAssets,
  companySettings,
  filterParams,
  costCenters = [],
  onSaveFixedAsset,
  onCalculateDepreciation,
  onDeleteFixedAsset,
  onSaveJournalEntry,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showConsolidatedModal, setShowConsolidatedModal] = useState(false);
  const [deleteConfirmAsset, setDeleteConfirmAsset] = useState<{ id: string; name: string } | null>(null);

  // Form state
  const [code, setCode] = useState(`أصل-${String(fixedAssets.length + 1).padStart(3, "0")}`);
  const [name, setName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [cost, setCost] = useState<number | "">("");
  const [depreciationRate, setDepreciationRate] = useState<number | "">(10);
  const [usefulLifeYears, setUsefulLifeYears] = useState<number | "">(10);

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !cost) return;

    const newAsset: FixedAsset = {
      id: "FA-" + Date.now(),
      code,
      name,
      purchaseDate,
      cost: Number(cost),
      depreciationRate: Number(depreciationRate) || 10,
      accumulatedDepreciation: 0,
      bookValue: Number(cost),
      usefulLifeYears: Number(usefulLifeYears) || 10,
      status: "ACTIVE",
    };

    onSaveFixedAsset(newAsset);
    setShowModal(false);
    setName("");
    setCost("");
  };

  const totalCost = fixedAssets.reduce((s, a) => s + a.cost, 0);
  const totalAccumDep = fixedAssets.reduce((s, a) => s + a.accumulatedDepreciation, 0);
  const totalBookValue = fixedAssets.reduce((s, a) => s + a.bookValue, 0);

  const handleExportToExcel = () => {
    const data = fixedAssets.map((a) => ({
      "كود الأصل": a.code,
      "اسم الأصل الثابت": a.name,
      "تاريخ الشراء": a.purchaseDate,
      "تكلفة الاقتناء التاريخية": a.cost,
      "نسبة الإهلاك السنوية (%)": a.depreciationRate,
      "مجمع الإهلاك المتراكم": a.accumulatedDepreciation,
      "القيمة الدفترية الحالية": a.bookValue,
      "العمر الإنتاجي (سنوات)": a.usefulLifeYears,
    }));

    exportToExcel(data, `سجل_الأصول_الثابتة_والإهلاك_${companySettings.companyName}`);
  };

  const handlePrintAssets = () => {
    const rows = fixedAssets
      .map(
        (a) => `
        <tr>
          <td>${a.code}</td>
          <td>${a.name}</td>
          <td>${a.purchaseDate}</td>
          <td>${a.cost.toLocaleString()} ${companySettings.currency}</td>
          <td>${a.depreciationRate}%</td>
          <td>${a.accumulatedDepreciation.toLocaleString()} ${companySettings.currency}</td>
          <td style="font-weight: bold; color: green;">${a.bookValue.toLocaleString()} ${companySettings.currency}</td>
        </tr>
      `
      )
      .join("");

    const html = `
      <table>
        <thead>
          <tr>
            <th>كود الأصل</th>
            <th>اسم الأصل</th>
            <th>تاريخ الشراء</th>
            <th>التكلفة التاريخية</th>
            <th>نسبة الإهلاك</th>
            <th>مجمع الإهلاك</th>
            <th>القيمة الدفترية</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="font-weight: bold; background: #f1f5f9;">
            <td colspan="3">إجمالي سجل الأصول الثابتة:</td>
            <td>${totalCost.toLocaleString()}</td>
            <td>-</td>
            <td>${totalAccumDep.toLocaleString()}</td>
            <td style="color: green;">${totalBookValue.toLocaleString()} ${companySettings.currency}</td>
          </tr>
        </tbody>
      </table>
    `;

    printReport("سجل الأصول الثابتة والإهلاكات السنوية", html, companySettings);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            <span>إدارة الأصول الثابتة وحساب الإهلاك السنوي</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            تسجيل الأصول الثابتة، حساب الإهلاك التلقائي بالدفاتر، وتحديد القيمة الدفترية المتبقية
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowConsolidatedModal(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-md"
            title="عرض وتحميل شيت مجمع الإهلاك لكل أصل شامل كافة التفاصيل والنسب"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-300" />
            <span>شيت مجمع الإهلاك لكل أصل شامل كل التفاصيل</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة أصل ثابت جديد</span>
          </button>
          <button
            onClick={handlePrintAssets}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>طباعة</span>
          </button>
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير إكسل</span>
          </button>
        </div>
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-slate-400">إجمالي التكلفة التاريخية للأصول</span>
          <p className="text-2xl font-extrabold text-white">
            {totalCost.toLocaleString()} {companySettings.currency}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-slate-400">إجمالي مجمع الإهلاك المتراكم</span>
          <p className="text-2xl font-extrabold text-rose-400">
            {totalAccumDep.toLocaleString()} {companySettings.currency}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-slate-400">صافي القيمة الدفترية الحالية</span>
          <p className="text-2xl font-extrabold text-emerald-400">
            {totalBookValue.toLocaleString()} {companySettings.currency}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-x-auto">
        <table className="w-full text-xs text-right text-slate-300">
          <thead className="bg-slate-800 text-slate-400">
            <tr>
              <th className="p-2.5">كود الأصل</th>
              <th className="p-2.5">اسم الأصل الثابت</th>
              <th className="p-2.5">تاريخ الشراء</th>
              <th className="p-2.5">التكلفة التاريخية</th>
              <th className="p-2.5">نسبة الإهلاك السنوية</th>
              <th className="p-2.5">مجمع الإهلاك</th>
              <th className="p-2.5">القيمة الدفترية الحالية</th>
              <th className="p-2.5 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {fixedAssets.map((a) => (
              <tr key={a.id} className="hover:bg-slate-800/40">
                <td className="p-2.5 font-bold font-mono text-blue-400">{a.code}</td>
                <td className="p-2.5 font-semibold text-white">{a.name}</td>
                <td className="p-2.5">{a.purchaseDate}</td>
                <td className="p-2.5 font-bold text-white">
                  {a.cost.toLocaleString()} {companySettings.currency}
                </td>
                <td className="p-2.5 font-bold text-amber-400">{a.depreciationRate}%</td>
                <td className="p-2.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-rose-400 font-bold font-mono">
                      {a.accumulatedDepreciation.toLocaleString()}
                    </span>
                    <button
                      onClick={() => {
                        const cc = costCenters.find((c) => c.id === a.costCenterId);
                        printAssetDepreciationCard(a, companySettings, cc?.nameAr);
                      }}
                      className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 rounded border border-slate-700/80 transition flex items-center gap-1 text-[10px] font-semibold"
                      title="طباعة كارت مجمع إهلاك هذا الأصل"
                    >
                      <Printer className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>طباعة</span>
                    </button>
                  </div>
                </td>
                <td className="p-2.5 text-emerald-400 font-bold">{a.bookValue.toLocaleString()}</td>
                <td className="p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => onCalculateDepreciation(a.id)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-[10px] font-bold border border-slate-700 flex items-center gap-1"
                      title="حساب قسط الإهلاك السنوي وتحديث الدفاتر"
                    >
                      <Calculator className="w-3 h-3" />
                      <span>حساب إهلاك</span>
                    </button>
                    <button
                      onClick={() => {
                        const cc = costCenters.find((c) => c.id === a.costCenterId);
                        printAssetDepreciationCard(a, companySettings, cc?.nameAr);
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 rounded-lg text-[10px] font-bold border border-slate-700 flex items-center gap-1"
                      title="طباعة كارت الأصل ومجمع الإهلاك"
                    >
                      <Printer className="w-3 h-3" />
                      <span>طباعة</span>
                    </button>
                    {onDeleteFixedAsset && (
                      <button
                        onClick={() => setDeleteConfirmAsset({ id: a.id, name: a.name })}
                        className="p-1 text-rose-400 hover:bg-slate-800 rounded transition"
                        title="حذف الأصل"
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

      {/* New Fixed Asset Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-5 text-slate-100 space-y-4">
            <h3 className="font-bold border-b border-slate-800 pb-2">إضافة أصل ثابت جديد للسجل</h3>
            <form onSubmit={handleSaveAsset} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">كود الأصل *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">اسم الأصل الثابت *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  placeholder="مثال: سيارة نقل شاحنة / مبنى المكاتب..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">التكلفة التاريخية *</label>
                  <input
                    type="number"
                    required
                    value={cost}
                    onChange={(e) => setCost(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-emerald-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">نسبة الإهلاك السنوية (%) *</label>
                  <input
                    type="number"
                    required
                    value={depreciationRate}
                    onChange={(e) => setDepreciationRate(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-amber-400 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">تاريخ الاقتناء للشراء *</label>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
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
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
                  حفظ الأصل الثابت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consolidated Depreciation Sheet Modal */}
      <ConsolidatedAssetsDepreciationModal
        isOpen={showConsolidatedModal}
        onClose={() => setShowConsolidatedModal(false)}
        fixedAssets={fixedAssets}
        costCenters={costCenters}
        companySettings={companySettings}
        onSaveJournalEntry={onSaveJournalEntry}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmAsset}
        message={`هل أنت تأكد من حذف الأصل الثابت (${deleteConfirmAsset?.name}) نهائياً؟`}
        onConfirm={() => {
          if (deleteConfirmAsset && onDeleteFixedAsset) {
            onDeleteFixedAsset(deleteConfirmAsset.id);
            setDeleteConfirmAsset(null);
          }
        }}
        onCancel={() => setDeleteConfirmAsset(null)}
      />

    </div>
  );
};
