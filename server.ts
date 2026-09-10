import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { serverDb } from "./server/db";
import {
  authenticateUser,
  requirePermission,
  calculateServerEffectivePermissions,
  generateRandomHex,
  ROLE_DEFAULT_PERMISSIONS,
  ServerUser,
  AuthenticatedRequest,
} from "./server/rbac";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// ==========================================
// REAL-TIME WEBSOCKET INFRASTRUCTURE
// ==========================================

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

interface ConnectedClient {
  ws: WebSocket;
  userId?: string;
  isAlive: boolean;
  connectedAt: string;
}

const activeClients = new Map<WebSocket, ConnectedClient>();

// Ping/Pong Heartbeat to keep connections healthy and purge stale sockets
const heartbeatInterval = setInterval(() => {
  activeClients.forEach((client, ws) => {
    if (!client.isAlive) {
      activeClients.delete(ws);
      return ws.terminate();
    }
    client.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on("close", () => {
  clearInterval(heartbeatInterval);
});

wss.on("connection", (ws: WebSocket, req) => {
  const client: ConnectedClient = {
    ws,
    isAlive: true,
    connectedAt: new Date().toISOString(),
  };
  activeClients.set(ws, client);

  // Send initial handshake acknowledgement and server timestamp
  try {
    ws.send(
      JSON.stringify({
        type: "CONNECTED",
        message: "تم الاتصال بخادم المزامنة اللحظية بنجاح",
        timestamp: Date.now(),
      })
    );
  } catch (err) {
    console.error("Error sending initial WS greeting:", err);
  }

  ws.on("pong", () => {
    client.isAlive = true;
  });

  ws.on("message", (raw: string) => {
    try {
      const data = JSON.parse(raw.toString());

      // Handle Authentication / User Registration on Socket
      if (data.type === "REGISTER_USER" || data.type === "AUTH_INIT") {
        const token = data.token || data.userLinkId;
        if (token) {
          const user = serverDb.getUserByToken(token) || serverDb.getUserById(data.userId);
          if (user) {
            client.userId = user.id;
            const effectivePermissions = calculateServerEffectivePermissions(user);
            ws.send(
              JSON.stringify({
                type: "AUTH_ACK",
                userId: user.id,
                role: user.role,
                status: user.status,
                allowedTabs: user.allowedTabs,
                effectivePermissions,
                timestamp: Date.now(),
              })
            );
          }
        }
      }

      if (data.type === "PING") {
        ws.send(JSON.stringify({ type: "PONG", timestamp: Date.now() }));
      }
    } catch (e) {
      console.warn("Invalid WS message received:", e);
    }
  });

  ws.on("close", () => {
    activeClients.delete(ws);
  });

  ws.on("error", () => {
    activeClients.delete(ws);
  });
});

/**
 * Broadcasts an event to all connected WebSocket clients instantly
 */
export function broadcastRealtimeEvent(event: {
  type: string;
  userId?: string;
  user?: any;
  users?: any[];
  permissions?: string[];
  allowedTabs?: string[];
  lockState?: any;
  message?: string;
  timestamp?: number;
  [key: string]: any;
}) {
  const payload = JSON.stringify({
    ...event,
    timestamp: event.timestamp || Date.now(),
  });

  activeClients.forEach((client, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(payload);
      } catch (err) {
        console.error("Error broadcasting to client:", err);
      }
    }
  });
}

// Server-side Gemini AI Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Healthcheck API
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    system: "Accounting ERP & RBAC System",
    connectedClients: activeClients.size,
  });
});

// ==========================================
// 1. AUTHENTICATION & LOGIN APIS (CENTRAL DB)
// ==========================================

