import { PermissionDefinition, RoleDefinition, SystemRoleType, UserAccount } from "../types/auth";
import { User } from "../types";

// Complete Granular Permissions Catalog
export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  // 1. Dashboard
  {
    id: "view_dashboard",
    name: "View Dashboard",
    nameAr: "عرض لوحة التحكم والمؤشرات",
    category: "لوحة التحكم العامة",
    resource: "dashboard",
    action: "view",
    descriptionAr: "الاطلاع على الإحصائيات العامة، التدفقات النقدية، ومؤشرات الأداء",
  },

  // 2. Users & Roles Management
  {
    id: "view_users",
    name: "View Users",
    nameAr: "عرض قائمة المستخدمين",
    category: "إدارة المستخدمين والصلاحيات",
    resource: "users",
    action: "view",
    descriptionAr: "الاطلاع على قائمة المستخدمين وحساباتهم وحالة النشاط",
  },
  {
    id: "add_users",
    name: "Add Users",
    nameAr: "إضافة مستخدم جديد",
    category: "إدارة المستخدمين والصلاحيات",
    resource: "users",
    action: "create",
    descriptionAr: "إنشاء حسابات مستخدمين جدد وتوليد روابطهم",
  },
  {
    id: "edit_users",
    name: "Edit Users",
    nameAr: "تعديل بيانات وصلاحيات المستخدمين",
    category: "إدارة المستخدمين والصلاحيات",
    resource: "users",
    action: "edit",
    descriptionAr: "تعديل أسماء المستخدمين، أدوارهم، وتخصيص صلاحياتهم",
  },
  {
    id: "delete_users",
    name: "Delete Users",
    nameAr: "حذف المستخدمين",
    category: "إدارة المستخدمين والصلاحيات",
    resource: "users",
    action: "delete",
    descriptionAr: "حذف حسابات المستخدمين غير المرغوب فيها من النظام",
  },
  {
    id: "manage_roles",
    name: "Manage Roles & User Links",
    nameAr: "إدارة الأدوار والروابط المباشرة",
    category: "إدارة المستخدمين والصلاحيات",
    resource: "users",
    action: "manage",
    descriptionAr: "توليد وتجديد وإلغاء الروابط المباشرة وتعيين الأدوار",
  },

  // 3. Accounts & Chart of Accounts
  {
    id: "view_accounts",
    name: "View Chart of Accounts",
    nameAr: "عرض دليل الحسابات",
    category: "شجرة ودليل الحسابات",
    resource: "accounts",
    action: "view",
    descriptionAr: "الاطلاع على هيكل الحسابات وأرصدتها",
  },
  {
    id: "add_accounts",
    name: "Add Accounts",
    nameAr: "إضافة حسابات جديدة",
    category: "شجرة ودليل الحسابات",
    resource: "accounts",
    action: "create",
    descriptionAr: "إنشاء حسابات رئيسية وفرعية جديدة في الدليل",
  },
  {
    id: "edit_accounts",
    name: "Edit Accounts",
    nameAr: "تعديل الحسابات",
    category: "شجرة ودليل الحسابات",
    resource: "accounts",
    action: "edit",
    descriptionAr: "تعديل أسماء ورموز وتصنيفات الحسابات",
  },
  {
    id: "delete_accounts",
    name: "Delete Accounts",
    nameAr: "حذف الحسابات",
    category: "شجرة ودليل الحسابات",
    resource: "accounts",
    action: "delete",
    descriptionAr: "حذف حسابات ليس عليها حركات مالية",
  },

  // 4. Journal Entries
  {
    id: "view_journal",
    name: "View Journal Entries",
    nameAr: "عرض قيود اليومية العامة",
    category: "قيود اليومية العامة",
    resource: "journal",
    action: "view",
    descriptionAr: "استعراض والبحث في قيود اليومية المسجلة",
  },
  {
    id: "create_journal",
    name: "Create Journal Entries",
    nameAr: "إضافة قيود يومية جديدة",
    category: "قيود اليومية العامة",
    resource: "journal",
    action: "create",
    descriptionAr: "تسجيل قيود يومية متوازنة جديدة",
  },
  {
    id: "edit_journal",
    name: "Edit Journal Entries",
    nameAr: "تعديل قيود اليومية",
    category: "قيود اليومية العامة",
    resource: "journal",
    action: "edit",
    descriptionAr: "تعديل أطراف ومبالغ قيود اليومية السابقة",
  },
  {
    id: "delete_journal",
    name: "Delete Journal Entries",
    nameAr: "حذف قيود اليومية",
    category: "قيود اليومية العامة",
    resource: "journal",
    action: "delete",
    descriptionAr: "حذف أو إلغاء قيود اليومية من السجلات",
  },

  // 5. Reports & Financial Statements
  {
    id: "view_reports",
    name: "View Reports",
    nameAr: "عرض التقارير والقوائم المالية",
    category: "التقارير والقوائم المالية",
    resource: "reports",
    action: "view",
    descriptionAr: "عرض ميزان المراجعة، الأستاذ العام، قائمة الدخل، والميزانية العمومية",
  },
  {
    id: "create_reports",
    name: "Create Reports",
    nameAr: "إنشاء واستخراج تقارير مخصصة",
    category: "التقارير والقوائم المالية",
    resource: "reports",
    action: "create",
    descriptionAr: "توليد فترات محاسبية وتقارير إدارية خاصة",
  },
  {
    id: "edit_reports",
    name: "Edit Reports",
    nameAr: "تعديل تقارير وقوالب البيانات",
    category: "التقارير والقوائم المالية",
    resource: "reports",
    action: "edit",
    descriptionAr: "تعديل شروط وتصنيفات التقارير المالية",
  },
  {
    id: "delete_reports",
    name: "Delete Reports",
    nameAr: "حذف التقارير المحفوظة",
    category: "التقارير والقوائم المالية",
    resource: "reports",
    action: "delete",
    descriptionAr: "إزالة التقارير المؤرشفة والمحفوظة",
  },
  {
    id: "export_reports",
    name: "Export & Print Reports",
    nameAr: "طباعة وتصدير التقارير (Excel / PDF)",
    category: "التقارير والقوائم المالية",
    resource: "reports",
    action: "export",
    descriptionAr: "تصدير الملفات والطباعة المباشرة",
  },

  // 6. Treasury, Custody & Advances
  {
    id: "view_treasury",
    name: "View Treasury & Petty Cash",
    nameAr: "عرض حركة الخزينة والنقدية",
    category: "الخزينة والعهد والنقدية",
    resource: "treasury",
    action: "view",
    descriptionAr: "استعراض سندات القبض والصرف وحركات الخزائن",
  },
  {
    id: "create_treasury",
    name: "Create Treasury Vouchers",
    nameAr: "إضافة سندات قبض وصرف خزينة",
    category: "الخزينة والعهد والنقدية",
    resource: "treasury",
    action: "create",
    descriptionAr: "تسجيل سندات قبض وسندات صرف نقدية",
  },
  {
    id: "edit_treasury",
    name: "Edit Treasury Vouchers",
    nameAr: "تعديل سندات الخزينة",
    category: "الخزينة والعهد والنقدية",
    resource: "treasury",
    action: "edit",
    descriptionAr: "تعديل بيانات وسندات الخزينة",
  },
  {
    id: "delete_treasury",
    name: "Delete Treasury Vouchers",
    nameAr: "حذف سندات الخزينة",
    category: "الخزينة والعهد والنقدية",
    resource: "treasury",
    action: "delete",
    descriptionAr: "حذف سندات الصرف أو القبض النقدية",
  },

  // 7. Custody Clearance & Site Settlements
  {
    id: "view_custody",
    name: "View Custody Clearance",
    nameAr: "عرض تصفية العهد الميدانية",
    category: "تصفية العهد وتسويات الموقع",
    resource: "custody",
    action: "view",
    descriptionAr: "استعراض سجلات تصفية العهد وفواتير المصروفات",
  },
  {
    id: "create_custody",
    name: "Add Custody Clearance Records",
    nameAr: "إضافة وتصفية عهد جديدة",
    category: "تصفية العهد وتسويات الموقع",
    resource: "custody",
    action: "create",
    descriptionAr: "تسجيل فواتير تصفية العهد وسندات تسوية العهدة",
  },
  {
    id: "edit_custody",
    name: "Edit Custody Clearance",
    nameAr: "تعديل فواتير وسجلات العهد",
    category: "تصفية العهد وتسويات الموقع",
    resource: "custody",
    action: "edit",
    descriptionAr: "تعديل مبالغ وبيانات فواتير العهد",
  },
  {
    id: "delete_custody",
    name: "Delete Custody Clearance",
    nameAr: "حذف حركات وسجلات العهد",
    category: "تصفية العهد وتسويات الموقع",
    resource: "custody",
    action: "delete",
    descriptionAr: "حذف قيود وسجلات تصفية العهد",
  },

  // 8. Bank Accounts & Combined Sheet
  {
    id: "view_banks",
    name: "View Banks & Combined Sheet",
    nameAr: "عرض حسابات البنوك والشيت المجمع",
    category: "البنوك والشيت المجمع",
    resource: "banks",
    action: "view",
    descriptionAr: "استعراض حركات البنوك والتسويات البنكية والشيت المجمع",
  },
  {
    id: "create_banks",
    name: "Create Bank Vouchers",
    nameAr: "إضافة حركات بنكية وشيكات",
    category: "البنوك والشيت المجمع",
    resource: "banks",
    action: "create",
    descriptionAr: "تسجيل إيداعات، تحويلات، وسحوبات بنكية",
  },
  {
    id: "edit_banks",
    name: "Edit Bank Vouchers",
    nameAr: "تعديل الحركات البنكية",
    category: "البنوك والشيت المجمع",
    resource: "banks",
    action: "edit",
    descriptionAr: "تعديل بيانات الشيكات والتحويلات",
  },
  {
    id: "delete_banks",
    name: "Delete Bank Vouchers",
    nameAr: "حذف الحركات البنكية",
    category: "البنوك والشيت المجمع",
    resource: "banks",
    action: "delete",
    descriptionAr: "حذف الحركات البنكية غير المعتمدة",
  },

  // 9. Cost Centers & Site Projects
  {
    id: "view_cost_centers",
    name: "View Cost Centers & Projects",
    nameAr: "عرض مراكز التكلفة والمشاريع",
    category: "المشاريع ومراكز التكلفة",
    resource: "cost_centers",
    action: "view",
    descriptionAr: "استعراض تكاليف المشروعات ومراكز التكلفة وتسويات الموقع",
  },
  {
    id: "create_cost_centers",
    name: "Add Cost Centers & Site Adjustments",
    nameAr: "إضافة مراكز تكلفة وتسويات موقع",
    category: "المشاريع ومراكز التكلفة",
    resource: "cost_centers",
    action: "create",
    descriptionAr: "إنشاء مشاريع وتسجيل بنود تسويات الموقع والصبات",
  },
  {
    id: "edit_cost_centers",
    name: "Edit Cost Centers & Site Adjustments",
    nameAr: "تعديل مراكز التكلفة وتسويات الموقع",
    category: "المشاريع ومراكز التكلفة",
    resource: "cost_centers",
    action: "edit",
    descriptionAr: "تعديل ميزانيات وبيانات المشروعات والتوجيهات",
  },
  {
    id: "delete_cost_centers",
    name: "Delete Cost Centers",
    nameAr: "حذف مراكز التكلفة",
    category: "المشاريع ومراكز التكلفة",
    resource: "cost_centers",
    action: "delete",
    descriptionAr: "حذف مراكز التكلفة غير النشطة",
  },

  // 10. Products & Inventory Management
  {
    id: "view_products",
    name: "View Products & Inventory",
    nameAr: "عرض المخزون والأصناف (Products)",
    category: "المخازن والأصناف والمنتجات",
    resource: "products",
    action: "view",
    descriptionAr: "استعراض الأصناف، كميات المستودعات، وتنبيهات إعادة الطلب",
  },
  {
    id: "add_products",
    name: "Add Products & Items",
    nameAr: "إضافة أصناف ومنتجات جديدة",
    category: "المخازن والأصناف والمنتجات",
    resource: "products",
    action: "create",
    descriptionAr: "إدخال كود وتفاصيل صنف جديد بالمستودع",
  },
  {
    id: "edit_products",
    name: "Edit Products & Items",
    nameAr: "تعديل الأصناف والأسعار",
    category: "المخازن والأصناف والمنتجات",
    resource: "products",
    action: "edit",
    descriptionAr: "تعديل أسعار التكلفة وحدود الطلب ومواصفات الأصناف",
  },
  {
    id: "delete_products",
    name: "Delete Products & Items",
    nameAr: "حذف أصناف من المستودع",
    category: "المخازن والأصناف والمنتجات",
    resource: "products",
    action: "delete",
    descriptionAr: "حذف أصناف ليس عليها رصيد أو حركات",
  },

  // 11. Partners (Suppliers & Customers)
  {
    id: "view_partners",
    name: "View Partners (Customers/Suppliers)",
    nameAr: "عرض الموردين والعملاء",
    category: "العملاء والموردون",
    resource: "partners",
    action: "view",
    descriptionAr: "الاطلاع على سجل الموردين والعملاء وأرصدتهم وفواتيرهم",
  },
  {
    id: "add_partners",
    name: "Add Partners",
    nameAr: "إضافة موردين وعملاء",
    category: "العملاء والموردون",
    resource: "partners",
    action: "create",
    descriptionAr: "تسجيل موردين أو عملاء جدد",
  },
  {
    id: "edit_partners",
    name: "Edit Partners",
    nameAr: "تعديل بيانات الموردين والعملاء",
    category: "العملاء والموردون",
    resource: "partners",
    action: "edit",
    descriptionAr: "تعديل العناوين، السجلات التجارية، وأرقام التسجيل الضريبي",
  },
  {
    id: "delete_partners",
    name: "Delete Partners",
    nameAr: "حذف مورد أو عميل",
    category: "العملاء والموردون",
    resource: "partners",
    action: "delete",
    descriptionAr: "حذف حسابات الموردين والعملاء",
  },

  // 12. Settings & System Configuration
  {
    id: "view_settings",
    name: "View Settings",
    nameAr: "عرض إعدادات الشركة والسنة المالية",
    category: "إعدادات النظام والشركة",
    resource: "settings",
    action: "view",
    descriptionAr: "الاطلاع على بيانات الشركة، العملة، والسنة المالية",
  },
  {
    id: "edit_settings",
    name: "Edit Settings",
    nameAr: "تعديل إعدادات الشركة والسنة المالية",
    category: "إعدادات النظام والشركة",
    resource: "settings",
    action: "edit",
    descriptionAr: "تعديل اسم الشركة، الشعار، السجل التجاري، والضرائب",
  },

  // 13. AI Financial Advisor
  {
    id: "ai_analysis",
    name: "AI Financial Analysis",
    nameAr: "تشغيل واستخدام التحليل المالي الذكي (AI)",
    category: "الذكاء الاصطناعي والتحليل",
    resource: "ai",
    action: "manage",
    descriptionAr: "طلب تحليلات واستشارات مالية وإدارية ذكية من Gemini AI",
  },
];

