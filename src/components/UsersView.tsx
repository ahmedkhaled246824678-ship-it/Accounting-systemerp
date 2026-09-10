import React, { useState } from "react";
import {
  UserCog,
  Users,
  Plus,
  Edit2,
  Trash2,
  Shield,
  KeyRound,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Unlock,
  AlertCircle,
  Eye,
  EyeOff,
  Sliders,
  Send,
  Sparkles,
  ShieldAlert,
  FolderKanban,
  Wallet,
  BookOpen,
  Building,
  CheckSquare,
  Square,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  Search,
  Zap,
  Globe,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Table as TableIcon,
  HelpCircle,
  Play,
} from "lucide-react";
import { User, UserPermissions, SystemLockState, Account } from "../types";
import { SystemRoleType, PermissionDefinition } from "../types/auth";
import {
  SYSTEM_PERMISSIONS,
  SYSTEM_ROLES,
  PERMISSION_CATEGORIES,
  ROLE_DEFAULT_PERMISSIONS,
  getEffectivePermissions,
  generateSecureToken,
  generateUserLinkId,
} from "../data/permissionsData";
import { initialSystemLockState } from "../data/initialData";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { NavTab } from "./Sidebar";
import { ERPStorage } from "../utils/storage";
import { RBACTestingCenter } from "./RBACTestingCenter";
import { getUserShareableUrl, encodeUserToToken } from "../utils/userLinkService";
import { UserAccountsControlModal } from "./UserAccountsControlModal";

interface UsersViewProps {
  users: User[];
  accounts?: Account[];
  onSaveUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onOpenShareModal?: () => void;
  currentUser?: User | null;
  onSwitchUser?: (user: User) => void;
  systemLockState?: SystemLockState;
  onSaveSystemLockState?: (state: SystemLockState) => void;
}

// Complete system modules categorized for tab selection
export const MODULE_CATEGORIES: {
  category: string;
  tabs: { id: NavTab; label: string; icon: string }[];
}[] = [
  {
    category: "النظام والمالية العامة",
    tabs: [
      { id: "dashboard", label: "لوحة التحكم الرئيسية", icon: "📊" },
      { id: "accounts", label: "دليل الحسابات التفصيلي", icon: "🗂️" },
      { id: "journal", label: "قيود اليومية العامة", icon: "📝" },
      { id: "general_ledger", label: "دفتر الأستاذ العام", icon: "📖" },
      { id: "trial_balance", label: "ميزان المراجعة بالأرصدة", icon: "⚖️" },
      { id: "financial_statements", label: "القوائم المالية والضرائب", icon: "📑" },
      { id: "financial_analysis", label: "التحليل المالي الذكي (AI)", icon: "📈" },
    ],
  },
  {
    category: "الخزينة، البنوك، والعهد",
    tabs: [
      { id: "treasury", label: "حركة الخزينة والعهد والسلف", icon: "💵" },
      { id: "custody_clearance", label: "تصفية العهد الميدانية", icon: "🧾" },
      { id: "banks", label: "حسابات البنوك والتسويات", icon: "🏛️" },
      { id: "combined", label: "الشيت المجمع للنقدية والبنك", icon: "📑" },
    ],
  },
  {
    category: "المشاريع، التكاليف، والمصروفات",
    tabs: [
      { id: "cost_centers", label: "مراكز التكلفة والمشاريع", icon: "🏗️" },
      { id: "site_adjustments", label: "تسويات الموقع والصبات", icon: "📐" },
      { id: "expenses", label: "شيت المصروفات التفصيلي", icon: "💳" },
      { id: "electricity_invoices", label: "فواتير الكهرباء والمرافق", icon: "⚡" },
    ],
  },
  {
    category: "المخازن، الأصول، والموارد البشرية",
    tabs: [
      { id: "inventory", label: "المخزون وحركة المستودعات", icon: "📦" },
      { id: "fixed_assets", label: "الأصول الثابتة والإهلاك", icon: "🏢" },
      { id: "hr", label: "المرتبات والأجور والموظفين", icon: "👥" },
      { id: "partners", label: "سجل الموردين والعملاء", icon: "🤝" },
    ],
  },
  {
    category: "الإدارة والإعدادات",
    tabs: [
      { id: "users", label: "إدارة المستخدمين والصلاحيات", icon: "🛡️" },
      { id: "settings", label: "إعدادات الشركة والسنة المالية", icon: "⚙️" },
    ],
  },
];

export const ALL_TAB_IDS: NavTab[] = MODULE_CATEGORIES.flatMap((c) => c.tabs.map((t) => t.id));

