export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export type AccountCategory =
  | 'CURRENT_ASSET'
  | 'NON_CURRENT_ASSET'
  | 'CURRENT_LIABILITY'
  | 'NON_CURRENT_LIABILITY'
  | 'EQUITY'
  | 'OPERATING_REVENUE'
  | 'OTHER_REVENUE'
  | 'OPERATING_EXPENSE'
  | 'ADMIN_EXPENSE'
  | 'SELLING_EXPENSE'
  | 'FINANCIAL_EXPENSE';

export interface Account {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  nameDe?: string;
  customNames?: { [langCode: string]: string };
  type: AccountType;
  category: AccountCategory;
  parentId?: string;
  balance: number;
  openingBalance?: number;
  accountNumber?: string;
  isActive: boolean;
  isHeader: boolean;
  description?: string;
  level: number;
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  costCenterId?: string;
  partnerId?: string;
  treasuryId?: string;
  bankId?: string;
  inventoryItemId?: string;
  inventoryQuantity?: number;
  subType?: 'ADVANCE' | 'CUSTODY';
  employeeName?: string;
  monthlyDeduction?: number;
  note?: string;
  chequeNumber?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  financialYear?: string;
  reference?: string;
  lines: JournalEntryLine[];
  notes?: string;
  description?: string;
  attachmentUrl?: string;
  createdAt: string;
  createdBy?: string;
  isPosted: boolean;
  postedAt?: string;
}

export interface TreasuryVoucher {
  id: string;
  voucherNumber: string;
  voucherType: 'RECEIPT' | 'PAYMENT';
  date: string;
  amount: number;
  treasuryAccountId: string;
  oppositeAccountId: string;
  costCenterId?: string;
  beneficiary: string;
  notes: string;
  manualRef?: string;
  electronicSignature?: string;
  signedBy?: string;
  signerTitle?: string;
  createdAt: string;
}

export interface BankVoucher {
  id: string;
  voucherNumber: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'BANK_EXPENSE' | 'BANK_INTEREST';
  date: string;
  dateRef?: string;
  amount: number;
  bankAccountId: string;
  toBankAccountId?: string;
  oppositeAccountId?: string;
  costCenterId?: string;
  beneficiary: string;
  notes: string;
  manualRef?: string;
  checkNumber?: string;
  isReconciled: boolean;
  electronicSignature?: string;
  signedBy?: string;
  signerTitle?: string;
  createdAt: string;
}

export interface BankReconciliation {
  id: string;
  bankAccountId: string;
  statementDate: string;
  statementBalance: number;
  bookBalance: number;
  reconciledVoucherIds: string[];
  difference: number;
  notes?: string;
  createdAt: string;
}

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  type: 'PROJECT' | 'DEPARTMENT' | 'BRANCH';
  projectManager?: string;
  budget: number;
  spent: number;
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
  startDate: string;
  endDate?: string;
  description?: string;
}

export interface CustodyItem {
  id: string;
  description: string;
  amount: number;
  receiptNo: string;
  date: string;
  costCenterId?: string;
  expenseAccountId: string;
}

export interface Custody {
  id: string;
  code: string;
  employeeName: string;
  amount: number;
  dateGiven: string;
  dateSettled?: string;
  status: 'ACTIVE' | 'SETTLED' | 'PARTIAL';
  settledAmount: number;
  items: CustodyItem[];
  treasuryAccountId: string;
  notes?: string;
}

export interface Advance {
  id: string;
  code: string;
  employeeName: string;
  totalAmount: number;
  monthlyDeduction: number;
  remainingAmount: number;
  startDate: string;
  status: 'ACTIVE' | 'COMPLETED';
  notes?: string;
  deductionStartMonth?: string;
  deductionEndMonth?: string;
  installmentsCount?: number;
  deductionScheduleNotes?: string;
}

export interface FixedAsset {
  id: string;
  code: string;
  name: string;
  category?: string;
  purchaseDate: string;
  cost: number;
  depreciationRate: number;
  accumulatedDepreciation: number;
  bookValue: number;
  usefulLifeYears: number;
  status?: string;
  location?: string;
  costCenterId?: string;
  notes?: string;
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  jobTitle: string;
  department: string;
  basicSalary: number;
  allowances: number;
  incentives?: number;
  socialInsuranceEmployee?: number;
  socialInsuranceEmployer?: number;
  deductions: number;
  netSalary: number;
  accountNumber?: string;
  hireDate: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  notes?: string;
}

