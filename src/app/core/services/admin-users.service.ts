import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface AppUserRecord {
  id: string;
  email: string;
  full_name: string | null;
  role: 'super_admin' | 'admin' | 'staff';
  status: 'active' | 'pending' | 'disabled';
  last_sign_in_at: string | null;
  created_at: string;
}

export interface CreateAppUserInput {
  email: string;
  password: string;
  fullName: string | null;
  role: 'admin' | 'staff';
}

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly supabase = inject(SupabaseService).client;

  async getUsers(): Promise<AppUserRecord[]> {
    const { data, error } = await this.supabase
      .from('app_users')
      .select('id,email,full_name,role,status,last_sign_in_at,created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []) as AppUserRecord[];
  }

  async getCurrentUserRole(userId: string): Promise<AppUserRecord['role'] | null> {
    const { data, error } = await this.supabase
      .from('app_users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data?.role as AppUserRecord['role'] | undefined) ?? null;
  }

  async updateUser(
    userId: string,
    role: 'admin' | 'staff',
    status: AppUserRecord['status']
  ): Promise<void> {
    const { error } = await this.supabase.rpc('admin_update_user', {
      target_user_id: userId,
      new_role: role,
      new_status: status,
    });

    if (error) {
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const { error } = await this.supabase.rpc('admin_delete_user', {
      target_user_id: userId,
    });

    if (error) {
      throw error;
    }
  }

  async createUser(payload: CreateAppUserInput): Promise<void> {
    const { error } = await this.supabase.functions.invoke('admin-create-user', {
      body: payload,
    });

    if (error) {
      throw error;
    }
  }
}