// Standard Centralized User Login (Username/Email + Password or PIN)
app.post("/api/auth/login", (req, res) => {
  const { usernameOrEmail, password, pin } = req.body;
  const identifier = (usernameOrEmail || "").trim();
  const secret = (password || pin || "").trim();

  if (!identifier) {
    return res.status(400).json({
      error: "اسم المستخدم أو البريد الإلكتروني مطلوب.",
      code: "MISSING_IDENTIFIER",
    });
  }

  if (!secret) {
    return res.status(400).json({
      error: "كلمة المرور أو رمز PIN مطلوب لتسجيل الدخول.",
      code: "MISSING_CREDENTIALS",
    });
  }

  const user = serverDb.getUserByCredentials(identifier, secret);

  if (!user) {
    return res.status(401).json({
      error: "اسم المستخدم أو كلمة المرور غير صحيحة.",
      code: "INVALID_CREDENTIALS",
    });
  }

  if (user.status === "INACTIVE" || user.isActive === false) {
    return res.status(403).json({
      error: "تم تعطيل هذا الحساب من قبل مدير النظام. يرجى مراجعة الإدارة.",
      code: "ACCOUNT_DEACTIVATED",
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        status: "INACTIVE",
      },
    });
  }

  // System Lock Check (Admins only if locked)
  const systemLock = serverDb.getSystemLockState();
  if (systemLock.isLocked && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN" && !user.isSuperAdmin) {
    return res.status(403).json({
      error: `عذراً، النظام في وضع الصيانة حالياً (${systemLock.lockedReason || "تحديث البيانات"}). تسجيل الدخول متاح فقط لمدراء النظام.`,
      code: "SYSTEM_LOCKED",
    });
  }

  const effectivePermissions = calculateServerEffectivePermissions(user);

  res.json({
    success: true,
    message: "تم تسجيل الدخول بنجاح",
    token: user.token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
      userLinkId: user.userLinkId,
      token: user.token,
      allowedTabs: user.allowedTabs,
      customPermissions: user.customPermissions,
      createdAt: user.createdAt,
    },
    effectivePermissions,
    allowedTabs: user.allowedTabs,
  });
});

// Verify User Link ID or Token
app.post("/api/auth/verify-link", (req, res) => {
  const { userLinkId, token } = req.body;
  const target = (userLinkId || token || "").trim();

  if (!target) {
    return res.status(400).json({
      error: "معرف الرابط أو الرمز التعريفي مطلوب للتحقق.",
      code: "MISSING_IDENTIFIER",
    });
  }

  const user = serverDb.getAllUsers().find(
    (u) =>
      u.userLinkId === target ||
      u.token === target ||
      (u.userLinkId && target.endsWith(u.userLinkId)) ||
      (u.userLinkId && u.userLinkId.endsWith(target))
  );

  if (!user) {
    return res.status(404).json({
      error: "الرابط غير صالح أو منتهي الصلاحية.",
      code: "INVALID_OR_EXPIRED_LINK",
    });
  }

  if (user.tokenRevoked) {
    return res.status(403).json({
      error: "تم إلغاء هذا الرابط وتوليد رابط جديد من قبل مدير النظام.",
      code: "LINK_REVOKED",
    });
  }

  if (user.status === "INACTIVE" || user.isActive === false) {
    return res.status(403).json({
      error: "تم تعطيل هذا الحساب من قبل مدير النظام.",
      code: "ACCOUNT_DEACTIVATED",
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        status: "INACTIVE",
      },
    });
  }

  const effectivePermissions = calculateServerEffectivePermissions(user);

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
      userLinkId: user.userLinkId,
      token: user.token,
      allowedTabs: user.allowedTabs,
      customPermissions: user.customPermissions,
      createdAt: user.createdAt,
    },
    effectivePermissions,
    allowedTabs: user.allowedTabs,
  });
});

// Get Current Authenticated Profile
app.get("/api/auth/me", authenticateUser, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  res.json({
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
      userLinkId: user.userLinkId,
      token: user.token,
      allowedTabs: user.allowedTabs,
      customPermissions: user.customPermissions,
    },
    effectivePermissions: req.effectivePermissions,
    allowedTabs: user.allowedTabs,
  });
});

// ==========================================
// 2. SYSTEM ROLES & PERMISSIONS CATALOG
// ==========================================

app.get("/api/system/roles", (_req, res) => {
  res.json({
    roles: Object.keys(ROLE_DEFAULT_PERMISSIONS).map((roleKey) => ({
      id: roleKey,
      permissions: ROLE_DEFAULT_PERMISSIONS[roleKey as keyof typeof ROLE_DEFAULT_PERMISSIONS],
    })),
  });
});

// System Lock Endpoints
app.get("/api/system/lock", (_req, res) => {
  res.json({ lockState: serverDb.getSystemLockState() });
});

