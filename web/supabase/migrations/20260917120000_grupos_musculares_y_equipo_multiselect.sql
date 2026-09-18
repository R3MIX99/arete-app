-- Amplía el catálogo de grupos musculares y equipo, y convierte ambos
-- campos de single-select a multi-select (un ejercicio puede trabajar
-- varios grupos musculares a la vez, por ejemplo "Glúteos + femorales",
-- y requerir varias piezas de equipo).

-- 1. Nuevos valores de grupo muscular (más granulares que los 8 originales,
--    tomados de una biblioteca real de ejercicios que el cliente recibió de
--    un entrenador externo).
alter type public.exercise_muscle_group add value if not exists 'gluteos';
alter type public.exercise_muscle_group add value if not exists 'gluteo_medio';
alter type public.exercise_muscle_group add value if not exists 'femorales';
alter type public.exercise_muscle_group add value if not exists 'cuadriceps';
alter type public.exercise_muscle_group add value if not exists 'pantorrillas';
alter type public.exercise_muscle_group add value if not exists 'aductores';
alter type public.exercise_muscle_group add value if not exists 'abdomen';
alter type public.exercise_muscle_group add value if not exists 'oblicuos';
alter type public.exercise_muscle_group add value if not exists 'pecho_superior';
alter type public.exercise_muscle_group add value if not exists 'pecho_inferior';
alter type public.exercise_muscle_group add value if not exists 'dorsales';
alter type public.exercise_muscle_group add value if not exists 'trapecio';
alter type public.exercise_muscle_group add value if not exists 'deltoide_anterior';
alter type public.exercise_muscle_group add value if not exists 'deltoide_lateral';
alter type public.exercise_muscle_group add value if not exists 'deltoide_posterior';
alter type public.exercise_muscle_group add value if not exists 'biceps';
alter type public.exercise_muscle_group add value if not exists 'triceps';
alter type public.exercise_muscle_group add value if not exists 'braquial';
alter type public.exercise_muscle_group add value if not exists 'tibial_anterior';
alter type public.exercise_muscle_group add value if not exists 'agarre';

-- 2. Nuevos valores de equipo.
alter type public.exercise_equipment add value if not exists 'pull_up_bar';
alter type public.exercise_equipment add value if not exists 'cardio_machine';
alter type public.exercise_equipment add value if not exists 'disc';
alter type public.exercise_equipment add value if not exists 'landmine';
alter type public.exercise_equipment add value if not exists 'fitball';
alter type public.exercise_equipment add value if not exists 'ab_wheel';
alter type public.exercise_equipment add value if not exists 'smith_machine';
