import { FixedAsset, CompanySettings } from "../types";
import { printReport } from "./export";

export interface AssetPrintDetails extends FixedAsset {
  salvageValue?: number;
  depreciableBase?: number;
  usefulYears?: number;
  ratePercent?: number;
  annualDepreciation?: number;
  accumulatedDep?: number;
  netBookValue?: number;
  consumptionRate?: number;
  costCenterName?: string;
}

/**
 * Generates an official, comprehensive Fixed Asset Depreciation Card & Schedule printout
 */
export function printAssetDepreciationCard(
  asset: FixedAsset | AssetPrintDetails,
  companySettings: CompanySettings,
  costCenterName?: string
) {
  const cost = asset.cost || 0;
  const salvageValue = (asset as any).salvageValue || 0;
  const depreciableBase = Math.max(0, cost - salvageValue);
  const usefulYears = (asset as any).usefulYears || asset.usefulLifeYears || (asset.depreciationRate > 0 ? Math.round(100 / asset.depreciationRate) : 10);
  const ratePercent = asset.depreciationRate || +(100 / (usefulYears || 1)).toFixed(2);
  const annualDep = (asset as any).annualDepreciation ?? ((depreciableBase * ratePercent) / 100);
  const accumulatedDep = (asset as any).accumulatedDep ?? asset.accumulatedDepreciation ?? 0;
  const netBookValue = (asset as any).netBookValue ?? asset.bookValue ?? Math.max(salvageValue, cost - accumulatedDep);
  const consumptionRate = (asset as any).consumptionRate ?? (cost > 0 ? Math.min(100, Math.round((accumulatedDep / cost) * 100)) : 0);
  const ccName = costCenterName || (asset as any).costCenterName || asset.costCenterId || "المركز العام";

  // Generate multi-year schedule simulation
  const purchaseYear = new Date(asset.purchaseDate || "2024-01-01").getFullYear() || 2024;
  const scheduleRows = [];
  let currentStartValue = cost;
  let runningAccumulated = 0;

  for (let yr = 1; yr <= Math.min(usefulYears, 20); yr++) {
    const yrCalendar = purchaseYear + yr - 1;
    const depThisYear = Math.min(annualDep, Math.max(0, currentStartValue - salvageValue));
    runningAccumulated += depThisYear;
    const endingValue = Math.max(salvageValue, cost - runningAccumulated);
    const yrRate = cost > 0 ? Math.round((runningAccumulated / cost) * 100) : 0;

    scheduleRows.push(`
      <tr style="background-color: ${yrCalendar === new Date().getFullYear() ? '#eff6ff' : yr % 2 === 0 ? '#f8fafc' : '#ffffff'}; font-weight: ${yrCalendar === new Date().getFullYear() ? 'bold' : 'normal'};">
        <td style="text-align: center; font-family: monospace;">السنة ${yr} (${yrCalendar})</td>
        <td style="text-align: left; font-family: monospace;">${currentStartValue.toLocaleString()} ${companySettings.currency}</td>
        <td style="text-align: left; font-family: monospace; color: #b45309;">${depThisYear.toLocaleString()} ${companySettings.currency}</td>
        <td style="text-align: left; font-family: monospace; color: #be123c;">${runningAccumulated.toLocaleString()} ${companySettings.currency}</td>
        <td style="text-align: left; font-family: monospace; color: #047857;">${endingValue.toLocaleString()} ${companySettings.currency}</td>
        <td style="text-align: center; font-family: monospace;">${yrRate}%</td>
      </tr>
    `);

    currentStartValue = endingValue;
    if (endingValue <= salvageValue) break;
  }

  const htmlContent = `
    <div style="font-family: 'Cairo', sans-serif; direction: rtl; color: #1e293b; padding: 10px;">
      
      <!-- Certificate Header Banner -->
      <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #3b82f6; padding-bottom: 16px;">
        <span style="display: inline-block; background-color: #dbeafe; color: #1d4ed8; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 9999px; margin-bottom: 6px;">
          سجل الأصول الثابتة والرقابة المحاسبية
        </span>
        <h2 style="margin: 4px 0; font-size: 20px; font-weight: 800; color: #0f172a;">
          كارت مجمع إهلاك الأصل الثابت
        </h2>
        <p style="margin: 0; font-size: 12px; color: #64748b;">
          بيان إهلاك الأصل وتحليل صافي القيمة الدفترية ومجمع الإهلاك المتراكم للفترة المالية ${companySettings.fiscalYear}
        </p>
      </div>

      <!-- Asset Identification Card -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 13px; font-weight: bold; color: #1e3a8a; margin-bottom: 12px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px;">
          📌 البيانات التعريفية والتشغيلية للأصل:
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 12px;">
          <div><span style="color: #64748b;">كود الأصل:</span> <strong style="font-family: monospace; color: #6366f1;">${asset.code}</strong></div>
          <div><span style="color: #64748b;">اسم الأصل:</span> <strong style="color: #0f172a;">${asset.name}</strong></div>
          <div><span style="color: #64748b;">المجموعة / التصنيف:</span> <strong>${asset.category || "أصول عامة"}</strong></div>
          <div><span style="color: #64748b;">مركز التكلفة:</span> <strong>${ccName}</strong></div>
          <div><span style="color: #64748b;">الموقع / العهدة:</span> <strong>${asset.location || "المقر الرئيسي"}</strong></div>
          <div><span style="color: #64748b;">تاريخ الشراء والتشغيل:</span> <strong style="font-family: monospace;">${asset.purchaseDate || "-"}</strong></div>
          <div><span style="color: #64748b;">طريقة الإهلاك:</span> <strong>القسط الثابت (Straight-Line)</strong></div>
          <div><span style="color: #64748b;">العمر الإنتاجي:</span> <strong style="font-family: monospace;">${usefulYears} سنوات</strong></div>
          <div><span style="color: #64748b;">معدل الإهلاك السنوي:</span> <strong style="color: #7c3aed; font-family: monospace;">${ratePercent}%</strong></div>
        </div>
      </div>

      <!-- Financial Metrics Summary (Boxes) -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 24px;">
        
        <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">التكلفة التاريخية للاقتناء</div>
          <div style="font-size: 16px; font-weight: bold; color: #0f172a; font-family: monospace;">
            ${cost.toLocaleString()} <span style="font-size: 10px; font-weight: normal;">${companySettings.currency}</span>
          </div>
        </div>

        <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">الوعاء الخاضع للإهلاك</div>
          <div style="font-size: 16px; font-weight: bold; color: #2563eb; font-family: monospace;">
            ${depreciableBase.toLocaleString()} <span style="font-size: 10px; font-weight: normal;">${companySettings.currency}</span>
          </div>
          <div style="font-size: 9px; color: #94a3b8;">(بعد استبعاد الخردة ${salvageValue.toLocaleString()})</div>
        </div>

        <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #9f1239; margin-bottom: 4px; font-weight: bold;">مجمع الإهلاك المتراكم</div>
          <div style="font-size: 17px; font-weight: 800; color: #e11d48; font-family: monospace;">
            ${accumulatedDep.toLocaleString()} <span style="font-size: 10px; font-weight: normal;">${companySettings.currency}</span>
          </div>
          <div style="font-size: 9px; color: #be123c;">نسبة الاستهلاك: ${consumptionRate}%</div>
        </div>

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #166534; margin-bottom: 4px; font-weight: bold;">صافي القيمة الدفترية</div>
          <div style="font-size: 17px; font-weight: 800; color: #15803d; font-family: monospace;">
            ${netBookValue.toLocaleString()} <span style="font-size: 10px; font-weight: normal;">${companySettings.currency}</span>
          </div>
          <div style="font-size: 9px; color: #166534;">
            ${netBookValue <= salvageValue ? "مستهلك بالكامل دفترياً" : "يعمل بكفاءة"}
          </div>
        </div>

      </div>

      <!-- Accounting Journal Entry Blueprint -->
      <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 24px;">
        <div style="font-size: 12px; font-weight: bold; color: #334155; margin-bottom: 8px;">
          ⚖️ القيد المحاسبي المعتمد لإثبات إهلاك الأصل عن الفترة الحالية:
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; background-color: #ffffff;">
          <thead>
            <tr style="background-color: #e2e8f0; color: #1e293b;">
              <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">البيان المحاسبي وشرح القيد</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; width: 120px;">مدين</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; width: 120px;">دائن</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">
                من حـ/ مصروف إهلاك ${asset.name} (${asset.category || "أصول ثابتة"})
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; font-family: monospace; font-weight: bold; color: #2563eb;">
                ${annualDep.toLocaleString()}
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; font-family: monospace;">0.00</td>
            </tr>
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">
                إلى حـ/ مجمع إهلاك ${asset.name} (${asset.category || "أصول ثابتة"})
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; font-family: monospace;">0.00</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; font-family: monospace; font-weight: bold; color: #e11d48;">
                ${annualDep.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Depreciation Schedule Over Useful Life -->
      <div style="margin-bottom: 24px;">
        <div style="font-size: 13px; font-weight: bold; color: #1e3a8a; margin-bottom: 8px;">
          📊 جدول الاستهلاك السنوي التقديري لكامل العمر الإنتاجي:
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: right;">
          <thead>
            <tr style="background-color: #1e3a8a; color: #ffffff;">
              <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">السنة المالية</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left;">القيمة الدفترية (أول المدة)</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left;">قسط الإهلاك السنوي</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left;">مجمع الإهلاك المتراكم</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left;">صافي القيمة الدفترية (آخر المدة)</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">نسبة الاستهلاك</th>
            </tr>
          </thead>
          <tbody>
            ${scheduleRows.join("")}
          </tbody>
        </table>
      </div>

      <!-- Signatures Footer -->
      <div style="margin-top: 36px; padding-top: 16px; border-top: 2px solid #cbd5e1; display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; font-size: 12px;">
        <div>
          <div style="font-weight: bold; color: #475569; margin-bottom: 40px;">إعداد / محاسب الأصول الثابتة</div>
          <div style="color: #94a3b8; font-size: 11px;">التوقيع: ...........................</div>
        </div>
        <div>
          <div style="font-weight: bold; color: #475569; margin-bottom: 40px;">مراجعة / رئيس قسم الحسابات</div>
          <div style="color: #94a3b8; font-size: 11px;">التوقيع: ...........................</div>
        </div>
        <div>
          <div style="font-weight: bold; color: #475569; margin-bottom: 40px;">اعتماد / المدير المالي العام</div>
          <div style="color: #94a3b8; font-size: 11px;">الختم والاعتماد: ...........................</div>
        </div>
      </div>

    </div>
  `;

  printReport(`كارت_مجمع_إهلاك_${asset.code}_${asset.name}`, htmlContent, companySettings);
}
