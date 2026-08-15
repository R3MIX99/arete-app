-- Foto opcional por bloque de un plan nutricional (ej. "Almuerzo") — para
-- cuando el bloque no usa un platillo con su propia imagen, sino
-- alimentos sueltos, y el entrenador quiere mostrarle al cliente una
-- foto de referencia de qué preparar. Vive en el mismo bucket
-- "food-images" que ya usan foods/dishes.
alter table public.diet_plan_blocks add column image_path text;
