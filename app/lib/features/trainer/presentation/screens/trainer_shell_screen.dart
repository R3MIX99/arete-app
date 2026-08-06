import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../auth/presentation/widgets/sign_out_button.dart';
import '../navigation/trainer_nav_item.dart';

/// Estructura de navegación del panel de entrenador, adaptable al tamaño
/// de pantalla:
///
/// - **Angosto** (teléfono, &lt;720px): `NavigationDrawer` desplegable
///   desde un botón de menú en la barra superior. Con 9 módulos, un menú
///   inferior no alcanza (máximo recomendado: 5 destinos).
/// - **Ancho** (tablet/escritorio, ≥720px): `NavigationRail` fijo a la
///   izquierda; se expande con etiquetas visibles a partir de 1000px.
///
/// [navigationShell] viene de `StatefulShellRoute.indexedStack` (ver
/// core/router/app_router.dart): cada módulo mantiene su propia pila de
/// navegación y su estado de scroll al cambiar de pestaña.
class TrainerShellScreen extends StatelessWidget {
  const TrainerShellScreen({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  void _onSelect(int index) {
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
            appBar: AppBar(
              title: Text(currentTitle),
              actions: const [SignOutButton()],
            ),
            drawer: NavigationDrawer(
              selectedIndex: selectedIndex,
              onDestinationSelected: (index) {
                Navigator.of(context).pop();
                _onSelect(index);
              },
              children: [
                const Padding(
                  padding: EdgeInsets.fromLTRB(28, 16, 16, 10),
                  child: Text('Areté'),
                ),
                for (final item in items)
                  NavigationDrawerDestination(
                    icon: Icon(item.icon),
                    label: Text(item.label),
                  ),
              ],
            ),
            body: navigationShell,
          );
        }

        final extended = constraints.maxWidth >= 1000;
        return Scaffold(
          appBar: AppBar(
            title: Text(currentTitle),
            actions: const [SignOutButton()],
          ),
          body: Row(
            children: [
              NavigationRail(
                extended: extended,
                selectedIndex: selectedIndex,
                onDestinationSelected: _onSelect,
                labelType: extended
                    ? NavigationRailLabelType.none
                    : NavigationRailLabelType.all,
                destinations: [
                  for (final item in items)
                    NavigationRailDestination(
                      icon: Icon(item.icon),
                      label: Text(item.label),
                    ),
                ],
              ),
              const VerticalDivider(width: 1),
              Expanded(child: navigationShell),
            ],
          ),
        );
      },
    );
  }
}
