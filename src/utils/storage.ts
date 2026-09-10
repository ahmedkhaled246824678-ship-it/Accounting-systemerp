import {
  Account,
  CompanySettings,
  TenantCompany,
  CostCenter,
  Custody,
  Advance,
  Employee,
  FixedAsset,
  InventoryItem,
  InventoryMovement,
  JournalEntry,
  PayrollRun,
  TreasuryVoucher,
  BankVoucher,
  User,
  Partner,
  ElectricityInvoice,
  SiteAdjustment,
  CustodyClearanceRecord,
  SystemLockState,
} from "../types";
import {
  initialAccounts,
  initialCompanySettings,
  initialTenants,
  initialCostCenters,
  initialCustodies,
  initialAdvances,
  initialEmployees,
  initialFixedAssets,
  initialInventoryItems,
  initialInventoryMovements,
  initialJournalEntries,
  initialPayrolls,
  initialTreasuryVouchers,
  initialBankVouchers,
  initialUsers,
  initialPartners,
  initialElectricityInvoices,
  initialSiteAdjustments,
  initialSiteOrientations,
  initialCustodyClearances,
  initialSystemLockState,
} from "../data/initialData";

import { generateSecureToken, generateUserLinkId } from "../data/permissionsData";

const STORAGE_KEYS = {
  SETTINGS: "erp_company_settings",
  TENANTS: "erp_tenants_list",
  ACTIVE_TENANT_ID: "erp_active_tenant_id",
  ACCOUNTS: "erp_accounts",
  JOURNAL: "erp_journal_entries",
  TREASURY: "erp_treasury_vouchers",
  BANKS: "erp_bank_vouchers",
  COST_CENTERS: "erp_cost_centers",
  CUSTODIES: "erp_custodies",
  ADVANCES: "erp_advances",
  FIXED_ASSETS: "erp_fixed_assets",
  EMPLOYEES: "erp_employees",
  PAYROLLS: "erp_payrolls",
  INVENTORY: "erp_inventory_items",
  INVENTORY_MOVEMENTS: "erp_inventory_movements",
  USERS: "erp_users",
  PARTNERS: "erp_partners",
  ELECTRICITY_INVOICES: "erp_electricity_invoices",
  SITE_ADJUSTMENTS: "erp_site_adjustments",
  SITE_ORIENTATIONS: "erp_site_orientations",
  CUSTODY_CLEARANCES: "erp_custody_clearances",
  ACTIVE_USER_ID: "erp_active_user_id",
  ACTIVE_USER_LINK: "erp_active_user_link",
  SYSTEM_LOCK: "erp_system_lock_state",
};

export function getStoredData<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (err) {
    console.error(`Error loading key ${key} from storage:`, err);
    return defaultValue;
  }
}

