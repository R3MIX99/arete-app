// Prueba de datos: fija la lista de módulos del panel de entrenador para
// que un cambio accidental (ruta duplicada, módulo faltante) se note de
// inmediato en vez de descubrirse navegando la app a mano.

import 'package:flutter_test/flutter_test.dart';

import 'package:arete/core/router/app_routes.dart';
import 'package:arete/features/trainer/presentation/navigation/trainer_nav_item.dart';

void main() {
  group('TrainerNavItem.all', () {
    test('tiene los 9 módulos pedidos, en orden', () {
      expect(TrainerNavItem.all.map((item) => item.label), [
        'Dashboard',
        'Clientes',
        'Rutinas',
        'Biblioteca de ejercicios',
        'Programas',
        'Planes nutricionales',
        'Calendario',
        'Seguimiento de progreso',
        'Configuración',
      ]);
    });

    test('todas las rutas son únicas', () {
      final paths = TrainerNavItem.all.map((item) => item.path).toList();
      expect(paths.toSet().length, paths.length);
    });

    test('el primer módulo es el dashboard, que es la ruta de inicio del rol', () {
      expect(TrainerNavItem.all.first.path, AppRoutes.trainerHome);
    });
  });
}
