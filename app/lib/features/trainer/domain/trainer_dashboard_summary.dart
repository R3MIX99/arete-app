import 'package:flutter/material.dart';

/// Una sesión programada para hoy con un cliente.
class UpcomingSession {
  const UpcomingSession({
    required this.clientName,
    required this.time,
    required this.sessionType,
  });

  final String clientName;
  final TimeOfDay time;
  final String sessionType;
}

/// Alerta de un cliente sin actividad reciente.
class InactiveClientAlert {
  const InactiveClientAlert({
    required this.clientName,
    required this.daysSinceLastActivity,
  });

  final String clientName;
  final int daysSinceLastActivity;
}

/// Resumen que arma el dashboard del entrenador.
class TrainerDashboardSummary {
  const TrainerDashboardSummary({
    required this.activeClientsCount,
    required this.routinesCreatedCount,
    required this.upcomingSessionsToday,
    required this.inactiveClientAlerts,
  });

  final int activeClientsCount;
  final int routinesCreatedCount;
  final List<UpcomingSession> upcomingSessionsToday;
  final List<InactiveClientAlert> inactiveClientAlerts;
}
