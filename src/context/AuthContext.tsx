import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { User } from "../types";
import { NavTab } from "../components/Sidebar";
import { AuthContextState, SystemRoleType, UserAccount } from "../types/auth";
import { ERPStorage } from "../utils/storage";
import { getEffectivePermissions, SYSTEM_PERMISSIONS, SYSTEM_ROLES } from "../data/permissionsData";

const AuthContext = createContext<AuthContextState | null>(null);

export const AuthProvider: React.FC<{
  currentUser?: User | null;
  user?: User | null;
  children: React.ReactNode;
}> = ({ currentUser, user, children }) => {
  const propUser = currentUser !== undefined ? currentUser : user;
  // Calculate effective permissions for current user
  const effectivePermissionsSet = useMemo(() => {
    return getEffectivePermissions(propUser);
  }, [propUser]);

  const effectivePermissions = useMemo(() => {
    return Array.from(effectivePermissionsSet);
  }, [effectivePermissionsSet]);

  const isSuperAdmin = useMemo(() => {
    if (!propUser) return false;
    return Boolean(
      propUser.isSuperAdmin ||
        propUser.role === "SUPER_ADMIN" ||
        (propUser.role === "ADMIN" && propUser.username === "admin")
    );
  }, [propUser]);

  const userLinkId = propUser?.userLinkId || propUser?.shareToken || null;

  const hasPermission = (permissionId: string): boolean => {
    if (!propUser) return false;
    if (isSuperAdmin) return true;
    return effectivePermissionsSet.has(permissionId);
  };

  const hasAnyPermission = (permissionIds: string[]): boolean => {
    if (!propUser) return false;
    if (isSuperAdmin) return true;
    return permissionIds.some((p) => effectivePermissionsSet.has(p));
  };

  const hasAllPermissions = (permissionIds: string[]): boolean => {
    if (!propUser) return false;
    if (isSuperAdmin) return true;
    return permissionIds.every((p) => effectivePermissionsSet.has(p));
  };

  const canAccessTab = (tabId: string): boolean => {
    if (!propUser) return false;
    if (isSuperAdmin) return true;
    const allowed = propUser.allowedTabs || [];
    if (allowed.includes("*")) return true;
    return allowed.includes(tabId);
  };

  const value: AuthContextState = {
    currentUser: propUser as unknown as UserAccount,
    isAuthenticated: Boolean(propUser && propUser.isActive !== false),
    effectivePermissions,
    isSuperAdmin,
    userLinkId,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessTab,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Return safe fallback for components rendered outside provider
    return {
      currentUser: null,
      isAuthenticated: false,
      effectivePermissions: [],
      isSuperAdmin: false,
      userLinkId: null,
      hasPermission: () => true,
      hasAnyPermission: () => true,
      hasAllPermissions: () => true,
      canAccessTab: () => true,
    };
  }
  return context;
};

// UI Component Guard Helper
export const PermissionGate: React.FC<{
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  tab?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ permission, permissions, requireAll = false, tab, fallback = null, children }) => {
  const auth = useAuth();

  if (tab && !auth.canAccessTab(tab)) {
    return <>{fallback}</>;
  }

  if (permission && !auth.hasPermission(permission)) {
    return <>{fallback}</>;
  }

  if (permissions && permissions.length > 0) {
    const authorized = requireAll
      ? auth.hasAllPermissions(permissions)
      : auth.hasAnyPermission(permissions);
    if (!authorized) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};
