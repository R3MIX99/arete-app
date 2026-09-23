-- Nuevos perímetros de medidas, a partir de la ficha que un entrenador
-- comparte con sus clientes (cefálico, mitad de brazo relajado/contraído,
-- muñeca, mesoesternal, umbilical, muslo a 1cm, tobillo). Los que ya
-- existían y coinciden con esa ficha (cuello, cintura, cadera, antebrazo,
-- pantorrilla) solo cambian de nombre en el código, no de clave.

alter table public.progress_measurements
  drop constraint if exists progress_measurements_metric_key_check,
  add constraint progress_measurements_metric_key_check
    check (metric_key = any (array[
      'weight_kg', 'chest_cm', 'waist_cm', 'hip_cm', 'arm_cm', 'thigh_cm',
      'neck_cm', 'shoulder_cm', 'calf_cm', 'forearm_cm',
      'cephalic_cm', 'bicep_flexed_cm', 'wrist_cm', 'mesosternal_cm',
      'umbilical_cm', 'thigh_1cm_cm', 'ankle_cm'
    ]));
