import React, { createContext, useContext, useState, useEffect } from "react";

export type BuiltinLanguage = "ar" | "en" | "de";
export type Language = string;

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir: "rtl" | "ltr";
  isCustom?: boolean;
}

export const DEFAULT_LANGUAGES: LanguageOption[] = [
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦", dir: "rtl" },
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧", dir: "ltr" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", dir: "ltr" },
];

export interface Translations {
  [key: string]: {
    ar: string;
    en: string;
    de: string;
    [customLang: string]: string;
  };
}

export const translations: Translations = {
  // Navigation Tabs
  dashboard: { ar: "لوحة التحكم الرئيسية", en: "Dashboard", de: "Übersicht & Dashboard" },
  accounts: { ar: "دليل الحسابات التفصيلي", en: "Chart of Accounts", de: "Kontenrahmen & Kontenplan" },
  journal: { ar: "قيود اليومية العامة", en: "Journal Entries", de: "Journal & Buchungssätze" },
  general_ledger: { ar: "دفتر الأستاذ العام", en: "General Ledger", de: "Hauptbuch" },
  treasury: { ar: "حركة الخزينة والعهد والسلف", en: "Treasury & Custodies", de: "Kasse & Barvorschüsse" },
  custody_clearance: { ar: "تصفية العهد الميدانية", en: "Custody Clearance", de: "Vorschussabrechnung" },
  banks: { ar: "حسابات البنوك والتسويات", en: "Banks & Reconciliations", de: "Bankkonten & Abstimmung" },
  combined: { ar: "الشيت المجمع للنقدية والبنك", en: "Cash & Bank Sheet", de: "Kassen- und Bankjournal" },
  cost_centers: { ar: "مراكز التكلفة والمشاريع", en: "Cost Centers & Projects", de: "Kostenstellen & Projekte" },
  site_adjustments: { ar: "تسويات الموقع والصبات", en: "Site Adjustments", de: "Baustellenabstimmungen" },
  trial_balance: { ar: "ميزان المراجعة بالأرصدة", en: "Trial Balance", de: "Summen- und Saldenliste" },
  financial_statements: { ar: "القوائم المالية والضرائب", en: "Financial Statements & Taxes", de: "Finanzberichte & Steuern" },
  expenses: { ar: "شيت المصروفات التفصيلي", en: "Expenses Sheet", de: "Detaillierte Ausgaben" },
  electricity_invoices: { ar: "فواتير الكهرباء والمرافق", en: "Electricity & Utilities", de: "Strom & Nebenkosten" },
  inventory: { ar: "المخزون وحركة المستودعات", en: "Inventory & Warehouses", de: "Warenlager & Bestände" },
  fixed_assets: { ar: "الأصول الثابتة والإهلاك", en: "Fixed Assets & Depreciation", de: "Anlagevermögen & AfA" },
  hr: { ar: "المرتبات والأجور والموظفين", en: "HR & Payroll", de: "Personal & Gehaltsabrechnung" },
  partners: { ar: "سجل الموردين والعملاء", en: "Partners (Customers & Vendors)", de: "Geschäftspartner (Kunden/Lieferanten)" },
  financial_analysis: { ar: "التحليل المالي الذكي (AI)", en: "Smart Financial Analysis", de: "Smarte Finanzanalyse (KI)" },
  users: { ar: "إدارة المستخدمين والصلاحيات", en: "Users & RBAC Permissions", de: "Benutzerverwaltung & Berechtigungen" },
  settings: { ar: "إعدادات الشركة والسنة المالية", en: "Company Settings", de: "Unternehmenseinstellungen" },

  // Common UI Actions & Labels
  appName: { ar: "نظام المحاسب ERP المتكامل", en: "Comprehensive ERP Accounting System", de: "Integriertes ERP-Buchhaltungssystem" },
  search: { ar: "بحث شامل...", en: "Search...", de: "Suchen..." },
  searchPlaceholder: { ar: "بحث بالحسابات، القيد، اليوم، التاريخ والسنة المالية...", en: "Search accounts, entries, dates, reference...", de: "Konten, Buchungen, Belege durchsuchen..." },
  dateFrom: { ar: "من تاريخ", en: "From Date", de: "Von Datum" },
  dateTo: { ar: "إلى تاريخ", en: "To Date", de: "Bis Datum" },
  print: { ar: "طباعة", en: "Print", de: "Drucken" },
  exportPdf: { ar: "تصدير PDF", en: "Export PDF", de: "PDF Exportieren" },
  exportExcel: { ar: "تصدير إكسيل", en: "Export Excel", de: "Excel Exportieren" },
  shareWhatsApp: { ar: "إرسال عبر واتساب", en: "Share via WhatsApp", de: "Über WhatsApp senden" },
  shareLink: { ar: "مشاركة رابط النظام", en: "Share Access Link", de: "Zugangslink teilen" },
  save: { ar: "حفظ", en: "Save", de: "Speichern" },
  cancel: { ar: "إلغاء", en: "Cancel", de: "Abbrechen" },
  edit: { ar: "تعديل", en: "Edit", de: "Bearbeiten" },
  delete: { ar: "حذف", en: "Delete", de: "Löschen" },
  add: { ar: "إضافة", en: "Add", de: "Hinzufügen" },
  newEntry: { ar: "قيد جديد", en: "New Entry", de: "Neue Buchung" },
  newVoucher: { ar: "سند جديد", en: "New Voucher", de: "Neuer Beleg" },
  active: { ar: "نشط ومفعل", en: "Active", de: "Aktiv" },
  inactive: { ar: "معطل / موقوف", en: "Inactive", de: "Inaktiv" },
  status: { ar: "الحالة", en: "Status", de: "Status" },
  role: { ar: "الدور والصلاحية", en: "Role & Permission", de: "Rolle & Berechtigung" },
  username: { ar: "اسم المستخدم", en: "Username", de: "Benutzername" },
  fullName: { ar: "الاسم الكامل", en: "Full Name", de: "Vollständiger Name" },
  email: { ar: "البريد الإلكتروني", en: "Email", de: "E-Mail-Adresse" },
  password: { ar: "كلمة المرور", en: "Password", de: "Passwort" },
  pin: { ar: "رمز PIN السريع", en: "Quick PIN", de: "Schnell-PIN" },
  debit: { ar: "مدين", en: "Debit", de: "Soll" },
  credit: { ar: "دائن", en: "Credit", de: "Haben" },
  balance: { ar: "الرصيد", en: "Balance", de: "Saldo" },
  total: { ar: "الإجمالي", en: "Total", de: "Gesamt" },
  net: { ar: "الصافي", en: "Net", de: "Netto" },
  date: { ar: "التاريخ", en: "Date", de: "Datum" },
  amount: { ar: "المبلغ", en: "Amount", de: "Betrag" },
  notes: { ar: "ملاحظات وبيان", en: "Notes & Statement", de: "Notizen & Beschreibung" },
  connected: { ar: "متصل بالنظام", en: "Connected", de: "Verbunden" },
  logout: { ar: "تسجيل الخروج", en: "Logout", de: "Abmelden" },
  switchUser: { ar: "تبديل المستخدم", en: "Switch User", de: "Benutzer wechseln" },
  accessDenied: { ar: "غير مصرح بالدخول", en: "Access Denied", de: "Zugriff verweigert" },
  accessDeniedMsg: { ar: "ليس لديك صلاحية للوصول إلى هذه الشاشة. يرجى مراجعة مدير النظام لتعديل الصلاحيات الممنوحة لحسابك.", en: "You do not have permission to access this screen. Please contact the administrator.", de: "Sie haben keine Berechtigung für diesen Bereich. Bitte kontaktieren Sie den Administrator." },
  accountDeactivated: { ar: "تم إيقاف وتعطيل هذا الحساب", en: "Account Deactivated", de: "Konto deaktiviert" },
  accountDeactivatedMsg: { ar: "تم تعطيل هذا الحساب من قبل مدير النظام. يرجى التواصل مع المسؤول لإعادة التفعيل.", en: "This account has been deactivated by the system administrator.", de: "Dieses Konto wurde durch den Administrator deaktiviert." },
  language: { ar: "اللغة", en: "Language", de: "Sprache" },
  arabic: { ar: "العربية", en: "Arabic", de: "Arabisch" },
  english: { ar: "English", en: "English", de: "Englisch" },
  german: { ar: "الألمانية", en: "German", de: "Deutsch" },
  changeLanguage: { ar: "تغيير اللغة", en: "Change Language", de: "Sprache ändern" },
  addNewLanguage: { ar: "إضافة لغة جديدة", en: "Add New Language", de: "Neue Sprache hinzufügen" },
  languageName: { ar: "اسم اللغة", en: "Language Name", de: "Sprachname" },
  languageCode: { ar: "رمز اللغة (مثل fr, tr, es)", en: "Language Code (e.g. fr, tr, es)", de: "Sprachcode (z.B. fr, tr, es)" },
  direction: { ar: "اتجاه الكتابة", en: "Writing Direction", de: "Schreibrichtung" },
  rtl: { ar: "من اليمين لليسار (RTL)", en: "Right-to-Left (RTL)", de: "Rechts-nach-Links (RTL)" },
  ltr: { ar: "من اليسار لليمين (LTR)", en: "Left-to-Right (LTR)", de: "Links-nach-Rechts (LTR)" },
  directLink: { ar: "الرابط المباشر", en: "Direct Link", de: "Direktlink" },
  copyLink: { ar: "نسخ الرابط", en: "Copy Link", de: "Link kopieren" },
  copied: { ar: "تم النسخ!", en: "Copied!", de: "Kopiert!" },
  disbursedAmount: { ar: "المبلغ المنصرف", en: "Disbursed Amount", de: "Ausgezahlter Betrag" },
  settledExpenses: { ar: "المصروفات الخاصة بالتسوية", en: "Settled Expenses", de: "Abgerechnete Ausgaben" },
  remainingBalance: { ar: "المتبقي", en: "Remaining Balance", de: "Verbleibender Saldo" },
  recipientName: { ar: "اسم المستلم", en: "Recipient Name", de: "Empfängername" },
  invoiceNumber: { ar: "رقم الفاتورة", en: "Invoice Number", de: "Rechnungsnummer" },
  all: { ar: "الكل", en: "All", de: "Alle" },
  receipt: { ar: "سند قبض", en: "Receipt Voucher", de: "Einnahmebeleg" },
  payment: { ar: "سند صرف", en: "Payment Voucher", de: "Ausgabebeleg" },
  transfer: { ar: "تحويل", en: "Transfer", de: "Überweisung" },
  customer: { ar: "عميل", en: "Customer", de: "Kunde" },
  supplier: { ar: "مورد", en: "Supplier", de: "Lieferant" },
  autoPosted: { ar: "مرحل تلقائياً", en: "Auto-posted", de: "Automatisch gebucht" },
  statement: { ar: "كشف حساب", en: "Account Statement", de: "Kontoauszug" },
  realtimeConnected: { ar: "تزامن لحظي نشط", en: "Real-time Sync Active", de: "Echtzeit-Synchronisierung aktiv" },
  connecting: { ar: "جاري التوصيل...", en: "Connecting...", de: "Verbindung wird hergestellt..." },
  openingBalance: { ar: "الرصيد الافتتاحي", en: "Opening Balance", de: "Eröffnungsbilanzwert" },
  currentBalance: { ar: "الرصيد الفعلي الحالي", en: "Current Balance", de: "Aktueller Saldo" },
  actualBalance: { ar: "الرصيد الفعلي", en: "Actual Balance", de: "Tatsächlicher Saldo" },
  
  // Combined Sheet & Cash/Bank Terms
  entryParty: { ar: "جهة القيد", en: "Entry Party / Counterparty", de: "Buchungspartei / Gegenpartei" },
  docNumber: { ar: "رقم السند/القيد", en: "Doc / Voucher No.", de: "Beleg-/Buchungsnummer" },
  movementType: { ar: "نوع الحركة", en: "Movement Type", de: "Bewegungsart" },
  descriptionDetails: { ar: "البيان والتفاصيل", en: "Description & Details", de: "Beschreibung & Details" },
  treasuryIn: { ar: "وارد الخزينة (+)", en: "Treasury In (+)", de: "Kasseneingang (+)" },
  treasuryOut: { ar: "منصرف الخزينة (-)", en: "Treasury Out (-)", de: "Kassenausgang (-)" },
  bankIn: { ar: "إيداع البنك (+)", en: "Bank Deposit (+)", de: "Bankeinzahlung (+)" },
  bankOut: { ar: "سحب البنك (-)", en: "Bank Withdrawal (-)", de: "Bankabhebung (-)" },
  expensesCol: { ar: "المصروفات", en: "Expenses", de: "Ausgaben" },
  opposingAccountBank: { ar: "البند المقابل / البنك", en: "Counter Account / Bank", de: "Gegenkonto / Bank" },
  combinedMasterSheet: { ar: "الشيت التفصيلي المجمع لحركات النقدية والبنوك", en: "Comprehensive Cash & Bank Master Sheet", de: "Konsolidiertes Kassen- und Bankjournal" },
  combinedSubHeader: { ar: "تجميع كافة حركات الخزينة والبنوك وقيود المقاصة في شيت واحد وإظهار صافي النقدية وصافي البنوك بدون تكرار", en: "Consolidate all cash and bank movements and journal settlements in one unified master sheet without duplication", de: "Konsolidierung aller Kassen-, Bank- und Verrechnungsbuchungen in einem Journal ohne Duplikate" },
  printCombined: { ar: "طباعة الشيت المجمع", en: "Print Master Sheet", de: "Journal drucken" },
  singleBankSummary: { ar: "ملخص حركة البنوك الفردية", en: "Individual Bank Movements Summary", de: "Zusammenfassung der Bankbewegungen" },
  bankName: { ar: "اسم البنك", en: "Bank Name", de: "Bankname" },
  totalDeposits: { ar: "إجمالي الإيداع (+)", en: "Total Deposits (+)", de: "Gesamteinzahlungen (+)" },
  totalWithdrawals: { ar: "إجمالي الصرف (-)", en: "Total Withdrawals (-)", de: "Gesamtauszahlungen (-)" },
  bankNet: { ar: "صافي البنك (=)", en: "Bank Net (=)", de: "Bank Netto (=)" },
  filterMovementSource: { ar: "تصفية مصدر الحركة:", en: "Filter Source:", de: "Quelle filtern:" },
  year: { ar: "السنة", en: "Year", de: "Jahr" },
  month: { ar: "الشهر", en: "Month", de: "Monat" },
  allYears: { ar: "جميع السنوات", en: "All Years", de: "Alle Jahre" },
  allMonths: { ar: "جميع الشهور", en: "All Months", de: "Alle Monate" },
  resetFilter: { ar: "إعادة ضبط التصفية", en: "Reset Filter", de: "Filter zurücksetzen" },
  combinedNet: { ar: "صافي الحركة المجمعة", en: "Net Combined Liquidity", de: "Konsolidierte Netto-Liquidität" },
  displayedCount: { ar: "عدد الحركات المعروضة", en: "Displayed Records", de: "Angezeigte Datensätze" },
  noRecords: { ar: "لا توجد حركات مطابقة لمعايير البحث والتصفية المحددة", en: "No records match the specified search and filter criteria", de: "Keine Datensätze entsprechen den Filterkriterien" },
  treasurySource: { ar: "الخزينة", en: "Treasury", de: "Kasse" },
  bankSource: { ar: "البنوك", en: "Banks", de: "Banken" },
  journalSource: { ar: "القيود", en: "Journal", de: "Journal" },

  // Accounting Core Terms
  journalEntry: { ar: "قيد يومية", en: "Journal Entry", de: "Buchungssatz" },
  posted: { ar: "مرحّل", en: "Posted", de: "Gebucht" },
  draft: { ar: "مسودة", en: "Draft", de: "Entwurf" },
  balanced: { ar: "متزن", en: "Balanced", de: "Ausgeglichen" },
  unbalanced: { ar: "غير متزن", en: "Unbalanced", de: "Nicht ausgeglichen" },
  accountCode: { ar: "كود الحساب", en: "Account Code", de: "Kontonummer" },
  accountName: { ar: "اسم الحساب", en: "Account Name", de: "Kontoname" },
  accountType: { ar: "نوع الحساب", en: "Account Type", de: "Kontoart" },
  parentAccount: { ar: "الحساب الرئيسي الأب", en: "Parent Account", de: "Oberkonto" },
  actions: { ar: "الإجراءات", en: "Actions", de: "Aktionen" },
  reference: { ar: "المرجع", en: "Reference", de: "Referenz" },
  costCenter: { ar: "مركز التكلفة", en: "Cost Center", de: "Kostenstelle" },
  project: { ar: "المشروع", en: "Project", de: "Projekt" },
  revenues: { ar: "الإيرادات", en: "Revenues", de: "Erlöse / Erträge" },
  expensesAccount: { ar: "المصروفات", en: "Expenses", de: "Aufwendungen" },
  assets: { ar: "الأصول", en: "Assets", de: "Aktiva" },
  liabilities: { ar: "الالتزامات", en: "Liabilities", de: "Passiva" },
  equity: { ar: "حقوق الملكية", en: "Equity", de: "Eigenkapital" },
  grossProfit: { ar: "مجمل الربح", en: "Gross Profit", de: "Rohertrag" },
  netProfit: { ar: "صافي الأرباح", en: "Net Profit", de: "Jahresüberschuss / Reingewinn" },
  tax: { ar: "الضريبة", en: "Tax", de: "Steuer" },
  vat: { ar: "ضريبة القيمة المضافة", en: "VAT", de: "Mehrwertsteuer" },
  systemModules: { ar: "أقسام النظام المحاسبي", en: "Accounting System Modules", de: "Buchhaltungssystem-Module" },
  admin: { ar: "مدير النظام", en: "System Administrator", de: "Systemadministrator" },
  accountant: { ar: "محاسب تنفيذ", en: "Accountant", de: "Buchhalter" },
  auditor: { ar: "مدقق ومراجع", en: "Auditor", de: "Wirtschaftsprüfer" },
  viewer: { ar: "مشاهد فقط", en: "Viewer", de: "Betrachter" },
  overview: { ar: "نظرة عامة", en: "Overview", de: "Übersicht" },
  quickActions: { ar: "إجراءات سريعة", en: "Quick Actions", de: "Schnellaktionen" },
  financialYear: { ar: "السنة المالية", en: "Financial Year", de: "Geschäftsjahr" },
  companyName: { ar: "اسم الشركة", en: "Company Name", de: "Unternehmensname" },
  currency: { ar: "العملة", en: "Currency", de: "Währung" },
};

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, defaultText?: string) => string;
  isRTL: boolean;
  languages: LanguageOption[];
  addLanguage: (lang: LanguageOption) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "ar",
  setLanguage: () => {},
  t: (key, defaultText) => defaultText || key,
  isRTL: true,
  languages: DEFAULT_LANGUAGES,
  addLanguage: () => {},
});