// All permission IDs list for easy mapping
export const ALL_PERMISSION_IDS = SYSTEM_PERMISSIONS.map((p) => p.id);

// Unique Permission Categories
export const PERMISSION_CATEGORIES: string[] = Array.from(
  new Set(SYSTEM_PERMISSIONS.map((p) => p.category))
);

// Predefined Extensible System Roles
export const SYSTEM_ROLES: RoleDefinition[] = [
  {
    id: "SUPER_ADMIN",
    name: "Super Admin",
    nameAr: "مدير النظام العام (كامل الصلاحيات)",
    descriptionAr: "صلاحيات مطلقة لإدارة المستخدمين، الروابط، الحسابات، التقارير، والإعدادات",
    isSystem: true,
    defaultPermissions: ALL_PERMISSION_IDS,
    defaultTabs: ["*"],
  },
  {
    id: "ADMIN",
    name: "System Admin",
    nameAr: "مدير إداري ومالي",
    descriptionAr: "معظم الصلاحيات المحاسبية والإدارية مع إمكانية إدارة المستخدمين والتقارير",
    isSystem: true,
    defaultPermissions: ALL_PERMISSION_IDS.filter(
      (p) => p !== "delete_users" && p !== "edit_settings"
    ),
    defaultTabs: [
      "dashboard",
      "accounts",
      "journal",
      "general_ledger",
      "trial_balance",
      "financial_statements",
      "financial_analysis",
      "treasury",
      "custody_clearance",
      "banks",
      "combined",
      "cost_centers",
      "site_adjustments",
      "expenses",
      "electricity_invoices",
      "inventory",
      "fixed_assets",
      "hr",
      "partners",
      "users",
      "settings",
    ],
  },
  {
    id: "MANAGER",
    name: "Financial Manager",
    nameAr: "مدير مالي ومراجع عام",
    descriptionAr: "صلاحيات المراجعة والاعتماد واستخراج التقارير والتحليلات المالية",
    isSystem: true,
    defaultPermissions: [
      "view_dashboard",
      "view_reports",
      "create_reports",
      "export_reports",
      "view_accounts",
      "view_journal",
      "create_journal",
      "edit_journal",
      "view_treasury",
      "view_custody",
      "view_banks",
      "view_cost_centers",
      "view_products",
      "view_partners",
      "ai_analysis",
    ],
    defaultTabs: [
      "dashboard",
      "accounts",
      "journal",
      "general_ledger",
      "trial_balance",
      "financial_statements",
      "financial_analysis",
      "treasury",
      "custody_clearance",
      "banks",
      "combined",
      "cost_centers",
      "expenses",
      "partners",
    ],
  },
  {
    id: "ACCOUNTANT",
    name: "Accountant",
    nameAr: "محاسب تنفيذ عام",
    descriptionAr: "إدخال القيود وسندات الخزينة والبنوك وتصفية العهد والمصروفات",
    isSystem: true,
    defaultPermissions: [
      "view_dashboard",
      "view_accounts",
      "view_journal",
      "create_journal",
      "edit_journal",
      "view_treasury",
      "create_treasury",
      "edit_treasury",
      "view_custody",
      "create_custody",
      "edit_custody",
      "view_banks",
      "create_banks",
      "edit_banks",
      "view_cost_centers",
      "create_cost_centers",
      "view_products",
      "add_products",
      "edit_products",
      "view_partners",
      "add_partners",
      "edit_partners",
      "view_reports",
      "export_reports",
    ],
    defaultTabs: [
      "dashboard",
      "accounts",
      "journal",
      "general_ledger",
      "treasury",
      "custody_clearance",
      "banks",
      "combined",
      "cost_centers",
      "site_adjustments",
      "expenses",
      "electricity_invoices",
      "partners",
      "inventory",
    ],
  },
  {
    id: "AUDITOR",
    name: "Financial Auditor",
    nameAr: "مدقق ومراجع مالي خارجي",
    descriptionAr: "صلاحيات القراءة والاطلاع والطباعة على كافة القوائم وميزان المراجعة والأستاذ",
    isSystem: true,
    defaultPermissions: [
      "view_dashboard",
      "view_accounts",
      "view_journal",
      "view_reports",
      "export_reports",
      "view_treasury",
      "view_custody",
      "view_banks",
      "view_cost_centers",
      "view_products",
      "ai_analysis",
    ],
    defaultTabs: [
      "dashboard",
      "general_ledger",
      "trial_balance",
      "financial_statements",
      "financial_analysis",
      "custody_clearance",
      "treasury",
      "banks",
      "combined",
    ],
  },
  {
    id: "SITE_ENGINEER",
    name: "Site Engineer / Custody",
    nameAr: "مسؤول الموقع والعهد الميدانية",
    descriptionAr: "إدخال وتصفية عهد العمل الميدانية، تسويات الصبات وفواتير الموقع والكهرباء",
    isSystem: true,
    defaultPermissions: [
      "view_custody",
      "create_custody",
      "edit_custody",
      "view_cost_centers",
      "create_cost_centers",
      "view_products",
      "export_reports",
    ],
    defaultTabs: [
      "custody_clearance",
      "site_adjustments",
      "electricity_invoices",
      "expenses",
    ],
  },
  {
    id: "VIEWER",
    name: "Viewer",
    nameAr: "مشاهد ومتابع فقط (قراءة)",
    descriptionAr: "استعراض لوحة التحكم والتقارير العامة دون إمكانية التعديل أو الحذف",
    isSystem: true,
    defaultPermissions: [
      "view_dashboard",
      "view_reports",
      "view_accounts",
    ],
    defaultTabs: [
      "dashboard",
      "financial_statements",
      "trial_balance",
      "financial_analysis",
    ],
  },
  {
    id: "CUSTOM",
    name: "Custom Role",
    nameAr: "دور مخصص (تحديد يدوي)",
    descriptionAr: "صلاحيات يتم تخصيصها بدقة لكل مستخدم بواسطة مدير النظام",
    isSystem: true,
    defaultPermissions: ["view_dashboard"],
    defaultTabs: ["dashboard"],
  },
];

