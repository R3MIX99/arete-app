-- Al terminar una rutina, el cliente puede dejar una reseña rápida de
-- la sesión: qué tan difícil le pareció, y — según sea cardio o fuerza —
-- calorías/distancia/pasos, o una calificación de estrellas, más un
-- comentario libre para su entrenador.
alter table public.client_sessions
  add column difficulty_level smallint check (difficulty_level between 1 and 10),
  add column rating_stars smallint check (rating_stars between 1 and 5),
  add column calories_burned numeric check (calories_burned >= 0),
  add column distance_km numeric check (distance_km >= 0),
  add column steps_count integer check (steps_count >= 0),
  add column client_comment text;

comment on column public.client_sessions.difficulty_level is 'Qué tan difícil le pareció la sesión al cliente, del 1 al 10.';
comment on column public.client_sessions.rating_stars is 'Calificación de la rutina de fuerza en estrellas (1-5) que da el cliente al terminarla.';
comment on column public.client_sessions.calories_burned is 'Calorías quemadas que el cliente capturó al terminar una sesión de cardio (opcional, viene de la máquina).';
comment on column public.client_sessions.distance_km is 'Distancia recorrida en km que el cliente capturó al terminar una sesión de cardio (opcional).';
comment on column public.client_sessions.steps_count is 'Pasos que el cliente capturó al terminar una sesión de cardio (opcional).';
comment on column public.client_sessions.client_comment is 'Mensaje libre del cliente para su entrenador sobre cómo le fue en la sesión.';
