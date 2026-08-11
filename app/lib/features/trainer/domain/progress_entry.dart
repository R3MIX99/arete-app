/// Un registro de peso/medidas/foto de un cliente en una fecha dada, para
/// las gráficas de seguimiento de progreso.
class ProgressEntry {
  const ProgressEntry({
    required this.id,
    required this.clientId,
    required this.trainerId,
    required this.entryDate,
    required this.createdAt,
    this.weightKg,
    this.chestCm,
    this.waistCm,
    this.hipCm,
    this.armCm,
    this.thighCm,
    this.photoPath,
    this.notes,
  });

  final String id;
  final String clientId;
  final String trainerId;
  final DateTime entryDate;
  final DateTime createdAt;
  final double? weightKg;
  final double? chestCm;
  final double? waistCm;
  final double? hipCm;
  final double? armCm;
  final double? thighCm;

  /// Ruta dentro del bucket privado "progress-photos", no una URL. Se
  /// resuelve a una URL firmada al mostrarla.
  final String? photoPath;
  final String? notes;

  bool get hasPhoto => photoPath != null;

  factory ProgressEntry.fromJson(Map<String, dynamic> json) {
    return ProgressEntry(
      id: json['id'] as String,
      clientId: json['client_id'] as String,
      trainerId: json['trainer_id'] as String,
      entryDate: DateTime.parse(json['entry_date'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
      weightKg: (json['weight_kg'] as num?)?.toDouble(),
      chestCm: (json['chest_cm'] as num?)?.toDouble(),
      waistCm: (json['waist_cm'] as num?)?.toDouble(),
      hipCm: (json['hip_cm'] as num?)?.toDouble(),
      armCm: (json['arm_cm'] as num?)?.toDouble(),
      thighCm: (json['thigh_cm'] as num?)?.toDouble(),
      photoPath: json['photo_path'] as String?,
      notes: json['notes'] as String?,
    );
  }
}
