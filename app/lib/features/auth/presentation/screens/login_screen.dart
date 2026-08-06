import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../data/auth_failure.dart';
import '../../data/auth_providers.dart';
import '../widgets/auth_message_banner.dart';
import '../widgets/auth_password_field.dart';
import '../widgets/auth_screen_scaffold.dart';
import '../widgets/auth_submit_button.dart';
import '../widgets/auth_validators.dart';

/// Pantalla de inicio de sesión. La redirección al panel correcto según el
/// rol ocurre sola en el enrutador una vez que Supabase confirma la
/// sesión; esta pantalla solo se encarga de pedir las credenciales.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ref.read(authRepositoryProvider).signInWithPassword(
            email: _emailController.text.trim(),
            password: _passwordController.text,
          );
      // No navegamos manualmente: el cambio de sesión hace que el
      // enrutador redirija solo al panel correcto según el rol.
    } catch (error) {
      if (!mounted) return;
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
        Text('Areté', style: theme.textTheme.displayLarge),
        const SizedBox(height: AppSpacing.sm),
        Text(
          'Inicia sesión para continuar.',
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: AppSpacing.lg),
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
                textInputAction: TextInputAction.next,
                validator: AuthValidators.email,
                decoration: const InputDecoration(
                  labelText: 'Correo electrónico',
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              AuthPasswordField(
                controller: _passwordController,
                label: 'Contraseña',
                validator: AuthValidators.password,
                onFieldSubmitted: (_) => _submit(),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: _isLoading
                      ? null
                      : () => context.push(AppRoutes.forgotPassword),
                  child: const Text('¿Olvidaste tu contraseña?'),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              AuthSubmitButton(
                label: 'Iniciar sesión',
                isLoading: _isLoading,
                onPressed: _submit,
              ),
              const SizedBox(height: AppSpacing.lg),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('¿No tienes cuenta?', style: theme.textTheme.bodyMedium),
                  TextButton(
                    onPressed: _isLoading
                        ? null
                        : () => context.push(AppRoutes.register),
                    child: const Text('Regístrate'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
