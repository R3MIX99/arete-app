// Prueba de humo básica para esta fase de base del proyecto: confirma que
// un componente del sistema de diseño (AppCard) se puede construir dentro
// del theme de la app sin lanzar errores. Las pruebas de flujos reales
// (login, enrutamiento por rol, etc.) se agregan junto con cada feature.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:arete/core/theme/app_theme.dart';
import 'package:arete/features/shared/widgets/app_card.dart';

void main() {
  testWidgets('AppCard se construye con el theme claro de Areté', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: AppCard(child: Text('Areté')),
        ),
      ),
    );

    expect(find.text('Areté'), findsOneWidget);
  });

  testWidgets(
    'AppCard interactiva se encoge al presionar y vuelve a su tamaño al soltar',
    (WidgetTester tester) async {
      var tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: AppCard(
              onTap: () => tapped = true,
              child: const Text('Rutina de hoy'),
            ),
          ),
        ),
      );

      AnimatedScale findScale() =>
          tester.widget<AnimatedScale>(find.byType(AnimatedScale));

      expect(findScale().scale, 1);

      final gesture = await tester.startGesture(
        tester.getCenter(find.text('Rutina de hoy')),
      );
      await tester.pump();

      // La retroalimentación aparece de inmediato al presionar, no solo
      // al soltar (principio "responde en pointer-down" de apple-design).
      expect(findScale().scale, lessThan(1));

      await gesture.up();
      await tester.pumpAndSettle();

      expect(findScale().scale, 1);
      expect(tapped, isTrue);
    },
  );
}
