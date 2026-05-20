import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/public/equipment-list/equipment-list.component').then(
        (m) => m.EquipmentListComponent
      ),
  },
  {
    path: 'equipo/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/public/equipment-detail/equipment-detail.component').then(
        (m) => m.EquipmentDetailComponent
      ),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/admin/admin-login/admin-login.component').then(
        (m) => m.AdminLoginComponent
      ),
  },
  {
    path: 'admin/login',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-shell/admin-shell.component').then(
        (m) => m.AdminShellComponent
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/admin/admin-dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent
          ),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/admin/admin-users/admin-users.component').then(
            (m) => m.AdminUsersComponent
          ),
      },
      {
        path: 'equipos/nuevo',
        loadComponent: () =>
          import(
            './features/admin/admin-equipment-form/admin-equipment-form.component'
          ).then((m) => m.AdminEquipmentFormComponent),
      },
      {
        path: 'equipos/:id',
        loadComponent: () =>
          import(
            './features/admin/admin-equipment-form/admin-equipment-form.component'
          ).then((m) => m.AdminEquipmentFormComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
