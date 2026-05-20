alter table if exists public.fichas_tecnicas enable row level security;
alter table if exists public.esterilizacion_equipo enable row level security;

drop policy if exists "Public read fichas tecnicas" on public.fichas_tecnicas;
create policy "Public read fichas tecnicas"
on public.fichas_tecnicas
for select
using (true);

drop policy if exists "Authenticated write fichas tecnicas" on public.fichas_tecnicas;
create policy "Authenticated write fichas tecnicas"
on public.fichas_tecnicas
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public read esterilizacion equipo" on public.esterilizacion_equipo;
create policy "Public read esterilizacion equipo"
on public.esterilizacion_equipo
for select
using (true);

drop policy if exists "Authenticated write esterilizacion equipo" on public.esterilizacion_equipo;
create policy "Authenticated write esterilizacion equipo"
on public.esterilizacion_equipo
for all
to authenticated
using (true)
with check (true);
