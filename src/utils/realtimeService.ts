import { User, SystemLockState } from "../types";

export type RealtimeEventCallback = (event: any) => void;

export interface RealtimePermissionUpdatePayload {
  type: "USER_PERMISSIONS_UPDATED";
  userId: string;
  user: User;
  users?: User[];
  effectivePermissions?: string[];
  allowedTabs?: string[];
  role?: string;
  status?: "ACTIVE" | "INACTIVE";
  isActive?: boolean;
  isDeactivated?: boolean;
  message?: string;
  timestamp: number;
}

export interface RealtimeUsersSyncPayload {
  type: "USERS_LIST_UPDATED" | "USER_CREATED" | "USER_DELETED";
  users: User[];
  userId?: string;
  message?: string;
  timestamp: number;
}

export interface RealtimeLockPayload {
  type: "SYSTEM_LOCK_CHANGED";
  lockState: SystemLockState;
  message?: string;
  timestamp: number;
}

class RealtimeClient {
  private listeners: Set<RealtimeEventCallback> = new Set();
  private statusListeners: Set<(connected: boolean) => void> = new Set();
  private pollingInterval: any = null;
  private currentUser: User | null = null;
  public isConnected = true;

  constructor() {
    if (typeof window !== "undefined") {
      this.startPolling();
      window.addEventListener("focus", () => this.pollNow());
      window.addEventListener("visibilitychange", () => {
        if (!document.hidden) this.pollNow();
      });
    }
  }

  public registerUser(user: User | null) {
    this.currentUser = user;
  }

  public publish(event: any) {
    this.handleIncomingEvent(event);
  }

  private handleIncomingEvent(event: any) {
    this.listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (err) {
        console.error("Error in realtime listener callback:", err);
      }
    });
  }

  public async pollNow() {
    if (typeof window === "undefined") return;
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const users = await res.json();
        if (Array.isArray(users)) {
          this.handleIncomingEvent({
            type: "USERS_LIST_UPDATED",
            users,
            timestamp: Date.now(),
          });
        }
      }
    } catch (e) {
      // Safe offline fallback
    }

    try {
      const lockRes = await fetch("/api/system/lock");
      if (lockRes.ok) {
        const lockState = await lockRes.json();
        if (lockState && typeof lockState.isLocked === "boolean") {
          this.handleIncomingEvent({
            type: "SYSTEM_LOCK_CHANGED",
            lockState,
            timestamp: Date.now(),
          });
        }
      }
    } catch (e) {
      // Safe offline fallback
    }
  }

  private startPolling() {
    if (this.pollingInterval) return;
    this.pollingInterval = setInterval(() => {
      this.pollNow();
    }, 4000);
  }

  public subscribe(callback: RealtimeEventCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.isConnected);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public disconnect() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

export const realtimeClient = new RealtimeClient();
