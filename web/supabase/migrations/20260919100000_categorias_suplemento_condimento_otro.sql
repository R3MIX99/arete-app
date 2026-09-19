-- Categorias nuevas de alimentos que trae la biblioteca real de un
-- entrenador (Excel de alimentos): suplementos, condimentos y otros.
-- Las sustituciones de alimentos se hacen dentro de la misma categoria, asi
-- que estos alimentos no deben mezclarse con proteinas, frutas, etc.
insert into public.food_categories (slug, name, sort_order) values
  ('supplement', 'Suplemento', 9),
  ('condiment', 'Condimento', 10),
  ('other', 'Otro', 11)
on conflict (slug) do nothing;
