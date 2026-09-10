import React, { useState } from "react";
import {
  Boxes,
  Plus,
  Printer,
  FileSpreadsheet,
  AlertTriangle,
  PackageCheck,
  Trash2,
  Edit2,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  Search,
  Clock,
  BellRing,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { CompanySettings, InventoryItem, InventoryMovement, FilterParams } from "../types";
import { exportToExcel, printReport } from "../utils/export";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface InventoryViewProps {
  inventoryItems: InventoryItem[];
  inventoryMovements?: InventoryMovement[];
  companySettings: CompanySettings;
  filterParams: FilterParams;
  onSaveInventoryItem: (item: InventoryItem) => void;
  onDeleteInventoryItem?: (itemId: string) => void;
  onSaveInventoryMovement?: (movement: InventoryMovement) => void;
  onDeleteInventoryMovement?: (movementId: string) => void;
}

const PRESET_UNITS = [
  "قطعة",
  "كرتونة",
  "كيلو",
  "طن",
  "متر",
  "متر مربع",
  "متر مكعب",
  "علبة",
  "لتر",
  "طقم",
  "حبة",
  "ألف طوبة",
  "شكارة",
  "وحدة مخصصة",
];

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventoryItems,
  inventoryMovements = [],
  companySettings,
  filterParams,
  onSaveInventoryItem,
  onDeleteInventoryItem,
  onSaveInventoryMovement,
  onDeleteInventoryMovement,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"items" | "movements" | "alerts">("items");

  // Item Modal state (Add / Edit)
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [unitSelect, setUnitSelect] = useState("قطعة");
  const [customUnit, setCustomUnit] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [unitCost, setUnitCost] = useState<number | "">("");
  const [minLevel, setMinLevel] = useState<number | "">(10);
  const [alertPeriodDays, setAlertPeriodDays] = useState<number | "">(7);
  const [alertMessage, setAlertMessage] = useState("");
  const [category, setCategory] = useState("مواد عامة");
  const [location, setLocation] = useState("المستودع الرئيسي");
  const [description, setDescription] = useState("");

  // Movement Modal state (Quick Issue / Receipt)
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<"IN" | "OUT">("IN");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [movementQty, setMovementQty] = useState<number | "">("");
  const [movementUnitCost, setMovementUnitCost] = useState<number | "">("");
  const [movementRef, setMovementRef] = useState("");
  const [movementDate, setMovementDate] = useState(new Date().toISOString().split("T")[0]);
  const [movementNotes, setMovementNotes] = useState("");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState(filterParams.query || "");
  const [movementTypeFilter, setMovementTypeFilter] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [selectedItemFilter, setSelectedItemFilter] = useState("");

  // Confirm delete item / movement
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmMov, setDeleteConfirmMov] = useState<{ id: string; ref: string } | null>(null);

  // Low stock items
  const lowStockItems = inventoryItems.filter((i) => i.quantity <= i.minLevel);

  // Handle open Add Item Modal
  const handleOpenAddItem = () => {
    setEditingItem(null);
    setSku(`SKU-${String(inventoryItems.length + 101)}`);
    setName("");
    setUnitSelect("قطعة");
    setCustomUnit("");
    setQuantity("");
    setUnitCost("");
    setMinLevel(10);
    setAlertPeriodDays(7);
    setAlertMessage("");
    setCategory("مواد عامة");
    setLocation("المستودع الرئيسي");
    setDescription("");
    setShowItemModal(true);
  };

  // Handle open Edit Item Modal
  const handleOpenEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setSku(item.sku);
    setName(item.name);
    if (PRESET_UNITS.includes(item.unit)) {
      setUnitSelect(item.unit);
      setCustomUnit("");
    } else {
      setUnitSelect("وحدة مخصصة");
      setCustomUnit(item.unit);
    }
    setQuantity(item.quantity);
    setUnitCost(item.unitCost);
    setMinLevel(item.minLevel);
    setAlertPeriodDays(item.alertPeriodDays || 7);
    setAlertMessage(item.alertMessage || "");
    setCategory(item.category || "مواد عامة");
    setLocation(item.location || "المستودع الرئيسي");
    setDescription(item.description || "");
    setShowItemModal(true);
  };

  // Handle Save Item
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || quantity === "" || unitCost === "") return;

    const q = Number(quantity);
    const cost = Number(unitCost);
    const finalUnit = unitSelect === "وحدة مخصصة" ? customUnit || "وحدة" : unitSelect;

    const itemObj: InventoryItem = {
      id: editingItem ? editingItem.id : "INV-" + Date.now(),
      sku: sku || `SKU-${Date.now()}`,
      name,
      unit: finalUnit,
      quantity: q,
      unitCost: cost,
      totalValue: q * cost,
      minLevel: Number(minLevel) || 5,
      alertPeriodDays: Number(alertPeriodDays) || 7,
      alertMessage: alertMessage || undefined,
      category,
      location,
      description,
    };

    onSaveInventoryItem(itemObj);
    setShowItemModal(false);
  };

  // Handle Open Quick Movement Modal (Issue or Receipt)
  const handleOpenMovementModal = (type: "IN" | "OUT", presetItemId?: string) => {
    setMovementType(type);
    const targetItem = inventoryItems.find((i) => i.id === presetItemId) || inventoryItems[0];
    const initialItemId = targetItem ? targetItem.id : "";
    setSelectedItemId(initialItemId);
    setMovementQty("");
    setMovementUnitCost(targetItem ? targetItem.unitCost : "");
    setMovementRef(type === "IN" ? `إذن-إضافة-${String(inventoryMovements.length + 101)}` : `إذن-صرف-${String(inventoryMovements.length + 101)}`);
    setMovementDate(new Date().toISOString().split("T")[0]);
    setMovementNotes("");
    setShowMovementModal(true);
  };

  // Handle Item selection change in Movement Modal
  const handleMovementItemChange = (itemId: string) => {
    setSelectedItemId(itemId);
    const item = inventoryItems.find((i) => i.id === itemId);
    if (item) {
      setMovementUnitCost(item.unitCost);
    }
  };

  // Handle Save Movement
  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !movementQty || Number(movementQty) <= 0) return;

    const item = inventoryItems.find((i) => i.id === selectedItemId);
    if (!item) return;

    const q = Number(movementQty);
    const cost = movementUnitCost !== "" ? Number(movementUnitCost) : item.unitCost;

    const movement: InventoryMovement = {
      id: "MOV-" + Date.now(),
      itemId: item.id,
      itemSku: item.sku,
      itemName: item.name,
      type: movementType,
      quantity: q,
      unitCost: cost,
      totalValue: q * cost,
      unit: item.unit,
      date: movementDate,
      reference: movementRef || (movementType === "IN" ? "إذن-إضافة-مباشر" : "إذن-صرف-مباشر"),
      notes: movementNotes || (movementType === "IN" ? "إضافة ورصيد مخزني مباشر" : "صرف بضاعة ومخزون مباشر"),
      createdAt: new Date().toISOString(),
    };

    if (onSaveInventoryMovement) {
      onSaveInventoryMovement(movement);
    } else {
      // Fallback update item directly
      const newQty = movementType === "IN" ? item.quantity + q : Math.max(0, item.quantity - q);
      onSaveInventoryItem({
        ...item,
        quantity: newQty,
        totalValue: newQty * item.unitCost,
      });
    }

    setShowMovementModal(false);
  };

  const totalInventoryValuation = inventoryItems.reduce((s, i) => s + i.totalValue, 0);

  // Filtered Items
  const filteredItems = inventoryItems.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      (item.unit && item.unit.toLowerCase().includes(q))
    );
  });

  // Filtered Movements
  const filteredMovements = inventoryMovements.filter((mov) => {
    // Explicitly exclude any tax or VAT movements
    if (
      mov.notes?.includes("ضريبة") ||
      mov.notes?.includes("قيمة مضافة") ||
      mov.notes?.toLowerCase().includes("vat") ||
      mov.reference?.includes("ضريبة")
    ) {
      return false;
    }
    if (movementTypeFilter !== "ALL" && mov.type !== movementTypeFilter) return false;
    if (selectedItemFilter && mov.itemId !== selectedItemFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        mov.itemName.toLowerCase().includes(q) ||
        mov.itemSku.toLowerCase().includes(q) ||
        mov.reference.toLowerCase().includes(q) ||
        (mov.notes && mov.notes.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Print Inventory Report
  const handlePrintInventory = () => {
    const rows = filteredItems
      .map(
        (i) => `
        <tr>
          <td>${i.sku}</td>
          <td>${i.name}</td>
          <td>${i.unit}</td>
          <td style="font-weight: bold; ${i.quantity <= i.minLevel ? "color: red;" : ""}">${i.quantity}</td>
          <td>${i.unitCost.toLocaleString()} ${companySettings.currency}</td>
          <td style="font-weight: bold; color: green;">${i.totalValue.toLocaleString()} ${companySettings.currency}</td>
          <td>${i.quantity <= i.minLevel ? `تحت الحد الأدنى (${i.minLevel}) - مهلة التوريد ${i.alertPeriodDays || 7} أيام` : "وفرة متاحة"}</td>
        </tr>
      `
      )
      .join("");

    const html = `
      <table>
        <thead>
          <tr>
            <th>كود SKU</th>
            <th>اسم الصنف</th>
            <th>الوحدة</th>
            <th>الكمية بالمخزن</th>
            <th>سعر التكلفة</th>
            <th>إجمالي قيمة الجرد</th>
            <th>الحالة ومهلة إعادة التوريد</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="font-weight: bold; background: #f1f5f9;">
            <td colspan="5">إجمالي التقييم المخزني للبضاعة:</td>
            <td style="color: green;">${totalInventoryValuation.toLocaleString()} ${companySettings.currency}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    `;

    printReport("تقرير جرد المخزون والمنتجات التفصيلي", html, companySettings);
  };

  // Export Inventory Items to Excel
  const handleExportItemsToExcel = () => {
    const data = inventoryItems.map((i) => ({
      "كود الصنف": i.sku,
      "اسم الصنف": i.name,
      الوحـدة: i.unit,
      "الكمية المتوفرة": i.quantity,
      "تكلفة الوحدة": i.unitCost,
      "إجمالي القيمة التقييمية": i.totalValue,
      "حد إعادة الطلب (الأدنى)": i.minLevel,
      "مدة مهلة التنبيه (أيام)": i.alertPeriodDays || 7,
      "رسالة التنبيه المباشرة": i.alertMessage || "-",
    }));

    exportToExcel(data, `جرد_المخزون_والبضاعة_${companySettings.companyName}`);
  };

  // Export Movement Log to Excel
  const handleExportMovementsToExcel = () => {
    const data = filteredMovements.map((m) => ({
      التاريخ: m.date,
      "نوع الحركة": m.type === "IN" ? "إذن إضافة (+)" : "إذن صرف (-)",
      "رقم الإذن / القيد": m.reference,
      "كود الصنف": m.itemSku,
      "اسم الصنف": m.itemName,
      الكمية: m.quantity,
      الوحدة: m.unit,
      "سعر التكلفة": m.unitCost,
      "إجمالي المبلغ": m.totalValue,
      البيان: m.notes || "-",
    }));

    exportToExcel(data, `سجل_حركات_المخزون_${companySettings.companyName}`);
  };

  // Print Movement Log Report
  const handlePrintMovements = () => {
    const rows = filteredMovements
      .map(
        (m) => `
        <tr>
          <td>${m.date}</td>
          <td style="font-weight: bold; color: ${m.type === "IN" ? "green" : "red"};">
            ${m.type === "IN" ? "إذن إضافة (+)" : "إذن صرف (-)"}
          </td>
          <td>${m.reference}</td>
          <td>${m.itemSku} - ${m.itemName}</td>
          <td style="font-weight: bold;">${m.quantity} ${m.unit}</td>
          <td>${m.unitCost.toLocaleString()} ${companySettings.currency}</td>
          <td style="font-weight: bold;">${m.totalValue.toLocaleString()} ${companySettings.currency}</td>
          <td>${m.notes || "-"}</td>
        </tr>
      `
      )
      .join("");

    const html = `
      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>نوع الحركة</th>
            <th>رقم الإذن/القيد</th>
            <th>الصنف المخزني</th>
            <th>الكمية</th>
            <th>التكلفة</th>
            <th>إجمالي القيمة</th>
            <th>البيان والملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    printReport("تقرير سجل حركات المخزون التفصيلي (إضافة وصرف)", html, companySettings);
  };

  return (
    <div className="space-y-6">
      {/* Direct Alert Banners for Low Stock Items */}
      {lowStockItems.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950/80 via-rose-900/40 to-slate-900 border-2 border-rose-500/60 rounded-xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-rose-500/30 pb-2">
            <h3 className="text-sm font-extrabold text-rose-300 flex items-center gap-2">
              <BellRing className="w-5 h-5 text-rose-400 animate-bounce" />
              <span>تنبيهات المخزون والحد الأدنى المباشرة ({lowStockItems.length} أصناف وصلت للحد الأدنى)</span>
            </h3>
            <span className="text-xs bg-rose-500/20 text-rose-200 border border-rose-500/40 px-2.5 py-1 rounded-full font-bold">
              تنبيه عاجل لإعادة الطلب
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900/90 border border-rose-500/40 rounded-lg p-3 flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{item.name} ({item.sku})</span>
                    <span className="text-[11px] font-mono bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded border border-rose-500/30 font-bold">
                      المتبقي: {item.quantity} {item.unit} (الحد: {item.minLevel})
                    </span>
                  </div>
                  <p className="text-xs text-rose-200 mt-1.5 leading-relaxed">
                    {item.alertMessage ? (
                      item.alertMessage
                    ) : (
                      <>
                        وصل مخزون الصنف إلى الحد الأدنى المحدد!{" "}
                        <span className="font-bold text-amber-300">
                          مدة التنبيه ومهلة إعادة التوريد المحددة: ({item.alertPeriodDays || 7} أيام).
                        </span>{" "}
                        يرجى إصدار إذن توريد وشراء عاجل لتفادي نفاد البضاعة.
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => handleOpenMovementModal("IN", item.id)}
                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-xs font-bold transition shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إذن إضافة وتوريد عاجل</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 text-blue-400" />
            <span>إدارة المخزون، أذونات الإضافة والصرف وسجل الحركات</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            تتبع حركات التوريد والصرف، التأثير المباشر من القيود، حدود إعادة الطلب والتنبيهات
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenMovementModal("IN")}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>إذن إضافة للمخزون (+)</span>
          </button>
          <button
            onClick={() => handleOpenMovementModal("OUT")}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>إذن صرف من المخزون (-)</span>
          </button>
          <button
            onClick={handleOpenAddItem}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صنف مخزني جديد</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-slate-400">إجمالي الأصناف بالمخزن</span>
          <p className="text-2xl font-extrabold text-white">{inventoryItems.length} أصناف</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-slate-400">إجمالي التقييم المخزني للمنتجات</span>
          <p className="text-2xl font-extrabold text-emerald-400">
            {totalInventoryValuation.toLocaleString()} {companySettings.currency}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-slate-400">إجمالي حركات المخزون المسجلة</span>
          <p className="text-2xl font-extrabold text-blue-400">{inventoryMovements.length} حركة</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-slate-400">أصناف تحت حد إعادة الطلب</span>
          <p className="text-2xl font-extrabold text-rose-400">{lowStockItems.length} أصناف</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full md:w-auto">
          <button
            onClick={() => setActiveSubTab("items")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeSubTab === "items"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>جدول الأصناف والجرد</span>
          </button>

          <button
            onClick={() => setActiveSubTab("movements")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeSubTab === "movements"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <History className="w-4 h-4" />
            <span>سجل حركات المخزون (إضافة وصرف) ({inventoryMovements.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("alerts")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition relative ${
              activeSubTab === "alerts"
                ? "bg-rose-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <BellRing className="w-4 h-4" />
            <span>التنبيهات والحد الأدنى</span>
            {lowStockItems.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                {lowStockItems.length}
              </span>
            )}
          </button>
        </div>

        {/* Export and Search Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="بحث في الأصناف والحركات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {activeSubTab === "items" && (
            <>
              <button
                onClick={handlePrintInventory}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
              >
                <Printer className="w-4 h-4 text-blue-400" />
                <span className="hidden sm:inline">طباعة</span>
              </button>
              <button
                onClick={handleExportItemsToExcel}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">إكسل</span>
              </button>
            </>
          )}

          {activeSubTab === "movements" && (
            <>
              <button
                onClick={handlePrintMovements}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
              >
                <Printer className="w-4 h-4 text-blue-400" />
                <span className="hidden sm:inline">طباعة السجل</span>
              </button>
              <button
                onClick={handleExportMovementsToExcel}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">تصدير السجل</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* SubTab 1: Items Table */}
      {activeSubTab === "items" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-x-auto">
          <table className="w-full text-xs text-right text-slate-300">
            <thead className="bg-slate-800 text-slate-400">
              <tr>
                <th className="p-2.5">الكود SKU</th>
                <th className="p-2.5">اسم الصنف والتصنيف</th>
                <th className="p-2.5">الوحدة</th>
                <th className="p-2.5">الكمية بالمخزن</th>
                <th className="p-2.5">تكلفة الوحدة</th>
                <th className="p-2.5">إجمالي قيمة الجرد</th>
                <th className="p-2.5">حد إعادة الطلب</th>
                <th className="p-2.5">حالة المخزون والمهلة</th>
                <th className="p-2.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredItems.map((i) => {
                const isLow = i.quantity <= i.minLevel;
                return (
                  <tr key={i.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-2.5 font-bold font-mono text-blue-400">{i.sku}</td>
                    <td className="p-2.5">
                      <div className="font-semibold text-white">{i.name}</div>
                      <div className="text-[10px] text-slate-400">{i.category || "عام"}</div>
                    </td>
                    <td className="p-2.5">
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-semibold border border-slate-700">
                        {i.unit}
                      </span>
                    </td>
                    <td className={`p-2.5 font-bold text-sm ${isLow ? "text-rose-400" : "text-white"}`}>
                      {i.quantity.toLocaleString()}
                    </td>
                    <td className="p-2.5 font-semibold">
                      {i.unitCost.toLocaleString()} {companySettings.currency}
                    </td>
                    <td className="p-2.5 font-bold text-emerald-400">
                      {i.totalValue.toLocaleString()} {companySettings.currency}
                    </td>
                    <td className="p-2.5 font-mono text-amber-300 font-bold">{i.minLevel}</td>
                    <td className="p-2.5">
                      {isLow ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded text-[10px] border border-rose-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            <span>تحت الحد الأدنى</span>
                          </span>
                          <div className="text-[10px] text-amber-400 font-semibold">
                            مهلة إعادة الطلب: {i.alertPeriodDays || 7} أيام
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] border border-emerald-500/20">
                          <PackageCheck className="w-3 h-3" />
                          <span>وفرة متاحة</span>
                        </span>
                      )}
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenMovementModal("IN", i.id)}
                          className="p-1 text-emerald-400 hover:bg-slate-800 rounded transition"
                          title="إذن إضافة للمخزون"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenMovementModal("OUT", i.id)}
                          className="p-1 text-rose-400 hover:bg-slate-800 rounded transition"
                          title="إذن صرف من المخزون"
                        >
                          <ArrowDownLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditItem(i)}
                          className="p-1 text-blue-400 hover:bg-slate-800 rounded transition"
                          title="تعديل الصنف والوحدة والحد الأدنى"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteInventoryItem && (
                          <button
                            onClick={() => setDeleteConfirmItem({ id: i.id, name: i.name })}
                            className="p-1 text-rose-400 hover:bg-slate-800 rounded transition"
                            title="حذف الصنف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500">
                    لا توجد أصناف مخزنية تطابق نطاق البحث.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SubTab 2: Inventory Movement Audit Log */}
      {activeSubTab === "movements" && (
        <div className="space-y-4">
          {/* Filters Bar for Movements */}
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-blue-400" />
                <span>تصفية الحركات:</span>
              </span>

              <select
                value={movementTypeFilter}
                onChange={(e) => setMovementTypeFilter(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
              >
                <option value="ALL">جميع أنواع الحركات (إضافة وصرف)</option>
                <option value="IN">أذونات وجداول الإضافة (+)</option>
                <option value="OUT">أذونات وجداول الصرف (-)</option>
              </select>

              <select
                value={selectedItemFilter}
                onChange={(e) => setSelectedItemFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
              >
                <option value="">جميع الأصناف المخزنية</option>
                {inventoryItems.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.sku} - {inv.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-slate-400 font-mono">
              إجمالي الحركات المعروضة: <span className="text-white font-bold">{filteredMovements.length}</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-x-auto">
            <table className="w-full text-xs text-right text-slate-300">
              <thead className="bg-slate-800 text-slate-400">
                <tr>
                  <th className="p-2.5">التاريخ</th>
                  <th className="p-2.5">نوع الحركة</th>
                  <th className="p-2.5">رقم الإذن / القيد</th>
                  <th className="p-2.5">الصنف المخزني (SKU)</th>
                  <th className="p-2.5">الكمية والوحدة</th>
                  <th className="p-2.5">تكلفة الوحدة</th>
                  <th className="p-2.5">إجمالي المبلغ</th>
                  <th className="p-2.5">البيان والملاحظات</th>
                  <th className="p-2.5 text-center">إلغاء الحركة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredMovements.map((m) => {
                  const isAdd = m.type === "IN";
                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-2.5 text-slate-300 font-mono">{m.date}</td>
                      <td className="p-2.5">
                        {isAdd ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] border border-emerald-500/20">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>إذن إضافة (+)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded text-[10px] border border-rose-500/20">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            <span>إذن صرف (-)</span>
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-bold font-mono text-blue-300">{m.reference}</td>
                      <td className="p-2.5 font-semibold text-white">
                        {m.itemName} <span className="text-[10px] text-slate-400 font-mono">({m.itemSku})</span>
                      </td>
                      <td className={`p-2.5 font-bold ${isAdd ? "text-emerald-400" : "text-rose-400"}`}>
                        {isAdd ? "+" : "-"}{m.quantity} {m.unit}
                      </td>
                      <td className="p-2.5">{m.unitCost.toLocaleString()} {companySettings.currency}</td>
                      <td className="p-2.5 font-bold text-white">
                        {m.totalValue.toLocaleString()} {companySettings.currency}
                      </td>
                      <td className="p-2.5 text-slate-400">{m.notes || "-"}</td>
                      <td className="p-2.5 text-center">
                        {onDeleteInventoryMovement && (
                          <button
                            onClick={() => setDeleteConfirmMov({ id: m.id, ref: m.reference })}
                            className="p-1 text-rose-400 hover:bg-slate-800 rounded transition"
                            title="إلغاء وتراجـع عن حركة المخزون"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-500">
                      لا توجد حركات مخزنية مسجلة تطابق التصفية.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab 3: Low Stock Alerts & Minimum Thresholds */}
      {activeSubTab === "alerts" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white flex items-center gap-2">
                <BellRing className="w-5 h-5 text-rose-400" />
                <span>شاشة التنبيهات المباشرة وحدود الطلب الأدنى</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تحديد مستويات الأمان والتنبيه ومهلات التوريد بالأيام لكل صنف بالمستودع
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inventoryItems.map((item) => {
              const isLow = item.quantity <= item.minLevel;
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition space-y-3 ${
                    isLow
                      ? "bg-rose-950/20 border-rose-500/50"
                      : "bg-slate-900 border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">{item.name}</div>
                      <div className="text-xs font-mono text-blue-400">{item.sku} - {item.unit}</div>
                    </div>
                    {isLow ? (
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>تحت الحد الأدنى</span>
                      </span>
                    ) : (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>مستقر</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-slate-500 block">الكمية الحالية</span>
                      <span className={`font-bold ${isLow ? "text-rose-400" : "text-white"}`}>
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">حد إعادة الطلب</span>
                      <span className="font-bold text-amber-300">{item.minLevel} {item.unit}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">مهلة التوريد</span>
                      <span className="font-bold text-blue-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-400" />
                        {item.alertPeriodDays || 7} أيام
                      </span>
                    </div>
                  </div>

                  {item.alertMessage && (
                    <div className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 p-2 rounded">
                      <strong>رسالة التنبيه المخصصة:</strong> {item.alertMessage}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handleOpenEditItem(item)}
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>تعديل شرط الحد الأدنى ومهلة التنبيه</span>
                    </button>

                    <button
                      onClick={() => handleOpenMovementModal("IN", item.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1 rounded font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>طلب توريد (+)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Item Modal (Add or Edit) */}
      {showItemModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-5 text-slate-100 space-y-4 my-8">
            <h3 className="font-bold text-base border-b border-slate-800 pb-2 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-blue-400" />
              <span>{editingItem ? "تعديل بيانات ورصيد الصنف المخزني" : "إضافة صنف مخزني جديد"}</span>
            </h3>

            <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">كود الصنف SKU *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                    placeholder="مثال: SKU-101"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">التصنيف / القسم</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                    placeholder="مثال: مواد بناء / قطع غيار"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">اسم الصنف المخزني *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-semibold"
                  placeholder="أدخل اسم الصنف كاملاً..."
                />
              </div>

              {/* Unit Selection & Custom Unit */}
              <div className="grid grid-cols-2 gap-3 bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                <div>
                  <label className="block text-slate-400 mb-1">اخـتيار الوحـدة *</label>
                  <select
                    value={unitSelect}
                    onChange={(e) => setUnitSelect(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-semibold"
                  >
                    {PRESET_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                {unitSelect === "وحدة مخصصة" ? (
                  <div>
                    <label className="block text-amber-300 mb-1 font-semibold">أدخل الوحدة المخصصة *</label>
                    <input
                      type="text"
                      required
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      className="w-full bg-slate-900 border border-amber-500/60 rounded p-2 text-amber-300 font-bold"
                      placeholder="مثال: لتر، جالون، باكو..."
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-400 mb-1">موقع التخزين بالمخزن</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                      placeholder="المستودع الرئيسي / الرف A2"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">الكمية الحالية / الابتدائية *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-bold"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">تكلفة الوحدة (سعر الشراء) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-emerald-400 font-bold"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Threshold condition & alert period */}
              <div className="bg-amber-950/20 border border-amber-500/40 p-3 rounded-lg space-y-2">
                <span className="text-amber-300 font-bold block text-xs flex items-center gap-1">
                  <BellRing className="w-4 h-4 text-amber-400" />
                  <span>شرط التنبيه والحد الأدنى للطلب (Reorder Alert Condition)</span>
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">حد إعادة الطلب (الكمية الدنيا) *</label>
                    <input
                      type="number"
                      required
                      value={minLevel}
                      onChange={(e) => setMinLevel(e.target.value ? Number(e.target.value) : "")}
                      className="w-full bg-slate-900 border border-amber-500/50 rounded p-1.5 text-amber-300 font-bold"
                      placeholder="مثال: 10"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">مدة مهلة التوريد والتنبيه (أيام) *</label>
                    <input
                      type="number"
                      required
                      value={alertPeriodDays}
                      onChange={(e) => setAlertPeriodDays(e.target.value ? Number(e.target.value) : "")}
                      className="w-full bg-slate-900 border border-amber-500/50 rounded p-1.5 text-blue-300 font-bold"
                      placeholder="مثال: 7 أو 14 يوماً"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">رسالة تنبيه مباشرة عند الوصول للحد الأدنى (اختياري)</label>
                  <input
                    type="text"
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white"
                    placeholder="مثال: تنبيه هام! يرجى التواصل مع مورد الأسمنت فوراً مهلة التوريد 7 أيام..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold shadow">
                  {editingItem ? "حفظ التعديلات" : "إضافة الصنف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Movement Modal (Issue / Receipt) */}
      {showMovementModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-5 text-slate-100 space-y-4">
            <h3 className="font-bold text-base border-b border-slate-800 pb-2 flex items-center gap-2">
              {movementType === "IN" ? (
                <>
                  <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400">تحرير إذن إضافة مخزنية (+)</span>
                </>
              ) : (
                <>
                  <ArrowDownLeft className="w-5 h-5 text-rose-400" />
                  <span className="text-rose-400">تحرير إذن صرف مخزني (-)</span>
                </>
              )}
            </h3>

            <form onSubmit={handleSaveMovement} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">اختر الصنف المخزني *</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => handleMovementItemChange(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-semibold text-xs"
                >
                  {inventoryItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.sku} - {i.name} (المتاح بالمخزن: {i.quantity} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">الكمية المطلوبة *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={movementQty}
                    onChange={(e) => setMovementQty(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-bold"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">تكلفة الوحدة *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={movementUnitCost}
                    onChange={(e) => setMovementUnitCost(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-emerald-400 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">رقم الإذن / المرجع *</label>
                  <input
                    type="text"
                    required
                    value={movementRef}
                    onChange={(e) => setMovementRef(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">تاريخ الحركة *</label>
                  <input
                    type="date"
                    required
                    value={movementDate}
                    onChange={(e) => setMovementDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">بيان وملاحظات الحركة</label>
                <input
                  type="text"
                  value={movementNotes}
                  onChange={(e) => setMovementNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  placeholder="مثال: إذن صرف لموقع المشروع / توريد فاتورة مورد..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded font-bold shadow ${
                    movementType === "IN" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  {movementType === "IN" ? "حفظ إذن الإضافة (+)" : "حفظ إذن الصرف (-)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Item Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmItem}
        message={`هل أنت تأكد من حذف الصنف المخزني (${deleteConfirmItem?.name}) نهائياً؟`}
        onConfirm={() => {
          if (deleteConfirmItem && onDeleteInventoryItem) {
            onDeleteInventoryItem(deleteConfirmItem.id);
            setDeleteConfirmItem(null);
          }
        }}
        onCancel={() => setDeleteConfirmItem(null)}
      />

      {/* Confirm Delete Movement Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmMov}
        message={`هل أنت تأكد من إلغاء حركة المخزون (${deleteConfirmMov?.ref}) وإعادة تسوية الرصيد تلقائياً؟`}
        onConfirm={() => {
          if (deleteConfirmMov && onDeleteInventoryMovement) {
            onDeleteInventoryMovement(deleteConfirmMov.id);
            setDeleteConfirmMov(null);
          }
        }}
        onCancel={() => setDeleteConfirmMov(null)}
      />
    </div>
  );
};
