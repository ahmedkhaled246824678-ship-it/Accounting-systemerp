import React, { useState } from "react";
import {
  X,
  Building2,
  Plus,
  Check,
  Building,
  DollarSign,
  Calendar,
  Phone,
  MapPin,
  FileSpreadsheet,
  CheckCircle2,
  Shield,
  Layers,
} from "lucide-react";
import { TenantCompany, CompanySettings, User } from "../types";

interface CompanyManagementModalProps {
  tenants: TenantCompany[];
  activeTenantId: string;
  currentUser?: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectTenant: (tenantId: string) => void;
  onAddTenant: (tenant: TenantCompany) => void;
}

export const CompanyManagementModal: React.FC<CompanyManagementModalProps> = ({
  tenants,
  activeTenantId,
  currentUser,
  isOpen,
  onClose,
  onSelectTenant,
  onAddTenant,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompany, setNewCompany] = useState<Partial<TenantCompany>>({
    companyName: "",
    code: "",
    taxNumber: "",
    commercialRegister: "",
    currency: "ج.م",
    currencySymbol: "EGP",
    financialYear: "2026",
    address: "القاهرة، جمهورية مصر العربية",
    phone: "01000000000",
    isActive: true,
  });

  if (!isOpen) return null;

  const isAdmin =
    currentUser?.role === "SUPER_ADMIN" ||
    currentUser?.role === "ADMIN" ||
    currentUser?.isSuperAdmin;

  const allowedTenants = isAdmin
    ? tenants
    : tenants.filter(
        (t) =>
          t.id === currentUser?.tenantId ||
          currentUser?.assignedTenantIds?.includes(t.id)
      );

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.companyName?.trim()) {
      alert("يرجى إدخال اسم الشركة أو المؤسسة");
      return;
    }

    const tenantId = "tenant-" + Date.now().toString().slice(-4);
    const code =
      newCompany.code?.trim() ||
      "COMP-" + Math.floor(100 + Math.random() * 900);

    const created: TenantCompany = {
      id: tenantId,
      code,
      companyName: newCompany.companyName.trim(),
      taxNumber: newCompany.taxNumber || "000-000-000",
      commercialRegister: newCompany.commercialRegister || "12345",
      currency: newCompany.currency || "ج.م",
      currencySymbol: newCompany.currencySymbol || "EGP",
      financialYear: newCompany.financialYear || "2026",
      address: newCompany.address || "القاهرة، مصر",
      phone: newCompany.phone || "",
      email: newCompany.email || "",
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    onAddTenant(created);
    setShowAddForm(false);
    onSelectTenant(tenantId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-[#11141B] border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#161B24] border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                نظام الشركات المتعددة (Multi-Tenant Management)
              </h3>
              <p className="text-[11px] text-gray-400">
                التبديل الفوري بين الشركات وعزل الحسابات والقيود لكل شركة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Active Company Banner */}
          <div className="p-3.5 bg-gradient-to-r from-blue-950/40 via-blue-900/20 to-[#161B24] border border-blue-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-300 font-bold text-base">
                {tenants.find((t) => t.id === activeTenantId)?.companyName?.charAt(0) || "ش"}
              </div>
              <div>
                <span className="text-[10px] text-blue-400 font-bold block">
                  الشركة النشطة الحالية
                </span>
                <span className="text-sm font-bold text-white block">
                  {tenants.find((t) => t.id === activeTenantId)?.companyName || "الشركة الافتراضية"}
                </span>
                <span className="text-[10px] text-gray-400">
                  العملة: {tenants.find((t) => t.id === activeTenantId)?.currency} • السنة المالية:{" "}
                  {tenants.find((t) => t.id === activeTenantId)?.financialYear}
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>مفعلة ونشطة</span>
            </span>
          </div>

          {/* Add Company Toggle (For Admins) */}
          {isAdmin && (
            <div className="flex justify-between items-center pt-2">
              <span className="font-bold text-gray-200">
                قائمة الشركات والمؤسسات المتاحة ({allowedTenants.length}):
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg font-semibold transition text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddForm ? "إلغاء الإضافة" : "إضافة شركة جديدة"}</span>
              </button>
            </div>
          )}

          {/* Add New Company Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreateCompany}
              className="p-4 bg-[#161B24] border border-blue-500/40 rounded-xl space-y-3 animate-fade-in"
            >
              <h4 className="font-bold text-white text-xs flex items-center gap-1.5 text-blue-400">
                <Building className="w-4 h-4" />
                <span>بيانات الشركة / المؤسسة الجديدة:</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    اسم الشركة / المؤسسة *:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: شركة النور للحلول البرمجية"
                    value={newCompany.companyName}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, companyName: e.target.value })
                    }
                    className="w-full bg-[#1A1F2B] border border-gray-700 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    كود الشركة الفريد:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: COMP-202"
                    value={newCompany.code}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, code: e.target.value })
                    }
                    className="w-full bg-[#1A1F2B] border border-gray-700 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    الرقم الضريبي:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 300-456-789"
                    value={newCompany.taxNumber}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, taxNumber: e.target.value })
                    }
                    className="w-full bg-[#1A1F2B] border border-gray-700 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    السجل التجاري:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 987654"
                    value={newCompany.commercialRegister}
                    onChange={(e) =>
                      setNewCompany({
                        ...newCompany,
                        commercialRegister: e.target.value,
                      })
                    }
                    className="w-full bg-[#1A1F2B] border border-gray-700 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    عملة الحسابات:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: ج.م أو ر.س أو $"
                    value={newCompany.currency}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, currency: e.target.value })
                    }
                    className="w-full bg-[#1A1F2B] border border-gray-700 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    السنة المالية:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 2026"
                    value={newCompany.financialYear}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, financialYear: e.target.value })
                    }
                    className="w-full bg-[#1A1F2B] border border-gray-700 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-gray-400 hover:text-white rounded-lg text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow"
                >
                  حفظ وتفعيل الشركة فوراً
                </button>
              </div>
            </form>
          )}

          {/* Companies List Cards */}
          <div className="grid grid-cols-1 gap-2.5">
            {allowedTenants.map((t) => {
              const isCurrent = t.id === activeTenantId;
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    if (!isCurrent) {
                      onSelectTenant(t.id);
                      onClose();
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    isCurrent
                      ? "bg-blue-600/10 border-blue-500 shadow-md ring-1 ring-blue-500/50"
                      : "bg-[#161B24] border-gray-800 hover:border-gray-700 hover:bg-[#1A1F2B]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isCurrent
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800 text-gray-300"
                      }`}
                    >
                      {t.companyName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">
                          {t.companyName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
                          {t.code}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2">
                        <span>س.ت: {t.commercialRegister}</span>
                        <span>•</span>
                        <span>ض.ق: {t.taxNumber}</span>
                        <span>•</span>
                        <span>العملة: {t.currency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCurrent ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>الشركة الحالية</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="px-3 py-1 bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-300 rounded-lg text-[11px] font-semibold border border-gray-700 transition"
                      >
                        التبديل إلى هذه الشركة
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#161B24] border-t border-gray-800 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            💡 يتم عزل كافة قيود اليومية وحسابات الأستاذ والخزينة والمخازن لكل شركة على حدة.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
