import 'package:flutter/material.dart';

import '../../../../../core/theme/app_motion.dart';
import '../../../../../core/widgets/app_icon.dart';
import 'sidebar_colors.dart';
import 'sidebar_tooltip.dart';

/// Un destino de navegación de la barra lateral.
///
/// Expandida: una franja delgada de luz pegada al borde derecho marca el
/// ítem activo — no toda la tarjeta se llena de color, solo esa luz (con
/// un resplandor suave), igual que la referencia. Colapsada: el ícono se
/// dibuja en un cuadrado (nunca más ancho que alto) y el activo lleva un
/// degradé diagonal, del acento en la esquina inferior derecha hacia el
/// color normal del fondo en la superior izquierda.
///
/// En los dos casos el ícono y el texto también cambian de tono al estar
/// activos u hover: la selección nunca depende solo del color de fondo.
class SidebarNavTile extends StatefulWidget {
  const SidebarNavTile({
    super.key,
    required this.icon,
    required this.label,
    required this.selected,
    required this.collapsed,
    required this.onTap,
  });

  final String icon;
  final String label;
  final bool selected;
  final bool collapsed;
  final VoidCallback onTap;

  @override
  State<SidebarNavTile> createState() => _SidebarNavTileState();
}

class _SidebarNavTileState extends State<SidebarNavTile> {
  bool _hovered = false;

  void _setHovered(bool value) {
    if (_hovered == value) return;
    setState(() => _hovered = value);
  }

  @override
  Widget build(BuildContext context) {
    return widget.collapsed ? _buildCollapsed(context) : _buildExpanded(context);
  }

  Widget _buildCollapsed(BuildContext context) {
    final iconColor = widget.selected
        ? Colors.white
        : (_hovered ? SidebarColors.textPrimary : SidebarColors.textSecondary);

    final square = AnimatedContainer(
      duration: AppMotion.resolve(context, AppMotion.dropdown),
      curve: AppMotion.hover,
      width: 40,
      height: 40,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        gradient: widget.selected ? SidebarColors.collapsedActiveGradient : null,
        color: widget.selected
            ? null
            : (_hovered ? SidebarColors.hoverFill : Colors.transparent),
      ),
      child: AppIcon(widget.icon, size: 22, color: iconColor),
    );

    return Center(
      child: SidebarTooltip(
        message: widget.label,
        child: MouseRegion(
          onEnter: (_) => _setHovered(true),
          onExit: (_) => _setHovered(false),
          cursor: SystemMouseCursors.click,
          child: GestureDetector(onTap: widget.onTap, child: square),
        ),
      ),
    );
  }

  Widget _buildExpanded(BuildContext context) {
    final contentColor = widget.selected || _hovered
        ? SidebarColors.textPrimary
        : SidebarColors.textSecondary;

    return MouseRegion(
      onEnter: (_) => _setHovered(true),
      onExit: (_) => _setHovered(false),
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: AppMotion.resolve(context, AppMotion.dropdown),
          curve: AppMotion.hover,
          height: 40,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          alignment: Alignment.centerLeft,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            color: widget.selected
                ? SidebarColors.selectedFill
                : (_hovered ? SidebarColors.hoverFill : Colors.transparent),
          ),
          child: Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.centerLeft,
            children: [
              Row(
                children: [
                  AppIcon(widget.icon, size: 20, color: contentColor),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      widget.label,
                      maxLines: 1,
                      softWrap: false,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: contentColor,
                        fontSize: 14,
                        fontWeight:
                            widget.selected ? FontWeight.w600 : FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
              if (widget.selected)
                Positioned(
                  right: -12,
                  top: 2,
                  bottom: 2,
                  width: 4,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: SidebarColors.edgeGlowGradient,
                      borderRadius: const BorderRadius.horizontal(
                        right: Radius.circular(4),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: SidebarColors.accentStart.withValues(alpha: 0.7),
                          blurRadius: 14,
                          spreadRadius: 0.5,
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
