import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../../auth/presentation/widgets/auth_message_banner.dart';
import '../../../shared/models/client_goal.dart';
import '../../../shared/providers/current_user_profile_provider.dart';
import '../../../shared/widgets/app_card.dart';
import '../../data/assignments_providers.dart';
import '../../data/programs_providers.dart';
import '../../domain/client_assignment.dart';
import '../../domain/program.dart';
import '../../domain/program_routine.dart';
import '../../domain/weekday.dart';
import '../widgets/assign_to_clients_sheet.dart';
import '../widgets/assignment_overrides_sheet.dart';
import '../widgets/catalog_validators.dart';
import '../widgets/program_slot_dialog.dart';
import '../widgets/routine_picker_sheet.dart';

/// Constructor de programas.
///
/// Sin `programId` primero pide los datos básicos (nombre, duración en
/// semanas, objetivo, descripción); al guardarlos se crea el programa y
/// la pantalla pasa a modo edición con su id, donde ya se pueden ubicar
/// rutinas de la biblioteca en días específicos de cada semana, asignar
/// el programa a clientes y ajustar una rutina puntual por cliente.
class ProgramFormScreen extends ConsumerStatefulWidget {
  const ProgramFormScreen({super.key, this.programId});

  final String? programId;

  @override
  ConsumerState<ProgramFormScreen> createState() => _ProgramFormScreenState();
}

class _ProgramFormScreenState extends ConsumerState<ProgramFormScreen> {
  @override
  Widget build(BuildContext context) {
    if (widget.programId == null) {
      return const _CreateProgramScreen();
    }
    return _ProgramBuilderScreen(programId: widget.programId!);
  }
}

class _CreateProgramScreen extends ConsumerStatefulWidget {
  const _CreateProgramScreen();

  @override
  ConsumerState<_CreateProgramScreen> createState() =>
      _CreateProgramScreenState();
}

