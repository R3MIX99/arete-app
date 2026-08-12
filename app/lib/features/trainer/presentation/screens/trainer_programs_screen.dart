import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../data/programs_providers.dart';
import '../widgets/clients_empty_state.dart';
import '../widgets/program_list_tile.dart';

/// A partir de este ancho, el listado pasa de filas a una grilla de
/// tarjetas cuadradas (hay espacio horizontal de sobra en escritorio).
const _desktopBreakpoint = 900.0;

/// Listado de programas del entrenador, con buscador.
class TrainerProgramsScreen extends ConsumerStatefulWidget {
  const TrainerProgramsScreen({super.key});

  @override
  ConsumerState<TrainerProgramsScreen> createState() =>
      _TrainerProgramsScreenState();
}

class _TrainerProgramsScreenState extends ConsumerState<TrainerProgramsScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    ref.invalidate(programsProvider);
    await ref.read(programsProvider.future);
  }

  @override
  Widget build(BuildContext context) {
    final filtered = ref.watch(filteredProgramsProvider);
    final query = ref.watch(programSearchQueryProvider);
    final isDesktop = MediaQuery.sizeOf(context).width >= _desktopBreakpoint;

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(AppRoutes.trainerProgramNew),
        icon: const AppIcon(AppIconPaths.add, size: 20),
        label: const Text('Nuevo programa'),
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
                      ref.read(programSearchQueryProvider.notifier).state =
                          value,
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: 'Buscar programa por nombre',
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
                                  .read(programSearchQueryProvider.notifier)
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
                          title: 'Todavía no tienes programas',
                          message:
                              'Un programa agrupa varias rutinas a lo largo '
                              'de varias semanas, listas para asignar a tus '
                              'clientes.',
                          action: FilledButton.icon(
                            onPressed: () =>
                                context.push(AppRoutes.trainerProgramNew),
                            icon: const AppIcon(AppIconPaths.add, size: 18),
                            label: const Text('Nuevo programa'),
                          ),
                        )
                      : const ClientsEmptyState(
                          icon: AppIconPaths.search,
                          title: 'Sin resultados',
                          message:
                              'Ningún programa coincide con la búsqueda.',
                        ),
                ),
              AsyncValue(:final value?) => SliverPadding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.md,
                    0,
                    AppSpacing.md,
                    96,
                  ),
                  sliver: isDesktop
                      ? SliverGrid(
                          gridDelegate:
                              const SliverGridDelegateWithMaxCrossAxisExtent(
                            maxCrossAxisExtent: 240,
                            mainAxisSpacing: AppSpacing.sm,
                            crossAxisSpacing: AppSpacing.sm,
                            childAspectRatio: 1,
                          ),
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final program = value[index];
                              return ProgramListTile(
                                program: program,
                                asGrid: true,
                                onTap: () => context.push(
                                  AppRoutes.trainerProgramDetail(program.id),
                                ),
                              );
                            },
                            childCount: value.length,
                          ),
                        )
                      : SliverList.separated(
                          itemCount: value.length,
                          separatorBuilder: (_, _) =>
                              const SizedBox(height: AppSpacing.sm),
                          itemBuilder: (context, index) {
                            final program = value[index];
                            return ProgramListTile(
                              program: program,
                              onTap: () => context.push(
                                AppRoutes.trainerProgramDetail(program.id),
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
      title: 'No se pudieron cargar tus programas',
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
