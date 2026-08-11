import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../../shared/models/client_goal.dart';
import '../../../shared/models/profile.dart';
import '../../../shared/providers/current_user_profile_provider.dart';
import '../../../shared/widgets/app_card.dart';
import '../../data/assignments_providers.dart';
import '../../data/clients_providers.dart';
import '../../data/diet_plan_assignments_providers.dart';
import '../widgets/diet_plan_picker_sheet.dart';
import '../widgets/diet_plan_scale_dialog.dart';

/// Ficha completa de un cliente.
class ClientDetailScreen extends ConsumerWidget {
  const ClientDetailScreen({super.key, required this.clientId});

  final String clientId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final clientAsync = ref.watch(clientDetailProvider(clientId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Cliente'),
        actions: [
          if (clientAsync.hasValue)
            IconButton(
              tooltip: 'Editar',
              icon: const AppIcon(AppIconPaths.edit),
              onPressed: () =>
                  context.push(AppRoutes.trainerClientEdit(clientId)),
            ),
        ],
      ),
      body: SafeArea(
        child: switch (clientAsync) {
          AsyncLoading() => const Center(child: CircularProgressIndicator()),
          AsyncError(:final error) => _DetailError(error: error),
          AsyncValue(:final value?) => _ClientDetailBody(client: value),
          _ => const SizedBox.shrink(),
        },
      ),
    );
  }
}

class _DetailError extends StatelessWidget {
  const _DetailError({required this.error});

  final Object error;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const AppIcon(
              AppIconPaths.error,
              size: 40,
              color: AppColors.danger,
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'No se pudo cargar este cliente',
              style: theme.textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              (error as dynamic).message as String? ??
                  'Intenta de nuevo en unos minutos.',
              style: theme.textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _ClientDetailBody extends ConsumerStatefulWidget {
  const _ClientDetailBody({required this.client});

  final Profile client;

  @override
  ConsumerState<_ClientDetailBody> createState() => _ClientDetailBodyState();
}

class _ClientDetailBodyState extends ConsumerState<_ClientDetailBody> {
  bool _isChangingStatus = false;

  Future<void> _toggleStatus() async {
    final client = widget.client;
    final deactivating = client.isActive;

    if (deactivating) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('¿Desactivar a este cliente?'),
          content: Text(
            '${client.displayName} dejará de aparecer entre tus clientes '
            'activos. No se borra nada: su historial se conserva y puedes '
            'reactivarlo cuando quieras.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Desactivar'),
            ),
          ],
        ),
      );
      if (confirmed != true || !mounted) return;
    }

    setState(() => _isChangingStatus = true);
    try {
      await ref.read(clientsRepositoryProvider).setClientStatus(
            clientId: client.id,
            status: deactivating ? ClientStatus.inactive : ClientStatus.active,
          );
      ref.invalidate(clientsProvider);
      ref.invalidate(clientDetailProvider(client.id));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            deactivating ? 'Cliente desactivado.' : 'Cliente reactivado.',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text((error as dynamic).message as String)),
      );
    } finally {
      if (mounted) setState(() => _isChangingStatus = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final client = widget.client;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 700),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!client.isActive) ...[
                _InactiveBanner(),
                const SizedBox(height: AppSpacing.md),
              ],
              _Section(
                title: 'Datos personales',
                child: Column(
                  children: [
                    _Row(label: 'Nombre', value: client.fullName),
                    _Row(label: 'Correo', value: client.email),
                    _Row(label: 'Teléfono', value: client.phone),
                    _Row(
                      label: 'Cliente desde',
                      value: _formatDate(client.createdAt),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              _Section(
                title: 'Objetivo',
                child: _Row(label: 'Objetivo principal', value: client.goal?.label),
              ),
              const SizedBox(height: AppSpacing.md),
              _Section(
                title: 'Restricciones de salud o alimentarias',
                child: Text(
                  (client.healthNotes?.trim().isNotEmpty ?? false)
                      ? client.healthNotes!.trim()
                      : 'Sin restricciones registradas.',
                  style: theme.textTheme.bodyLarge,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              _Section(
                title: 'Plan asignado',
                child: _AssignedPlan(clientId: client.id),
              ),
              const SizedBox(height: AppSpacing.md),
              _Section(
                title: 'Dieta asignada',
                child: _AssignedDietPlan(clientId: client.id),
              ),
              const SizedBox(height: AppSpacing.md),
              // Esta sección se llena cuando exista el módulo de
              // progreso. Se muestra vacía desde ahora para que la ficha
              // ya tenga su forma final y no sorprenda después con un
              // cambio de estructura.
              const _Section(
                title: 'Progreso reciente',
                child: _Pending('Sin registros de progreso todavía.'),
              ),
              const SizedBox(height: AppSpacing.lg),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton.icon(
                  onPressed: _isChangingStatus ? null : _toggleStatus,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: client.isActive ? AppColors.danger : null,
                    side: BorderSide(
                      color: client.isActive
                          ? AppColors.danger.withValues(alpha: 0.5)
                          : theme.colorScheme.outline,
                    ),
                  ),
                  icon: _isChangingStatus
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : AppIcon(
                          client.isActive
                              ? AppIconPaths.personOff
                              : AppIconPaths.restartAlt,
                          size: 18,
                        ),
                  label: Text(
                    client.isActive
                        ? 'Desactivar cliente'
                        : 'Reactivar cliente',
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
            ],
          ),
        ),
      ),
    );
  }

  static String _formatDate(DateTime date) {
    final d = date.day.toString().padLeft(2, '0');
    final m = date.month.toString().padLeft(2, '0');
    return '$d/$m/${date.year}';
  }
}

