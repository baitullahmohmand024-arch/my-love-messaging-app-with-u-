import { UserProfile } from '../types';

const TOKEN_KEY = 'love_you_token';
const USER_KEY = 'love_you_user';
const SETTINGS_KEY = 'love_you_settings';
const STARTUP_SEEN_KEY = 'love_you_startup_seen';

export interface UserSettings {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export const Storage = {
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setToken(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
  },

  getUser(): UserProfile | null {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setUser(user: UserProfile) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {}
  },

  clearAuth() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
  },

  getSettings(): UserSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {}
    return {
      soundEnabled: true,
      notificationsEnabled: true,
    };
  },

  setSettings(settings: UserSettings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  },

  hasSeenStartup(): boolean {
    try {
      return localStorage.getItem(STARTUP_SEEN_KEY) === 'true';
    } catch {
      return false;
    }
  },

  markStartupSeen() {
    try {
      localStorage.setItem(STARTUP_SEEN_KEY, 'true');
    } catch {}
  },

  resetStartup() {
    try {
      localStorage.removeItem(STARTUP_SEEN_KEY);
    } catch {}
  }
};
