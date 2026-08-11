import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/youtube.dart';
import '../../../../core/widgets/youtube_preview.dart';
import '../../../auth/presentation/widgets/auth_message_banner.dart';
import '../../../shared/providers/current_user_profile_provider.dart';
import '../../domain/exercise.dart';
import '../../data/exercises_providers.dart';
import '../widgets/catalog_validators.dart';

/// Alta y edición de un ejercicio de la biblioteca, con previsualización
/// embebida del video de YouTube mientras se escribe el enlace.
class ExerciseFormScreen extends ConsumerStatefulWidget {
  const ExerciseFormScreen({super.key, this.exerciseId});

  /// `null` cuando es alta; con valor, se edita ese ejercicio.
  final String? exerciseId;

  bool get isEditing => exerciseId != null;

  @override
  ConsumerState<ExerciseFormScreen> createState() =>
      _ExerciseFormScreenState();
}

class _ExerciseFormScreenState extends ConsumerState<ExerciseFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _videoUrlController = TextEditingController();

  MuscleGroup _muscleGroup = MuscleGroup.fullBody;
  Equipment _equipment = Equipment.bodyweight;
  bool _isSaving = false;
  String? _errorMessage;
  bool _prefilled = false;

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _videoUrlController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      final repository = ref.read(exercisesRepositoryProvider);

      if (widget.isEditing) {
        await repository.updateExercise(
          exerciseId: widget.exerciseId!,
          name: _nameController.text,
          muscleGroup: _muscleGroup,
          equipment: _equipment,
          description: _descriptionController.text,
          videoUrl: _videoUrlController.text,
        );
      } else {
        final trainerId = ref.read(currentUserProfileProvider).valueOrNull?.id;
        if (trainerId == null) {
          setState(() {
            _errorMessage =
                'No pudimos identificar tu cuenta. Vuelve a iniciar sesión.';
          });
          return;
        }
        await repository.createExercise(
          trainerId: trainerId,
          name: _nameController.text,
          muscleGroup: _muscleGroup,
          equipment: _equipment,
          description: _descriptionController.text,
          videoUrl: _videoUrlController.text,
        );
      }

      ref.invalidate(exercisesProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            widget.isEditing ? 'Ejercicio actualizado.' : 'Ejercicio creado.',
          ),
        ),
      );
      context.pop();
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

    if (widget.isEditing && !_prefilled) {
      final exercise = ref
          .watch(exerciseDetailProvider(widget.exerciseId!))
          .valueOrNull;
      if (exercise != null) {
        _nameController.text = exercise.name;
        _descriptionController.text = exercise.description ?? '';
        _videoUrlController.text = exercise.videoUrl ?? '';
        _muscleGroup = exercise.muscleGroup;
        _equipment = exercise.equipment;
        _prefilled = true;
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isEditing ? 'Editar ejercicio' : 'Nuevo ejercicio'),
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
                    TextFormField(
                      controller: _nameController,
                      textCapitalization: TextCapitalization.sentences,
                      textInputAction: TextInputAction.next,
                      validator: CatalogValidators.exerciseName,
                      decoration: const InputDecoration(
                        labelText: 'Nombre del ejercicio',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Text('Grupo muscular', style: theme.textTheme.titleMedium),
                    const SizedBox(height: AppSpacing.sm),
                    Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.sm,
                      children: [
                        for (final group in MuscleGroup.values)
                          ChoiceChip(
                            label: Text(group.label),
                            selected: _muscleGroup == group,
                            showCheckmark: false,
                            onSelected: _isSaving
                                ? null
                                : (_) => setState(() => _muscleGroup = group),
                          ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Text('Equipo necesario', style: theme.textTheme.titleMedium),
                    const SizedBox(height: AppSpacing.sm),
                    Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.sm,
                      children: [
                        for (final equipment in Equipment.values)
                          ChoiceChip(
                            label: Text(equipment.label),
                            selected: _equipment == equipment,
                            showCheckmark: false,
                            onSelected: _isSaving
                                ? null
                                : (_) => setState(() => _equipment = equipment),
                          ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Text('Descripción', style: theme.textTheme.titleMedium),
                    const SizedBox(height: AppSpacing.sm),
                    TextFormField(
                      controller: _descriptionController,
                      maxLines: 3,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: const InputDecoration(
                        hintText: 'Cómo se ejecuta, técnica, indicaciones.',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Text(
                      'Video de referencia (YouTube)',
                      style: theme.textTheme.titleMedium,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    TextFormField(
                      controller: _videoUrlController,
                      keyboardType: TextInputType.url,
                      validator: CatalogValidators.youtubeUrl,
                      onChanged: (_) => setState(() {}),
                      decoration: const InputDecoration(
                        hintText: 'https://www.youtube.com/watch?v=...',
                      ),
                    ),
                    if (isYoutubeUrl(_videoUrlController.text)) ...[
                      const SizedBox(height: AppSpacing.md),
                      YoutubePreview(url: _videoUrlController.text),
                    ],
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
                                    : 'Crear ejercicio',
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

