import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../data/clients_providers.dart';

/// Selección hecha en [showAssignToClientsSheet]: a quiénes asignar y
/// desde qué fecha.
class AssignmentSelection {
  const AssignmentSelection({required this.clientIds, required this.startDate});

  final List<String> clientIds;
  final DateTime startDate;
}

/// Selector de uno o varios clientes activos, más la fecha de inicio.
/// Se usa tanto para asignar un programa completo como una rutina suelta.
Future<AssignmentSelection?> showAssignToClientsSheet(
  BuildContext context, {
  required String title,
}) {
  return showModalBottomSheet<AssignmentSelection>(
    context: context,
    isScrollControlled: true,
    builder: (context) => _AssignSheet(title: title),
  );
}

class _AssignSheet extends ConsumerStatefulWidget {
  const _AssignSheet({required this.title});

  final String title;

  @override
  ConsumerState<_AssignSheet> createState() => _AssignSheetState();
}

class _AssignSheetState extends ConsumerState<_AssignSheet> {
  final Set<String> _selected = {};
  DateTime _startDate = DateTime.now();
  String _query = '';

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
    );
    if (picked != null) setState(() => _startDate = picked);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final clientsAsync = ref.watch(clientsProvider);

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
              Text(widget.title, style: theme.textTheme.titleLarge),
              const SizedBox(height: AppSpacing.md),
              InkWell(
                onTap: _pickDate,
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.md,
                  ),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const AppIcon(AppIconPaths.calendarMonth, size: 18),
                      const SizedBox(width: AppSpacing.sm),
                      Text(
                        'Empieza el ${DateFormat('d MMM y', 'es_419').format(_startDate)}',
                        style: theme.textTheme.bodyLarge,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              TextField(
                onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
                decoration: const InputDecoration(
                  hintText: 'Buscar cliente por nombre o correo',
                  prefixIcon: Padding(
                    padding: EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                    child: AppIcon(AppIconPaths.search, size: 20),
                  ),
                  prefixIconConstraints: BoxConstraints(minWidth: 44),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Expanded(
                child: clientsAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (error, _) => Center(
                    child: Text(
                      'No se pudo cargar tu lista de clientes.',
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                  data: (clients) {
                    final active = clients
                        .where((c) => c.isActive)
                        .where(
                          (c) =>
                              _query.isEmpty ||
                              c.displayName.toLowerCase().contains(_query) ||
                              c.email.toLowerCase().contains(_query),
                        )
                        .toList();

                    if (active.isEmpty) {
                      return Center(
                        child: Text(
                          'No hay clientes activos que coincidan.',
                          style: theme.textTheme.bodyMedium,
                        ),
                      );
                    }

                    return ListView.builder(
                      controller: scrollController,
                      itemCount: active.length,
                      itemBuilder: (context, index) {
                        final client = active[index];
                        final selected = _selected.contains(client.id);
                        return CheckboxListTile(
                          value: selected,
                          onChanged: (value) => setState(() {
                            if (value == true) {
                              _selected.add(client.id);
                            } else {
                              _selected.remove(client.id);
                            }
                          }),
                          title: Text(client.displayName),
                          subtitle: Text(
                            client.goal?.label ?? client.email,
                          ),
                          controlAffinity: ListTileControlAffinity.leading,
                        );
                      },
                    );
                  },
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: FilledButton(
                  onPressed: _selected.isEmpty
                      ? null
                      : () => Navigator.of(context).pop(
                            AssignmentSelection(
                              clientIds: _selected.toList(),
                              startDate: _startDate,
                            ),
                          ),
                  child: Text(
                    _selected.isEmpty
                        ? 'Selecciona al menos un cliente'
                        : 'Asignar a ${_selected.length} '
                            '${_selected.length == 1 ? 'cliente' : 'clientes'}',
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
