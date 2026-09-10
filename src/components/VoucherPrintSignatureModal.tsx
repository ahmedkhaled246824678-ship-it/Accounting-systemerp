import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Printer,
  Download,
  MessageSquare,
  PenTool,
  Upload,
  CheckCircle,
  RotateCcw,
  ShieldCheck,
  Building,
  Calendar,
  DollarSign,
  FileText,
  UserCheck,
} from "lucide-react";
import { CompanySettings, Account, TreasuryVoucher, BankVoucher } from "../types";
import { printReport, exportReportToPdf } from "../utils/export";
import { numberToArabicWords } from "../utils/numberToArabicWords";

export interface VoucherPrintSignatureModalProps {
  voucher: (TreasuryVoucher | BankVoucher) & {
    voucherType?: "RECEIPT" | "PAYMENT" | string;
    type?: string;
  };
  voucherKind: "treasury" | "bank";
  companySettings: CompanySettings;
  accounts: Account[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateVoucherSignature?: (
    voucherId: string,
    signatureData: { electronicSignature: string; signedBy: string; signerTitle: string }
  ) => void;
}

const DEFAULT_SIG_KEY = "erp_default_digital_signature";
const DEFAULT_SIGNER_KEY = "erp_default_signer_name";
const DEFAULT_TITLE_KEY = "erp_default_signer_title";

export const VoucherPrintSignatureModal: React.FC<VoucherPrintSignatureModalProps> = ({
  voucher,
  voucherKind,
  companySettings,
  accounts,
  isOpen,
  onClose,
  onUpdateVoucherSignature,
}) => {
  const [signatureMode, setSignatureMode] = useState<"draw" | "upload" | "certified">("draw");
  const [signatureImage, setSignatureImage] = useState<string>(() => {
    return voucher.electronicSignature || localStorage.getItem(DEFAULT_SIG_KEY) || "";
  });
  const [signerName, setSignerName] = useState<string>(() => {
    return voucher.signedBy || localStorage.getItem(DEFAULT_SIGNER_KEY) || "المحاسب المعتمد / الإدارة المالية";
  });
  const [signerTitle, setSignerTitle] = useState<string>(() => {
    return voucher.signerTitle || localStorage.getItem(DEFAULT_TITLE_KEY) || "المدير المالي ورئيس الحسابات";
  });
  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Canvas drawing refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (voucher.electronicSignature) {
      setSignatureImage(voucher.electronicSignature);
    } else {
      const saved = localStorage.getItem(DEFAULT_SIG_KEY);
      if (saved) setSignatureImage(saved);
    }
  }, [voucher]);

  // Set up Canvas
  useEffect(() => {
    if (signatureMode === "draw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#1d4ed8"; // Professional dark blue ink
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [signatureMode]);

  if (!isOpen) return null;

  // Resolve accounts
  const oppAccountId = "oppositeAccountId" in voucher ? voucher.oppositeAccountId : undefined;
  const oppAcc = oppAccountId ? accounts.find((a) => a.id === oppAccountId) : null;

  const bankOrTreasuryAccountId =
    "treasuryAccountId" in voucher
      ? voucher.treasuryAccountId
      : "bankAccountId" in voucher
      ? voucher.bankAccountId
      : "";
  const primaryAcc = accounts.find((a) => a.id === bankOrTreasuryAccountId);

  // Determine Title & Type
  let voucherTitle = "سند مالي";
  let badgeColor = "bg-blue-600";
  if (voucherKind === "treasury") {
    const isReceipt = (voucher as TreasuryVoucher).voucherType === "RECEIPT";
    voucherTitle = isReceipt ? "سند قبض نقدية" : "سند صرف نقدية";
    badgeColor = isReceipt ? "bg-emerald-600" : "bg-rose-600";
  } else {
    const bType = (voucher as BankVoucher).type;
    if (bType === "DEPOSIT") {
      voucherTitle = "سند إيداع بنكي";
      badgeColor = "bg-emerald-600";
    } else if (bType === "WITHDRAWAL") {
      voucherTitle = "سند سحب بنكي";
      badgeColor = "bg-rose-600";
    } else if (bType === "TRANSFER") {
      voucherTitle = "سند تحويل بنكي";
      badgeColor = "bg-blue-600";
    } else {
      voucherTitle = "سند مصروفات بنكية";
      badgeColor = "bg-amber-600";
    }
  }

  const amountInWords = numberToArabicWords(voucher.amount, companySettings.currency || "جنيه مصري");

  // Handle Drawing events
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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

  // Handle Upload Image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const res = event.target?.result as string;
      if (res) {
        setSignatureImage(res);
      }
    };
    reader.readAsDataURL(file);
  };

  // Generate Certified Stamp
  const handleApplyCertifiedStamp = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "rgba(16, 185, 129, 0.05)";
    ctx.fillRect(0, 0, 320, 120);

    // Border
    ctx.strokeStyle = "#059669";
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, 308, 108);

    ctx.font = "bold 15px sans-serif";
    ctx.fillStyle = "#065f46";
    ctx.textAlign = "center";
    ctx.fillText("✓ معتمد إلكترونياً - إدارة الحسابات", 160, 36);

    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#047857";
    ctx.fillText(`${companySettings.companyName}`, 160, 60);

    ctx.font = "bold 12px monospace";
    ctx.fillStyle = "#1e293b";
    ctx.fillText(`كود التحقق: SIG-${voucher.voucherNumber}-${new Date().getFullYear()}`, 160, 84);

    ctx.font = "10px sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText(`تاريخ الاعتماد: ${new Date().toLocaleDateString("ar-EG")}`, 160, 104);

    const dataUrl = canvas.toDataURL("image/png");
    setSignatureImage(dataUrl);
  };

  // Save changes if requested
  const persistSignature = () => {
    if (saveAsDefault && signatureImage) {
      try {
        localStorage.setItem(DEFAULT_SIG_KEY, signatureImage);
        localStorage.setItem(DEFAULT_SIGNER_KEY, signerName);
        localStorage.setItem(DEFAULT_TITLE_KEY, signerTitle);
      } catch (e) {
        console.warn("Could not persist default signature:", e);
      }
    }
    if (onUpdateVoucherSignature) {
      onUpdateVoucherSignature(voucher.id, {
        electronicSignature: signatureImage,
        signedBy: signerName,
        signerTitle: signerTitle,
      });
    }
  };

  // Build Voucher Printable HTML
  const generateVoucherHtml = () => {
    const sigHtml = signatureImage
      ? `<div style="text-align: center; margin-top: 8px;">
          <img src="${signatureImage}" alt="توقيع إلكتروني" style="max-height: 75px; max-width: 180px; object-fit: contain; margin: 0 auto; display: block; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px;" />
          <p style="margin: 3px 0 0 0; font-size: 11px; color: #15803d; font-weight: bold;">✓ تم التوقيع والاعتماد إلكترونياً</p>
         </div>`
      : `<div style="height: 60px; border-bottom: 1px dashed #94a3b8; margin: 10px 20px;"></div>`;

    return `
      <div style="direction: rtl; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; border: 2px solid #1e3a8a; border-radius: 12px; max-width: 850px; margin: 0 auto; background: #ffffff;">
        
        <!-- Voucher Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 15px; margin-bottom: 20px;">
          <div>
            <h1 style="margin: 0; font-size: 22px; color: #1e3a8a;">${companySettings.companyName}</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">سجل تجاري: ${companySettings.commercialRegister || "-"} | بطاقة ضريبية: ${companySettings.taxNumber || "-"}</p>
          </div>
          <div style="text-align: left;">
            <div style="display: inline-block; background: #eff6ff; border: 1.5px solid #2563eb; padding: 6px 16px; border-radius: 8px;">
              <h2 style="margin: 0; font-size: 18px; color: #1e40af;">${voucherTitle}</h2>
              <p style="margin: 3px 0 0 0; font-size: 13px; font-weight: bold; color: #2563eb;">رقم السند: ${voucher.voucherNumber}</p>
            </div>
          </div>
        </div>

        <!-- Voucher Details Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 13px;">
          <tbody>
            <tr style="background: #f8fafc;">
              <td style="padding: 10px 12px; border: 1px solid #cbd5e1; width: 140px; font-weight: bold; color: #334155;">التاريخ:</td>
              <td style="padding: 10px 12px; border: 1px solid #cbd5e1; font-weight: bold;">${voucher.date}</td>
              <td style="padding: 10px 12px; border: 1px solid #cbd5e1; width: 140px; font-weight: bold; color: #334155;">المرجع / المستند:</td>
              <td style="padding: 10px 12px; border: 1px solid #cbd5e1;">${voucher.manualRef || "سند رسمي"}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #334155;">المبلغ رقماً:</td>
              <td style="padding: 10px 12px; border: 1px solid #cbd5e1; font-size: 17px; font-weight: bold; color: #16a34a;">
                ${voucher.amount.toLocaleString()} ${companySettings.currency}
              </td>
              <td style="padding: 10px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #334155;">المستفيد / المسلم:</td>
              <td style="padding: 10px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #1e293b;">
                ${voucher.beneficiary || "غير محدد"}
              </td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 10px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #334155;">المبلغ كتابة:</td>
              <td colspan="3" style="padding: 10px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #1e3a8a; font-style: italic;">
                فقط وقدره ${amountInWords} لا غير.
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #334155;">الحساب المقابل:</td>
              <td colspan="3" style="padding: 10px 12px; border: 1px solid #cbd5e1;">
                ${oppAcc ? `${oppAcc.code} - ${oppAcc.nameAr}` : primaryAcc ? `${primaryAcc.code} - ${primaryAcc.nameAr}` : "-"}
              </td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 10px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #334155;">البيان والغرض:</td>
              <td colspan="3" style="padding: 10px 12px; border: 1px solid #cbd5e1; line-height: 1.6;">
                ${voucher.notes || "-"}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Signatures Section with Electronic Signature -->
        <div style="margin-top: 35px; padding-top: 15px; border-top: 2px dashed #94a3b8;">
          <table style="width: 100%; text-align: center; font-size: 13px;">
            <thead>
              <tr>
                <th style="width: 33%; padding-bottom: 8px; color: #475569;">توقيع المستلم / المسلم</th>
                <th style="width: 33%; padding-bottom: 8px; color: #475569;">المحاسب المسؤول</th>
                <th style="width: 34%; padding-bottom: 8px; color: #1e3a8a; font-weight: bold;">
                  المسؤول المعتمد (توقيع إلكتروني)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <!-- Recipient -->
                <td style="vertical-align: bottom; padding: 10px 15px;">
                  <div style="height: 60px; border-bottom: 1px dashed #94a3b8; margin-bottom: 6px;"></div>
                  <p style="margin: 0; font-size: 12px; color: #64748b;">الاسم: ${voucher.beneficiary || "...................."}</p>
                </td>

                <!-- Accountant -->
                <td style="vertical-align: bottom; padding: 10px 15px;">
                  <div style="height: 60px; border-bottom: 1px dashed #94a3b8; margin-bottom: 6px;"></div>
                  <p style="margin: 0; font-size: 12px; color: #64748b;">المحاسب المختص</p>
                </td>

                <!-- Authorized Official with Digital Signature -->
                <td style="vertical-align: bottom; padding: 10px 15px; background: #f0fdf4; border-radius: 8px; border: 1px solid #86efac;">
                  ${sigHtml}
                  <p style="margin: 5px 0 0 0; font-size: 13px; font-weight: bold; color: #166534;">
                    ${signerName}
                  </p>
                  <p style="margin: 2px 0 0 0; font-size: 11px; color: #15803d;">
                    ${signerTitle}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer note -->
        <div style="margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8;">
          <span>تم الإصدار والاعتماد بواسطة نظام الحسابات المتكامل Al-Mowaseb ERP</span>
          <span>تاريخ الطباعة: ${new Date().toLocaleDateString("ar-EG")} ${new Date().toLocaleTimeString("ar-EG")}</span>
        </div>
      </div>
    `;
  };

  const handlePrint = () => {
    persistSignature();
    const html = generateVoucherHtml();
    printReport(`${voucherTitle} - ${voucher.voucherNumber}`, html, companySettings);
  };

  const handleExportPdf = async () => {
    persistSignature();
    setIsExporting(true);
    try {
      const html = generateVoucherHtml();
      await exportReportToPdf(`${voucherTitle}_${voucher.voucherNumber}`, html, companySettings);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendWhatsApp = () => {
    persistSignature();
    const msg = `🏢 *${companySettings.companyName}*\n📄 *${voucherTitle}*\n\n📌 *رقم السند:* ${voucher.voucherNumber}\n📅 *التاريخ:* ${voucher.date}\n💰 *المبلغ:* ${voucher.amount.toLocaleString()} ${companySettings.currency}\n✍️ *المبلغ بالحروف:* ${amountInWords}\n👤 *المستفيد:* ${voucher.beneficiary || "-"}\n📝 *البيان:* ${voucher.notes || "-"}\n\n✅ *معتمد وموقع إلكترونياً بواسطة:* ${signerName} (${signerTitle})\n\nصادر من الإدارة المالية بنظام ERP.`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-6">
        
        {/* Modal Top Header */}
        <div className="bg-slate-800/90 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-lg text-white font-bold text-xs ${badgeColor}`}>
              {voucherTitle}
            </span>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>طباعة واعتماد السند مع التوقيع الإلكتروني</span>
                <span className="text-blue-400 font-mono text-sm">#{voucher.voucherNumber}</span>
              </h3>
              <p className="text-xs text-slate-400">
                إضافة أو رفع توقيع رقمي للمسؤول المعتمد لطباعة السند وتصديره كـ PDF
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(85vh-120px)] overflow-y-auto custom-scrollbar">
          
          {/* Quick Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/60 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">رقم السند:</span>
              <strong className="text-white font-mono text-sm">{voucher.voucherNumber}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">التاريخ:</span>
              <strong className="text-slate-200">{voucher.date}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">المبلغ الإجمالي:</span>
              <strong className="text-emerald-400 font-bold text-sm">
                {voucher.amount.toLocaleString()} {companySettings.currency}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">المستفيد:</span>
              <strong className="text-slate-200 truncate block">{voucher.beneficiary || "-"}</strong>
            </div>
          </div>

          {/* Electronic Signature Configuration Box */}
          <div className="bg-slate-800/40 border border-blue-500/30 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-white text-sm">
                  إعدادات التوقيع الإلكتروني والمسؤول المعتمد
                </h4>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => setSignatureMode("draw")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                    signatureMode === "draw"
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>رسم التوقيع باليد</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode("upload")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                    signatureMode === "upload"
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>رفع صورة التوقيع</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSignatureMode("certified");
                    handleApplyCertifiedStamp();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                    signatureMode === "certified"
                      ? "bg-emerald-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>ختم رقمي معتمد</span>
                </button>
              </div>
            </div>

            {/* Inputs: Signer Name & Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold mb-1 block">
                  اسم المسؤول المعتمد للسند:
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="مثال: أحمد خالد - مدير الحسابات"
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold mb-1 block">
                  المسمى الوظيفي / الصفة:
                </label>
                <input
                  type="text"
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  placeholder="مثال: المدير المالي والرقابة الداخلية"
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Signature Area based on active mode */}
            <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-6">
              
              {/* Left Canvas or Upload Box */}
              <div className="w-full md:w-1/2">
                {signatureMode === "draw" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                        <PenTool className="w-3.5 h-3.5 text-blue-400" />
                        <span>ارسم توقيعك هنا بالماوس أو شاشة اللمس:</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleClearCanvas}
                        className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>مسح التوقيع</span>
                      </button>
                    </div>

                    <div className="bg-white rounded-lg p-1 border-2 border-dashed border-blue-400">
                      <canvas
                        ref={canvasRef}
                        width={350}
                        height={110}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-28 cursor-crosshair touch-none bg-white rounded"
                      />
                    </div>
                  </div>
                )}

                {signatureMode === "upload" && (
                  <div className="space-y-2">
                    <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>اختر صورة التوقيع أو الختم من جهازك (PNG شفاف / JPG):</span>
                    </span>
                    <label className="border-2 border-dashed border-slate-600 hover:border-emerald-500 bg-slate-800/50 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition">
                      <Upload className="w-6 h-6 text-emerald-400 mb-1" />
                      <span className="text-xs text-slate-200 font-semibold">
                        انقر لاختيار ملف التوقيع
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        يدعم ملفات الصور بوضوح عالي
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {signatureMode === "certified" && (
                  <div className="space-y-2">
                    <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>الختم الرقمي المشفر المعتمد:</span>
                    </span>
                    <div className="bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-lg text-emerald-200 text-xs">
                      <p className="font-bold flex items-center gap-1 mb-1">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>تم إنشاء توقيع رقمي موثق للسند</span>
                      </p>
                      <p className="text-[11px] text-emerald-300/80">
                        يتضمن اسم المنشأة، كود التحقق الأمني، وتاريخ الاعتماد الرسمي.
                      </p>
                      <button
                        type="button"
                        onClick={handleApplyCertifiedStamp}
                        className="mt-2 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded font-semibold transition"
                      >
                        إعادة توليد الختم
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Signature Preview Card */}
              <div className="w-full md:w-1/2 flex flex-col items-center justify-center border-t md:border-t-0 md:border-r border-slate-700 md:pr-6 pt-4 md:pt-0">
                <span className="text-[11px] text-slate-400 font-semibold mb-2 block self-start">
                  معاينة مظهر التوقيع المعتمد في السند:
                </span>
                <div className="w-full bg-white p-3 rounded-xl border border-slate-300 min-h-[110px] flex flex-col items-center justify-center shadow-inner">
                  {signatureImage ? (
                    <>
                      <img
                        src={signatureImage}
                        alt="توقيع إلكتروني"
                        className="max-h-20 max-w-[200px] object-contain"
                      />
                      <div className="mt-1 text-center border-t border-slate-200 pt-1 w-full">
                        <span className="text-xs font-bold text-slate-800 block">
                          {signerName}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {signerTitle}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-slate-400 text-xs py-4">
                      <PenTool className="w-6 h-6 mx-auto mb-1 opacity-40" />
                      <span>لم يتم رسم أو رفع توقيع بعد</span>
                    </div>
                  )}
                </div>

                {/* Checkbox: Save as default */}
                <label className="flex items-center gap-2 mt-3 cursor-pointer self-start">
                  <input
                    type="checkbox"
                    checked={saveAsDefault}
                    onChange={(e) => setSaveAsDefault(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-300">
                    حفظ هذا التوقيع كافتراضي لجميع السندات القادمة
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Live Voucher Slip Preview */}
          <div>
            <span className="text-xs font-bold text-slate-300 mb-2 block">
              معاينة السند المالي النهائي قبل الطباعة:
            </span>
            <div
              className="bg-white text-slate-900 p-5 rounded-xl border border-slate-300 shadow overflow-x-auto text-xs"
              dangerouslySetInnerHTML={{ __html: generateVoucherHtml() }}
            />
          </div>

        </div>

        {/* Modal Action Buttons */}
        <div className="bg-slate-800/90 px-6 py-4 border-t border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold transition"
          >
            إغلاق
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSendWhatsApp}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow transition"
              title="إرسال إشعار السند المعتمد عبر واتساب"
            >
              <MessageSquare className="w-4 h-4" />
              <span>إرسال واتساب</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition"
              title="تصدير السند بصيغة PDF معتمدة"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? "جاري التصدير..." : "تصدير السند PDF"}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition"
              title="طباعة السند الورقي مباشرة"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة السند مع التوقيع</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