class _CreateProgramScreenState extends ConsumerState<_CreateProgramScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _durationController = TextEditingController(text: '4');
  ClientGoal? _goal;
  bool _isSaving = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _durationController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      final trainerId = ref.read(currentUserProfileProvider).valueOrNull?.id;
      if (trainerId == null) {
        setState(() {
          _errorMessage =
              'No pudimos identificar tu cuenta. Vuelve a iniciar sesión.';
        });
        return;
      }

      final program = await ref.read(programsRepositoryProvider).createProgram(
            trainerId: trainerId,
            name: _nameController.text,
            durationWeeks: int.parse(_durationController.text.trim()),
            description: _descriptionController.text,
            goal: _goal,
          );
      ref.invalidate(programsProvider);
      if (!mounted) return;
      context.pushReplacement(AppRoutes.trainerProgramDetail(program.id));
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

    return Scaffold(
      appBar: AppBar(title: const Text('Nuevo programa')),
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
                    Text(
                      'Después de guardar podrás ubicar rutinas de tu '
                      'biblioteca en días específicos de cada semana.',
                      style: theme.textTheme.bodyMedium,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    TextFormField(
                      controller: _nameController,
                      textCapitalization: TextCapitalization.sentences,
                      textInputAction: TextInputAction.next,
                      validator: CatalogValidators.programName,
                      decoration: const InputDecoration(
                        labelText: 'Nombre del programa',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextFormField(
                      controller: _durationController,
                      keyboardType: TextInputType.number,
                      validator: (v) => CatalogValidators.positiveInt(
                        v,
                        label: 'la duración en semanas',
                      ),
                      decoration: const InputDecoration(
                        labelText: 'Duración (semanas)',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextFormField(
                      controller: _descriptionController,
                      maxLines: 3,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: const InputDecoration(
                        labelText: 'Descripción (opcional)',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Text('Objetivo', style: theme.textTheme.titleMedium),
                    const SizedBox(height: AppSpacing.sm),
                    Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.sm,
                      children: [
                        for (final goal in ClientGoal.values)
                          ChoiceChip(
                            label: Text(goal.label),
                            selected: _goal == goal,
                            showCheckmark: false,
                            onSelected: _isSaving
                                ? null
                                : (selected) =>
                                    setState(() => _goal = selected ? goal : null),
                          ),
                      ],
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
                            : const Text('Crear programa y ubicar rutinas'),
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

class _ProgramBuilderScreen extends ConsumerWidget {
  const _ProgramBuilderScreen({required this.programId});

  final String programId;

  Future<void> _addRoutine(
    BuildContext context,
    WidgetRef ref,
    Program program,
  ) async {
    final routine = await showRoutinePicker(context);
    if (routine == null || !context.mounted) return;

    final slot = await showProgramSlotDialog(
      context,
      durationWeeks: program.durationWeeks,
    );
    if (slot == null) return;

    try {
      await ref.read(programsRepositoryProvider).addRoutineToProgram(
            programId: programId,
            routineId: routine.id,
            weekNumber: slot.weekNumber,
            dayOfWeek: slot.dayOfWeek,
          );
      ref.invalidate(programDetailProvider(programId));
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text((error as dynamic).message as String)));
    }
  }

  Future<void> _removeSlot(
    BuildContext context,
    WidgetRef ref,
    ProgramRoutine slot,
  ) async {
    try {
      await ref.read(programsRepositoryProvider).removeProgramRoutine(slot.id);
      ref.invalidate(programDetailProvider(programId));
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text((error as dynamic).message as String)));
    }
  }

  Future<void> _assignToClients(
    BuildContext context,
    WidgetRef ref,
    Program program,
  ) async {
    final selection = await showAssignToClientsSheet(
      context,
      title: 'Asignar "${program.name}"',
    );
    if (selection == null || !context.mounted) return;

    final trainerId = ref.read(currentUserProfileProvider).valueOrNull?.id;
    if (trainerId == null) return;

    final result = await ref.read(assignmentsRepositoryProvider).assignProgramToClients(
          trainerId: trainerId,
          clientIds: selection.clientIds,
          programId: programId,
          startDate: selection.startDate,
        );
    ref.invalidate(assignmentsForProgramProvider(programId));
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          result.hasFailures
              ? 'Asignado a ${result.succeeded}. ${result.failedCount} ya '
                  'lo tenían asignado o no se pudo.'
              : 'Programa asignado a ${result.succeeded} '
                  '${result.succeeded == 1 ? 'cliente' : 'clientes'}.',
        ),
      ),
    );
  }

  Future<void> _editBasicInfo(
    BuildContext context,
    WidgetRef ref,
    Program program,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: _EditBasicInfoSheet(programId: programId, program: program),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(programDetailProvider(programId));

    return Scaffold(
      appBar: AppBar(
        title: Text(detailAsync.valueOrNull?.program.name ?? 'Programa'),
        actions: [
          if (detailAsync.valueOrNull != null) ...[
            IconButton(
              icon: const AppIcon(AppIconPaths.personAdd, size: 20),
              tooltip: 'Asignar a clientes',
              onPressed: () =>
                  _assignToClients(context, ref, detailAsync.value!.program),
            ),
            IconButton(
              icon: const AppIcon(AppIconPaths.edit, size: 20),
              tooltip: 'Editar información',
              onPressed: () =>
                  _editBasicInfo(context, ref, detailAsync.value!.program),
            ),
          ],
        ],
      ),
      floatingActionButton: detailAsync.valueOrNull == null
          ? null
          : FloatingActionButton.extended(
              onPressed: () =>
                  _addRoutine(context, ref, detailAsync.value!.program),
              icon: const AppIcon(AppIconPaths.add, size: 20),
              label: const Text('Agregar rutina'),
            ),
      body: switch (detailAsync) {
        AsyncLoading() => const Center(child: CircularProgressIndicator()),
        AsyncError(:final error) => Center(
            child: Text('No se pudo cargar el programa: $error'),
          ),
        AsyncValue(:final value?) => _ProgramBuilderBody(
            programId: programId,
            detail: value,
            onRemoveSlot: (slot) => _removeSlot(context, ref, slot),
          ),
        _ => const SizedBox.shrink(),
      },
    );
  }
}

class _ProgramBuilderBody extends ConsumerWidget {
  const _ProgramBuilderBody({
    required this.programId,
    required this.detail,
    required this.onRemoveSlot,
  });

  final String programId;
  final ProgramDetail detail;
  final void Function(ProgramRoutine slot) onRemoveSlot;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final program = detail.program;
    final assignmentsAsync = ref.watch(assignmentsForProgramProvider(programId));

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.md,
        AppSpacing.md,
        96,
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 700),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: AppSpacing.xs,
                      runSpacing: AppSpacing.xs,
                      children: [
                        _Tag(
                          label: program.durationWeeks == 1
                              ? '1 semana'
                              : '${program.durationWeeks} semanas',
                        ),
                        if (program.goal != null) _Tag(label: program.goal!.label),
                      ],
                    ),
                    if (program.description != null &&
                        program.description!.trim().isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.sm),
                      Text(program.description!, style: theme.textTheme.bodyMedium),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              for (var week = 1; week <= program.durationWeeks; week++) ...[
                Text('Semana $week', style: theme.textTheme.titleMedium),
                const SizedBox(height: AppSpacing.sm),
                AppCard(
                  child: Column(
                    children: [
                      for (final day in Weekday.values)
                        _DayRow(
                          day: day,
                          slots: detail
                              .routinesForWeek(week)
                              .where((s) => s.dayOfWeek == day)
                              .toList(),
                          onRemoveSlot: onRemoveSlot,
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
              ],
              const SizedBox(height: AppSpacing.sm),
              Text('Clientes asignados', style: theme.textTheme.titleMedium),
              const SizedBox(height: AppSpacing.sm),
              switch (assignmentsAsync) {
                AsyncLoading() => const Center(
                    child: Padding(
                      padding: EdgeInsets.all(AppSpacing.md),
                      child: CircularProgressIndicator(),
                    ),
                  ),
                AsyncError() => Text(
                    'No se pudieron cargar los clientes asignados.',
                    style: theme.textTheme.bodyMedium,
                  ),
                AsyncValue(:final value?) when value.isEmpty => Text(
                    'Todavía no le asignaste este programa a ningún cliente.',
                    style: theme.textTheme.bodyMedium,
                  ),
                AsyncValue(:final value?) => Column(
                    children: [
                      for (final summary in value)
                        _AssignedClientTile(
                          summary: summary,
                          slots: detail.routines,
                        ),
                    ],
                  ),
                _ => const SizedBox.shrink(),
              },
            ],
          ),
        ),
      ),
    );
  }
}