export const TAB_MAP = new Map<NavTab, { label: string; icon: string }>();
MODULE_CATEGORIES.forEach((cat) => {
  cat.tabs.forEach((t) => TAB_MAP.set(t.id, { label: t.label, icon: t.icon }));
});

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  accounts,
  onSaveUser,
  onDeleteUser,
  onOpenShareModal,
  currentUser,
  onSwitchUser,
  systemLockState,
  onSaveSystemLockState,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"users" | "roles" | "testing">("users");
  // Default to stacked list layout ("stacked") as requested
  const [viewMode, setViewMode] = useState<"stacked" | "cards" | "table">("stacked");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<{ id: string; name: string } | null>(null);
  const [controlAccountsUser, setControlAccountsUser] = useState<User | null>(null);
  
  // Reveal passwords state map: userId -> boolean
  const [revealedPasswords, setRevealedPasswords] = useState<{ [userId: string]: boolean }>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [switchedUserId, setSwitchedUserId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");
  const [regeneratingUserId, setRegeneratingUserId] = useState<string | null>(null);

  // Auto-Save notification toast & user highlight
  const [autoSaveToast, setAutoSaveToast] = useState<string | null>(null);
  const [autoSavedUserId, setAutoSavedUserId] = useState<string | null>(null);

  // System Lock State
  const [localLockState, setLocalLockState] = useState<SystemLockState>(
    systemLockState || ERPStorage.getSystemLockState()
  );
  const [lockReasonDraft, setLockReasonDraft] = useState(
    systemLockState?.lockedReason || "جاري تنفيذ صيانة دورية وتحديث سجلات الحسابات من قبل الإدارة"
  );
  const [notifyMessageDraft, setNotifyMessageDraft] = useState(
    systemLockState?.notifyMessage || "النظام قيد الصيانة المؤقتة، سيتم إعادة التشغيل للجميع فور الانتهاء."
  );
  const [showLockDetails, setShowLockDetails] = useState(false);

  // Sync state if prop changes
  React.useEffect(() => {
    if (systemLockState) {
      setLocalLockState(systemLockState);
      if (systemLockState.lockedReason) setLockReasonDraft(systemLockState.lockedReason);
      if (systemLockState.notifyMessage) setNotifyMessageDraft(systemLockState.notifyMessage);
    }
  }, [systemLockState]);

  const triggerAutoSaveToast = (msg: string = "تم حفظ التغييرات تلقائياً وبنجاح ✓") => {
    setAutoSaveToast(msg);
    setTimeout(() => {
      setAutoSaveToast((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // Form State
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("1234");
  const [password, setPassword] = useState("123");
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [role, setRole] = useState<SystemRoleType>("ACCOUNTANT");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [notes, setNotes] = useState("");
  const [allowedTabs, setAllowedTabs] = useState<string[]>([]);
  const [customGranted, setCustomGranted] = useState<string[]>([]);
  const [customRevoked, setCustomRevoked] = useState<string[]>([]);
  const [activeModalTab, setActiveModalTab] = useState<"info" | "tabs">("info");
  const [showAdvancedPerms, setShowAdvancedPerms] = useState(false);

  const togglePasswordVisibility = (userId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let gen = "";
    for (let i = 0; i < 6; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(gen);
    setShowFormPassword(true);
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setUsername("");
    setFullName("");
    setEmail("");
    setPin("1234");
    setPassword("123");
    setShowFormPassword(true);
    setRole("ACCOUNTANT");
    setStatus("ACTIVE");
    setNotes("");
    setActiveModalTab("info");
    setShowAdvancedPerms(false);

    // Apply Default Accountant Tabs
    const defaultAccTabs = [
      "dashboard",
      "accounts",
      "journal",
      "general_ledger",
      "treasury",
      "custody_clearance",
      "banks",
      "combined",
      "cost_centers",
      "expenses",
      "site_adjustments",
      "electricity_invoices",
      "partners",
      "inventory",
    ];
    setAllowedTabs(defaultAccTabs);
    setCustomGranted([]);
    setCustomRevoked([]);
    setShowModal(true);
  };

  const handleOpenEditModal = (u: User) => {
    setEditingUser(u);
    setUsername(u.username);
    setFullName(u.fullName);
    setEmail(u.email || "");
    setPin(u.pin || "1234");
    setPassword(u.password || "123");
    setShowFormPassword(false);
    setRole((u.role as SystemRoleType) || "ACCOUNTANT");
    setStatus(u.status || (u.isActive !== false ? "ACTIVE" : "INACTIVE"));
    setNotes(u.notes || "");
    setAllowedTabs(u.allowedTabs || (u.role === "ADMIN" || u.role === "SUPER_ADMIN" ? ["*"] : []));
    setCustomGranted(u.customPermissions?.granted || []);
    setCustomRevoked(u.customPermissions?.revoked || []);
    setActiveModalTab("info");
    setShowAdvancedPerms(false);
    setShowModal(true);
  };

  // Quick Role Preset Applicator
  const applyRolePreset = (selectedRole: SystemRoleType) => {
    setRole(selectedRole);
    if (selectedRole === "SUPER_ADMIN" || selectedRole === "ADMIN") {
      setAllowedTabs(["*"]);
    } else if (selectedRole === "MANAGER") {
      setAllowedTabs([
        "dashboard",
        "accounts",
        "journal",
        "general_ledger",
        "trial_balance",
        "financial_statements",
        "financial_analysis",
        "treasury",
        "banks",
        "cost_centers",
        "partners",
        "inventory",
      ]);
    } else if (selectedRole === "ACCOUNTANT") {
      setAllowedTabs([
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
      ]);
    } else if (selectedRole === "AUDITOR") {
      setAllowedTabs([
        "dashboard",
        "general_ledger",
        "trial_balance",
        "financial_statements",
        "financial_analysis",
        "custody_clearance",
        "treasury",
        "banks",
        "combined",
      ]);
    } else if (selectedRole === "SITE_ENGINEER") {
      setAllowedTabs([
        "custody_clearance",
        "site_adjustments",
        "electricity_invoices",
        "expenses",
        "cost_centers",
      ]);
    } else if (selectedRole === "VIEWER") {
      setAllowedTabs(["dashboard", "financial_statements", "trial_balance", "financial_analysis"]);
    } else {
      setAllowedTabs(["dashboard"]);
    }
  };

  const toggleTab = (tabId: NavTab) => {
    if (allowedTabs.includes("*")) {
      const allExcept = ALL_TAB_IDS.filter((t) => t !== tabId);
      setAllowedTabs(allExcept);
      return;
    }

    if (allowedTabs.includes(tabId)) {
      setAllowedTabs(allowedTabs.filter((t) => t !== tabId));
    } else {
      setAllowedTabs([...allowedTabs, tabId]);
    }
  };

  const togglePermissionCustom = (permId: string, isDefaultInRole: boolean) => {
    if (isDefaultInRole) {
      if (customRevoked.includes(permId)) {
        setCustomRevoked(customRevoked.filter((p) => p !== permId));
      } else {
        setCustomRevoked([...customRevoked, permId]);
      }
    } else {
      if (customGranted.includes(permId)) {
        setCustomGranted(customGranted.filter((p) => p !== permId));
      } else {
        setCustomGranted([...customGranted, permId]);
      }
    }
  };

  // Instant Auto-Save: Toggle User Active/Inactive
  const handleToggleUserStatus = (u: User) => {
    if (u.isSuperAdmin) {
      alert("لا يمكن تعطيل حساب المدير العام الرئيسي.");
      return;
    }
    const newStatus: "ACTIVE" | "INACTIVE" = u.status === "ACTIVE" || u.isActive ? "INACTIVE" : "ACTIVE";
    const updated: User = {
      ...u,
      status: newStatus,
      isActive: newStatus === "ACTIVE",
    };
    onSaveUser(updated);
    setAutoSavedUserId(u.id);
    triggerAutoSaveToast(
      newStatus === "ACTIVE"
        ? `تم تنشيط حساب (${u.fullName}) وحفظ التعديل تلقائياً ✓`
        : `تم إيقاف حساب (${u.fullName}) وحفظ التعديل تلقائياً ✓`
    );
    setTimeout(() => setAutoSavedUserId((prev) => (prev === u.id ? null : prev)), 2000);
  };

  // Instant Auto-Save: Quick Change Role on User Row/Card
  const handleQuickChangeRole = (u: User, newRole: SystemRoleType) => {
    if (u.isSuperAdmin && newRole !== "SUPER_ADMIN") {
      alert("لا يمكن تغيير رتبة المدير العام الرئيسي.");
      return;
    }

    let newTabs: string[] = ["dashboard"];
    if (newRole === "SUPER_ADMIN" || newRole === "ADMIN") {
      newTabs = ["*"];
    } else if (newRole === "MANAGER") {
      newTabs = [
        "dashboard",
        "accounts",
        "journal",
        "general_ledger",
        "trial_balance",
        "financial_statements",
        "financial_analysis",
        "treasury",
        "banks",
        "cost_centers",
        "partners",
        "inventory",
      ];
    } else if (newRole === "ACCOUNTANT") {
      newTabs = [
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
      ];
    } else if (newRole === "AUDITOR") {
      newTabs = [
        "dashboard",
        "general_ledger",
        "trial_balance",
        "financial_statements",
        "financial_analysis",
        "custody_clearance",
        "treasury",
        "banks",
        "combined",
      ];
    } else if (newRole === "SITE_ENGINEER") {
      newTabs = ["custody_clearance", "site_adjustments", "electricity_invoices", "expenses", "cost_centers"];
    } else if (newRole === "VIEWER") {
      newTabs = ["dashboard", "financial_statements", "trial_balance", "financial_analysis"];
    }

    const updated: User = {
      ...u,
      role: newRole,
      allowedTabs: newTabs,
      permissions: {
        ...u.permissions,
        canDelete: newRole === "SUPER_ADMIN" || newRole === "ADMIN",
        canManageUsers: newRole === "SUPER_ADMIN" || newRole === "ADMIN",
      },
    };
    onSaveUser(updated);
    setAutoSavedUserId(u.id);
    const roleTitle = SYSTEM_ROLES.find((r) => r.id === newRole)?.title || newRole;
    triggerAutoSaveToast(`تم تحويل دور (${u.fullName}) إلى [${roleTitle}] وحفظ الشاشات تلقائياً ✓`);
    setTimeout(() => setAutoSavedUserId((prev) => (prev === u.id ? null : prev)), 2000);
  };

  // Instant Auto-Save: Quick Toggle Tab on User Row/Card
  const handleQuickToggleTab = (u: User, tabId: NavTab) => {
    let currentAllowed = u.allowedTabs || [];
    let nextAllowed: string[] = [];

    if (currentAllowed.includes("*")) {
      nextAllowed = ALL_TAB_IDS.filter((t) => t !== tabId);
    } else if (currentAllowed.includes(tabId)) {
      nextAllowed = currentAllowed.filter((t) => t !== tabId);
      if (nextAllowed.length === 0) nextAllowed = ["dashboard"];
    } else {
      nextAllowed = [...currentAllowed, tabId];
    }

    const updated: User = {
      ...u,
      allowedTabs: nextAllowed,
    };
    onSaveUser(updated);
    setAutoSavedUserId(u.id);
    const tabLabel = TAB_MAP.get(tabId)?.label || tabId;
    triggerAutoSaveToast(`تم تحديث صلاحية شاشة (${tabLabel}) لـ (${u.fullName}) وحفظها تلقائياً ✓`);
    setTimeout(() => setAutoSavedUserId((prev) => (prev === u.id ? null : prev)), 2000);
  };

  // System Administrator: Toggle System Lock / Availability
  const handleToggleSystemLock = () => {
    const nextLocked = !localLockState.isLocked;
    const updated: SystemLockState = {
      ...localLockState,
      isLocked: nextLocked,
      lockedAt: nextLocked ? new Date().toISOString() : "",
      lockedBy: currentUser?.fullName || currentUser?.username || "مدير النظام",
      lockedReason:
        lockReasonDraft.trim() ||
        localLockState.lockedReason ||
        "جاري تنفيذ صيانة دورية وتحديث سجلات الحسابات من قبل الإدارة",
      notifyMessage:
        notifyMessageDraft.trim() ||
        localLockState.notifyMessage ||
        "النظام قيد الصيانة المؤقتة، سيتم إعادة التشغيل للجميع فور الانتهاء.",
      allowAdminsOnly: true,
    };
    setLocalLockState(updated);
    if (onSaveSystemLockState) {
      onSaveSystemLockState(updated);
    } else {
      ERPStorage.saveSystemLockState(updated);
    }
    triggerAutoSaveToast(
      nextLocked
        ? "🔴 تم تعطيل النظام للمستخدمين بنجاح (مقتصر على المدراء) وحفظ الإعداد تلقائياً ✓"
        : "🟢 تم تشغيل وإتاحة النظام للجميع بنجاح وحفظ الإعداد تلقائياً ✓"
    );
  };

  const handleUpdateLockDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SystemLockState = {
      ...localLockState,
      lockedReason: lockReasonDraft.trim(),
      notifyMessage: notifyMessageDraft.trim(),
      lockedBy: currentUser?.fullName || currentUser?.username || "مدير النظام",
    };
    setLocalLockState(updated);
    if (onSaveSystemLockState) {
      onSaveSystemLockState(updated);
    } else {
      ERPStorage.saveSystemLockState(updated);
    }
    setShowLockDetails(false);
    triggerAutoSaveToast("تم تحديث وحفظ بيانات الصيانة ورسائل التنبيه تلقائياً ✓");
  };

  const handlePresetReason = (reasonText: string) => {
    setLockReasonDraft(reasonText);
    const updated: SystemLockState = {
      ...localLockState,
      lockedReason: reasonText,
    };
    setLocalLockState(updated);
    if (onSaveSystemLockState) {
      onSaveSystemLockState(updated);
    } else {
      ERPStorage.saveSystemLockState(updated);
    }
    triggerAutoSaveToast(`تم ضبط وتحديث سبب الإيقاف: "${reasonText}" وحفظه تلقائياً ✓`);
  };

  const handleCopyDirectLink = (u: User) => {
    const url = getUserShareableUrl(u);
    navigator.clipboard.writeText(url);
    setCopiedKey(`link-${u.id}`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleCopyPassword = (u: User) => {
    const pass = u.password || u.pin || "123";
    navigator.clipboard.writeText(pass);
    setCopiedKey(`pass-${u.id}`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleCopyFullCredentials = (u: User) => {
    const url = getUserShareableUrl(u);
    const pass = u.password || u.pin || "123";
    const roleTitle = SYSTEM_ROLES.find((r) => r.id === u.role)?.title || u.role;
    const msg = `مرحباً ${u.fullName}،\nإليك رابط وبيانات الدخول المعتمدة لنظام المحاسب ERP:\n\n🔗 الرابط المباشر للدخول الفوري:\n${url}\n\n👤 اسم المستخدم: ${u.username}\n🔑 كلمة المرور: ${pass}\n📌 رمز PIN السريع: ${u.pin || "1234"}\n🛡️ الدور المصرح به: [${roleTitle}]\n\nعند فتح الرابط ستفتح معك الشاشات والصلاحيات المعتمدة لك مباشرة.`;
    navigator.clipboard.writeText(msg);
    setCopiedKey(`all-${u.id}`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleShareWhatsApp = (u: User) => {
    const url = getUserShareableUrl(u);
    const pass = u.password || u.pin || "123";
    const roleTitle = SYSTEM_ROLES.find((r) => r.id === u.role)?.title || u.role;
    const message = `مرحباً ${u.fullName}،\nإليك رابط وبيانات الدخول المباشرة لنظام المحاسب ERP:\n\n🔗 ${url}\n\n👤 اسم المستخدم: ${u.username}\n🔑 كلمة المرور: ${pass}\n📌 رمز PIN: ${u.pin || "1234"}\n🛡️ الدور: [${roleTitle}]\n\nعند فتح الرابط يفتح البرنامج مباشرة بالصلاحيات المصرح بها.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleLaunchDirectLink = (u: User) => {
    if (onSwitchUser) {
      setSwitchedUserId(u.id);
      onSwitchUser(u);
      setTimeout(() => setSwitchedUserId(null), 2000);
    }
  };

  const handleOpenLinkInNewTab = (u: User) => {
    const url = getUserShareableUrl(u);
    window.open(url, "_blank");
  };

  const handleRegenerateLink = (u: User) => {
    if (window.confirm(`هل أنت متأكد من رغبتك في إلغاء الرابط الحالي لـ (${u.fullName}) وتوليد رابط جديد؟ الرابط القديم سيتوقف فوراً.`)) {
      setRegeneratingUserId(u.id);
      const { userLinkId, token } = ERPStorage.regenerateUserLink(u.id);
      const updated: User = {
        ...u,
        userLinkId,
        shareToken: userLinkId,
        token,
        tokenCreatedAt: new Date().toISOString(),
        tokenRevoked: false,
      };
      onSaveUser(updated);
      setRegeneratingUserId(null);
      triggerAutoSaveToast(`تم تجديد رابط (${u.fullName}) وحفظه تلقائياً ✓`);
    }
  };

  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !fullName) return;

    const userLinkId = editingUser?.userLinkId || editingUser?.shareToken || generateUserLinkId();
    const token = editingUser?.token || generateSecureToken();
    const isSuper = editingUser?.isSuperAdmin || (editingUser?.username === "admin" && role === "SUPER_ADMIN");

    const savedUser: User = {
      id: editingUser ? editingUser.id : `USR-${Date.now() % 10000}`,
      username: username.trim().toLowerCase(),
      fullName: fullName.trim(),
      email: email.trim() || undefined,
      pin: pin.trim() || "1234",
      password: password.trim() || "123",
      role,
      status,
      isActive: status === "ACTIVE",
      isSuperAdmin: isSuper,
      userLinkId,
      token,
      tokenCreatedAt: editingUser?.tokenCreatedAt || new Date().toISOString(),
      tokenRevoked: false,
      allowedTabs: allowedTabs.length === 0 ? ["dashboard"] : allowedTabs,
      customPermissions: {
        granted: customGranted,
        revoked: customRevoked,
      },
      permissions: {
        canAdd: true,
        canEdit: true,
        canDelete: role === "SUPER_ADMIN" || role === "ADMIN",
        canPrint: true,
        canExport: true,
        canManageUsers: role === "SUPER_ADMIN" || role === "ADMIN",
      },
      shareToken: userLinkId,
      notes: notes.trim() || undefined,
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString().split("T")[0],
    };

    onSaveUser(savedUser);
    setAutoSavedUserId(savedUser.id);
    setShowModal(false);
    triggerAutoSaveToast(`تم حفظ وتحديث بيانات المستخدم (${savedUser.fullName}) تلقائياً وبنجاح ✓`);
    setTimeout(() => setAutoSavedUserId((prev) => (prev === savedUser.id ? null : prev)), 2000);
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchQuery =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchRole = selectedRoleFilter === "ALL" || u.role === selectedRoleFilter;
    return matchQuery && matchRole;
  });

  const activeCount = users.filter((u) => u.status === "ACTIVE" || u.isActive).length;
  const adminCount = users.filter((u) => u.role === "SUPER_ADMIN" || u.role === "ADMIN").length;

  return (
    <div className="space-y-6 relative">
      {/* Real-Time Auto-Save Floating Notification Toast */}
      {autoSaveToast && (
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/40 animate-bounce">
          <div className="p-1 bg-white/20 rounded-full">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-extrabold text-[13px]">{autoSaveToast}</div>
            <div className="text-[10px] text-emerald-100 font-normal">تمت المزامنة والتسجيل المباشر بنجاح</div>
          </div>
        </div>
      )}

      {/* System Availability and Lock Control Card (For Administrators) */}
      <div className={`border rounded-2xl p-5 shadow-xl transition-all ${
        localLockState.isLocked
          ? "bg-gradient-to-r from-rose-950/40 via-[#161218] to-[#11141B] border-rose-500/50 shadow-rose-950/30"
          : "bg-gradient-to-r from-emerald-950/20 via-[#11161B] to-[#11141B] border-emerald-500/30 shadow-emerald-950/20"
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`p-3 rounded-2xl border shrink-0 ${
              localLockState.isLocked
                ? "bg-rose-600/20 text-rose-400 border-rose-500/40 animate-pulse"
                : "bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
            }`}>
              {localLockState.isLocked ? <Lock className="w-7 h-7" /> : <Unlock className="w-7 h-7" />}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  التحكم في تشغيل وتعطيل النظام للمستخدمين (إدارة النظام)
                </h2>
                <span className={`text-xs px-3 py-1 rounded-full font-bold border flex items-center gap-1.5 ${
                  localLockState.isLocked
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-900/40"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-900/40"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${localLockState.isLocked ? "bg-rose-400 animate-ping" : "bg-emerald-400"}`} />
                  <span>{localLockState.isLocked ? "🔴 النظام معطل للمستخدمين (وضع الصيانة)" : "🟢 النظام قيد التشغيل ونشط للجميع"}</span>
                </span>
                <span className="text-[11px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-lg font-medium">
                  💾 الحفظ التلقائي الفوري مفعّل
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-1">
                {localLockState.isLocked
                  ? `تم حجب النظام عن المستخدمين العاديين، ومتاح فقط للمدراء. سبب الإيقاف: "${localLockState.lockedReason || 'صيانة دورية'}"`
                  : "النظام متاح لجميع المستخدمين والمحاسبين والمهندسين وفقاً للصلاحيات الممنوحة لكل مستخدم."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => setShowLockDetails(!showLockDetails)}
              className="bg-[#161B24] hover:bg-gray-800 text-gray-300 border border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>{showLockDetails ? "إخفاء التفاصيل" : "تخصيص سبب الإيقاف والرسالة"}</span>
            </button>

            {/* Direct Instant Action Toggle */}
            <button
              onClick={handleToggleSystemLock}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-lg shrink-0 ${
                localLockState.isLocked
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30 ring-2 ring-emerald-500/30"
                  : "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-red-900/30 ring-2 ring-rose-500/30"
              }`}
            >
              {localLockState.isLocked ? (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>إعادة تشغيل وإتاحة النظام للجميع 🟢</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>تعطيل النظام وإيقافه للمستخدمين 🔴</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Lock Configuration / Reason Customization Box */}
        {showLockDetails && (
          <div className="mt-4 pt-4 border-t border-gray-800/80 space-y-3 bg-[#0E1118]/80 p-4 rounded-xl">
            <div className="text-xs font-bold text-gray-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>أسباب جاهزة لرسالة الإيقاف والصيانة للمستخدمين:</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {[
                "صيانة دورية وتحديث البيانات والحسابات",
                "إغلاق الفترة المالية ومراجعة وتدقيق القيود",
                "مراجعة واعتماد الحسابات ومطابقة البنوك",
                "إيقاف مؤقت للعمل بأمر الإدارة",
              ].map((reason, rIdx) => (
                <button
                  key={`reason-preset-${rIdx}`}
                  type="button"
                  onClick={() => handlePresetReason(reason)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                    lockReasonDraft === reason
                      ? "bg-blue-600 text-white border-blue-500 font-bold"
                      : "bg-[#161B24] text-gray-300 border-gray-700 hover:border-gray-500"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <form onSubmit={handleUpdateLockDetails} className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  نص سبب الإيقاف المخصص:
                </label>
                <input
                  type="text"
                  value={lockReasonDraft}
                  onChange={(e) => setLockReasonDraft(e.target.value)}
                  placeholder="اكتب سبب التعطيل أو الصيانة..."
                  className="w-full bg-[#161B24] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  رسالة التنبيه الإرشادية للمستخدم عند محاولة الدخول:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={notifyMessageDraft}
                    onChange={(e) => setNotifyMessageDraft(e.target.value)}
                    placeholder="الرسالة التي ستظهر للمستخدم في شاشة التعطيل..."
                    className="w-full bg-[#161B24] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition"
                  >
                    حفظ وتطبيق
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Top Banner */}
      <div className="bg-[#11141B] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30 shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">إدارة المستخدمين وكلمات المرور والصلاحيات</h1>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  تفعيل فوري للشاشات والروابط
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                عرض تفصيلي للمستخدمين تحت بعض، ضبط الصلاحيات والشاشات المسموحة، وتوليد روابط دخول ذاتية التفعيل في أي مكان.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-blue-900/20"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مستخدم جديد</span>
            </button>
            {onOpenShareModal && (
              <button
                onClick={onOpenShareModal}
                className="flex items-center gap-2 bg-[#161B24] hover:bg-gray-800 text-purple-400 border border-purple-500/30 px-3.5 py-2.5 rounded-xl text-xs font-bold transition"
              >
                <Share2 className="w-4 h-4" />
                <span>مركز مشاركة الروابط</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-800/80">
          <div className="bg-[#161B24] border border-gray-800 rounded-xl p-3">
            <div className="text-[11px] text-gray-400">إجمالي المستخدمين</div>
            <div className="text-lg font-bold text-white mt-0.5">{users.length} مستخدم</div>
          </div>
          <div className="bg-[#161B24] border border-gray-800 rounded-xl p-3">
            <div className="text-[11px] text-gray-400">الحسابات النشطة</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">{activeCount} نشط</div>
          </div>
          <div className="bg-[#161B24] border border-gray-800 rounded-xl p-3">
            <div className="text-[11px] text-gray-400">المدراء والمسؤولين</div>
            <div className="text-lg font-bold text-purple-400 mt-0.5">{adminCount} مسؤول</div>
          </div>
          <div className="bg-[#161B24] border border-gray-800 rounded-xl p-3">
            <div className="text-[11px] text-gray-400">الشاشات المتاحة للتحكم</div>
            <div className="text-lg font-bold text-blue-400 mt-0.5">{ALL_TAB_IDS.length} شاشة</div>
          </div>
        </div>

        {/* Navigation Tabs and View Switcher */}
        <div className="flex items-center justify-between border-t border-gray-800/80 pt-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab("users")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeSubTab === "users"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                  : "bg-[#161B24] text-gray-400 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>إدارة المستخدمين ({users.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab("roles")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeSubTab === "roles"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                  : "bg-[#161B24] text-gray-400 hover:text-white"
              }`}
            >
              <Award className="w-4 h-4" />
              <span>دليل الأدوار المعتمدة ({SYSTEM_ROLES.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab("testing")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeSubTab === "testing"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/20"
                  : "bg-[#161B24] text-purple-400 hover:text-white border border-purple-500/20"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>مركز اختبار ومحاكاة الصلاحيات</span>
            </button>
          </div>

          {activeSubTab === "users" && (
            <div className="flex items-center gap-1 bg-[#161B24] p-1 rounded-xl border border-gray-800">
              <button
                onClick={() => setViewMode("stacked")}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  viewMode === "stacked" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"
                }`}
                title="عرض المستخدمين تحت بعض (قائمة متسلسلة واسعة)"
              >
                <List className="w-4 h-4" />
                <span>قائمة تحت بعض</span>
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  viewMode === "cards" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"
                }`}
                title="عرض البطاقات الشبكية"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">شبكة</span>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  viewMode === "table" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"
                }`}
                title="عرض الجدول المدمج"
              >
                <TableIcon className="w-4 h-4" />
                <span className="hidden sm:inline">جدول</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SubTab 1: Users List & Management */}
      {activeSubTab === "users" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-[#11141B] border border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث بالاسم أو اسم المستخدم أو البريد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#161B24] border border-gray-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs text-gray-400 shrink-0">تصفية بالدور:</span>
              <button
                onClick={() => setSelectedRoleFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition ${
                  selectedRoleFilter === "ALL"
                    ? "bg-blue-600 text-white"
                    : "bg-[#161B24] text-gray-400 hover:text-white"
                }`}
              >
                الكل ({users.length})
              </button>
              {SYSTEM_ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoleFilter(r.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition ${
                    selectedRoleFilter === r.id
                      ? "bg-blue-600 text-white"
                      : "bg-[#161B24] text-gray-400 hover:text-white"
                  }`}
                >
                  {r.title}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Link & Permission Binding Alert Banner */}
          <div className="bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-indigo-950/40 border border-blue-800/40 rounded-2xl p-4 flex items-start gap-3.5 shadow-lg">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl shrink-0 mt-0.5 border border-blue-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-sm">ميزة الربط اللحظي وتحديث الصلاحيات بعد إرسال الرابط:</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.2 rounded-full font-bold">
                  مفعلة وتعمل تلقائياً ✓
                </span>
              </div>
              <p className="text-gray-300 leading-relaxed">
                أي تعديل تجريه على الصلاحيات أو الشاشات المسموحة أو إيقاف/تنشيط الحساب يتم <strong className="text-blue-300 font-bold">ربطه وتحديثه تلقائياً</strong> مع الرابط المباشر الذي تم إرساله للمستخدم مسبقاً. عند استخدام الرابط أو تحديث صفحته، سيحصل المستخدم على الصلاحيات الجديدة مباشرة بدون الحاجة لإعادة توليد أو إرسال رابط جديد.
              </p>
            </div>
          </div>

          {/* 1. PRIMARY STACKED VERTICAL LIST: Users under each other (تحت بعض) */}
          {viewMode === "stacked" && (
            <div className="flex flex-col space-y-4">
              {filteredUsers.map((u, index) => {
                const roleObj = SYSTEM_ROLES.find((r) => r.id === u.role) || SYSTEM_ROLES[3];
                const isCurrent = currentUser?.id === u.id;
                const isInactive = u.status === "INACTIVE" || u.isActive === false;
                const effectivePerms = getEffectivePermissions(u);
                const isPasswordRevealed = !!revealedPasswords[u.id];
                const userPassword = u.password || u.pin || "123";
                const userLinkUrl = getUserShareableUrl(u);
                const allowedList = u.allowedTabs || [];
                const isAllTabs = allowedList.includes("*") || u.role === "ADMIN" || u.role === "SUPER_ADMIN";

                return (
                  <div
                    key={u.id ? `stacked-u-${u.id}` : `stacked-idx-${index}`}
                    className={`bg-[#11141B] border rounded-2xl p-5 shadow-xl transition space-y-4 ${
                      isInactive
                        ? "border-rose-900/40 bg-rose-950/5 opacity-85"
                        : isCurrent
                        ? "border-blue-500/60 ring-2 ring-blue-500/20 bg-[#121622]"
                        : "border-gray-800/80 hover:border-gray-700 bg-[#11141B]"
                    }`}
                  >
                    {/* Top Row: User Identity + Role + Status Toggle */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-800/80">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner ${
                            u.isSuperAdmin || u.role === "SUPER_ADMIN"
                              ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                              : u.role === "ADMIN"
                              ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                              : isInactive
                              ? "bg-rose-600/10 text-rose-400 border border-rose-500/20"
                              : "bg-emerald-600/15 text-emerald-300 border border-emerald-500/20"
                          }`}
                        >
                          {u.fullName.charAt(0)}
                        </div>

                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-xs font-mono text-gray-500 bg-gray-900/80 px-2 py-0.5 rounded border border-gray-800">
                              #{index + 1}
                            </span>
                            <h3 className="text-base font-bold text-white tracking-tight">{u.fullName}</h3>
                            {isCurrent && (
                              <span className="text-[11px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-bold">
                                أنت (الحساب الحالي)
                              </span>
                            )}
                            
                            {/* Quick Role Selector with Instant Auto-Save */}
                            <div className="flex items-center gap-1">
                              <select
                                value={u.role}
                                onChange={(e) => handleQuickChangeRole(u, e.target.value as SystemRoleType)}
                                disabled={u.isSuperAdmin}
                                title={u.isSuperAdmin ? "لا يمكن تعديل دور المدير العام الرئيسي" : "تغيير الدور الوظيفي (حفظ تلقائي فوري)"}
                                className="bg-[#181D28] text-blue-300 border border-blue-500/30 text-xs font-bold px-2.5 py-1 rounded-lg focus:outline-none focus:border-blue-400 cursor-pointer"
                              >
                                {SYSTEM_ROLES.map((r) => (
                                  <option key={r.id} value={r.id} className="bg-[#11141B] text-white">
                                    {r.title}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Auto-Saved Visual Confirmation Pulse */}
                            {autoSavedUserId === u.id && (
                              <span className="text-[10px] bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 px-2 py-0.5 rounded-full font-bold animate-pulse flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>تم الحفظ تلقائياً</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                            <span className="font-mono text-blue-400">اسم المستخدم: @{u.username}</span>
                            {u.email && <span>• {u.email}</span>}
                            {u.notes && (
                              <span className="text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[11px]">
                                {u.notes}
                              </span>
                            )}
                            {u.createdAt && (
                              <span className="text-gray-500 text-[11px]">تاريخ الإنشاء: {u.createdAt}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Toggle Button with Instant Auto-Save */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          disabled={u.isSuperAdmin}
                          title={u.isSuperAdmin ? "لا يمكن تعطيل المدير العام" : "اضغط لتبديل حالة الحساب (حفظ تلقائي فوري)"}
                          className={`text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 transition ${
                            isInactive
                              ? "bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25"
                              : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isInactive ? "bg-rose-400 animate-pulse" : "bg-emerald-400"}`} />
                          <span>{isInactive ? "الحساب معطل (موقوف)" : "الحساب نشط ومفعل"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Middle Row: 2-Column Responsive Layout (Credentials Box + Allowed Screens Matrix) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      
                      {/* Column A: Credentials Hub (4 Cols) */}
                      <div className="lg:col-span-4 bg-[#141822] border border-amber-500/20 rounded-xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-amber-400 font-bold flex items-center gap-1.5">
                            <KeyRound className="w-4 h-4 text-amber-400" />
                            <span>بيانات الدخول المعتمدة:</span>
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => togglePasswordVisibility(u.id)}
                              className="text-[11px] text-gray-300 hover:text-white flex items-center gap-1 bg-[#1A1F2C] px-2 py-1 rounded border border-gray-700 transition"
                              title={isPasswordRevealed ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                            >
                              {isPasswordRevealed ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-gray-400" />}
                              <span>{isPasswordRevealed ? "إخفاء" : "إظهار"}</span>
                            </button>
                            <button
                              onClick={() => handleCopyPassword(u)}
                              className="text-[11px] text-gray-300 hover:text-amber-300 flex items-center gap-1 bg-[#1A1F2C] px-2 py-1 rounded border border-gray-700 transition"
                              title="نسخ كلمة المرور فقط"
                            >
                              {copiedKey === `pass-${u.id}` ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400 font-bold">تم النسخ</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>نسخ الرمز</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-[#1B212D] p-2 rounded-lg border border-gray-800">
                            <div className="text-gray-400 text-[10px]">كلمة المرور (Password):</div>
                            <div className="font-mono text-amber-300 font-bold text-sm mt-0.5 tracking-wider truncate">
                              {isPasswordRevealed ? userPassword : "••••••••"}
                            </div>
                          </div>
                          <div className="bg-[#1B212D] p-2 rounded-lg border border-gray-800">
                            <div className="text-gray-400 text-[10px]">رمز PIN السريع:</div>
                            <div className="font-mono text-emerald-400 font-bold text-sm mt-0.5">
                              {u.pin || "1234"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            onClick={() => handleCopyFullCredentials(u)}
                            className="flex-1 bg-[#1A1F2C] hover:bg-gray-800 text-purple-300 border border-purple-500/20 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                            title="نسخ رسالة كاملة تحتوي على الرابط واسم المستخدم وكلمة المرور"
                          >
                            <Send className="w-3.5 h-3.5 text-purple-400" />
                            <span>{copiedKey === `all-${u.id}` ? "تم نسخ الدعوة!" : "نسخ رسالة الدعوة"}</span>
                          </button>
                          <button
                            onClick={() => handleShareWhatsApp(u)}
                            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                            title="إرسال الرابط وكلمة المرور عبر واتساب"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>واتساب</span>
                          </button>
                        </div>
                      </div>

                      {/* Column B: Matrix of Allowed Screens & Granular Permissions (8 Cols) */}
                      <div className="lg:col-span-8 bg-[#161B24] border border-gray-800/80 rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-blue-400" />
                            <span className="text-xs font-bold text-gray-200">
                              الشاشات والصلاحيات المصرح بظهورها (انقر على أي شاشة لتعديلها فورا):
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold font-mono">
                              {isAllTabs ? "كامل الشاشات (*)" : `${allowedList.length} شاشة`}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-400">
                              الصلاحيات الفعالة: <strong className="text-emerald-400 font-mono">{effectivePerms.size}</strong>
                            </span>
                            <button
                              onClick={() => handleOpenEditModal(u)}
                              className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold hover:underline flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>تعديل متقدم</span>
                            </button>
                          </div>
                        </div>

                        {/* Allowed Screens Tags Chips with Direct Click to Toggle + Instant Auto-Save */}
                        <div className="flex items-center gap-1.5 flex-wrap max-h-28 overflow-y-auto custom-scrollbar p-1">
                          {isAllTabs ? (
                            <span className="text-xs font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-lg flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>جميع شاشات النظام والمراكز والتقارير مفتوحة بالكامل بدون حجب (*)</span>
                            </span>
                          ) : allowedList.length === 0 ? (
                            <span className="text-xs text-rose-400 bg-rose-950/30 border border-rose-500/30 px-3 py-1 rounded-lg">
                              لم يتم تعيين أي شاشات بعد (محجوب بالكامل)
                            </span>
                          ) : (
                            Array.from(new Set(allowedList)).map((tabId, tIdx) => {
                              const tabMeta = TAB_MAP.get(tabId as NavTab);
                              return (
                                <button
                                  key={`${u.id}-tab-${tabId}-${tIdx}`}
                                  type="button"
                                  onClick={() => handleQuickToggleTab(u, tabId as NavTab)}
                                  title="اضغط لتبديل وتعديل هذه الشاشة مع الحفظ التلقائي الفوري"
                                  className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#1B212D] hover:bg-rose-950/40 hover:border-rose-500/40 text-gray-200 hover:text-rose-300 border border-gray-700/80 px-2 py-1 rounded-lg shadow-sm transition group"
                                >
                                  <span>{tabMeta?.icon || "📌"}</span>
                                  <span>{tabMeta?.label || tabId}</span>
                                  <span className="text-[9px] text-gray-500 group-hover:text-rose-400">×</span>
                                </button>
                              );
                            })
                          )}
                        </div>

                        <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-[11px] text-gray-400">
                          <span>
                            {roleObj.description}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Direct Link Gateway & Instant Actions Toolbar */}
                    <div className="bg-[#141820] border border-gray-800/90 rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                      {/* URL Box */}
                      <div className="flex-1 flex items-center gap-2">
                        <div className="text-[11px] text-gray-400 flex items-center gap-1 shrink-0 font-semibold">
                          <Globe className="w-3.5 h-3.5 text-blue-400" />
                          <span className="hidden sm:inline">الرابط المباشر:</span>
                        </div>
                        <input
                          type="text"
                          readOnly
                          value={userLinkUrl}
                          className="w-full bg-[#1B212C] border border-gray-800 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-300 font-mono select-all focus:outline-none focus:border-blue-500"
                        />
                        <button
                          onClick={() => handleCopyDirectLink(u)}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition shadow"
                          title="نسخ الرابط المباشر للتشغيل في أي متصفح"
                        >
                          {copiedKey === `link-${u.id}` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-300" />
                              <span className="text-emerald-300">تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>نسخ الرابط</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Action Buttons Toolbar */}
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {/* Granular Accounts Control & Activation Modal Trigger */}
                        <button
                          onClick={() => setControlAccountsUser(u)}
                          className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                          title="مشاهدة وتحديد الحسابات المصرح للمستخدم برؤيتها، تفعيل/قفل الحساب، ومشاركة الرابط عبر واتساب"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                          <span>مشاهدة الحسابات والتحكم 🛡️</span>
                        </button>

                        <button
                          onClick={() => handleShareWhatsApp(u)}
                          className="flex items-center gap-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                          title="إرسال رابط الدخول وبيانات الحساب فوراً للمستخدم عبر واتساب"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="hidden sm:inline">واتساب 📲</span>
                        </button>

                        {onSwitchUser && (
                          <button
                            onClick={() => handleLaunchDirectLink(u)}
                            title="تشغيل وتجربة هذا المستخدم بالصلاحيات المحددة فوراً"
                            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                          >
                            <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                            <span>{switchedUserId === u.id ? "جاري التشغيل..." : "تشغيل الرابط فوراً ⚡"}</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenLinkInNewTab(u)}
                          title="فتح رابط المستخدم في نافذة جديدة مستقلة"
                          className="flex items-center gap-1 bg-[#161B24] hover:bg-gray-800 text-gray-300 border border-gray-700/80 px-2.5 py-1.5 rounded-lg text-xs transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                          <span className="hidden sm:inline">نافذة جديدة</span>
                        </button>

                        <button
                          onClick={() => handleRegenerateLink(u)}
                          disabled={regeneratingUserId === u.id}
                          title="توليد رابط وتوكن جديد وإبطال الرابط القديم"
                          className="flex items-center gap-1 bg-[#161B24] hover:bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-800 px-2.5 py-1.5 rounded-lg text-xs transition"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${regeneratingUserId === u.id ? "animate-spin" : ""}`} />
                          <span className="hidden sm:inline">تجديد</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="flex items-center gap-1 bg-[#161B24] hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
                          title="تعديل المستخدم والصلاحيات وكلمة المرور"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>

                        {!u.isSuperAdmin && (
                          <button
                            onClick={() => setDeleteConfirmUser({ id: u.id, name: u.fullName })}
                            className="p-1.5 bg-[#161B24] hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-lg transition"
                            title="حذف المستخدم"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. SECONDARY VIEW: Cards Grid View */}
          {viewMode === "cards" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredUsers.map((u, index) => {
                const roleObj = SYSTEM_ROLES.find((r) => r.id === u.role) || SYSTEM_ROLES[3];
                const isCurrent = currentUser?.id === u.id;
                const isInactive = u.status === "INACTIVE" || u.isActive === false;
                const effectivePerms = getEffectivePermissions(u);
                const isPasswordRevealed = !!revealedPasswords[u.id];
                const userPassword = u.password || u.pin || "123";
                const userLinkUrl = getUserShareableUrl(u);

                return (
                  <div
                    key={u.id ? `card-u-${u.id}` : `card-idx-${index}`}
                    className={`bg-[#11141B] border rounded-2xl p-5 shadow-xl transition space-y-4 ${
                      isInactive
                        ? "border-rose-900/40 opacity-80 bg-rose-950/5"
                        : isCurrent
                        ? "border-blue-500/50 ring-1 ring-blue-500/20"
                        : "border-gray-800/80 hover:border-gray-700"
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shadow-inner ${
                            u.isSuperAdmin || u.role === "SUPER_ADMIN"
                              ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                              : u.role === "ADMIN"
                              ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                              : isInactive
                              ? "bg-rose-600/10 text-rose-400 border border-rose-500/20"
                              : "bg-emerald-600/10 text-emerald-300 border border-emerald-500/20"
                          }`}
                        >
                          {u.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">{u.fullName}</h3>
                            {isCurrent && (
                              <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                                أنت (الحالي)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            <span className="font-mono text-blue-400">@{u.username}</span>
                            {u.email && <span>• {u.email}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        disabled={u.isSuperAdmin}
                        title={u.isSuperAdmin ? "لا يمكن تعطيل المدير العام" : "اضغط لتبديل الحالة"}
                        className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 transition ${
                          isInactive
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isInactive ? "bg-rose-400" : "bg-emerald-400"}`} />
                        <span>{isInactive ? "حساب معطل" : "نشط ومفعل"}</span>
                      </button>
                    </div>

                    {/* Admin Password & Credentials Box */}
                    <div className="bg-[#141822] border border-amber-500/20 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-400 font-bold flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>بيانات الدخول:</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => togglePasswordVisibility(u.id)}
                            className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 bg-[#1A1F2C] px-2 py-0.5 rounded border border-gray-700 transition"
                          >
                            {isPasswordRevealed ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3 text-gray-400" />}
                            <span>{isPasswordRevealed ? "إخفاء" : "إظهار"}</span>
                          </button>
                          <button
                            onClick={() => handleCopyPassword(u)}
                            className="text-[11px] text-gray-400 hover:text-amber-300 flex items-center gap-1 bg-[#1A1F2C] px-2 py-0.5 rounded border border-gray-700 transition"
                          >
                            {copiedKey === `pass-${u.id}` ? (
                              <span className="text-emerald-400">تم النسخ</span>
                            ) : (
                              <span>نسخ</span>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-[#1B212D] px-2.5 py-1.5 rounded-lg border border-gray-800 flex items-center justify-between">
                          <span className="text-gray-400 text-[11px]">كلمة المرور:</span>
                          <span className="font-mono text-amber-300 font-bold tracking-wider truncate">
                            {isPasswordRevealed ? userPassword : "••••••••"}
                          </span>
                        </div>
                        <div className="bg-[#1B212D] px-2.5 py-1.5 rounded-lg border border-gray-800 flex items-center justify-between">
                          <span className="text-gray-400 text-[11px]">رمز PIN:</span>
                          <span className="font-mono text-emerald-400 font-bold">{u.pin || "1234"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Role and Permissions Details */}
                    <div className="bg-[#161B24] border border-gray-800/80 rounded-xl p-3 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">الدور الوظيفي:</span>
                        <span className="font-bold text-blue-300 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-blue-400" />
                          {roleObj.title}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-gray-800/60 pt-2">
                        <span className="text-gray-400">الشاشات المصرح بها:</span>
                        <span className="font-semibold text-gray-200">
                          {u.allowedTabs?.includes("*") || u.role === "ADMIN" || u.role === "SUPER_ADMIN"
                            ? "جميع شاشات النظام كاملة (*)"
                            : `${u.allowedTabs?.length || 0} شاشة معتمدة`}
                        </span>
                      </div>
                    </div>

                    {/* Direct Link Gateway Card */}
                    <div className="bg-[#141820] border border-gray-800/90 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Globe className="w-3 h-3 text-blue-400" />
                          <span>الرابط المباشر:</span>
                        </span>
                        <button
                          onClick={() => handleCopyFullCredentials(u)}
                          className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 hover:underline"
                        >
                          <Send className="w-3 h-3" />
                          <span>{copiedKey === `all-${u.id}` ? "تم النسخ!" : "نسخ الدعوة"}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={userLinkUrl}
                          className="w-full bg-[#1B212C] border border-gray-800 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-300 font-mono select-all focus:outline-none"
                        />
                        <button
                          onClick={() => handleCopyDirectLink(u)}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition"
                        >
                          {copiedKey === `link-${u.id}` ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>نسخ</span>
                        </button>
                        <button
                          onClick={() => handleShareWhatsApp(u)}
                          className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-800/80">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => setControlAccountsUser(u)}
                          className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                          title="مشاهدة وتحديد الحسابات المصرحة وتفعيل/قفل الحساب"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                          <span>الحسابات والتحكم</span>
                        </button>
                        {onSwitchUser && (
                          <button
                            onClick={() => handleLaunchDirectLink(u)}
                            className="flex items-center gap-1 bg-[#161B24] hover:bg-blue-900/20 text-blue-400 border border-blue-500/20 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
                          >
                            <Play className="w-3 h-3 fill-blue-400" />
                            <span>تشغيل ⚡</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleRegenerateLink(u)}
                          disabled={regeneratingUserId === u.id}
                          className="flex items-center gap-1 bg-[#161B24] hover:bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-800 px-2 py-1.5 rounded-lg text-xs transition"
                          title="تجديد الرابط"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${regeneratingUserId === u.id ? "animate-spin" : ""}`} />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="p-2 bg-[#161B24] hover:bg-blue-600/20 text-blue-400 rounded-lg transition"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!u.isSuperAdmin && (
                          <button
                            onClick={() => setDeleteConfirmUser({ id: u.id, name: u.fullName })}
                            className="p-2 bg-[#161B24] hover:bg-rose-600/20 text-rose-400 rounded-lg transition"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. TERTIARY VIEW: Table View */}
          {viewMode === "table" && (
            <div className="bg-[#11141B] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#161B24] text-gray-400 font-semibold border-b border-gray-800">
                    <tr>
                      <th className="p-3.5">المستخدم</th>
                      <th className="p-3.5">الدور</th>
                      <th className="p-3.5">كلمة المرور (للمدير)</th>
                      <th className="p-3.5">رمز PIN</th>
                      <th className="p-3.5">الشاشات المصرح بها</th>
                      <th className="p-3.5">الرابط المباشر</th>
                      <th className="p-3.5">الحالة</th>
                      <th className="p-3.5 text-center">العمليات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/80">
                    {filteredUsers.map((u, index) => {
                      const roleObj = SYSTEM_ROLES.find((r) => r.id === u.role) || SYSTEM_ROLES[3];
                      const isInactive = u.status === "INACTIVE" || u.isActive === false;
                      const isPasswordRevealed = !!revealedPasswords[u.id];
                      const userPassword = u.password || u.pin || "123";

                      return (
                        <tr
                          key={u.id ? `table-u-${u.id}` : `table-idx-${index}`}
                          className={`hover:bg-[#161B24]/50 transition ${
                            isInactive ? "opacity-70 bg-rose-950/10" : ""
                          }`}
                        >
                          {/* User Info */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center text-xs border border-blue-500/30">
                                {u.fullName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-white">{u.fullName}</p>
                                <p className="text-[11px] text-gray-400 font-mono">@{u.username}</p>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="p-3.5">
                            <span className="font-bold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-lg text-[11px]">
                              {roleObj.title}
                            </span>
                          </td>

                          {/* Password */}
                          <td className="p-3.5 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="text-amber-300 font-bold">
                                {isPasswordRevealed ? userPassword : "••••••••"}
                              </span>
                              <button
                                onClick={() => togglePasswordVisibility(u.id)}
                                className="p-1 text-gray-400 hover:text-white rounded"
                                title={isPasswordRevealed ? "إخفاء" : "إظهار"}
                              >
                                {isPasswordRevealed ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleCopyPassword(u)}
                                className="p-1 text-gray-400 hover:text-amber-300 rounded"
                                title="نسخ كلمة المرور"
                              >
                                {copiedKey === `pass-${u.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* PIN */}
                          <td className="p-3.5 font-mono text-emerald-400 font-bold">
                            {u.pin || "1234"}
                          </td>

                          {/* Allowed Tabs */}
                          <td className="p-3.5">
                            {u.allowedTabs?.includes("*") || u.role === "ADMIN" || u.role === "SUPER_ADMIN" ? (
                              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
                                كامل الشاشات (*)
                              </span>
                            ) : (
                              <span className="text-gray-300 bg-gray-800 px-2 py-0.5 rounded text-[10px]">
                                {u.allowedTabs?.length || 0} شاشة
                              </span>
                            )}
                          </td>

                          {/* Direct Link */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleCopyDirectLink(u)}
                                className="bg-[#161B24] hover:bg-blue-600 hover:text-white text-blue-400 border border-blue-500/20 px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition"
                                title="نسخ الرابط المباشر"
                              >
                                {copiedKey === `link-${u.id}` ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                                <span>نسخ</span>
                              </button>
                              <button
                                onClick={() => handleShareWhatsApp(u)}
                                className="p-1 text-emerald-400 hover:bg-emerald-600/20 rounded transition"
                                title="إرسال عبر واتساب"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="p-3.5">
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              disabled={u.isSuperAdmin}
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition ${
                                isInactive
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
                                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                              }`}
                            >
                              {isInactive ? "معطل" : "نشط"}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setControlAccountsUser(u)}
                                className="p-1.5 bg-[#161B24] hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-lg transition"
                                title="مشاهدة الحسابات المصرحة وتفعيل/قفل الحساب"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                              </button>
                              {onSwitchUser && (
                                <button
                                  onClick={() => handleLaunchDirectLink(u)}
                                  className="p-1.5 bg-[#161B24] hover:bg-emerald-600/20 text-emerald-400 rounded-lg transition"
                                  title="تشغيل كـ"
                                >
                                  <Play className="w-3.5 h-3.5 fill-emerald-400" />
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEditModal(u)}
                                className="p-1.5 bg-[#161B24] hover:bg-blue-600/20 text-blue-400 rounded-lg transition"
                                title="تعديل"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {!u.isSuperAdmin && (
                                <button
                                  onClick={() => setDeleteConfirmUser({ id: u.id, name: u.fullName })}
                                  className="p-1.5 bg-[#161B24] hover:bg-rose-600/20 text-rose-400 rounded-lg transition"
                                  title="حذف"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SubTab 2: Roles Catalog */}
      {activeSubTab === "roles" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SYSTEM_ROLES.map((roleObj, rIdx) => {
              const defaultPerms = ROLE_DEFAULT_PERMISSIONS[roleObj.id] || [];
              const usersWithRole = users.filter((u) => u.role === roleObj.id);

              return (
                <div
                  key={`sys-role-${roleObj.id}-${rIdx}`}
                  className="bg-[#11141B] border border-gray-800 rounded-2xl p-5 shadow-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/20">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">{roleObj.title}</h3>
                        <span className="font-mono text-[10px] text-gray-500">{roleObj.id}</span>
                      </div>
                    </div>
                    <span className="bg-[#161B24] border border-gray-800 text-xs px-2.5 py-1 rounded-lg text-gray-300">
                      {usersWithRole.length} مستخدم
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed min-h-[36px]">{roleObj.description}</p>

                  <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                    <span>عدد الصلاحيات الافتراضية:</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {roleObj.id === "SUPER_ADMIN" ? "كامل النظام (Full)" : `${defaultPerms.length} صلاحية`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SubTab 3: RBAC Testing Center */}
      {activeSubTab === "testing" && (
        <RBACTestingCenter
          users={users}
          currentUser={currentUser}
          onSwitchUser={(u) => {
            if (onSwitchUser) {
              onSwitchUser(u);
            }
          }}
        />
      )}

      {/* MODAL: Create / Edit User & Permissions */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#11141B] border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {editingUser ? `تعديل المستخدم (${editingUser.fullName})` : "إضافة مستخدم جديد وتحديد الصلاحيات"}
                  </h2>
                  <p className="text-xs text-gray-400">
                    نموذج لتحديد كلمة المرور، الدور الوظيفي، وتخصيص الشاشات المصرح بها فورا
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal SubTabs */}
            <div className="flex items-center border-b border-gray-800 px-6 bg-[#161B24]/40">
              <button
                type="button"
                onClick={() => setActiveModalTab("info")}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                  activeModalTab === "info"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>1. بيانات الدخول وكلمة المرور والدور</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab("tabs")}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                  activeModalTab === "tabs"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>2. الشاشات المصرح بها ({allowedTabs.includes("*") ? "الكل" : `${allowedTabs.length} شاشة`})</span>
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmitUser} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              {/* TAB 1: BASIC INFO, PASSWORD & ROLE */}
              {activeModalTab === "info" && (
                <div className="space-y-4">
                  {/* Name and Username */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        الاسم الكامل (للعرض والتقارير) *
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="مثال: م. أحمد عبد الله"
                        className="w-full bg-[#161B24] border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        اسم المستخدم (للرابط والدخول) *
                      </label>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="مثال: ahmed_site"
                        className="w-full bg-[#161B24] border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Password, PIN and Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#141822] p-4 rounded-xl border border-amber-500/20">
                    {/* Password */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-amber-400">
                          كلمة المرور (Password) *
                        </label>
                        <button
                          type="button"
                          onClick={handleGeneratePassword}
                          className="text-[10px] text-blue-400 hover:text-blue-300 font-bold hover:underline"
                        >
                          توليد عشوائي
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showFormPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="123"
                          className="w-full bg-[#161B24] border border-gray-800 rounded-xl pr-3 pl-8 py-2.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowFormPassword(!showFormPassword)}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* PIN */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        رمز PIN السريع
                      </label>
                      <input
                        type="text"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="1234"
                        maxLength={6}
                        className="w-full bg-[#161B24] border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-emerald-400 placeholder-gray-500 font-mono text-center focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        حالة الحساب *
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full bg-[#161B24] border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="ACTIVE">نشط ومصرح له (Active)</option>
                        <option value="INACTIVE">معطل وموقوف (Inactive)</option>
                      </select>
                    </div>
                  </div>

                  {/* Email & Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        البريد الإلكتروني (اختياري)
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@company.com"
                        className="w-full bg-[#161B24] border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        ملاحظات أو تعيينات إدارية
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="مثال: مسؤول موقع الرياض والتسويات..."
                        className="w-full bg-[#161B24] border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Role Selector Grid */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                      الدور الوظيفي الرئيسي (يحدد الشاشات والصلاحيات تلقائياً) *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {SYSTEM_ROLES.map((r) => {
                        const isSelected = role === r.id;
                        return (
                          <div
                            key={r.id}
                            onClick={() => applyRolePreset(r.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                              isSelected
                                ? "bg-blue-600/15 border-blue-500 text-white shadow-md shadow-blue-900/20"
                                : "bg-[#161B24] border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">{r.title}</span>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{r.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ALLOWED TABS */}
              {activeModalTab === "tabs" && (
                <div className="space-y-4">
                  {/* Quick Preset Buttons */}
                  <div className="flex items-center justify-between bg-[#161B24] border border-gray-800 p-3 rounded-xl flex-wrap gap-2">
                    <span className="text-xs text-gray-300 font-semibold">
                      حدد الشاشات المصرح بظهورها في القائمة الجانبية:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAllowedTabs(["*"])}
                        className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-lg hover:bg-blue-600/30 font-bold"
                      >
                        كل الشاشات (*)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyRolePreset("ACCOUNTANT")}
                        className="text-xs bg-blue-600/10 text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded-lg hover:bg-blue-600/20"
                      >
                        شاشات المحاسب
                      </button>
                      <button
                        type="button"
                        onClick={() => applyRolePreset("SITE_ENGINEER")}
                        className="text-xs bg-amber-600/10 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-lg hover:bg-amber-600/20"
                      >
                        شاشات الموقع
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllowedTabs([])}
                        className="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-lg hover:text-white"
                      >
                        إلغاء التحديد
                      </button>
                    </div>
                  </div>

                  {/* Modules Checkboxes */}
                  <div className="space-y-4">
                    {MODULE_CATEGORIES.map((cat, cIdx) => (
                      <div key={`cat-${cat.category}-${cIdx}`} className="space-y-2">
                        <h4 className="text-xs font-bold text-blue-400 border-b border-gray-800 pb-1">
                          {cat.category}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {cat.tabs.map((tab, tIdx) => {
                            const isChecked = allowedTabs.includes("*") || allowedTabs.includes(tab.id);
                            return (
                              <button
                                key={`mod-tab-${tab.id}-${tIdx}`}
                                type="button"
                                onClick={() => toggleTab(tab.id)}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-right transition ${
                                  isChecked
                                    ? "bg-blue-600/15 border-blue-500 text-white"
                                    : "bg-[#161B24] border-gray-800/80 text-gray-400 hover:border-gray-700"
                                }`}
                              >
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-gray-600 shrink-0" />
                                )}
                                <span className="text-xs">{tab.icon}</span>
                                <span className="text-xs font-medium truncate">{tab.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Granular Action Overrides */}
                  <div className="pt-2 border-t border-gray-800">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedPerms(!showAdvancedPerms)}
                      className="flex items-center justify-between w-full text-xs font-bold text-gray-300 hover:text-white py-2"
                    >
                      <span className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-purple-400" />
                        <span>تخصيص الصلاحيات الإجرائية المتقدمة (إضافة، تعديل، حذف، تصدير)</span>
                      </span>
                      {showAdvancedPerms ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showAdvancedPerms && (
                      <div className="mt-3 space-y-3 bg-[#161B24]/70 p-4 rounded-xl border border-gray-800">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {SYSTEM_PERMISSIONS.slice(0, 8).map((p, pIdx) => {
                            const roleDefaultPerms = ROLE_DEFAULT_PERMISSIONS[role] || [];
                            const isDefaultInRole = roleDefaultPerms.includes(p.id);
                            const isGrantedOverride = customGranted.includes(p.id);
                            const isRevokedOverride = customRevoked.includes(p.id);
                            const isEffective = (isDefaultInRole || isGrantedOverride) && !isRevokedOverride;

                            return (
                              <div
                                key={`perm-${p.id}-${pIdx}`}
                                onClick={() => togglePermissionCustom(p.id, isDefaultInRole)}
                                className={`p-2.5 rounded-xl border cursor-pointer transition ${
                                  isEffective
                                    ? "bg-emerald-950/20 border-emerald-500/30 text-white"
                                    : "bg-[#11141B] border-gray-800 text-gray-400 hover:border-gray-700"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {isEffective ? (
                                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5 text-gray-600" />
                                    )}
                                    <span className="text-xs font-bold">{p.title || p.nameAr}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="pt-4 border-t border-gray-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white bg-gray-800/80 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition shadow-lg shadow-blue-900/30"
                >
                  {editingUser ? "حفظ التعديلات وكلمة المرور فوراً" : "إنشاء المستخدم وتوليد الرابط"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {deleteConfirmUser && (
        <ConfirmDeleteModal
          isOpen={true}
          title="تأكيد حذف المستخدم"
          message={`هل أنت متأكد من رغبتك في حذف حساب (${deleteConfirmUser.name})؟ سيتم تعطيل رابطه وتوكن الوصول فوراً.`}
          onConfirm={() => {
            onDeleteUser(deleteConfirmUser.id);
            setDeleteConfirmUser(null);
          }}
          onCancel={() => setDeleteConfirmUser(null)}
        />
      )}

      {/* User Accounts & Status Control Modal */}
      {controlAccountsUser && (
        <UserAccountsControlModal
          user={controlAccountsUser}
          accounts={accounts && accounts.length > 0 ? accounts : ERPStorage.getAccounts()}
          onClose={() => setControlAccountsUser(null)}
          onSaveUser={(updatedUser) => {
            onSaveUser(updatedUser);
            setControlAccountsUser(updatedUser);
            setAutoSavedUserId(updatedUser.id);
            triggerAutoSaveToast(
              `تم تحديث الحسابات والصلاحيات لحساب (${updatedUser.fullName}) وحفظها تلقائياً ✓`
            );
            setTimeout(() => setAutoSavedUserId((prev) => (prev === updatedUser.id ? null : prev)), 2000);
          }}
          onRegenerateLink={(u) => handleRegenerateLink(u)}
        />
      )}
    </div>
  );
};
