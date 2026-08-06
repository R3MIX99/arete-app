import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../shared/models/user_role.dart';
import '../../data/auth_failure.dart';
import '../../data/auth_providers.dart';
import '../widgets/auth_message_banner.dart';
import '../widgets/auth_password_field.dart';
import '../widgets/auth_screen_scaffold.dart';
import '../widgets/auth_submit_button.dart';
import '../widgets/auth_validators.dart';

/// Pantalla de registro. Solo permite crear cuentas de entrenador o
/// cliente: el superadministrador se crea manualmente desde Supabase, así
/// que ese rol nunca aparece como opción aquí.
class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  UserRole _role = UserRole.client;
  bool _isLoading = false;
  String? _errorMessage;

  /// Cuando el proyecto de Supabase requiere confirmar el correo, se
  /// muestra este mensaje en vez de dejar avanzar como si ya hubiera
  /// iniciado sesión.
  bool _needsEmailConfirmation = false;

  @override
  void dispose() {
    _fullNameController.dispose();
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
      final signedInImmediately = await ref.read(authRepositoryProvider).signUp(
            email: _emailController.text.trim(),
            password: _passwordController.text,
            fullName: _fullNameController.text.trim(),
            role: _role,
          );
      if (!mounted) return;
      if (!signedInImmediately) {
        setState(() => _needsEmailConfirmation = true);
      }
      // Si sí quedó con sesión iniciada, el enrutador redirige solo.
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

    if (_needsEmailConfirmation) {
      return AuthScreenScaffold(
        children: [
          Text('Revisa tu correo', style: theme.textTheme.headlineMedium),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Te enviamos un enlace de confirmación a '
            '${_emailController.text.trim()}. Ábrelo para activar tu '
            'cuenta y luego inicia sesión.',
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: AppSpacing.lg),
          AuthSubmitButton(
            label: 'Ir a iniciar sesión',
            isLoading: false,
            onPressed: () =>
                context.canPop() ? context.pop() : context.go(AppRoutes.login),
          ),
        ],
      );
    }

    return AuthScreenScaffold(
      children: [
        Text('Crea tu cuenta', style: theme.textTheme.headlineMedium),
        const SizedBox(height: AppSpacing.sm),
        Text(
          'Regístrate como entrenador o como cliente.',
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
              Text('Soy...', style: theme.textTheme.labelLarge),
              const SizedBox(height: AppSpacing.xs),
              SegmentedButton<UserRole>(
                segments: UserRole.registrable
                    .map(
                      (role) => ButtonSegment(
                        value: role,
                        label: Text(role.label),
                      ),
                    )
                    .toList(),
                selected: {_role},
                onSelectionChanged: _isLoading
                    ? null
                    : (selection) => setState(() => _role = selection.first),
              ),
              const SizedBox(height: AppSpacing.md),
              TextFormField(
                controller: _fullNameController,
                textInputAction: TextInputAction.next,
                textCapitalization: TextCapitalization.words,
                autofillHints: const [AutofillHints.name],
                validator: AuthValidators.fullName,
                decoration: const InputDecoration(
                  labelText: 'Nombre completo',
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.email],
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
                autofillHint: AutofillHints.newPassword,
                onFieldSubmitted: (_) => _submit(),
              ),
              const SizedBox(height: AppSpacing.lg),
              AuthSubmitButton(
                label: 'Crear cuenta',
                isLoading: _isLoading,
                onPressed: _submit,
              ),
              const SizedBox(height: AppSpacing.lg),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('¿Ya tienes cuenta?', style: theme.textTheme.bodyMedium),
                  TextButton(
                    onPressed: _isLoading
                        ? null
                        : () => context.canPop()
                            ? context.pop()
                            : context.go(AppRoutes.login),
                    child: const Text('Inicia sesión'),
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
