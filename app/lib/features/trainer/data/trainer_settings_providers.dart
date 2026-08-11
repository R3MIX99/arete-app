import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/supabase_provider.dart';
import 'trainer_settings_repository.dart';

final trainerSettingsRepositoryProvider = Provider<TrainerSettingsRepository>(
  (ref) => TrainerSettingsRepository(ref.watch(supabaseClientProvider)),
);