app.post("/api/system/lock", authenticateUser, requirePermission("manage_roles"), (req: AuthenticatedRequest, res) => {
  const { isLocked, lockedReason, notifyMessage, allowAdminsOnly } = req.body;
  const current = serverDb.getSystemLockState();

  const updated = {
    ...current,
    isLocked: Boolean(isLocked),
    lockedAt: isLocked ? new Date().toISOString() : "",
    lockedBy: req.user?.fullName || req.user?.username || "مدير النظام",
    lockedReason: lockedReason || current.lockedReason || "صيانة دورية",
    notifyMessage: notifyMessage || current.notifyMessage || "النظام قيد الصيانة",
    allowAdminsOnly: allowAdminsOnly !== undefined ? allowAdminsOnly : true,
  };

  serverDb.setSystemLockState(updated);

  // Broadcast lock state changed in real-time
  broadcastRealtimeEvent({
    type: "SYSTEM_LOCK_CHANGED",
    lockState: updated,
    message: updated.isLocked ? "تم قفل النظام مؤقتاً للصيانة" : "تم إلغاء قفل النظام وإتاحته للعمل",
  });

  res.json({ success: true, lockState: updated });
});

// ==========================================
// 3. ADMIN USERS & PERMISSIONS MANAGEMENT
// ==========================================

// Get All Users (Protected: requires 'view_users')
app.get("/api/users", authenticateUser, requirePermission("view_users"), (_req: AuthenticatedRequest, res) => {
  const users = serverDb.getAllUsers().map((u) => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    status: u.status,
    isActive: u.isActive,
    isSuperAdmin: u.isSuperAdmin,
    userLinkId: u.userLinkId,
    token: u.token,
    tokenCreatedAt: u.tokenCreatedAt,
    allowedTabs: u.allowedTabs,
    customPermissions: u.customPermissions,
    permissions: u.permissions,
    tenantId: u.tenantId,
    assignedTenantIds: u.assignedTenantIds,
    electronicSignature: u.electronicSignature,
    signatureTitle: u.signatureTitle,
    isSignatureApproved: u.isSignatureApproved,
    notes: u.notes,
    createdAt: u.createdAt,
  }));
  res.json({ users });
});

// Add New User (Protected: requires 'add_users')
app.post("/api/users", authenticateUser, requirePermission("add_users"), (req: AuthenticatedRequest, res) => {
  const {
    username,
    fullName,
    email,
    role,
    allowedTabs,
    customPermissions,
    pin,
    password,
    notes,
    tenantId,
    assignedTenantIds,
    electronicSignature,
    signatureTitle,
    isSignatureApproved,
  } = req.body;

  if (!username || !fullName) {
    return res.status(400).json({ error: "اسم المستخدم والاسم الكامل مطلوبان." });
  }

  // Check unique username
  if (serverDb.getUserByUsername(username)) {
    return res.status(400).json({ error: "اسم المستخدم مسجل مسبقاً، يرجى اختيار اسم آخر." });
  }

  const existingCount = serverDb.getAllUsers().length;
  const newId = `USR-${String(existingCount + 1).padStart(2, "0")}`;
  const userLinkId = `ulnk_${username.toLowerCase()}_${generateRandomHex(8)}`;
  const token = `sec_tok_${generateRandomHex(24)}`;
  const now = new Date().toISOString();

  const newUser: ServerUser = {
    id: newId,
    username: username.trim(),
    fullName: fullName.trim(),
    email: email ? email.trim() : undefined,
    role: role || "ACCOUNTANT",
    status: "ACTIVE",
    isActive: true,
    isSuperAdmin: false,
    userLinkId,
    token,
    tokenCreatedAt: now,
    tokenRevoked: false,
    tenantId: tenantId || "tenant-1",
    assignedTenantIds: assignedTenantIds || ["tenant-1"],
    electronicSignature: electronicSignature || "",
    signatureTitle: signatureTitle || "",
    isSignatureApproved: isSignatureApproved !== undefined ? isSignatureApproved : true,
    customPermissions: customPermissions || { granted: [], revoked: [] },
    allowedTabs: allowedTabs || ["dashboard"],
    pin: pin || "1234",
    password: password || "123",
    notes: notes || "",
    createdAt: now.split("T")[0],
  };

  serverDb.addUser(newUser);

  // Broadcast Real-time sync event
  broadcastRealtimeEvent({
    type: "USER_CREATED",
    userId: newUser.id,
    user: newUser,
    users: serverDb.getAllUsers(),
    message: `تم إضافة مستخدم جديد: ${newUser.fullName}`,
  });

  res.status(201).json({
    success: true,
    message: "تم إنشاء حساب المستخدم بنجاح في قاعدة البيانات المركزية",
    user: newUser,
  });
});

