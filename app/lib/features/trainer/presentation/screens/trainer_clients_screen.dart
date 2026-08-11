import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../../shared/models/client_goal.dart';
import '../../data/clients_providers.dart';
import '../widgets/client_list_tile.dart';
import '../widgets/clients_empty_state.dart';
import '../widgets/pending_invitations_section.dart';

/// Listado de clientes del entrenador, con buscador y filtros por estado y
/// objetivo. Incluye arriba las invitaciones que siguen pendientes, para
/// que el entrenador no pierda de vista a quién ya invitó.
class TrainerClientsScreen extends ConsumerStatefulWidget {
  const TrainerClientsScreen({super.key});

  @override
  ConsumerState<TrainerClientsScreen> createState() =>
      _TrainerClientsScreenState();
}

class _TrainerClientsScreenState extends ConsumerState<TrainerClientsScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    ref.invalidate(clientsProvider);
    ref.invalidate(pendingInvitationsProvider);
    await ref.read(clientsProvider.future);
  }

  @override
  Widget build(BuildContext context) {
    final filtered = ref.watch(filteredClientsProvider);
    final hasFilters = ref.watch(hasActiveClientFiltersProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(AppRoutes.trainerClientNew),
        icon: const AppIcon(AppIconPaths.personAdd, size: 20),
        label: const Text('Agregar cliente'),
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SearchField(controller: _searchController),
                    const SizedBox(height: AppSpacing.md),
                    const _Filters(),
                    const SizedBox(height: AppSpacing.md),
                    const PendingInvitationsSection(),
                  ],
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
                  child: hasFilters
                      ? const ClientsEmptyState(
                          icon: AppIconPaths.search,
                          title: 'Sin resultados',
                          message:
                              'Ningún cliente coincide con la búsqueda o los '
                              'filtros que aplicaste. Prueba cambiándolos.',
                        )
                      : ClientsEmptyState(
                          icon: AppIconPaths.group,
                          title: 'Todavía no tienes clientes',
                          message:
                              'Agrega tu primer cliente y compártele el enlace '
                              'para que se una a tu programa.',
                          action: FilledButton.icon(
                            onPressed: () =>
                                context.push(AppRoutes.trainerClientNew),
                            icon: const AppIcon(
                              AppIconPaths.personAdd,
                              size: 18,
                            ),
                            label: const Text('Agregar cliente'),
                          ),
                        ),
                ),
              AsyncValue(:final value?) => SliverPadding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.md,
                    0,
                    AppSpacing.md,
                    // Espacio para que el boton flotante no tape la ultima
                    // fila de la lista.
                    96,
                  ),
                  sliver: SliverList.separated(
                    itemCount: value.length,
                    separatorBuilder: (_, _) =>
                        const SizedBox(height: AppSpacing.sm),
                    itemBuilder: (context, index) {
                      final client = value[index];
                      return ClientListTile(
                        client: client,
                        onTap: () => context.push(
                          AppRoutes.trainerClientDetail(client.id),
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

class _SearchField extends ConsumerWidget {
  const _SearchField({required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = ref.watch(clientSearchQueryProvider);

    return TextField(
      controller: controller,
      onChanged: (value) =>
          ref.read(clientSearchQueryProvider.notifier).state = value,
      textInputAction: TextInputAction.search,
      decoration: InputDecoration(
        hintText: 'Buscar por nombre o correo',
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
                  controller.clear();
                  ref.read(clientSearchQueryProvider.notifier).state = '';
                },
              ),
      ),
    );
  }
}

class _Filters extends ConsumerWidget {
  const _Filters();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(clientStatusFilterProvider);
    final goal = ref.watch(clientGoalFilterProvider);

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _FilterChip(
            label: 'Activos',
            selected: status == ClientStatus.active,
            onSelected: (value) => ref
                .read(clientStatusFilterProvider.notifier)
                .state = value ? ClientStatus.active : null,
          ),
          const SizedBox(width: AppSpacing.sm),
          _FilterChip(
            label: 'Inactivos',
            selected: status == ClientStatus.inactive,
            onSelected: (value) => ref
                .read(clientStatusFilterProvider.notifier)
                .state = value ? ClientStatus.inactive : null,
          ),
          const SizedBox(width: AppSpacing.md),
          const _VerticalDivider(),
          const SizedBox(width: AppSpacing.md),
          for (final option in ClientGoal.values) ...[
            _FilterChip(
              label: option.label,
              selected: goal == option,
              onSelected: (value) => ref
                  .read(clientGoalFilterProvider.notifier)
                  .state = value ? option : null,
            ),
            const SizedBox(width: AppSpacing.sm),
          ],
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final String label;
  final bool selected;
  final ValueChanged<bool> onSelected;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: onSelected,
      showCheckmark: false,
    );
  }
}

class _VerticalDivider extends StatelessWidget {
  const _VerticalDivider();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 24,
      color: Theme.of(context).colorScheme.outline,
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
      title: 'No se pudieron cargar tus clientes',
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
