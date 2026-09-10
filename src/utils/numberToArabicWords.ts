/**
 * Convert numbers to Arabic words (تفقيط المبالغ المالية)
 */
export function numberToArabicWords(amount: number, currencyName = "جنيه مصري", subCurrencyName = "قرش"): string {
  if (amount === 0) return "صفر " + currencyName;

  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسعمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

  function convertGroup(n: number): string {
    let result = "";
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    const t = Math.floor(remainder / 10);
    const o = remainder % 10;

    if (h > 0) {
      result += hundreds[h];
    }

    if (remainder > 0) {
      if (result.length > 0) result += " و";
      if (remainder >= 10 && remainder < 20) {
        result += teens[remainder - 10];
      } else {
        if (o > 0) {
          result += ones[o];
          if (t > 0) result += " و";
        }
        if (t > 0) {
          result += tens[t];
        }
      }
    }

    return result;
  }

  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);

  let words = "";

  if (integerPart === 0) {
    words = "صفر";
  } else {
    const millions = Math.floor(integerPart / 1000000);
    const thousands = Math.floor((integerPart % 1000000) / 1000);
    const units = integerPart % 1000;

    const parts: string[] = [];

    if (millions > 0) {
      if (millions === 1) parts.push("مليون");
      else if (millions === 2) parts.push("مليونان");
      else if (millions >= 3 && millions <= 10) parts.push(convertGroup(millions) + " ملايين");
      else parts.push(convertGroup(millions) + " مليون");
    }

    if (thousands > 0) {
      if (thousands === 1) parts.push("ألف");
      else if (thousands === 2) parts.push("ألفان");
      else if (thousands >= 3 && thousands <= 10) parts.push(convertGroup(thousands) + " آلاف");
      else parts.push(convertGroup(thousands) + " ألف");
    }

    if (units > 0) {
      parts.push(convertGroup(units));
    }

    words = parts.join(" و");
  }

  words += " " + currencyName;

  if (decimalPart > 0) {
    words += " و" + convertGroup(decimalPart) + " " + subCurrencyName;
  }

  return "فقط " + words + " لا غير";
}
