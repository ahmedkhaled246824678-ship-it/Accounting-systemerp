import React from "react";
import { ShieldAlert, ArrowRight, UserCheck, Lock, Shield } from "lucide-react";
import { User } from "../types";
import { NavTab } from "./Sidebar";

interface AccessDeniedViewProps {
  currentUser: User;
  tabTitle: string;
  onNavigateToAllowedTab: (tab: NavTab) => void;
  onSwitchUser: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  currentUser,
  tabTitle,
  onNavigateToAllowedTab,
  onSwitchUser,
}) => {
  const allowed = currentUser?.allowedTabs || [];
  const isAllAllowed = allowed.includes("*") || currentUser?.role === "ADMIN";
  const firstAllowed = (allowed.find((t) => t !== "*") as NavTab) || "dashboard";

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-[#11141B] border border-gray-800/90 rounded-2xl max-w-lg w-full p-6 sm:p-8 text-center shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Lock className="w-3.5 h-3.5" />
            منطقة مقيدة الصلاحيات
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight">
            غير مصرح لك بالوصول إلى ({tabTitle})
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            تم ضبط صلاحيات حسابك (<span className="text-blue-300 font-semibold">{currentUser.fullName}</span>)
            بواسطة مدير النظام، وهذه الشاشة غير مدرجة ضمن الشاشات المصرح لك باستخدامها.
          </p>
        </div>

        {/* User Status Card */}
        <div className="bg-[#161B24] border border-gray-800 rounded-xl p-4 text-right text-xs space-y-2">
          <div className="flex items-center justify-between text-gray-400 border-b border-gray-800 pb-2">
            <span>المستخدم الحالي:</span>
            <span className="text-white font-bold">{currentUser.fullName} ({currentUser.username})</span>
          </div>
          <div className="flex items-center justify-between text-gray-400 border-b border-gray-800 pb-2">
            <span>الدور المعتمد:</span>
            <span className="text-purple-300 font-semibold font-mono">
              {currentUser.role === "ADMIN"
                ? "مدير نظام"
                : currentUser.role === "ACCOUNTANT"
                ? "محاسب تنفيذ"
                : currentUser.role === "AUDITOR"
                ? "مدقق ومراجع مالي"
                : currentUser.role === "VIEWER"
                ? "مشاهد فقط"
                : "صلاحيات مخصصة"}
            </span>
          </div>
          <div className="flex items-center justify-between text-gray-400">
            <span>التحكم الإداري:</span>
            <span className="text-emerald-400 font-medium">المدير العام (أحمد خالد)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigateToAllowedTab(firstAllowed)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-blue-900/20"
          >
            <span>الذهاب للشاشات المتاحة لك</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onSwitchUser}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2.5 rounded-xl text-xs font-semibold transition border border-gray-700"
          >
            <UserCheck className="w-4 h-4 text-blue-400" />
            <span>تسجيل الدخول بمستخدم آخر</span>
          </button>
        </div>
      </div>
    </div>
  );
};
