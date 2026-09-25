-- El sitio público (aretia.com.mx) muestra los precios sin iniciar sesión.
-- Solo se exponen los planes activos; los inactivos siguen visibles solo
-- para usuarios autenticados (política plans_select_authenticated).

drop policy if exists plans_select_public_active on public.plans;
create policy plans_select_public_active on public.plans
  for select to anon
  using (is_active);