class _InactiveBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.warning.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const AppIcon(
            AppIconPaths.personOff,
            size: 20,
            color: AppColors.warning,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              'Este cliente está inactivo. Su historial se conserva.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.warning,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: theme.textTheme.titleMedium),
        const SizedBox(height: AppSpacing.sm),
        AppCard(child: child),
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});

  final String label;
  final String? value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasValue = value?.trim().isNotEmpty ?? false;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(label, style: theme.textTheme.bodyMedium),
          ),
          Expanded(
            child: Text(
              hasValue ? value!.trim() : 'Sin registrar',
              style: theme.textTheme.bodyLarge?.copyWith(
                color: hasValue
                    ? null
                    : theme.colorScheme.onSurface.withValues(alpha: 0.45),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Pending extends StatelessWidget {
  const _Pending(this.message);

  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Text(
      message,
      style: theme.textTheme.bodyMedium?.copyWith(
        color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
      ),
    );
  }
}

/// Programa o rutina suelta que este cliente tiene asignado ahora mismo
/// (el más reciente por fecha de inicio). Un toque lleva al constructor
/// del programa o de la rutina, según corresponda.
class _AssignedPlan extends ConsumerWidget {
  const _AssignedPlan({required this.clientId});

  final String clientId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final assignmentAsync = ref.watch(latestAssignmentForClientProvider(clientId));

    if (assignmentAsync.isLoading) {
      return const SizedBox(
        height: 20,
        width: 20,
        child: CircularProgressIndicator(strokeWidth: 2),
      );
    }
    if (assignmentAsync.hasError) {
      return const _Pending('No se pudo cargar el plan asignado.');
    }

    // `AssignmentSummary?`: null tanto si ya cargó y no hay nada asignado
    // como (en teoría) si el AsyncValue no tiene dato todavía; los dos
    // casos anteriores ya descartaron lo segundo, así que acá null
    // significa, sin ambigüedad, "no hay nada asignado".
    final summary = assignmentAsync.value;
    if (summary == null) {
      return const _Pending('Todavía no le asignaste un programa ni una rutina.');
    }

    final assignment = summary.assignment;
    return InkWell(
      onTap: () {
        if (assignment.isProgram) {
          context.push(AppRoutes.trainerProgramDetail(assignment.programId!));
        } else {
          context.push(AppRoutes.trainerRoutineDetail(assignment.routineId!));
        }
      },
      borderRadius: BorderRadius.circular(8),
      child: Row(
        children: [
          AppIcon(
            assignment.isProgram
                ? AppIconPaths.calendarViewMonth
                : AppIconPaths.fitnessCenter,
            size: 20,
            color: theme.colorScheme.primary,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  summary.itemName,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  '${assignment.isProgram ? "Programa" : "Rutina suelta"} · '
                  'desde el ${DateFormat('d MMM y', 'es_419').format(assignment.startDate)}',
                  style: theme.textTheme.bodyMedium,
                ),
              ],
            ),
          ),
          const AppIcon(AppIconPaths.chevronRight, size: 18),
        ],
      ),
    );
  }
}

