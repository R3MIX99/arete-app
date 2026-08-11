import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../data/routines_providers.dart';
import '../widgets/clients_empty_state.dart';
import '../widgets/routine_list_tile.dart';

/// Listado de rutinas de entrenamiento del entrenador, con buscador.
class TrainerRoutinesScreen extends ConsumerStatefulWidget {
  const TrainerRoutinesScreen({super.key});

  @override
  ConsumerState<TrainerRoutinesScreen> createState() =>
      _TrainerRoutinesScreenState();
}

class _TrainerRoutinesScreenState extends ConsumerState<TrainerRoutinesScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    ref.invalidate(routinesProvider);
    await ref.read(routinesProvider.future);
  }

  @override
  Widget build(BuildContext context) {
    final filtered = ref.watch(filteredRoutinesProvider);
    final query = ref.watch(routineSearchQueryProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(AppRoutes.trainerRoutineNew),
        icon: const AppIcon(AppIconPaths.add, size: 20),
        label: const Text('Nueva rutina'),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                AppSpacing.md,
                AppSpacing.md,
                AppSpacing.sm,
              ),
              sliver: SliverToBoxAdapter(
                child: TextField(
                  controller: _searchController,
                  onChanged: (value) =>
                      ref.read(routineSearchQueryProvider.notifier).state =
                          value,
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: 'Buscar rutina por nombre',
                    prefixIcon: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                      child: AppIcon(AppIconPaths.search, size: 20),
                    ),
                    prefixIconConstraints: const BoxConstraints(minWidth: 44),
                    suffixIcon: query.isEmpty
                        ? null
                        : IconButton(
                            icon: const AppIcon(AppIconPaths.close, size: 18),
                            tooltip: 'Limpiar búsqueda',
                            onPressed: () {
                              _searchController.clear();
                              ref
                                  .read(routineSearchQueryProvider.notifier)
                                  .state = '';
                            },
                          ),
                  ),
                ),
              ),
            ),
            switch (filtered) {
              AsyncLoading() => const SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(child: CircularProgressIndicator()),
                ),
              AsyncError(:final error) => SliverFillRemaining(
                  hasScrollBody: false,
                  child: _ErrorState(error: error, onRetry: _refresh),
                ),
              AsyncValue(:final value?) when value.isEmpty =>
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: query.isEmpty
                      ? ClientsEmptyState(
                          icon: AppIconPaths.calendarViewMonth,
                          title: 'Todavía no tienes rutinas',
                          message:
                              'Crea tu primera rutina agregando ejercicios '
                              'de tu biblioteca.',
                          action: FilledButton.icon(
                            onPressed: () =>
                                context.push(AppRoutes.trainerRoutineNew),
                            icon: const AppIcon(AppIconPaths.add, size: 18),
                            label: const Text('Nueva rutina'),
                          ),
                        )
                      : const ClientsEmptyState(
                          icon: AppIconPaths.search,
                          title: 'Sin resultados',
                          message:
                              'Ninguna rutina coincide con la búsqueda.',
                        ),
                ),
              AsyncValue(:final value?) => SliverPadding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.md,
                    0,
                    AppSpacing.md,
                    96,
                  ),
                  sliver: SliverList.separated(
                    itemCount: value.length,
                    separatorBuilder: (_, _) =>
                        const SizedBox(height: AppSpacing.sm),
                    itemBuilder: (context, index) {
                      final routine = value[index];
                      return RoutineListTile(
                        routine: routine,
                        onTap: () => context.push(
                          AppRoutes.trainerRoutineDetail(routine.id),
                        ),
                      );
                    },
                  ),
                ),
              _ => const SliverToBoxAdapter(child: SizedBox.shrink()),
            },
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.error, required this.onRetry});

  final Object error;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return ClientsEmptyState(
      icon: AppIconPaths.error,
      title: 'No se pudieron cargar tus rutinas',
      message: error is Exception
          ? (error as dynamic).message as String? ??
              'Intenta de nuevo en unos minutos.'
          : 'Intenta de nuevo en unos minutos.',
      action: OutlinedButton.icon(
        onPressed: onRetry,
        icon: const AppIcon(AppIconPaths.restartAlt, size: 18),
        label: const Text('Reintentar'),
      ),
    );
  }
}
