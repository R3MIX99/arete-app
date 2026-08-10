import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius_extension.dart';
import '../../../../core/theme/app_spacing.dart';

enum AuthMessageTone { error, success }

/// Mensaje de error o confirmación para formularios de autenticación.
///
/// Siempre combina color, ícono y texto (nunca transmite el significado
/// solo con color) para cumplir con las reglas de accesibilidad del
/// sistema de diseño.
class AuthMessageBanner extends StatelessWidget {
  const AuthMessageBanner({
    super.key,
    required this.message,
    this.tone = AuthMessageTone.error,
  });

  final String message;
  final AuthMessageTone tone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isError = tone == AuthMessageTone.error;
    final color = isError ? AppColors.danger : AppColors.success;
    final icon = isError ? Icons.error_outline : Icons.check_circle_outline;
    final radius = theme.extension<AppRadiusExtension>()?.md ?? 12;

    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.sm),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(radius),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Text(
                message,
                style: theme.textTheme.bodyMedium?.copyWith(color: color),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