const LANGUAGE_STORAGE_KEY = "erp_language";
const CUSTOM_LANGUAGES_STORAGE_KEY = "erp_custom_languages";

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [languages, setLanguages] = useState<LanguageOption[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_LANGUAGES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Merge defaults and saved custom languages
          const custom = parsed.filter(
            (p: LanguageOption) => !DEFAULT_LANGUAGES.some((d) => d.code === p.code)
          );
          return [...DEFAULT_LANGUAGES, ...custom];
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_LANGUAGES;
  });

  const [language, setLanguageState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved) return saved;
    } catch {
      // ignore
    }
    return "ar";
  });

  const currentLangObj = languages.find((l) => l.code === language) || DEFAULT_LANGUAGES[0];
  const isRTL = currentLangObj.dir === "rtl";

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (e) {
      console.error("Error saving language preference:", e);
    }
    const found = languages.find((l) => l.code === lang);
    const dir = found?.dir || (lang === "ar" ? "rtl" : "ltr");
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  };

  const addLanguage = (newLang: LanguageOption) => {
    if (!newLang.code || languages.some((l) => l.code === newLang.code)) {
      return;
    }
    const updated = [...languages, { ...newLang, isCustom: true }];
    setLanguages(updated);
    try {
      localStorage.setItem(CUSTOM_LANGUAGES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving custom languages:", e);
    }
  };

  useEffect(() => {
    const found = languages.find((l) => l.code === language);
    const dir = found?.dir || (language === "ar" ? "rtl" : "ltr");
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, languages]);

  const t = (key: string, defaultText?: string): string => {
    const item = translations[key];
    if (item && item[language]) {
      return item[language];
    }
    // Fallback cascade: English -> Arabic -> defaultText -> key
    if (item && item.en) return item.en;
    if (item && item.ar) return item.ar;
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL, languages, addLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
