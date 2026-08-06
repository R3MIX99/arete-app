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
}