// Update User & Permissions (Protected: requires 'edit_users')
app.put("/api/users/:id", authenticateUser, requirePermission("edit_users"), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const current = serverDb.getUserById(id);

  if (!current) {
    return res.status(404).json({ error: "المستخدم غير موجود." });
  }

  const {
    fullName,
    email,
    role,
    status,
    allowedTabs,
    customPermissions,
    pin,
    password,
    notes,
    tenantId,
    assignedTenantIds,
    electronicSignature,
    signatureTitle,
    isSignatureApproved,
  } = req.body;

  // Prevent demoting last Super Admin
  if (current.isSuperAdmin && role && role !== "SUPER_ADMIN") {
    const superCount = serverDb.getAllUsers().filter((u) => u.isSuperAdmin || u.role === "SUPER_ADMIN").length;
    if (superCount <= 1) {
      return res.status(400).json({ error: "لا يمكن تعديل رتبة مدير النظام الرئيسي الأخير." });
    }
  }

  const updatedStatus = status || (req.body.isActive !== undefined ? (req.body.isActive ? "ACTIVE" : "INACTIVE") : current.status);

  const updated = serverDb.updateUser(id, {
    fullName: fullName !== undefined ? fullName : current.fullName,
    email: email !== undefined ? email : current.email,
    role: role !== undefined ? role : current.role,
    status: updatedStatus,
    isActive: updatedStatus === "ACTIVE",
    allowedTabs: allowedTabs !== undefined ? allowedTabs : current.allowedTabs,
    customPermissions: customPermissions !== undefined ? customPermissions : current.customPermissions,
    pin: pin !== undefined ? pin : current.pin,
    password: password !== undefined ? password : current.password,
    notes: notes !== undefined ? notes : current.notes,
    tenantId: tenantId !== undefined ? tenantId : current.tenantId,
    assignedTenantIds: assignedTenantIds !== undefined ? assignedTenantIds : current.assignedTenantIds,
    electronicSignature: electronicSignature !== undefined ? electronicSignature : current.electronicSignature,
    signatureTitle: signatureTitle !== undefined ? signatureTitle : current.signatureTitle,
    isSignatureApproved: isSignatureApproved !== undefined ? isSignatureApproved : current.isSignatureApproved,
  });

  if (!updated) {
    return res.status(500).json({ error: "فشل تحديث بيانات المستخدم." });
  }

  const effectivePermissions = calculateServerEffectivePermissions(updated);

  // BROADCAST INSTANT REAL-TIME UPDATE TO ALL CONNECTED CLIENTS VIA WEBSOCKETS
  broadcastRealtimeEvent({
    type: "USER_PERMISSIONS_UPDATED",
    userId: updated.id,
    user: updated,
    users: serverDb.getAllUsers(),
    effectivePermissions,
    allowedTabs: updated.allowedTabs,
    role: updated.role,
    status: updated.status,
    isActive: updated.isActive,
    isDeactivated: updated.status === "INACTIVE" || !updated.isActive,
    message: `تم تحديث صلاحيات المستخدم (${updated.fullName}) لحظياً`,
  });

  res.json({
    success: true,
    message: "تم تحديث بيانات وصلاحيات المستخدم لحظياً وبثها عبر خادم التزامن",
    user: updated,
    effectivePermissions,
  });
});

// Delete User (Protected: requires 'delete_users')
app.delete("/api/users/:id", authenticateUser, requirePermission("delete_users"), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const target = serverDb.getUserById(id);

  if (!target) {
    return res.status(404).json({ error: "المستخدم غير موجود." });
  }

  if (target.isSuperAdmin || target.role === "SUPER_ADMIN") {
    return res.status(403).json({ error: "محظور: لا يمكن حذف حساب المدير العام الرئيسي." });
  }

  serverDb.deleteUser(id);

  // Broadcast deletion event
  broadcastRealtimeEvent({
    type: "USER_DELETED",
    userId: id,
    users: serverDb.getAllUsers(),
    message: `تم حذف المستخدم: ${target.fullName}`,
  });

  res.json({ success: true, message: "تم حذف المستخدم بنجاح من قاعدة البيانات المركزية" });
});

