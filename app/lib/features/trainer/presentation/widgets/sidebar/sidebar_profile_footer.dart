import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../../core/theme/app_icon_paths.dart';
import '../../../../../core/widgets/app_icon.dart';
import '../../../../auth/data/auth_providers.dart';
import '../../../../shared/models/profile.dart';
import '../../../../shared/providers/current_user_profile_provider.dart';
import 'sidebar_colors.dart';

/// Pie de la barra lateral: quién tiene la sesión iniciada, con acceso a
/// cerrar sesión. Colapsada, se reduce al avatar (con menú al tocarlo,
/// para no perder la acción de cerrar sesión).
class SidebarProfileFooter extends ConsumerWidget {
  const SidebarProfileFooter({super.key, required this.collapsed});

  final bool collapsed;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(currentUserProfileProvider).valueOrNull;

    if (collapsed) {
      return Center(child: _MenuButton(profile: profile, child: _Avatar(profile: profile)));
    }

    return _MenuButton(
      profile: profile,
      child: Row(
        children: [
          _Avatar(profile: profile),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  profile?.displayName ?? '...',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: SidebarColors.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  profile?.email ?? '',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: SidebarColors.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          const AppIcon(
            AppIconPaths.expandMore,
            size: 18,
            color: SidebarColors.textSecondary,
          ),
        ],
      ),
    );
  }
}

class _MenuButton extends ConsumerWidget {
  const _MenuButton({required this.profile, required this.child});

  final Profile? profile;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return PopupMenuButton<void>(
      tooltip: 'Cuenta',
      color: SidebarColors.surfaceRaised,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: SidebarColors.glassBorderBright),
      ),
      offset: const Offset(0, -8),
      position: PopupMenuPosition.over,
      padding: EdgeInsets.zero,
      itemBuilder: (context) => [
        PopupMenuItem<void>(
          onTap: () => ref.read(authRepositoryProvider).signOut(),
          child: const Row(
            children: [
              AppIcon(AppIconPaths.logout, size: 18, color: SidebarColors.danger),
              SizedBox(width: 10),
              Text(
                'Cerrar sesión',
                style: TextStyle(color: SidebarColors.danger, fontSize: 13),
              ),
            ],
          ),
        ),
      ],
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: MouseRegion(cursor: SystemMouseCursors.click, child: child),
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.profile});

  final Profile? profile;

  @override
  Widget build(BuildContext context) {
    final name = profile?.displayName ?? '';
    final initials = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .take(2)
        .map((part) => part[0].toUpperCase())
        .join();

    return Container(
      width: 32,
      height: 32,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        gradient: SidebarColors.accentGradient,
        shape: BoxShape.circle,
      ),
      child: Text(
        initials.isEmpty ? '?' : initials,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
