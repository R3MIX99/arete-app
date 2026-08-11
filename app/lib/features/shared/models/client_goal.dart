/// Objetivo principal de un cliente. Refleja el enum `client_goal` de
/// Supabase; los valores crudos deben coincidir exactamente.
enum ClientGoal {
  loseWeight('lose_weight', 'Perder peso'),
  gainMuscle('gain_muscle', 'Ganar músculo'),
  maintenance('maintenance', 'Mantenimiento'),
  performance('performance', 'Rendimiento');

  const ClientGoal(this.raw, this.label);

  final String raw;
  final String label;

  static ClientGoal? fromRaw(String? raw) {
    if (raw == null) return null;
    for (final goal in ClientGoal.values) {
      if (goal.raw == raw) return goal;
    }
    return null;
  }
}

/// Estado de un cliente. La baja siempre es lógica: un cliente inactivo
/// conserva su historial, nunca se borra.
enum ClientStatus {
  active('active', 'Activo'),
  inactive('inactive', 'Inactivo');

  const ClientStatus(this.raw, this.label);

  final String raw;
  final String label;

  static ClientStatus fromRaw(String? raw) {
    return raw == 'inactive' ? ClientStatus.inactive : ClientStatus.active;
  }
}
