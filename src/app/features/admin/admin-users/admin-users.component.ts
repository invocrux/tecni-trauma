import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AdminUsersService, AppUserRecord } from '../../../core/services/admin-users.service';
import { AuthService } from '../../../core/services/auth.service';

interface CreateUserDraft {
  fullName: string;
  email: string;
  password: string;
  role: 'admin' | 'staff';
}

@Component({
  selector: 'app-admin-users',
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, TranslateModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersComponent {
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly authService = inject(AuthService);
  private readonly translate = inject(TranslateService);

  readonly searchQuery = signal('');
  readonly users = signal<AppUserRecord[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly actionInProgressId = signal<string | null>(null);
  readonly showCreateForm = signal(false);
  readonly createError = signal<string | null>(null);
  readonly createInProgress = signal(false);
  readonly createDraft = signal<CreateUserDraft>({
    fullName: '',
    email: '',
    password: '',
    role: 'staff',
  });

  constructor() {
    void this.loadUsers();
  }

  readonly filteredUsers = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    const users = this.users();

    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const role = this.roleLabelKey(user.role, user.status).toLocaleLowerCase();
      const name = this.displayName(user).toLocaleLowerCase();

      return (
        name.includes(query) ||
        user.email.toLocaleLowerCase().includes(query) ||
        role.includes(query)
      );
    });
  });

  readonly currentUserId = computed(() => this.authService.session()?.user.id ?? null);
  readonly currentUserRole = computed(() => {
    const currentUserId = this.currentUserId();
    return this.users().find((user) => user.id === currentUserId)?.role ?? null;
  });
  readonly canManageUsers = computed(() => this.currentUserRole() === 'super_admin');
  readonly canCreateUsers = computed(() => {
    const role = this.currentUserRole();
    return role === 'admin' || role === 'super_admin';
  });
  readonly canAssignAdminRole = computed(() => this.currentUserRole() === 'super_admin');

  async loadUsers(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const users = await this.adminUsersService.getUsers();
      this.users.set(users);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      this.loading.set(false);
    }
  }

  displayName(user: AppUserRecord): string {
    if (user.full_name && user.full_name.trim().length > 0) {
      return user.full_name.trim();
    }

    const localPart = user.email.split('@')[0] ?? user.email;

    return localPart
      .replace(/[._-]+/g, ' ')
      .split(' ')
      .filter((part) => part.length > 0)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  roleLabelKey(role: AppUserRecord['role'], status: AppUserRecord['status']): string {
    if (status === 'pending') {
      return 'adminUsers.rolePending';
    }

    if (status === 'disabled') {
      return 'adminUsers.roleDisabled';
    }

    switch (role) {
      case 'super_admin':
        return 'adminUsers.roleSuperAdmin';
      case 'admin':
        return 'adminUsers.roleAdmin';
      default:
        return 'adminUsers.roleStaff';
    }
  }

  activityIcon(status: AppUserRecord['status']): string {
    return status === 'pending' || status === 'disabled' ? 'warning' : 'schedule';
  }

  isProtectedUser(user: AppUserRecord): boolean {
    return user.role === 'super_admin' || user.id === this.currentUserId();
  }

  openCreateForm(): void {
    if (!this.canCreateUsers()) {
      return;
    }

    this.createDraft.set({
      fullName: '',
      email: '',
      password: '',
      role: 'staff',
    });
    this.createError.set(null);
    this.showCreateForm.set(true);
  }

  closeCreateForm(): void {
    this.showCreateForm.set(false);
    this.createError.set(null);
  }

  patchCreateDraft(patch: Partial<CreateUserDraft>): void {
    this.createDraft.update((draft) => ({ ...draft, ...patch }));
  }

  async submitCreateUser(): Promise<void> {
    if (!this.canCreateUsers()) {
      return;
    }

    const draft = this.createDraft();
    const email = draft.email.trim().toLowerCase();
    const password = draft.password.trim();
    const fullName = draft.fullName.trim();
    const role = this.canAssignAdminRole() ? draft.role : 'staff';

    if (!email || !password) {
      this.createError.set(this.translate.instant('adminUsers.createValidation'));
      return;
    }

    this.createInProgress.set(true);
    this.createError.set(null);

    try {
      await this.adminUsersService.createUser({
        email,
        password,
        fullName: fullName.length > 0 ? fullName : null,
        role,
      });
      this.closeCreateForm();
      await this.loadUsers();
    } catch (error) {
      this.createError.set(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      this.createInProgress.set(false);
    }
  }

  async changeRole(user: AppUserRecord, role: 'admin' | 'staff'): Promise<void> {
    if (!this.canManageUsers() || this.isProtectedUser(user)) {
      return;
    }

    this.actionInProgressId.set(user.id);

    try {
      await this.adminUsersService.updateUser(user.id, role, user.status);
      await this.loadUsers();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      this.actionInProgressId.set(null);
    }
  }

  async toggleStatus(user: AppUserRecord): Promise<void> {
    if (!this.canManageUsers() || this.isProtectedUser(user)) {
      return;
    }

    this.actionInProgressId.set(user.id);

    try {
      const nextStatus: AppUserRecord['status'] = user.status === 'disabled' ? 'active' : 'disabled';
      await this.adminUsersService.updateUser(user.id, user.role === 'super_admin' ? 'admin' : user.role, nextStatus);
      await this.loadUsers();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Failed to update user status');
    } finally {
      this.actionInProgressId.set(null);
    }
  }

  async deleteUser(user: AppUserRecord): Promise<void> {
    if (!this.canManageUsers() || this.isProtectedUser(user)) {
      return;
    }

    const confirmed = window.confirm(
      this.translate.instant('adminUsers.confirmDelete', { email: user.email })
    );

    if (!confirmed) {
      return;
    }

    this.actionInProgressId.set(user.id);

    try {
      await this.adminUsersService.deleteUser(user.id);
      await this.loadUsers();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      this.actionInProgressId.set(null);
    }
  }

  trackByUserId(_index: number, user: AppUserRecord): string {
    return user.id;
  }

  activityText(user: AppUserRecord): string {
    if (user.status === 'pending') {
      return this.translate.instant('adminUsers.pendingAccess');
    }

    if (user.status === 'disabled') {
      return this.translate.instant('adminUsers.disabledAccess');
    }

    const date = user.last_sign_in_at ?? user.created_at;
    return `${this.translate.instant('adminUsers.lastSeen')}: ${this.relativeTime(date)}`;
  }

  private relativeTime(dateStr: string): string {
    const lang = this.translate.currentLang ?? 'es';
    const now = Date.now();
    const diff = now - new Date(dateStr).getTime();

    const minutes = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);

    if (lang === 'en') {
      if (minutes < 1) return 'just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    }

    if (minutes < 1) return 'justo ahora';
    if (minutes < 60) return `hace ${minutes} min`;
    if (hours < 24) return `hace ${hours} h`;
    return `hace ${days} días`;
  }
}
