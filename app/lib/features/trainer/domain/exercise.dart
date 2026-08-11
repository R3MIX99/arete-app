/// Grupo muscular principal que trabaja un ejercicio. Refleja el enum
/// `exercise_muscle_group` de Supabase; los valores crudos deben coincidir
/// exactamente.
enum MuscleGroup {
  chest('chest', 'Pecho'),
  back('back', 'Espalda'),
  shoulders('shoulders', 'Hombros'),
  arms('arms', 'Brazos'),
  legs('legs', 'Piernas'),
  core('core', 'Core'),
  cardio('cardio', 'Cardio'),
  fullBody('full_body', 'Cuerpo completo');

  const MuscleGroup(this.raw, this.label);

  final String raw;
  final String label;

  static MuscleGroup? fromRaw(String? raw) {
    if (raw == null) return null;
    for (final group in MuscleGroup.values) {
      if (group.raw == raw) return group;
    }
    return null;
  }
}

/// Equipo necesario para hacer el ejercicio. Refleja el enum
/// `exercise_equipment` de Supabase.
enum Equipment {
  bodyweight('bodyweight', 'Peso corporal'),
  barbell('barbell', 'Barra'),
  dumbbell('dumbbell', 'Mancuernas'),
  machine('machine', 'Máquina'),
  cable('cable', 'Polea'),
  kettlebell('kettlebell', 'Kettlebell'),
  resistanceBand('resistance_band', 'Banda de resistencia'),
  bench('bench', 'Banco'),
  other('other', 'Otro');

  const Equipment(this.raw, this.label);

  final String raw;
  final String label;

  static Equipment fromRaw(String? raw) {
    for (final equipment in Equipment.values) {
      if (equipment.raw == raw) return equipment;
    }
    return Equipment.other;
  }
}

/// Ejercicio de la biblioteca de un entrenador.
class Exercise {
  const Exercise({
    required this.id,
    required this.trainerId,
    required this.name,
    required this.muscleGroup,
    required this.equipment,
    required this.createdAt,
    this.description,
    this.videoUrl,
  });

  final String id;
  final String trainerId;
  final String name;
  final MuscleGroup muscleGroup;
  final Equipment equipment;
  final DateTime createdAt;
  final String? description;
  final String? videoUrl;

  factory Exercise.fromJson(Map<String, dynamic> json) {
    return Exercise(
      id: json['id'] as String,
      trainerId: json['trainer_id'] as String,
      name: json['name'] as String,
      muscleGroup: MuscleGroup.fromRaw(json['muscle_group'] as String?) ??
          MuscleGroup.fullBody,
      equipment: Equipment.fromRaw(json['equipment'] as String?),
      createdAt: DateTime.parse(json['created_at'] as String),
      description: json['description'] as String?,
      videoUrl: json['video_url'] as String?,
    );
  }
}
