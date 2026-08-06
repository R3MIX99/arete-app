import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/supabase_provider.dart';
import 'auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(supabaseClientProvider));
});
