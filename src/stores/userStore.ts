import { create } from 'zustand';
import {
  fetchAllUsers,
  fetchUserById,
  createUser,
  updateUser,
  deleteUserById,
  fetchServiceAccounts,
  createServiceAccount,
  type User,
  type CreateUserDto,
  type UpdateUserDto,
} from '../api/api';

interface UserState {
  // Users
  users: User[];
  usersLoading: boolean;
  usersError: string | null;

  // Service accounts
  serviceAccounts: User[];
  serviceAccountsLoading: boolean;
  serviceAccountsError: string | null;

  // Actions
  loadUsers: () => Promise<void>;
  loadUserById: (id: string) => Promise<User | null>;
  createUser: (data: CreateUserDto) => Promise<User | null>;
  updateUser: (data: UpdateUserDto) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  loadServiceAccounts: () => Promise<void>;
  createServiceAccount: (data: CreateUserDto) => Promise<User | null>;

  // Convenience lookups
  getServiceAccountName: (id: string | null | undefined) => string | undefined;
  getUserDisplayName: (id: string | null | undefined) => string | undefined;
}

function formatUserName(user: User): string {
  if (user.firstName || user.lastName) {
    return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  }
  return user.email || user.id || 'Unknown';
}

export const useUserStore = create<UserState>((set, get) => ({
  // ── Users ────────────────────────────────────────────────────────
  users: [],
  usersLoading: false,
  usersError: null,

  loadUsers: async () => {
    set({ usersLoading: true, usersError: null });
    try {
      const data = await fetchAllUsers();
      set({ users: data, usersLoading: false });
    } catch (err) {
      set({
        usersError: err instanceof Error ? err.message : 'Failed to load users',
        usersLoading: false,
      });
    }
  },

  loadUserById: async (id) => {
    try {
      return await fetchUserById(id);
    } catch {
      return null;
    }
  },

  createUser: async (data) => {
    try {
      const result = await createUser(data);
      return result?.data ?? null;
    } catch {
      return null;
    }
  },

  updateUser: async (data) => {
    await updateUser(data);
    await get().loadUsers();
  },

  deleteUser: async (id) => {
    await deleteUserById(id);
    await get().loadUsers();
  },

  // ── Service Accounts ─────────────────────────────────────────────
  serviceAccounts: [],
  serviceAccountsLoading: false,
  serviceAccountsError: null,

  loadServiceAccounts: async () => {
    set({ serviceAccountsLoading: true, serviceAccountsError: null });
    try {
      const data = await fetchServiceAccounts();
      set({ serviceAccounts: data, serviceAccountsLoading: false });
    } catch (err) {
      set({
        serviceAccountsError: err instanceof Error ? err.message : 'Failed to load service accounts',
        serviceAccountsLoading: false,
      });
    }
  },

  createServiceAccount: async (data) => {
    try {
      const result = await createServiceAccount(data);
      return result?.data ?? null;
    } catch {
      return null;
    }
  },

  // ── Lookups ──────────────────────────────────────────────────────
  getServiceAccountName: (id) => {
    if (!id) return undefined;
    const sa = get().serviceAccounts.find((s) => s.id === id);
    return sa ? formatUserName(sa) : undefined;
  },

  getUserDisplayName: (id) => {
    if (!id) return undefined;
    const user = get().users.find((u) => u.id === id);
    return user ? formatUserName(user) : undefined;
  },
}));