// Role to Default Permissions Map
export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ALL_PERMISSION_IDS,
  ADMIN: ALL_PERMISSION_IDS,
  MANAGER: [
    "view_dashboard",
    "view_reports",
    "create_reports",
    "export_reports",
    "view_accounts",
    "view_journal",
    "create_journal",
    "edit_journal",
    "view_treasury",
    "view_custody",
    "view_banks",
    "view_cost_centers",
    "view_products",
    "view_partners",
    "ai_analysis",
  ],
  ACCOUNTANT: [
    "view_dashboard",
    "view_accounts",
    "view_journal",
    "create_journal",
    "edit_journal",
    "view_treasury",
    "create_treasury",
    "edit_treasury",
    "view_custody",
    "create_custody",
    "edit_custody",
    "view_banks",
    "create_banks",
    "edit_banks",
    "view_cost_centers",
    "create_cost_centers",
    "view_products",
    "add_products",
    "edit_products",
    "view_partners",
    "add_partners",
    "edit_partners",
    "view_reports",
    "export_reports",
  ],
  AUDITOR: [
    "view_dashboard",
    "view_reports",
    "export_reports",
    "view_accounts",
    "view_journal",
    "view_treasury",
    "view_custody",
    "view_banks",
    "view_cost_centers",
    "view_products",
    "view_partners",
    "view_hr",
    "ai_analysis",
  ],
  SITE_ENGINEER: [
    "view_custody",
    "create_custody",
    "edit_custody",
    "view_cost_centers",
    "create_cost_centers",
    "view_products",
    "export_reports",
  ],
  VIEWER: ["view_dashboard", "view_reports", "view_accounts"],
  CUSTOM: ["view_dashboard"],
};

