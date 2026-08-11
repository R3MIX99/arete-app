import '../../../../core/utils/youtube.dart';

/// Validaciones de formulario para los módulos de biblioteca de ejercicios
/// y rutinas. Mensajes en español, sin tecnicismos.
class CatalogValidators {
  const CatalogValidators._();

  static String? exerciseName(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) return 'Ingresa el nombre del ejercicio.';
    return null;
  }

  static String? routineName(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) return 'Ingresa el nombre de la rutina.';
    return null;
  }

  /// El video es opcional; si se cargó algo, tiene que ser un enlace de
  /// YouTube reconocible (la base de datos también lo valida, pero avisar
  /// antes de guardar ahorra un viaje al servidor).
  static String? youtubeUrl(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) return null;
    if (!isYoutubeUrl(trimmed)) {
      return 'Ingresa un enlace válido de YouTube.';
    }
    return null;
  }

  /// Un entero positivo (por ejemplo, repeticiones o número de serie).
  static String? positiveInt(String? value, {required String label}) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) return 'Ingresa $label.';
    final parsed = int.tryParse(trimmed);
    if (parsed == null || parsed <= 0) return 'Ingresa un número válido.';
    return null;
  }

  /// Un entero igual o mayor a cero (por ejemplo, segundos de descanso).
  static String? nonNegativeInt(String? value, {required String label}) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) return 'Ingresa $label.';
    final parsed = int.tryParse(trimmed);
    if (parsed == null || parsed < 0) return 'Ingresa un número válido.';
    return null;
  }

  /// Peso sugerido: opcional, pero si se carga debe ser un número válido y
  /// no negativo.
  static String? optionalWeight(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) return null;
    final parsed = double.tryParse(trimmed.replaceAll(',', '.'));
    if (parsed == null || parsed < 0) return 'Ingresa un peso válido.';
    return null;
  }
}