export interface PayrollRun {
  id: string;
  monthYear: string;
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  allowances: number;
  bonuses: number;
  deductions: number;
  advanceDeduction: number;
  netSalary: number;
  status: 'DRAFT' | 'PAID';
  paymentDate?: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  minLevel: number;
  alertPeriodDays?: number; // مدة التنبيه بالأيام لإعادة الطلب والتوريد
  alertMessage?: string; // رسالة التنبيه المباشرة عند الوصول للحد الأدنى
  location?: string;
  category?: string;
  description?: string;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  type: 'IN' | 'OUT';
  quantity: number;
  unitCost: number;
  totalValue: number;
  unit: string;
  date: string;
  reference: string;
  journalEntryId?: string;
  notes?: string;
  createdAt: string;
}

export interface Partner {
  id: string;
  code: string;
  name: string;
  type: 'CUSTOMER' | 'SUPPLIER';
  phone?: string;
  email?: string;
  taxNumber?: string;
  commercialRegister?: string;
  address?: string;
  balance: number;
  accountId?: string;
  notes?: string;
  createdAt: string;
}

export interface PartnerInvoice {
  id: string;
  invoiceNumber: string;
  partnerId: string;
  partnerName: string;
  partnerType: 'CUSTOMER' | 'SUPPLIER';
  date: string;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  oppAccountId: string;
  notes: string;
  journalEntryId?: string;
  createdAt: string;
}

export interface UserPermissions {
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPrint: boolean;
  canExport: boolean;
  canManageUsers: boolean;
}

export interface UserCustomPermissions {
  granted: string[];
  revoked: string[];
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'AUDITOR' | 'SITE_ENGINEER' | 'VIEWER' | 'CUSTOM';
  status?: 'ACTIVE' | 'INACTIVE';
  pin?: string;
  password?: string;
  isActive: boolean;
  isSuperAdmin?: boolean;
  userLinkId?: string;
  token?: string;
  tokenCreatedAt?: string;
  tokenExpiresAt?: string;
  tokenRevoked?: boolean;
  tenantId?: string; // Active or assigned company tenant ID
  assignedTenantIds?: string[]; // Multiple companies allowed for user
  electronicSignature?: string; // Base64 data image or signature stamp
  signatureTitle?: string; // e.g. "المحاسب المعتمد" or "المدير المالي"
  isSignatureApproved?: boolean; // Whether the user's signature is officially certified
  customPermissions?: UserCustomPermissions;
  allowedTabs: string[]; // List of allowed NavTab IDs or ['*'] for all
  allowedAccounts?: string[]; // Specific Account IDs allowed for this user, or ['*'] for all accounts
  permissions: UserPermissions;
  shareToken?: string;
  lastLogin?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  version?: number;
}

export interface TenantCompany extends CompanySettings {
  id: string;
  code: string;
  isActive: boolean;
  isDefault?: boolean;
  createdAt?: string;
}

export interface CompanySettings {
  companyName: string;
  taxNumber: string;
  commercialRegister: string;
  currency: string;
  currencySymbol: string;
  financialYear: string;
  fiscalYear?: string;
  address: string;
  phone: string;
  email?: string;
  logoUrl?: string;
  reportHeaderNote?: string;
  reportFooterNote?: string;
  id?: string;
}

export interface FilterParams {
  day?: string;
  startDate?: string;
  endDate?: string;
  financialYear?: string;
  accountId?: string;
  costCenterId?: string;
  query?: string;
}

export interface FinancialAnalysisResult {
  summary: string;
  productivityCauses: string[];
  recommendations: string[];
}

