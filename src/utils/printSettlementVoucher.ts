import { CompanySettings } from "../types";
import { printReport } from "./export";

export interface SettlementPrintData {
  id: string;
  type: string;
  categoryLabel: string;
  title: string;
  date: string;
  targetName: string;
  financialAmount: number;
  reason: string;
  journalEntryNumber?: string;
  approvedBy: string;
  debitAccountName?: string;
  creditAccountName?: string;
  costCenterName?: string;
}

export function printSettlementVoucher(
  item: SettlementPrintData,
  companySettings: CompanySettings
) {
  const printDate = new Date().toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const voucherHtml = `
    <div style="font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; direction: rtl; padding: 15px; color: #0f172a;">
      
      <!-- Voucher Title & Badge -->
      <div style="text-align: center; margin-bottom: 25px;">
        <span style="display: inline-block; background-color: #fef3c7; color: #92400e; border: 1px solid #fcd34d; font-weight: bold; font-size: 11px; padding: 4px 14px; border-radius: 9999px; margin-bottom: 8px;">
          إشعار قيد تسوية جردية معتمد
        </span>
        <h2 style="margin: 4px 0; font-size: 20px; color: #1e3a8a; font-weight: 800;">سند تسوية جردية (${item.categoryLabel || item.type})</h2>
        <p style="margin: 0; font-size: 12px; color: #64748b;">رقم التسوية: <strong>${item.id}</strong> | رقم القيد الدفتري: <strong>${item.journalEntryNumber || "-"}</strong></p>
      </div>

      <!-- Main Info Grid -->
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0; background: #f8fafc; width: 22%; font-weight: bold;">تاريخ التسوية الجردية:</td>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0; width: 28%; font-family: monospace; font-weight: bold;">${item.date}</td>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0; background: #f8fafc; width: 22%; font-weight: bold;">السنة المالية:</td>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0; width: 28%; font-family: monospace;">${companySettings.financialYear}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: bold;">نوع التسوية:</td>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0; color: #1e3a8a; font-weight: bold;">${item.categoryLabel || item.type}</td>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: bold;">مركز التكلفة / المشروع:</td>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${item.costCenterName || "عام (المركز الرئيسي)"}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: bold;">بيان ومعاملة التسوية:</td>
          <td colspan="3" style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">${item.title}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: bold;">المبرر المستندي / الفارق:</td>
          <td colspan="3" style="padding: 8px 12px; border: 1px solid #e2e8f0; color: #334155;">${item.reason}</td>
        </tr>
      </table>

      <!-- Accounting Double Entry -->
      <h3 style="font-size: 14px; color: #1e3a8a; border-bottom: 2px solid #cbd5e1; padding-bottom: 6px; margin: 20px 0 10px 0;">
        الأثر المحاسبي - تفاصيل القيد اليومي المزدوج
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 25px;">
        <thead>
          <tr style="background-color: #0f172a; color: white;">
            <th style="padding: 8px; border: 1px solid #334155; text-align: right;">الطرف المحاسبي</th>
            <th style="padding: 8px; border: 1px solid #334155; text-align: right;">اسم الحساب</th>
            <th style="padding: 8px; border: 1px solid #334155; text-align: left; width: 120px;">مدين (${companySettings.currency})</th>
            <th style="padding: 8px; border: 1px solid #334155; text-align: left; width: 120px;">دائن (${companySettings.currency})</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; color: #15803d;">من حـ/ (الطرف المدين)</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${item.debitAccountName || item.targetName}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-family: monospace; font-weight: bold; color: #15803d;">${item.financialAmount.toLocaleString()}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-family: monospace;">-</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; color: #1d4ed8;">إلى حـ/ (الطرف الدائن)</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${item.creditAccountName || item.targetName}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-family: monospace;">-</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-family: monospace; font-weight: bold; color: #1d4ed8;">${item.financialAmount.toLocaleString()}</td>
          </tr>
          <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #94a3b8;">
            <td colspan="2" style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">إجمالي القيد المتزن</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-family: monospace; color: #15803d;">${item.financialAmount.toLocaleString()}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-family: monospace; color: #1d4ed8;">${item.financialAmount.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <!-- Signatures section -->
      <div style="margin-top: 40px; display: flex; justify-content: space-between; text-align: center; font-size: 11px;">
        <div style="width: 28%; border-top: 1px dashed #94a3b8; padding-top: 8px;">
          <p style="margin: 0 0 4px 0; font-weight: bold;">المحاسب المختص / المعد</p>
          <p style="margin: 0; color: #64748b;">${item.approvedBy || "قسم الحسابات العامة"}</p>
        </div>
        <div style="width: 28%; border-top: 1px dashed #94a3b8; padding-top: 8px;">
          <p style="margin: 0 0 4px 0; font-weight: bold;">المراجع الداخلي / رئيس الحسابات</p>
          <p style="margin: 0; color: #64748b;">تمت المطابقة والتدقيق</p>
        </div>
        <div style="width: 28%; border-top: 1px dashed #94a3b8; padding-top: 8px;">
          <p style="margin: 0 0 4px 0; font-weight: bold;">المدير المالي / الاعتماد</p>
          <p style="margin: 0; color: #64748b;">معتمد للترحيل النهائي</p>
        </div>
      </div>

    </div>
  `;

  printReport(
    `سند تسوية جردية - ${item.id}`,
    voucherHtml,
    companySettings
  );
}
