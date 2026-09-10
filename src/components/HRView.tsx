import React, { useState } from "react";
import {
  Users,
  Plus,
  Printer,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Search,
  CheckCircle,
  XCircle,
  FileText,
  User,
} from "lucide-react";
import { CompanySettings, Employee, FilterParams } from "../types";
import { exportToExcel, printReport } from "../utils/export";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface HRViewProps {
  employees: Employee[];
  companySettings: CompanySettings;
  filterParams: FilterParams;
  onSaveEmployee: (emp: Employee) => void;
  onDeleteEmployee: (empId: string) => void;
  onProcessPayroll: (empList?: Employee[], monthNum?: string) => void;
}

export const HRView: React.FC<HRViewProps> = ({
  employees,
  companySettings,
  filterParams,
  onSaveEmployee,
  onDeleteEmployee,
  onProcessPayroll,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmEmp, setDeleteConfirmEmp] = useState<{ id: string; name: string } | null>(null);
  const [selectedSlipEmp, setSelectedSlipEmp] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState(filterParams.query || "");
  const [filterMonth, setFilterMonth] = useState("");
  const [payrollMonthNumber, setPayrollMonthNumber] = useState("08");

  // Employee Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("المحاسبة والمالية");
  const [jobTitle, setJobTitle] = useState("");
  const [basicSalary, setBasicSalary] = useState<number | "">("");
  const [allowances, setAllowances] = useState<number | "">(0);
  const [incentives, setIncentives] = useState<number | "">(0);
  const [socialInsuranceEmployee, setSocialInsuranceEmployee] = useState<number | "">(0);
  const [socialInsuranceEmployer, setSocialInsuranceEmployer] = useState<number | "">(0);
  const [deductions, setDeductions] = useState<number | "">(0);
  const [accountNumber, setAccountNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<'ACTIVE' | 'ON_LEAVE' | 'TERMINATED'>("ACTIVE");

  const handleOpenAdd = () => {
    setEditingId(null);
    setCode(`EMP-${String(employees.length + 1).padStart(3, "0")}`);
    setName("");
    setDepartment("المحاسبة والمالية");
    setJobTitle("");
    setBasicSalary("");
    setAllowances(0);
    setIncentives(0);
    setSocialInsuranceEmployee(0);
    setSocialInsuranceEmployer(0);
    setDeductions(0);
    setAccountNumber("");
    setNotes("");
    setStatus("ACTIVE");
    setShowModal(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setCode(emp.code);
    setName(emp.name);
    setDepartment(emp.department);
    setJobTitle(emp.jobTitle);
    setBasicSalary(emp.basicSalary);
    setAllowances(emp.allowances);
    setIncentives(emp.incentives || 0);
    setSocialInsuranceEmployee(emp.socialInsuranceEmployee || 0);
    setSocialInsuranceEmployer(emp.socialInsuranceEmployer || 0);
    setDeductions(emp.deductions);
    setAccountNumber(emp.accountNumber || "");
    setNotes(emp.notes || "");
    setStatus(emp.status);
    setShowModal(true);
  };

  // Auto-calculate Egyptian social insurance when basic salary changes
  const handleSalaryChange = (val: number | "") => {
    setBasicSalary(val);
    if (typeof val === "number" && val > 0) {
      // Egyptian Tax/Insurance Law 148/2019: Employee 11%, Employer 18.75%
      setSocialInsuranceEmployee(Math.round(val * 0.11));
      setSocialInsuranceEmployer(Math.round(val * 0.1875));
    } else {
      setSocialInsuranceEmployee(0);
      setSocialInsuranceEmployer(0);
    }
  };

  const handleSaveEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !basicSalary) return;

    const bSalary = Number(basicSalary);
    const allow = Number(allowances) || 0;
    const inc = Number(incentives) || 0;
    const socEmp = Number(socialInsuranceEmployee) || 0;
    const socCompany = Number(socialInsuranceEmployer) || 0;
    const ded = Number(deductions) || 0;

    const empToSave: Employee = {
      id: editingId || "EMP-" + Date.now(),
      code: code || `EMP-${String(employees.length + 1).padStart(3, "0")}`,
      name,
      department,
      jobTitle,
      basicSalary: bSalary,
      allowances: allow,
      incentives: inc,
      socialInsuranceEmployee: socEmp,
      socialInsuranceEmployer: socCompany,
      deductions: ded,
      netSalary: Math.max(0, bSalary + allow + inc - ded - socEmp),
      accountNumber,
      hireDate: new Date().toISOString().split("T")[0],
      status,
      notes,
    };

    onSaveEmployee(empToSave);
    setShowModal(false);
  };

  const handleDelete = (emp: Employee) => {
    setDeleteConfirmEmp({ id: emp.id, name: emp.name });
  };

  const filteredEmployees = employees.filter((e) => {
    const matchesSearch =
      e.name.includes(searchQuery) ||
      e.code.includes(searchQuery) ||
      e.department.includes(searchQuery) ||
      e.jobTitle.includes(searchQuery) ||
      (e.accountNumber && e.accountNumber.includes(searchQuery));

    const matchesMonth = filterMonth ? e.hireDate.startsWith(filterMonth) : true;
    return matchesSearch && matchesMonth;
  });

  const totalBasic = filteredEmployees.reduce((s, e) => s + e.basicSalary, 0);
  const totalAllowances = filteredEmployees.reduce((s, e) => s + e.allowances + (e.incentives || 0), 0);
  const totalInsurance = filteredEmployees.reduce((s, e) => s + (e.socialInsuranceEmployee || 0), 0);
  const totalDeductions = filteredEmployees.reduce((s, e) => s + e.deductions, 0);
  const totalNetPayroll = filteredEmployees.reduce((s, e) => s + e.netSalary, 0);

  const handleExportToExcel = () => {
    const data = filteredEmployees.map((e) => ({
      "رقم الشهر": payrollMonthNumber,
      "كود الموظف": e.code,
      "اسم الموظف": e.name,
      القسم: e.department,
      "المسمى الوظيفي": e.jobTitle,
      "رقم الحساب البنكي": e.accountNumber || "-",
      "الراتب الأساسي": e.basicSalary,
      البدلات: e.allowances,
      "الحافز والمكافآت": e.incentives || 0,
      "تأمين اجتماعي (موظف 11%)": e.socialInsuranceEmployee || 0,
      "تأمين اجتماعي (شركة 18.75%)": e.socialInsuranceEmployer || 0,
      "الاستقطاعات والخصومات": e.deductions,
      "صافي الراتب المستحق": e.netSalary,
      الملاحظات: e.notes || "-",
      الحالة: e.status === "ACTIVE" ? "نشط" : e.status === "ON_LEAVE" ? "إجازة" : "منتهي الخدمة",
    }));

    exportToExcel(data, `مسير_رواتب_الموظفين_شهر_${payrollMonthNumber}_${companySettings.companyName}`);
  };

  const handlePrintPayrollSheet = () => {
    const rows = filteredEmployees
      .map(
        (e) => `
        <tr>
          <td>${e.code}</td>
          <td>${e.name}</td>
          <td>${e.accountNumber || "-"}</td>
          <td>${e.department} - ${e.jobTitle}</td>
          <td>${e.basicSalary.toLocaleString()} ${companySettings.currency}</td>
          <td style="color: green;">+${(e.allowances + (e.incentives || 0)).toLocaleString()}</td>
          <td style="color: orange;">-${(e.socialInsuranceEmployee || 0).toLocaleString()}</td>
          <td style="color: red;">-${e.deductions.toLocaleString()}</td>
          <td style="font-weight: bold; color: blue;">${e.netSalary.toLocaleString()} ${companySettings.currency}</td>
          <td>${e.notes || "-"}</td>
        </tr>
      `
      )
      .join("");

    const html = `
      <div style="margin-bottom: 12px; font-weight: bold; font-size: 14px; color: #1e3a8a;">
        كشف مسير المرتبات والمستحقات - شهر رقم (${payrollMonthNumber})
      </div>
      <table>
        <thead>
          <tr>
            <th>الكود</th>
            <th>اسم الموظف</th>
            <th>رقم الحساب</th>
            <th>القسم والوظيفة</th>
            <th>الراتب الأساسي</th>
            <th>البدلات والحوافز</th>
            <th>التأمين الاجتماعي (11%)</th>
            <th>الخصومات والسلف</th>
            <th>صافي المستحق</th>
            <th>ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="font-weight: bold; background: #f1f5f9;">
            <td colspan="4">إجمالي كشف المرتبات لـ شهر (${payrollMonthNumber}):</td>
            <td>${totalBasic.toLocaleString()}</td>
            <td style="color: green;">+${totalAllowances.toLocaleString()}</td>
            <td style="color: orange;">-${totalInsurance.toLocaleString()}</td>
            <td style="color: red;">-${totalDeductions.toLocaleString()}</td>
            <td style="color: blue;">${totalNetPayroll.toLocaleString()} ${companySettings.currency}</td>
            <td>-</td>
          </tr>
        </tbody>
      </table>
    `;

    printReport(`مسير رواتب ومستحقات الموظفين الشهرية - شهر ${payrollMonthNumber}`, html, companySettings);
  };

  // Print individual employee salary slip / statement
  const handlePrintSingleEmployee = (emp: Employee) => {
    const grossSalary = emp.basicSalary + emp.allowances + (emp.incentives || 0);
    const totalDeductionVal = (emp.socialInsuranceEmployee || 0) + emp.deductions;

    const html = `
      <div style="max-width: 800px; margin: 0 auto; border: 2px solid #1e3a8a; padding: 24px; border-radius: 12px; font-family: 'Cairo', sans-serif;">
        <div style="background: #1e3a8a; color: #ffffff; padding: 14px 20px; border-radius: 8px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: 17px; font-weight: 800;">بيان مفردات مرتب موظف - شهر رقم (${payrollMonthNumber})</h3>
          <span style="font-size: 13px; font-weight: bold; background: #3b82f6; color: #ffffff; padding: 4px 12px; border-radius: 6px;">كود الموظف: ${emp.code}</span>
        </div>

        <!-- بيانات الموظف -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
          <tr>
            <td style="width: 20%; font-weight: bold; background: #f1f5f9; padding: 8px 12px; border: 1px solid #cbd5e1;">اسم الموظف:</td>
            <td style="width: 30%; font-weight: bold; color: #0f172a; padding: 8px 12px; border: 1px solid #cbd5e1;">${emp.name}</td>
            <td style="width: 20%; font-weight: bold; background: #f1f5f9; padding: 8px 12px; border: 1px solid #cbd5e1;">القسم والوظيفة:</td>
            <td style="width: 30%; padding: 8px 12px; border: 1px solid #cbd5e1;">${emp.department} - ${emp.jobTitle}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f1f5f9; padding: 8px 12px; border: 1px solid #cbd5e1;">رقم الحساب / IBAN:</td>
            <td style="font-family: monospace; font-weight: bold; color: #b45309; padding: 8px 12px; border: 1px solid #cbd5e1;">${emp.accountNumber || "غير محدد"}</td>
            <td style="font-weight: bold; background: #f1f5f9; padding: 8px 12px; border: 1px solid #cbd5e1;">حالة الموظف:</td>
            <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">${emp.status === "ACTIVE" ? "نشط وعلى رأس العمل" : emp.status === "ON_LEAVE" ? "في إجازة" : "منتهي الخدمة"}</td>
          </tr>
        </table>

        <!-- جدول المستحقات والاستقطاعات -->
        <div style="display: flex; gap: 20px; margin-bottom: 24px;">
          <!-- المستحقات -->
          <div style="flex: 1; border: 1px solid #10b981; border-radius: 8px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #059669; color: #ffffff; font-weight: 800; padding: 10px 14px; font-size: 14px; text-align: center;">
              تفاصيل المستحقات والبدلات (+)
            </div>
            <table style="width: 100%; margin: 0; border: none; font-size: 13px;">
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none;">الراتب الأساسي:</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none; text-align: left; font-weight: bold;">${emp.basicSalary.toLocaleString()} ${companySettings.currency}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none;">البدلات الشهرية:</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none; text-align: left; color: #059669; font-weight: bold;">+${emp.allowances.toLocaleString()} ${companySettings.currency}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none;">الحوافز والمكافآت:</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none; text-align: left; color: #059669; font-weight: bold;">+${(emp.incentives || 0).toLocaleString()} ${companySettings.currency}</td>
              </tr>
              <tr style="background-color: #ecfdf5; font-weight: bold; color: #047857;">
                <td style="padding: 10px 12px; border: none;">إجمالي المستحقات:</td>
                <td style="padding: 10px 12px; border: none; text-align: left; font-size: 14px;">${grossSalary.toLocaleString()} ${companySettings.currency}</td>
              </tr>
            </table>
          </div>

          <!-- الاستقطاعات -->
          <div style="flex: 1; border: 1px solid #f43f5e; border-radius: 8px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #e11d48; color: #ffffff; font-weight: 800; padding: 10px 14px; font-size: 14px; text-align: center;">
              تفاصيل الاستقطاعات والخصومات (-)
            </div>
            <table style="width: 100%; margin: 0; border: none; font-size: 13px;">
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none;">تأمين اجتماعي (حصة الموظف 11%):</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none; text-align: left; color: #d97706; font-weight: bold;">-${(emp.socialInsuranceEmployee || 0).toLocaleString()} ${companySettings.currency}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none;">الخصومات والجزاءات والسلف:</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none; text-align: left; color: #e11d48; font-weight: bold;">-${emp.deductions.toLocaleString()} ${companySettings.currency}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none; color: #64748b; font-size: 11px;">(تأمين حصة الشركة 18.75% للإفصاح):</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none; text-align: left; color: #64748b; font-size: 11px;">${(emp.socialInsuranceEmployer || 0).toLocaleString()} ${companySettings.currency}</td>
              </tr>
              <tr style="background-color: #fff1f2; font-weight: bold; color: #be123c;">
                <td style="padding: 10px 12px; border: none;">إجمالي الاستقطاعات:</td>
                <td style="padding: 10px 12px; border: none; text-align: left; font-size: 14px;">-${totalDeductionVal.toLocaleString()} ${companySettings.currency}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- صافي الراتب المستحق للصرف -->
        <div style="background: #f0f9ff; border: 2px solid #0284c7; padding: 16px 24px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <span style="font-size: 16px; font-weight: 800; color: #0369a1;">صافي الراتب المستحق للصرف والتحويل:</span>
          <span style="font-size: 22px; font-weight: 900; color: #0284c7;">${emp.netSalary.toLocaleString()} ${companySettings.currency}</span>
        </div>

        ${emp.notes ? `
          <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 24px; font-size: 12px; color: #334155;">
            <strong>ملاحظات الموارد البشرية والمالية:</strong> ${emp.notes}
          </div>
        ` : ''}

        <div style="margin-top: 40px; display: flex; justify-content: space-between; text-align: center; font-size: 12px; font-weight: bold; color: #1e293b;">
          <div style="width: 30%; border-top: 1px solid #94a3b8; padding-top: 10px;">
            توقيع واستلام الموظف
            <p style="font-weight: normal; color: #64748b; margin-top: 24px;">أقر بأني استلمت كافة مستحقاتي عن الشهر</p>
          </div>
          <div style="width: 30%; border-top: 1px solid #94a3b8; padding-top: 10px;">
            مُعد الكشف (الموارد البشرية)
          </div>
          <div style="width: 30%; border-top: 1px solid #94a3b8; padding-top: 10px;">
            اعتماد المدير المالي
          </div>
        </div>
      </div>
    `;

    printReport(`مفردات مرتب الموظف - ${emp.name}`, html, companySettings);
  };

  // Print all individual employee slips with page breaks
  const handlePrintAllEmployeeSlips = () => {
    if (filteredEmployees.length === 0) return;

    const slipsHtml = filteredEmployees.map((emp, index) => {
      const grossSalary = emp.basicSalary + emp.allowances + (emp.incentives || 0);
      const totalDeductionVal = (emp.socialInsuranceEmployee || 0) + emp.deductions;
      const isLast = index === filteredEmployees.length - 1;

      return `
        <div style="max-width: 800px; margin: 0 auto; border: 2px solid #1e3a8a; padding: 24px; border-radius: 12px; font-family: 'Cairo', sans-serif; ${isLast ? '' : 'page-break-after: always; break-after: page; margin-bottom: 40px;'}">
          <div style="background: #1e3a8a; color: #ffffff; padding: 14px 20px; border-radius: 8px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; font-size: 17px; font-weight: 800;">بيان مفردات مرتب موظف - شهر رقم (${payrollMonthNumber})</h3>
            <span style="font-size: 13px; font-weight: bold; background: #3b82f6; color: #ffffff; padding: 4px 12px; border-radius: 6px;">كود الموظف: ${emp.code}</span>
          </div>

          <!-- بيانات الموظف -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
            <tr>
              <td style="width: 20%; font-weight: bold; background: #f1f5f9; padding: 8px 12px; border: 1px solid #cbd5e1;">اسم الموظف:</td>
              <td style="width: 30%; font-weight: bold; color: #0f172a; padding: 8px 12px; border: 1px solid #cbd5e1;">${emp.name}</td>
              <td style="width: 20%; font-weight: bold; background: #f1f5f9; padding: 8px 12px; border: 1px solid #cbd5e1;">القسم والوظيفة:</td>
              <td style="width: 30%; padding: 8px 12px; border: 1px solid #cbd5e1;">${emp.department} - ${emp.jobTitle}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; background: #f1f5f9; padding: 8px 12px; border: 1px solid #cbd5e1;">رقم الحساب / IBAN:</td>
              <td style="font-family: monospace; font-weight: bold; color: #b45309; padding: 8px 12px; border: 1px solid #cbd5e1;">${emp.accountNumber || "غير محدد"}</td>
              <td style="font-weight: bold; background: #f1f5f9; padding: 8px 12px; border: 1px solid #cbd5e1;">حالة الموظف:</td>
              <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">${emp.status === "ACTIVE" ? "نشط وعلى رأس العمل" : emp.status === "ON_LEAVE" ? "في إجازة" : "منتهي الخدمة"}</td>
            </tr>
          </table>

          <!-- جدول المستحقات والاستقطاعات -->
          <div style="display: flex; gap: 20px; margin-bottom: 24px;">
            <!-- المستحقات -->
            <div style="flex: 1; border: 1px solid #10b981; border-radius: 8px; overflow: hidden; background: #ffffff;">
              <div style="background-color: #059669; color: #ffffff; font-weight: 800; padding: 10px 14px; font-size: 14px; text-align: center;">
                تفاصيل المستحقات والبدلات (+)
              </div>
              <table style="width: 100%; margin: 0; border: none; font-size: 13px;">
                <tr>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none;">الراتب الأساسي:</td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none; text-align: left; font-weight: bold;">${emp.basicSalary.toLocaleString()} ${companySettings.currency}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none;">البدلات الشهرية:</td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none; text-align: left; color: #059669; font-weight: bold;">+${emp.allowances.toLocaleString()} ${companySettings.currency}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none;">الحوافز والمكافآت:</td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none; text-align: left; color: #059669; font-weight: bold;">+${(emp.incentives || 0).toLocaleString()} ${companySettings.currency}</td>
                </tr>
                <tr style="background-color: #ecfdf5; font-weight: bold; color: #047857;">
                  <td style="padding: 10px 12px; border: none;">إجمالي المستحقات:</td>
                  <td style="padding: 10px 12px; border: none; text-align: left; font-size: 14px;">${grossSalary.toLocaleString()} ${companySettings.currency}</td>
                </tr>
              </table>
            </div>

            <!-- الاستقطاعات -->
            <div style="flex: 1; border: 1px solid #f43f5e; border-radius: 8px; overflow: hidden; background: #ffffff;">
              <div style="background-color: #e11d48; color: #ffffff; font-weight: 800; padding: 10px 14px; font-size: 14px; text-align: center;">
                تفاصيل الاستقطاعات والخصومات (-)
              </div>
              <table style="width: 100%; margin: 0; border: none; font-size: 13px;">
                <tr>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none;">تأمين اجتماعي (حصة الموظف 11%):</td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none; text-align: left; color: #d97706; font-weight: bold;">-${(emp.socialInsuranceEmployee || 0).toLocaleString()} ${companySettings.currency}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none;">الخصومات والجزاءات والسلف:</td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none; text-align: left; color: #e11d48; font-weight: bold;">-${emp.deductions.toLocaleString()} ${companySettings.currency}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none; color: #64748b; font-size: 11px;">(تأمين حصة الشركة 18.75% للإفصاح):</td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: none; border-left: none; text-align: left; color: #64748b; font-size: 11px;">${(emp.socialInsuranceEmployer || 0).toLocaleString()} ${companySettings.currency}</td>
                </tr>
                <tr style="background-color: #fff1f2; font-weight: bold; color: #be123c;">
                  <td style="padding: 10px 12px; border: none;">إجمالي الاستقطاعات:</td>
                  <td style="padding: 10px 12px; border: none; text-align: left; font-size: 14px;">-${totalDeductionVal.toLocaleString()} ${companySettings.currency}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- صافي الراتب المستحق للصرف -->
          <div style="background: #f0f9ff; border: 2px solid #0284c7; padding: 16px 24px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <span style="font-size: 16px; font-weight: 800; color: #0369a1;">صافي الراتب المستحق للصرف والتحويل:</span>
            <span style="font-size: 22px; font-weight: 900; color: #0284c7;">${emp.netSalary.toLocaleString()} ${companySettings.currency}</span>
          </div>

          ${emp.notes ? `
            <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 24px; font-size: 12px; color: #334155;">
              <strong>ملاحظات الموارد البشرية والمالية:</strong> ${emp.notes}
            </div>
          ` : ''}

          <div style="margin-top: 40px; display: flex; justify-content: space-between; text-align: center; font-size: 12px; font-weight: bold; color: #1e293b;">
            <div style="width: 30%; border-top: 1px solid #94a3b8; padding-top: 10px;">
              توقيع واستلام الموظف
              <p style="font-weight: normal; color: #64748b; margin-top: 24px;">أقر بأني استلمت كافة مستحقاتي عن الشهر</p>
            </div>
            <div style="width: 30%; border-top: 1px solid #94a3b8; padding-top: 10px;">
              مُعد الكشف (الموارد البشرية)
            </div>
            <div style="width: 30%; border-top: 1px solid #94a3b8; padding-top: 10px;">
              اعتماد المدير المالي
            </div>
          </div>
        </div>
      `;
    }).join("");

    printReport(`قسائم ومفردات مرتب الموظفين المنفصلة (${filteredEmployees.length} موظف)`, slipsHtml, companySettings);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#11141B] p-4 rounded-xl border border-gray-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span>إدارة الموارد البشرية والرواتب والأجور (وفق التأمينات والضرائب المصرية)</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            تأمين اجتماعي (11% موظف / 18.75% شركة)، حوافز، أرقام حسابات وملاحظات مع إمكانية البحث بالشهور
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة موظف جديد</span>
          </button>
          <button
            onClick={() => onProcessPayroll(filteredEmployees, payrollMonthNumber)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <CheckCircle className="w-4 h-4" />
            <span>اعتماد وتنزيل الرواتب</span>
          </button>
          <button
            onClick={handlePrintPayrollSheet}
            className="flex items-center gap-1.5 bg-[#1A1F26] hover:bg-gray-800 text-gray-200 border border-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
            title="طباعة جدول المسير الإجمالي لجميع الموظفين"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>طباعة مسير الرواتب (إجمالي)</span>
          </button>
          <button
            onClick={handlePrintAllEmployeeSlips}
            className="flex items-center gap-1.5 bg-[#1A1F26] hover:bg-gray-800 text-gray-200 border border-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
            title="طباعة قسيمة مفردات مرتب كل موظف صفحة منفصلة"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>طباعة مفردات الموظفين (منفصل)</span>
          </button>
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-1.5 bg-[#1A1F26] hover:bg-gray-800 text-gray-200 border border-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير إكسل</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div className="bg-[#11141B] border border-gray-800 p-3.5 rounded-xl space-y-1">
          <span className="text-gray-400">إجمالي الرواتب الأساسية</span>
          <p className="text-lg font-extrabold text-white">{totalBasic.toLocaleString()} {companySettings.currency}</p>
        </div>
        <div className="bg-[#11141B] border border-gray-800 p-3.5 rounded-xl space-y-1">
          <span className="text-gray-400">البدلات والحوافز</span>
          <p className="text-lg font-extrabold text-emerald-400">+{totalAllowances.toLocaleString()} {companySettings.currency}</p>
        </div>
        <div className="bg-[#11141B] border border-gray-800 p-3.5 rounded-xl space-y-1">
          <span className="text-gray-400">التأمين الاجتماعي (11%)</span>
          <p className="text-lg font-extrabold text-amber-400">-{totalInsurance.toLocaleString()} {companySettings.currency}</p>
        </div>
        <div className="bg-[#11141B] border border-gray-800 p-3.5 rounded-xl space-y-1">
          <span className="text-gray-400">الخصومات والسلف</span>
          <p className="text-lg font-extrabold text-rose-400">-{totalDeductions.toLocaleString()} {companySettings.currency}</p>
        </div>
        <div className="bg-[#11141B] border border-gray-800 p-3.5 rounded-xl space-y-1">
          <span className="text-gray-400">صافي مسير الرواتب المستحق</span>
          <p className="text-lg font-extrabold text-blue-400">{totalNetPayroll.toLocaleString()} {companySettings.currency}</p>
        </div>
      </div>

      {/* Search & Month Filter Bar */}
      <div className="bg-[#11141B] border border-gray-800 rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="بحث بالاسم، الكود، القسم، رقم الحساب أو المسمى الوظيفي..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1A1F26] border border-gray-700 rounded-lg pr-9 pl-3 py-1.5 text-xs text-[#E2E8F0] focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 bg-[#1A1F26] border border-gray-700 px-3 py-1.5 rounded-lg shrink-0">
          <span className="text-xs text-amber-400 font-bold whitespace-nowrap">رقم شهر مسير المرتبات:</span>
          <select
            value={payrollMonthNumber}
            onChange={(e) => setPayrollMonthNumber(e.target.value)}
            className="bg-[#11141B] text-white font-bold border border-gray-700 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="01">01 - شهر يناير</option>
            <option value="02">02 - شهر فبراير</option>
            <option value="03">03 - شهر مارس</option>
            <option value="04">04 - شهر أبريل</option>
            <option value="05">05 - شهر مايو</option>
            <option value="06">06 - شهر يونيو</option>
            <option value="07">07 - شهر يوليو</option>
            <option value="08">08 - شهر أغسطس</option>
            <option value="09">09 - شهر سبتمبر</option>
            <option value="10">10 - شهر أكتوبر</option>
            <option value="11">11 - شهر نوفمبر</option>
            <option value="12">12 - شهر ديسمبر</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 whitespace-nowrap">تاريخ كشف الحساب:</span>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="bg-[#1A1F26] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          />
          {filterMonth && (
            <button
              onClick={() => setFilterMonth("")}
              className="px-2 py-1 bg-gray-800 text-gray-400 hover:text-white rounded text-xs"
            >
              إلغاء
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#11141B] border border-gray-800 rounded-xl p-4 overflow-x-auto">
        <table className="w-full text-xs text-right text-gray-300">
          <thead className="bg-[#1A1F26] text-gray-400">
            <tr>
              <th className="p-2.5">الكود</th>
              <th className="p-2.5">اسم الموظف</th>
              <th className="p-2.5">رقم الحساب</th>
              <th className="p-2.5">القسم والوظيفة</th>
              <th className="p-2.5">الراتب الأساسي</th>
              <th className="p-2.5">البدلات والحافز</th>
              <th className="p-2.5">التأمين الاجتماعي</th>
              <th className="p-2.5">الخصومات والسلف</th>
              <th className="p-2.5">صافي المستحق</th>
              <th className="p-2.5">ملاحظات</th>
              <th className="p-2.5 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredEmployees.map((e) => (
              <tr key={e.id} className="hover:bg-gray-800/40">
                <td className="p-2.5 font-bold font-mono text-blue-400">{e.code}</td>
                <td className="p-2.5 font-semibold text-white">{e.name}</td>
                <td className="p-2.5 font-mono text-amber-400">{e.accountNumber || "-"}</td>
                <td className="p-2.5 text-gray-400">{e.department} - {e.jobTitle}</td>
                <td className="p-2.5 font-bold text-white">{e.basicSalary.toLocaleString()}</td>
                <td className="p-2.5 text-emerald-400 font-bold">
                  +{(e.allowances + (e.incentives || 0)).toLocaleString()}
                  {e.incentives ? <span className="text-[10px] block text-emerald-300/80">(حافز: {e.incentives})</span> : null}
                </td>
                <td className="p-2.5 text-amber-400 font-bold">
                  -{(e.socialInsuranceEmployee || 0).toLocaleString()}
                  <span className="text-[10px] block text-slate-400">(شركة: {e.socialInsuranceEmployer || 0})</span>
                </td>
                <td className="p-2.5 text-rose-400 font-bold">-{e.deductions.toLocaleString()}</td>
                <td className="p-2.5 font-bold text-blue-400">{e.netSalary.toLocaleString()} {companySettings.currency}</td>
                <td className="p-2.5 text-gray-400 max-w-[120px] truncate">{e.notes || "-"}</td>
                <td className="p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handlePrintSingleEmployee(e)}
                      className="p-1.5 bg-[#1A1F26] hover:bg-gray-800 text-emerald-400 rounded border border-gray-700 transition"
                      title="طباعة مفردات مرتب هذا الموظف مباشرة"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setSelectedSlipEmp(e)}
                      className="p-1.5 bg-[#1A1F26] hover:bg-gray-800 text-blue-400 rounded border border-gray-700 transition"
                      title="معاينة بيان مفردات المرتب"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(e)}
                      className="p-1.5 bg-[#1A1F26] hover:bg-gray-800 text-amber-400 rounded border border-gray-700 transition"
                      title="تعديل بيانات الموظف"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(e)}
                      className="p-1.5 bg-[#1A1F26] hover:bg-gray-800 text-rose-400 rounded border border-gray-700 transition"
                      title="حذف الموظف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Employee Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141B] border border-gray-800 rounded-xl w-full max-w-lg p-5 text-[#E2E8F0] space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold border-b border-gray-800 pb-2 text-white">
              {editingId ? "تعديل بيانات الموظف والتأمينات" : "إضافة موظف جديد للسجل التاميني والمالي"}
            </h3>
            <form onSubmit={handleSaveEmployeeSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-400 mb-1">كود الموظف *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-[#1A1F26] border border-gray-700 rounded p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">رقم الحساب البنكي / IBAN</label>
                  <input
                    type="text"
                    placeholder="EG00 0000 0000..."
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full bg-[#1A1F26] border border-gray-700 rounded p-2 text-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">اسم الموظف ثلاثي *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1A1F26] border border-gray-700 rounded p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-400 mb-1">القسم *</label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-[#1A1F26] border border-gray-700 rounded p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">المسمى الوظيفي *</label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full bg-[#1A1F26] border border-gray-700 rounded p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-gray-400 mb-1">الراتب الأساسي *</label>
                  <input
                    type="number"
                    required
                    value={basicSalary}
                    onChange={(e) => handleSalaryChange(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-[#1A1F26] border border-gray-700 rounded p-2 text-emerald-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">البدلات الشهرية</label>
                  <input
                    type="number"
                    value={allowances}
                    onChange={(e) => setAllowances(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-[#1A1F26] border border-gray-700 rounded p-2 text-blue-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">الحافز / المكافأة</label>
                  <input
                    type="number"
                    value={incentives}
                    onChange={(e) => setIncentives(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-[#1A1F26] border border-gray-700 rounded p-2 text-emerald-400 font-bold"
                  />
                </div>
              </div>

              {/* Insurance fields according to Egyptian Tax Law */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <div>
                  <label className="block text-amber-400 mb-1">تأمين اجتماعي (حصة الموظف 11%)</label>
                  <input
                    type="number"
                    value={socialInsuranceEmployee}
                    onChange={(e) => setSocialInsuranceEmployee(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-[#1A1F26] border border-amber-500/40 rounded p-2 text-amber-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">تأمين اجتماعي (حصة الشركة 18.75%)</label>
                  <input
                    type="number"
                    value={socialInsuranceEmployer}
                    onChange={(e) => setSocialInsuranceEmployer(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-[#1A1F26] border border-gray-700 rounded p-2 text-slate-300 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-400 mb-1">الخصومات والسلف</label>
                  <input
                    type="number"
                    value={deductions}
                    onChange={(e) => setDeductions(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-[#1A1F26] border border-gray-700 rounded p-2 text-rose-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">الحالة *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-[#1A1F26] border border-gray-700 rounded p-2 text-white"
                  >
                    <option value="ACTIVE">نشط وعلى رأس العمل</option>
                    <option value="ON_LEAVE">في إجازة رسمية</option>
                    <option value="TERMINATED">منتهي الخدمة / مستقيل</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات حول العقد، التأمين أو الترقية..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#1A1F26] border border-gray-700 rounded p-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-[#1A1F26] text-gray-300 rounded hover:bg-gray-800 transition"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold transition">
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmEmp}
        message={`هل أنت تأكد من حذف الموظف (${deleteConfirmEmp?.name}) من سجل الموارد البشرية والرواتب نهائياً؟`}
        onConfirm={() => {
          if (deleteConfirmEmp) {
            onDeleteEmployee(deleteConfirmEmp.id);
            setDeleteConfirmEmp(null);
          }
        }}
        onCancel={() => setDeleteConfirmEmp(null)}
      />

      {/* Individual Employee Payslip Preview Modal */}
      {selectedSlipEmp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141B] border border-gray-800 rounded-xl w-full max-w-2xl p-5 text-[#E2E8F0] space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <span>معاينة بيان مفردات مرتب الموظف</span>
              </h3>
              <span className="text-xs bg-blue-900/60 text-blue-300 font-mono px-2.5 py-1 rounded border border-blue-700/50">
                {selectedSlipEmp.code}
              </span>
            </div>

            {/* Employee Info Grid */}
            <div className="bg-[#1A1F26] border border-gray-800 rounded-lg p-3 text-xs grid grid-cols-2 gap-3">
              <div>
                <span className="text-gray-400 block mb-0.5">اسم الموظف:</span>
                <span className="font-bold text-white text-sm">{selectedSlipEmp.name}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">القسم والوظيفة:</span>
                <span className="font-semibold text-gray-200">{selectedSlipEmp.department} - {selectedSlipEmp.jobTitle}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">رقم الحساب / IBAN:</span>
                <span className="font-mono text-amber-400 font-bold">{selectedSlipEmp.accountNumber || "غير محدد"}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">حالة الموظف:</span>
                <span className="text-gray-300">{selectedSlipEmp.status === "ACTIVE" ? "نشط وعلى رأس العمل" : selectedSlipEmp.status === "ON_LEAVE" ? "في إجازة" : "منتهي الخدمة"}</span>
              </div>
            </div>

            {/* Earnings and Deductions comparison cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Earnings */}
              <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-lg p-3 space-y-2">
                <span className="font-bold text-emerald-400 block border-b border-emerald-800/40 pb-1">
                  المستحقات والبدلات (+)
                </span>
                <div className="flex justify-between text-gray-300">
                  <span>الراتب الأساسي:</span>
                  <span className="font-bold text-white">{selectedSlipEmp.basicSalary.toLocaleString()} {companySettings.currency}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>البدلات الشهرية:</span>
                  <span className="text-emerald-400 font-bold">+{selectedSlipEmp.allowances.toLocaleString()} {companySettings.currency}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>الحوافز والمكافآت:</span>
                  <span className="text-emerald-400 font-bold">+{ (selectedSlipEmp.incentives || 0).toLocaleString()} {companySettings.currency}</span>
                </div>
                <div className="flex justify-between text-emerald-300 font-bold pt-2 border-t border-emerald-800/40">
                  <span>إجمالي المستحقات:</span>
                  <span>{(selectedSlipEmp.basicSalary + selectedSlipEmp.allowances + (selectedSlipEmp.incentives || 0)).toLocaleString()} {companySettings.currency}</span>
                </div>
              </div>

              {/* Deductions */}
              <div className="bg-rose-950/20 border border-rose-800/40 rounded-lg p-3 space-y-2">
                <span className="font-bold text-rose-400 block border-b border-rose-800/40 pb-1">
                  الاستقطاعات والخصومات (-)
                </span>
                <div className="flex justify-between text-gray-300">
                  <span>تأمين اجتماعي (11% موظف):</span>
                  <span className="text-amber-400 font-bold">-${(selectedSlipEmp.socialInsuranceEmployee || 0).toLocaleString()} {companySettings.currency}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>الخصومات والجزاءات:</span>
                  <span className="text-rose-400 font-bold">-${selectedSlipEmp.deductions.toLocaleString()} {companySettings.currency}</span>
                </div>
                <div className="flex justify-between text-gray-400 text-[11px]">
                  <span>تأمين الشركة (18.75% للإفصاح):</span>
                  <span>${(selectedSlipEmp.socialInsuranceEmployer || 0).toLocaleString()} {companySettings.currency}</span>
                </div>
                <div className="flex justify-between text-rose-300 font-bold pt-2 border-t border-rose-800/40">
                  <span>إجمالي الاستقطاعات:</span>
                  <span>-${((selectedSlipEmp.socialInsuranceEmployee || 0) + selectedSlipEmp.deductions).toLocaleString()} {companySettings.currency}</span>
                </div>
              </div>
            </div>

            {/* Net Salary Highlight */}
            <div className="bg-blue-950/40 border border-blue-700/60 rounded-xl p-4 flex items-center justify-between text-white">
              <span className="font-bold text-sm text-blue-300">صافي الراتب المستحق للصرف والتحويل:</span>
              <span className="text-xl font-extrabold text-blue-400 font-mono">
                {selectedSlipEmp.netSalary.toLocaleString()} {companySettings.currency}
              </span>
            </div>

            {selectedSlipEmp.notes && (
              <div className="bg-[#1A1F26] border border-gray-800 rounded-lg p-3 text-xs text-gray-400">
                <span className="font-bold text-gray-300 block mb-1">ملاحظات الموارد البشرية:</span>
                <p>{selectedSlipEmp.notes}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setSelectedSlipEmp(null)}
                className="px-4 py-2 bg-[#1A1F26] text-gray-300 rounded hover:bg-gray-800 text-xs font-medium transition"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => {
                  handlePrintSingleEmployee(selectedSlipEmp);
                  setSelectedSlipEmp(null);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة قسيمة مفردات المرتب الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
