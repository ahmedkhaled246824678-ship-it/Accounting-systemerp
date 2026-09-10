import React, { useState } from "react";
import {
  Send,
  Copy,
  Check,
  X,
  Phone,
  MessageSquare,
  FileText,
  Download,
  Share2,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { WhatsAppShareData, formatWhatsAppMessage, sendViaWhatsApp } from "../utils/whatsapp";
import { CompanySettings, User } from "../types";
import { exportReportToPdf } from "../utils/export";

interface WhatsAppShareModalProps {
  data: WhatsAppShareData;
  companySettings?: CompanySettings;
  currentUser?: User | null;
  onClose: () => void;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  data,
  companySettings,
  currentUser,
  onClose,
}) => {
  const [phoneNumber, setPhoneNumber] = useState(data.recipientPhone || "");
  const [customNotes, setCustomNotes] = useState(data.notes || "");
  const [copied, setCopied] = useState(false);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);

  const shareData: WhatsAppShareData = {
    ...data,
    notes: customNotes,
  };

  const previewText = formatWhatsAppMessage(shareData);

  const handleSend = () => {
    sendViaWhatsApp(shareData, phoneNumber);
    onClose();
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPdf = async () => {
    if (!companySettings) {
      alert("بيانات إعدادات الشركة غير متوفرة لإنشاء ملف الـ PDF");
      return;
    }
    setIsGeneratingPdf(true);
    try {
      // Format details table for PDF
      const rowsHtml = shareData.details
        .map(
          (d) => `
          <tr>
            <td style="font-weight: bold; width: 35%;">${d.label}:</td>
            <td style="font-family: monospace;">${d.value}</td>
          </tr>
        `
        )
        .join("");

      const contentHtml = `
        <div style="font-family: 'Cairo', sans-serif; font-size: 12px; margin-bottom: 20px;">
          <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #cbd5e1;">
            <h3 style="margin: 0 0 6px 0; color: #1e3a8a; font-size: 14px;">${shareData.title}</h3>
            ${shareData.subtitle ? `<p style="margin: 0; color: #475569; font-size: 11px;">${shareData.subtitle}</p>` : ""}
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          ${
            shareData.totalAmount !== undefined
              ? `
              <div style="text-align: left; padding: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; margin-bottom: 16px;">
                <span style="font-size: 13px; font-weight: bold; color: #065f46;">
                  الإجمالي / الرصيد المستحق: ${shareData.totalAmount.toLocaleString()} ${shareData.currency || companySettings.currency}
                </span>
              </div>
            `
              : ""
          }

          ${
            customNotes
              ? `
              <div style="padding: 10px; background: #f8fafc; border-right: 3px solid #3b82f6; border-radius: 4px; margin-bottom: 16px;">
                <strong style="color: #1e3a8a; font-size: 11px;">ملاحظات خاصة:</strong>
                <p style="margin: 4px 0 0 0; color: #334155; font-size: 11px;">${customNotes}</p>
              </div>
            `
              : ""
          }

          ${
            shareData.shareUrl
              ? `
              <div style="font-size: 10px; color: #64748b; margin-top: 10px;">
                رابط التحقق الإلكتروني: <a href="${shareData.shareUrl}" style="color: #2563eb;">${shareData.shareUrl}</a>
              </div>
            `
              : ""
          }
        </div>
      `;

      await exportReportToPdf(
        shareData.title,
        contentHtml,
        companySettings,
        `كشف_حساب_${shareData.title}`,
        {
          includeSignature,
          signatureUser: currentUser,
          signatureTitle: currentUser?.signatureTitle || "المحاسب المعتمد ورئيس الحسابات",
        }
      );

      setPdfDownloaded(true);
      setTimeout(() => setPdfDownloaded(false), 4000);
    } catch (e) {
      console.error("PDF generation error:", e);
      alert("حدث خطأ أثناء إنشاء ملف الـ PDF. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-[#11141B] border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-[#161B24] border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">مشاركة وإرسال كشف الحساب والملفات عبر واتساب</h3>
              <p className="text-[11px] text-gray-400">{data.title}</p>
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
          {/* PDF Generation & Attachment Box */}
          <div className="p-3.5 bg-[#161B24] border border-emerald-500/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <FileText className="w-4 h-4" />
                <span>إرفاق ملف PDF معتمد للكشف</span>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                PDF جاهز للطباعة والمشاركة
              </span>
            </div>

            {/* Signature Toggle for PDF */}
            <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white transition">
              <input
                type="checkbox"
                checked={includeSignature}
                onChange={(e) => setIncludeSignature(e.target.checked)}
                className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs">تضمين التوقيع والاعتماد الإلكتروني في ملف الـ PDF المرفق</span>
            </label>

            {/* Download PDF Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 rounded-lg font-semibold transition text-xs"
              >
                {isGeneratingPdf ? (
                  <span>جاري إنشاء وتصدير ملف الـ PDF...</span>
                ) : pdfDownloaded ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">تم تنزيل ملف الـ PDF بنجاح!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>تحميل ملف الـ PDF المعتمد لإرفاقه في واتساب</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-400">
              💡 يمكنك تحميل ملف الـ PDF المعتمد بنقرة واحدة، ثم الضغط على "إرسال عبر واتساب" لإرفاق الملف مباشرة داخل المحادثة.
            </p>
          </div>

          {/* Phone Number Input */}
          <div>
            <label className="block text-gray-300 font-medium mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>رقم هاتف المستلم (اختياري - بكود الدولة مثل 201xxxxxxxxx أو 966xxxxxxxxx):</span>
            </label>
            <input
              type="text"
              placeholder="مثال: 201012345678 (اتركه فارغاً للاختيار مباشرة من قائمة جهات اتصال واتساب)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full bg-[#1A1F2B] border border-gray-700/80 rounded-xl px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 transition text-left dir-ltr"
            />
          </div>

          {/* Notes Input */}
          <div>
            <label className="block text-gray-300 font-medium mb-1">
              إضافة ملاحظة مخصصة بالرسالة:
            </label>
            <input
              type="text"
              placeholder="ملاحظات إضافية مرفقة مع الإرسال..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              className="w-full bg-[#1A1F2B] border border-gray-700/80 rounded-xl px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Message Preview */}
          <div>
            <label className="block text-gray-300 font-medium mb-1">
              معاينة نص الرسالة المنسق للواتساب:
            </label>
            <div className="bg-[#0A0D14] border border-gray-800 rounded-xl p-3 max-h-40 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] text-emerald-300/90 leading-relaxed dir-rtl select-all">
              {previewText}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#161B24] border-t border-gray-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1A1F2B] hover:bg-[#232A36] text-gray-200 border border-gray-700 rounded-xl font-medium transition text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">تم النسخ!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-400" />
                <span>نسخ النص</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition text-xs font-medium"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSend}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition shadow-lg shadow-emerald-900/30 text-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال عبر واتساب الآن</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
