alter table public.equipos
  add column if not exists estado_mantenimiento text not null default 'pendiente';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'equipos_estado_mantenimiento_valid'
  ) then
    alter table public.equipos
      add constraint equipos_estado_mantenimiento_valid
      check (estado_mantenimiento in ('pendiente', 'limpio', 'en_proceso'));
  end if;
end;
$$;

create index if not exists equipos_estado_mantenimiento_idx
  on public.equipos (estado_mantenimiento);