// Regenerate User Link & Invalidate Old Link (Protected: requires 'manage_roles' or 'edit_users')
app.post("/api/users/:id/regenerate-link", authenticateUser, requirePermission("manage_roles"), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const user = serverDb.getUserById(id);

  if (!user) {
    return res.status(404).json({ error: "المستخدم غير موجود." });
  }

  const newLinkId = `ulnk_${user.username.toLowerCase()}_${generateRandomHex(8)}`;
  const newToken = `sec_tok_${generateRandomHex(24)}`;
  const now = new Date().toISOString();

  const updated = serverDb.updateUser(id, {
    userLinkId: newLinkId,
    token: newToken,
    tokenCreatedAt: now,
    tokenRevoked: false,
  });

  if (updated) {
    broadcastRealtimeEvent({
      type: "USER_PERMISSIONS_UPDATED",
      userId: updated.id,
      user: updated,
      users: serverDb.getAllUsers(),
      message: `تم تجديد رمز الدخول للمستخدم ${updated.fullName}`,
    });
  }

  res.json({
    success: true,
    message: "تم إلغاء الرابط القديم وتوليد رابط آمن جديد بنجاح",
    userLinkId: newLinkId,
    token: newToken,
  });
});

// Instant Status Toggle (Activate/Deactivate) (Protected: requires 'edit_users')
app.post("/api/users/:id/toggle-status", authenticateUser, requirePermission("edit_users"), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const user = serverDb.getUserById(id);

  if (!user) {
    return res.status(404).json({ error: "المستخدم غير موجود." });
  }

  if (user.isSuperAdmin) {
    return res.status(400).json({ error: "لا يمكن تعطيل حساب المدير العام الرئيسي." });
  }

  const newStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const updated = serverDb.updateUser(id, {
    status: newStatus,
    isActive: newStatus === "ACTIVE",
  });

  if (updated) {
    broadcastRealtimeEvent({
      type: "USER_PERMISSIONS_UPDATED",
      userId: updated.id,
      user: updated,
      users: serverDb.getAllUsers(),
      status: updated.status,
      isActive: updated.isActive,
      isDeactivated: updated.status === "INACTIVE",
      message: updated.status === "ACTIVE" ? `تم تفعيل حساب ${updated.fullName}` : `تم إيقاف حساب ${updated.fullName}`,
    });
  }

  res.json({
    success: true,
    message: newStatus === "ACTIVE" ? "تم تفعيل الحساب بنجاح" : "تم إيقاف وتعطيل الحساب بنجاح",
    status: newStatus,
    isActive: newStatus === "ACTIVE",
  });
});

// ==========================================
// 3.1 MULTI-TENANT / MULTI-COMPANY APIS
// ==========================================

// Get All Tenants / Companies
app.get("/api/tenants", (_req, res) => {
  const tenants = serverDb.getAllTenants();
  res.json({ tenants });
});

// Add New Tenant / Company (Protected: Super Admin or Admin)
app.post("/api/tenants", authenticateUser, requirePermission("manage_roles"), (req: AuthenticatedRequest, res) => {
  const { name, companyName, taxNumber, commercialRegister, currency, currencySymbol, financialYear, address, phone, email } = req.body;
  
  if (!name && !companyName) {
    return res.status(400).json({ error: "اسم الشركة مطلوب لإضافتها للنظام." });
  }

  const existingTenants = serverDb.getAllTenants();
  const newTenantId = `tenant-${Date.now()}`;
  const code = `COMP-${String(existingTenants.length + 1).padStart(2, "0")}`;

  const newTenant = {
    id: newTenantId,
    code,
    name: (companyName || name).trim(),
    companyName: (companyName || name).trim(),
    taxNumber: taxNumber || "000-000-000",
    commercialRegister: commercialRegister || "00000",
    currency: currency || "جنيه مصري",
    currencySymbol: currencySymbol || "ج.م",
    financialYear: financialYear || "2026",
    address: address || "المقر الرئيسي",
    phone: phone || "",
    email: email || "",
    isActive: true,
    isDefault: false,
    createdAt: new Date().toISOString().split("T")[0],
  };

  serverDb.addTenant(newTenant);

  broadcastRealtimeEvent({
    type: "TENANTS_UPDATED",
    tenant: newTenant,
    tenants: serverDb.getAllTenants(),
    message: `تم إضافة شركة جديدة في النظام: ${newTenant.companyName}`,
  });

  res.status(201).json({
    success: true,
    message: "تم إنشاء الشركة وحفظها بنجاح في النظام المتعدد",
    tenant: newTenant,
  });
});

