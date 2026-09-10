import React, { useState } from "react";
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Lock,
  UserCheck,
  Send,
  Sparkles,
  Link as LinkIcon,
  Shield,
  Smartphone,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
} from "lucide-react";
import { User, CompanySettings } from "../types";
import { getUserShareableUrl } from "../utils/userLinkService";

interface ShareAccessModalProps {
  users: User[];
  companySettings: CompanySettings;
  currentUser?: User;
  onClose: () => void;
  onNavigateToUsers: () => void;
}

export const ShareAccessModal: React.FC<ShareAccessModalProps> = ({
  users,
  companySettings,
  currentUser,
  onClose,
  onNavigateToUsers,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(
    users.find((u) => u.id !== currentUser?.id && u.isActive)?.id || users[0]?.id || ""
  );
  const [copied, setCopied] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const selectedUser = users.find((u) => u.id === selectedUserId) || users[0];

  const getDirectLink = (user: User) => {
    return getUserShareableUrl(user);
  };

  const currentLink = selectedUser ? getDirectLink(selectedUser) : "";

  const handleCopyLink = () => {
    if (!currentLink) return;
    navigator.clipboard.writeText(currentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyPassword = () => {
    if (!selectedUser) return;
    const pass = selectedUser.password || selectedUser.pin || "123";
    navigator.clipboard.writeText(pass);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2500);
  };

  const handleCopyWhatsAppMsg = () => {
    if (!selectedUser) return;
    const userPass = selectedUser.password || selectedUser.pin || "123";
    const msg = `مرحباً ${selectedUser.fullName}،\nإليك رابط وبيانات الدخول المعتمدة لبرنامج المحاسبة (${companySettings.companyName || "نظام المحاسب ERP"}):\n\n🔗 الرابط المباشر:\n${currentLink}\n\n👤 اسم المستخدم: ${selectedUser.username}\n🔑 كلمة المرور: ${userPass}\n📌 رمز PIN السريع: ${selectedUser.pin || "1234"}\n🛡️ الدور المصرح به: [${selectedUser.role}]\n\nعند فتح الرابط ستفتح معك الشاشات المعتمدة لك مباشرة.`;
    navigator.clipboard.writeText(msg);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  const handleOpenInNewTab = () => {
    if (currentLink) {
      window.open(currentLink, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#11141B] border border-gray-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>مشاركة الرابط وبيانات الدخول للمستخدم</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                  Direct Access Links
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                توليد رابط مباشر وكلمة مرور مخصصة لكل موظف للدخول بالصلاحيات المحددة له فوراً
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Selector Tabs */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-300">
            اختر المستخدم المطلوب مشاركة الرابط وكلمة المرور المخصصة له:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {users.map((u) => {
              const isSelected = selectedUserId === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedUserId(u.id);
                    setCopied(false);
                    setCopiedPassword(false);
                  }}
                  className={`p-2.5 rounded-xl border text-right transition flex flex-col justify-between ${
                    isSelected
                      ? "bg-purple-600/20 border-purple-500 text-white shadow-md shadow-purple-900/20"
                      : u.isActive
                      ? "bg-[#161B24] border-gray-800 text-gray-300 hover:border-gray-700 hover:bg-[#1A1F2B]"
                      : "bg-gray-900/40 border-gray-800 text-gray-500 opacity-60"
                  }`}
                >
                  <div className="truncate">
                    <p className="font-bold text-xs truncate text-white">{u.fullName}</p>
                    <p className="text-[10px] text-gray-400 font-mono">@{u.username}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                        u.role === "SUPER_ADMIN" || u.role === "ADMIN"
                          ? "text-purple-400 bg-purple-500/10"
                          : u.role === "ACCOUNTANT"
                          ? "text-blue-400 bg-blue-500/10"
                          : "text-amber-400 bg-amber-500/10"
                      }`}
                    >
                      {u.role}
                    </span>
                    {!u.isActive && (
                      <span className="text-[8px] text-rose-400 bg-rose-500/10 px-1 rounded">
                        موقوف
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected User Details & Link Box */}
        {selectedUser && (
          <div className="bg-[#161B24] border border-gray-800 rounded-xl p-4 space-y-3.5">
            
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-purple-600/20 text-purple-300 font-bold flex items-center justify-center text-xs border border-purple-500/30">
                  {selectedUser.fullName.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-white text-xs">{selectedUser.fullName}</p>
                  <p className="text-[11px] text-gray-400 font-mono">
                    اسم المستخدم: <span className="text-blue-400 font-semibold">@{selectedUser.username}</span>
                  </p>
                </div>
              </div>

              <div className="text-left">
                {selectedUser.isActive ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> الحساب نشط وجاهز
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                    <AlertTriangle className="w-3 h-3" /> الحساب موقوف حالياً
                  </span>
                )}
              </div>
            </div>

            {/* Credentials Info (Password & PIN) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#11141B] p-3 rounded-xl border border-gray-800/80">
              {/* Password */}
              <div className="space-y-1">
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  كلمة المرور (Password):
                </span>
                <div className="flex items-center justify-between bg-[#161B24] border border-gray-800 rounded-lg px-2.5 py-1.5">
                  <span className="font-mono text-xs text-amber-300 font-bold tracking-wider">
                    {showPassword ? (selectedUser.password || "123") : "••••••••"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-gray-400 hover:text-white rounded transition"
                      title={showPassword ? "إخفاء" : "إظهار"}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="p-1 text-gray-400 hover:text-amber-300 rounded transition"
                      title="نسخ كلمة المرور"
                    >
                      {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* PIN Code */}
              <div className="space-y-1">
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  رمز PIN السريع:
                </span>
                <div className="flex items-center justify-between bg-[#161B24] border border-gray-800 rounded-lg px-2.5 py-1.5">
                  <span className="font-mono text-xs text-emerald-400 font-bold">
                    {selectedUser.pin || "1234"}
                  </span>
                  <span className="text-[10px] text-gray-500">للدخول السريع</span>
                </div>
              </div>
            </div>

            {/* Direct Link Display */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-gray-400 font-semibold flex items-center justify-between">
                <span>رابط الدخول المباشر المخصص (يفتح الصلاحيات فوراً):</span>
                <span className="text-purple-400 font-mono text-[10px]">Auto-Auth URL</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-[#10131A] border border-gray-700/80 rounded-xl px-3 py-2 text-[11px] text-purple-300 font-mono truncate select-all">
                  {currentLink}
                </div>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 shadow-lg shadow-purple-900/30"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? "تم النسخ!" : "نسخ الرابط"}</span>
                </button>
              </div>
            </div>

            {/* Dynamic Link Sync Note */}
            <div className="bg-purple-950/30 border border-purple-800/40 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-purple-200">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-purple-300">ميزة الربط والمزامنة الديناميكية: </span>
                <span>عند تعديل صلاحيات أو شاشات هذا المستخدم في أي وقت لاحقاً، تنعكس التعديلات تلقائياً وفورياً على الرابط المرسل للمستخدم والجلسة المفتوحة لديه دون الحاجة لإعادة إرسال الرابط.</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleCopyWhatsAppMsg}
                className="flex items-center justify-center gap-2 bg-[#1A1F2B] hover:bg-[#202736] text-gray-300 hover:text-white border border-gray-700/80 px-3 py-2 rounded-xl text-xs font-semibold transition"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>{copiedMsg ? "تم نسخ رسالة وبيانات الدخول!" : "نسخ رسالة الدعوة مع كلمة المرور"}</span>
              </button>
              <button
                onClick={handleOpenInNewTab}
                className="flex items-center justify-center gap-2 bg-[#1A1F2B] hover:bg-[#202736] text-gray-300 hover:text-white border border-gray-700/80 px-3 py-2 rounded-xl text-xs font-semibold transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                <span>تجربة وفتح الرابط في تبويب جديد</span>
              </button>
            </div>

            {/* Allowed Screens Summary */}
            <div className="pt-2 text-[11px] text-gray-400 space-y-1">
              <p className="font-semibold text-gray-300">
                الشاشات المصرح لهذا المستخدم بالوصول إليها:
              </p>
              <div className="flex flex-wrap gap-1">
                {(selectedUser.allowedTabs || []).includes("*") || selectedUser.role === "ADMIN" || selectedUser.role === "SUPER_ADMIN" ? (
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 text-[10px] font-bold">
                    جميع شاشات النظام كاملة (Full Access)
                  </span>
                ) : (
                  (selectedUser.allowedTabs || []).map((t) => (
                    <span
                      key={t}
                      className="px-1.5 py-0.5 bg-gray-800 text-gray-300 rounded border border-gray-700 text-[10px]"
                    >
                      {t}
                    </span>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* Footer Note and Link to Users Management */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-800 text-xs text-gray-400">
          <p>
            هل تريد تعديل الصلاحيات الممنوحة أو كلمة المرور؟
          </p>
          <button
            onClick={() => {
              onClose();
              onNavigateToUsers();
            }}
            className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 hover:underline"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>فتح شاشة إدارة الصلاحيات والمستخدمين</span>
          </button>
        </div>

      </div>
    </div>
  );
};
