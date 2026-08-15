-- trainer_id null identifica los ejercicios esenciales de Areté, igual
-- que ya funciona en foods/dishes.
alter table public.exercises alter column trainer_id drop not null;

-- Comunidad de la biblioteca de ejercicios, mismo patrón que ya existe
-- para foods/dishes: forked_from rastrea de qué ejercicio se copió, y
-- cualquier entrenador (o Areté, con trainer_id null) puede ver todos
-- los ejercicios — cada quien solo puede editar/borrar los suyos.

alter table public.exercises
  add column forked_from uuid references public.exercises(id) on delete set null;

comment on column public.exercises.forked_from is 'Ejercicio del que se copió esta fila (edición de un ejercicio esencial o de otro entrenador crea una copia propia en vez de modificar el original).';

drop policy if exists exercises_select_own on public.exercises;

create policy exercises_select_all_trainers on public.exercises
  for select to authenticated
  using (current_user_role() = any (array['trainer'::user_role, 'superadmin'::user_role]));

comment on policy exercises_select_all_trainers on public.exercises is 'Cualquier entrenador ve la biblioteca completa (la suya, la de otros entrenadores y los esenciales de Areté) — pestaña Comunidad.';

-- Esenciales de Areté (trainer_id null): biblioteca base cubriendo los
-- principales grupos musculares, sin video por ahora.
insert into public.exercises (trainer_id, name, muscle_group, equipment, description, video_url) values
  (null, 'Press de banca con barra', 'chest', 'barbell', 'Acostado en el banco, baja la barra de forma controlada hasta rozar el pecho y empuja hasta extender los brazos sin bloquear los codos.', null),
  (null, 'Press inclinado con mancuernas', 'chest', 'dumbbell', 'En banco inclinado a 30-45°, empuja las mancuernas hacia arriba enfocando la parte superior del pecho.', null),
  (null, 'Aperturas con mancuernas', 'chest', 'dumbbell', 'Acostado en banco plano, con los codos ligeramente flexionados, abre y cierra los brazos en arco controlando el descenso.', null),
  (null, 'Fondos en paralelas', 'chest', 'bodyweight', 'Inclina el torso hacia adelante para enfatizar pecho; baja hasta sentir estiramiento y empuja de regreso arriba.', null),
  (null, 'Dominadas', 'back', 'bodyweight', 'Cuelga de la barra con agarre prono y tira hasta que la barbilla pase la barra, controlando el descenso.', null),
  (null, 'Remo con barra', 'back', 'barbell', 'Con el torso inclinado hacia adelante, tira de la barra hacia el abdomen manteniendo la espalda recta.', null),
  (null, 'Jalón al pecho en polea', 'back', 'cable', 'Sentado en la máquina, tira de la barra hacia el pecho llevando los codos hacia abajo y atrás.', null),
  (null, 'Remo con mancuerna a un brazo', 'back', 'dumbbell', 'Apoya una rodilla y mano en el banco; tira de la mancuerna hacia la cadera manteniendo la espalda neutra.', null),
  (null, 'Press militar con barra', 'shoulders', 'barbell', 'De pie o sentado, empuja la barra desde los hombros hasta la extensión completa de los brazos sobre la cabeza.', null),
  (null, 'Elevaciones laterales con mancuernas', 'shoulders', 'dumbbell', 'De pie, eleva los brazos hacia los lados hasta la altura de los hombros con un ligero quiebre en el codo.', null),
  (null, 'Press Arnold', 'shoulders', 'dumbbell', 'Comienza con las palmas hacia ti y rota las muñecas mientras empujas las mancuernas hacia arriba.', null),
  (null, 'Face pull en polea', 'shoulders', 'cable', 'Con la polea a la altura de la cara, tira de la cuerda hacia el rostro separando las manos al final del recorrido.', null),
  (null, 'Curl de bíceps con barra', 'arms', 'barbell', 'De pie, flexiona los codos llevando la barra hacia los hombros sin balancear el torso.', null),
  (null, 'Curl martillo con mancuernas', 'arms', 'dumbbell', 'Con agarre neutro (palmas encontradas), flexiona los codos alternando o al mismo tiempo.', null),
  (null, 'Extensión de tríceps en polea', 'arms', 'cable', 'Con los codos pegados al torso, extiende los brazos hacia abajo hasta la extensión completa.', null),
  (null, 'Fondos de tríceps en banco', 'arms', 'bodyweight', 'Apoya las manos en el borde de un banco detrás de ti y baja el cuerpo flexionando los codos.', null),
  (null, 'Sentadilla trasera con barra', 'legs', 'barbell', 'Con la barra sobre los trapecios, baja las caderas hacia atrás y abajo manteniendo el pecho erguido.', null),
  (null, 'Peso muerto rumano', 'legs', 'barbell', 'Con las rodillas ligeramente flexionadas, baja la barra pegada a las piernas manteniendo la espalda recta.', null),
  (null, 'Prensa de piernas', 'legs', 'machine', 'Sentado en la máquina, empuja la plataforma extendiendo las piernas sin bloquear las rodillas.', null),
  (null, 'Zancadas con mancuernas', 'legs', 'dumbbell', 'Da un paso al frente y baja la rodilla trasera hacia el piso, alternando piernas.', null),
  (null, 'Extensión de cuádriceps en máquina', 'legs', 'machine', 'Sentado en la máquina, extiende las piernas contra la resistencia hasta casi bloquear las rodillas.', null),
  (null, 'Curl femoral en máquina', 'legs', 'machine', 'Acostado o sentado en la máquina, flexiona las rodillas llevando el rodillo hacia los glúteos.', null),
  (null, 'Elevación de talones', 'legs', 'machine', 'De pie en la máquina, eleva los talones lo más alto posible y baja de forma controlada.', null),
  (null, 'Plancha abdominal', 'core', 'bodyweight', 'Apoya antebrazos y puntas de los pies, mantén el cuerpo en línea recta contrayendo el abdomen.', null),
  (null, 'Elevación de piernas colgado', 'core', 'bodyweight', 'Colgado de la barra, eleva las piernas (rectas o flexionadas) hacia el pecho sin balancear el cuerpo.', null),
  (null, 'Crunch en polea', 'core', 'cable', 'De rodillas frente a la polea alta, flexiona el torso hacia abajo contrayendo el abdomen.', null),
  (null, 'Caminadora', 'cardio', 'machine', 'Caminata o trote a ritmo e inclinación constantes durante el tiempo indicado.', null),
  (null, 'Bicicleta estática', 'cardio', 'machine', 'Pedaleo a ritmo constante o por intervalos según el nivel indicado.', null),
  (null, 'Cuerda (salto)', 'cardio', 'other', 'Saltos continuos de cuerda a ritmo constante durante el tiempo indicado.', null),
  (null, 'Burpees', 'full_body', 'bodyweight', 'De pie, baja a sentadilla, extiende los pies hacia atrás en plancha, regresa y salta con los brazos arriba.', null);
