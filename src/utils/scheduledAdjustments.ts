import { ERPStorage } from "./storage";

export type ScheduledAdjustmentType =
  | "CASH"
  | "STOCK"
  | "ACCRUED_EXPENSE"
  | "PREPAID_EXPENSE"
  | "ACCRUED_REVENUE"
  | "DEFERRED_REVENUE"
  | "DEPRECIATION"
  | "VAT";

export interface ScheduledAdjustment {
  id: string;
  title: string;
  type: ScheduledAdjustmentType;
  categoryLabel: string;
  dueDate: string; // YYYY-MM-DD
  frequency: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY" | "ONCE";
  estimatedAmount: number;
  assignedTo: string;
  targetAccountName: string;
  oppositeAccountName?: string;
  costCenterName?: string;
  notes?: string;
  status: "PENDING" | "COMPLETED" | "OVERDUE";
  lastExecutedDate?: string;
  createdAt: string;
}

const STORAGE_KEY = "erp_scheduled_inventory_adjustments";

// Default standard scheduled adjustments in Egyptian/Arab accounting
const getInitialScheduledAdjustments = (): ScheduledAdjustment[] => {
  const now = new Date();
  
  // Due today
  const todayStr = now.toISOString().split("T")[0];
  
  // Due in 2 days
  const inTwoDays = new Date(now.getTime() + 2 * 86400000).toISOString().split("T")[0];

  // Due in 4 days
  const inFourDays = new Date(now.getTime() + 4 * 86400000).toISOString().split("T")[0];

  // End of month
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  return [
    {
      id: "SCH-001",
      title: "تسوية جرد الخزينة الرئيسية الأسبوعي",
      type: "CASH",
      categoryLabel: "جرد الخزينة والنقدية",
      dueDate: todayStr,
      frequency: "WEEKLY",
      estimatedAmount: 50000,
      assignedTo: "أمين الخزينة / مدير الحسابات",
      targetAccountName: "الخزينة الرئيسية (1111)",
      oppositeAccountName: "خسائر وفروقات جرد النقدية",
      costCenterName: "الفرع الرئيسي",
      notes: "مطابقة رصيد النقدية الدفتري مع الجرد الفعلي الفوري في الخزينة وكشف الفروقات",
      status: "PENDING",
      createdAt: now.toISOString(),
    },
    {
      id: "SCH-002",
      title: "تسوية استهلاك قسط إيجار المقر السنوي المدفوع مقدماً",
      type: "PREPAID_EXPENSE",
      categoryLabel: "المصروفات المقدمة",
      dueDate: inTwoDays,
      frequency: "MONTHLY",
      estimatedAmount: 15000,
      assignedTo: "رئيس الحسابات",
      targetAccountName: "مصروف الإيجار",
      oppositeAccountName: "المصروفات المدفوعة مقدماً (1141)",
      costCenterName: "الإدارة العامة",
      notes: "إثبات حصة الشهر المنتهي من عقد إيجار المقر السنوي عملاً بمبدأ مقابلة الإيرادات بالنفقات",
      status: "PENDING",
      createdAt: now.toISOString(),
    },
    {
      id: "SCH-003",
      title: "تسوية استحقاق رواتب وأجور الموظفين والبدلات",
      type: "ACCRUED_EXPENSE",
      categoryLabel: "المصروفات المستحقة",
      dueDate: inFourDays,
      frequency: "MONTHLY",
      estimatedAmount: 45000,
      assignedTo: "المدير المالي",
      targetAccountName: "مصروف الرواتب والأجور (511)",
      oppositeAccountName: "المصروفات المستحقة - رواتب (2120)",
      costCenterName: "كافة المشاريع والإدارة",
      notes: "إثبات عبء مرتبات وبدلات العاملين عن الفترة قبل صرفها الفعلي في أول الشهر القادم",
      status: "PENDING",
      createdAt: now.toISOString(),
    },
    {
      id: "SCH-004",
      title: "تسوية إهلاك الأصول الثابتة والمعدات الشهرية",
      type: "DEPRECIATION",
      categoryLabel: "إهلاك الأصول الثابتة",
      dueDate: endOfMonth,
      frequency: "MONTHLY",
      estimatedAmount: 8500,
      assignedTo: "محاسب الأصول الثابتة",
      targetAccountName: "مصروف إهلاك الأصول والمعدات",
      oppositeAccountName: "مجمع إهلاك الأصول الثابتة",
      costCenterName: "المشروعات الهندسية",
      notes: "حساب قسط الإهلاك الشهري الثابت للسيارات والآلات والمعدات طبقاً لمعايير المحاسبة",
      status: "PENDING",
      createdAt: now.toISOString(),
    },
    {
      id: "SCH-005",
      title: "تسوية جرد بضاعة المستودعات والمخزون الدوري",
      type: "STOCK",
      categoryLabel: "جرد المخزون السلعي",
      dueDate: endOfMonth,
      frequency: "MONTHLY",
      estimatedAmount: 120000,
      assignedTo: "أمين المستودعات ومراقب المخزون",
      targetAccountName: "المخزون السلعي (112)",
      oppositeAccountName: "خسائر عجز وتلف المخزون",
      costCenterName: "مستودع الخامات المركزي",
      notes: "حصر الكميات الفعلية ومطابقتها مع الأرصدة الدفترية وإثبات العجز أو التلف",
      status: "PENDING",
      createdAt: now.toISOString(),
    },
  ];
};

