import 'package:flutter/material.dart';

import '../../../../../core/theme/app_icon_paths.dart';
import '../../../../../core/theme/app_motion.dart';
import '../../../../../core/widgets/app_icon.dart';
import '../../navigation/trainer_nav_item.dart';
import 'sidebar_boost_card.dart';
import 'sidebar_colors.dart';
import 'sidebar_nav_tile.dart';
import 'sidebar_profile_footer.dart';

/// Barra lateral del panel de entrenador: logo, navegación con efecto de
/// franja al pasar el mouse o al estar activa, tarjeta de promoción de las
/// funciones con IA y el pie con la cuenta.
///
/// Se puede colapsar a solo íconos con el botón del encabezado. Dentro del
/// `Drawer` de teléfono ([forceExpanded]) ese botón no aplica: un cajón
/// que se abre encima de la pantalla no necesita ahorrar espacio.
class AppSidebar extends StatefulWidget {
  const AppSidebar({
    super.key,
    required this.items,
    required this.selectedIndex,
    required this.onSelect,
    this.forceExpanded = false,
  });

  final List<TrainerNavItem> items;
  final int selectedIndex;
  final ValueChanged<int> onSelect;
  final bool forceExpanded;

  @override
  State<AppSidebar> createState() => _AppSidebarState();
}

class _AppSidebarState extends State<AppSidebar> {
  // `_collapsed` es el ancho que se pide; `_contentReady` es si ya hay que
  // dibujar texto/tarjetas. Van desfasados a propósito: al colapsar, el
  // texto se esconde de inmediato (no tiene sentido esperar, total se está
  // achicando). Al expandir, el texto se queda escondido hasta que el
  // ancho terminó de crecer (`onEnd` del AnimatedContainer) y recién ahí
  // aparece de un golpe. Así nunca se dibuja una etiqueta larga dentro de
  // una caja todavía angosta a mitad de la animación — que es lo que se
  // veía como texto "compactándose"/saltando de línea.
  bool _collapsed = false;
  bool _contentReady = true;

  bool get _effectiveCollapsed => widget.forceExpanded ? false : _collapsed;

  void _setCollapsed(bool value) {
    setState(() {
      _collapsed = value;
      if (value) _contentReady = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final collapsed = _effectiveCollapsed;
    // Mientras se expande, el contenido con texto sigue oculto (se ve como
    // "colapsado") hasta que la caja termina de crecer.
    final contentCollapsed = widget.forceExpanded ? false : (collapsed || !_contentReady);

    return AnimatedContainer(
      duration: AppMotion.resolve(context, AppMotion.pageTransition),
      curve: AppMotion.reposition,
      width: collapsed ? 76 : 264,
      onEnd: () {
        if (!_collapsed && !_contentReady) setState(() => _contentReady = true);
      },
      decoration: const BoxDecoration(
        color: SidebarColors.background,
        border: Border(
          right: BorderSide(color: SidebarColors.glassBorderDim),
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 16, 12, 12),
          child: Column(
            children: [
              _Header(
                collapsed: contentCollapsed,
                showToggle: !widget.forceExpanded,
                onToggle: () => _setCollapsed(!_collapsed),
              ),
              const SizedBox(height: 24),
              Expanded(
                child: ListView.separated(
                  padding: EdgeInsets.zero,
                  itemCount: widget.items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final item = widget.items[index];
                    return SidebarNavTile(
                      icon: item.icon,
                      label: item.label,
                      selected: index == widget.selectedIndex,
                      collapsed: contentCollapsed,
                      onTap: () => widget.onSelect(index),
                    );
                  },
                ),
              ),
              if (!contentCollapsed) ...[
                const SidebarBoostCard(),
                const SizedBox(height: 12),
              ],
              const Divider(color: SidebarColors.glassBorderDim, height: 1),
              const SizedBox(height: 8),
              SidebarProfileFooter(collapsed: contentCollapsed),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.collapsed,
    required this.showToggle,
    required this.onToggle,
  });

  final bool collapsed;
  final bool showToggle;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    if (collapsed) {
      return Column(
        children: [
          const _LogoMark(),
          if (showToggle) ...[
            const SizedBox(height: 12),
            _ToggleButton(collapsed: collapsed, onTap: onToggle),
          ],
        ],
      );
    }

    return Row(
      children: [
        const _LogoMark(),
        const SizedBox(width: 10),
        const Expanded(
          child: Text(
            'Areté',
            maxLines: 1,
            softWrap: false,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: SidebarColors.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.3,
            ),
          ),
        ),
        if (showToggle) _ToggleButton(collapsed: collapsed, onTap: onToggle),
      ],
    );
  }
}

/// Marca provisional: un ícono de mancuerna sobre un cuadrado en degradé
/// del acento. Se reemplaza el día que exista un isotipo real de marca.
class _LogoMark extends StatelessWidget {
  const _LogoMark();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 32,
      height: 32,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        gradient: SidebarColors.accentGradient,
        borderRadius: BorderRadius.circular(9),
        boxShadow: [
          BoxShadow(
            color: SidebarColors.accentStart.withValues(alpha: 0.4),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: const AppIcon(
        AppIconPaths.fitnessCenter,
        size: 17,
        color: Colors.white,
      ),
    );
  }
}

class _ToggleButton extends StatefulWidget {
  const _ToggleButton({required this.collapsed, required this.onTap});

  final bool collapsed;
  final VoidCallback onTap;

  @override
  State<_ToggleButton> createState() => _ToggleButtonState();
}

class _ToggleButtonState extends State<_ToggleButton> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: widget.collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral',
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        onEnter: (_) => setState(() => _hovered = true),
        onExit: (_) => setState(() => _hovered = false),
        child: GestureDetector(
          onTap: widget.onTap,
          child: AnimatedContainer(
            duration: AppMotion.resolve(context, AppMotion.dropdown),
            width: 28,
            height: 28,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: _hovered ? SidebarColors.hoverFill : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: SidebarColors.glassBorderBright),
            ),
            child: AppIcon(
              widget.collapsed
                  ? AppIconPaths.leftPanelOpen
                  : AppIconPaths.leftPanelClose,
              size: 15,
              color: SidebarColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}