export function setStoredData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving key ${key} to storage:`, err);
  }
}

// In-memory listeners for zero-DOM constructor dependencies
const usersListeners = new Set<(users: User[]) => void>();
const systemLockListeners = new Set<(state: SystemLockState) => void>();
const tenantListeners = new Set<(tenantId: string) => void>();

export function onUsersUpdated(cb: (users: User[]) => void): () => void {
  usersListeners.add(cb);
  return () => {
    usersListeners.delete(cb);
  };
}

export function onTenantUpdated(cb: (tenantId: string) => void): () => void {
  tenantListeners.add(cb);
  return () => {
    tenantListeners.delete(cb);
  };
}

export function notifyTenantUpdated(tenantId: string): void {
  tenantListeners.forEach((cb) => {
    try {
      cb(tenantId);
    } catch (e) {}
  });
}

export function getTenantScopedKey(baseKey: string, tenantId?: string): string {
  const current = tenantId || ERPStorage.getActiveTenantId();
  if (!current || current === "tenant-1") {
    return baseKey;
  }
  return `${baseKey}_${current}`;
}

export function onSystemLockUpdated(cb: (state: SystemLockState) => void): () => void {
  systemLockListeners.add(cb);
  return () => {
    systemLockListeners.delete(cb);
  };
}

export function notifyUsersUpdated(updatedUsers?: User[]): void {
  try {
    const users = updatedUsers || ERPStorage.getUsers();
    usersListeners.forEach((cb) => {
      try {
        cb(users);
      } catch (e) {}
    });
  } catch (err) {
    console.error("Error broadcasting users update:", err);
  }
}

export function notifySystemLockUpdated(lockState?: SystemLockState): void {
  try {
    const state = lockState || ERPStorage.getSystemLockState();
    systemLockListeners.forEach((cb) => {
      try {
        cb(state);
      } catch (e) {}
    });
  } catch (err) {
    console.error("Error broadcasting system lock update:", err);
  }
}

export const ERPStorage = {
  // --- Multi-Tenant / Multi-Company Methods ---
  getActiveTenantId: (): string => getStoredData<string>(STORAGE_KEYS.ACTIVE_TENANT_ID, "tenant-1"),
  setActiveTenantId: (tenantId: string) => {
    setStoredData(STORAGE_KEYS.ACTIVE_TENANT_ID, tenantId);
    notifyTenantUpdated(tenantId);
  },
  getTenants: (): TenantCompany[] => {
    const raw = getStoredData<TenantCompany[]>(STORAGE_KEYS.TENANTS, initialTenants);
    if (!Array.isArray(raw) || raw.length === 0) return initialTenants;
    return raw;
  },
  saveTenants: (tenants: TenantCompany[]) => {
    setStoredData(STORAGE_KEYS.TENANTS, tenants);
  },
  getActiveTenant: (): TenantCompany => {
    const tenants = ERPStorage.getTenants();
    const id = ERPStorage.getActiveTenantId();
    return tenants.find((t) => t.id === id) || tenants[0] || initialTenants[0];
  },

  getSettings: (tenantId?: string) => {
    const activeTenantId = tenantId || ERPStorage.getActiveTenantId();
    const key = getTenantScopedKey(STORAGE_KEYS.SETTINGS, activeTenantId);
    const tenant = ERPStorage.getTenants().find((t) => t.id === activeTenantId);
    const def = tenant ? (tenant as CompanySettings) : initialCompanySettings;
    return getStoredData<CompanySettings>(key, def);
  },
  getCompanySettings: (tenantId?: string) => ERPStorage.getSettings(tenantId),
  saveSettings: (settings: CompanySettings, tenantId?: string) => {
    const activeTenantId = tenantId || ERPStorage.getActiveTenantId();
    setStoredData(getTenantScopedKey(STORAGE_KEYS.SETTINGS, activeTenantId), settings);
  },
  saveCompanySettings: (settings: CompanySettings, tenantId?: string) => ERPStorage.saveSettings(settings, tenantId),

  getAccounts: (tenantId?: string) => {
    const key = getTenantScopedKey(STORAGE_KEYS.ACCOUNTS, tenantId);
    const raw = getStoredData<Account[]>(key, initialAccounts);
    if (!Array.isArray(raw)) return initialAccounts;
    const seen = new Set<string>();
    return raw.filter((a) => {
      const k = (a.id || a.code || "").trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  },
  saveAccounts: (accounts: Account[], tenantId?: string) => {
    const key = getTenantScopedKey(STORAGE_KEYS.ACCOUNTS, tenantId);
    const seen = new Set<string>();
    const unique = (accounts || []).filter((a) => {
      const k = (a.id || a.code || "").trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    setStoredData(key, unique);
  },

  getJournalEntries: (tenantId?: string) => {
    const key = getTenantScopedKey(STORAGE_KEYS.JOURNAL, tenantId);
    const raw = getStoredData<JournalEntry[]>(key, initialJournalEntries);
    if (!Array.isArray(raw)) return initialJournalEntries;
    const seen = new Set<string>();
    return raw.filter((j) => {
      const k = (j.id || "").trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  },
  saveJournalEntries: (entries: JournalEntry[], tenantId?: string) => {
    const key = getTenantScopedKey(STORAGE_KEYS.JOURNAL, tenantId);
    const seen = new Set<string>();
    const unique = (entries || []).filter((j) => {
      const k = (j.id || "").trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    setStoredData(key, unique);
  },

  getTreasuryVouchers: (tenantId?: string) =>
    getStoredData<TreasuryVoucher[]>(getTenantScopedKey(STORAGE_KEYS.TREASURY, tenantId), initialTreasuryVouchers),
  saveTreasuryVouchers: (vouchers: TreasuryVoucher[], tenantId?: string) =>
    setStoredData(getTenantScopedKey(STORAGE_KEYS.TREASURY, tenantId), vouchers),

  getBankVouchers: (tenantId?: string) =>
    getStoredData<BankVoucher[]>(getTenantScopedKey(STORAGE_KEYS.BANKS, tenantId), initialBankVouchers),
  saveBankVouchers: (vouchers: BankVoucher[], tenantId?: string) =>
    setStoredData(getTenantScopedKey(STORAGE_KEYS.BANKS, tenantId), vouchers),

  getCostCenters: (tenantId?: string) => {
    const key = getTenantScopedKey(STORAGE_KEYS.COST_CENTERS, tenantId);
    const raw = getStoredData<CostCenter[]>(key, initialCostCenters);
    if (!Array.isArray(raw)) return initialCostCenters;
    const seen = new Set<string>();
    return raw.filter((c) => {
      const k = (c.id || c.code || "").trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  },
  saveCostCenters: (centers: CostCenter[], tenantId?: string) => {
    const key = getTenantScopedKey(STORAGE_KEYS.COST_CENTERS, tenantId);
    const seen = new Set<string>();
    const unique = (centers || []).filter((c) => {
      const k = (c.id || c.code || "").trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    setStoredData(key, unique);
  },

  getCustodies: (tenantId?: string) =>
    getStoredData<Custody[]>(getTenantScopedKey(STORAGE_KEYS.CUSTODIES, tenantId), initialCustodies),
  saveCustodies: (custodies: Custody[], tenantId?: string) =>
    setStoredData(getTenantScopedKey(STORAGE_KEYS.CUSTODIES, tenantId), custodies),

  getAdvances: (tenantId?: string) =>
    getStoredData<Advance[]>(getTenantScopedKey(STORAGE_KEYS.ADVANCES, tenantId), initialAdvances),
  saveAdvances: (advances: Advance[], tenantId?: string) =>
    setStoredData(getTenantScopedKey(STORAGE_KEYS.ADVANCES, tenantId), advances),

  getFixedAssets: (tenantId?: string) =>
    getStoredData<FixedAsset[]>(getTenantScopedKey(STORAGE_KEYS.FIXED_ASSETS, tenantId), initialFixedAssets),
  saveFixedAssets: (assets: FixedAsset[], tenantId?: string) =>
    setStoredData(getTenantScopedKey(STORAGE_KEYS.FIXED_ASSETS, tenantId), assets),

  getEmployees: (tenantId?: string) =>
    getStoredData<Employee[]>(getTenantScopedKey(STORAGE_KEYS.EMPLOYEES, tenantId), initialEmployees),
  saveEmployees: (employees: Employee[], tenantId?: string) =>
    setStoredData(getTenantScopedKey(STORAGE_KEYS.EMPLOYEES, tenantId), employees),

  getPayrolls: (tenantId?: string) =>
    getStoredData<PayrollRun[]>(getTenantScopedKey(STORAGE_KEYS.PAYROLLS, tenantId), initialPayrolls),
  savePayrolls: (payrolls: PayrollRun[], tenantId?: string) =>
    setStoredData(getTenantScopedKey(STORAGE_KEYS.PAYROLLS, tenantId), payrolls),

  getInventory: (tenantId?: string) =>
    getStoredData<InventoryItem[]>(getTenantScopedKey(STORAGE_KEYS.INVENTORY, tenantId), initialInventoryItems),
  getInventoryItems: (tenantId?: string) =>
    getStoredData<InventoryItem[]>(getTenantScopedKey(STORAGE_KEYS.INVENTORY, tenantId), initialInventoryItems),
  saveInventory: (items: InventoryItem[], tenantId?: string) =>
    setStoredData(getTenantScopedKey(STORAGE_KEYS.INVENTORY, tenantId), items),
  saveInventoryItems: (items: InventoryItem[], tenantId?: string) =>
    setStoredData(getTenantScopedKey(STORAGE_KEYS.INVENTORY, tenantId), items),

  getInventoryMovements: (tenantId?: string) =>
    getStoredData<InventoryMovement[]>(getTenantScopedKey(STORAGE_KEYS.INVENTORY_MOVEMENTS, tenantId), initialInventoryMovements),
  saveInventoryMovements: (movements: InventoryMovement[], tenantId?: string) =>
    setStoredData(getTenantScopedKey(STORAGE_KEYS.INVENTORY_MOVEMENTS, tenantId), movements),

  getUsers: (): User[] => {
    const rawUsers = getStoredData<User[]>(STORAGE_KEYS.USERS, initialUsers);
    if (!Array.isArray(rawUsers) || rawUsers.length === 0) {
      return initialUsers;
    }

    const seen = new Set<string>();
    const uniqueRaw: User[] = [];
    for (const u of rawUsers) {
      const key = (u.id || u.username || "").trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        uniqueRaw.push(u);
      }
    }

    return uniqueRaw.map((u, idx) => {
      const isSuper = u.isSuperAdmin || (idx === 0 && (u.role === "ADMIN" || u.role === "SUPER_ADMIN"));
      const role = u.role || (isSuper ? "SUPER_ADMIN" : "ACCOUNTANT");
      const status = u.status || (u.isActive !== false ? "ACTIVE" : "INACTIVE");
      const isActive = status === "ACTIVE";
      const userLinkId = u.userLinkId || (u.shareToken ? `ulnk_${u.shareToken}` : generateUserLinkId());
      const token = u.token || generateSecureToken();

      return {
        ...u,
        role: role as any,
        status,
        isActive,
        isSuperAdmin: isSuper,
        userLinkId,
        token,
        tokenCreatedAt: u.tokenCreatedAt || "2026-01-01T00:00:00Z",
        tokenRevoked: u.tokenRevoked || false,
        tenantId: u.tenantId || "tenant-1",
        assignedTenantIds: Array.isArray(u.assignedTenantIds) && u.assignedTenantIds.length > 0 ? u.assignedTenantIds : ["tenant-1"],
        electronicSignature: u.electronicSignature || "",
        signatureTitle: u.signatureTitle || (role === "SUPER_ADMIN" ? "المدير العام المعتمد" : role === "ACCOUNTANT" ? "المحاسب المالي" : "مسؤول النظام"),
        isSignatureApproved: u.isSignatureApproved !== undefined ? u.isSignatureApproved : true,
        customPermissions: u.customPermissions || { granted: [], revoked: [] },
        allowedTabs: Array.isArray(u.allowedTabs) && u.allowedTabs.length > 0
          ? Array.from(new Set(u.allowedTabs))
          : isSuper || role === "SUPER_ADMIN" || role === "ADMIN"
          ? ["*"]
          : [
              "dashboard",
              "accounts",
              "journal",
              "general_ledger",
              "treasury",
              "custody_clearance",
              "banks",
              "combined",
              "cost_centers",
              "expenses",
              "site_adjustments",
              "electricity_invoices",
              "partners",
              "inventory",
            ],
        permissions: u.permissions || {
          canAdd: true,
          canEdit: true,
          canDelete: isSuper || role === "ADMIN",
          canPrint: true,
          canExport: true,
          canManageUsers: isSuper || role === "ADMIN",
        },
        pin: u.pin || "1234",
        password: u.password || "123",
        shareToken: userLinkId,
      };
    });
  },
  saveUsers: (users: User[]) => {
    const seen = new Set<string>();
    const uniqueUsers: User[] = [];
    for (const u of users) {
      const key = (u.id || u.username || "").trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        uniqueUsers.push({
          ...u,
          updatedAt: u.updatedAt || new Date().toISOString(),
        });
      }
    }
    setStoredData(STORAGE_KEYS.USERS, uniqueUsers);
    notifyUsersUpdated(uniqueUsers);
  },

  getUserByLinkId: (linkId: string): User | null => {
    if (!linkId) return null;
    const users = ERPStorage.getUsers();
    const cleanLinkId = decodeURIComponent(linkId.trim());
    const lowerClean = cleanLinkId.toLowerCase();

    return (
      users.find(
        (u) =>
          u.userLinkId === cleanLinkId ||
          u.shareToken === cleanLinkId ||
          (u.userLinkId && cleanLinkId.endsWith(u.userLinkId)) ||
          (u.userLinkId && u.userLinkId.endsWith(cleanLinkId)) ||
          u.username.toLowerCase() === lowerClean ||
          u.id.toLowerCase() === lowerClean ||
          (u.email && u.email.toLowerCase() === lowerClean) ||
          u.token === cleanLinkId
      ) || null
    );
  },

  getUserByToken: (token: string): User | null => {
    if (!token) return null;
    const users = ERPStorage.getUsers();
    const clean = token.trim();
    return users.find((u) => u.token === clean && !u.tokenRevoked) || null;
  },

  regenerateUserLink: (userId: string): { userLinkId: string; token: string } => {
    const users = ERPStorage.getUsers();
    const newLinkId = generateUserLinkId();
    const newToken = generateSecureToken();
    const now = new Date().toISOString();

    const updated = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          userLinkId: newLinkId,
          shareToken: newLinkId,
          token: newToken,
          tokenCreatedAt: now,
          tokenRevoked: false,
          updatedAt: now,
        };
      }
      return u;
    });

    ERPStorage.saveUsers(updated);
    return { userLinkId: newLinkId, token: newToken };
  },

  setUserStatus: (userId: string, status: "ACTIVE" | "INACTIVE"): User | null => {
    const users = ERPStorage.getUsers();
    let updatedUser: User | null = null;
    const now = new Date().toISOString();

    const updated = users.map((u) => {
      if (u.id === userId) {
        updatedUser = {
          ...u,
          status,
          isActive: status === "ACTIVE",
          updatedAt: now,
        };
        return updatedUser;
      }
      return u;
    });

    ERPStorage.saveUsers(updated);
    return updatedUser;
  },

  getActiveUserLink: () => getStoredData<string>(STORAGE_KEYS.ACTIVE_USER_LINK, ""),
  saveActiveUserLink: (link: string) => setStoredData(STORAGE_KEYS.ACTIVE_USER_LINK, link),

  getPartners: (tenantId?: string) => {
    const key = getTenantScopedKey(STORAGE_KEYS.PARTNERS, tenantId);
    const raw = getStoredData<Partner[]>(key, initialPartners);
    if (!Array.isArray(raw)) return initialPartners;
    const seen = new Set<string>();
    return raw.filter((p) => {
      const k = (p.id || p.name || "").trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  },
  savePartners: (partners: Partner[], tenantId?: string) => {
    const key = getTenantScopedKey(STORAGE_KEYS.PARTNERS, tenantId);
    const seen = new Set<string>();
    const unique = (partners || []).filter((p) => {
      const k = (p.id || p.name || "").trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    setStoredData(key, unique);
  },

  getElectricityInvoices: (tenantId?: string) => {
    const key = getTenantScopedKey(STORAGE_KEYS.ELECTRICITY_INVOICES, tenantId);
    const raw = getStoredData<ElectricityInvoice[]>(key, initialElectricityInvoices);
    if (!Array.isArray(raw)) return initialElectricityInvoices;
    const seen = new Set<string>();
    return raw.filter((inv) => {
      const k = (inv.id || `${inv.serialNumber}-${inv.meterNumber}`).trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  },
  saveElectricityInvoices: (invoices: ElectricityInvoice[], tenantId?: string) => {
    const key = getTenantScopedKey(STORAGE_KEYS.ELECTRICITY_INVOICES, tenantId);
    const seen = new Set<string>();
    const unique = (invoices || []).filter((inv) => {
      const k = (inv.id || `${inv.serialNumber}-${inv.meterNumber}`).trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    setStoredData(key, unique);
  },

  getSiteAdjustments: (tenantId?: string) => {
    const key = getTenantScopedKey(STORAGE_KEYS.SITE_ADJUSTMENTS, tenantId);
    const raw = getStoredData<SiteAdjustment[]>(key, initialSiteAdjustments);
    if (!Array.isArray(raw)) return initialSiteAdjustments;
    const seen = new Set<string>();
    return raw.filter((adj) => {
      const k = (adj.id || "").trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  },
  saveSiteAdjustments: (adjustments: SiteAdjustment[], tenantId?: string) => {
    const key = getTenantScopedKey(STORAGE_KEYS.SITE_ADJUSTMENTS, tenantId);
    const seen = new Set<string>();
    const unique = (adjustments || []).filter((adj) => {
      const k = (adj.id || "").trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    setStoredData(key, unique);
  },
  deleteSiteAdjustment: (adjustmentId: string, tenantId?: string) => {
    const adjustments = ERPStorage.getSiteAdjustments(tenantId);
    const filtered = adjustments.filter((a) => a.id !== adjustmentId);
    ERPStorage.saveSiteAdjustments(filtered, tenantId);
    return filtered;
  },

  getSiteOrientations: () => getStoredData<string[]>(STORAGE_KEYS.SITE_ORIENTATIONS, initialSiteOrientations),
  saveSiteOrientations: (orientations: string[]) => setStoredData(STORAGE_KEYS.SITE_ORIENTATIONS, Array.from(new Set(orientations || []))),

  getCustodyClearances: (tenantId?: string) => {
    const key = getTenantScopedKey(STORAGE_KEYS.CUSTODY_CLEARANCES, tenantId);
    const raw = getStoredData<CustodyClearanceRecord[]>(key, initialCustodyClearances);
    if (!Array.isArray(raw)) return initialCustodyClearances;
    const seen = new Set<string>();
    return raw.filter((rec) => {
      const k = (rec.id || "").trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  },
  saveCustodyClearances: (records: CustodyClearanceRecord[], tenantId?: string) => {
    const key = getTenantScopedKey(STORAGE_KEYS.CUSTODY_CLEARANCES, tenantId);
    const seen = new Set<string>();
    const unique = (records || []).filter((rec) => {
      const k = (rec.id || "").trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    setStoredData(key, unique);
  },

  getActiveUserId: () => getStoredData<string | null>(STORAGE_KEYS.ACTIVE_USER_ID, null),
  saveActiveUserId: (userId: string | null) => setStoredData(STORAGE_KEYS.ACTIVE_USER_ID, userId),

  getSystemLockState: (): SystemLockState =>
    getStoredData<SystemLockState>(STORAGE_KEYS.SYSTEM_LOCK, initialSystemLockState),
  saveSystemLockState: (lockState: SystemLockState): void => {
    setStoredData(STORAGE_KEYS.SYSTEM_LOCK, lockState);
    notifySystemLockUpdated(lockState);
  },

  resetToDefault: () => {
    localStorage.clear();
    window.location.reload();
  }
};
