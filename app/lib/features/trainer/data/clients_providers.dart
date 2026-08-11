import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/supabase_provider.dart';
import '../../shared/models/client_goal.dart';
import '../../shared/models/profile.dart';
import '../domain/client_invitation.dart';
import 'clients_repository.dart';

final clientsRepositoryProvider = Provider<ClientsRepository>((ref) {
  return ClientsRepository(ref.watch(supabaseClientProvider));
});

/// Lista completa de clientes del entrenador. El filtrado se hace en la
/// app y no en la consulta porque un entrenador maneja decenas de
/// clientes, no miles: traer la lista una vez y filtrarla en memoria hace
/// que buscar y cambiar de filtro sea instantáneo, sin ir al servidor en
/// cada tecla.
final clientsProvider = FutureProvider<List<Profile>>((ref) {
  return ref.watch(clientsRepositoryProvider).fetchClients();
});

final pendingInvitationsProvider = FutureProvider<List<ClientInvitation>>((ref) {
  return ref.watch(clientsRepositoryProvider).fetchPendingInvitations();
});

final clientDetailProvider = FutureProvider.family<Profile, String>((
  ref,
  clientId,
) {
  // Depende de clientsProvider para que al editar o desactivar y refrescar
  // la lista, el detalle abierto también se actualice.
  ref.watch(clientsProvider);
  return ref.watch(clientsRepositoryProvider).fetchClient(clientId);
});

/// Texto del buscador de clientes.
final clientSearchQueryProvider = StateProvider<String>((ref) => '');

/// Filtro por estado. `null` significa "todos".
final clientStatusFilterProvider = StateProvider<ClientStatus?>(
  (ref) => ClientStatus.active,
);

/// Filtro por objetivo. `null` significa "todos".
final clientGoalFilterProvider = StateProvider<ClientGoal?>((ref) => null);

/// Clientes ya filtrados por buscador, estado y objetivo.
final filteredClientsProvider = Provider<AsyncValue<List<Profile>>>((ref) {
  final clients = ref.watch(clientsProvider);
  final query = ref.watch(clientSearchQueryProvider).trim().toLowerCase();
  final status = ref.watch(clientStatusFilterProvider);
  final goal = ref.watch(clientGoalFilterProvider);

  return clients.whenData((list) {
    return list.where((client) {
      if (status != null && client.status != status) return false;
      if (goal != null && client.goal != goal) return false;
      if (query.isEmpty) return true;
      return client.fullName.toLowerCase().contains(query) ||
          client.email.toLowerCase().contains(query);
    }).toList();
  });
});

/// True cuando hay algún filtro o búsqueda activos. Sirve para distinguir
/// "todavía no tienes clientes" de "ningún cliente coincide con el filtro",
/// que son dos vacíos distintos y necesitan mensajes distintos.
final hasActiveClientFiltersProvider = Provider<bool>((ref) {
  return ref.watch(clientSearchQueryProvider).trim().isNotEmpty ||
      ref.watch(clientStatusFilterProvider) != null ||
      ref.watch(clientGoalFilterProvider) != null;
});
