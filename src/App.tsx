import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { DashboardView } from "./components/DashboardView";
import { AccountsView } from "./components/AccountsView";
import { JournalEntriesView } from "./components/JournalEntriesView";
import { GeneralLedgerView } from "./components/GeneralLedgerView";
import { TreasuryView } from "./components/TreasuryView";
import { BanksView } from "./components/BanksView";
import { CostCentersView } from "./components/CostCentersView";
import { CombinedSheetView } from "./components/CombinedSheetView";
import { ExpensesSheetView } from "./components/ExpensesSheetView";
import { FinancialStatementsView } from "./components/FinancialStatementsView";
import { TrialBalanceView } from "./components/TrialBalanceView";
import { FixedAssetsView } from "./components/FixedAssetsView";
import { HRView } from "./components/HRView";
import { InventoryView } from "./components/InventoryView";
import { FinancialAnalysisView } from "./components/FinancialAnalysisView";
import { UsersView } from "./components/UsersView";
import { CompanySettingsView } from "./components/CompanySettingsView";
import { ElectricityInvoicesView } from "./components/ElectricityInvoicesView";
import { SiteAdjustmentsView } from "./components/SiteAdjustmentsView";
import { CustodyClearanceView } from "./components/CustodyClearanceView";
import { LoginView } from "./components/LoginView";
import { AccessDeniedView } from "./components/AccessDeniedView";
import { SystemSuspendedView } from "./components/SystemSuspendedView";
import { ShareAccessModal } from "./components/ShareAccessModal";
import { SwitchUserPasswordModal } from "./components/SwitchUserPasswordModal";
import { WhatsAppShareModal } from "./components/WhatsAppShareModal";
import { WhatsAppShareData } from "./utils/whatsapp";
import { NavTab } from "./components/Sidebar";

import {
  Account,
  CompanySettings,
  CostCenter,
  Custody,
  Advance,
  Employee,
  FilterParams,
  FixedAsset,
  InventoryItem,
  InventoryMovement,
  JournalEntry,
  JournalEntryLine,
  TreasuryVoucher,
  BankVoucher,
  User,
  FinancialAnalysisResult,
  Partner,
  ElectricityInvoice,
  SiteAdjustment,
  CustodyClearanceRecord,
  SystemLockState,
} from "./types";
import { AuthProvider } from "./context/AuthContext";
import { useLanguage } from "./context/LanguageContext";
import { ERPStorage, notifyUsersUpdated, onUsersUpdated, onSystemLockUpdated } from "./utils/storage";
import { PartnersView } from "./components/PartnersView";
import { parseUserFromCurrentUrl, getUserShareableUrl } from "./utils/userLinkService";
import { realtimeClient } from "./utils/realtimeService";
import { Zap, AlertTriangle, ShieldCheck, X, CheckCircle2 } from "lucide-react";

