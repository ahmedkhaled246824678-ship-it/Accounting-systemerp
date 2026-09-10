import React, { useState } from "react";
import {
  FolderKanban,
  Plus,
  Printer,
  FileSpreadsheet,
  Building,
  DollarSign,
  Briefcase,
  FileText,
  Search,
  Trash2,
} from "lucide-react";
import { CompanySettings, CostCenter, JournalEntry, TreasuryVoucher, BankVoucher, FilterParams } from "../types";
import { exportToExcel, printReport } from "../utils/export";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface CostCentersViewProps {
  costCenters: CostCenter[];
  journalEntries: JournalEntry[];
  treasuryVouchers: TreasuryVoucher[];
  bankVouchers: BankVoucher[];
  companySettings: CompanySettings;
  filterParams: FilterParams;
  onSaveCostCenter: (center: CostCenter) => void;
  onDeleteCostCenter?: (centerId: string) => void;
}

export const CostCentersView: React.FC<CostCentersViewProps> = ({
  costCenters,
  journalEntries,
  treasuryVouchers,
  bankVouchers,
  companySettings,
  filterParams,
  onSaveCostCenter,
  onDeleteCostCenter,
}) => {
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(costCenters[0]?.id || null);
  const [showModal, setShowModal] = useState(false);
  const [editingCenter, setEditingCenter] = useState<CostCenter | null>(null);
  const [deleteConfirmCenter, setDeleteConfirmCenter] = useState<{ id: string; name: string } | null>(null);

  // Form State
  const [code, setCode] = useState(`CC-${costCenters.length + 101}`);
  const [name, setName] = useState("");
  const [type, setType] = useState<"PROJECT" | "DEPARTMENT" | "BRANCH">("PROJECT");
  const [projectManager, setProjectManager] = useState("");
  const [budget, setBudget] = useState<number | "">("");
  const [description, setDescription] = useState("");

  const openAddModal = () => {
    setEditingCenter(null);
    setCode(`CC-${costCenters.length + 101}`);
    setName("");
    setType("PROJECT");
    setProjectManager("");
    setBudget("");
    setDescription("");
    setShowModal(true);
  };

  const openEditModal = (cc: CostCenter) => {
    setEditingCenter(cc);
    setCode(cc.code);
    setName(cc.name);
    setType(cc.type);
    setProjectManager(cc.projectManager || "");
    setBudget(cc.budget);
    setDescription(cc.description || "");
    setShowModal(true);
  };

  const handleSaveCenter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const centerData: CostCenter = {
      id: editingCenter ? editingCenter.id : "CC-" + Date.now(),
      code: code || `CC-${Date.now()}`,
      name,
      type,
      projectManager,
      budget: Number(budget) || 0,
      spent: editingCenter ? editingCenter.spent : 0,
      status: editingCenter ? editingCenter.status : "ACTIVE",
      startDate: editingCenter ? editingCenter.startDate : new Date().toISOString().split("T")[0],
      description,
    };

    onSaveCostCenter(centerData);
    setShowModal(false);
    setEditingCenter(null);
    setName("");
    setBudget("");
  };

  const selectedCenter = costCenters.find((c) => c.id === selectedCenterId);

  // Detailed Transaction Analysis for Selected Project/Cost Center
  const centerTransactions = React.useMemo(() => {
    if (!selectedCenterId) return [];

    const list: {
      date: string;
      docNumber: string;
      type: string;
      description: string;
      amount: number;
    }[] = [];

    // Journal Entry lines
    journalEntries.forEach((je) => {
      je.lines.forEach((l) => {
        if (l.costCenterId === selectedCenterId && l.debit > 0) {
          list.push({
            date: je.date,
            docNumber: je.entryNumber,
            type: "قيد يومية",
            description: l.note || je.notes || "مصروف مشروع",
            amount: l.debit,
          });
        }
      });
    });

    // Treasury Vouchers
    treasuryVouchers.forEach((tv) => {
      if (tv.costCenterId === selectedCenterId) {
        list.push({
          date: tv.date,
          docNumber: tv.voucherNumber,
          type: tv.voucherType === "PAYMENT" ? "مصروف خزينة" : "إيراد خزينة",
          description: tv.notes,
          amount: tv.amount,
        });
      }
    });

    return list.sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [selectedCenterId, journalEntries, treasuryVouchers]);

  // Print Project Detail Report On Demand (طباعة تفاصيل المشروع حسب الطلب)
  const handlePrintProjectReport = () => {
    if (!selectedCenter) return;

    const rows = centerTransactions
      .map(
        (t) => `
        <tr>
          <td>${t.date}</td>
          <td>${t.docNumber}</td>
          <td>${t.type}</td>
          <td>${t.description}</td>
          <td style="font-weight: bold; color: #b91c1c;">${t.amount.toLocaleString()} ${companySettings.currency}</td>
        </tr>
      `
      )
      .join("");

    const totalSpent = centerTransactions.reduce((s, t) => s + t.amount, 0);

    const html = `
      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #1e3a8a;">تقرير تفاصيل المشروع / مركز التكلفة: ${selectedCenter.name}</h3>
        <p><strong>كود المشروع:</strong> ${selectedCenter.code} | <strong>النوع:</strong> ${selectedCenter.type}</p>
        <p><strong>مدير المشروع:</strong> ${selectedCenter.projectManager || "غير محدد"}</p>
        <p><strong>الميزانية المعتمدة:</strong> ${selectedCenter.budget.toLocaleString()} ${companySettings.currency}</p>
        <p><strong>إجمالي المنصرف الحقيقي:</strong> <span style="color: #b91c1c; font-weight: bold;">${totalSpent.toLocaleString()} ${companySettings.currency}</span></p>
        <p><strong>المتبقي من الميزانية:</strong> ${(selectedCenter.budget - totalSpent).toLocaleString()} ${companySettings.currency}</p>
      </div>

      <h4>جدول المعاملات والمصروفات التفصيلية الخاصة بالمشروع:</h4>
      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>رقم المستند / القيد</th>
            <th>نوع المعاملة</th>
            <th>البيان والتفاصيل</th>
            <th>المبلغ المصروف</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="font-weight: bold; background: #f1f5f9;">
            <td colspan="4">مجموع المنصرف الإجمالي للمشروع:</td>
            <td style="color: #b91c1c;">${totalSpent.toLocaleString()} ${companySettings.currency}</td>
          </tr>
        </tbody>
      </table>
    `;

    printReport(`تقرير تفاصيل مشروع - ${selectedCenter.name}`, html, companySettings);
  };

  // Export Project Details to Excel
  const handleExportProjectToExcel = () => {
    if (!selectedCenter) return;
    const exportData = centerTransactions.map((t) => ({
      التاريخ: t.date,
      "رقم القيد/السند": t.docNumber,
      "نوع الحركة": t.type,
      "البيان والتفاصيل": t.description,
      "المبلغ المصروف": t.amount,
    }));

    exportToExcel(
      exportData,
      `تفاصيل_مشروع_${selectedCenter.code}_${selectedCenter.name}`
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-blue-400" />
            <span>مراكز التكلفة والمشاريع وتقارير التكاليف</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            ربط العمليات بمركز التكلفة الخاص بكل مشروع وطباعة التقرير التفصيلي لكل مشروع حسب الطلب
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مركز تكلفة / مشروع جديد</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Projects List */}
        <div className="lg:col-span-5 space-y-3">
          {costCenters.map((cc) => {
            const isSelected = selectedCenterId === cc.id;
            return (
              <div
                key={cc.id}
                onClick={() => setSelectedCenterId(cc.id)}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  isSelected
                    ? "bg-blue-950/40 border-blue-500 text-white shadow-md"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-blue-400">{cc.code}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {cc.type === "PROJECT" ? "مشروع" : "قسم"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(cc);
                      }}
                      className="p-1 text-blue-400 hover:bg-slate-800 rounded transition"
                      title="تعديل الميزانية والبيانات"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                    </button>
                    {onDeleteCostCenter && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmCenter({ id: cc.id, name: cc.name });
                        }}
                        className="p-1 text-rose-400 hover:bg-slate-800 rounded transition"
                        title="حذف مركز التكلفة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <h4 className="font-bold text-sm">{cc.name}</h4>
                <p className="text-xs text-slate-400 mt-1">مدير المشروع: {cc.projectManager || "غير محدد"}</p>

                <div className="mt-3 text-xs flex justify-between border-t border-slate-800/80 pt-2">
                  <span>الميزانية: {cc.budget.toLocaleString()} {companySettings.currency}</span>
                  <span className="text-rose-400 font-bold">المنصرف: {cc.spent.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Detailed Project Report Preview */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          {selectedCenter ? (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                <div>
                  <h3 className="font-bold text-white text-base">{selectedCenter.name}</h3>
                  <p className="text-xs text-slate-400">
                    تقرير تفصيلي شامل لكافة التكاليف والمصروفات المسجلة على المشروع
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintProjectReport}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة تقرير المشروع</span>
                  </button>
                  <button
                    onClick={handleExportProjectToExcel}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs"
                    title="تصدير إكسل"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Transactions Table for selected project */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right text-slate-300">
                  <thead className="bg-slate-800 text-slate-400">
                    <tr>
                      <th className="p-2.5">التاريخ</th>
                      <th className="p-2.5">رقم المستند</th>
                      <th className="p-2.5">نوع الحركة</th>
                      <th className="p-2.5">البيان والشرح</th>
                      <th className="p-2.5">المبلغ المصروف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {centerTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-500">
                          لا توجد مصروفات أو حركات مقيدة حتى الآن لهذا المشروع
                        </td>
                      </tr>
                    ) : (
                      centerTransactions.map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="p-2.5">{t.date}</td>
                          <td className="p-2.5 font-bold font-mono text-blue-400">{t.docNumber}</td>
                          <td className="p-2.5">{t.type}</td>
                          <td className="p-2.5 max-w-xs truncate">{t.description}</td>
                          <td className="p-2.5 font-bold text-rose-400">
                            {t.amount.toLocaleString()} {companySettings.currency}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              يرجى اختيار مشروع من القائمة لمشاهدة التفاصيل وطباعة التقرير.
            </div>
          )}
        </div>

      </div>

      {/* New Cost Center Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-5 text-slate-100 space-y-4">
            <h3 className="font-bold border-b border-slate-800 pb-2">
              {editingCenter ? "تعديل الميزانية وبيانات مركز التكلفة" : "إضافة مركز تكلفة / مشروع جديد"}
            </h3>
            <form onSubmit={handleSaveCenter} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">الكود التعريف *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">اسم المشروع / مركز التكلفة *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">مدير المشروع المسؤول</label>
                <input
                  type="text"
                  value={projectManager}
                  onChange={(e) => setProjectManager(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">الميزانية التقديرية المعتمدة *</label>
                <input
                  type="number"
                  required
                  value={budget}
                  onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : "")}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-emerald-400 font-bold"
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
                  حفظ المشروع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmCenter}
        message={`هل أنت تأكد من حذف مركز التكلفة / المشروع (${deleteConfirmCenter?.name}) نهائياً؟`}
        onConfirm={() => {
          if (deleteConfirmCenter && onDeleteCostCenter) {
            onDeleteCostCenter(deleteConfirmCenter.id);
            if (selectedCenterId === deleteConfirmCenter.id) {
              setSelectedCenterId(costCenters.find((c) => c.id !== deleteConfirmCenter.id)?.id || null);
            }
            setDeleteConfirmCenter(null);
          }
        }}
        onCancel={() => setDeleteConfirmCenter(null)}
      />

    </div>
  );
};
