import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../../shared/widgets/app_card.dart';
import '../../data/clients_providers.dart';
import '../../data/progress_providers.dart';
import '../../domain/progress_entry.dart';
import '../widgets/clients_empty_state.dart';
import '../widgets/progress_entry_form_sheet.dart';

enum _Measurement {
  chest('Pecho'),
  waist('Cintura'),
  hip('Cadera'),
  arm('Brazo'),
  thigh('Muslo');

  const _Measurement(this.label);
  final String label;

  double? valueOf(ProgressEntry entry) => switch (this) {
        _Measurement.chest => entry.chestCm,
        _Measurement.waist => entry.waistCm,
        _Measurement.hip => entry.hipCm,
        _Measurement.arm => entry.armCm,
        _Measurement.thigh => entry.thighCm,
      };
}

final _selectedClientProvider = StateProvider<String?>((ref) => null);
final _selectedMeasurementProvider = StateProvider<_Measurement>(
  (ref) => _Measurement.waist,
);

/// Seguimiento de progreso: por cliente, peso y medidas en gráficas,
/// fotos de progreso y el porcentaje de sesiones que registró como
/// hechas en las últimas 4 semanas.
class TrainerProgressScreen extends ConsumerWidget {
  const TrainerProgressScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final clientsAsync = ref.watch(clientsProvider);
    final selectedClientId = ref.watch(_selectedClientProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: clientsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, _) => const ClientsEmptyState(
            icon: AppIconPaths.error,
            title: 'No se pudieron cargar tus clientes',
            message: 'Intenta de nuevo en unos minutos.',
          ),
          data: (clients) {
            if (clients.isEmpty) {
              return const ClientsEmptyState(
                icon: AppIconPaths.group,
                title: 'Todavía no tienes clientes',
                message:
                    'Cuando tengas clientes activos, acá vas a poder '
                    'seguir su progreso.',
              );
            }

            final activeClients = clients.where((c) => c.isActive).toList();
            final clientId = selectedClientId ??
                (activeClients.isNotEmpty ? activeClients.first.id : clients.first.id);

            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        for (final client in activeClients) ...[
                          ChoiceChip(
                            label: Text(client.displayName),
                            selected: clientId == client.id,
                            showCheckmark: false,
                            onSelected: (_) => ref
                                .read(_selectedClientProvider.notifier)
                                .state = client.id,
                          ),
                          const SizedBox(width: AppSpacing.sm),
                        ],
                      ],
                    ),
                  ),
                ),
                Expanded(
                  child: _ClientProgressBody(clientId: clientId),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _ClientProgressBody extends ConsumerWidget {
  const _ClientProgressBody({required this.clientId});

  final String clientId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final entriesAsync = ref.watch(progressEntriesProvider(clientId));
    final complianceAsync = ref.watch(complianceRateProvider(clientId));
    final measurement = ref.watch(_selectedMeasurementProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(progressEntriesProvider(clientId));
        ref.invalidate(complianceRateProvider(clientId));
        await ref.read(progressEntriesProvider(clientId).future);
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          0,
          AppSpacing.md,
          96,
        ),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 800),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _ComplianceCard(complianceAsync: complianceAsync),
                const SizedBox(height: AppSpacing.md),
                switch (entriesAsync) {
                  AsyncLoading() =>
                    const Center(child: CircularProgressIndicator()),
                  AsyncError() => Text(
                      'No se pudieron cargar los registros.',
                      style: theme.textTheme.bodyMedium,
                    ),
                  AsyncValue(:final value?) when value.isEmpty =>
                    const ClientsEmptyState(
                      icon: AppIconPaths.monitoring,
                      title: 'Todavía no hay registros',
                      message:
                          'Agrega el primer registro de peso, medidas o '
                          'foto de este cliente.',
                    ),
                  AsyncValue(:final value?) => Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Peso corporal', style: theme.textTheme.titleMedium),
                        const SizedBox(height: AppSpacing.sm),
                        _WeightChart(entries: value),
                        const SizedBox(height: AppSpacing.lg),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                'Medidas',
                                style: theme.textTheme.titleMedium,
                              ),
                            ),
                            DropdownButton<_Measurement>(
                              value: measurement,
                              underline: const SizedBox.shrink(),
                              items: [
                                for (final m in _Measurement.values)
                                  DropdownMenuItem(value: m, child: Text(m.label)),
                              ],
                              onChanged: (value) {
                                if (value != null) {
                                  ref
                                      .read(_selectedMeasurementProvider.notifier)
                                      .state = value;
                                }
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        _MeasurementChart(entries: value, measurement: measurement),
                        const SizedBox(height: AppSpacing.lg),
                        _PhotosSection(entries: value),
                      ],
                    ),
                  _ => const SizedBox.shrink(),
                },
                const SizedBox(height: AppSpacing.lg),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: FilledButton.icon(
                    onPressed: () =>
                        showProgressEntryFormSheet(context, clientId: clientId),
                    icon: const AppIcon(AppIconPaths.add, size: 18),
                    label: const Text('Agregar registro'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ComplianceCard extends StatelessWidget {
  const _ComplianceCard({required this.complianceAsync});

  final AsyncValue<double?> complianceAsync;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppCard(
      child: Row(
        children: [
          AppIcon(
            AppIconPaths.checkCircle,
            size: 28,
            color: theme.colorScheme.primary,
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Cumplimiento de rutinas (últimas 4 semanas)',
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(height: 2),
                switch (complianceAsync) {
                  AsyncLoading() => const SizedBox(
                      height: 16,
                      width: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  AsyncError() => Text(
                      'No se pudo calcular.',
                      style: theme.textTheme.bodyLarge,
                    ),
                  AsyncValue(:final value) => value == null
                      ? Text(
                          'Sin sesiones programadas en este período.',
                          style: theme.textTheme.bodyLarge,
                        )
                      : Text(
                          '${(value * 100).toStringAsFixed(0)}% de las sesiones '
                          'programadas',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                },
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _WeightChart extends StatelessWidget {
  const _WeightChart({required this.entries});

  final List<ProgressEntry> entries;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final points = <FlSpot>[
      for (var i = 0; i < entries.length; i++)
        if (entries[i].weightKg != null) FlSpot(i.toDouble(), entries[i].weightKg!),
    ];

    if (points.isEmpty) {
      return AppCard(
        child: Text(
          'Todavía no hay registros de peso.',
          style: theme.textTheme.bodyMedium,
        ),
      );
    }

    return AppCard(
      child: SizedBox(
        height: 180,
        child: LineChart(
          LineChartData(
            gridData: const FlGridData(show: true, drawVerticalLine: false),
            titlesData: FlTitlesData(
              topTitles: const AxisTitles(),
              rightTitles: const AxisTitles(),
              leftTitles: AxisTitles(
                sideTitles: SideTitles(showTitles: true, reservedSize: 36),
              ),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 28,
                  getTitlesWidget: (value, meta) {
                    final index = value.round();
                    if (index < 0 || index >= entries.length) {
                      return const SizedBox.shrink();
                    }
                    return Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        DateFormat('d/M').format(entries[index].entryDate),
                        style: theme.textTheme.labelLarge?.copyWith(fontSize: 10),
                      ),
                    );
                  },
                ),
              ),
            ),
            borderData: FlBorderData(show: false),
            lineBarsData: [
              LineChartBarData(
                spots: points,
                isCurved: true,
                color: theme.colorScheme.primary,
                barWidth: 3,
                dotData: const FlDotData(show: true),
                belowBarData: BarAreaData(
                  show: true,
                  color: theme.colorScheme.primary.withValues(alpha: 0.10),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MeasurementChart extends StatelessWidget {
  const _MeasurementChart({required this.entries, required this.measurement});

  final List<ProgressEntry> entries;
  final _Measurement measurement;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final points = <FlSpot>[
      for (var i = 0; i < entries.length; i++)
        if (measurement.valueOf(entries[i]) != null)
          FlSpot(i.toDouble(), measurement.valueOf(entries[i])!),
    ];

    if (points.isEmpty) {
      return AppCard(
        child: Text(
          'Todavía no hay registros de ${measurement.label.toLowerCase()}.',
          style: theme.textTheme.bodyMedium,
        ),
      );
    }

    return AppCard(
      child: SizedBox(
        height: 160,
        child: LineChart(
          LineChartData(
            gridData: const FlGridData(show: true, drawVerticalLine: false),
            titlesData: FlTitlesData(
              topTitles: const AxisTitles(),
              rightTitles: const AxisTitles(),
              leftTitles: AxisTitles(
                sideTitles: SideTitles(showTitles: true, reservedSize: 36),
              ),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 28,
                  getTitlesWidget: (value, meta) {
                    final index = value.round();
                    if (index < 0 || index >= entries.length) {
                      return const SizedBox.shrink();
                    }
                    return Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        DateFormat('d/M').format(entries[index].entryDate),
                        style: theme.textTheme.labelLarge?.copyWith(fontSize: 10),
                      ),
                    );
                  },
                ),
              ),
            ),
            borderData: FlBorderData(show: false),
            lineBarsData: [
              LineChartBarData(
                spots: points,
                isCurved: true,
                color: theme.colorScheme.secondary,
                barWidth: 3,
                dotData: const FlDotData(show: true),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PhotosSection extends StatelessWidget {
  const _PhotosSection({required this.entries});

  final List<ProgressEntry> entries;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final withPhotos = entries.where((e) => e.hasPhoto).toList().reversed.toList();

    if (withPhotos.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Fotos de progreso', style: theme.textTheme.titleMedium),
        const SizedBox(height: AppSpacing.sm),
        SizedBox(
          height: 110,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: withPhotos.length,
            separatorBuilder: (_, _) => const SizedBox(width: AppSpacing.sm),
            itemBuilder: (context, index) => _PhotoThumbnail(entry: withPhotos[index]),
          ),
        ),
      ],
    );
  }
}

class _PhotoThumbnail extends ConsumerWidget {
  const _PhotoThumbnail({required this.entry});

  final ProgressEntry entry;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repository = ref.watch(progressRepositoryProvider);
    return FutureBuilder<String>(
      future: repository.signedPhotoUrl(entry.photoPath!),
      builder: (context, snapshot) {
        final theme = Theme.of(context);
        return ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: Container(
            width: 90,
            height: 110,
            color: theme.colorScheme.surfaceContainerHighest,
            child: Column(
              children: [
                Expanded(
                  child: snapshot.hasData
                      ? Image.network(snapshot.data!, fit: BoxFit.cover, width: 90)
                      : const Center(
                          child: SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Text(
                    DateFormat('d/M').format(entry.entryDate),
                    style: theme.textTheme.labelLarge?.copyWith(fontSize: 10),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
