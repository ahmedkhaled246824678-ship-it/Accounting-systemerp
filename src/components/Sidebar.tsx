import React from "react";
import {
  LayoutDashboard,
  GitFork,
  BookOpen,
  BookCheck,
  Wallet,
  Landmark,
  Layers,
  FolderKanban,
  PieChart,
  Scale,
  Receipt,
  Package,
  Building,
  Users2,
  UserCheck,
  TrendingUp,
  ShieldCheck,
  Settings2,
  Zap,
  FileSpreadsheet,
  ClipboardCheck,
  Lock,
  User as UserIcon,
} from "lucide-react";

import { User } from "../types";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { SYSTEM_ROLES } from "../data/permissionsData";

export type NavTab =
  | "dashboard"
  | "accounts"
  | "journal"
  | "general_ledger"
  | "treasury"
  | "custody_clearance"
  | "banks"
  | "combined"
  | "cost_centers"
  | "site_adjustments"
  | "trial_balance"
  | "financial_statements"
  | "expenses"
  | "electricity_invoices"
  | "inventory"
  | "fixed_assets"
  | "hr"
  | "partners"
  | "financial_analysis"
  | "users"
  | "settings";

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  currentUser?: User | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, currentUser }) => {
  const auth = useAuth();
  const { t, language, isRTL } = useLanguage();
  const effectiveUser = currentUser || auth.currentUser;

  const allNavItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "dashboard", label: t("dashboard", "لوحة التحكم الرئيسية"), icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: "accounts", label: t("accounts", "دليل الحسابات التفصيلي"), icon: <GitFork className="w-5 h-5" />, badge: language === "ar" ? "شامل" : "Core" },
    { id: "journal", label: t("journal", "قيود اليومية"), icon: <BookOpen className="w-5 h-5" /> },
    { id: "general_ledger", label: t("general_ledger", "دفتر الأستاذ العام"), icon: <BookCheck className="w-5 h-5" />, badge: language === "ar" ? "قيود" : "Ledger" },
    { id: "treasury", label: t("treasury", "حركة الخزينة والعهد والسلف"), icon: <Wallet className="w-5 h-5" /> },
    { id: "custody_clearance", label: t("custody_clearance", "تصفية العهد"), icon: <ClipboardCheck className="w-5 h-5" />, badge: language === "ar" ? "تنفيذي" : "Ops" },
    { id: "banks", label: t("banks", "البنوك وتسوية البنوك"), icon: <Landmark className="w-5 h-5" /> },
    { id: "combined", label: t("combined", "الشيت المجمع للنقدية والبنك"), icon: <Layers className="w-5 h-5" /> },
    { id: "cost_centers", label: t("cost_centers", "مراكز التكلفة والمشاريع"), icon: <FolderKanban className="w-5 h-5" /> },
    { id: "site_adjustments", label: t("site_adjustments", "تسويات الموقع"), icon: <FileSpreadsheet className="w-5 h-5" />, badge: language === "ar" ? "جديد" : "New" },
    { id: "trial_balance", label: t("trial_balance", "ميزان المراجعة بالأرصدة"), icon: <Scale className="w-5 h-5" />, badge: language === "ar" ? "محاسبي" : "Audit" },
    { id: "financial_statements", label: t("financial_statements", "القوائم المالية والضرائب"), icon: <PieChart className="w-5 h-5" /> },
    { id: "expenses", label: t("expenses", "شيت المصروفات التفصيلي"), icon: <Receipt className="w-5 h-5" /> },
    { id: "electricity_invoices", label: t("electricity_invoices", "فواتير الكهرباء"), icon: <Zap className="w-5 h-5" />, badge: language === "ar" ? "جديد" : "New" },
    { id: "inventory", label: t("inventory", "إدارة المخزون والتفاصيل"), icon: <Package className="w-5 h-5" /> },
    { id: "fixed_assets", label: t("fixed_assets", "الأصول الثابتة والإهلاك"), icon: <Building className="w-5 h-5" /> },
    { id: "hr", label: t("hr", "الموارد البشرية والرواتب"), icon: <Users2 className="w-5 h-5" /> },
    { id: "partners", label: t("partners", "الموردين والعملاء"), icon: <UserCheck className="w-5 h-5" />, badge: language === "ar" ? "تنفيذي" : "CRM" },
    { id: "financial_analysis", label: t("financial_analysis", "التحليل المالي الذكي"), icon: <TrendingUp className="w-5 h-5" />, badge: "AI" },
    { id: "users", label: t("users", "إدارة المستخدمين والصلاحيات"), icon: <ShieldCheck className="w-5 h-5" />, badge: language === "ar" ? "أمان" : "RBAC" },
    { id: "settings", label: t("settings", "إعدادات الشركة والسنة المالية"), icon: <Settings2 className="w-5 h-5" /> },
  ];

  const navItems = allNavItems;

  return (
    <aside className="no-print w-64 bg-[#11141B] border-l border-r border-gray-800 flex flex-col justify-between shrink-0 min-h-[calc(100vh-61px)] font-sans">
      <div className="py-4 px-3 space-y-1">
        <div className="px-3 mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          <span>{language === "ar" ? "أقسام النظام المحاسبي" : "System Modules"}</span>
          <span className="text-[10px] text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
            {navItems.length}
          </span>
        </div>

        <nav className="space-y-1 max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? `bg-blue-600/10 text-blue-400 ${isRTL ? "border-r-2" : "border-l-2"} border-blue-500 font-semibold`
                    : "text-gray-400 hover:bg-gray-800/80 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? "text-blue-400" : "text-gray-400"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-normal ${
                      isActive
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        : "bg-[#1A1F26] text-blue-400 border border-blue-500/20"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-gray-800 bg-[#1A1F26]/60 text-[11px] text-gray-400 m-2 rounded-lg border">
        <div className="flex items-center justify-between">
          <p className="font-bold text-white">Al-Mohaseb ERP</p>
          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
            v3.2 Real-time
          </span>
        </div>
        <p className="text-[10px] text-gray-500 mt-0.5">
          {language === "ar" ? "نظام إدارة الصلاحيات والأدوار المتقدم" : "Advanced RBAC & Cloud Sync"}
        </p>
      </div>
    </aside>
  );
};


