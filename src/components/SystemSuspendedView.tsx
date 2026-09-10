import React from "react";
import { Lock, ShieldAlert, RefreshCw, UserCheck, Wrench, Clock, Shield, AlertTriangle } from "lucide-react";
import { User, SystemLockState } from "../types";

interface SystemSuspendedViewProps {
  currentUser: User | null;
  systemLockState: SystemLockState;
  onRefreshStatus: () => void;
  onSwitchToAdmin: () => void;
}

export const SystemSuspendedView: React.FC<SystemSuspendedViewProps> = ({
  currentUser,
  systemLockState,
  onRefreshStatus,
  onSwitchToAdmin,
}) => {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="bg-[#11141B] border border-amber-500/30 rounded-2xl max-w-xl w-full p-6 sm:p-8 text-center shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <Wrench className="w-10 h-10 animate-bounce" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Lock className="w-3.5 h-3.5" />
            النظام معطل مؤقتاً للمستخدمين (وضع الصيانة والتحكم الإداري)
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            تم إيقاف تشغيل النظام للمستخدمين
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed max-w-md mx-auto">
            قام <span className="text-amber-300 font-bold">{systemLockState.lockedBy || "مدير النظام"}</span> بتعليق العمل مؤقتاً على النظام للمستخدمين العاديين لإجراء مهام الإدارة والصيانة.
          </p>
        </div>

        {/* Reason Box */}
        <div className="bg-[#161B24] border border-amber-500/20 rounded-xl p-4 text-right space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 border-b border-gray-800 pb-2">
            <AlertTriangle className="w-4 h-4" />
            <span>سبب الإيقاف وتوجيهات الإدارة:</span>
          </div>
          <p className="text-xs text-gray-200 leading-relaxed bg-amber-500/5 p-3 rounded-lg border border-amber-500/10 font-medium">
            {systemLockState.lockedReason || "جاري تحديث البيانات ومراجعة السجلات المحاسبية الدورية من قبل الإدارة."}
          </p>
          
          {systemLockState.notifyMessage && (
            <div className="text-[11px] text-gray-400 pt-1">
              💬 <span className="text-gray-300">{systemLockState.notifyMessage}</span>
            </div>
          )}

          {systemLockState.lockedAt && (
            <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-800">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                وقت تفعيل الإيقاف:
              </span>
              <span className="font-mono text-gray-300">
                {new Date(systemLockState.lockedAt).toLocaleString("ar-EG")}
              </span>
            </div>
          )}
        </div>

        {/* User Card */}
        {currentUser && (
          <div className="bg-[#161B24]/70 border border-gray-800 rounded-xl p-3.5 text-right text-xs space-y-1.5">
            <div className="flex items-center justify-between text-gray-400">
              <span>المستخدم الحالي:</span>
              <span className="text-white font-bold">{currentUser.fullName} ({currentUser.username})</span>
            </div>
            <div className="flex items-center justify-between text-gray-400">
              <span>الدور المعتمد:</span>
              <span className="text-purple-300 font-semibold">{currentUser.role}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onRefreshStatus}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-amber-900/20"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة فحص حالة النظام الآن</span>
          </button>
          
          <button
            onClick={onSwitchToAdmin}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#161B24] hover:bg-gray-800 text-gray-300 px-4 py-2.5 rounded-xl text-xs font-semibold transition border border-gray-700 hover:border-gray-600"
          >
            <Shield className="w-4 h-4 text-blue-400" />
            <span>تسجيل الدخول كمدير نظام</span>
          </button>
        </div>
      </div>
    </div>
  );
};