class _DayRow extends StatelessWidget {
  const _DayRow({
    required this.day,
    required this.slots,
    required this.onRemoveSlot,
  });

  final Weekday day;
  final List<ProgramRoutine> slots;
  final void Function(ProgramRoutine slot) onRemoveSlot;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
            child: Text(
              day.label,
              style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
          Expanded(
            child: slots.isEmpty
                ? Text(
                    'Descanso',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
                    ),
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (final slot in slots)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  slot.routine.name,
                                  style: theme.textTheme.bodyLarge,
                                ),
                              ),
                              IconButton(
                                icon: const AppIcon(AppIconPaths.close, size: 16),
                                tooltip: 'Quitar',
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(
                                  minWidth: 32,
                                  minHeight: 32,
                                ),
                                onPressed: () => onRemoveSlot(slot),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _AssignedClientTile extends StatelessWidget {
  const _AssignedClientTile({required this.summary, required this.slots});

  final AssignmentSummary summary;
  final List<ProgramRoutine> slots;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final assignment = summary.assignment;

    return AppCard(
      onTap: () => showAssignmentOverridesSheet(
        context,
        assignmentId: assignment.id,
        clientName: summary.clientName,
        slots: slots,
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  summary.clientName,
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

class _Tag extends StatelessWidget {
  const _Tag({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 3),
      decoration: BoxDecoration(
        color: theme.colorScheme.primary.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelLarge?.copyWith(
          color: theme.colorScheme.primary,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

class _EditBasicInfoSheet extends ConsumerStatefulWidget {
  const _EditBasicInfoSheet({required this.programId, required this.program});

  final String programId;
  final Program program;

  @override
  ConsumerState<_EditBasicInfoSheet> createState() =>
      _EditBasicInfoSheetState();
}

class _EditBasicInfoSheetState extends ConsumerState<_EditBasicInfoSheet> {
  final _formKey = GlobalKey<FormState>();
  late final _nameController = TextEditingController(text: widget.program.name);
  late final _descriptionController =
      TextEditingController(text: widget.program.description ?? '');
  late final _durationController =
      TextEditingController(text: widget.program.durationWeeks.toString());
  late ClientGoal? _goal = widget.program.goal;
  bool _isSaving = false;

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _durationController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);
    try {
      await ref.read(programsRepositoryProvider).updateProgram(
            programId: widget.programId,
            name: _nameController.text,
            durationWeeks: int.parse(_durationController.text.trim()),
            description: _descriptionController.text,
            goal: _goal,
          );
      ref.invalidate(programsProvider);
      ref.invalidate(programDetailProvider(widget.programId));
      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text((error as dynamic).message as String)));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Editar información', style: theme.textTheme.titleLarge),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _nameController,
              textCapitalization: TextCapitalization.sentences,
              validator: CatalogValidators.programName,
              decoration: const InputDecoration(labelText: 'Nombre'),
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _durationController,
              keyboardType: TextInputType.number,
              validator: (v) =>
                  CatalogValidators.positiveInt(v, label: 'la duración en semanas'),
              decoration: const InputDecoration(labelText: 'Duración (semanas)'),
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _descriptionController,
              maxLines: 3,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                labelText: 'Descripción (opcional)',
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text('Objetivo', style: theme.textTheme.titleMedium),
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: [
                for (final goal in ClientGoal.values)
                  ChoiceChip(
                    label: Text(goal.label),
                    selected: _goal == goal,
                    showCheckmark: false,
                    onSelected: (selected) =>
                        setState(() => _goal = selected ? goal : null),
                  ),
              ],
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
