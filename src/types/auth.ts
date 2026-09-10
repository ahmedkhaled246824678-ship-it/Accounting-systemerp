import { UserPermissions as LegacyUserPermissions } from "./index";

export type SystemRoleType =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "ACCOUNTANT"
  | "AUDITOR"
  | "SITE_ENGINEER"
  | "VIEWER"
  | "CUSTOM";

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "export"
  | "manage";

export interface PermissionDefinition {
  id: string; // e.g. "view_dashboard", "add_users", "delete_journal"
  name: string;
  nameAr: string;
  title?: string;
  category: string; // e.g. "إدارة المستخدمين والصلاحيات", "قيود اليومية", "التقارير والقوائم"
  resource: string; // e.g. "users", "journal", "reports", "products", "settings"
  action: PermissionAction;
  descriptionAr?: string;
  description?: string;
}

export interface RoleDefinition {
  id: SystemRoleType;
  name: string;
  nameAr: string;
  title?: string;
  descriptionAr: string;
  description?: string;
  isSystem: boolean;
  defaultPermissions: string[]; // List of PermissionDefinition IDs
  defaultTabs: string[];
}

export interface UserCustomPermissions {
  granted: string[]; // Explicitly granted permissions regardless of role
  revoked: string[]; // Explicitly revoked permissions regardless of role
}

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: SystemRoleType;
  status: "ACTIVE" | "INACTIVE";
  isActive: boolean; // backward compatibility
  isSuperAdmin?: boolean;
  
  // Security & Link Identifiers
  userLinkId: string; // Secure unguessable random link identifier (e.g. ulnk_9a7b...)
  token: string; // Cryptographic bearer auth token (e.g. tok_sec_8f2d...)
  shareToken?: string; // backward compatibility
  tokenCreatedAt: string;
  tokenExpiresAt?: string;
  tokenRevoked?: boolean;
  
  // Permissions Matrix
  customPermissions: UserCustomPermissions;
  allowedTabs: string[]; // List of NavTab IDs
  allowedAccounts?: string[]; // Specific Account IDs allowed for this user, or ['*']
  permissions: LegacyUserPermissions; // backward compatibility
  
  // Credentials
  pin?: string;
  password?: string;
  
  // Metadata
  notes?: string;
  createdAt: string;
  lastActive?: string;
}

export interface AuthContextState {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
  effectivePermissions: string[];
  isSuperAdmin: boolean;
  userLinkId: string | null;
  hasPermission: (permissionId: string) => boolean;
  hasAnyPermission: (permissionIds: string[]) => boolean;
  hasAllPermissions: (permissionIds: string[]) => boolean;
  canAccessTab: (tabId: string) => boolean;
}
