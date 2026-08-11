import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../data/routines_providers.dart';
import '../../domain/routine.dart';
import 'routine_list_tile.dart';

/// Selector de una rutina de la biblioteca para ubicarla en un programa.
/// Devuelve la [Routine] elegida, o `null` si se cerró sin elegir.
Future<Routine?> showRoutinePicker(BuildContext context) {
  return showModalBottomSheet<Routine>(
    context: context,
    isScrollControlled: true,
    builder: (context) => const _RoutinePickerSheet(),
  );
}

class _RoutinePickerSheet extends ConsumerStatefulWidget {
  const _RoutinePickerSheet();

  @override
  ConsumerState<_RoutinePickerSheet> createState() =>
      _RoutinePickerSheetState();
}

class _RoutinePickerSheetState extends ConsumerState<_RoutinePickerSheet> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final routinesAsync = ref.watch(routinesProvider);

    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Elegir rutina', style: theme.textTheme.titleLarge),
              const SizedBox(height: AppSpacing.md),
              TextField(
                onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
                decoration: const InputDecoration(
                  hintText: 'Buscar rutina por nombre',
                  prefixIcon: Padding(
                    padding: EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                    child: AppIcon(AppIconPaths.search, size: 20),
                  ),
                  prefixIconConstraints: BoxConstraints(minWidth: 44),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Expanded(
                child: routinesAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (error, _) => Center(
                    child: Text(
                      'No se pudieron cargar tus rutinas.',
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                  data: (routines) {
                    final filtered = _query.isEmpty
                        ? routines
                        : routines
                            .where((r) => r.name.toLowerCase().contains(_query))
                            .toList();

                    if (routines.isEmpty) {
                      return _EmptyLibrary(
                        onCreated: () => Navigator.of(context).pop(),
                      );
                    }
                    if (filtered.isEmpty) {
                      return Center(
                        child: Text(
                          'Ninguna rutina coincide con "$_query".',
                          style: theme.textTheme.bodyMedium,
                        ),
                      );
                    }

                    return ListView.separated(
                      controller: scrollController,
                      itemCount: filtered.length,
                      separatorBuilder: (_, _) =>
                          const SizedBox(height: AppSpacing.sm),
                      itemBuilder: (context, index) {
                        final routine = filtered[index];
                        return RoutineListTile(
                          routine: routine,
                          onTap: () => Navigator.of(context).pop(routine),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _EmptyLibrary extends StatelessWidget {
  const _EmptyLibrary({required this.onCreated});

  final VoidCallback onCreated;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Todavía no tienes rutinas creadas.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: AppSpacing.md),
          FilledButton.icon(
            onPressed: () {
              onCreated();
              context.push(AppRoutes.trainerRoutineNew);
            },
            icon: const AppIcon(AppIconPaths.add, size: 18),
            label: const Text('Crear rutina'),
          ),
        ],
      ),
    );
  }
}
