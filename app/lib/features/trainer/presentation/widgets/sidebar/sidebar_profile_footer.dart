import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../../core/theme/app_icon_paths.dart';
import '../../../../../core/theme/app_motion.dart';
import '../../../../../core/widgets/app_icon.dart';
import '../../../../auth/data/auth_providers.dart';
import '../../../../shared/models/profile.dart';
import '../../../../shared/providers/current_user_profile_provider.dart';
import 'sidebar_colors.dart';

/// Pie de la barra lateral: quién tiene la sesión iniciada, con un ícono
/// directo para cerrar sesión (con confirmación visual solo por el
/// tooltip, sin menú intermedio). Colapsada, se reduce al avatar y al
/// ícono de salir, apilados.
class SidebarProfileFooter extends ConsumerWidget {
  const SidebarProfileFooter({super.key, required this.collapsed});

  final bool collapsed;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(currentUserProfileProvider).valueOrNull;

    if (collapsed) {
      return Column(
        children: [
          _Avatar(profile: profile),
          const SizedBox(height: 8),
          const _SignOutIconButton(),
        ],
      );
    }

    return Row(
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
                softWrap: false,
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
                softWrap: false,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: SidebarColors.textSecondary,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
        const _SignOutIconButton(),
      ],
    );
  }
}

class _SignOutIconButton extends ConsumerStatefulWidget {
  const _SignOutIconButton();

  @override
  ConsumerState<_SignOutIconButton> createState() => _SignOutIconButtonState();
}

class _SignOutIconButtonState extends ConsumerState<_SignOutIconButton> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: 'Cerrar sesión',
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        onEnter: (_) => setState(() => _hovered = true),
        onExit: (_) => setState(() => _hovered = false),
        child: GestureDetector(
          onTap: () => ref.read(authRepositoryProvider).signOut(),
          child: AnimatedContainer(
            duration: AppMotion.resolve(context, AppMotion.dropdown),
            width: 32,
            height: 32,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: _hovered
                  ? SidebarColors.danger.withValues(alpha: 0.12)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
            ),
            child: AppIcon(
              AppIconPaths.logout,
              size: 18,
              color: _hovered ? SidebarColors.danger : SidebarColors.textSecondary,
            ),
          ),
        ),
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
