import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../../auth/presentation/widgets/auth_message_banner.dart';
import '../../../shared/models/client_goal.dart';
import '../../../shared/providers/current_user_profile_provider.dart';
import '../../../shared/widgets/app_card.dart';
import '../../data/routines_providers.dart';
import '../../domain/routine.dart';
import '../../domain/routine_exercise.dart';
import '../widgets/catalog_validators.dart';
import '../widgets/exercise_picker_sheet.dart';
import '../widgets/routine_exercise_card.dart';

/// Constructor de rutinas.
///
/// Sin `routineId` primero pide los datos básicos (nombre, objetivo,
/// nivel, descripción); al guardarlos se crea la rutina y la pantalla pasa
/// a modo edición con su id, donde ya se pueden agregar ejercicios de la
/// biblioteca, configurar las series de cada uno y reordenarlos.
class RoutineFormScreen extends ConsumerStatefulWidget {
  const RoutineFormScreen({super.key, this.routineId});

  final String? routineId;

  @override
  ConsumerState<RoutineFormScreen> createState() => _RoutineFormScreenState();
}

class _RoutineFormScreenState extends ConsumerState<RoutineFormScreen> {
  @override
  Widget build(BuildContext context) {
    if (widget.routineId == null) {
      return const _CreateRoutineScreen();
    }
    return _RoutineBuilderScreen(routineId: widget.routineId!);
  }
}

/// Paso 1: datos básicos de la rutina, antes de que exista una fila que
/// pueda tener ejercicios.
class _CreateRoutineScreen extends ConsumerStatefulWidget {
  const _CreateRoutineScreen();

  @override
  ConsumerState<_CreateRoutineScreen> createState() =>
      _CreateRoutineScreenState();
}

class _CreateRoutineScreenState extends ConsumerState<_CreateRoutineScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  ClientGoal? _goal;
  RoutineLevel _level = RoutineLevel.beginner;
  bool _isSaving = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
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

      final routine = await ref.read(routinesRepositoryProvider).createRoutine(
            trainerId: trainerId,
            name: _nameController.text,
            level: _level,
            description: _descriptionController.text,
            goal: _goal,
          );
      ref.invalidate(routinesProvider);
      if (!mounted) return;
      // Reemplaza esta pantalla (datos básicos) por el constructor de
      // ejercicios de la rutina recién creada: no tiene sentido volver
      // atrás a un formulario que ya cumplió su propósito.
      context.pushReplacement(AppRoutes.trainerRoutineDetail(routine.id));
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
      appBar: AppBar(title: const Text('Nueva rutina')),
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
                      'Después de guardar podrás agregar ejercicios de tu '
                      'biblioteca y configurar sus series.',
                      style: theme.textTheme.bodyMedium,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    TextFormField(
                      controller: _nameController,
                      textCapitalization: TextCapitalization.sentences,
                      textInputAction: TextInputAction.next,
                      validator: CatalogValidators.routineName,
                      decoration: const InputDecoration(
                        labelText: 'Nombre de la rutina',
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
                    const SizedBox(height: AppSpacing.lg),
                    Text('Nivel', style: theme.textTheme.titleMedium),
                    const SizedBox(height: AppSpacing.sm),
                    Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.sm,
                      children: [
                        for (final level in RoutineLevel.values)
                          ChoiceChip(
                            label: Text(level.label),
                            selected: _level == level,
                            showCheckmark: false,
                            onSelected: _isSaving
                                ? null
                                : (_) => setState(() => _level = level),
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
                            : const Text('Crear rutina y agregar ejercicios'),
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

/// Paso 2: constructor de ejercicios y series de una rutina ya creada.
class _RoutineBuilderScreen extends ConsumerWidget {
  const _RoutineBuilderScreen({required this.routineId});

  final String routineId;

  Future<void> _addExercise(BuildContext context, WidgetRef ref) async {
    final exercise = await showExercisePicker(context);
    if (exercise == null) return;

    final detail = ref.read(routineDetailProvider(routineId)).valueOrNull;
    final nextOrder = detail?.exercises.length ?? 0;

    try {
      await ref.read(routinesRepositoryProvider).addExerciseToRoutine(
            routineId: routineId,
            exerciseId: exercise.id,
            orderIndex: nextOrder,
          );
      ref.invalidate(routineDetailProvider(routineId));
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text((error as dynamic).message as String)));
    }
  }

  Future<void> _duplicate(BuildContext context, WidgetRef ref, Routine routine) async {
    final controller = TextEditingController(text: '${routine.name} (copia)');
    final newName = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Duplicar rutina'),
        content: TextField(
          controller: controller,
          autofocus: true,
          textCapitalization: TextCapitalization.sentences,
          decoration: const InputDecoration(labelText: 'Nombre de la copia'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(controller.text.trim()),
            child: const Text('Duplicar'),
          ),
        ],
      ),
    );
    if (newName == null || newName.isEmpty) return;

    try {
      final copy = await ref.read(routinesRepositoryProvider).duplicateRoutine(
            routineId: routineId,
            newName: newName,
          );
      ref.invalidate(routinesProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Rutina duplicada.')),
      );
      context.push(AppRoutes.trainerRoutineDetail(copy.id));
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text((error as dynamic).message as String)));
    }
  }

  Future<void> _editBasicInfo(
    BuildContext context,
    WidgetRef ref,
    Routine routine,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: _EditBasicInfoSheet(routineId: routineId, routine: routine),
      ),
    );
  }

  Future<void> _reorder(
    WidgetRef ref,
    List<RoutineExercise> exercises,
    int oldIndex,
    int newIndex,
  ) async {
    final updated = [...exercises];
    if (newIndex > oldIndex) newIndex -= 1;
    final moved = updated.removeAt(oldIndex);
    updated.insert(newIndex, moved);

    await ref
        .read(routinesRepositoryProvider)
        .reorderExercises(updated.map((e) => e.id).toList());
    ref.invalidate(routineDetailProvider(routineId));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(routineDetailProvider(routineId));

    return Scaffold(
      appBar: AppBar(
        title: Text(detailAsync.valueOrNull?.routine.name ?? 'Rutina'),
        actions: [
          if (detailAsync.valueOrNull != null) ...[
            IconButton(
              icon: const AppIcon(AppIconPaths.contentCopy, size: 20),
              tooltip: 'Duplicar rutina',
              onPressed: () =>
                  _duplicate(context, ref, detailAsync.value!.routine),
            ),
            IconButton(
              icon: const AppIcon(AppIconPaths.edit, size: 20),
              tooltip: 'Editar información',
              onPressed: () =>
                  _editBasicInfo(context, ref, detailAsync.value!.routine),
            ),
          ],
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _addExercise(context, ref),
        icon: const AppIcon(AppIconPaths.add, size: 20),
        label: const Text('Agregar ejercicio'),
      ),
      body: switch (detailAsync) {
        AsyncLoading() => const Center(child: CircularProgressIndicator()),
        AsyncError(:final error) => Center(
            child: Text('No se pudo cargar la rutina: $error'),
          ),
        AsyncValue(:final value?) => _RoutineBuilderBody(
            routineId: routineId,
            detail: value,
            onReorder: (oldIndex, newIndex) =>
                _reorder(ref, value.exercises, oldIndex, newIndex),
          ),
        _ => const SizedBox.shrink(),
      },
    );
  }
}

