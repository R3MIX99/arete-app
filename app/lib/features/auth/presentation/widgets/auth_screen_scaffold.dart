import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_card.dart';

/// Layout común de las pantallas de autenticación: tarjeta centrada, ancho
/// máximo cómodo de leer, y scroll para que el teclado nunca tape los
/// campos en pantallas chicas.
class AuthScreenScaffold extends StatelessWidget {
  const AuthScreenScaffold({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: AppCard(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: children,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
