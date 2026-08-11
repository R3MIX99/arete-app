import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../data/auth_providers.dart';

/// Botón de cerrar sesión para la barra superior de los paneles. El
/// enrutador se encarga solo de volver a la pantalla de inicio de sesión
/// en cuanto la sesión de Supabase se cierra.
class SignOutButton extends ConsumerWidget {
  const SignOutButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return IconButton(
      icon: const AppIcon(AppIconPaths.logout),
      tooltip: 'Cerrar sesión',
      onPressed: () => ref.read(authRepositoryProvider).signOut(),
    );
  }
}
