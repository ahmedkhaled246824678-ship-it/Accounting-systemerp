import { ElectricityInvoice, ElectricityPrintConfig, PrinterDiagnosticResult, CompanySettings } from "../types";
import { numberToArabicWords } from "./numberToArabicWords";

export const DEFAULT_ELECTRICITY_PRINT_CONFIG: ElectricityPrintConfig = {
  defaultLayout: "a4",
  orientation: "portrait",
  fontSize: "normal",
  showCompanyHeader: true,
  showTaxDetails: true,
  showMeterDetails: true,
  showTafqeet: true,
  showSignatures: true,
  showQrCode: true,
  showWatermark: false,
  paymentNotice: "يرجى سداد قيمة الفاتورة في موعد أقصاه 10 أيام من تاريخ إصدار المطالبة لضمان استمرار الخدمة.",
  autoPrintAfterSave: false,
  openInDedicatedWindow: false,
};

const STORAGE_KEY_PRINT_CONFIG = "erp_electricity_print_config";

export function loadElectricityPrintConfig(): ElectricityPrintConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRINT_CONFIG);
    if (raw) {
      return { ...DEFAULT_ELECTRICITY_PRINT_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error("Error reading print config:", e);
  }
  return DEFAULT_ELECTRICITY_PRINT_CONFIG;
}

export function saveElectricityPrintConfig(config: ElectricityPrintConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_PRINT_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error("Error saving print config:", e);
  }
}

/**
 * Diagnostics tool to test printer environment, iframe nesting, CSS print support, etc.
 */
