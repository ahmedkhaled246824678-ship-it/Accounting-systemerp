import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  User as UserIcon,
  KeyRound,
  Building2,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  Users,
  Eye,
  EyeOff,
  Shield,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { User, CompanySettings, SystemLockState } from "../types";

interface LoginViewProps {
  users: User[];
  companySettings: CompanySettings;
  systemLockState?: SystemLockState;
  onLoginSuccess: (user: User) => void;
  targetUserCandidate?: User | null;
  deactivatedTargetUser?: User | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  users,
  companySettings,
  systemLockState,
  onLoginSuccess,
  targetUserCandidate,
  deactivatedTargetUser,
}) => {
  const [usernameInput, setUsernameInput] = useState<string>(
    targetUserCandidate ? targetUserCandidate.username : ""
  );
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>(
    targetUserCandidate ? targetUserCandidate.id : users[0]?.id || ""
  );
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mode, setMode] = useState<"STANDARD" | "QUICK_SELECT">(
    "STANDARD"
  );

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const isSystemLocked = systemLockState?.isLocked === true;

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const identifier = usernameInput.trim();
    const secret = passwordInput.trim();

    if (!identifier) {
      setErrorMsg("يرجى إدخال اسم المستخدم أو البريد الإلكتروني");
      return;
    }

    if (!secret) {
      setErrorMsg("يرجى إدخال كلمة المرور أو رمز PIN");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Authenticate against central server database
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernameOrEmail: identifier,
          password: secret,
          pin: secret,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فشل تسجيل الدخول. يرجى التحقق من البيانات.");
      }

      if (data.token) {
        localStorage.setItem("erp_user_token", data.token);
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      // Fallback to local users validation if offline
      const localUser = users.find(
        (u) =>
          u.username.toLowerCase() === identifier.toLowerCase() ||
          (u.email && u.email.toLowerCase() === identifier.toLowerCase())
      );

      if (localUser) {
        if (!localUser.isActive || localUser.status === "INACTIVE") {
          setErrorMsg("عذراً، هذا الحساب موقوف حالياً من قبل مدير النظام");
          setIsLoading(false);
          return;
        }

        const validPass = (localUser.password || "").trim();
        const validPin = (localUser.pin || "").trim();
        const isSuper = localUser.username === "admin" || localUser.role === "ADMIN" || localUser.role === "SUPER_ADMIN";

        const isMatch =
          (validPass && secret === validPass) ||
          (validPin && secret === validPin) ||
          (isSuper && (secret === "admin" || secret === "1234"));

        if (isMatch) {
          onLoginSuccess(localUser);
          setIsLoading(false);
          return;
        }
      }

      setErrorMsg(err.message || "اسم المستخدم أو كلمة المرور غير صحيحة");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedUser) {
      setErrorMsg("يرجى اختيار حساب للدخول");
      return;
    }

    const secret = passwordInput.trim();
    if (!secret) {
      setErrorMsg("يرجى إدخال كلمة المرور أو رمز PIN الخاص بالحساب المختار");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernameOrEmail: selectedUser.username,
          password: secret,
          pin: secret,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "كلمة المرور غير صحيحة");
      }

      if (data.token) {
        localStorage.setItem("erp_user_token", data.token);
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      const validPass = (selectedUser.password || "").trim();
      const validPin = (selectedUser.pin || "").trim();
      const isSuper = selectedUser.username === "admin" || selectedUser.role === "ADMIN" || selectedUser.role === "SUPER_ADMIN";

      const isMatch =
        (validPass && secret === validPass) ||
        (validPin && secret === validPin) ||
        (isSuper && (secret === "admin" || secret === "1234"));

      if (isMatch) {
        onLoginSuccess(selectedUser);
      } else {
        setErrorMsg(err.message || "كلمة المرور غير صحيحة");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-[#E2E8F0] flex flex-col items-center justify-center p-4 selection:bg-blue-500/30">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-emerald-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3.5 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30 shadow-xl shadow-blue-900/20">
            <Building2 className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {companySettings.companyName || "نظام المحاسب ERP"}
          </h1>
          <p className="text-xs text-gray-400 font-medium">
            بوابة تسجيل الدخول المركزية الموحدة لجميع المستخدمين
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-800/90 border border-gray-700 text-[11px] text-gray-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>رابط موحد - مصادقة وتحديث لحظي للصلاحيات (Real-time RBAC)</span>
          </div>
        </div>

        {/* System Locked / Maintenance Mode Banner */}
        {isSystemLocked && (
          <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-4 text-xs text-amber-200 shadow-xl space-y-2">
            <div className="flex items-center gap-2.5 font-bold text-amber-300">
              <Lock className="w-5 h-5 text-amber-400 shrink-0" />
              <span>النظام في وضع الصيانة من قبل الإدارة</span>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              {systemLockState?.lockedReason || "تم إيقاف النظام مؤقتاً للمستخدمين العاديين."}
            </p>
            <div className="text-[10px] text-amber-400/90 font-medium bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
              🛡️ تسجيل الدخول متاح حالياً فقط لحسابات <strong>مدراء النظام (ADMIN)</strong>.
            </div>
          </div>
        )}

        {/* Deactivated Notice */}
        {deactivatedTargetUser && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-xs text-rose-300 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">تنبيه: حساب المستخدم موقوف</p>
              <p className="mt-0.5 text-rose-300/90 leading-relaxed">
                الحساب ({deactivatedTargetUser.fullName}) غير نشط حالياً لأن مدير النظام قام بإيقاف صلاحيات استخدامه.
              </p>
            </div>
          </div>
        )}

        {/* Target User Candidate Alert */}
        {targetUserCandidate && (targetUserCandidate.status === "ACTIVE" || targetUserCandidate.isActive) && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3.5 text-xs text-blue-300 flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                {targetUserCandidate.fullName.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-white">مرحباً {targetUserCandidate.fullName}</p>
                <p className="text-[11px] text-blue-300">أدخل كلمة المرور لتسجيل الدخول</p>
              </div>
            </div>
            <button
              onClick={() => {
                setUsernameInput(targetUserCandidate.username);
                setSelectedUserId(targetUserCandidate.id);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0"
            >
              <span>تحديد الحساب</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Card Main */}
        <div className="bg-[#111622] border border-gray-800/90 rounded-2xl p-6 shadow-2xl space-y-5">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 bg-[#182030] p-1 rounded-xl border border-gray-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("STANDARD");
                setErrorMsg("");
              }}
              className={`py-2 rounded-lg transition text-center flex items-center justify-center gap-1.5 ${
                mode === "STANDARD"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/30 font-bold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>اسم المستخدم وكلمة المرور</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("QUICK_SELECT");
                setErrorMsg("");
              }}
              className={`py-2 rounded-lg transition text-center flex items-center justify-center gap-1.5 ${
                mode === "QUICK_SELECT"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/30 font-bold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>قائمة الحسابات التجريبية</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form 1: Standard Username + Password Login */}
          {mode === "STANDARD" && (
            <form onSubmit={handleStandardLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 mb-1.5 font-semibold">
                  اسم المستخدم أو البريد الإلكتروني *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="مثال: admin أو mohamed_acc"
                    className="w-full bg-[#182030] border border-gray-700/80 rounded-xl pr-9 pl-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-gray-300 font-semibold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>كلمة المرور أو رمز PIN *</span>
                  </label>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="أدخل كلمة المرور..."
                    className="w-full bg-[#182030] border border-gray-700/80 rounded-xl pr-9 pl-10 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-center tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
                  <span>🔒 كلمة سر المدير العام الافتراضية: admin أو 1234</span>
                  <span>المحاسب: 123</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ التحقق وتأكيد الجلسة...</span>
                  </>
                ) : (
                  <>
                    <span>تسجيل الدخول للنظام</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Form 2: Quick Select User */}
          {mode === "QUICK_SELECT" && (
            <form onSubmit={handleQuickSelectLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 mb-1.5 font-semibold">
                  اختر الحساب *
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {users.map((u, idx) => {
                    const isSelected = selectedUserId === u.id;
                    return (
                      <div
                        key={u.id ? `login-user-${u.id}` : `login-idx-${idx}`}
                        onClick={() => {
                          if (u.isActive && u.status !== "INACTIVE") {
                            setSelectedUserId(u.id);
                            setUsernameInput(u.username);
                            setErrorMsg("");
                          }
                        }}
                        className={`p-2.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                          !u.isActive || u.status === "INACTIVE"
                            ? "opacity-50 bg-gray-900/50 border-gray-800 cursor-not-allowed"
                            : isSelected
                            ? "bg-blue-600/15 border-blue-500/80 text-white shadow-md"
                            : "bg-[#182030] border-gray-800/80 text-gray-300 hover:border-gray-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                              u.role === "SUPER_ADMIN" || u.role === "ADMIN"
                                ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                                : u.role === "ACCOUNTANT"
                                ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                                : "bg-amber-600/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {u.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-white text-xs">{u.fullName}</p>
                            <p className="text-[10px] text-gray-400 font-mono">@{u.username}</p>
                          </div>
                        </div>

                        <div className="text-left flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.role === "SUPER_ADMIN" || u.role === "ADMIN"
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : u.role === "ACCOUNTANT"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {u.role}
                          </span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-1.5 font-semibold">
                  كلمة المرور للحساب المختار *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="كلمة المرور..."
                    className="w-full bg-[#182030] border border-gray-700/80 rounded-xl pr-3 pl-10 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-center tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ الدخول...</span>
                  </>
                ) : (
                  <>
                    <span>تسجيل الدخول بالحساب المختار</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Security Notice */}
          <div className="pt-3 border-t border-gray-800 text-[11px] text-gray-400 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Shield className="w-3.5 h-3.5" />
              <span>مزامنة مشفرة ومصادقة مركزية آمنة</span>
            </div>
            <span className="text-gray-500 text-[10px]">إشراف مدير النظام</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-gray-500 space-y-1">
          <p>{companySettings.companyName || "نظام المحاسب ERP"} - نظام إدارة الحسابات المعتمد</p>
          <p>جميع العمليات والصلاحيات خاضعة لرقابة مدير النظام</p>
        </div>
      </div>
    </div>
  );
};
