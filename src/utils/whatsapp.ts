export interface WhatsAppShareData {
  title: string;
  subtitle?: string;
  recipientName?: string;
  recipientPhone?: string;
  items?: { label: string; value: string | number }[];
  details?: { label: string; value: string | number }[];
  totalAmount?: number;
  currency?: string;
  shareUrl?: string;
  tableHeaders?: string[];
  tableRows?: (string | number)[][];
  summaryTotals?: { label: string; value: string | number; isBold?: boolean }[];
  notes?: string;
  companyName?: string;
  date?: string;
  systemLink?: string;
}

export function formatWhatsAppMessage(data: WhatsAppShareData): string {
  const lines: string[] = [];

  // Header & Title
  const company = data.companyName ? `🏢 *${data.companyName}*` : "🏢 *نظام المحاسب ERP*";
  lines.push(company);
  lines.push(`📄 *${data.title}*`);

  if (data.subtitle) {
    lines.push(`📌 ${data.subtitle}`);
  }

  if (data.date) {
    lines.push(`📅 التاريخ: ${data.date}`);
  }

  if (data.recipientName) {
    lines.push(`👤 المستلم / المعني: *${data.recipientName}*`);
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━");

  // Key-value items or details
  const allItems = data.items || data.details;
  if (allItems && allItems.length > 0) {
    allItems.forEach((item) => {
      lines.push(`▪️ ${item.label}: *${typeof item.value === "number" ? item.value.toLocaleString() : item.value}*`);
    });
    lines.push("━━━━━━━━━━━━━━━━━━━━");
  }

  // Total amount if provided
  if (data.totalAmount !== undefined) {
    lines.push(`💰 *الإجمالي المستحق / الرصيد*: *${data.totalAmount.toLocaleString()} ${data.currency || ""}*`);
    lines.push("━━━━━━━━━━━━━━━━━━━━");
  }

  // Summary Totals
  if (data.summaryTotals && data.summaryTotals.length > 0) {
    data.summaryTotals.forEach((tot) => {
      const val = typeof tot.value === "number" ? tot.value.toLocaleString() : tot.value;
      lines.push(`💰 *${tot.label}*: *${val}*`);
    });
    lines.push("━━━━━━━━━━━━━━━━━━━━");
  }

  // Table rows preview (up to first 10 rows for brevity)
  if (data.tableHeaders && data.tableRows && data.tableRows.length > 0) {
    lines.push("📋 *تفاصيل البنود والبيانات:*");
    const previewRows = data.tableRows.slice(0, 12);
    previewRows.forEach((row, idx) => {
      const rowText = row.map((c) => (typeof c === "number" ? c.toLocaleString() : c)).join(" | ");
      lines.push(`${idx + 1}) ${rowText}`);
    });

    if (data.tableRows.length > 12) {
      lines.push(`_... وباقي عدد ${data.tableRows.length - 12} حركة أخرى مسجلة بالنظام._`);
    }
    lines.push("━━━━━━━━━━━━━━━━━━━━");
  }

  // Notes
  if (data.notes) {
    lines.push(`📝 *ملاحظات:* ${data.notes}`);
  }

  // System link
  const link = data.systemLink || window.location.href;
  lines.push(`🔗 رابط الاطلاع المباشر: ${link}`);
  lines.push("✨ تم الإرسال آلياً عبر نظام المحاسب السحابي");

  return lines.join("\n");
}

export function sendViaWhatsApp(data: WhatsAppShareData, customPhone?: string): void {
  const formattedText = formatWhatsAppMessage(data);
  const phone = (customPhone || data.recipientPhone || "").replace(/[^0-9]/g, "");

  let url = "";
  if (phone) {
    url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(formattedText)}`;
  } else {
    url = `https://api.whatsapp.com/send?text=${encodeURIComponent(formattedText)}`;
  }

  window.open(url, "_blank");
}
