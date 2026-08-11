/// Plan de suscripción del entrenador. Solo visualización por ahora
/// (Fase 6); la lógica de pago real y el cambio de plan se conectan en
/// la Fase 15.
enum SubscriptionPlan {
  free('free', 'Gratis'),
  pro('pro', 'Pro'),
  studio('studio', 'Estudio');

  const SubscriptionPlan(this.raw, this.label);

  final String raw;
  final String label;

  static SubscriptionPlan fromRaw(String? raw) {
    for (final plan in SubscriptionPlan.values) {
      if (plan.raw == raw) return plan;
    }
    return SubscriptionPlan.free;
  }
}

enum SubscriptionStatus {
  active('active', 'Activo'),
  trialing('trialing', 'Período de prueba'),
  pastDue('past_due', 'Pago pendiente'),
  canceled('canceled', 'Cancelado');

  const SubscriptionStatus(this.raw, this.label);

  final String raw;
  final String label;

  static SubscriptionStatus fromRaw(String? raw) {
    for (final status in SubscriptionStatus.values) {
      if (status.raw == raw) return status;
    }
    return SubscriptionStatus.active;
  }
}
