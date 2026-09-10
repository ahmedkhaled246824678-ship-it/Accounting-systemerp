import { Account } from "../types";

/**
 * Standard Multi-language Account Names (Arabic, English, German, French, Turkish, Spanish, Italian, Russian, Chinese)
 */
export const STANDARD_ACCOUNT_NAMES: {
  [code: string]: {
    ar: string;
    en: string;
    de: string;
    [lang: string]: string;
  };
} = {
  // 1 الأصول
  "1": { ar: "الأصول", en: "Assets", de: "Aktiva / Vermögen", fr: "Actifs", tr: "Varlıklar", es: "Activos", it: "Attività", ru: "Активы", zh: "资产" },
  "11": { ar: "الأصول المتداولة", en: "Current Assets", de: "Umlaufvermögen", fr: "Actifs courants", tr: "Dönen Varlıklar", es: "Activos Corrientes", it: "Attivo Circolante", ru: "Оборотные активы", zh: "流动资产" },
  "111": { ar: "النقدية وما في حكمها", en: "Cash & Cash Equivalents", de: "Flüssige Mittel", fr: "Trésorerie et équivalents", tr: "Nakit ve Nakit Benzerleri", es: "Efectivo y Equivalentes", it: "Disponibilità Liquide", ru: "Денежные средства", zh: "现金及现金等价物" },
  "1111": { ar: "الخزينة الرئيسية", en: "Main Treasury / Petty Cash", de: "Hauptkasse", fr: "Caisse Principale", tr: "Ana Kasa", es: "Caja Principal", it: "Cassa Principale", ru: "Главная касса", zh: "主要出纳" },
  "1112": { ar: "خزينة المبيعات الفرعية", en: "Sales Petty Cash", de: "Verkaufskasse", fr: "Caisse Ventes", tr: "Satış Kasası", es: "Caja de Ventas", it: "Cassa Vendite", ru: "Касса продаж", zh: "销售零用金" },
  "1113": { ar: "البنك الأهلي المصري - حساب جاري", en: "NBE Current Account", de: "NBE Bank - Girokonto", fr: "Compte Courant NBE", tr: "NBE Vadesiz Hesap", es: "Cuenta Corriente NBE", it: "Conto Corrente NBE", ru: "Текущий счет NBE", zh: "NBE经常账户" },
  "1114": { ar: "بنك CIB - حساب جاري", en: "CIB Current Account", de: "CIB Bank - Girokonto", fr: "Compte Courant CIB", tr: "CIB Vadesiz Hesap", es: "Cuenta Corriente CIB", it: "Conto Corrente CIB", ru: "Текущий счет CIB", zh: "CIB经常账户" },
  "112": { ar: "العملاء وحسابات القبض", en: "Accounts Receivable", de: "Forderungen aus L&L", fr: "Créances Clients", tr: "Alıcılar / Ticari Alacaklar", es: "Cuentas por Cobrar", it: "Crediti vs Clienti", ru: "Дебиторская задолженность", zh: "应收账款" },
  "113": { ar: "العهد المالية والسلف", en: "Custodies & Advances", de: "Vorschüsse & Auslagen", fr: "Avances et Arrhes", tr: "İş Avansları", es: "Anticipos y Custodias", it: "Anticipi e Custodie", ru: "Подотчетные суммы", zh: "预付款与暂付" },
  "114": { ar: "المخزون السلعي", en: "Inventory", de: "Warenlager & Vorräte", fr: "Stocks de marchandises", tr: "Ticari Mallar / Stoklar", es: "Inventario de Mercancías", it: "Rimanenze Merci", ru: "Товарно-материальные запасы", zh: "商品存货" },
  "1150": { ar: "المصروفات المدفوعة مقدماً", en: "Prepaid Expenses", de: "Aktive Rechnungsabgrenzung (ARAP)", fr: "Charges constatées d'avance", tr: "Gelecek Aylara Ait Giderler", es: "Gastos Pagados por Anticipado", it: "Risconti Attivi", ru: "Расходы будущих периодов", zh: "预付费用" },
  "1160": { ar: "الإيرادات المستحقة", en: "Accrued Revenues", de: "Forderungen aus noch nicht abgerechneten Leistungen", fr: "Produits à recevoir", tr: "Gelir Tahakkukları", es: "Ingresos Acumulados por Cobrar", it: "Ratei Attivi", ru: "Начисленные доходы", zh: "应计未收收入" },

  // 12 الأصول الثابتة
  "12": { ar: "الأصول الثابتة", en: "Fixed Assets", de: "Anlagevermögen / Sachanlagen", fr: "Immobilisations corporelles", tr: "Duran Varlıklar", es: "Activos Fijos", it: "Immobilizzazioni Materiali", ru: "Основные средства", zh: "固定资产" },
  "1210": { ar: "الأراضي والمباني", en: "Land & Buildings", de: "Grundstücke und Bauten", fr: "Terrains et Constructions", tr: "Binalar ve Arsalar", es: "Terrenos y Edificios", it: "Terreni e Fabbricati", ru: "Земля и здания", zh: "土地与建筑" },
  "1220": { ar: "الآلات والمعدات", en: "Machinery & Equipment", de: "Maschinen und technische Anlagen", fr: "Matériel et outillage", tr: "Tesis, Makine ve Cihazlar", es: "Maquinaria y Equipo", it: "Impianti e Macchinari", ru: "Машины и оборудование", zh: "机器与设备" },
  "1230": { ar: "السيارات ووسائل النقل", en: "Vehicles", de: "Fuhrpark & Fahrzeuge", fr: "Matériel de transport", tr: "Taşıtlar", es: "Vehículos y Transporte", it: "Automezzi", ru: "Транспортные средства", zh: "车辆运输" },

  // 2 الالتزامات
  "2": { ar: "الالتزامات", en: "Liabilities", de: "Passiva / Verbindlichkeiten", fr: "Passifs / Dettes", tr: "Yabancı Kaynaklar / Borçlar", es: "Pasivos", it: "Passività", ru: "Обязательства", zh: "负债" },
  "21": { ar: "الالتزامات المتداولة", en: "Current Liabilities", de: "Kurzfristige Verbindlichkeiten", fr: "Dettes à court terme", tr: "Kısa Vadeli Yabancı Kaynaklar", es: "Pasivos Corrientes", it: "Passività Correnti", ru: "Краткосрочные обязательства", zh: "流动负债" },
  "2110": { ar: "الموردون وحسابات الدفع", en: "Accounts Payable", de: "Verbindlichkeiten aus L&L", fr: "Dettes Fournisseurs", tr: "Satıcılar / Ticari Borçlar", es: "Cuentas por Pagar", it: "Debiti vs Fornitori", ru: "Кредиторская задолженность", zh: "应付账款" },
  "2120": { ar: "ضريبة القيمة المضافة المستحقة (VAT)", en: "Accrued VAT Payable", de: "Umsatzsteuer-Zahllast", fr: "TVA à décaisser", tr: "Hesaplanan KDV", es: "IVA por Pagar", it: "IVA a Debito", ru: "НДС к уплате", zh: "应交增值税" },
  "2130": { ar: "ضريبة الخصم والإضافة المستحقة", en: "Withholding Tax Payable", de: "Quellensteuer-Verbindlichkeiten", fr: "Retenue à la source", tr: "Muhtasar Vergi Borcu", es: "Retenciones de Impuestos", it: "Ritenute d'Acconto da Versare", ru: "Налог у источника", zh: "代扣代缴税金" },
  "2140": { ar: "الرواتب والأجور المستحقة", en: "Accrued Payroll", de: "Verbindlichkeiten aus Löhnen und Gehältern", fr: "Rémunérations dues", tr: "Personele Borçlar", es: "Sueldos por Pagar", it: "Retribuzioni da Liquidare", ru: "Задолженность по зарплате", zh: "应付职工薪酬" },
  "2150": { ar: "المصروفات المستحقة", en: "Accrued Expenses", de: "Sonstige Rückstellungen / Verbindlichkeiten", fr: "Charges à payer", tr: "Gider Tahakkukları", es: "Gastos Acumulados por Pagar", it: "Ratei Passivi", ru: "Начисленные расходы", zh: "应计费用" },
  "2160": { ar: "الإيرادات المقبوضة مقدماً", en: "Unearned Revenues", de: "Passive Rechnungsabgrenzung (PRAP)", fr: "Produits constatés d'avance", tr: "Gelecek Aylara Ait Gelirler", es: "Ingresos Diferidos", it: "Risconti Passivi", ru: "Доходы будущих периодов", zh: "预收账款" },

  // 3 حقوق الملكية
  "3": { ar: "حقوق الملكية", en: "Equity", de: "Eigenkapital", fr: "Capitaux propres", tr: "Özkaynaklar", es: "Patrimonio Neto", it: "Patrimonio Netto", ru: "Собственный капитал", zh: "所有者权益" },
  "3100": { ar: "رأس المال المدفوع", en: "Paid-in Capital", de: "Gezeichnetes Kapital / Stammkapital", fr: "Capital social libéré", tr: "Ödenmiş Sermaye", es: "Capital Social Pagado", it: "Capitale Sociale Versato", ru: "Уставный капитал", zh: "实收资本" },
  "3200": { ar: "الأرباح المبقاة", en: "Retained Earnings", de: "Gewinnvortrag / Rücklagen", fr: "Report à nouveau / Réserves", tr: "Geçmiş Yıllar Karları", es: "Ganancias Retenidas", it: "Utili Portati a Nuovo", ru: "Нераспределенная прибыль", zh: "留存收益" },

  // 4 الإيرادات
  "4": { ar: "الإيرادات", en: "Revenues", de: "Umsatzerlöse / Erträge", fr: "Chiffre d'affaires & Produits", tr: "Gelirler / Hasılat", es: "Ingresos Operativos", it: "Ricavi delle Vendite", ru: "Выручка и доходы", zh: "营业收入" },
  "4100": { ar: "إيرادات المبيعات الرئيسية", en: "Sales Revenue", de: "Umsatzerlöse aus Warenverkauf", fr: "Ventes de marchandises", tr: "Yurtiçi Satışlar", es: "Ingresos por Ventas", it: "Ricavi Vendite Principali", ru: "Выручка от продаж", zh: "主营业务收入" },
  "4200": { ar: "إيرادات عقود الصيانة والخدمات", en: "Services Revenue", de: "Erlöse aus Dienstleistungen & Wartung", fr: "Prestations de services", tr: "Hizmet Gelirleri", es: "Ingresos por Servicios", it: "Ricavi da Servizi", ru: "Доходы от услуг и сервиса", zh: "服务与维保收入" },

  // 5 المصروفات
  "5": { ar: "المصروفات", en: "Expenses", de: "Aufwendungen / Betriebsausgaben", fr: "Charges d'exploitation", tr: "Giderler", es: "Gastos", it: "Costi d'Esercizio", ru: "Расходы", zh: "费用支出" },
  "51": { ar: "المصروفات العمومية والإدارية", en: "General & Admin Expenses", de: "Allgemeine Verwaltungsaufwendungen", fr: "Frais généraux et administratifs", tr: "Genel Yönetim Giderleri", es: "Gastos Generales y Administrativos", it: "Spese Generali e Amministrative", ru: "Общехозяйственные расходы", zh: "管理费用" },
  "5110": { ar: "مصروف الرواتب والأجور", en: "Salaries Expense", de: "Lohn- und Gehaltsaufwand", fr: "Charges de personnel", tr: "Ücret ve Maaş Giderleri", es: "Gasto de Sueldos y Salarios", it: "Spese per il Personale", ru: "Расходы на оплату труда", zh: "工资薪金支出" },
  "5120": { ar: "مصروف الإيجار", en: "Rent Expense", de: "Mietaufwand", fr: "Loyers et charges locatives", tr: "Kira Giderleri", es: "Gasto de Alquiler", it: "Canoni di Locazione", ru: "Арендная плата", zh: "租金支出" },
  "5130": { ar: "مصروفات الكهرباء والمياه والاتصالات", en: "Utilities Expense", de: "Energie- & Nebenkosten (Strom, Wasser)", fr: "Énergie, eau et télécoms", tr: "Elektrik, Su ve İletişim Giderleri", es: "Servicios Públicos (Luz, Agua)", it: "Utenze (Energia, Acqua, Telefonia)", ru: "Коммунальные услуги", zh: "水电与通信费用" },
  "5140": { ar: "مصروفات التسويق والدعاية", en: "Marketing Expense", de: "Werbe- und Marketingaufwand", fr: "Frais de publicité et marketing", tr: "Pazarlama ve Reklam Giderleri", es: "Gastos de Marketing y Publicidad", it: "Spese di Pubblicità e Marketing", ru: "Расходы на маркетинг и рекламу", zh: "市场营销费用" },
  "5150": { ar: "مصروف إهلاك الأصول الثابتة", en: "Depreciation Expense", de: "Abschreibungen auf Sachanlagen (AfA)", fr: "Dotations aux amortissements", tr: "Amortisman Giderleri", es: "Gasto de Depreciación", it: "Ammortamenti Immobilizzazioni", ru: "Амортизация основных средств", zh: "固定资产折旧" },
  "5160": { ar: "مصروفات صيانة وتشغيل", en: "Maintenance Expense", de: "Instandhaltungs- und Betriebskosten", fr: "Entretien et réparations", tr: "Bakım ve Onarım Giderleri", es: "Gastos de Mantenimiento", it: "Spese di Manutenzione", ru: "Расходы на обслуживание и ремонт", zh: "维修与运营支出" },
};

/**
 * Returns the localized account name according to active language
 */
export function getLocalizedAccountName(account: Account, language: string): string {
  if (!account) return "";
  
  // 1. Check direct account fields
  if (language === "ar") {
    return account.nameAr || account.nameEn || "";
  }
  
  if (language === "en") {
    return account.nameEn || account.nameAr || "";
  }
  
  if (language === "de") {
    if (account.nameDe) return account.nameDe;
    // Check standard translations map
    const std = STANDARD_ACCOUNT_NAMES[account.code];
    if (std && std.de) return std.de;
    return account.nameEn || account.nameAr || "";
  }

  // Check customNames for any custom language added by the user
  if (account.customNames && account.customNames[language]) {
    return account.customNames[language];
  }

  // Check STANDARD_ACCOUNT_NAMES dictionary
  const std = STANDARD_ACCOUNT_NAMES[account.code];
  if (std && std[language]) {
    return std[language];
  }

  // Fallback cascade: English -> Arabic -> code
  return account.nameEn || account.nameAr || account.code;
}