export default function App() {
  const { t, isRTL, language } = useLanguage();
  // Load initial state from storage
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [companySettings, setCompanySettings] = useState<CompanySettings>(ERPStorage.getCompanySettings());
  const [systemLockState, setSystemLockState] = useState<SystemLockState>(() => ERPStorage.getSystemLockState());
  const [accounts, setAccounts] = useState<Account[]>(ERPStorage.getAccounts());
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(ERPStorage.getJournalEntries());
  const [treasuryVouchers, setTreasuryVouchers] = useState<TreasuryVoucher[]>(ERPStorage.getTreasuryVouchers());
  const [bankVouchers, setBankVouchers] = useState<BankVoucher[]>(ERPStorage.getBankVouchers());
  const [custodies, setCustodies] = useState<Custody[]>(ERPStorage.getCustodies());
  const [advances, setAdvances] = useState<Advance[]>(ERPStorage.getAdvances());
  const [costCenters, setCostCenters] = useState<CostCenter[]>(ERPStorage.getCostCenters());
  const [employees, setEmployees] = useState<Employee[]>(ERPStorage.getEmployees());
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>(ERPStorage.getFixedAssets());
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(ERPStorage.getInventoryItems());
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>(ERPStorage.getInventoryMovements());
  // Users and Authentication State
  const defaultAdminUser: User = {
    id: "u-admin",
    username: "admin",
    fullName: "أحمد خالد",
    email: "admin@alradaa.com",
    role: "ADMIN",
    isSuperAdmin: true,
    isActive: true,
    status: "ACTIVE",
    allowedTabs: ["*"],
    permissions: {
      canAdd: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
      canPrint: true,
      canManageUsers: true,
    },
    createdAt: "2026-01-01T00:00:00Z",
  };
  const [users, setUsers] = useState<User[]>(() => {
    const list = ERPStorage.getUsers();
    return list.length > 0 ? list : [defaultAdminUser];
  });
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const storedUsers = ERPStorage.getUsers();
    return storedUsers.find((u) => u.isActive && (u.isSuperAdmin || u.role === "ADMIN" || u.role === "SUPER_ADMIN")) || storedUsers[0] || defaultAdminUser;
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [targetUserCandidate, setTargetUserCandidate] = useState<User | null>(null);
  const [deactivatedTargetUser, setDeactivatedTargetUser] = useState<User | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [whatsAppShareData, setWhatsAppShareData] = useState<WhatsAppShareData | null>(null);
  const [showSwitchPasswordModal, setShowSwitchPasswordModal] = useState<boolean>(false);
  const [switchTargetUser, setSwitchTargetUser] = useState<User | null>(null);

  const handleRequestSwitchUser = (target?: User) => {
    setSwitchTargetUser(target || null);
    setShowSwitchPasswordModal(true);
  };

  // Real-time toast notification for instant permission updates / redirection
  const [realtimeToast, setRealtimeToast] = useState<{
    id: string;
    title: string;
    description: string;
    type: "info" | "warning" | "success" | "danger";
  } | null>(null);

  const activeTabRef = React.useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Initial Fetch from Central Server Database on application mount
  useEffect(() => {
    fetch("/api/users")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch users");
      })
      .then((serverUsers) => {
        if (Array.isArray(serverUsers) && serverUsers.length > 0) {
          setUsers(serverUsers);
          ERPStorage.saveUsers(serverUsers);

          const activeId = ERPStorage.getActiveUserId();
          if (activeId) {
            const match = serverUsers.find(
              (u: User) => u.id === activeId && u.isActive && u.status !== "INACTIVE"
            );
            if (match) setCurrentUser(match);
          }
        }
      })
      .catch((err) => {
        console.warn("Using offline user cache:", err);
      });

    fetch("/api/system/lock")
      .then((res) => (res.ok ? res.json() : null))
      .then((state) => {
        if (state && typeof state.isLocked === "boolean") {
          setSystemLockState(state);
          ERPStorage.saveSystemLockState(state);
        }
      })
      .catch(() => {});
  }, []);

  // Real-time synchronization listener for user modifications, active/inactive toggles, permissions, and system lock
  useEffect(() => {
    const handleUsersChanged = (updatedList: User[]) => {
      if (!Array.isArray(updatedList) || updatedList.length === 0) return;

      setUsers((prev) => {
        const prevKey = prev.map((u) => `${u.id}-${u.role}-${u.status}-${u.isActive}-${(u.allowedTabs||[]).join(",")}-${u.updatedAt || ""}`).join("|");
        const nextKey = updatedList.map((u) => `${u.id}-${u.role}-${u.status}-${u.isActive}-${(u.allowedTabs||[]).join(",")}-${u.updatedAt || ""}`).join("|");
        if (prevKey === nextKey) return prev;
        return updatedList;
      });

      // Re-evaluate currentUser session state
      const currentActiveId = ERPStorage.getActiveUserId();
      const fresh = updatedList.find(
        (u) =>
          (currentActiveId && u.id === currentActiveId) ||
          (currentUser && (u.id === currentUser.id || u.username.toLowerCase() === currentUser.username.toLowerCase() || (currentUser.userLinkId && u.userLinkId === currentUser.userLinkId)))
      );

      if (fresh) {
        if (fresh.status === "INACTIVE" || fresh.isActive === false) {
          // Account was deactivated or deleted: immediately enforce lock/logout
          setDeactivatedTargetUser(fresh);
          setIsLoggedIn(false);
          setCurrentUser(null);
          ERPStorage.saveActiveUserId(null);
          setRealtimeToast({
            id: Date.now().toString(),
            title: "🚫 تم إيقاف الحساب",
            description: "تم إيقاف حسابك من قبل مدير النظام. تم إغلاق الجلسة فوراً.",
            type: "danger",
          });
        } else {
          // Account is active: apply fresh permissions and roles immediately
          setCurrentUser(fresh);
          setIsLoggedIn(true);
          if (!currentActiveId || currentActiveId !== fresh.id) {
            ERPStorage.saveActiveUserId(fresh.id);
          }

          // Re-evaluate current activeTab against new allowedTabs
          const allowed = fresh.allowedTabs || [];
          const currentTab = activeTabRef.current;
          if (
            allowed.length > 0 &&
            !allowed.includes("*") &&
            !allowed.includes(currentTab as any) &&
            fresh.role !== "SUPER_ADMIN" &&
            fresh.role !== "ADMIN"
          ) {
            const first = (allowed[0] as NavTab) || "dashboard";
            setActiveTab(first);
            setRealtimeToast({
              id: Date.now().toString(),
              title: "⚡ تعديل فوري للصلاحيات",
              description: `تم سحب صلاحية الوصول لشاشة (${getTabTitle(currentTab)}) من قبل مدير النظام وتوجيهك تلقائياً للشاشة المتاحة.`,
              type: "warning",
            });
          }
        }
      }
    };

    // 1. WebSocket Real-time Event Listener
    const unsubscribeWs = realtimeClient.subscribe((event) => {
      if (!event || !event.type) return;

      if (event.type === "USER_PERMISSIONS_UPDATED") {
        const updatedUser = event.user;
        const allUsers = event.users;

        if (Array.isArray(allUsers)) {
          setUsers(allUsers);
          ERPStorage.saveUsers(allUsers);
        }

        if (
          currentUser &&
          (currentUser.id === updatedUser.id ||
            currentUser.username.toLowerCase() === updatedUser.username.toLowerCase() ||
            (currentUser.userLinkId && updatedUser.userLinkId === currentUser.userLinkId))
        ) {
          if (updatedUser.status === "INACTIVE" || updatedUser.isActive === false) {
            setDeactivatedTargetUser(updatedUser);
            setIsLoggedIn(false);
            setCurrentUser(null);
            ERPStorage.saveActiveUserId(null);
            setRealtimeToast({
              id: Date.now().toString(),
              title: "🚫 تم إيقاف الحساب",
              description: "تم إيقاف حسابك من قبل مدير النظام. تم إغلاق الجلسة فوراً.",
              type: "danger",
            });
          } else {
            setCurrentUser(updatedUser);
            ERPStorage.saveActiveUserId(updatedUser.id);

            const allowed = updatedUser.allowedTabs || [];
            const currentTab = activeTabRef.current;
            if (
              allowed.length > 0 &&
              !allowed.includes("*") &&
              !allowed.includes(currentTab as any) &&
              updatedUser.role !== "SUPER_ADMIN" &&
              updatedUser.role !== "ADMIN"
            ) {
              const firstAllowed = (allowed[0] as NavTab) || "dashboard";
              setActiveTab(firstAllowed);
              setRealtimeToast({
                id: Date.now().toString(),
                title: "⚡ تعديل فوري للصلاحيات",
                description: `تم سحب صلاحية الوصول لشاشة (${getTabTitle(currentTab)}) من قبل مدير النظام وتوجيهك تلقائياً.`,
                type: "warning",
              });
            } else {
              setRealtimeToast({
                id: Date.now().toString(),
                title: "✨ تحديث فوري للصلاحيات",
                description: "تم تحديث صلاحيات حسابك وشاشاتك المصرح بها لحظياً من مدير النظام.",
                type: "success",
              });
            }
          }
        }
      } else if (
        event.type === "USERS_LIST_UPDATED" ||
        event.type === "USER_CREATED" ||
        event.type === "USER_DELETED"
      ) {
        if (Array.isArray(event.users)) {
          setUsers(event.users);
          ERPStorage.saveUsers(event.users);
        }
        if (event.type === "USER_DELETED" && currentUser && currentUser.id === event.userId) {
          setIsLoggedIn(false);
          setCurrentUser(null);
          ERPStorage.saveActiveUserId(null);
          setRealtimeToast({
            id: Date.now().toString(),
            title: "🚫 تم حذف الحساب",
            description: "تم حذف حسابك من قبل مدير النظام.",
            type: "danger",
          });
        }
      } else if (event.type === "SYSTEM_LOCK_CHANGED") {
        if (event.lockState) {
          setSystemLockState(event.lockState);
          ERPStorage.saveSystemLockState(event.lockState);

          if (event.lockState.isLocked) {
            setRealtimeToast({
              id: Date.now().toString(),
              title: "🔒 إغلاق النظام للصيانة",
              description:
                event.lockState.lockedReason ||
                "تم إيقاف النظام مؤقتاً للمستخدمين العاديين من قبل الإدارة.",
              type: "warning",
            });
          } else {
            setRealtimeToast({
              id: Date.now().toString(),
              title: "🔓 تم فتح النظام",
              description: "تمت إعادة تشغيل النظام لجميع المستخدمين من قبل مدير النظام.",
              type: "success",
            });
          }
        }
      }
    });

    const unsubscribeStorageUsers = onUsersUpdated((updatedUsers) => {
      handleUsersChanged(updatedUsers);
    });

    const unsubscribeStorageLock = onSystemLockUpdated((lock) => {
      setSystemLockState(lock);
    });

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === "erp_users" || e.key === "erp_active_user_id") {
        handleUsersChanged(ERPStorage.getUsers());
      }
      if (e.key === "erp_system_lock_state") {
        setSystemLockState(ERPStorage.getSystemLockState());
      }
    };

    const handleFocusSync = () => {
      handleUsersChanged(ERPStorage.getUsers());
      setSystemLockState(ERPStorage.getSystemLockState());
    };

    window.addEventListener("storage", handleStorageEvent);
    window.addEventListener("focus", handleFocusSync);
    document.addEventListener("visibilitychange", handleFocusSync);

    return () => {
      unsubscribeWs();
      unsubscribeStorageUsers();
      unsubscribeStorageLock();
      window.removeEventListener("storage", handleStorageEvent);
      window.removeEventListener("focus", handleFocusSync);
      document.removeEventListener("visibilitychange", handleFocusSync);
    };
  }, [currentUser]);

  // Detect URL parameter or portable token on mount (e.g. ?uauth=... or ?ulnk=...)
  useEffect(() => {
    try {
      const { user: targetUser, isDirectLink, isDeactivated } = parseUserFromCurrentUrl();

      if (targetUser) {
        // Sync local users state in case a new portable user was imported
        setUsers(ERPStorage.getUsers());

        if (isDeactivated) {
          setDeactivatedTargetUser(targetUser);
          setIsLoggedIn(false);
          setCurrentUser(null);
          ERPStorage.saveActiveUserId(null);
        } else {
          // Direct Link Auto Authentication & Immediate Permissions Enforcement
          setCurrentUser(targetUser);
          setIsLoggedIn(true);
          ERPStorage.saveActiveUserId(targetUser.id);
          setTargetUserCandidate(targetUser);

          // Automatically navigate to their first allowed screen if current activeTab is not permitted
          const foundAllowed = targetUser.allowedTabs || [];
          if (
            foundAllowed.length > 0 &&
            !foundAllowed.includes("*") &&
            !foundAllowed.includes(activeTab as any)
          ) {
            const first = foundAllowed[0] as NavTab;
            if (first) setActiveTab(first);
          }
        }
      }
    } catch (e) {
      console.error("Error reading user link from URL:", e);
    }
  }, []);

  const [partners, setPartners] = useState<Partner[]>(ERPStorage.getPartners());
  const [electricityInvoices, setElectricityInvoices] = useState<ElectricityInvoice[]>(ERPStorage.getElectricityInvoices());
  const [siteAdjustments, setSiteAdjustments] = useState<SiteAdjustment[]>(ERPStorage.getSiteAdjustments());
  const [siteOrientations, setSiteOrientations] = useState<string[]>(ERPStorage.getSiteOrientations());
  const [custodyClearances, setCustodyClearances] = useState<CustodyClearanceRecord[]>(ERPStorage.getCustodyClearances());

  // Global search and date filters
  const [filterParams, setFilterParams] = useState<FilterParams>({
    query: "",
    financialYear: companySettings.financialYear,
  });

  // AI Analysis State
  const [analysisResult, setAnalysisResult] = useState<FinancialAnalysisResult | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);

  // Sync state to storage
  useEffect(() => {
    ERPStorage.saveCompanySettings(companySettings);
  }, [companySettings]);

  useEffect(() => {
    ERPStorage.saveAccounts(accounts);
  }, [accounts]);

  useEffect(() => {
    ERPStorage.saveJournalEntries(journalEntries);
  }, [journalEntries]);

  useEffect(() => {
    ERPStorage.saveTreasuryVouchers(treasuryVouchers);
  }, [treasuryVouchers]);

  useEffect(() => {
    ERPStorage.saveBankVouchers(bankVouchers);
  }, [bankVouchers]);

  useEffect(() => {
    ERPStorage.saveCustodies(custodies);
  }, [custodies]);

  useEffect(() => {
    ERPStorage.saveAdvances(advances);
  }, [advances]);

  useEffect(() => {
    ERPStorage.saveCostCenters(costCenters);
  }, [costCenters]);

  useEffect(() => {
    ERPStorage.saveEmployees(employees);
  }, [employees]);

  useEffect(() => {
    ERPStorage.saveFixedAssets(fixedAssets);
  }, [fixedAssets]);

  useEffect(() => {
    ERPStorage.saveInventoryItems(inventoryItems);
  }, [inventoryItems]);

  useEffect(() => {
    ERPStorage.saveInventoryMovements(inventoryMovements);
  }, [inventoryMovements]);

  useEffect(() => {
    ERPStorage.saveUsers(users);
  }, [users]);

  useEffect(() => {
    ERPStorage.savePartners(partners);
  }, [partners]);

  useEffect(() => {
    ERPStorage.saveElectricityInvoices(electricityInvoices);
  }, [electricityInvoices]);

  useEffect(() => {
    ERPStorage.saveSiteAdjustments(siteAdjustments);
  }, [siteAdjustments]);

  useEffect(() => {
    ERPStorage.saveSiteOrientations(siteOrientations);
  }, [siteOrientations]);

  useEffect(() => {
    ERPStorage.saveCustodyClearances(custodyClearances);
  }, [custodyClearances]);

  useEffect(() => {
    ERPStorage.saveSystemLockState(systemLockState);
  }, [systemLockState]);

  const handleSaveSystemLockState = (updatedState: SystemLockState) => {
    setSystemLockState(updatedState);
    ERPStorage.saveSystemLockState(updatedState);

    // Broadcast system lock change to central server
    try {
      const token = localStorage.getItem("erp_user_token") || currentUser?.token || "";
      fetch("/api/system/lock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedState),
      }).catch((e) => console.warn("Backend system lock sync:", e));
    } catch (e) {
      console.warn("Error calling system lock endpoint:", e);
    }
  };

  const handleToggleSystemLock = () => {
    const nextLocked = !systemLockState.isLocked;
    const updated: SystemLockState = {
      ...systemLockState,
      isLocked: nextLocked,
      lockedAt: nextLocked ? new Date().toISOString() : "",
      lockedBy: currentUser?.fullName || currentUser?.username || "مدير النظام",
      lockedReason: systemLockState.lockedReason || "صيانة دورية وتحديث البيانات",
      notifyMessage: systemLockState.notifyMessage || "النظام قيد الصيانة، يرجى المحاولة لاحقاً",
      allowAdminsOnly: true,
    };
    handleSaveSystemLockState(updated);
  };

  const handleAddCustodyClearance = (rec: Omit<CustodyClearanceRecord, "id" | "createdAt">) => {
    const newRec: CustodyClearanceRecord = {
      ...rec,
      id: `CLR-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setCustodyClearances((prev) => [newRec, ...prev]);
  };

  const handleUpdateCustodyClearance = (id: string, updated: Partial<CustodyClearanceRecord>) => {
    setCustodyClearances((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updated } : r))
    );
  };

  const handleDeleteCustodyClearance = (id: string) => {
    setCustodyClearances((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSyncCustodiesToClearance = () => {
    const existingDocRefs = new Set(custodyClearances.map((c) => c.documentRef).filter(Boolean));
    const newRecords: CustodyClearanceRecord[] = [];

    custodies.forEach((cust) => {
      // 1. Initial Custody Given (debit)
      const initRef = cust.code || `عهدة-${cust.id}`;
      if (!existingDocRefs.has(initRef)) {
        newRecords.push({
          id: `CLR-SYNC-${cust.id}-INIT`,
          date: cust.dateGiven,
          beneficiaryName: cust.employeeName,
          statement: `صرف عهدة نقدية للموظف (${cust.notes || "بدون بيان إضافي"})`,
          debit: cust.amount,
          credit: 0,
          balance: cust.amount,
          documentRef: initRef,
          category: "استلام عهدة",
          expenseAccountId: cust.treasuryAccountId || "1130",
          notes: cust.notes,
          createdAt: new Date().toISOString(),
        });
        existingDocRefs.add(initRef);
      }

      // 2. Custody settled items (credits)
      if (cust.items && cust.items.length > 0) {
        cust.items.forEach((item, iIdx) => {
          const itemRef = item.receiptNo || `إيصال-${cust.id}-${iIdx + 1}`;
          if (!existingDocRefs.has(itemRef)) {
            newRecords.push({
              id: `CLR-SYNC-${cust.id}-ITEM-${iIdx + 1}`,
              date: item.date || cust.dateGiven,
              beneficiaryName: cust.employeeName,
              statement: item.description,
              debit: 0,
              credit: item.amount,
              costCenterId: item.costCenterId,
              documentRef: itemRef,
              category: "تسوية مصروفات",
              expenseAccountId: item.expenseAccountId || "5160",
              notes: `مسواة من عهدة ${cust.code}`,
              createdAt: new Date().toISOString(),
            });
            existingDocRefs.add(itemRef);
          }
        });
      }
    });

    if (newRecords.length > 0) {
      setCustodyClearances((prev) => [...prev, ...newRecords]);
      alert(`تمت مزامنة واستيراد ${newRecords.length} حركة عهد جديدة بنجاح!`);
    } else {
      alert("جميع العهد المسجلة متزامنة بالفعل مع شيت التصفية.");
    }
  };

  const handleAddSiteOrientation = (newOrientation: string) => {
    const trimmed = newOrientation.trim();
    if (!trimmed) return;
    if (siteOrientations.includes(trimmed)) return;
    setSiteOrientations((prev) => [...prev, trimmed]);
  };

  const handleDeleteSiteOrientation = (orientationToDelete: string) => {
    setSiteOrientations((prev) => prev.filter((o) => o !== orientationToDelete));
  };

  const handleAddSiteAdjustment = (adj: Omit<SiteAdjustment, "id" | "createdAt">) => {
    const newAdj: SiteAdjustment = {
      ...adj,
      id: `SITE-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setSiteAdjustments((prev) => [newAdj, ...prev]);
  };

  const handleUpdateSiteAdjustment = (adj: SiteAdjustment) => {
    setSiteAdjustments((prev) =>
      prev.map((item) => (item.id === adj.id ? adj : item))
    );
  };

  const handleDeleteSiteAdjustment = (id: string) => {
    setSiteAdjustments((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveElectricityInvoice = (invoice: ElectricityInvoice) => {
    setElectricityInvoices((prev) => {
      const idx = prev.findIndex((i) => i.id === invoice.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = invoice;
        return next;
      }
      return [invoice, ...prev];
    });
  };

  const handleDeleteElectricityInvoice = (id: string) => {
    setElectricityInvoices((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSavePartner = (partner: Partner) => {
    setPartners((prev) => {
      const idx = prev.findIndex((p) => p.id === partner.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = partner;
        return next;
      }
      return [...prev, partner];
    });
  };

  const handleDeletePartner = (id: string) => {
    setPartners((prev) => prev.filter((p) => p.id !== id));
  };

  // Handlers
  const handleSaveAccount = (account: Account) => {
    setAccounts((prev) => {
      const idx = prev.findIndex((a) => a.id === account.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = account;
        return next;
      }
      return [...prev, account];
    });
  };

  const handleToggleAccountActive = (accountId: string) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, isActive: !a.isActive } : a))
    );
  };

  const handleDeleteAccount = (accountId: string) => {
    setAccounts((prev) => {
      // Collect all child account IDs recursively
      const toDelete = new Set<string>([accountId]);
      let added = true;
      while (added) {
        added = false;
        prev.forEach((acc) => {
          if (acc.parentId && toDelete.has(acc.parentId) && !toDelete.has(acc.id)) {
            toDelete.add(acc.id);
            added = true;
          }
        });
      }
      return prev.filter((a) => !toDelete.has(a.id));
    });
  };

  const handleSaveJournalEntry = (entry: JournalEntry) => {
    const existingEntry = journalEntries.find((e) => e.id === entry.id);

    setJournalEntries((prev) => {
      const exists = prev.some((e) => e.id === entry.id);
      if (exists) {
        return prev.map((e) => (e.id === entry.id ? entry : e));
      }
      return [entry, ...prev];
    });

    // Automatically post/update account balances based on journal entry lines
    setAccounts((prevAccs) => {
      const accDeltas: Record<string, number> = {};

      // If editing an existing entry, reverse old lines first
      if (existingEntry) {
        existingEntry.lines.forEach((l) => {
          if (!l.accountId) return;
          const net = (l.debit || 0) - (l.credit || 0);
          accDeltas[l.accountId] = (accDeltas[l.accountId] || 0) - net;
        });
      }

      // Apply new entry lines
      entry.lines.forEach((l) => {
        if (!l.accountId) return;
        const net = (l.debit || 0) - (l.credit || 0);
        accDeltas[l.accountId] = (accDeltas[l.accountId] || 0) + net;
      });

      return prevAccs.map((acc) => {
        // Post/transfer numbers strictly to sub-accounts (non-header accounts)
        if (acc.isHeader) return acc;

        const delta = accDeltas[acc.id];
        if (delta !== undefined && delta !== 0) {
          const isDebitNormal = acc.type === "ASSET" || acc.type === "EXPENSE";
          return {
            ...acc,
            balance: isDebitNormal ? acc.balance + delta : acc.balance - delta,
          };
        }
        return acc;
      });
    });

    // Automatically sync Partner (Customer / Supplier) Balances for sales and purchases
    setPartners((prevPartners) => {
      const partnerDeltas: Record<string, number> = {};

      const getPartnerForLine = (l: JournalEntryLine) => {
        if (l.partnerId) return prevPartners.find((p) => p.id === l.partnerId);
        if (l.accountId) {
          const byAcc = prevPartners.find((p) => p.accountId === l.accountId);
          if (byAcc) return byAcc;
        }
        if (l.employeeName) {
          const byName = prevPartners.find((p) => p.name.trim() === l.employeeName?.trim());
          if (byName) return byName;
        }
        return undefined;
      };

      // 1) Revert old entry effects on partner balances if editing
      if (existingEntry) {
        existingEntry.lines.forEach((l) => {
          const p = getPartnerForLine(l);
          if (!p) return;
          if (p.type === "CUSTOMER") {
            const net = (l.debit || 0) - (l.credit || 0);
            partnerDeltas[p.id] = (partnerDeltas[p.id] || 0) - net;
          } else if (p.type === "SUPPLIER") {
            const net = (l.credit || 0) - (l.debit || 0);
            partnerDeltas[p.id] = (partnerDeltas[p.id] || 0) - net;
          }
        });
      }

      // 2) Apply new entry effects on partner balances
      entry.lines.forEach((l) => {
        const p = getPartnerForLine(l);
        if (!p) return;
        if (p.type === "CUSTOMER") {
          const net = (l.debit || 0) - (l.credit || 0);
          partnerDeltas[p.id] = (partnerDeltas[p.id] || 0) + net;
        } else if (p.type === "SUPPLIER") {
          const net = (l.credit || 0) - (l.debit || 0);
          partnerDeltas[p.id] = (partnerDeltas[p.id] || 0) + net;
        }
      });

      if (Object.keys(partnerDeltas).length === 0) return prevPartners;

      return prevPartners.map((p) => {
        const delta = partnerDeltas[p.id];
        if (delta !== undefined && delta !== 0) {
          return {
            ...p,
            balance: (p.balance || 0) + delta,
          };
        }
        return p;
      });
    });

    // Automatically sync movements with Bank Vouchers for bank accounts
    setBankVouchers((prevBvs) => {
      // Clean up previous vouchers for this entry ID if editing
      const filtered = prevBvs.filter((bv) => !bv.id.startsWith(`bv-je-${entry.id}`));

      const newBvs: BankVoucher[] = [];
      entry.lines.forEach((line) => {
        const acc = accounts.find((a) => a.id === line.accountId);
        const isBankAcc = acc && (acc.code.startsWith("1113") || acc.code.startsWith("1114") || acc.nameAr.includes("بنك"));
        const amount = (line.debit || 0) > 0 ? line.debit : line.credit || 0;

        if (isBankAcc && amount > 0) {
          const oppLine = entry.lines.find((l) => l.id !== line.id && l.accountId !== line.accountId);
          const lineStatement = line.note
            ? line.note
            : entry.notes
            ? entry.notes
            : entry.reference
            ? `مرجع: ${entry.reference}`
            : `قيد يومية - ${entry.entryNumber}`;

          newBvs.push({
            id: `bv-je-${entry.id}-${line.id}`,
            voucherNumber: `قيد-${entry.entryNumber}`,
            type: line.debit > 0 ? "DEPOSIT" : "WITHDRAWAL",
            date: entry.date,
            amount,
            bankAccountId: line.accountId,
            oppositeAccountId: oppLine?.accountId || "",
            costCenterId: line.costCenterId || "",
            beneficiary: lineStatement,
            notes: lineStatement,
            manualRef: entry.reference || entry.entryNumber,
            checkNumber: line.chequeNumber,
            isReconciled: false,
            createdAt: entry.createdAt || new Date().toISOString(),
          });
        }
      });

      return [...newBvs, ...filtered];
    });

    // Automatically sync Inventory items & movements if journal entry affects inventory (Sales/Purchases/Inventory)
    const oldJeMovements = inventoryMovements.filter((m) => m.journalEntryId === entry.id);

    // Track inventory quantity changes
    const itemQtyDeltas: Record<string, number> = {};

    // 1) Revert old JE movements if editing
    oldJeMovements.forEach((m) => {
      itemQtyDeltas[m.itemId] = (itemQtyDeltas[m.itemId] || 0) + (m.type === "IN" ? -m.quantity : m.quantity);
    });

    // 2) Create new movements from journal entry lines (excluding Tax/VAT lines)
    const newJeMovements: InventoryMovement[] = [];

    entry.lines.forEach((line) => {
      if (!line.accountId) return;
      const acc = accounts.find((a) => a.id === line.accountId);

      // Check if this account or line represents Tax / VAT / ضريبة القيمة المضافة / الضرائب
      const isTaxOrVatAcc =
        (acc &&
          (acc.code.startsWith("212") ||
            acc.code.startsWith("213") ||
            acc.category === "TAX" ||
            acc.nameAr.includes("ضريبة") ||
            acc.nameAr.includes("ضرائب") ||
            acc.nameAr.includes("قيمة مضافة") ||
            acc.nameAr.includes("مصلحة الضرائب"))) ||
        (line.note &&
          (line.note.includes("ضريبة") ||
            line.note.includes("قيمة مضافة") ||
            line.note.toLowerCase().includes("vat") ||
            line.note.toLowerCase().includes("tax")));

      // Exclude VAT and Tax lines completely from inventory movements and stock calculations
      if (isTaxOrVatAcc) {
        return;
      }

      const isSalesAcc =
        acc &&
        (acc.code.startsWith("4") ||
          acc.type === "REVENUE" ||
          acc.category === "OPERATING_REVENUE" ||
          acc.nameAr.includes("مبيعات") ||
          acc.nameAr.includes("إيرادات"));

      const isPurchaseAcc =
        acc &&
        (acc.code.startsWith("5110") ||
          acc.code.startsWith("511") ||
          acc.nameAr.includes("مشتريات") ||
          acc.nameAr.includes("تكلفة مبيعات") ||
          acc.nameAr.includes("تكلفة البضاعة"));

      const isInventoryAcc =
        !!line.inventoryItemId ||
        (acc &&
          (acc.code.startsWith("114") ||
            acc.code.startsWith("1115") ||
            acc.code.startsWith("115") ||
            acc.nameAr.includes("مخزون") ||
            acc.nameAr.includes("بضاعة")));

      // We only target inventory if the line explicitly has inventoryItemId or the account is an inventory/sales/purchases account
      if (!line.inventoryItemId && !isSalesAcc && !isPurchaseAcc && !isInventoryAcc) {
        return;
      }

      const targetItem =
        (line.inventoryItemId && inventoryItems.find((inv) => inv.id === line.inventoryItemId)) ||
        (isInventoryAcc || isSalesAcc || isPurchaseAcc
          ? inventoryItems.find((inv) => line.note?.includes(inv.sku) || line.note?.includes(inv.name))
          : undefined);

      if (targetItem) {
        const itemToUse = targetItem;
        const amount = (line.debit || 0) > 0 ? line.debit : line.credit || 0;

        // Movement direction:
        // Sales account or Credit on inventory -> OUT (صرف مبيعات)
        // Purchases account or Debit on inventory -> IN (وارد مشتريات)
        let isAdd = true;
        if (isSalesAcc) {
          isAdd = false; // Selling items decreases stock
        } else if (isPurchaseAcc) {
          isAdd = (line.debit || 0) > 0;
        } else if (line.credit > 0 && !line.debit) {
          isAdd = false;
        } else if (line.debit > 0) {
          isAdd = true;
        }

        const qty =
          line.inventoryQuantity ||
          (itemToUse.unitCost && amount > 0
            ? Math.round((amount / itemToUse.unitCost) * 100) / 100
            : 1);

        if (qty > 0) {
          itemQtyDeltas[itemToUse.id] = (itemQtyDeltas[itemToUse.id] || 0) + (isAdd ? qty : -qty);

          const movRef = entry.reference ? `قيد-${entry.entryNumber} (${entry.reference})` : `قيد-${entry.entryNumber}`;
          const movNote =
            line.note ||
            entry.notes ||
            (isAdd
              ? `توريد وإضافة مخزنية بموجب قيد مشتريات/يومية رقم (${entry.entryNumber})`
              : `صرف وتخفيض مخزني بموجب قيد مبيعات/يومية رقم (${entry.entryNumber})`);

          newJeMovements.push({
            id: `mov-je-${entry.id}-${line.id}`,
            journalEntryId: entry.id,
            itemId: itemToUse.id,
            itemSku: itemToUse.sku,
            itemName: itemToUse.name,
            type: isAdd ? "IN" : "OUT",
            quantity: qty,
            unitCost: itemToUse.unitCost,
            totalValue: qty * itemToUse.unitCost,
            unit: itemToUse.unit,
            date: entry.date,
            reference: movRef,
            notes: movNote,
            createdAt: entry.createdAt || new Date().toISOString(),
          });
        }
      }
    });

    // Apply inventory item quantity updates
    if (Object.keys(itemQtyDeltas).length > 0) {
      setInventoryItems((prevItems) =>
        prevItems.map((item) => {
          const delta = itemQtyDeltas[item.id];
          if (delta !== undefined && delta !== 0) {
            const newQty = Math.max(0, item.quantity + delta);
            return {
              ...item,
              quantity: newQty,
              totalValue: newQty * item.unitCost,
            };
          }
          return item;
        })
      );
    }

    // Update inventory movements state
    setInventoryMovements((prevMovs) => {
      const filtered = prevMovs.filter((m) => m.journalEntryId !== entry.id);
      return [...newJeMovements, ...filtered];
    });

    // Auto Sync Treasury Vouchers if line affects Treasury Account
    entry.lines.forEach((line) => {
      if (!line.accountId) return;
      const acc = accounts.find((a) => a.id === line.accountId);

      const isTreasuryAcc = acc && (acc.code === "1111" || acc.code.startsWith("1111") || acc.nameAr.includes("خزينة") || acc.nameAr.includes("صندوق") || acc.nameAr.includes("نقدية بالخزينة"));
      if (isTreasuryAcc) {
        const isDebit = (line.debit || 0) > 0;
        const isCredit = (line.credit || 0) > 0;
        if (isDebit || isCredit) {
          const oppositeLine = entry.lines.find((l) => l.id !== line.id && l.accountId !== line.accountId);
          const newVoucher: TreasuryVoucher = {
            id: `TV-JE-${entry.id}-${line.id}`,
            voucherNumber: isDebit ? `قبض-قيد-${entry.entryNumber}` : `صرف-قيد-${entry.entryNumber}`,
            voucherType: isDebit ? "RECEIPT" : "PAYMENT",
            date: entry.date,
            amount: isDebit ? line.debit : line.credit,
            treasuryAccountId: line.accountId,
            oppositeAccountId: oppositeLine?.accountId || "",
            costCenterId: line.costCenterId,
            beneficiary: line.employeeName || line.note || entry.notes || "معاملة قيد يومية",
            notes: line.note || entry.notes || `مُرحل تلقائياً من قيد يومية رقم (${entry.entryNumber})`,
            manualRef: entry.reference || entry.entryNumber,
            createdAt: new Date().toISOString(),
          };

          setTreasuryVouchers((prev) => {
            if (prev.some((v) => v.id === newVoucher.id)) return prev;
            return [newVoucher, ...prev];
          });
        }
      }
    });

    // Clean up any previously auto-posted JE custodies/advances for this entry if they exist
    setCustodies((prev) => prev.filter((c) => !c.id.startsWith(`CUST-JE-${entry.id}`)));
    setAdvances((prev) => prev.filter((a) => !a.id.startsWith(`ADV-JE-${entry.id}`)));
  };

  const handleDeleteJournalEntry = (entryId: string) => {
    const targetEntry = journalEntries.find((e) => e.id === entryId);
    if (targetEntry) {
      // Reverse posted balances for deleted entry (sub-accounts and parent accounts)
      setAccounts((prevAccs) => {
        const accDeltas: Record<string, number> = {};

        targetEntry.lines.forEach((l) => {
          if (!l.accountId) return;
          const net = (l.debit || 0) - (l.credit || 0);
          accDeltas[l.accountId] = (accDeltas[l.accountId] || 0) + net;
        });

        return prevAccs.map((acc) => {
          // Reverse numbers strictly on sub-accounts (non-header accounts)
          if (acc.isHeader) return acc;

          const delta = accDeltas[acc.id];
          if (delta !== undefined && delta !== 0) {
            const isDebitNormal = acc.type === "ASSET" || acc.type === "EXPENSE";
            return {
              ...acc,
              balance: isDebitNormal ? acc.balance - delta : acc.balance + delta,
            };
          }
          return acc;
        });
      });

      // Reverse partner balance effects for deleted entry
      setPartners((prevPartners) => {
        const partnerDeltas: Record<string, number> = {};
        targetEntry.lines.forEach((l) => {
          const p =
            (l.partnerId && prevPartners.find((part) => part.id === l.partnerId)) ||
            (l.accountId && prevPartners.find((part) => part.accountId === l.accountId)) ||
            (l.employeeName && prevPartners.find((part) => part.name.trim() === l.employeeName?.trim()));

          if (!p) return;
          if (p.type === "CUSTOMER") {
            const net = (l.debit || 0) - (l.credit || 0);
            partnerDeltas[p.id] = (partnerDeltas[p.id] || 0) - net;
          } else if (p.type === "SUPPLIER") {
            const net = (l.credit || 0) - (l.debit || 0);
            partnerDeltas[p.id] = (partnerDeltas[p.id] || 0) - net;
          }
        });

        if (Object.keys(partnerDeltas).length === 0) return prevPartners;

        return prevPartners.map((p) => {
          const delta = partnerDeltas[p.id];
          if (delta !== undefined && delta !== 0) {
            return {
              ...p,
              balance: (p.balance || 0) + delta,
            };
          }
          return p;
        });
      });

      // Remove bank vouchers, treasury vouchers, custodies, and advances created from this entry
      setBankVouchers((prev) =>
        prev.filter((bv) => !bv.id.startsWith(`bv-je-${entryId}`) && bv.voucherNumber !== `قيد-${targetEntry.entryNumber}`)
      );
      setTreasuryVouchers((prev) =>
        prev.filter((tv) => !tv.id.startsWith(`TV-JE-${entryId}`) && tv.manualRef !== targetEntry.entryNumber)
      );
      setCustodies((prev) => prev.filter((c) => !c.id.startsWith(`CUST-JE-${entryId}`)));
      setAdvances((prev) => prev.filter((a) => !a.id.startsWith(`ADV-JE-${entryId}`)));

      // Reverse any inventory movements associated with this deleted entry
      const deletedJeMovs = inventoryMovements.filter((m) => m.journalEntryId === entryId);
      if (deletedJeMovs.length > 0) {
        setInventoryItems((prevItems) =>
          prevItems.map((item) => {
            const itemMovs = deletedJeMovs.filter((m) => m.itemId === item.id);
            if (itemMovs.length === 0) return item;
            let qtyDelta = 0;
            itemMovs.forEach((m) => {
              qtyDelta += m.type === "IN" ? -m.quantity : m.quantity;
            });
            const newQty = Math.max(0, item.quantity + qtyDelta);
            return {
              ...item,
              quantity: newQty,
              totalValue: newQty * item.unitCost,
            };
          })
        );
        setInventoryMovements((prev) => prev.filter((m) => m.journalEntryId !== entryId));
      }
    }

    setJournalEntries((prev) => prev.filter((e) => e.id !== entryId));
  };

  const handleSaveInventoryMovement = (movement: InventoryMovement) => {
    setInventoryMovements((prev) => [movement, ...prev]);

    setInventoryItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === movement.itemId) {
          const newQty = movement.type === "IN" ? item.quantity + movement.quantity : Math.max(0, item.quantity - movement.quantity);
          return {
            ...item,
            quantity: newQty,
            totalValue: newQty * item.unitCost,
          };
        }
        return item;
      })
    );
  };

  const handleDeleteInventoryMovement = (movementId: string) => {
    const mov = inventoryMovements.find((m) => m.id === movementId);
    if (mov) {
      setInventoryMovements((prev) => prev.filter((m) => m.id !== movementId));
      setInventoryItems((prevItems) =>
        prevItems.map((item) => {
          if (item.id === mov.itemId) {
            const newQty = mov.type === "IN" ? Math.max(0, item.quantity - mov.quantity) : item.quantity + mov.quantity;
            return {
              ...item,
              quantity: newQty,
              totalValue: newQty * item.unitCost,
            };
          }
          return item;
        })
      );
    }
  };

  const handleSaveTreasuryVoucher = (voucher: TreasuryVoucher) => {
    setTreasuryVouchers((prev) => [voucher, ...prev]);

    // Update treasury and opposite account balance
    setAccounts((prevAccs) =>
      prevAccs.map((acc) => {
        if (acc.id === voucher.treasuryAccountId) {
          return {
            ...acc,
            balance: voucher.voucherType === "RECEIPT" ? acc.balance + voucher.amount : acc.balance - voucher.amount,
          };
        }
        if (acc.id === voucher.oppositeAccountId) {
          return {
            ...acc,
            balance: voucher.voucherType === "RECEIPT" ? acc.balance - voucher.amount : acc.balance + voucher.amount,
          };
        }
        return acc;
      })
    );
  };

  const handleDeleteTreasuryVoucher = (voucherId: string) => {
    setTreasuryVouchers((prev) => prev.filter((v) => v.id !== voucherId));
  };

  const handleSaveBankVoucher = (voucher: BankVoucher) => {
    const existing = bankVouchers.find((v) => v.id === voucher.id);

    setBankVouchers((prev) => {
      const idx = prev.findIndex((v) => v.id === voucher.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = voucher;
        return copy;
      }
      return [voucher, ...prev];
    });

    // Recalculate account balance deltas
    setAccounts((prevAccs) => {
      const accDeltas: Record<string, number> = {};

      // 1) Revert old voucher if editing
      if (existing) {
        const isOldInc = existing.type === "DEPOSIT" || existing.type === "BANK_INTEREST";
        accDeltas[existing.bankAccountId] = (accDeltas[existing.bankAccountId] || 0) + (isOldInc ? -existing.amount : existing.amount);
        if (existing.type === "TRANSFER" && existing.toBankAccountId) {
          accDeltas[existing.toBankAccountId] = (accDeltas[existing.toBankAccountId] || 0) - existing.amount;
        }
        if (existing.oppositeAccountId) {
          accDeltas[existing.oppositeAccountId] = (accDeltas[existing.oppositeAccountId] || 0) + (isOldInc ? existing.amount : -existing.amount);
        }
      }

      // 2) Apply new/updated voucher
      const isNewInc = voucher.type === "DEPOSIT" || voucher.type === "BANK_INTEREST";
      accDeltas[voucher.bankAccountId] = (accDeltas[voucher.bankAccountId] || 0) + (isNewInc ? voucher.amount : -voucher.amount);
      if (voucher.type === "TRANSFER" && voucher.toBankAccountId) {
        accDeltas[voucher.toBankAccountId] = (accDeltas[voucher.toBankAccountId] || 0) + voucher.amount;
      }
      if (voucher.oppositeAccountId) {
        accDeltas[voucher.oppositeAccountId] = (accDeltas[voucher.oppositeAccountId] || 0) + (isNewInc ? -voucher.amount : voucher.amount);
      }

      return prevAccs.map((acc) => {
        const delta = accDeltas[acc.id];
        if (delta !== undefined && delta !== 0) {
          return {
            ...acc,
            balance: acc.balance + delta,
          };
        }
        return acc;
      });
    });
  };

  const handleDeleteBankVoucher = (voucherId: string) => {
    const target = bankVouchers.find((v) => v.id === voucherId);
    if (target) {
      setAccounts((prevAccs) => {
        const isInc = target.type === "DEPOSIT" || target.type === "BANK_INTEREST";
        return prevAccs.map((acc) => {
          if (acc.id === target.bankAccountId) {
            return {
              ...acc,
              balance: isInc ? acc.balance - target.amount : acc.balance + target.amount,
            };
          }
          if (target.type === "TRANSFER" && acc.id === target.toBankAccountId) {
            return {
              ...acc,
              balance: acc.balance - target.amount,
            };
          }
          if (target.oppositeAccountId && acc.id === target.oppositeAccountId) {
            return {
              ...acc,
              balance: isInc ? acc.balance + target.amount : acc.balance - target.amount,
            };
          }
          return acc;
        });
      });
    }
    setBankVouchers((prev) => prev.filter((v) => v.id !== voucherId));
  };

  const handleToggleReconcileVoucher = (voucherId: string) => {
    setBankVouchers((prev) =>
      prev.map((v) => (v.id === voucherId ? { ...v, isReconciled: !v.isReconciled } : v))
    );
  };

  const handleSaveCustody = (custody: Custody) => {
    setCustodies((prev) => [custody, ...prev]);
  };

  const handleDeleteCustody = (custodyId: string) => {
    setCustodies((prev) => prev.filter((c) => c.id !== custodyId));
  };

  const handleSaveAdvance = (advance: Advance) => {
    setAdvances((prev) => [advance, ...prev]);
  };

  const handleDeleteAdvance = (advanceId: string) => {
    setAdvances((prev) => prev.filter((a) => a.id !== advanceId));
  };

  const handleSettleCustody = (custodyId: string, item: any) => {
    setCustodies((prev) =>
      prev.map((c) => {
        if (c.id === custodyId) {
          const newSettled = c.settledAmount + item.amount;
          return {
            ...c,
            settledAmount: newSettled,
            status: newSettled >= c.amount ? "SETTLED" : "PARTIAL",
            items: [...c.items, item],
          };
        }
        return c;
      })
    );
  };

  const handleSaveCostCenter = (center: CostCenter) => {
    setCostCenters((prev) => [...prev, center]);
  };

  const handleDeleteCostCenter = (centerId: string) => {
    setCostCenters((prev) => prev.filter((c) => c.id !== centerId));
  };

  const handleSaveEmployee = (emp: Employee) => {
    setEmployees((prev) => {
      const idx = prev.findIndex((e) => e.id === emp.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = emp;
        return next;
      }
      return [...prev, emp];
    });
  };

  const handleDeleteEmployee = (empId: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== empId));
  };

  const handleProcessPayroll = (empList: Employee[] = employees, monthNum: string = "08") => {
    const list = empList && empList.length > 0 ? empList : employees;
    const totalBasic = list.reduce((sum, e) => sum + e.basicSalary, 0);
    const totalAllowances = list.reduce((sum, e) => sum + e.allowances + e.incentives, 0);
    const totalInsurance = list.reduce((sum, e) => sum + e.socialInsurance, 0);
    const totalDeductions = list.reduce((sum, e) => sum + e.deductions + e.advances, 0);
    const totalNet = totalBasic + totalAllowances - totalInsurance - totalDeductions;

    // Find accounts for auto journal entry
    const expenseAcc = accounts.find((a) => a.code === "511" || a.code.startsWith("51") || a.nameAr.includes("مرتبات") || a.type === "EXPENSE") || accounts[0];
    const insuranceAcc = accounts.find((a) => a.code === "214" || a.nameAr.includes("تأمين") || a.nameAr.includes("اجتماعي")) || accounts[1] || accounts[0];
    const advancesAcc = accounts.find((a) => a.code === "1130" || a.nameAr.includes("سلف") || a.nameAr.includes("خصم")) || accounts[2] || accounts[0];
    const netPayableAcc = accounts.find((a) => a.code === "2120" || a.nameAr.includes("مستحق") || a.nameAr.includes("رواتب")) || accounts[3] || accounts[0];

    const lines: Array<{
      id: string;
      accountId: string;
      debit: number;
      credit: number;
      note: string;
    }> = [
      {
        id: "l1",
        accountId: expenseAcc.id,
        debit: totalBasic + totalAllowances,
        credit: 0,
        note: `إجمالي الأجور والبدلات المستحقة لشهر ${monthNum}`,
      },
    ];

    if (totalInsurance > 0) {
      lines.push({
        id: "l2",
        accountId: insuranceAcc.id,
        debit: 0,
        credit: totalInsurance,
        note: `استقطاعات التأمينات الاجتماعية لشهر ${monthNum}`,
      });
    }

    if (totalDeductions > 0) {
      lines.push({
        id: "l3",
        accountId: advancesAcc.id,
        debit: 0,
        credit: totalDeductions,
        note: `استقطاعات خصومات وسلف الموظفين لشهر ${monthNum}`,
      });
    }

    lines.push({
      id: "l4",
      accountId: netPayableAcc.id,
      debit: 0,
      credit: totalNet,
      note: `صافي المرتبات المستحقة للصرف لشهر ${monthNum}`,
    });

    const entryNum = `مرتبات-${monthNum}-${Math.floor(100 + Math.random() * 900)}`;

    const journalEntry: JournalEntry = {
      id: "je-payroll-" + Date.now(),
      entryNumber: entryNum,
      date: new Date().toISOString().split("T")[0],
      isPosted: true,
      notes: `اعتماد وتنزيل مسير رواتب شهر ${monthNum} لعدد ${list.length} موظفين - إجمالي صافي مستحق: ${totalNet.toLocaleString()} ${companySettings.currency}`,
      lines,
      createdAt: new Date().toISOString(),
    };

    handleSaveJournalEntry(journalEntry);

    alert(`تم اعتماد وتنزيل المرتبات لشهر (${monthNum}) وإنشاء القيد اليومية رقم (${entryNum}) بقيمة صافي مستحق ${totalNet.toLocaleString()} ${companySettings.currency} وترحيل الحسابات تلقائياً.`);
  };

  const handleSaveFixedAsset = (asset: FixedAsset) => {
    setFixedAssets((prev) => [...prev, asset]);
  };

  const handleDeleteFixedAsset = (assetId: string) => {
    setFixedAssets((prev) => prev.filter((a) => a.id !== assetId));
  };

  const handleCalculateDepreciation = (assetId: string) => {
    setFixedAssets((prev) =>
      prev.map((a) => {
        if (a.id === assetId) {
          const depAnnual = (a.cost * a.depreciationRate) / 100;
          const newAccum = a.accumulatedDepreciation + depAnnual;
          const newBook = Math.max(0, a.cost - newAccum);
          return {
            ...a,
            accumulatedDepreciation: newAccum,
            bookValue: newBook,
          };
        }
        return a;
      })
    );
  };

  const handleSaveInventoryItem = (item: InventoryItem) => {
    setInventoryItems((prev) => [...prev, item]);
  };

  const handleDeleteInventoryItem = (itemId: string) => {
    setInventoryItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleSaveUser = async (user: User) => {
    const updatedUser: User = {
      ...user,
      updatedAt: new Date().toISOString(),
    };

    const isExisting = users.some((u) => u.id === updatedUser.id);

    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === updatedUser.id);
      const next = idx >= 0 ? prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)) : [...prev, updatedUser];
      ERPStorage.saveUsers(next);
      notifyUsersUpdated(next);
      return next;
    });

    // Immediate reactive enforcement for active session
    if (currentUser && (currentUser.id === updatedUser.id || currentUser.username.toLowerCase() === updatedUser.username.toLowerCase())) {
      if (updatedUser.status === "INACTIVE" || updatedUser.isActive === false) {
        setDeactivatedTargetUser(updatedUser);
        setIsLoggedIn(false);
        setCurrentUser(null);
        ERPStorage.saveActiveUserId(null);
      } else {
        setCurrentUser(updatedUser);
        const allowed = updatedUser.allowedTabs || [];
        if (
          allowed.length > 0 &&
          !allowed.includes("*") &&
          !allowed.includes(activeTab as any) &&
          updatedUser.role !== "SUPER_ADMIN" &&
          updatedUser.role !== "ADMIN"
        ) {
          const first = (allowed[0] as NavTab) || "dashboard";
          if (first) setActiveTab(first);
        }
      }
    }

    // Push to central backend server database (which broadcasts USER_PERMISSIONS_UPDATED via WebSocket)
    try {
      const token = localStorage.getItem("erp_user_token") || currentUser?.token || "";
      const endpoint = isExisting ? `/api/users/${updatedUser.id}` : "/api/users";
      const method = isExisting ? "PUT" : "POST";
      await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedUser),
      });
    } catch (e) {
      console.warn("Backend user sync warning:", e);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setUsers((prev) => {
      const next = prev.filter((u) => u.id !== userId);
      ERPStorage.saveUsers(next);
      notifyUsersUpdated(next);
      return next;
    });

    if (currentUser && currentUser.id === userId) {
      setIsLoggedIn(false);
      setCurrentUser(null);
      ERPStorage.saveActiveUserId(null);
    }

    // Push deletion to central backend server
    try {
      const token = localStorage.getItem("erp_user_token") || currentUser?.token || "";
      await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (e) {
      console.warn("Backend user deletion sync warning:", e);
    }
  };

  // Generate customized WhatsApp share report based on the active screen / tab
  const handleOpenCurrentTabWhatsAppShare = (customData?: WhatsAppShareData) => {
    if (customData) {
      setWhatsAppShareData(customData);
      return;
    }

    const cur = companySettings.currency;
    const nowStr = new Date().toISOString().split("T")[0];

    let shareData: WhatsAppShareData;

    switch (activeTab) {
      case "custody_clearance": {
        const totalDebit = custodyClearances.reduce((s, r) => s + (r.debit || 0), 0);
        const totalCredit = custodyClearances.reduce((s, r) => s + (r.credit || 0), 0);
        const netBalance = totalDebit - totalCredit;

        const tableRows = custodyClearances.slice(0, 15).map((r) => [
          r.date,
          r.beneficiaryName,
          r.statement,
          r.debit > 0 ? `+${r.debit.toLocaleString()}` : `-${r.credit.toLocaleString()}`,
          r.documentRef || "-",
        ]);

        shareData = {
          title: "كشف وتصفية العهد المالية والمصروفات الميدانية",
          subtitle: `تقرير حركة العهد المنصرفة والمسواة بالفواتير (${custodyClearances.length} حركة)`,
          companyName: companySettings.companyName,
          date: nowStr,
          items: [
            { label: "إجمالي العهد المنصرفة (مدين)", value: `${totalDebit.toLocaleString()} ${cur}` },
            { label: "إجمالي المصروفات والفواتير (دائن)", value: `${totalCredit.toLocaleString()} ${cur}` },
            { label: "صافي المتبقي طرف العهدة", value: `${netBalance.toLocaleString()} ${cur}` },
          ],
          summaryTotals: [
            { label: "صافي رصيد العهد المتبقي", value: `${netBalance.toLocaleString()} ${cur}`, isBold: true },
          ],
          tableHeaders: ["التاريخ", "اسم المصرف له", "البيان", "المبلغ", "رقم السند/الفاتورة"],
          tableRows,
        };
        break;
      }

      case "partners": {
        const totalCustomers = partners
          .filter((p) => p.type === "CUSTOMER")
          .reduce((s, p) => s + p.balance, 0);
        const totalSuppliers = partners
          .filter((p) => p.type === "SUPPLIER")
          .reduce((s, p) => s + p.balance, 0);

        const tableRows = partners.slice(0, 15).map((p) => [
          p.code,
          p.name,
          p.type === "CUSTOMER" ? "عميل" : "مورد",
          `${p.balance.toLocaleString()} ${cur}`,
          p.phone || "-",
        ]);

        shareData = {
          title: "كشف أرصدة العملاء والموردين",
          subtitle: `إجمالي عدد الجهات المسجلة: ${partners.length}`,
          companyName: companySettings.companyName,
          date: nowStr,
          items: [
            { label: "مستحقات طرف العملاء (مدين)", value: `${totalCustomers.toLocaleString()} ${cur}` },
            { label: "مستحقات للموردين (دائن)", value: `${totalSuppliers.toLocaleString()} ${cur}` },
          ],
          summaryTotals: [
            { label: "صافي رصيد الذمم والشركاء", value: `${(totalCustomers - totalSuppliers).toLocaleString()} ${cur}`, isBold: true },
          ],
          tableHeaders: ["الكود", "اسم الجهة", "النوع", "الرصيد الحسابي", "الهاتف"],
          tableRows,
        };
        break;
      }

      case "accounts": {
        const totalDebitBal = accounts.reduce((s, a) => s + (a.balance >= 0 ? a.balance : 0), 0);
        const totalCreditBal = accounts.reduce((s, a) => s + (a.balance < 0 ? Math.abs(a.balance) : 0), 0);

        shareData = {
          title: "دليل الحسابات والأرصدة الختامية",
          subtitle: `شجرة الحسابات المالية (${accounts.length} حساب)`,
          companyName: companySettings.companyName,
          date: nowStr,
          items: [
            { label: "عدد الحسابات المعتمدة", value: accounts.length },
            { label: "إجمالي الأرصدة المدينة", value: `${totalDebitBal.toLocaleString()} ${cur}` },
            { label: "إجمالي الأرصدة الدائنة", value: `${totalCreditBal.toLocaleString()} ${cur}` },
          ],
          tableHeaders: ["الكود", "اسم الحساب", "النوع", "الرصيد الحالي"],
          tableRows: accounts.slice(0, 15).map((a) => [a.code, a.nameAr, a.type, `${a.balance.toLocaleString()} ${cur}`]),
        };
        break;
      }

      case "journal": {
        shareData = {
          title: "سجل قيود اليومية العامة",
          subtitle: `إجمالي عدد القيود: ${journalEntries.length}`,
          companyName: companySettings.companyName,
          date: nowStr,
          items: [
            { label: "عدد القيود المسجلة", value: journalEntries.length },
            { label: "حالة الترحيل", value: "مرحلة ومطابقة" },
          ],
          tableHeaders: ["رقم القيد", "التاريخ", "البيان والشرح", "الحالة"],
          tableRows: journalEntries.slice(0, 12).map((j) => [j.entryNumber, j.date, j.notes || "-", j.isPosted ? "مرحل" : "مسودة"]),
        };
        break;
      }

      default: {
        const treasuryBal = treasuryVouchers.reduce((s, v) => s + (v.type === "RECEIPT" ? v.amount : -v.amount), 0);
        const bankBal = bankVouchers.reduce((s, v) => s + (v.type === "DEPOSIT" ? v.amount : -v.amount), 0);

        shareData = {
          title: `تقرير ${getTabTitle(activeTab)}`,
          subtitle: `السنة المالية: ${companySettings.financialYear}`,
          companyName: companySettings.companyName,
          date: nowStr,
          items: [
            { label: "رصيد الخزينة الحالي", value: `${treasuryBal.toLocaleString()} ${cur}` },
            { label: "رصيد البنوك الحالي", value: `${bankBal.toLocaleString()} ${cur}` },
            { label: "إجمالي السيولة النقدية المتاحة", value: `${(treasuryBal + bankBal).toLocaleString()} ${cur}` },
          ],
          notes: "تم استخراج هذا التقرير مباشرة من نظام المحاسب المالي المعتمد.",
        };
      }
    }

    setWhatsAppShareData(shareData);
  };

  const handleResetData = () => {
    if (window.confirm("هل أنت تأكد من إعادة ضبط جميع البيانات للقيم النموذجية الافتراضية؟")) {
      ERPStorage.resetToDefault();
    }
  };

  // Request AI Financial Analysis
  const handleRequestAiAnalysis = async () => {
    setIsLoadingAnalysis(true);
    try {
      const response = await fetch("/api/financial-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accounts,
          journalEntries,
          companySettings,
        }),
      });

      if (!response.ok) {
        throw new Error("فشل توليد التحليل المالي من الخادم");
      }

      const data = await response.json();
      setAnalysisResult(data);
    } catch (err: any) {
      console.error(err);
      alert("حدث خطأ أثناء الاتصال بالذكاء الاصطناعي: " + err.message);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  // Tab Title helper
  const getTabTitle = (tab: string): string => {
    switch (tab) {
      case "dashboard":
        return t("dashboard", "لوحة التحكم الرئيسية");
      case "accounts":
        return t("accounts", "دليل الحسابات التفصيلي");
      case "journal":
        return t("journal", "قيود اليومية العامة");
      case "general_ledger":
        return t("general_ledger", "دفتر الأستاذ العام");
      case "treasury":
        return t("treasury", "حركة الخزينة والعهد والسلف");
      case "custody_clearance":
        return t("custody_clearance", "تصفية العهد الميدانية");
      case "banks":
        return t("banks", "حسابات البنوك والتسويات");
      case "combined":
        return t("combined", "الشيت المجمع للنقدية والبنك");
      case "cost_centers":
        return t("cost_centers", "مراكز التكلفة والمشاريع");
      case "site_adjustments":
        return t("site_adjustments", "تسويات الموقع والصبات");
      case "trial_balance":
        return t("trial_balance", "ميزان المراجعة بالأرصدة");
      case "financial_statements":
        return t("financial_statements", "القوائم المالية والضرائب");
      case "expenses":
        return t("expenses", "شيت المصروفات التفصيلي");
      case "electricity_invoices":
        return t("electricity_invoices", "فواتير الكهرباء والمرافق");
      case "inventory":
        return t("inventory", "المخزون وحركة المستودعات");
      case "fixed_assets":
        return t("fixed_assets", "الأصول الثابتة والإهلاك");
      case "hr":
        return t("hr", "المرتبات والأجور والموظفين");
      case "partners":
        return t("partners", "سجل الموردين والعملاء");
      case "financial_analysis":
        return t("financial_analysis", "التحليل المالي الذكي");
      case "users":
        return t("users", "إدارة المستخدمين والصلاحيات");
      case "settings":
        return t("settings", "إعدادات الشركة والسنة المالية");
      default:
        return t("appName", "النظام المحاسبي");
    }
  };

  return (
    <AuthProvider user={currentUser}>
      <div
        className={`min-h-screen bg-[#0A0C10] text-[#E2E8F0] flex flex-col font-sans selection:bg-blue-500/30 ${
          isRTL ? "dir-rtl text-right" : "dir-ltr text-left"
        }`}
        dir={isRTL ? "rtl" : "ltr"}
      >
      {/* Top Header */}
      <Header
        companySettings={companySettings}
        currentUser={currentUser}
        users={users}
        systemLockState={systemLockState}
        onToggleSystemLock={handleToggleSystemLock}
        onSwitchUser={handleRequestSwitchUser}
        onLogout={() => {
          // Keep current admin active
        }}
        onOpenShareModal={() => setShowShareModal(true)}
        onOpenWhatsAppShare={() => handleOpenCurrentTabWhatsAppShare()}
        filterParams={filterParams}
        onFilterChange={setFilterParams}
        onResetData={handleResetData}
        activeTabTitle={getTabTitle(activeTab)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab as NavTab}
          onTabChange={setActiveTab}
          currentUser={currentUser}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0A0C10]">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === "dashboard" && (
              <DashboardView
                accounts={accounts}
                journalEntries={journalEntries}
                treasuryVouchers={treasuryVouchers}
                bankVouchers={bankVouchers}
                costCenters={costCenters}
                advances={advances}
                inventoryItems={inventoryItems}
                fixedAssets={fixedAssets}
                companySettings={companySettings}
                users={users}
                currentUser={currentUser}
                onNavigate={setActiveTab}
                onNavigateTab={setActiveTab}
                onOpenQuickJournal={() => setActiveTab("journal")}
                onOpenQuickVoucher={() => setActiveTab("treasury")}
                onOpenShareModal={() => setShowShareModal(true)}
                onSwitchUserRequest={handleRequestSwitchUser}
                onSaveUser={handleSaveUser}
                onSaveJournalEntry={handleSaveJournalEntry}
                onSaveInventoryItem={handleSaveInventoryItem}
                onSaveAccount={handleSaveAccount}
              />
            )}

            {activeTab === "accounts" && (
              <AccountsView
                accounts={accounts}
                journalEntries={journalEntries}
                companySettings={companySettings}
                filterParams={filterParams}
                onSaveAccount={handleSaveAccount}
                onDeleteAccount={handleDeleteAccount}
                onToggleAccountActive={handleToggleAccountActive}
              />
            )}

            {activeTab === "journal" && (
              <JournalEntriesView
                accounts={accounts}
                journalEntries={journalEntries}
                costCenters={costCenters}
                inventoryItems={inventoryItems}
                partners={partners}
                companySettings={companySettings}
                filterParams={filterParams}
                onSaveJournalEntry={handleSaveJournalEntry}
                onDeleteJournalEntry={handleDeleteJournalEntry}
              />
            )}

            {activeTab === "general_ledger" && (
              <GeneralLedgerView
                accounts={accounts}
                journalEntries={journalEntries}
                costCenters={costCenters}
                companySettings={companySettings}
                filterParams={filterParams}
              />
            )}

            {activeTab === "treasury" && (
              <TreasuryView
                accounts={accounts}
                treasuryVouchers={treasuryVouchers}
                custodies={custodies}
                advances={advances}
                costCenters={costCenters}
                companySettings={companySettings}
                filterParams={filterParams}
                onSaveTreasuryVoucher={handleSaveTreasuryVoucher}
                onSaveCustody={handleSaveCustody}
                onSaveAdvance={handleSaveAdvance}
                onSettleCustody={handleSettleCustody}
                onSaveJournalEntry={handleSaveJournalEntry}
                onDeleteTreasuryVoucher={handleDeleteTreasuryVoucher}
                onDeleteCustody={handleDeleteCustody}
                onDeleteAdvance={handleDeleteAdvance}
              />
            )}

            {activeTab === "custody_clearance" && (
              <CustodyClearanceView
                records={custodyClearances}
                costCenters={costCenters}
                accounts={accounts}
                employees={employees}
                custodies={custodies}
                companySettings={companySettings}
                filterParams={filterParams}
                onAddRecord={handleAddCustodyClearance}
                onUpdateRecord={handleUpdateCustodyClearance}
                onDeleteRecord={handleDeleteCustodyClearance}
                onSyncFromCustodies={handleSyncCustodiesToClearance}
              />
            )}

            {activeTab === "banks" && (
              <BanksView
                accounts={accounts}
                bankVouchers={bankVouchers}
                companySettings={companySettings}
                filterParams={filterParams}
                onSaveBankVoucher={handleSaveBankVoucher}
                onToggleReconcileVoucher={handleToggleReconcileVoucher}
                onDeleteBankVoucher={handleDeleteBankVoucher}
                onSaveAccount={handleSaveAccount}
              />
            )}

            {activeTab === "cost_centers" && (
              <CostCentersView
                costCenters={costCenters}
                journalEntries={journalEntries}
                treasuryVouchers={treasuryVouchers}
                bankVouchers={bankVouchers}
                companySettings={companySettings}
                filterParams={filterParams}
                onSaveCostCenter={handleSaveCostCenter}
                onDeleteCostCenter={handleDeleteCostCenter}
              />
            )}

            {activeTab === "site_adjustments" && (
              <SiteAdjustmentsView
                siteAdjustments={siteAdjustments}
                siteOrientations={siteOrientations}
                onAddAdjustment={handleAddSiteAdjustment}
                onUpdateAdjustment={handleUpdateSiteAdjustment}
                onDeleteAdjustment={handleDeleteSiteAdjustment}
                onAddOrientation={handleAddSiteOrientation}
                onDeleteOrientation={handleDeleteSiteOrientation}
                costCenters={costCenters}
                companySettings={companySettings}
                filterParams={filterParams}
              />
            )}

            {activeTab === "combined" && (
              <CombinedSheetView
                accounts={accounts}
                journalEntries={journalEntries}
                treasuryVouchers={treasuryVouchers}
                bankVouchers={bankVouchers}
                companySettings={companySettings}
                filterParams={filterParams}
              />
            )}

            {activeTab === "expenses" && (
              <ExpensesSheetView
                accounts={accounts}
                journalEntries={journalEntries}
                treasuryVouchers={treasuryVouchers}
                costCenters={costCenters}
                companySettings={companySettings}
                filterParams={filterParams}
                onDeleteTreasuryVoucher={handleDeleteTreasuryVoucher}
                onDeleteJournalEntry={handleDeleteJournalEntry}
              />
            )}

            {activeTab === "electricity_invoices" && (
              <ElectricityInvoicesView
                invoices={electricityInvoices}
                partners={partners}
                companySettings={companySettings}
                filterParams={filterParams}
                onSaveInvoice={handleSaveElectricityInvoice}
                onDeleteInvoice={handleDeleteElectricityInvoice}
              />
            )}

            {activeTab === "trial_balance" && (
              <TrialBalanceView
                accounts={accounts}
                journalEntries={journalEntries}
                companySettings={companySettings}
                filterParams={filterParams}
              />
            )}

            {activeTab === "financial_statements" && (
              <FinancialStatementsView
                accounts={accounts}
                journalEntries={journalEntries}
                costCenters={costCenters}
                companySettings={companySettings}
                filterParams={filterParams}
              />
            )}

            {activeTab === "fixed_assets" && (
              <FixedAssetsView
                fixedAssets={fixedAssets}
                companySettings={companySettings}
                filterParams={filterParams}
                costCenters={costCenters}
                onSaveFixedAsset={handleSaveFixedAsset}
                onCalculateDepreciation={handleCalculateDepreciation}
                onDeleteFixedAsset={handleDeleteFixedAsset}
                onSaveJournalEntry={handleSaveJournalEntry}
              />
            )}

            {activeTab === "hr" && (
              <HRView
                employees={employees}
                companySettings={companySettings}
                filterParams={filterParams}
                onSaveEmployee={handleSaveEmployee}
                onDeleteEmployee={handleDeleteEmployee}
                onProcessPayroll={handleProcessPayroll}
              />
            )}

            {activeTab === "partners" && (
              <PartnersView
                partners={partners}
                accounts={accounts}
                journalEntries={journalEntries}
                companySettings={companySettings}
                onSavePartner={handleSavePartner}
                onDeletePartner={handleDeletePartner}
              />
            )}

            {activeTab === "inventory" && (
              <InventoryView
                inventoryItems={inventoryItems}
                inventoryMovements={inventoryMovements}
                companySettings={companySettings}
                filterParams={filterParams}
                onSaveInventoryItem={handleSaveInventoryItem}
                onDeleteInventoryItem={handleDeleteInventoryItem}
                onSaveInventoryMovement={handleSaveInventoryMovement}
                onDeleteInventoryMovement={handleDeleteInventoryMovement}
              />
            )}

            {activeTab === "financial_analysis" && (
              <FinancialAnalysisView
                accounts={accounts}
                companySettings={companySettings}
                analysisResult={analysisResult}
                isLoadingAnalysis={isLoadingAnalysis}
                onRequestAiAnalysis={handleRequestAiAnalysis}
              />
            )}

            {activeTab === "users" && (
              <UsersView
                users={users}
                accounts={accounts}
                onSaveUser={handleSaveUser}
                onDeleteUser={handleDeleteUser}
                onOpenShareModal={() => setShowShareModal(true)}
                currentUser={currentUser}
                systemLockState={systemLockState}
                onSaveSystemLockState={handleSaveSystemLockState}
                onSwitchUser={handleRequestSwitchUser}
              />
            )}

            {activeTab === "settings" && (
              <CompanySettingsView
                companySettings={companySettings}
                onSaveCompanySettings={setCompanySettings}
                systemLockState={systemLockState}
                onSaveSystemLockState={handleSaveSystemLockState}
                isAdmin={currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN" || currentUser.isSuperAdmin}
              />
            )}
          </div>
        </main>
      </div>

      {/* Real-time Permission Update Floating Notification Toast */}
      {realtimeToast && (
        <div className="fixed bottom-5 left-5 z-50 max-w-md animate-slide-up shadow-2xl">
          <div
            className={`p-4 rounded-2xl border backdrop-blur-xl flex items-start gap-3.5 ${
              realtimeToast.type === "danger"
                ? "bg-rose-950/90 border-rose-500/50 text-white"
                : realtimeToast.type === "warning"
                ? "bg-amber-950/90 border-amber-500/50 text-white"
                : realtimeToast.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/50 text-white"
                : "bg-blue-950/90 border-blue-500/50 text-white"
            }`}
          >
            <div className="p-2 rounded-xl bg-white/10 shrink-0 mt-0.5">
              {realtimeToast.type === "danger" && <AlertTriangle className="w-5 h-5 text-rose-400" />}
              {realtimeToast.type === "warning" && <Zap className="w-5 h-5 text-amber-400" />}
              {realtimeToast.type === "success" && <ShieldCheck className="w-5 h-5 text-emerald-400" />}
              {realtimeToast.type === "info" && <CheckCircle2 className="w-5 h-5 text-blue-400" />}
            </div>

            <div className="flex-1 min-w-0 space-y-0.5 text-right">
              <h4 className="text-xs font-bold text-white flex items-center justify-between">
                <span>{realtimeToast.title}</span>
                <span className="text-[10px] opacity-75 font-mono">الآن (Realtime)</span>
              </h4>
              <p className="text-[11px] text-gray-200 leading-relaxed">
                {realtimeToast.description}
              </p>
            </div>

            <button
              onClick={() => setRealtimeToast(null)}
              className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition"
              title="إغلاق الإشعار"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Share Access Modal */}
      {showShareModal && (
        <ShareAccessModal
          users={users}
          companySettings={companySettings}
          currentUser={currentUser}
          onClose={() => setShowShareModal(false)}
          onNavigateToUsers={() => {
            setActiveTab("users");
            setShowShareModal(false);
          }}
        />
      )}

      {/* WhatsApp Share Modal */}
      {whatsAppShareData && (
        <WhatsAppShareModal
          data={whatsAppShareData}
          onClose={() => setWhatsAppShareData(null)}
        />
      )}

      {/* Password-Guarded Switch User Modal (منع دخول أي مستخدم بدون كلمة السر + رؤية كلمة السر للمدير) */}
      {showSwitchPasswordModal && (
        <SwitchUserPasswordModal
          users={users}
          currentUser={currentUser}
          targetUser={switchTargetUser}
          onClose={() => {
            setShowSwitchPasswordModal(false);
            setSwitchTargetUser(null);
          }}
          onSwitchSuccess={(user) => {
            setCurrentUser(user);
            ERPStorage.saveActiveUserId(user.id);
            setShowSwitchPasswordModal(false);
            setSwitchTargetUser(null);
            const uAllowed = user.allowedTabs || [];
            if (
              uAllowed.length > 0 &&
              !uAllowed.includes("*") &&
              !uAllowed.includes(activeTab as any)
            ) {
              const first = uAllowed[0] as NavTab;
              if (first) setActiveTab(first);
            }
            setRealtimeToast({
              id: Date.now().toString(),
              title: "✅ تم تسجيل الدخول بنجاح",
              description: `تم التحقق من كلمة السر والتبديل بنجاح إلى حساب ${user.fullName} (${user.username})`,
              type: "success",
            });
          }}
        />
      )}
      </div>
    </AuthProvider>
  );
}
