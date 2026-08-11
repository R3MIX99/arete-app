import 'package:flutter/material.dart';

import '../../../../../core/theme/app_icon_paths.dart';
import '../../../../../core/widgets/app_icon.dart';
import 'glass_panel.dart';
import 'sidebar_colors.dart';

/// Tarjeta de promoción de las funciones con inteligencia artificial
/// (puntaje de rutina, sugerencias) que se construyen más adelante. Por
/// ahora es solo el anuncio: cuando exista el sistema de planes, el botón
/// pasa a llevar al checkout real.
class SidebarBoostCard extends StatelessWidget {
  const SidebarBoostCard({super.key});

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      color: SidebarColors.surfaceRaised,
      borderRadius: const BorderRadius.all(Radius.circular(14)),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                width: 26,
                height: 26,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  gradient: SidebarColors.accentGradient,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const AppIcon(
                  AppIconPaths.autoAwesome,
                  size: 14,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                'Impulsa con IA',
                style: TextStyle(
                  color: SidebarColors.textPrimary,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Puntaje automático de rutinas, sugerencias de progreso y '
            'herramientas que te ahorran horas.',
            style: TextStyle(
              color: SidebarColors.textSecondary,
              fontSize: 12,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 34,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: SidebarColors.accentGradient,
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(
                    color: SidebarColors.accentStart.withValues(alpha: 0.4),
                    blurRadius: 14,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(8),
                  onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Los planes con IA estarán disponibles pronto.',
                      ),
                    ),
                  ),
                  child: const Center(
                    child: Text(
                      'Mejorar a Pro',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