// Helper: Calculate Effective Permissions for any user (Role + Granted - Revoked)
export function getEffectivePermissions(
  user: User | UserAccount | null | undefined,
  roles: RoleDefinition[] = SYSTEM_ROLES
): Set<string> {
  if (!user) return new Set();

  // Super Admin has ALL permissions unconditionally
  if (user.isSuperAdmin || user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
    // If ADMIN or SUPER_ADMIN, check if there are explicit revokes
    const userAcc = user as UserAccount;
    if (user.isSuperAdmin || (user.role === "SUPER_ADMIN" && (!userAcc.customPermissions?.revoked || userAcc.customPermissions.revoked.length === 0))) {
      return new Set(ALL_PERMISSION_IDS);
    }
  }

  // Find base role
  const roleDef = roles.find((r) => r.id === (user.role as SystemRoleType)) || roles.find((r) => r.id === "CUSTOM");
  const basePermissions = new Set<string>(roleDef ? roleDef.defaultPermissions : []);

  // Apply custom granted permissions
  const userAcc = user as UserAccount;
  if (userAcc.customPermissions?.granted && Array.isArray(userAcc.customPermissions.granted)) {
    userAcc.customPermissions.granted.forEach((p) => basePermissions.add(p));
  }

  // Legacy permissions compatibility
  if (user.permissions) {
    if (user.permissions.canAdd) {
      basePermissions.add("create_journal");
      basePermissions.add("create_treasury");
      basePermissions.add("create_custody");
      basePermissions.add("create_banks");
      basePermissions.add("add_products");
      basePermissions.add("add_partners");
    }
    if (user.permissions.canEdit) {
      basePermissions.add("edit_journal");
      basePermissions.add("edit_treasury");
      basePermissions.add("edit_custody");
      basePermissions.add("edit_banks");
      basePermissions.add("edit_products");
      basePermissions.add("edit_partners");
    }
    if (user.permissions.canDelete) {
      basePermissions.add("delete_journal");
      basePermissions.add("delete_treasury");
      basePermissions.add("delete_custody");
      basePermissions.add("delete_banks");
      basePermissions.add("delete_products");
      basePermissions.add("delete_partners");
    }
    if (user.permissions.canPrint || user.permissions.canExport) {
      basePermissions.add("export_reports");
    }
    if (user.permissions.canManageUsers) {
      basePermissions.add("view_users");
      basePermissions.add("add_users");
      basePermissions.add("edit_users");
      basePermissions.add("manage_roles");
    }
  }

  // Apply custom revoked permissions
  if (userAcc.customPermissions?.revoked && Array.isArray(userAcc.customPermissions.revoked)) {
    userAcc.customPermissions.revoked.forEach((p) => basePermissions.delete(p));
  }

  return basePermissions;
}

// Cryptographically secure token generator
export function generateSecureToken(prefix: string = "sec_tok"): string {
  const array = new Uint8Array(24);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback for Node environment
    for (let i = 0; i < 24; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}_${hex}`;
}

// Unguessable unique User Link ID generator
export function generateUserLinkId(prefix: string = "ulnk"): string {
  const array = new Uint8Array(16);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 16; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}_${hex}`;
}
