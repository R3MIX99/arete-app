-- Cuentas de demostración para la revisión de Google Play.
--
-- Crea un entrenador y tres clientes con datos de ejemplo (rutinas, programa,
-- historial de sesiones, plan de alimentación y medidas). Usa solo el catálogo
-- global de ejercicios y alimentos.
--
-- Uso (la contraseña no se guarda en el repositorio):
--   psql ... -v ON_ERROR_STOP=1 -v demo_password='...' -1 -f demo-play-review.sql
--
-- Para borrar todo: eliminar los usuarios demo (los datos caen en cascada):
--   delete from auth.users where email like '%.demo@aretia.com.mx';

select set_config('demo.password', :'demo_password', false);

create or replace function pg_temp.demo_exercise(p_name text) returns uuid
language plpgsql as $$
declare v uuid;
begin
  select id into v from public.exercises where name = p_name and trainer_id is null limit 1;
  if v is null then raise exception 'Ejercicio global no encontrado: %', p_name; end if;
  return v;
end $$;

create or replace function pg_temp.demo_food(p_name text) returns uuid
language plpgsql as $$
declare v uuid;
begin
  select id into v from public.foods where name = p_name and trainer_id is null limit 1;
  if v is null then raise exception 'Alimento global no encontrado: %', p_name; end if;
  return v;
end $$;

