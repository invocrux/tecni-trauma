# BIOGEST admin shell navigation design

## Goal

Create a shared admin navigation shell for BIOGEST that behaves as a desktop sidebar and a mobile bottom tab nav, while keeping the public catalog accessible and introducing a mock Users section.

## Approved scope

- Admin navigation sections:
  - **Catálogo** → `/`
  - **Usuarios** → `/admin/usuarios`
  - **Equipos** → `/admin`
- **Usuarios** is visual-only for now: no real Supabase Auth listing, no CRUD, no invite flow.
- **Equipos** reuses the current admin dashboard as the active equipment management section.
- Equipment creation remains available from the Equipos section via the existing “Nuevo equipo” action.
- Responsive behavior:
  - desktop/tablet large: left sidebar
  - mobile: bottom tab navigation

## Why this approach

The current admin area is page-based and works, but it does not express the product structure shown in the approved BIOGEST mockups. A shared shell gives the project a stable navigation model now, and prevents future growth from being bolted onto a single dashboard screen.

This is preferred over adding isolated links inside the existing dashboard because:

- the IA becomes explicit
- mobile and desktop share the same section model
- future modules can be added without rethinking the admin frame

## Information architecture

### Public area

- `/` → public catalog
- `/equipo/:id` → public equipment detail

### Auth

- `/login` → global login

### Admin area

- `/admin` → Equipos section (existing dashboard)
- `/admin/usuarios` → Users section (mock UI only)
- `/admin/equipos/nuevo` → New equipment form
- `/admin/equipos/:id` → Edit equipment form

## Layout design

### Shared admin shell

A new admin shell component will wrap admin child routes and provide:

- brand/title area
- section navigation
- outlet/content area
- consistent spacing and page container

### Desktop behavior

- left vertical sidebar
- active section highlighted
- content rendered to the right
- no bottom nav

### Mobile behavior

- sidebar hidden
- fixed bottom tab nav shown
- same three sections as desktop
- active state mirrors current route

## Visual direction

Follow the approved BIOGEST mock references:

- **Catálogo | Usuarios | Equipos** as the navigation set
- Inter + Manrope hierarchy already adopted globally
- white/clinical surfaces with soft tonal layering
- no harsh divider-heavy admin frame
- active section uses BIOGEST blue emphasis

The Users screen should visually match the provided mock:

- large title
- search input
- grid/list of user cards
- floating add button
- mobile bottom nav consistent with the shell

## Component plan

### New components

1. `admin-shell`
   - owns sidebar + mobile tab nav + router outlet
   - computes active nav item from current route

2. `admin-users`
   - mock screen only
   - local/static data or lightweight in-component mock model
   - no backend dependency in this phase

### Existing components reused

1. `admin-dashboard`
   - becomes the Equipos section content
   - stays at `/admin`

2. `admin-equipment-form`
   - remains as equipment create/edit flow

## Routing changes

Admin routes should move from a flat child list under `/admin` to a shell layout pattern:

- `/admin` loads `admin-shell`
- shell children:
  - `` (dashboard/equipos)
  - `usuarios`
  - `equipos/nuevo`
  - `equipos/:id`

Public catalog route remains `/` and is reachable from the admin shell navigation as a normal route change.

## Interaction behavior

### Navigation

- tapping/clicking **Catálogo** leaves admin and returns to the public list
- tapping/clicking **Usuarios** opens the mock users screen
- tapping/clicking **Equipos** opens the current admin dashboard

### Active states

- `/admin` and `/admin/equipos/*` should keep **Equipos** highlighted
- `/admin/usuarios` should keep **Usuarios** highlighted
- `/` is outside admin shell, so the public app chrome remains responsible there

## Error handling

- no new backend dependencies for Users in this phase, so no remote error state is required there
- existing equipment dashboard error handling remains unchanged

## Testing expectations

Minimum validation after implementation:

1. desktop admin shows sidebar
2. mobile admin shows bottom tab nav
3. Catálogo navigates to `/`
4. Usuarios navigates to `/admin/usuarios`
5. Equipos navigates to `/admin`
6. `/admin/equipos/nuevo` and `/admin/equipos/:id` still work
7. active nav state remains correct across admin routes

## Risks

- active-state logic can become brittle if route matching is too literal
- the admin shell must not visually fight with the existing global app chrome
- mobile bottom nav spacing must account for safe-area and form CTA overlap

## Out of scope

- real Supabase Auth user listing
- user invitations / role management
- role-based admin differentiation beyond current auth guard
- redesign of public catalog/detail in this change

## Recommendation

Implement the shared admin shell first, then add the mock users screen, and only after that wire the current equipment dashboard/forms into the shell. That keeps routing and layout concerns isolated and lowers regression risk.
