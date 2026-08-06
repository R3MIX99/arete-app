import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../theme/app_spacing.dart';

/// Pantalla temporal usada mientras las fases posteriores implementan la
/// funcionalidad real de cada ruta. No es un componente de producto: solo
/// confirma que el enrutamiento por rol funciona.
class PlaceholderScreen extends StatelessWidget {
  const PlaceholderScreen({
    super.key,
    required this.title,
    this.subtitle,
    this.actions,
  });

  final String title;
  final String? subtitle;
  final List<Widget>? actions;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(title), actions: actions),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Symbols.construction,
                size: 40,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(title, style: theme.textTheme.headlineMedium),
              if (subtitle != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(
                  subtitle!,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