const listeners = new Set<(adjustments: ScheduledAdjustment[]) => void>();

export const ScheduledAdjustmentsService = {
  getAdjustments: (): ScheduledAdjustment[] => {
    try {
      const activeTenant = ERPStorage.getActiveTenantId();
      const scopedKey = `${STORAGE_KEY}_${activeTenant || "tenant-1"}`;
      const saved = localStorage.getItem(scopedKey) || localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    const initial = getInitialScheduledAdjustments();
    ScheduledAdjustmentsService.saveAdjustments(initial);
    return initial;
  },

  saveAdjustments: (adjustments: ScheduledAdjustment[]): void => {
    try {
      const activeTenant = ERPStorage.getActiveTenantId();
      const scopedKey = `${STORAGE_KEY}_${activeTenant || "tenant-1"}`;
      localStorage.setItem(scopedKey, JSON.stringify(adjustments));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(adjustments));
      
      listeners.forEach((cb) => {
        try {
          cb(adjustments);
        } catch (e) {
          console.error(e);
        }
      });
    } catch (err) {
      console.error("Failed to save scheduled adjustments:", err);
    }
  },

  addAdjustment: (adjustment: Omit<ScheduledAdjustment, "id" | "createdAt">): ScheduledAdjustment => {
    const list = ScheduledAdjustmentsService.getAdjustments();
    const newRecord: ScheduledAdjustment = {
      ...adjustment,
      id: "SCH-" + Date.now().toString().slice(-4),
      createdAt: new Date().toISOString(),
    };
    const updated = [newRecord, ...list];
    ScheduledAdjustmentsService.saveAdjustments(updated);
    return newRecord;
  },

  updateAdjustment: (adjustment: ScheduledAdjustment): void => {
    const list = ScheduledAdjustmentsService.getAdjustments();
    const updated = list.map((item) => (item.id === adjustment.id ? adjustment : item));
    ScheduledAdjustmentsService.saveAdjustments(updated);
  },

  deleteAdjustment: (id: string): void => {
    const list = ScheduledAdjustmentsService.getAdjustments();
    const updated = list.filter((item) => item.id !== id);
    ScheduledAdjustmentsService.saveAdjustments(updated);
  },

  markCompleted: (id: string, journalEntryNumber?: string): void => {
    const list = ScheduledAdjustmentsService.getAdjustments();
    const nowStr = new Date().toISOString().split("T")[0];
    const updated = list.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status: "COMPLETED" as const,
          lastExecutedDate: nowStr,
          notes: journalEntryNumber
            ? `${item.notes || ""} [تم التنفيذ بالقيد رقم: ${journalEntryNumber}]`
            : item.notes,
        };
      }
      return item;
    });
    ScheduledAdjustmentsService.saveAdjustments(updated);
  },

  /**
   * Returns adjustments that are approaching due date (within 3 days), due today, or overdue
   */
  getApproachingAdjustments: (withinDays = 3): Array<ScheduledAdjustment & { diffDays: number; urgency: "TODAY" | "APPROACHING" | "OVERDUE" }> => {
    const list = ScheduledAdjustmentsService.getAdjustments().filter((a) => a.status !== "COMPLETED");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const results: Array<ScheduledAdjustment & { diffDays: number; urgency: "TODAY" | "APPROACHING" | "OVERDUE" }> = [];

    list.forEach((item) => {
      const due = new Date(item.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffMs = due.getTime() - today.getTime();
      const diffDays = Math.round(diffMs / 86400000);

      if (diffDays < 0) {
        results.push({ ...item, diffDays, urgency: "OVERDUE" });
      } else if (diffDays === 0) {
        results.push({ ...item, diffDays, urgency: "TODAY" });
      } else if (diffDays <= withinDays) {
        results.push({ ...item, diffDays, urgency: "APPROACHING" });
      }
    });

    return results.sort((a, b) => a.diffDays - b.diffDays);
  },

  subscribe: (cb: (adjustments: ScheduledAdjustment[]) => void): (() => void) => {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
};
