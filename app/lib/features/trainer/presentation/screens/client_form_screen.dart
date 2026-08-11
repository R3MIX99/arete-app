import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../../auth/presentation/widgets/auth_message_banner.dart';
import '../../../auth/presentation/widgets/auth_validators.dart';
import '../../../shared/models/client_goal.dart';
import '../../../shared/providers/current_user_profile_provider.dart';
import '../../../shared/widgets/app_card.dart';
import '../../data/clients_providers.dart';
import '../widgets/invitation_link.dart';

/// Alta y edición de un cliente.
///
/// En alta no se crea la cuenta del cliente: se genera una invitación y el
/// entrenador le comparte el enlace. El cliente crea su propia cuenta
/// (correo o Google) y el enlace lo vincula automáticamente a este
/// entrenador con los datos que se cargan aquí.
class ClientFormScreen extends ConsumerStatefulWidget {
  const ClientFormScreen({super.key, this.clientId});

  /// `null` cuando es alta; con valor, se edita ese cliente.
  final String? clientId;

  bool get isEditing => clientId != null;

  @override
  ConsumerState<ClientFormScreen> createState() => _ClientFormScreenState();
}

class _ClientFormScreenState extends ConsumerState<ClientFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _healthNotesController = TextEditingController();

  ClientGoal? _goal;
  bool _isSaving = false;
  String? _errorMessage;
  bool _prefilled = false;

  /// Enlace recién generado. Mientras tenga valor se muestra la pantalla
  /// de "listo, comparte esto", en vez de volver de inmediato: si el
  /// entrenador no copia el enlace, la invitación no le sirve de nada.
  String? _createdLink;

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _healthNotesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      final repository = ref.read(clientsRepositoryProvider);

      if (widget.isEditing) {
        await repository.updateClient(
          clientId: widget.clientId!,
          fullName: _fullNameController.text,
          goal: _goal,
          healthNotes: _healthNotesController.text,
          phone: _phoneController.text,
        );
        ref.invalidate(clientsProvider);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cliente actualizado.')),
        );
        context.pop();
        return;
      }

      final trainerId = ref.read(currentUserProfileProvider).valueOrNull?.id;
      if (trainerId == null) {
        setState(() {
          _errorMessage =
              'No pudimos identificar tu cuenta. Vuelve a iniciar sesión.';
        });
        return;
      }

      final invitation = await repository.createInvitation(
        trainerId: trainerId,
        email: _emailController.text.trim(),
        fullName: _fullNameController.text.trim(),
        goal: _goal,
        healthNotes: _healthNotesController.text,
      );
      ref.invalidate(pendingInvitationsProvider);
      if (!mounted) return;
      setState(() => _createdLink = buildInvitationLink(invitation.token));
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

    // En edición, precarga una sola vez los datos actuales del cliente.
    if (widget.isEditing && !_prefilled) {
      final client = ref
          .watch(clientDetailProvider(widget.clientId!))
          .valueOrNull;
      if (client != null) {
        _fullNameController.text = client.fullName;
        _emailController.text = client.email;
        _phoneController.text = client.phone ?? '';
        _healthNotesController.text = client.healthNotes ?? '';
        _goal = client.goal;
        _prefilled = true;
      }
    }

    if (_createdLink != null) {
      return _InvitationReadyScreen(
        link: _createdLink!,
        clientName: _fullNameController.text.trim(),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isEditing ? 'Editar cliente' : 'Agregar cliente'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_errorMessage != null) ...[
                      AuthMessageBanner(message: _errorMessage!),
                      const SizedBox(height: AppSpacing.md),
                    ],
                    if (!widget.isEditing) ...[
                      Text(
                        'Al guardar generamos un enlace para que tu cliente '
                        'se una a tu programa. Él crea su cuenta como '
                        'prefiera, con correo o con Google.',
                        style: theme.textTheme.bodyMedium,
                      ),
                      const SizedBox(height: AppSpacing.lg),
                    ],
                    Text('Datos básicos', style: theme.textTheme.titleMedium),
                    const SizedBox(height: AppSpacing.sm),
                    TextFormField(
                      controller: _fullNameController,
                      textCapitalization: TextCapitalization.words,
                      textInputAction: TextInputAction.next,
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
                      // El correo identifica la cuenta del cliente; no se
                      // puede cambiar desde aquí una vez que se registró.
                      enabled: !widget.isEditing,
                      validator: widget.isEditing ? null : AuthValidators.email,
                      decoration: InputDecoration(
                        labelText: 'Correo electrónico',
                        helperText: widget.isEditing
                            ? 'El correo no se puede cambiar desde aquí.'
                            : 'A este correo le compartirás el enlace.',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Teléfono (opcional)',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Text(
                      'Objetivo principal',
                      style: theme.textTheme.titleMedium,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    _GoalSelector(
                      value: _goal,
                      onChanged: _isSaving
                          ? null
                          : (goal) => setState(() => _goal = goal),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Text(
                      'Restricciones de salud o alimentarias',
                      style: theme.textTheme.titleMedium,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    TextFormField(
                      controller: _healthNotesController,
                      maxLines: 4,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: const InputDecoration(
                        hintText:
                            'Por ejemplo: lesión de rodilla, intolerancia a '
                            'la lactosa, vegetariano.',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: FilledButton(
                        onPressed: _isSaving ? null : _submit,
                        child: _isSaving
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                ),
                              )
                            : Text(
                                widget.isEditing
                                    ? 'Guardar cambios'
                                    : 'Generar enlace de invitación',
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _GoalSelector extends StatelessWidget {
  const _GoalSelector({required this.value, required this.onChanged});

  final ClientGoal? value;
  final ValueChanged<ClientGoal?>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: AppSpacing.sm,
      runSpacing: AppSpacing.sm,
      children: [
        for (final goal in ClientGoal.values)
          ChoiceChip(
            label: Text(goal.label),
            selected: value == goal,
            showCheckmark: false,
            onSelected: onChanged == null
                ? null
                : (selected) => onChanged!(selected ? goal : null),
          ),
      ],
    );
  }
}

/// Confirmación tras crear la invitación, con el enlace listo para copiar.
class _InvitationReadyScreen extends StatelessWidget {
  const _InvitationReadyScreen({required this.link, required this.clientName});

  final String link;
  final String clientName;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Invitación lista')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const AuthMessageBanner(
                    tone: AuthMessageTone.success,
                    message: 'Listo. Comparte este enlace con tu cliente.',
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    clientName.isEmpty
                        ? 'Cuando abra el enlace y cree su cuenta, aparecerá '
                            'en tu lista de clientes.'
                        : 'Cuando $clientName abra el enlace y cree su cuenta, '
                            'aparecerá en tu lista de clientes.',
                    style: theme.textTheme.bodyMedium,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  AppCard(
                    child: SelectableText(
                      link,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurface,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: FilledButton.icon(
                      onPressed: () async {
                        await Clipboard.setData(ClipboardData(text: link));
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Enlace copiado.')),
                        );
                      },
                      icon: const AppIcon(AppIconPaths.contentCopy, size: 18),
                      label: const Text('Copiar enlace'),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: OutlinedButton(
                      onPressed: () => context.pop(),
                      child: const Text('Volver a mis clientes'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
