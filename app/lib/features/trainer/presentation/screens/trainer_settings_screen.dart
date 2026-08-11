import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../../auth/presentation/widgets/auth_message_banner.dart';
import '../../../auth/presentation/widgets/auth_validators.dart';
import '../../../shared/models/profile.dart';
import '../../../shared/models/subscription.dart';
import '../../../shared/providers/current_user_profile_provider.dart';
import '../../../shared/widgets/app_card.dart';
import '../../data/trainer_settings_providers.dart';

/// Configuración de la cuenta del entrenador: datos del perfil,
/// información de negocio, notificaciones y estado del plan de
/// suscripción (solo visualización; la lógica de pago se conecta en la
/// Fase 15).
class TrainerSettingsScreen extends ConsumerWidget {
  const TrainerSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(currentUserProfileProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: switch (profileAsync) {
          AsyncLoading() => const Center(child: CircularProgressIndicator()),
          AsyncError() => Center(
              child: Text(
                'No se pudo cargar tu perfil.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
          AsyncValue(:final value?) => _SettingsBody(profile: value),
          _ => const SizedBox.shrink(),
        },
      ),
    );
  }
}

class _SettingsBody extends StatelessWidget {
  const _SettingsBody({required this.profile});

  final Profile profile;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 640),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _ProfileAndBusinessCard(profile: profile),
              const SizedBox(height: AppSpacing.lg),
              _NotificationsCard(profile: profile),
              const SizedBox(height: AppSpacing.lg),
              _SubscriptionCard(profile: profile),
              const SizedBox(height: AppSpacing.xl),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProfileAndBusinessCard extends ConsumerStatefulWidget {
  const _ProfileAndBusinessCard({required this.profile});

  final Profile profile;

  @override
  ConsumerState<_ProfileAndBusinessCard> createState() =>
      _ProfileAndBusinessCardState();
}

class _ProfileAndBusinessCardState
    extends ConsumerState<_ProfileAndBusinessCard> {
  final _formKey = GlobalKey<FormState>();
  late final _nameController = TextEditingController(text: widget.profile.fullName);
  late final _phoneController = TextEditingController(text: widget.profile.phone ?? '');
  late final _businessController =
      TextEditingController(text: widget.profile.businessName ?? '');
  bool _isSaving = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _businessController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });
    try {
      await ref.read(trainerSettingsRepositoryProvider).updateProfile(
            userId: widget.profile.id,
            fullName: _nameController.text,
            phone: _phoneController.text,
            businessName: _businessController.text,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Datos guardados.')),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _errorMessage = (error as dynamic).message as String);
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppCard(
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Perfil', style: theme.textTheme.titleMedium),
            const SizedBox(height: AppSpacing.sm),
            if (_errorMessage != null) ...[
              AuthMessageBanner(message: _errorMessage!),
              const SizedBox(height: AppSpacing.sm),
            ],
            TextFormField(
              controller: _nameController,
              textCapitalization: TextCapitalization.words,
              validator: AuthValidators.fullName,
              decoration: const InputDecoration(labelText: 'Nombre completo'),
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              initialValue: widget.profile.email,
              enabled: false,
              decoration: const InputDecoration(
                labelText: 'Correo electrónico',
                helperText: 'El correo no se puede cambiar desde aquí.',
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Teléfono (opcional)'),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text('Negocio', style: theme.textTheme.titleMedium),
            const SizedBox(height: AppSpacing.sm),
            TextFormField(
              controller: _businessController,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                labelText: 'Nombre del gimnasio o marca personal (opcional)',
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton(
                onPressed: _isSaving ? null : _submit,
                child: _isSaving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2.5),
                      )
                    : const Text('Guardar cambios'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NotificationsCard extends ConsumerStatefulWidget {
  const _NotificationsCard({required this.profile});

  final Profile profile;

  @override
  ConsumerState<_NotificationsCard> createState() => _NotificationsCardState();
}

class _NotificationsCardState extends ConsumerState<_NotificationsCard> {
  late bool _notifyEmail = widget.profile.notifyEmail;
  late bool _notifyPush = widget.profile.notifyPush;
  bool _isSaving = false;

  Future<void> _save() async {
    setState(() => _isSaving = true);
    try {
      await ref.read(trainerSettingsRepositoryProvider).updateNotificationPreferences(
            userId: widget.profile.id,
            notifyEmail: _notifyEmail,
            notifyPush: _notifyPush,
          );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text((error as dynamic).message as String)),
      );
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text('Notificaciones', style: theme.textTheme.titleMedium),
              ),
              if (_isSaving)
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
            ],
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Correo electrónico'),
            subtitle: const Text('Avisos de clientes nuevos, mensajes y recordatorios.'),
            value: _notifyEmail,
            onChanged: _isSaving
                ? null
                : (value) {
                    setState(() => _notifyEmail = value);
                    _save();
                  },
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Notificaciones push'),
            subtitle: const Text('Avisos en tiempo real dentro de la app.'),
            value: _notifyPush,
            onChanged: _isSaving
                ? null
                : (value) {
                    setState(() => _notifyPush = value);
                    _save();
                  },
          ),
        ],
      ),
    );
  }
}

class _SubscriptionCard extends StatelessWidget {
  const _SubscriptionCard({required this.profile});

  final Profile profile;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final plan = SubscriptionPlan.fromRaw(profile.subscriptionPlan);
    final status = SubscriptionStatus.fromRaw(profile.subscriptionStatus);
    final statusColor = switch (status) {
      SubscriptionStatus.active => AppColors.success,
      SubscriptionStatus.trialing => AppColors.warning,
      SubscriptionStatus.pastDue => AppColors.danger,
      SubscriptionStatus.canceled => AppColors.danger,
    };

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Plan de suscripción', style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: theme.colorScheme.primary.withValues(alpha: 0.12),
                ),
                child: AppIcon(
                  AppIconPaths.autoAwesome,
                  size: 20,
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Plan ${plan.label}',
                      style: theme.textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          margin: const EdgeInsets.only(right: 6),
                          decoration: BoxDecoration(
                            color: statusColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                        Text(status.label, style: theme.textTheme.bodyMedium),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'La gestión de planes y pagos todavía no está conectada — vas '
            'a poder cambiar de plan directamente desde aquí más adelante.',
            style: theme.textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}