create or replace function pg_temp.demo_user(p_email text, p_name text, p_role text, p_password text)
returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid();
begin
  if exists (select 1 from auth.users where email = p_email) then
    raise exception 'La cuenta % ya existe', p_email;
  end if;
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v, 'authenticated', 'authenticated', p_email,
    crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_name, 'role', p_role),
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (v::text, v, jsonb_build_object('sub', v::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());
  return v;
end $$;

do $$
declare
  pw text := current_setting('demo.password');
  trainer uuid;
  c_main uuid; c_ana uuid; c_luis uuid;
  r_push uuid; r_pull uuid; r_legs uuid;
  prog uuid; assign uuid;
  plan uuid; b uuid;
  re uuid;
  s record; k int; d int; sess uuid; rt uuid; w numeric;
  idx int;
begin
  trainer := pg_temp.demo_user('entrenador.demo@aretia.com.mx', 'Carlos Herrera', 'trainer', pw);
  c_main  := pg_temp.demo_user('cliente.demo@aretia.com.mx', 'Sofía Ramírez', 'client', pw);
  c_ana   := pg_temp.demo_user('ana.demo@aretia.com.mx', 'Ana Morales', 'client', gen_random_uuid()::text);
  c_luis  := pg_temp.demo_user('luis.demo@aretia.com.mx', 'Luis Ortega', 'client', gen_random_uuid()::text);

  update public.profiles
     set business_name = 'Herrera Training', phone = '5512345678',
         onboarding_completed_at = now()
   where id = trainer;

  update public.profiles
     set trainer_id = trainer, goal = 'gain_muscle', gender = 'female', height_cm = 165,
         weekly_training_frequency = 3, phone = '5587654321', onboarding_completed_at = now()
   where id = c_main;
  update public.profiles
     set trainer_id = trainer, goal = 'lose_weight', gender = 'female', height_cm = 160,
         weekly_training_frequency = 4, onboarding_completed_at = now()
   where id = c_ana;
  update public.profiles
     set trainer_id = trainer, goal = 'maintenance', gender = 'male', height_cm = 178,
         weekly_training_frequency = 3, onboarding_completed_at = now()
   where id = c_luis;

  -- Rutinas ---------------------------------------------------------------
  insert into public.routines (trainer_id, name, description, goal, level)
  values (trainer, 'Empuje: pecho, hombro y tríceps', 'Trabajo de empuje para tren superior.', 'gain_muscle', 'intermediate')
  returning id into r_push;
  insert into public.routines (trainer_id, name, description, goal, level)
  values (trainer, 'Tirón: espalda y bíceps', 'Trabajo de jalón para espalda y brazos.', 'gain_muscle', 'intermediate')
  returning id into r_pull;
  insert into public.routines (trainer_id, name, description, goal, level)
  values (trainer, 'Pierna y glúteo', 'Sesión completa de tren inferior.', 'gain_muscle', 'intermediate')
  returning id into r_legs;

  -- (rutina, ejercicio, orden, notas, series [reps_min, reps_max, peso, descanso])
  for s in
    select * from (values
      (r_push, 'Press de banca con barra',              1, 'Baja controlado y sube con fuerza.',         array[array[10,12,30],array[8,10,35],array[6,8,40]]),
      (r_push, 'Press inclinado con mancuernas',        2, null::text,                                   array[array[10,12,12],array[10,12,14],array[8,10,16]]),
      (r_push, 'Elevaciones laterales con mancuernas',  3, 'Sin balanceo.',                              array[array[12,15,6],array[12,15,6],array[12,15,8]]),
      (r_push, 'Extensión de tríceps en polea',         4, null::text,                                   array[array[12,15,20],array[12,15,22],array[10,12,25]]),
      (r_pull, 'Jalón al pecho en polea',               1, 'Lleva la barra al pecho alto.',              array[array[10,12,35],array[10,12,40],array[8,10,45]]),
      (r_pull, 'Remo con mancuerna a un brazo',         2, null::text,                                   array[array[10,12,14],array[10,12,16],array[8,10,18]]),
      (r_pull, 'Face pull en polea',                    3, null::text,                                   array[array[15,15,15],array[15,15,17],array[12,15,20]]),
      (r_pull, 'Curl de bíceps con barra',              4, 'Codos pegados al cuerpo.',                   array[array[10,12,15],array[10,12,17],array[8,10,20]]),
      (r_legs, 'Sentadilla trasera con barra',          1, 'Profundidad hasta paralelo.',                array[array[10,12,40],array[8,10,50],array[6,8,60]]),
      (r_legs, 'Prensa de piernas',                     2, null::text,                                   array[array[12,15,80],array[10,12,100],array[10,12,110]]),
      (r_legs, 'Hip thrust con barra',                  3, 'Pausa de un segundo arriba.',                array[array[10,12,50],array[10,12,60],array[8,10,70]]),
      (r_legs, 'Curl femoral en máquina',               4, null::text,                                   array[array[12,15,25],array[12,15,30],array[10,12,35]])
    ) as t(routine_id, ex_name, ord, note, sets)
  loop
    insert into public.routine_exercises (routine_id, exercise_id, order_index, notes)
    values (s.routine_id, pg_temp.demo_exercise(s.ex_name), s.ord, s.note)
    returning id into re;
    for k in 1 .. array_length(s.sets, 1) loop
      insert into public.routine_exercise_sets
        (routine_exercise_id, set_number, target_reps_min, target_reps_max, suggested_weight, rest_seconds)
      values (re, k, s.sets[k][1], s.sets[k][2], s.sets[k][3], 90);
    end loop;
  end loop;

  -- Programa de 4 semanas -------------------------------------------------
  insert into public.programs (trainer_id, name, description, duration_weeks, goal)
  values (trainer, 'Fuerza y masa: 4 semanas', 'Tres sesiones por semana: empuje, tirón y pierna.', 4, 'gain_muscle')
  returning id into prog;
  for k in 1 .. 4 loop
    insert into public.program_routines (program_id, routine_id, week_number, day_of_week) values
      (prog, r_push, k, 1), (prog, r_pull, k, 3), (prog, r_legs, k, 5);
  end loop;

  insert into public.client_assignments (trainer_id, client_id, program_id, start_date)
  values (trainer, c_main, prog, current_date - 14)
  returning id into assign;
  insert into public.client_assignments (trainer_id, client_id, program_id, start_date)
  values (trainer, c_luis, prog, current_date - 7);

  -- Historial de sesiones de la clienta principal ---------------------------
  idx := 0;
  for d in select unnest(array[-14, -12, -10, -7, -5, -3]) loop
    idx := idx + 1;
    rt := case ((idx - 1) % 3) when 0 then r_push when 1 then r_pull else r_legs end;
    insert into public.client_sessions
      (client_id, assignment_id, routine_id, session_date, started_at, finished_at,
       duration_seconds, status, difficulty_level, rating_stars)
    values (c_main, assign, rt, current_date + d,
            (current_date + d)::timestamp + time '18:00', (current_date + d)::timestamp + time '18:55',
            3300, 'completed', 6, 5)
    returning id into sess;

    for s in
      select rs.id as set_id, rs.set_number, rs.target_reps_min, rs.suggested_weight, e.exercise_id
        from public.routine_exercises e
        join public.routine_exercise_sets rs on rs.routine_exercise_id = e.id
       where e.routine_id = rt
    loop
      w := round(s.suggested_weight * (0.9 + 0.03 * idx) * 2) / 2;
      insert into public.client_set_logs
        (routine_exercise_set_id, client_id, session_date, actual_reps, actual_weight,
         completed_at, session_id, is_completed, exercise_id, set_number)
      values (s.set_id, c_main, current_date + d, s.target_reps_min, w,
              (current_date + d)::timestamp + time '18:30', sess, true, s.exercise_id, s.set_number);
    end loop;
  end loop;

  -- Medidas de progreso semanales --------------------------------------------
  for k in 0 .. 4 loop
    insert into public.progress_measurements (client_id, trainer_id, entry_date, metric_key, value) values
      (c_main, trainer, current_date - (28 - k * 7), 'weight_kg', 60.5 + k * 0.4),
      (c_main, trainer, current_date - (28 - k * 7), 'waist_cm', 72 - k * 0.5),
      (c_main, trainer, current_date - (28 - k * 7), 'hip_cm', 96 + k * 0.3);
  end loop;

  -- Plan de alimentación ---------------------------------------------------
  insert into public.diet_plans (trainer_id, name, goal_label, daily_calorie_target)
  values (trainer, 'Plan de volumen limpio', 'Ganar músculo', 2200)
  returning id into plan;

  for s in
    select * from (values
      (0, 'Desayuno', array['Huevo cocido','Avena en hojuelas (cruda)','Plátano'],            array[150, 50, 120]),
      (1, 'Colación', array['Yogurt griego natural entero','Almendras'],                       array[170, 20]),
      (2, 'Comida',   array['Pechuga de pollo sin piel (cocida)','Arroz integral (cocido)','Brócoli cocido','Aguacate'], array[180, 160, 100, 50]),
      (3, 'Cena',     array['Salmón (cocido)','Camote (cocido)','Espinaca (cruda)'],           array[150, 150, 60])
    ) as t(ord, block_name, foods, grams)
  loop
    insert into public.diet_plan_blocks (diet_plan_id, name, order_index)
    values (plan, s.block_name, s.ord) returning id into b;
    for k in 1 .. array_length(s.foods, 1) loop
      insert into public.diet_plan_meals (diet_plan_id, block_id, order_index, food_id, quantity_grams)
      values (plan, b, k, pg_temp.demo_food(s.foods[k]), s.grams[k]);
    end loop;
  end loop;

  insert into public.diet_plan_assignments (trainer_id, client_id, diet_plan_id, start_date, target_daily_calories)
  values (trainer, c_main, plan, current_date - 14, 2200);
end $$;
