import 'package:flutter/material.dart';

import '../theme/app_icon_paths.dart';
import '../theme/app_spacing.dart';
import 'app_icon.dart';

/// Contenido de una pantalla temporal: usado tanto por [PlaceholderScreen]
/// (con su propio `Scaffold`/`AppBar`) como por módulos que ya viven
/// dentro de un shell de navegación con su propio `Scaffold` (por ejemplo,
/// los módulos del panel de entrenador que todavía no tienen contenido
/// real).
class PlaceholderContent extends StatelessWidget {
  const PlaceholderContent({super.key, required this.title, this.subtitle});

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppIcon(
              AppIconPaths.construction,
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
    );
  }
}

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
    return Scaffold(
      appBar: AppBar(title: Text(title), actions: actions),
      body: PlaceholderContent(title: title, subtitle: subtitle),
    );
  }
}
