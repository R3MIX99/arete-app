import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../navigation/trainer_nav_item.dart';
import '../widgets/sidebar/app_sidebar.dart';
import '../widgets/sidebar/sidebar_colors.dart';

/// Estructura de navegación del panel de entrenador, adaptable al tamaño
/// de pantalla:
///
/// - **Angosto** (teléfono, &lt;720px): la misma [AppSidebar] dentro de un
///   `Drawer` desplegable desde un botón de menú en la barra superior. Con
///   9 módulos, un menú inferior no alcanza (máximo recomendado: 5
///   destinos).
/// - **Ancho** (tablet/escritorio, ≥720px): [AppSidebar] fija a la
///   izquierda, colapsable a solo íconos con el botón de su encabezado.
///
/// [navigationShell] viene de `StatefulShellRoute.indexedStack` (ver
/// core/router/app_router.dart): cada módulo mantiene su propia pila de
/// navegación y su estado de scroll al cambiar de pestaña.
class TrainerShellScreen extends StatelessWidget {
  const TrainerShellScreen({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  void _onSelect(BuildContext context, int index) {
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = TrainerNavItem.all;
    final selectedIndex = navigationShell.currentIndex;
    final currentTitle = items[selectedIndex].label;

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 720;

        if (!isWide) {
          return Scaffold(
            appBar: AppBar(title: Text(currentTitle)),
            drawer: Drawer(
              width: 264,
              backgroundColor: SidebarColors.background,
              child: AppSidebar(
                items: items,
                selectedIndex: selectedIndex,
                forceExpanded: true,
                onSelect: (index) {
                  Navigator.of(context).pop();
                  _onSelect(context, index);
                },
              ),
            ),
            body: navigationShell,
          );
        }

        return Scaffold(
          body: Row(
            children: [
              AppSidebar(
                items: items,
                selectedIndex: selectedIndex,
                onSelect: (index) => _onSelect(context, index),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AppBar(title: Text(currentTitle)),
                    Expanded(child: navigationShell),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
