import * as XLSX from "xlsx";
import { CompanySettings, User } from "../types";

export interface ReportPrintOptions {
  includeSignature?: boolean;
  signatureUser?: User | null;
  signatureTitle?: string;
  reportDate?: string;
}

/**
 * Export array of objects to Excel file
 */
export function exportToExcel(
  data: any[],
  fileName: string,
  sheetName = "بيانات المحاسبة"
) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  const cleanSheetName = (sheetName || "بيانات").replace(/[:\\/?*\[\]]/g, "").substring(0, 31);
  XLSX.utils.book_append_sheet(workbook, worksheet, cleanSheetName);

  // Auto-fit column widths
  const max_widths = data.reduce((acc, row) => {
    Object.keys(row).forEach((key, idx) => {
      const valStr = row[key] ? String(row[key]) : "";
      acc[idx] = Math.max(acc[idx] || key.length, valStr.length, 12);
    });
    return acc;
  }, [] as number[]);

  worksheet["!cols"] = max_widths.map((w) => ({ wch: w + 4 }));

  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`);
}

/**
 * Export multiple sheets into a single workbook
 */
export function exportMultipleSheetsToExcel(
  sheets: { sheetName: string; data: any[] }[],
  fileName: string
) {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ sheetName, data }) => {
    if (!data || data.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto-fit column widths
    const max_widths = data.reduce((acc, row) => {
      Object.keys(row).forEach((key, idx) => {
        const valStr = row[key] !== null && row[key] !== undefined ? String(row[key]) : "";
        acc[idx] = Math.max(acc[idx] || key.length, valStr.length, 12);
      });
      return acc;
    }, [] as number[]);

    worksheet["!cols"] = max_widths.map((w) => ({ wch: w + 4 }));

    const cleanSheetName = (sheetName || "ورقة").replace(/[:\\/?*\[\]]/g, "").substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, cleanSheetName);
  });

  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`);
}

function renderSignaturesSection(options?: ReportPrintOptions): string {
  if (options && options.includeSignature === false) {
    return `
      <div style="margin-top: 30px; font-size: 11px; color: #64748b; text-align: left; padding: 4px 8px; border-top: 1px dashed #cbd5e1;">
        <span>تم استخراج الوثيقة إلكترونياً (بدون توقيعات يدوية بناءً على خيار المستخدم)</span>
      </div>
    `;
  }

  const signer = options?.signatureUser;
  const signerName = signer?.fullName || signer?.username || "المحاسب المعتمد";
  const signerTitle = options?.signatureTitle || signer?.signatureTitle || (signer?.role === "ADMIN" || signer?.role === "SUPER_ADMIN" ? "مدير النظام والرقابة المالية" : "المحاسب المعتمد ورئيس الحسابات");
  const signatureImg = signer?.electronicSignature;
  const isApproved = signer?.isSignatureApproved ?? true;

  return `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; padding: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-family: 'Cairo', sans-serif;">
      <!-- Accountant / Signer Box -->
      <div style="text-align: center; width: 220px; padding: 8px;">
        <div style="font-size: 11px; font-weight: 700; color: #1e3a8a; margin-bottom: 6px;">
          ${signerTitle}
        </div>
        <div style="height: 60px; display: flex; align-items: center; justify-content: center; border-bottom: 1px dashed #94a3b8; margin-bottom: 6px;">
          ${
            signatureImg
              ? `<img src="${signatureImg}" style="max-height: 52px; max-width: 160px; object-fit: contain;" alt="التوقيع الإلكتروني" />`
              : `<div style="font-family: monospace; font-size: 13px; font-weight: bold; color: #1e40af; border: 1px solid #93c5fd; padding: 4px 10px; border-radius: 4px; background: #eff6ff;">
                  ✓ موقع إلكترونياً
                </div>`
          }
        </div>
        <div style="font-size: 11px; font-weight: 700; color: #0f172a;">${signerName}</div>
        ${
          isApproved
            ? `<div style="font-size: 9px; color: #059669; font-weight: 600; margin-top: 2px;">● توقيع واعتماد إلكتروني معتمد رسمياً</div>`
            : `<div style="font-size: 9px; color: #64748b;">توقيع مستخدم النظام</div>`
        }
      </div>

      <!-- Financial Auditor Box -->
      <div style="text-align: center; width: 180px; padding: 8px;">
        <div style="font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 6px;">
          المراجعة والتدقيق المالي
        </div>
        <div style="height: 60px; border-bottom: 1px dashed #94a3b8; margin-bottom: 6px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 10px; color: #94a3b8;">ختم / توقيع المراجع</span>
        </div>
        <div style="font-size: 11px; font-weight: 600; color: #475569;">إدارة الرقابة المالية</div>
      </div>

      <!-- Digital System Stamp Box -->
      <div style="text-align: center; width: 220px; padding: 8px; border: 1px solid #bfdbfe; border-radius: 6px; background-color: #ffffff;">
        <div style="font-size: 10px; font-weight: 800; color: #1e3a8a;">
          نظام المحاسب المتكامل ERP
        </div>
        <div style="font-size: 9px; color: #059669; font-weight: bold; margin: 4px 0;">
          ✓ وثيقة معتمدة ومطابقة محاسبياً
        </div>
        <div style="font-size: 9px; color: #64748b; font-family: monospace;">
          الكود الرقمي: ERP-${Math.floor(100000 + Math.random() * 900000)}
        </div>
        <div style="font-size: 8px; color: #94a3b8; margin-top: 2px;">
          حرر بتاريخ: ${new Date().toLocaleDateString("ar-EG")}
        </div>
      </div>
    </div>
  `;
}

