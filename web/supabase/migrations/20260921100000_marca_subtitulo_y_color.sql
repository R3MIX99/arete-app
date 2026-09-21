-- Marca propia del entrenador: subtítulo bajo el nombre del negocio (p. ej.
-- "By Codeal.ai") y color de acento de la app de sus clientes.
--
-- Ambos son opcionales: sin subtítulo no se muestra nada, y sin color se usa
-- el índigo de Aretia.

alter table public.profiles
  add column if not exists business_tagline text,
  add column if not exists brand_color text;

alter table public.profiles
  drop constraint if exists profiles_business_tagline_length,
  add constraint profiles_business_tagline_length
    check (business_tagline is null or char_length(business_tagline) <= 60);

alter table public.profiles
  drop constraint if exists profiles_brand_color_hex,
  add constraint profiles_brand_color_hex
    check (brand_color is null or brand_color ~ '^#[0-9a-fA-F]{6}$');
