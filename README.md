# Protocolos de Limpieza - Base Tecnica

Aplicacion web interna para consultar y administrar protocolos de limpieza de equipos ortopedicos.

## Stack

- Angular 21 (Standalone + Signals)
- Angular Material
- Supabase (Postgres + Storage + Auth)
- PWA (Angular Service Worker)
- i18n con `@ngx-translate/core` (ES/EN)

## Requisitos

- Node.js LTS recomendado (22.x)
- Angular CLI 21+

## Configuracion local

1. Instalar dependencias:

```bash
npm install
```

2. Configurar variables de Supabase en `src/environments/environment.development.ts`:

```ts
export const environment = {
  production: false,
  supabaseUrl: 'https://your-project-ref.supabase.co',
  supabaseAnonKey: 'your-supabase-anon-key',
};
```

3. Crear schema y politicas en Supabase ejecutando:

- `supabase/sql/initial_schema.sql`
- Si ya tenias una base creada con el esquema anterior, aplicar tambien: `supabase/sql/add_brand_gallery_history.sql`

4. Levantar app local:

```bash
npm start
```

## Usuarios y perfiles

- Visitante (sin login): ve listado y detalle de protocolos.
- Biomedico (autenticado): accede a `/admin` para CRUD.

Creacion de usuarios biomedicos:

- Desde Supabase Dashboard -> Authentication -> Invite user.

## Estructura base del proyecto

- `src/app/core/services` -> Auth, Supabase, storage y operaciones CRUD.
- `src/app/core/guards/admin.guard.ts` -> proteccion de rutas admin.
- `src/app/features/public` -> listado y detalle para visitantes.
- `src/app/features/admin` -> login, dashboard y formulario admin.
- `public/i18n` -> traducciones ES/EN.
- `supabase/sql/initial_schema.sql` -> modelo de datos + RLS + policies storage.
- `supabase/sql/add_brand_gallery_history.sql` -> migracion incremental para marcas, fotos multiples e historial.

## Flujo esperado implementado en esta base

- App publica con busqueda de equipos.
- Detalle de equipo con galeria de fotos, descripcion, pasos, imagenes por paso y video.
- Panel admin con login y CRUD de equipos/protocolos.
- Subida de imagenes y videos a Supabase Storage.

## Pendiente para siguientes iteraciones

- Mejoras UX y diseno visual final.
- Hardening adicional de politicas segun reglas corporativas.
- Observabilidad (errores, auditoria de cambios).
