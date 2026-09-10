import React, { useState } from "react";
import {
  UserPlus,
  X,
  Shield,
  KeyRound,
  UserCheck,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  Copy,
  Check,
  Send,
  ExternalLink,
  Globe,
  Phone,
} from "lucide-react";
import { User } from "../types";
import { SystemRoleType } from "../types/auth";
import {
  SYSTEM_ROLES,
  ROLE_DEFAULT_PERMISSIONS,
  generateSecureToken,
  generateUserLinkId,
} from "../data/permissionsData";
import { getUserShareableUrl } from "../utils/userLinkService";

interface DashboardAddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveUser: (user: User) => void;
  existingUsers: User[];
}

export const DashboardAddUserModal: React.FC<DashboardAddUserModalProps> = ({
  isOpen,
  onClose,
  onSaveUser,
  existingUsers,
}) => {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("1234");
  const [role, setRole] = useState<SystemRoleType>("ACCOUNTANT");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success view state with link & WhatsApp
  const [createdUser, setCreatedUser] = useState<User | null>(null);
  const [recipientPhone, setRecipientPhone] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    setFullName("");
    setUsername("");
    setPassword("");
    setPin("1234");
    setRole("ACCOUNTANT");
    setErrorMsg(null);
    setCreatedUser(null);
    setRecipientPhone("");
    setCopiedLink(false);
  };

  const handleModalClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) {
      setErrorMsg("يرجى إدخال اسم المستخدم");
      return;
    }

    if (existingUsers.some((u) => u.username.toLowerCase() === cleanUser)) {
      setErrorMsg("اسم المستخدم هذا موجود بالفعل، يرجى اختيار اسم آخر.");
      return;
    }

    const isSuperOrAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
    const userPermissions = {
      canAdd: true,
      canEdit: role !== "VIEWER",
      canDelete: isSuperOrAdmin,
      canPrint: true,
      canExport: true,
      canManageUsers: isSuperOrAdmin,
    };

    const newUser: User = {
      id: "usr-" + Date.now().toString(36),
      username: cleanUser,
      fullName: fullName.trim() || cleanUser,
      password: password || "123456",
      pin: pin || "1234",
      role,
      permissions: userPermissions,
      allowedTabs: ["*"],
      allowedAccounts: ["*"],
      token: generateSecureToken(),
      userLinkId: generateUserLinkId(cleanUser),
      status: "ACTIVE",
      isActive: true,
      lastLogin: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveUser(newUser);
    setCreatedUser(newUser);
  };

  const handleSendWhatsApp = () => {
    if (!createdUser) return;
    const directUrl = getUserShareableUrl(createdUser);
    const roleObj = SYSTEM_ROLES.find((r) => r.id === createdUser.role);
    const msg =
      `مرحباً ${createdUser.fullName}،\n` +
      `تم إنشاء حسابك بنجاح في نظام المحاسب ERP:\n\n` +
      `🔗 الرابط المباشر للدخول:\n${directUrl}\n\n` +
      `👤 اسم المستخدم: ${createdUser.username}\n` +
      `🔑 كلمة المرور: ${createdUser.password || createdUser.pin || "123456"}\n` +
      `📌 رمز PIN السريع: ${createdUser.pin || "1234"}\n` +
      `🛡️ الصلاحيات: [${roleObj?.title || createdUser.role}]\n\n` +
      `*ملاحظة:* اضغط على الرابط للدخول المباشر فوراً للنظام.`;

    const cleanPhone = recipientPhone.replace(/[^0-9]/g, "");
    let waUrl = "";
    if (cleanPhone) {
      waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    } else {
      waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    }
    window.open(waUrl, "_blank");
  };

  const handleCopyLink = () => {
    if (!createdUser) return;
    const url = getUserShareableUrl(createdUser);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-[#11141B] border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl p-5 text-right space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
              <UserPlus className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {createdUser ? "تم إنشاء المستخدم والرابط بنجاح! 🎉" : "إضافة مستخدم جديد للنظام"}
              </h3>
              <p className="text-xs text-gray-400">
                {createdUser
                  ? "تم توليد رابط الدخول المباشر وجاهز للإرسال عبر واتساب"
                  : "إنشاء حساب مستخدم وتوليد رابط مباشر وصلاحيات"}
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* If createdUser is present: show post-creation share card */}
        {createdUser ? (
          <div className="space-y-4 animate-fade-in text-xs">
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>حساب ({createdUser.fullName}) أصبح نشطاً وجاهزاً للعمل!</span>
              </div>
              <p className="text-[11px] text-gray-300">
                تم ربط الحساب برابط دخول مباشر مشفر وآمن يمكن فتحه من أي متصفح دون تعقيدات.
              </p>
            </div>

            {/* Direct Link Box */}
            <div className="bg-[#181D26] p-3 rounded-xl border border-gray-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>الرابط المباشر للمستخدم:</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold text-[11px]"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ الرابط</span>
                    </>
                  )}
                </button>
              </div>

              <input
                type="text"
                readOnly
                value={getUserShareableUrl(createdUser)}
                className="w-full bg-[#11141B] border border-gray-700 rounded-lg p-2 text-gray-300 font-mono text-[11px] select-all focus:outline-none"
              />
            </div>

            {/* WhatsApp Direct Send Section */}
            <div className="bg-[#181D26] p-3.5 rounded-xl border border-emerald-500/30 space-y-3">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <MessageSquare className="w-4 h-4" />
                <span>إرسال الرابط والبيانات للمستخدم عبر واتساب:</span>
              </div>

              <div>
                <label className="text-gray-400 text-[11px] block mb-1">
                  رقم هاتف المستخدم بكود الدولة (اختياري):
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="مثال: 201012345678"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full bg-[#11141B] border border-gray-700 rounded-lg pr-8 pl-2.5 py-1.5 text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition shadow-lg shadow-emerald-950/40"
              >
                <Send className="w-4 h-4" />
                <span>إرسال الرابط وبيانات الدخول عبر واتساب 📲</span>
              </button>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-gray-800">
              <button
                type="button"
                onClick={handleReset}
                className="text-blue-400 hover:underline text-xs font-semibold"
              >
                + إضافة مستخدم آخر
              </button>

              <button
                type="button"
                onClick={handleModalClose}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold text-xs transition"
              >
                تم والانتهاء
              </button>
            </div>
          </div>
        ) : (
          /* User Input Form */
          <>
            {errorMsg && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 rounded-lg text-rose-200 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">
                  الاسم الكامل للموظف / المستخدم:
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: أحمد مصطفى"
                  className="w-full bg-[#181D26] border border-gray-700 text-white rounded-lg p-2.5 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">
                  اسم المستخدم (Username للدخول):
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: ahmed"
                  className="w-full bg-[#181D26] border border-gray-700 text-white rounded-lg p-2.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">
                    كلمة المرور:
                  </label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-[#181D26] border border-gray-700 text-white rounded-lg p-2.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">
                    رمز PIN السريع:
                  </label>
                  <input
                    type="text"
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-[#181D26] border border-gray-700 text-white rounded-lg p-2.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">
                  الدور والصلاحيات المصرحة:
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as SystemRoleType)}
                  className="w-full bg-[#181D26] border border-gray-700 text-white rounded-lg p-2.5 text-xs focus:border-blue-500 focus:outline-none"
                >
                  {SYSTEM_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nameAr} - {r.descriptionAr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-800">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>توليد الرابط وحفظ المستخدم</span>
                </button>
              </div>
            </form>
          </>
        )}

      </div>
    </div>
  );
};

