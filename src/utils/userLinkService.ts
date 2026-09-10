import { User } from "../types";
import { SystemRoleType } from "../types/auth";
import { ERPStorage, notifyUsersUpdated } from "./storage";
import { generateSecureToken, generateUserLinkId } from "../data/permissionsData";

/**
 * Compact serializable representation of a user's permissions and credentials.
 * Ensures the link is completely portable and can be opened anywhere
 * without depending on existing browser localStorage state.
 */
export interface UserAuthPayload {
  i: string; // User ID
  u: string; // Username
  n: string; // Full Name
  r: SystemRoleType; // Role
  t: string[]; // Allowed Tabs
  acc?: string[]; // Allowed Accounts
  p?: string; // Password
  pin?: string; // PIN
  s?: "ACTIVE" | "INACTIVE"; // Status
  e?: string; // Email
  cp?: { granted: string[]; revoked: string[] }; // Custom permissions
  l?: string; // User Link ID
  tok?: string; // Bearer token
  ts?: number; // Timestamp
  upd?: string; // Last updated at ISO timestamp
  v: number; // Schema version
}

/**
 * Encodes a user object into a URL-safe Base64 token with Unicode support.
 */
export function encodeUserToToken(user: User): string {
  try {
    const compact: UserAuthPayload = {
      i: user.id,
      u: user.username,
      n: user.fullName,
      r: (user.role as SystemRoleType) || "ACCOUNTANT",
      t: Array.isArray(user.allowedTabs) && user.allowedTabs.length > 0 ? user.allowedTabs : ["dashboard"],
      acc: Array.isArray(user.allowedAccounts) ? user.allowedAccounts : ["*"],
      p: user.password || user.pin || "123",
      pin: user.pin || "1234",
      s: user.status || (user.isActive !== false ? "ACTIVE" : "INACTIVE"),
      e: user.email || "",
      cp: user.customPermissions || { granted: [], revoked: [] },
      l: user.userLinkId || user.shareToken || `ulnk_${user.username}`,
      tok: user.token || generateSecureToken(),
      ts: Date.now(),
      upd: user.updatedAt || new Date().toISOString(),
      v: 3,
    };

    const jsonStr = JSON.stringify(compact);
    // Safe Unicode Base64 encoding
    const utf8Bytes = encodeURIComponent(jsonStr).replace(
      /%([0-9A-F]{2})/g,
      (_, p1) => String.fromCharCode(parseInt(p1, 16))
    );
    return btoa(utf8Bytes);
  } catch (err) {
    console.error("Error encoding user to token:", err);
    return "";
  }
}

/**
 * Decodes a URL-safe Base64 token back into a User object with validated permissions.
 */
