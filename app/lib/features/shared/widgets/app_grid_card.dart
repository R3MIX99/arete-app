import 'package:flutter/material.dart';

import '../../../core/theme/app_spacing.dart';
import 'app_card.dart';

/// Tarjeta cuadrada para listados en escritorio (biblioteca de
/// ejercicios, rutinas, clientes, programas...): mismo `AppCard` de
/// siempre, pero en formato de grilla en vez de fila — un ícono o avatar
/// arriba, el título y la información secundaria abajo. En teléfono estos
/// mismos listados siguen usando la fila horizontal de toda la vida
/// (`AppCard` + `Row`); esta tarjeta es solo para la grilla de escritorio.
class AppGridCard extends StatelessWidget {
  const AppGridCard({
    super.key,
    required this.leading,
    required this.title,
    required this.onTap,
    this.subtitle,
    this.tags = const [],
    this.trailing,
  });

  /// Ícono o avatar circular de arriba (mismo que usan las filas).
  final Widget leading;
  final String title;
  final String? subtitle;
  final List<Widget> tags;

  /// Marca opcional en la esquina superior derecha (p. ej. "Inactivo").
  final Widget? trailing;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              leading,
              const Spacer(),
              ?trailing,
            ],
          ),
          const Spacer(),
          Text(
            title,
            style: theme.textTheme.bodyLarge?.copyWith(
              fontWeight: FontWeight.w600,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(
              subtitle!,
              style: theme.textTheme.bodyMedium,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          if (tags.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Wrap(spacing: AppSpacing.xs, runSpacing: AppSpacing.xs, children: tags),
          ],
        ],
      ),
    );
  }
}