class _RoutineBuilderBody extends StatelessWidget {
  const _RoutineBuilderBody({
    required this.routineId,
    required this.detail,
    required this.onReorder,
  });

  final String routineId;
  final RoutineDetail detail;
  final void Function(int oldIndex, int newIndex) onReorder;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final routine = detail.routine;

    return CustomScrollView(
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            AppSpacing.md,
            AppSpacing.md,
            AppSpacing.sm,
          ),
          sliver: SliverToBoxAdapter(
            child: AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: AppSpacing.xs,
                    runSpacing: AppSpacing.xs,
                    children: [
                      _Tag(label: routine.level.label),
                      if (routine.goal != null) _Tag(label: routine.goal!.label),
                    ],
                  ),
                  if (routine.description != null &&
                      routine.description!.trim().isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Text(routine.description!, style: theme.textTheme.bodyMedium),
                  ],
                ],
              ),
            ),
          ),
        ),
        if (detail.exercises.isEmpty)
          SliverFillRemaining(
            hasScrollBody: false,
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Text(
                  'Agrega ejercicios de tu biblioteca para armar esta '
                  'rutina.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium,
                ),
              ),
            ),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              0,
              AppSpacing.md,
              96,
            ),
            sliver: SliverReorderableList(
              itemCount: detail.exercises.length,
              onReorder: onReorder,
              itemBuilder: (context, index) {
                final routineExercise = detail.exercises[index];
                return Padding(
                  key: ValueKey(routineExercise.id),
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: RoutineExerciseCard(
                    routineId: routineId,
                    routineExercise: routineExercise,
                    dragHandle: ReorderableDragStartListener(
                      index: index,
                      child: const AppIcon(
                        AppIconPaths.dragIndicator,
                        size: 20,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
      ],
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
  const _EditBasicInfoSheet({required this.routineId, required this.routine});

  final String routineId;
  final Routine routine;

  @override
  ConsumerState<_EditBasicInfoSheet> createState() =>
      _EditBasicInfoSheetState();
}

class _EditBasicInfoSheetState extends ConsumerState<_EditBasicInfoSheet> {
  final _formKey = GlobalKey<FormState>();
  late final _nameController = TextEditingController(text: widget.routine.name);
  late final _descriptionController =
      TextEditingController(text: widget.routine.description ?? '');
  late ClientGoal? _goal = widget.routine.goal;
  late RoutineLevel _level = widget.routine.level;
  bool _isSaving = false;

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);
    try {
      await ref.read(routinesRepositoryProvider).updateRoutine(
            routineId: widget.routineId,
            name: _nameController.text,
            level: _level,
            description: _descriptionController.text,
            goal: _goal,
          );
      ref.invalidate(routinesProvider);
      ref.invalidate(routineDetailProvider(widget.routineId));
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
              validator: CatalogValidators.routineName,
              decoration: const InputDecoration(labelText: 'Nombre'),
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
            const SizedBox(height: AppSpacing.md),
            Text('Nivel', style: theme.textTheme.titleMedium),
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: [
                for (final level in RoutineLevel.values)
                  ChoiceChip(
                    label: Text(level.label),
                    selected: _level == level,
                    showCheckmark: false,
                    onSelected: (_) => setState(() => _level = level),
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
