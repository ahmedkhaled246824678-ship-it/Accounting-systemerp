import { Request, Response, NextFunction } from "express";
import { serverDb } from "./db";

export type SystemRoleType =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "ACCOUNTANT"
  | "AUDITOR"
  | "SITE_ENGINEER"
  | "VIEWER"
  | "CUSTOM";

export interface ServerUser {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  role: SystemRoleType;
  status: "ACTIVE" | "INACTIVE";
  isActive: boolean;
  isSuperAdmin?: boolean;
  userLinkId: string;
  token: string;
  tokenCreatedAt: string;
  tokenExpiresAt?: string;
  tokenRevoked?: boolean;
  tenantId?: string;
  assignedTenantIds?: string[];
  electronicSignature?: string;
  signatureTitle?: string;
  isSignatureApproved?: boolean;
  customPermissions: {
    granted: string[];
    revoked: string[];
  };
  allowedTabs: string[];
  permissions?: {
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canPrint: boolean;
    canExport: boolean;
    canManageUsers: boolean;
  };
  pin?: string;
  password?: string;
  notes?: string;
  createdAt: string;
}

// Role Default Permissions Map
export const ROLE_DEFAULT_PERMISSIONS: Record<SystemRoleType, string[]> = {
  SUPER_ADMIN: [
    "view_dashboard", "view_users", "add_users", "edit_users", "delete_users", "manage_roles",
    "view_accounts", "add_accounts", "edit_accounts", "delete_accounts",
    "view_journal", "create_journal", "edit_journal", "delete_journal",
    "view_reports", "create_reports", "edit_reports", "delete_reports", "export_reports",
    "view_treasury", "create_treasury", "edit_treasury", "delete_treasury",
    "view_custody", "create_custody", "edit_custody", "delete_custody",
    "view_banks", "create_banks", "edit_banks", "delete_banks",
    "view_cost_centers", "create_cost_centers", "edit_cost_centers", "delete_cost_centers",
    "view_products", "add_products", "edit_products", "delete_products",
    "view_partners", "add_partners", "edit_partners", "delete_partners",
    "view_settings", "edit_settings", "ai_analysis"
  ],
  ADMIN: [
    "view_dashboard", "view_users", "add_users", "edit_users", "manage_roles",
    "view_accounts", "add_accounts", "edit_accounts",
    "view_journal", "create_journal", "edit_journal", "delete_journal",
    "view_reports", "create_reports", "edit_reports", "export_reports",
    "view_treasury", "create_treasury", "edit_treasury", "delete_treasury",
    "view_custody", "create_custody", "edit_custody",
    "view_banks", "create_banks", "edit_banks",
    "view_cost_centers", "create_cost_centers", "edit_cost_centers",
    "view_products", "add_products", "edit_products",
    "view_partners", "add_partners", "edit_partners",
    "view_settings", "ai_analysis"
  ],
  MANAGER: [
    "view_dashboard", "view_reports", "create_reports", "export_reports",
    "view_accounts", "view_journal", "create_journal", "edit_journal",
    "view_treasury", "view_custody", "view_banks", "view_cost_centers",
    "view_products", "view_partners", "ai_analysis"
  ],
  ACCOUNTANT: [
    "view_dashboard", "view_accounts", "view_journal", "create_journal", "edit_journal",
    "view_treasury", "create_treasury", "edit_treasury",
    "view_custody", "create_custody", "edit_custody",
    "view_banks", "create_banks", "edit_banks",
    "view_cost_centers", "create_cost_centers",
    "view_products", "add_products", "edit_products",
    "view_partners", "add_partners", "edit_partners",
    "view_reports", "export_reports"
  ],
  AUDITOR: [
    "view_dashboard", "view_accounts", "view_journal", "view_reports", "export_reports",
    "view_treasury", "view_custody", "view_banks", "view_cost_centers",
    "view_products", "ai_analysis"
  ],
  SITE_ENGINEER: [
    "view_custody", "create_custody", "edit_custody",
    "view_cost_centers", "create_cost_centers", "view_products", "export_reports"
  ],
  VIEWER: [
    "view_dashboard", "view_reports", "view_accounts"
  ],
  CUSTOM: [
    "view_dashboard"
  ],
};