// Update Tenant / Company (Protected: Super Admin or Admin)
app.put("/api/tenants/:id", authenticateUser, requirePermission("manage_roles"), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const updated = serverDb.updateTenant(id, req.body);

  if (!updated) {
    return res.status(404).json({ error: "الشركة غير موجودة." });
  }

  broadcastRealtimeEvent({
    type: "TENANTS_UPDATED",
    tenant: updated,
    tenants: serverDb.getAllTenants(),
    message: `تم تحديث بيانات الشركة: ${updated.companyName}`,
  });

  res.json({
    success: true,
    message: "تم تحديث بيانات الشركة بنجاح",
    tenant: updated,
  });
});

// Delete Tenant / Company (Protected: Super Admin only)
app.delete("/api/tenants/:id", authenticateUser, requirePermission("manage_roles"), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const tenant = serverDb.getTenantById(id);

  if (!tenant) {
    return res.status(404).json({ error: "الشركة غير موجودة." });
  }

  if (tenant.isDefault) {
    return res.status(400).json({ error: "لا يمكن حذف الشركة الافتراضية الرئيسية للنظام." });
  }

  serverDb.deleteTenant(id);

  broadcastRealtimeEvent({
    type: "TENANTS_UPDATED",
    deletedTenantId: id,
    tenants: serverDb.getAllTenants(),
    message: `تم حذف الشركة: ${tenant.companyName}`,
  });

  res.json({
    success: true,
    message: "تم حذف الشركة بنجاح من النظام",
  });
});

// ==========================================
// 4. FINANCIAL ANALYSIS (PROTECTED WITH RBAC)
// ==========================================

// AI Financial Productivity & Analysis Endpoint (Protected by 'ai_analysis' or 'view_reports')
app.post("/api/financial-analysis", authenticateUser, (req: AuthenticatedRequest, res) => {
  const perms = req.effectivePermissions || [];
  if (!perms.includes("ai_analysis") && !perms.includes("view_reports") && !req.user?.isSuperAdmin) {
    return res.status(403).json({
      error: "ليس لديك صلاحية لاستخدام خدمة التحليل المالي الذكي (AI Analysis).",
      code: "FORBIDDEN",
    });
  }

  const processAnalysis = async () => {
    try {
      const ai = getGeminiClient();
      if (!ai) {
        return res.status(500).json({
          error: "مفتاح GEMINI_API_KEY غير متوفر بالخادم.",
        });
      }

      const { financialMetrics, companyName } = req.body;

      const prompt = `أنت خبير واستشاري مالي وإداري محترف للشركات.
قم بتحليل البيانات المالية والإدارية التالية لشركة "${companyName || 'الشركة'}":

بيانات الأداء المالي والإنتاجية:
${JSON.stringify(financialMetrics, null, 2)}

يرجى إعداد تقرير تحليلي باللغة العربية يتضمن:
1. **ملخص الأداء المالي والربحية** (مؤشرات السيولة، كفاءة الأصول، ونسب الربحية).
2. **تحليل أسباب زيادة الإنتاجية وتحسين كفاءة استخدام رأس المال العامل**.
3. **ترشيد المصروفات وتكلفة المشروعات ومراكز التكلفة**.
4. **توصيات عملية ومحددة لزيادة الأرباح وتقليل الهدر في المخزون والعهد والسلف**.

قدم إجابتك بتنسيق مدمج ورائع مع عناوين واضحة ونقاط عملية تظهر بصورة احترافية باللغة العربية.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
      });

      res.json({ analysis: response.text });
    } catch (error: any) {
      console.error("Financial analysis error:", error);
      res.status(500).json({
        error: "حدث خطأ أثناء إجراء التحليل المالي الذكي.",
        details: error.message,
      });
    }
  };

  processAnalysis();
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening with WebSockets on http://0.0.0.0:${PORT}`);
  });
}

startServer();