export function decodeUserFromToken(tokenStr: string): User | null {
  try {
    if (!tokenStr) return null;
    const clean = decodeURIComponent(tokenStr.trim());
    const utf8Bytes = atob(clean);
    const jsonStr = decodeURIComponent(
      Array.prototype.map
        .call(utf8Bytes, (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const compact: UserAuthPayload = JSON.parse(jsonStr);
    if (!compact || !compact.u || !compact.n) return null;

    const role = compact.r || "ACCOUNTANT";
    const isSuper = compact.r === "SUPER_ADMIN" || (compact.u === "admin" && compact.r === "ADMIN");
    const allowedTabs = Array.isArray(compact.t) && compact.t.length > 0
      ? compact.t
      : isSuper
      ? ["*"]
      : ["dashboard"];

    const user: User = {
      id: compact.i || `USR-${compact.u}`,
      username: compact.u.trim().toLowerCase(),
      fullName: compact.n.trim(),
      role: compact.r,
      status: compact.s || "ACTIVE",
      isActive: compact.s !== "INACTIVE",
      isSuperAdmin: isSuper,
      email: compact.e || undefined,
      password: compact.p || "123",
      pin: compact.pin || "1234",
      userLinkId: compact.l || `ulnk_${compact.u}`,
      shareToken: compact.l || `ulnk_${compact.u}`,
      token: compact.tok || generateSecureToken(),
      tokenCreatedAt: new Date().toISOString(),
      tokenRevoked: false,
      allowedTabs,
      allowedAccounts: Array.isArray(compact.acc) ? compact.acc : ["*"],
      customPermissions: compact.cp || { granted: [], revoked: [] },
      permissions: {
        canAdd: true,
        canEdit: true,
        canDelete: isSuper || role === "ADMIN",
        canPrint: true,
        canExport: true,
        canManageUsers: isSuper || role === "ADMIN",
      },
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: compact.upd || undefined,
    };

    return user;
  } catch (err) {
    console.error("Error decoding user from token:", err);
    return null;
  }
}

/**
 * Builds the official shareable user link that encodes both the link identifier
 * and the portable self-authenticating permission token.
 */
export function getUserShareableUrl(user: User): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  const path = window.location.pathname;
  const linkId = user.userLinkId || user.shareToken || `ulnk_${user.username}`;
  const tokenPayload = encodeUserToToken(user);

  if (tokenPayload) {
    return `${origin}${path}?ulnk=${encodeURIComponent(linkId)}&uauth=${encodeURIComponent(tokenPayload)}`;
  }
  return `${origin}${path}?ulnk=${encodeURIComponent(linkId)}`;
}

/**
 * Parses user from current URL (supports ?uauth=, ?ulnk=, ?user=, /user/ path, #hash).
 * ALWAYS resolves to the latest live permissions configured in the system.
 */
export function parseUserFromCurrentUrl(): {
  user: User | null;
  isDirectLink: boolean;
  isDeactivated: boolean;
  source: "token" | "linkId" | "username" | null;
} {
  if (typeof window === "undefined") {
    return { user: null, isDirectLink: false, isDeactivated: false, source: null };
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.startsWith("#") ? window.location.hash.substring(1) : "";
    const hashParams = new URLSearchParams(hash);

    const uauthParam = params.get("uauth") || hashParams.get("uauth");
    const ulnkParam = params.get("ulnk") || params.get("link") || hashParams.get("ulnk") || hashParams.get("link");
    const userParam = params.get("user") || params.get("u") || hashParams.get("user");
    const tokenParam = params.get("token") || params.get("t") || hashParams.get("token");
    const pathname = window.location.pathname;

    let targetUser: User | null = null;
    let source: "token" | "linkId" | "username" | null = null;

    // First check existing users in system to guarantee live/updated permissions
    const storedUsers = ERPStorage.getUsers();

    // 1. Direct Lookup by Link ID (from ?ulnk= or /user/ path)
    if (ulnkParam) {
      targetUser = ERPStorage.getUserByLinkId(ulnkParam) || ERPStorage.getUserByToken(ulnkParam);
      if (targetUser) source = "linkId";
    }

    if (!targetUser && pathname.startsWith("/user/")) {
      const urlId = pathname.replace("/user/", "").trim();
      if (urlId) {
        targetUser = ERPStorage.getUserByLinkId(urlId) || ERPStorage.getUserByToken(urlId);
        if (targetUser) source = "linkId";
      }
    }

    // 2. Direct Lookup by Username parameter
    if (!targetUser && userParam) {
      const cleanUser = decodeURIComponent(userParam.trim().toLowerCase());
      targetUser = storedUsers.find(
        (u) =>
          u.username.toLowerCase() === cleanUser ||
          u.id.toLowerCase() === cleanUser
      ) || null;
      if (targetUser) source = "username";
    }

    // 3. Direct Lookup by Bearer Token
    if (!targetUser && tokenParam) {
      targetUser = ERPStorage.getUserByToken(tokenParam);
      if (targetUser) source = "token";
    }

    // 4. Handle Portable Token (uauth)
    if (uauthParam) {
      const decoded = decodeUserFromToken(uauthParam);
      if (decoded) {
        // Check if user already exists in storage (by id, username, or linkId)
        const existingInStorage = storedUsers.find(
          (u) =>
            u.id.toLowerCase() === decoded.id.toLowerCase() ||
            u.username.toLowerCase() === decoded.username.toLowerCase() ||
            (decoded.userLinkId && u.userLinkId === decoded.userLinkId) ||
            (decoded.shareToken && u.shareToken === decoded.shareToken)
        );

        if (existingInStorage) {
          // Live permissions rule: The stored user has the latest admin changes!
          targetUser = existingInStorage;
          source = source || "token";
        } else {
          // First time this link is opened in this browser: import and save
          upsertUserInStorage(decoded);
          targetUser = decoded;
          source = source || "token";
        }
      }
    }

    if (!targetUser) {
      return { user: null, isDirectLink: false, isDeactivated: false, source: null };
    }

    // Check if the user has been deactivated or disabled by admin
    const isDeactivated = targetUser.status === "INACTIVE" || targetUser.isActive === false;

    return {
      user: targetUser,
      isDirectLink: true,
      isDeactivated,
      source,
    };
  } catch (e) {
    console.error("Error parsing user from URL:", e);
    return { user: null, isDirectLink: false, isDeactivated: false, source: null };
  }
}

/**
 * Upserts a user in ERPStorage and notifies other tabs.
 * Preserves newer administrative permissions if already present.
 */
export function upsertUserInStorage(user: User): User[] {
  const currentUsers = ERPStorage.getUsers();
  const existingIdx = currentUsers.findIndex(
    (u) =>
      u.id.toLowerCase() === user.id.toLowerCase() ||
      u.username.toLowerCase() === user.username.toLowerCase()
  );

  let updatedList: User[];
  if (existingIdx >= 0) {
    const existing = currentUsers[existingIdx];
    // Preserve existing administrative permissions and active status
    updatedList = [...currentUsers];
    updatedList[existingIdx] = {
      ...user,
      ...existing, // existing admin configuration takes precedence
      id: existing.id,
      updatedAt: existing.updatedAt || user.updatedAt || new Date().toISOString(),
    };
  } else {
    updatedList = [...currentUsers, { ...user, updatedAt: user.updatedAt || new Date().toISOString() }];
  }

  // Deduplicate before saving
  const seen = new Set<string>();
  const deduplicated: User[] = [];
  for (const u of updatedList) {
    const key = (u.id || u.username || "").trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      deduplicated.push(u);
    }
  }

  ERPStorage.saveUsers(deduplicated);
  notifyUsersUpdated(deduplicated);
  return deduplicated;
}