/// Plan de alimentación que este cliente tiene asignado ahora mismo (el
/// más reciente por fecha de inicio), con un acceso directo para
/// asignarle uno sin pasar por el listado de "Planes Nutricionales": útil
/// para casos puntuales que el entrenador arma pensando en un solo
/// cliente.
class _AssignedDietPlan extends ConsumerWidget {
  const _AssignedDietPlan({required this.clientId});

  final String clientId;

  Future<void> _assign(BuildContext context, WidgetRef ref) async {
    final plan = await showDietPlanPicker(context);
    if (plan == null || !context.mounted) return;

    final startDate = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
    );
    if (startDate == null || !context.mounted) return;

    var scaleFactor = 1.0;
    double? targetCalories;
    if (plan.dailyCalorieTarget != null) {
      final scaleResult = await showDietPlanScaleDialog(
        context,
        planDailyCalorieTarget: plan.dailyCalorieTarget!,
      );
      if (scaleResult == null || !context.mounted) return;
      scaleFactor = scaleResult.scaleFactor;
      targetCalories = scaleResult.targetDailyCalories;
    }

    final trainerId = ref.read(currentUserProfileProvider).valueOrNull?.id;
    if (trainerId == null) return;

    try {
      await ref.read(dietPlanAssignmentsRepositoryProvider).assignPlanToClients(
            trainerId: trainerId,
            clientIds: [clientId],
            dietPlanId: plan.id,
            startDate: startDate,
            targetDailyCalories: targetCalories,
            scaleFactor: scaleFactor,
          );
      ref.invalidate(latestDietPlanAssignmentForClientProvider(clientId));
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('"${plan.name}" asignado.')),
      );
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text((error as dynamic).message as String)));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final assignmentAsync =
        ref.watch(latestDietPlanAssignmentForClientProvider(clientId));

    if (assignmentAsync.isLoading) {
      return const SizedBox(
        height: 20,
        width: 20,
        child: CircularProgressIndicator(strokeWidth: 2),
      );
    }
    if (assignmentAsync.hasError) {
      return const _Pending('No se pudo cargar el plan asignado.');
    }

    final summary = assignmentAsync.value;
    if (summary == null) {
      return Row(
        children: [
          const Expanded(
            child: _Pending('Todavía no le asignaste un plan nutricional.'),
          ),
          TextButton.icon(
            onPressed: () => _assign(context, ref),
            icon: const AppIcon(AppIconPaths.personAdd, size: 16),
            label: const Text('Asignar'),
          ),
        ],
      );
    }

    final assignment = summary.assignment;
    return InkWell(
      onTap: () =>
          context.push(AppRoutes.trainerDietPlanDetail(assignment.dietPlanId)),
      borderRadius: BorderRadius.circular(8),
      child: Row(
        children: [
          AppIcon(
            AppIconPaths.nutrition,
            size: 20,
            color: theme.colorScheme.primary,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  summary.planName,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  'Desde el '
                  '${DateFormat('d MMM y', 'es_419').format(assignment.startDate)}',
                  style: theme.textTheme.bodyMedium,
                ),
              ],
            ),
          ),
          const AppIcon(AppIconPaths.chevronRight, size: 18),
        ],
      ),
    );
  }
}