// Calculate effective permissions on server
export function calculateServerEffectivePermissions(user: ServerUser): string[] {
  if (user.isSuperAdmin || user.role === "SUPER_ADMIN") {
    return ROLE_DEFAULT_PERMISSIONS.SUPER_ADMIN;
  }
  const base = new Set(ROLE_DEFAULT_PERMISSIONS[user.role] || ["view_dashboard"]);

  if (user.customPermissions?.granted) {
    user.customPermissions.granted.forEach((p) => base.add(p));
  }
  if (user.customPermissions?.revoked) {
    user.customPermissions.revoked.forEach((p) => base.delete(p));
  }

  return Array.from(base);
}

// Generate random secure token & linkId helper
export function generateRandomHex(length: number = 16): string {
  const chars = "abcdef0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Express Request with User
export interface AuthenticatedRequest extends Request {
  user?: ServerUser;
  effectivePermissions?: string[];
}

// Authentication Middleware: Checks token from headers, cookies, or query
export function authenticateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const tokenHeader = (req.headers["x-user-token"] as string) || (req.headers["x-auth-token"] as string);
  const linkIdHeader = (req.headers["x-user-link-id"] as string) || (req.query.userLinkId as string) || (req.query.token as string);

  let token: string | null = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else if (tokenHeader) {
    token = tokenHeader.trim();
  }

  let foundUser: ServerUser | undefined;

  // 1. Try finding by Token
  if (token) {
    foundUser = serverDb.getUserByToken(token);
  }

  // 2. Try finding by Link ID
  if (!foundUser && linkIdHeader) {
    const cleanLink = linkIdHeader.trim();
    foundUser = serverDb.getAllUsers().find(
      (u) =>
        u.userLinkId === cleanLink ||
        (u.userLinkId && cleanLink.endsWith(u.userLinkId)) ||
        (u.userLinkId && u.userLinkId.endsWith(cleanLink))
    );
  }

  // 3. Fallback: If in local dev and no token provided, default to Super Admin
  if (!foundUser && process.env.NODE_ENV !== "production" && !authHeader && !tokenHeader && !linkIdHeader) {
    foundUser = serverDb.getAllUsers()[0]; // Admin
  }

  if (!foundUser) {
    return res.status(401).json({
      error: "غير مصرح بالدخول: لم يتم العثور على رمز مستخدم صالح أو انتهت الجلسة.",
      code: "UNAUTHORIZED",
    });
  }

  // Check Account Status
  if (foundUser.status === "INACTIVE" || foundUser.isActive === false) {
    return res.status(403).json({
      error: "تم تعطيل هذا الحساب من قبل مدير النظام. يرجى مراجعة الإدارة.",
      code: "ACCOUNT_DEACTIVATED",
      userStatus: "INACTIVE",
    });
  }

  req.user = foundUser;
  req.effectivePermissions = calculateServerEffectivePermissions(foundUser);
  next();
}

// Authorization Middleware: Verifies if authenticated user has required permission
export function requirePermission(permissionId: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "يجب تسجيل الدخول أولاً.",
        code: "UNAUTHORIZED",
      });
    }

    // Super Admin bypass
    if (req.user.isSuperAdmin || req.user.role === "SUPER_ADMIN") {
      return next();
    }

    const perms = req.effectivePermissions || calculateServerEffectivePermissions(req.user);

    if (!perms.includes(permissionId)) {
      return res.status(403).json({
        error: `ليس لديك صلاحية للوصول إلى هذا المورد أو تنفيذ هذا الإجراء (${permissionId}).`,
        code: "FORBIDDEN",
        requiredPermission: permissionId,
        userRole: req.user.role,
      });
    }

    next();
  };
}
