import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../data/auth_failure.dart';
import '../../data/auth_providers.dart';
import '../widgets/auth_message_banner.dart';
import '../widgets/auth_screen_scaffold.dart';
import '../widgets/auth_submit_button.dart';
import '../widgets/auth_validators.dart';

/// Pantalla de recuperación de contraseña: un solo campo de correo que
/// dispara el enlace de restablecimiento de Supabase.
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();

  bool _isLoading = false;
  bool _wasSent = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ref
          .read(authRepositoryProvider)
          .sendPasswordResetEmail(_emailController.text.trim());
      if (!mounted) return;
      setState(() => _wasSent = true);
    } catch (error) {
      if (!mounted) return;
      // Por seguridad, Supabase no distingue entre "correo no existe" y
      // "correo enviado" en su respuesta de la mayoría de configuraciones;
      // igual mostramos el error tal cual si algo distinto falla (por
      // ejemplo, sin conexión).
      setState(() {
        _errorMessage = AuthFailure.fromException(error).message;
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AuthScreenScaffold(
      children: [
        Text('Recuperar contraseña', style: theme.textTheme.headlineMedium),
        const SizedBox(height: AppSpacing.sm),
        Text(
          'Ingresa tu correo electrónico y te enviaremos un enlace para '
          'crear una nueva contraseña.',
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: AppSpacing.lg),
        if (_wasSent)
          const AuthMessageBanner(
            tone: AuthMessageTone.success,
            message:
                'Si el correo está registrado, te enviamos un enlace para '
                'restablecer tu contraseña. Revisa tu bandeja de entrada.',
          )
        else
          Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_errorMessage != null) ...[
                  AuthMessageBanner(message: _errorMessage!),
                  const SizedBox(height: AppSpacing.md),
                ],
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  textInputAction: TextInputAction.done,
                  validator: AuthValidators.email,
                  onFieldSubmitted: (_) => _submit(),
                  decoration: const InputDecoration(
                    labelText: 'Correo electrónico',
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                AuthSubmitButton(
                  label: 'Enviar enlace',
                  isLoading: _isLoading,
                  onPressed: _submit,
                ),
              ],
            ),
          ),
        const SizedBox(height: AppSpacing.lg),
        Center(
          child: TextButton(
            onPressed: () =>
                context.canPop() ? context.pop() : context.go(AppRoutes.login),
            child: const Text('Volver a iniciar sesión'),
          ),
        ),
      ],
    );
  }
}