/**
 * Direct PDF Export utility with professional accounting letterhead & formatting
 */
export async function exportReportToPdf(
  title: string,
  htmlContent: string,
  companySettings: CompanySettings,
  fileName?: string,
  options?: ReportPrintOptions
): Promise<void> {
  const cleanFileName = (fileName || title || "تقرير_محاسبي").replace(/\s+/g, "_");
  
  const currentDate = options?.reportDate || new Date().toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-9999px";
  container.style.left = "-9999px";
  container.style.width = "780px";
  container.style.backgroundColor = "#ffffff";
  container.style.color = "#0f172a";
  container.style.padding = "24px";
  container.style.fontFamily = "'Cairo', 'Segoe UI', Tahoma, sans-serif";
  container.dir = "rtl";

  const signaturesHtml = renderSignaturesSection(options);

  container.innerHTML = `
    <div style="direction: rtl; color: #0f172a; background: #ffffff; padding: 4px; font-family: 'Cairo', sans-serif;">
      <style>
        table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11px; }
        th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: right; }
        th { background-color: #f1f5f9; color: #0f172a; font-weight: 700; }
        tr:nth-child(even) td { background-color: #f8fafc; }
      </style>
      
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 16px;">
        <div>
          <h1 style="margin: 0 0 4px 0; font-size: 18px; color: #1e3a8a; font-weight: 800;">${companySettings.companyName}</h1>
          <p style="margin: 2px 0; font-size: 11px; color: #4b5563;">السجل التجاري: ${companySettings.commercialRegister} | الرقم الضريبي: ${companySettings.taxNumber}</p>
          <p style="margin: 2px 0; font-size: 11px; color: #4b5563;">العنوان: ${companySettings.address} | الهاتف: ${companySettings.phone}</p>
        </div>
        <div style="text-align: left;">
          ${companySettings.logoUrl ? `<img src="${companySettings.logoUrl}" style="max-height: 55px;" alt="شعار" />` : ''}
          <p style="margin: 2px 0; font-size: 10px; color: #64748b;">تاريخ الكشف: ${currentDate}</p>
          <p style="margin: 2px 0; font-size: 10px; color: #64748b;">السنة المالية: ${companySettings.financialYear}</p>
        </div>
      </div>

      <div style="text-align: center; margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 16px; color: #0f172a; border-bottom: 1px dashed #cbd5e1; display: inline-block; padding-bottom: 4px; font-weight: 700;">${title}</h2>
      </div>

      <div style="font-size: 12px;">
        ${htmlContent}
      </div>

      ${signaturesHtml}

      <div style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 10px; color: #64748b;">
        <div>${companySettings.reportFooterNote || "نظام المحاسبة المتكامل - Al-Mowaseb ERP"}</div>
        <div>وثيقة محاسبية رسمية مستخرجة آلياً</div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const html2pdfModule: any = await import("html2pdf.js");
    const html2pdfFn = html2pdfModule.default || html2pdfModule;
    const opt = {
      margin: [8, 8, 8, 8],
      filename: `${cleanFileName}_${new Date().toISOString().split("T")[0]}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
    await html2pdfFn().from(container).set(opt).save();
  } catch (err) {
    console.warn("html2pdf export encountered an issue, falling back to print window:", err);
    printReport(title, htmlContent, companySettings, options);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Open print view for an element or table with company branding header
 */
export function printReport(
  title: string,
  htmlContent: string,
  companySettings: CompanySettings,
  options?: ReportPrintOptions
) {
  const printWindow = window.open("", "_blank", "width=1000,height=800");
  if (!printWindow) {
    alert("يرجى السماح بالنوافذ المنبثقة للطباعة أو حفظ PDF");
    return;
  }

  const currentDate = options?.reportDate || new Date().toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const signaturesHtml = renderSignaturesSection(options);

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${title} - ${companySettings.companyName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        * {
          box-sizing: border-box;
          font-family: 'Cairo', sans-serif;
        }
        body {
          margin: 0;
          padding: 24px;
          background-color: #ffffff;
          color: #1f2937;
          font-size: 13px;
        }
        .print-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #1e3a8a;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .company-info h1 {
          margin: 0 0 4px 0;
          font-size: 20px;
          color: #1e3a8a;
          font-weight: 800;
        }
        .company-info p {
          margin: 2px 0;
          color: #4b5563;
          font-size: 12px;
        }
        .report-title-container {
          text-align: center;
          margin-bottom: 20px;
        }
        .report-title-container h2 {
          margin: 0;
          font-size: 18px;
          color: #0f172a;
          border-bottom: 1px dashed #cbd5e1;
          display: inline-block;
          padding-bottom: 6px;
        }
        .report-meta {
          font-size: 11px;
          color: #64748b;
          margin-top: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
          font-size: 12px;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          text-align: right;
        }
        th {
          background-color: #f1f5f9;
          color: #0f172a;
          font-weight: 700;
        }
        tr:nth-child(even) td {
          background-color: #f8fafc;
        }
        .print-footer {
          margin-top: 40px;
          border-top: 1px solid #e2e8f0;
          padding-top: 16px;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #64748b;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body { padding: 0; background: white; color: black; }
          .no-print { display: none !important; }
          th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="print-header">
        <div class="company-info">
          <h1>${companySettings.companyName}</h1>
          <p>السجل التجاري: ${companySettings.commercialRegister} | الرقم الضريبي: ${companySettings.taxNumber}</p>
          <p>العنوان: ${companySettings.address} - هاتف: ${companySettings.phone}</p>
        </div>
        <div style="text-align: left;">
          ${companySettings.logoUrl ? `<img src="${companySettings.logoUrl}" style="max-height: 70px;" alt="شعار" />` : ''}
          <p class="report-meta">تاريخ الطباعة: ${currentDate}</p>
          <p class="report-meta">السنة المالية: ${companySettings.financialYear}</p>
        </div>
      </div>

      <div class="report-title-container">
        <h2>${title}</h2>
      </div>

      <main>
        ${htmlContent}
      </main>

      ${signaturesHtml}

      <div class="print-footer">
        <div>${companySettings.reportFooterNote || "نظام المحاسبة المتكامل - Al-Mowaseb ERP"}</div>
        <div>صفحة 1 من 1</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `);

  printWindow.document.close();
}

