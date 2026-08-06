import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_card.dart';

/// Pantalla de inicio de sesión. Se implementará en la fase de
/// autenticación; por ahora solo define la estructura visual base para
/// validar el sistema de diseño y el enrutamiento.
class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: AppCard(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Areté', style: theme.textTheme.displayLarge),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      'Inicia sesión para continuar.',
                      style: theme.textTheme.bodyMedium,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    const _PlaceholderField(label: 'Correo electrónico'),
                    const SizedBox(height: AppSpacing.md),
                    const _PlaceholderField(
                      label: 'Contraseña',
                      obscure: true,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: null,
                        child: Text('Iniciar sesión'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _PlaceholderField extends StatelessWidget {
  const _PlaceholderField({required this.label, this.obscure = false});

  final String label;
  final bool obscure;

  @override
  Widget build(BuildContext context) {
    return TextField(
      enabled: false,
      obscureText: obscure,
      decoration: InputDecoration(labelText: label),
    );
  }
}
