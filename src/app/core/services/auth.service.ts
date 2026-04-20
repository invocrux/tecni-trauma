import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthError, Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;

  readonly session = signal<Session | null>(null);
  readonly isAuthenticated = computed(() => this.session() !== null);

  constructor() {
    void this.refreshSession();

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
    });
  }

  async refreshSession(): Promise<boolean> {
    const { data, error } = await this.supabase.auth.getSession();

    if (error) {
      throw error;
    }

    this.session.set(data.session);
    return data.session !== null;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    this.session.set(data.session);
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      throw error;
    }

    this.session.set(null);
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof AuthError) {
      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Authentication error';
  }
}
