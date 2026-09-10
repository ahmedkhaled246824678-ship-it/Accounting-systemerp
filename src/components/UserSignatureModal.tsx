import React, { useState, useRef, useEffect } from "react";
import {
  X,
  PenTool,
  Upload,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  Award,
  FileCheck,
  UserCheck,
} from "lucide-react";
import { User } from "../types";

interface UserSignatureModalProps {
  user: User;
  isOpen: boolean;
  canApproveAsAdmin: boolean;
  onClose: () => void;
  onSaveSignature: (updatedData: {
    electronicSignature: string;
    signatureTitle: string;
    isSignatureApproved: boolean;
  }) => void;
}

export const UserSignatureModal: React.FC<UserSignatureModalProps> = ({
  user,
  isOpen,
  canApproveAsAdmin,
  onClose,
  onSaveSignature,
}) => {
  const [signatureMode, setSignatureMode] = useState<"draw" | "upload" | "certified">("draw");
  const [signatureImage, setSignatureImage] = useState<string>(user.electronicSignature || "");
  const [signatureTitle, setSignatureTitle] = useState<string>(
    user.signatureTitle ||
      (user.role === "SUPER_ADMIN" || user.role === "ADMIN"
        ? "مدير النظام والرقابة المالية"
        : user.role === "ACCOUNTANT"
        ? "المحاسب المعتمد ورئيس الحسابات"
        : user.role === "AUDITOR"
        ? "المدقق والمراجع المالي المعتمد"
        : "المسؤول المالي المعتمد")
  );
  const [isSignatureApproved, setIsSignatureApproved] = useState<boolean>(
    user.isSignatureApproved ?? (user.role === "SUPER_ADMIN" || user.role === "ADMIN")
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    setSignatureImage(user.electronicSignature || "");
    setSignatureTitle(
      user.signatureTitle ||
        (user.role === "SUPER_ADMIN" || user.role === "ADMIN"
          ? "مدير النظام والرقابة المالية"
          : "المحاسب المعتمد ورئيس الحسابات")
    );
    setIsSignatureApproved(
      user.isSignatureApproved ?? (user.role === "SUPER_ADMIN" || user.role === "ADMIN")
    );
  }, [user]);

  useEffect(() => {
    if (signatureMode === "draw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#1d4ed8";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [signatureMode]);

  if (!isOpen) return null;

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      setSignatureImage(dataUrl);
    }
  };

  const handleClearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    setSignatureImage("");
    setHasDrawn(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      setSignatureImage(result);
    };
    reader.readAsDataURL(file);
  };

  const generateCertifiedStamp = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 300, 100);

    ctx.strokeStyle = "#1e40af";
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, 288, 88);

    ctx.strokeStyle = "#93c5fd";
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, 276, 76);

    ctx.font = "bold 14px Cairo, sans-serif";
    ctx.fillStyle = "#1e3a8a";
    ctx.textAlign = "center";
    ctx.fillText("معتمد وموقع إلكترونياً", 150, 34);

    ctx.font = "12px Cairo, sans-serif";
    ctx.fillStyle = "#0f172a";
    ctx.fillText(user.fullName || user.username, 150, 56);

    ctx.font = "10px Cairo, sans-serif";
    ctx.fillStyle = "#059669";
    ctx.fillText(`✓ ${signatureTitle} - معتمد رسمياً`, 150, 76);

    setSignatureImage(canvas.toDataURL("image/png"));
  };

  const handleSave = () => {
    onSaveSignature({
      electronicSignature: signatureImage,
      signatureTitle: signatureTitle.trim(),
      isSignatureApproved,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-[#11141B] border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-[#161B24] border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                اعتماد وتوثيق التوقيع الإلكتروني للمستخدم
              </h3>
              <p className="text-[11px] text-gray-400">
                {user.fullName} ({user.username})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Official Title Input */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">
              المسمى الوظيفي والصفة في التقارير والسندات:
            </label>
            <input
              type="text"
              value={signatureTitle}
              onChange={(e) => setSignatureTitle(e.target.value)}
              placeholder="مثال: المحاسب المعتمد ورئيس الحسابات / المدير المالي"
              className="w-full bg-[#1A1F2B] border border-gray-700 rounded-xl px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex bg-[#161B24] p-1 rounded-xl border border-gray-800 gap-1">
            <button
              type="button"
              onClick={() => setSignatureMode("draw")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition flex items-center justify-center gap-1.5 ${
                signatureMode === "draw"
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>رسم التوقيع بالقلم</span>
            </button>
            <button
              type="button"
              onClick={() => setSignatureMode("upload")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition flex items-center justify-center gap-1.5 ${
                signatureMode === "upload"
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>رفع صورة / ختم</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSignatureMode("certified");
                generateCertifiedStamp();
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition flex items-center justify-center gap-1.5 ${
                signatureMode === "certified"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>ختم رقمي جاهز</span>
            </button>
          </div>

          {/* Draw Mode Canvas */}
          {signatureMode === "draw" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-gray-300 font-medium">
                  قم برسم إمضائك الشخصي في المربع أدناه:
                </span>
                <button
                  type="button"
                  onClick={handleClearCanvas}
                  className="text-gray-400 hover:text-rose-400 flex items-center gap-1 text-[11px] transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>مسح اللوحة</span>
                </button>
              </div>
              <div className="bg-white rounded-xl border-2 border-dashed border-gray-400 overflow-hidden cursor-crosshair shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={140}
                  className="w-full h-36 touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                حرك المؤشر أو إصبعك لرسم التوقيع الفعلي. سيتم حفظه واستخدامه في كشوف الحسابات
                وسندات القبض والصرف.
              </p>
            </div>
          )}

          {/* Upload Mode */}
          {signatureMode === "upload" && (
            <div className="space-y-3">
              <label className="block p-6 border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-xl text-center cursor-pointer bg-[#161B24] transition">
                <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <span className="text-gray-300 font-medium block">
                  اختر صورة التوقيع أو الختم (PNG / JPG)
                </span>
                <span className="text-[11px] text-gray-500 block mt-1">
                  يفضل صورة مفرغة الخلفية (خلفية شفافة)
                </span>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Signature Preview */}
          {signatureImage && (
            <div>
              <label className="block text-gray-300 font-medium mb-1">
                معاينة التوقيع المعتمد الحالي:
              </label>
              <div className="bg-white p-3 rounded-xl border border-gray-300 flex items-center justify-center min-h-[90px]">
                <img
                  src={signatureImage}
                  alt="التوقيع"
                  className="max-h-24 max-w-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Admin Approval Toggle */}
          {canApproveAsAdmin && (
            <div className="p-3 bg-[#1A1F2B] border border-blue-500/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-white text-xs block flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>اعتماد وتوثيق التوقيع رسمياً بالنظام</span>
                </span>
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  يمنح التوقيع شارة الاعتماد الرقمية وتضمينه في الطباعة الرسمية
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSignatureApproved}
                  onChange={(e) => setIsSignatureApproved(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#161B24] border-t border-gray-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition text-xs font-medium"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-lg shadow-blue-900/30 text-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>حفظ واعتماد التوقيع</span>
          </button>
        </div>
      </div>
    </div>
  );
};