export interface ElectricityInvoice {
  id: string;
  serialNumber: number; // مسلسل
  month: string; // الشهر
  customerName: string; // اسم العميل
  taxNumber: string; // رقم التسجيل الضريبي
  meterNumber: string; // رقم العداد
  currentReading: number; // القراءة الحالية
  previousReading: number; // القراءة السابقة
  readingDifference: number; // الفرق بينهما (حالية - سابقة)
  meterFactor: number; // ثابت العداد
  rate: number; // السعر
  consumptionValue: number; // قيمة الاستهلاك = الفرق * ثابت العداد * السعر
  industrialTax: number; // ضريبة صناعية
  consumptionTax: number; // ضريبة استهلاك
  radioFee: number; // رسوم إذاعة
  servicesFee: number; // خدمات
  customerServiceFee: number; // خدمة العملاء
  installmentsAndAdjustments: number; // اقساط وتسويات
  otherAdjustments: number; // تسويات أخرى
  totalExpenses: number; // إجمالي المصروفات
  netAmount: number; // صافي الإصدار = قيمة الاستهلاك + إجمالي المصروفات
  notes?: string;
  createdAt: string;
}

export interface ElectricityPrintConfig {
  defaultLayout: 'a4' | 'thermal' | 'table';
  orientation: 'portrait' | 'landscape';
  fontSize: 'compact' | 'normal' | 'large';
  showCompanyHeader: boolean;
  showTaxDetails: boolean;
  showMeterDetails: boolean;
  showTafqeet: boolean;
  showSignatures: boolean;
  showQrCode: boolean;
  showWatermark: boolean;
  paymentNotice: string;
  autoPrintAfterSave: boolean;
  openInDedicatedWindow: boolean;
}

export interface PrinterDiagnosticResult {
  engineReady: boolean;
  colorAdjustSupported: boolean;
  isInsideIframe: boolean;
  windowPrintAvailable: boolean;
  recommendedMode: 'a4' | 'thermal';
  detectedResolution: string;
  testedAt: string;
}

export interface SiteAdjustmentItem {
  id?: string;
  date?: string; // تاريخ البند
  statement: string;
  amount: number;
}

export interface SiteAdjustment {
  id: string;
  month: string; // الشهر (e.g. "01", "02", "03", ...)
  year: string; // السنة (e.g. "2026")
  date: string; // التاريخ (e.g. "2026-01-15")
  orientation: string; // التوجيه (نوع التسوية أو جهة الإنفاق بالموقع)
  statement: string; // البيان الرئيسي / الملخص
  amount: number; // القيمة الإجمالية (بالجنية)
  costCenterId?: string; // مركز التكلفة / المشروع
  reasonForVariance?: string; // سبب الزيادة أو النقص (مقارنة بالشهور السابقة)
  notes?: string;
  items?: SiteAdjustmentItem[]; // البنود الفرعية التفسيرية وقيمها
  createdAt: string;
}

export interface CustodyClearanceInvoiceItem {
  id: string;
  date?: string; // تاريخ الفاتورة / الإيصال
  invoiceNo?: string; // رقم الفاتورة / الإيصال
  statement: string; // البيان وتفاصيل البند والفاتورة
  amount: number; // قيمة الفاتورة / البند
  category?: string; // تصنيف المصروف (مواد بناء، أجور، نقل، صيانة، ضيافة...)
  costCenterId?: string; // مركز التكلفة الخاص بالفاتورة
  notes?: string; // ملاحظات الفاتورة
}

export interface CustodyClearanceRecord {
  id: string;
  date: string; // التاريخ
  beneficiaryName: string; // اسم المصرف له / المنصرف له / صاحب العهدة
  statement: string; // البيان
  debit: number; // مدين (العهدة المنصرفة له / المستلم)
  credit: number; // الدائن (المصروفات والمسدد بفواتير)
  balance?: number; // الباقي
  costCenterId?: string; // مركز التكلفة / المشروع
  documentRef?: string; // رقم السند / الفاتورة / الإيصال
  category?: string; // تصنيف المصروف / الحركة
  expenseAccountId?: string; // حساب المصروف المرتبط (اختياري)
  notes?: string; // ملاحظات
  items?: CustodyClearanceInvoiceItem[]; // تفاصيل وبنود الفواتير المقدمة للتصفية
  createdAt: string;
}

export interface SystemLockState {
  isLocked: boolean; // true = disabled/suspended for regular users, false = active for all
  lockedReason?: string; // e.g. "جاري تحديث النظام والبيانات وصيانة الحسابات"
  lockedAt?: string; // ISO string
  lockedBy?: string; // Administrator name
  allowAdminsOnly: boolean; // true = only SUPER_ADMIN and ADMIN can login and use the system
  notifyMessage?: string; // Custom broadcast notice
}


