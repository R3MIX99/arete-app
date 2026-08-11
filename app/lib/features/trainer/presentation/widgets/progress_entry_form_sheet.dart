import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../../shared/providers/current_user_profile_provider.dart';
import '../../data/progress_providers.dart';

/// Abre la hoja para cargar un nuevo registro de progreso de un cliente.
/// Devuelve `true` si se guardó, `null`/`false` si se canceló.
Future<bool?> showProgressEntryFormSheet(
  BuildContext context, {
  required String clientId,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    builder: (context) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: _ProgressEntryFormSheet(clientId: clientId),
    ),
  );
}

class _ProgressEntryFormSheet extends ConsumerStatefulWidget {
  const _ProgressEntryFormSheet({required this.clientId});

  final String clientId;

  @override
  ConsumerState<_ProgressEntryFormSheet> createState() =>
      _ProgressEntryFormSheetState();
}

class _ProgressEntryFormSheetState
    extends ConsumerState<_ProgressEntryFormSheet> {
  final _weightController = TextEditingController();
  final _chestController = TextEditingController();
  final _waistController = TextEditingController();
  final _hipController = TextEditingController();
  final _armController = TextEditingController();
  final _thighController = TextEditingController();
  final _notesController = TextEditingController();

  DateTime _entryDate = DateTime.now();
  XFile? _photo;
  Uint8List? _photoBytes;
  bool _isSaving = false;
  String? _errorMessage;

  @override
  void dispose() {
    _weightController.dispose();
    _chestController.dispose();
    _waistController.dispose();
    _hipController.dispose();
    _armController.dispose();
    _thighController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _entryDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365 * 2)),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _entryDate = picked);
  }

  Future<void> _pickPhoto() async {
    final picked = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 1600,
      imageQuality: 85,
    );
    if (picked == null) return;
    final bytes = await picked.readAsBytes();
    setState(() {
      _photo = picked;
      _photoBytes = bytes;
    });
  }

  double? _parse(TextEditingController controller) {
    final trimmed = controller.text.trim().replaceAll(',', '.');
    return trimmed.isEmpty ? null : double.tryParse(trimmed);
  }

  Future<void> _submit() async {
    final weight = _parse(_weightController);
    final chest = _parse(_chestController);
    final waist = _parse(_waistController);
    final hip = _parse(_hipController);
    final arm = _parse(_armController);
    final thigh = _parse(_thighController);

    if (weight == null &&
        chest == null &&
        waist == null &&
        hip == null &&
        arm == null &&
        thigh == null &&
        _photoBytes == null) {
      setState(() {
        _errorMessage = 'Carga al menos un dato: peso, una medida o una foto.';
      });
      return;
    }

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

      String? photoPath;
      if (_photoBytes != null && _photo != null) {
        final ext = _photo!.name.contains('.')
            ? _photo!.name.split('.').last
            : 'jpg';
        photoPath = await ref.read(progressRepositoryProvider).uploadPhoto(
              clientId: widget.clientId,
              bytes: _photoBytes!,
              fileExtension: ext,
            );
      }

      await ref.read(progressRepositoryProvider).createEntry(
            trainerId: trainerId,
            clientId: widget.clientId,
            entryDate: _entryDate,
            weightKg: weight,
            chestCm: chest,
            waistCm: waist,
            hipCm: hip,
            armCm: arm,
            thighCm: thigh,
            photoPath: photoPath,
            notes: _notesController.text,
          );
      ref.invalidate(progressEntriesProvider(widget.clientId));
      if (!mounted) return;
      Navigator.of(context).pop(true);
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

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Nuevo registro de progreso', style: theme.textTheme.titleLarge),
              const SizedBox(height: AppSpacing.md),
              if (_errorMessage != null) ...[
                Text(_errorMessage!, style: TextStyle(color: theme.colorScheme.error)),
                const SizedBox(height: AppSpacing.sm),
              ],
              InkWell(
                onTap: _pickDate,
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const AppIcon(AppIconPaths.calendarMonth, size: 18),
                      const SizedBox(width: AppSpacing.sm),
                      Text(DateFormat('d MMM y', 'es_419').format(_entryDate)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              TextField(
                controller: _weightController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Peso (kg)'),
              ),
              const SizedBox(height: AppSpacing.md),
              Text('Medidas (cm, opcional)', style: theme.textTheme.titleMedium),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _chestController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Pecho'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: TextField(
                      controller: _waistController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Cintura'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _hipController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Cadera'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: TextField(
                      controller: _armController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Brazo'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              TextField(
                controller: _thighController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Muslo'),
              ),
              const SizedBox(height: AppSpacing.md),
              Text('Foto (opcional)', style: theme.textTheme.titleMedium),
              const SizedBox(height: AppSpacing.sm),
              if (_photoBytes != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.memory(_photoBytes!, height: 140, fit: BoxFit.cover),
                ),
              const SizedBox(height: AppSpacing.sm),
              OutlinedButton.icon(
                onPressed: _pickPhoto,
                icon: const AppIcon(AppIconPaths.add, size: 16),
                label: Text(_photoBytes == null ? 'Elegir foto' : 'Cambiar foto'),
              ),
              const SizedBox(height: AppSpacing.md),
              TextField(
                controller: _notesController,
                maxLines: 2,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(labelText: 'Notas (opcional)'),
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
                      : const Text('Guardar registro'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
