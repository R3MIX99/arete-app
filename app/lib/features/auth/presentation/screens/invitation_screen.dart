import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../shared/providers/current_user_profile_provider.dart';
import '../../../trainer/data/clients_providers.dart';
import '../widgets/auth_message_banner.dart';
import '../widgets/auth_screen_scaffold.dart';
import '../widgets/auth_submit_button.dart';

/// Pantalla que ve el cliente al abrir el enlace que le compartió su
/// entrenador.
///
/// Si ya tiene sesión iniciada, canjea el enlace de inmediato. Si no, lo
/// manda a crear su cuenta (por correo o por Google, como prefiera) y al
/// volver se canjea solo: por eso el token viaja en la ruta y no en la
/// metadata del registro, que con Google no se puede controlar.
class InvitationScreen extends ConsumerStatefulWidget {
  const InvitationScreen({super.key, required this.token});

  final String token;

  @override
  ConsumerState<InvitationScreen> createState() => _InvitationScreenState();
}

class _InvitationScreenState extends ConsumerState<InvitationScreen> {
  bool _isRedeeming = false;
  String? _errorMessage;
  bool _redeemed = false;

  Future<void> _redeem() async {
    setState(() {
      _isRedeeming = true;
      _errorMessage = null;
    });
    try {
      await ref.read(clientsRepositoryProvider).redeemInvitation(widget.token);
      ref.invalidate(currentUserProfileProvider);
      if (!mounted) return;
      setState(() => _redeemed = true);
    } catch (error) {
      if (!mounted) return;
      setState(() => _errorMessage = (error as dynamic).message as String);
    } finally {
      if (mounted) setState(() => _isRedeeming = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final profile = ref.watch(currentUserProfileProvider).valueOrNull;
    final isSignedIn = profile != null;

    if (_redeemed) {
      return AuthScreenScaffold(
        children: [
          Text('Listo', style: theme.textTheme.headlineMedium),
          const SizedBox(height: AppSpacing.sm),
          const AuthMessageBanner(
            tone: AuthMessageTone.success,
            message: 'Ya formas parte del programa de tu entrenador.',
          ),
          const SizedBox(height: AppSpacing.lg),
          AuthSubmitButton(
            label: 'Ir a mi panel',
            isLoading: false,
            onPressed: () => context.go(AppRoutes.clientHome),
          ),
        ],
      );
    }

    return AuthScreenScaffold(
      children: [
        Text('Invitación de tu entrenador', style: theme.textTheme.headlineMedium),
        const SizedBox(height: AppSpacing.sm),
        Text(
          isSignedIn
              ? 'Acepta la invitación para unirte al programa de tu '
                  'entrenador y recibir tu rutina y tu plan de alimentación.'
              : 'Crea tu cuenta o inicia sesión para unirte al programa de tu '
                  'entrenador. Puedes usar tu correo o tu cuenta de Google.',
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: AppSpacing.lg),
        if (_errorMessage != null) ...[
          AuthMessageBanner(message: _errorMessage!),
          const SizedBox(height: AppSpacing.md),
        ],
        if (isSignedIn)
          AuthSubmitButton(
            label: 'Aceptar invitación',
            isLoading: _isRedeeming,
            onPressed: _redeem,
          )
        else ...[
          AuthSubmitButton(
            label: 'Crear mi cuenta',
            isLoading: false,
            onPressed: () => context.push(AppRoutes.register),
          ),
          const SizedBox(height: AppSpacing.sm),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton(
              onPressed: () => context.push(AppRoutes.login),
              child: const Text('Ya tengo cuenta'),
            ),
          ),
        ],
      ],
    );
  }
}
