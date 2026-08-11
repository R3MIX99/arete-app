// Los íconos ya se rompieron dos veces sin que ninguna prueba lo notara
// (fuente sin los glifos, y despues un flag de compilacion que impedia
// renderizarlos). Estas pruebas fijan lo que sí se puede verificar de
// forma automatica: que cada ruta SVG exista, sea sintacticamente valida
// y se dibuje sin lanzar excepciones.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:arete/core/theme/app_icon_paths.dart';
import 'package:arete/core/widgets/app_icon.dart';
import 'package:arete/features/trainer/presentation/navigation/trainer_nav_item.dart';

void main() {
  group('AppIconPaths', () {
    test('los 9 módulos de navegación tienen una ruta SVG no vacía', () {
      for (final item in TrainerNavItem.all) {
        expect(
          item.icon.trim(),
          isNotEmpty,
          reason: 'El módulo "${item.label}" no tiene ícono.',
        );
      }
    });

    test('cada módulo tiene un ícono distinto', () {
      final icons = TrainerNavItem.all.map((item) => item.icon).toList();
      expect(icons.toSet().length, icons.length);
    });

    test('las rutas empiezan con un comando de movimiento SVG válido', () {
      // Toda ruta SVG bien formada arranca posicionando el lápiz con M o m.
      for (final item in TrainerNavItem.all) {
        expect(
          item.icon.startsWith('M') || item.icon.startsWith('m'),
          isTrue,
          reason: 'La ruta de "${item.label}" no parece un path SVG válido.',
        );
      }
    });

    test('la ruta de dashboard es la oficial de Material Symbols', () {
      // Valor copiado del origen oficial de Google. Si alguien lo edita a
      // mano o el generador se rompe, esta prueba lo detecta.
      expect(
        AppIconPaths.dashboard,
        'M520-600v-240h320v240H520ZM120-440v-400h320v400H120Zm400 320v-400h320v400H520Z'
        'm-400 0v-240h320v240H120Zm80-400h160v-240H200v240Zm400 320h160v-240H600v240Z'
        'm0-480h160v-80H600v80ZM200-200h160v-80H200v80Zm160-320Zm240-160Zm0 240ZM360-280Z',
      );
    });
  });

  group('AppIcon', () {
    testWidgets('se dibuja sin lanzar excepciones', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AppIcon(AppIconPaths.dashboard, size: 24),
          ),
        ),
      );

      expect(find.byType(AppIcon), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('dibuja los 9 íconos de navegación sin excepciones', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                for (final item in TrainerNavItem.all)
                  AppIcon(item.icon, size: 24),
              ],
            ),
          ),
        ),
      );

      expect(find.byType(AppIcon), findsNWidgets(TrainerNavItem.all.length));
      expect(tester.takeException(), isNull);
    });
  });
}
