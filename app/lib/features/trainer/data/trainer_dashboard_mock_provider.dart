import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/trainer_dashboard_summary.dart';

/// Datos de ejemplo para el dashboard del entrenador.
///
/// PROVISIONAL: esta fase solo construye la interfaz del panel de
/// entrenador; la consulta real a Supabase (conteo de clientes con
/// `trainer_id` propio, rutinas creadas, sesiones del calendario, última
/// actividad registrada por cliente) se conecta en una fase posterior.
/// Ningún otro archivo debe leer estos datos como reales.
final trainerDashboardMockProvider = Provider<TrainerDashboardSummary>((ref) {
  return const TrainerDashboardSummary(
    activeClientsCount: 12,
    routinesCreatedCount: 27,
    upcomingSessionsToday: [
      UpcomingSession(
        clientName: 'Marcos Ibarra',
        time: TimeOfDay(hour: 9, minute: 0),
        sessionType: 'Rutina de fuerza',
      ),
      UpcomingSession(
        clientName: 'Daniela Reyes',
        time: TimeOfDay(hour: 11, minute: 30),
        sessionType: 'Seguimiento de progreso',
      ),
      UpcomingSession(
        clientName: 'Luis Fonseca',
        time: TimeOfDay(hour: 17, minute: 0),
        sessionType: 'Evaluación inicial',
      ),
    ],
    inactiveClientAlerts: [
      InactiveClientAlert(clientName: 'Paula Medina', daysSinceLastActivity: 9),
      InactiveClientAlert(clientName: 'Rodrigo Salas', daysSinceLastActivity: 14),
    ],
  );
});
