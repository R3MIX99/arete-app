import 'package:flutter/material.dart';

import '../../../../../core/theme/app_motion.dart';
import '../../../../../core/widgets/app_icon.dart';
import 'sidebar_colors.dart';

/// Un destino de navegación de la barra lateral.
///
/// Tres estados visuales, igual que la referencia: apagado (ícono y texto
/// en gris), sobre el mouse (franja tenue, texto casi blanco) y activo
/// (franja en degradé del acento de marca, ícono y texto blancos). El
/// cambio de estado nunca depende solo del color de fondo: el ícono y el
/// texto también cambian de tono, así que sigue siendo legible si alguien
/// no distingue bien el degradé.
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
    final contentColor = widget.selected || _hovered
        ? SidebarColors.textPrimary
        : SidebarColors.textSecondary;

    final row = Row(
      mainAxisAlignment: widget.collapsed
          ? MainAxisAlignment.center
          : MainAxisAlignment.start,
      children: [
        AppIcon(widget.icon, size: 20, color: contentColor),
        if (!widget.collapsed) ...[
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              widget.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: contentColor,
                fontSize: 14,
                fontWeight: widget.selected ? FontWeight.w600 : FontWeight.w500,
              ),
            ),
          ),
        ],
      ],
    );

    final tile = MouseRegion(
      onEnter: (_) => _setHovered(true),
      onExit: (_) => _setHovered(false),
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: AppMotion.resolve(context, AppMotion.dropdown),
          curve: AppMotion.hover,
          height: 40,
          padding: EdgeInsets.symmetric(horizontal: widget.collapsed ? 0 : 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            gradient: widget.selected ? SidebarColors.accentGradient : null,
            color: widget.selected
                ? null
                : (_hovered ? SidebarColors.hoverFill : Colors.transparent),
            border: widget.selected
                ? Border.all(color: SidebarColors.glassBorderBright)
                : null,
            boxShadow: widget.selected
                ? [
                    BoxShadow(
                      color: SidebarColors.accentStart.withValues(alpha: 0.35),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          alignment: Alignment.centerLeft,
          child: row,
        ),
      ),
    );

    if (!widget.collapsed) return tile;
    return Tooltip(message: widget.label, waitDuration: const Duration(milliseconds: 400), child: tile);
  }
}