export function runElectricityPrinterDiagnostics(): PrinterDiagnosticResult {
  const isInsideIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const windowPrintAvailable = typeof window !== "undefined" && typeof window.print === "function";

  const colorAdjustSupported = (() => {
    try {
      return (
        "printColorAdjust" in document.body.style ||
        "webkitPrintColorAdjust" in document.body.style
      );
    } catch {
      return true;
    }
  })();

  const dpr = window.devicePixelRatio || 1;
  const detectedResolution = `${window.screen?.width || 1920}x${window.screen?.height || 1080} (DPR: ${dpr.toFixed(1)}x)`;

  return {
    engineReady: windowPrintAvailable,
    colorAdjustSupported,
    isInsideIframe,
    windowPrintAvailable,
    recommendedMode: isInsideIframe ? "a4" : "a4",
    detectedResolution,
    testedAt: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
}

/**
 * Generate a calibration test invoice for printer test-run
 */
export function generateTestElectricityInvoice(companySettings: CompanySettings): ElectricityInvoice {
  const currentMonth = new Date().toISOString().slice(0, 7);
  return {
    id: `TEST-PRINT-${Date.now()}`,
    serialNumber: 9999,
    month: currentMonth,
    customerName: "شركة الاختبار والتجربة للتطوير الصناعي (صفحة فحص ومعايرة)",
    taxNumber: "999-888-777",
    meterNumber: "CALIB-MTR-2026-X",
    previousReading: 125000,
    currentReading: 128450,
    readingDifference: 3450,
    meterFactor: 1.25,
    rate: 1.85,
    consumptionValue: 7978.13,
    industrialTax: 79.78,
    consumptionTax: 39.89,
    radioFee: 15.0,
    servicesFee: 25.0,
    customerServiceFee: 10.0,
    installmentsAndAdjustments: 0,
    otherAdjustments: 0,
    totalExpenses: 169.67,
    netAmount: 8147.8,
    notes: "صفحة اختبار تجريبية لفحص الطابعة والمعايرة البصرية ومحاذاة الهوامش والألوان.",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Safe print execution with focus and fallback
 */
export function executePrintDocument(modeClass?: string): void {
  try {
    if (modeClass) {
      document.body.classList.add(modeClass);
    }

    window.focus();
    window.print();
  } catch (err) {
    console.warn("Direct window.print failed, attempting iframe print fallback", err);
    window.print();
  } finally {
    if (modeClass) {
      setTimeout(() => {
        document.body.classList.remove(modeClass);
      }, 1000);
    }
  }
}

/**
 * Generate a clean standalone HTML document for dedicated popup printing
 */
export function printViaPopup(
  invoice: ElectricityInvoice,
  companySettings: CompanySettings,
  config: ElectricityPrintConfig
): void {
  try {
    const printWindow = window.open("", "_blank", "width=850,height=950,top=50,left=50");
    if (!printWindow) {
      // Fallback if popup blocked
      executePrintDocument("printing-single-invoice-active");
      return;
    }

    const tafqeet = numberToArabicWords(invoice.netAmount, companySettings.currency || "جنيه مصري");
    const actualKwh = invoice.readingDifference * invoice.meterFactor;

    const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>فاتورة كهرباء رقم #${invoice.serialNumber} - ${invoice.customerName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    body {
      font-family: 'Cairo', system-ui, -apple-system, sans-serif;
      background: #fff;
      color: #0f172a;
      padding: ${config.defaultLayout === 'thermal' ? '8px' : '24px'};
      direction: rtl;
      font-size: ${config.fontSize === 'compact' ? '11px' : config.fontSize === 'large' ? '14px' : '12px'};
      line-height: 1.5;
    }
    
    @page {
      size: ${config.defaultLayout === 'thermal' ? '80mm auto' : 'A4 portrait'};
      margin: ${config.defaultLayout === 'thermal' ? '4mm' : '8mm'};
    }
    
    .invoice-card {
      max-width: ${config.defaultLayout === 'thermal' ? '76mm' : '100%'};
      margin: 0 auto;
      border: ${config.defaultLayout === 'thermal' ? '1px dashed #000' : '2px solid #0f172a'};
      border-radius: ${config.defaultLayout === 'thermal' ? '4px' : '12px'};
      padding: ${config.defaultLayout === 'thermal' ? '10px' : '20px'};
      background: #fff;
    }

    .header-box {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .company-title {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
    }

    .badge {
      background: #fef3c7;
      color: #78350f;
      border: 1px solid #fde68a;
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: bold;
      font-size: 11px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 14px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      text-align: center;
      font-size: 11px;
    }

    table th, table td {
      border: 1px solid #0f172a;
      padding: 6px 8px;
    }

    table th {
      background-color: #f1f5f9;
      font-weight: 800;
    }

    .tax-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
      font-size: 11px;
    }

    .tax-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 8px;
      border-radius: 6px;
      text-align: center;
    }

    .total-box {
      background: #0f172a;
      color: #fff;
      padding: 14px 18px;
      border-radius: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 14px;
    }

    .total-amount {
      font-size: 22px;
      font-weight: 900;
      color: #34d399;
      font-family: monospace;
      direction: ltr;
    }

    .tafqeet-box {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 8px 12px;
      border-radius: 6px;
      margin-top: 10px;
      font-weight: 600;
      font-size: 11px;
    }

    .notice-box {
      background: #fffbeb;
      color: #92400e;
      border: 1px solid #fde68a;
      padding: 8px 12px;
      border-radius: 6px;
      margin-top: 10px;
      font-size: 10px;
    }

    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      text-align: center;
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px dashed #94a3b8;
      font-size: 11px;
      font-weight: bold;
    }

    .thermal-view {
      text-align: center;
      font-size: 10px;
    }
    
    .thermal-view .line {
      border-bottom: 1px dashed #000;
      margin: 6px 0;
    }
    
    .thermal-row {
      display: flex;
      justify-content: space-between;
      margin: 3px 0;
    }

    @media print {
      body { padding: 0; }
      .no-print-btn { display: none !important; }
    }
  </style>
</head>
<body>
  <div style="text-align: left; margin-bottom: 10px;" class="no-print-btn">
    <button onclick="window.print()" style="background:#d97706; color:#fff; border:none; padding:8px 16px; border-radius:6px; font-weight:bold; cursor:pointer; font-family:'Cairo';">
      🖨️ طباعة الفاتورة الآن
    </button>
  </div>

  <div class="invoice-card">
    ${config.defaultLayout === 'thermal' ? `
      <!-- Thermal 80mm layout -->
      <div class="thermal-view">
        <h3 style="font-weight:900; font-size:13px;">${companySettings.companyName}</h3>
        <p style="font-size:9px;">إيصال استهلاك كهرباء ومرافق</p>
        <p style="font-size:9px;">فاتورة رقم #${invoice.serialNumber} | شهر: ${invoice.month}</p>
        <div class="line"></div>
        <div class="thermal-row"><span>المشترك:</span> <strong>${invoice.customerName}</strong></div>
        <div class="thermal-row"><span>العداد:</span> <strong>${invoice.meterNumber}</strong></div>
        <div class="thermal-row"><span>السعر:</span> <span>${invoice.rate} ${companySettings.currencySymbol}</span></div>
        <div class="line"></div>
        <div class="thermal-row"><span>القراءة السابقة:</span> <span>${invoice.previousReading}</span></div>
        <div class="thermal-row"><span>القراءة الحالية:</span> <span>${invoice.currentReading}</span></div>
        <div class="thermal-row"><span>فرق الاستهلاك:</span> <strong>${invoice.readingDifference}</strong></div>
        <div class="thermal-row"><span>الاستهلاك الفعلي:</span> <strong>${actualKwh.toLocaleString()} ك.و.س</strong></div>
        <div class="thermal-row"><span>قيمة الاستهلاك:</span> <strong>${invoice.consumptionValue.toFixed(2)} ${companySettings.currencySymbol}</strong></div>
        <div class="thermal-row"><span>المصروفات والضرائب:</span> <span>${invoice.totalExpenses.toFixed(2)} ${companySettings.currencySymbol}</span></div>
        <div class="line"></div>
        <div style="font-size:11px; font-weight:bold; margin:6px 0;">صافي المبلغ المطلوب:</div>
        <div style="font-size:18px; font-weight:900; color:#000;">${invoice.netAmount.toFixed(2)} ${companySettings.currencySymbol}</div>
        <p style="font-size:8px; margin-top:4px;">(${tafqeet})</p>
        <div class="line"></div>
        <p style="font-size:8px;">${config.paymentNotice || 'شكراً لالتزامكم بالسداد والترشيد'}</p>
      </div>
    ` : `
      <!-- A4 Official Tax Invoice Layout -->
      ${config.showCompanyHeader ? `
      <div class="header-box">
        <div>
          <div class="company-title">⚡ ${companySettings.companyName}</div>
          <div style="font-size:11px; color:#475569; margin-top:2px;">
            إدارة الفوترة وشبكات الطاقة والمرافق | جمهورية مصر العربية 🇪🇬
          </div>
          <div style="font-size:11px; color:#64748b; margin-top:3px;">
            رقم التسجيل الضريبي: <strong>${companySettings.taxNumber || 'غير محدد'}</strong>
            ${companySettings.commercialRegister ? ` | سجل تجاري: <strong>${companySettings.commercialRegister}</strong>` : ''}
          </div>
        </div>
        <div style="text-align: left; direction: ltr;">
          <div class="badge">فاتورة استهلاك كهرباء ومرافق #${invoice.serialNumber}</div>
          <div style="font-size:10px; color:#475569; margin-top:4px;">
            شهر المحاسبة: <strong>${invoice.month}</strong><br>
            تاريخ السند: <strong>${new Date(invoice.createdAt || Date.now()).toLocaleDateString('ar-EG')}</strong>
          </div>
        </div>
      </div>
      ` : ''}

      ${config.showMeterDetails ? `
      <div class="info-grid">
        <div>
          <span style="color:#64748b; font-size:10px; display:block;">بيانات المشترك / العميل:</span>
          <strong style="font-size:13px; color:#0f172a;">${invoice.customerName}</strong>
          <div style="font-size:11px; color:#334155; margin-top:3px;">
            رقم التسجيل الضريبي: <strong>${invoice.taxNumber || 'غير محدد'}</strong>
          </div>
        </div>
        <div>
          <span style="color:#64748b; font-size:10px; display:block;">بيانات العداد والتعريفة المطبقة:</span>
          <strong style="font-size:13px; color:#0f172a; font-family:monospace;">رقم العداد: ${invoice.meterNumber}</strong>
          <div style="font-size:11px; color:#334155; margin-top:3px;">
            ثابت العداد: <strong>${invoice.meterFactor}</strong> | سعر الكيلوواط: <strong>${invoice.rate} ${companySettings.currencySymbol}</strong>
          </div>
        </div>
      </div>
      ` : ''}

      <table>
        <thead>
          <tr>
            <th>القراءة السابقة</th>
            <th>القراءة الحالية</th>
            <th>فرق العداد</th>
            <th>الاستهلاك الفعلي (ك.و.س)</th>
            <th>قيمة الاستهلاك</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-family:monospace;">${invoice.previousReading.toLocaleString()}</td>
            <td style="font-family:monospace;">${invoice.currentReading.toLocaleString()}</td>
            <td style="font-family:monospace;">${invoice.readingDifference.toLocaleString()}</td>
            <td style="font-family:monospace; font-weight:bold; background:#fef3c7; color:#92400e;">
              ${actualKwh.toLocaleString()} ك.و.س
            </td>
            <td style="font-family:monospace; font-weight:bold; background:#eff6ff; color:#1e40af; font-size:13px;">
              ${invoice.consumptionValue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ${companySettings.currencySymbol}
            </td>
          </tr>
        </tbody>
      </table>

      ${config.showTaxDetails ? `
      <div class="tax-grid">
        <div class="tax-card">
          <span style="color:#64748b; font-size:9px; display:block;">ضريبة صناعية:</span>
          <strong style="color:#0f172a;">${invoice.industrialTax} ${companySettings.currencySymbol}</strong>
        </div>
        <div class="tax-card">
          <span style="color:#64748b; font-size:9px; display:block;">ضريبة استهلاك:</span>
          <strong style="color:#0f172a;">${invoice.consumptionTax} ${companySettings.currencySymbol}</strong>
        </div>
        <div class="tax-card">
          <span style="color:#64748b; font-size:9px; display:block;">رسوم إذاعة وخدمات:</span>
          <strong style="color:#0f172a;">${(invoice.radioFee + invoice.servicesFee + invoice.customerServiceFee).toLocaleString()} ${companySettings.currencySymbol}</strong>
        </div>
        <div class="tax-card">
          <span style="color:#64748b; font-size:9px; display:block;">تسويات ومصروفات:</span>
          <strong style="color:#0f172a;">${(invoice.installmentsAndAdjustments + invoice.otherAdjustments).toLocaleString()} ${companySettings.currencySymbol}</strong>
        </div>
      </div>
      ` : ''}

      <div class="total-box">
        <div>
          <div style="font-size:12px; color:#fde68a; font-weight:bold;">صافي الإصدار النهائي المطلوب سداده:</div>
          <div style="font-size:10px; color:#cbd5e1; margin-top:2px;">
            شامل قيمة الاستهلاك وكافة المصروفات والضرائب
          </div>
        </div>
        <div class="total-amount">
          ${invoice.netAmount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ${companySettings.currencySymbol}
        </div>
      </div>

      ${config.showTafqeet ? `
      <div class="tafqeet-box">
        <strong>المبلغ بالحروف:</strong> فقط وقدره ${tafqeet} لا غير.
      </div>
      ` : ''}

      ${config.paymentNotice ? `
      <div class="notice-box">
        <strong>ملاحظة هامة:</strong> ${config.paymentNotice}
      </div>
      ` : ''}

      ${config.showSignatures ? `
      <div class="signatures">
        <div>
          <p>المحاسب المسؤول</p>
          <p style="color:#94a3b8; margin-top:20px;">............................</p>
        </div>
        <div>
          <p>توقيع المشترك / المستلم</p>
          <p style="color:#94a3b8; margin-top:20px;">............................</p>
        </div>
        <div>
          <p>اعتماد الإدارة المالية والختم</p>
          <p style="color:#94a3b8; margin-top:20px;">............................</p>
        </div>
      </div>
      ` : ''}
    `}
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 300);
    });
  </script>
</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } catch (err) {
    console.error("Popup print failed, falling back to in-page print:", err);
    executePrintDocument("printing-single-invoice-active");
  }
}
