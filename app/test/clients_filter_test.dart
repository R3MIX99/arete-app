// El buscador y los filtros del listado de clientes se resuelven en la
// app, no en la consulta. Estas pruebas fijan esa lógica, que es la que
// decide qué ve el entrenador en pantalla.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:arete/features/shared/models/client_goal.dart';
import 'package:arete/features/shared/models/profile.dart';
import 'package:arete/features/shared/models/user_role.dart';
import 'package:arete/features/trainer/data/clients_providers.dart';

Profile buildClient({
  required String name,
  required String email,
  ClientStatus status = ClientStatus.active,
  ClientGoal? goal,
}) {
  return Profile(
    id: email,
    fullName: name,
    email: email,
    role: UserRole.client,
    createdAt: DateTime(2026),
    status: status,
    goal: goal,
  );
}

final _clients = [
  buildClient(
    name: 'Marcos Ibarra',
    email: 'marcos@ejemplo.com',
    goal: ClientGoal.gainMuscle,
  ),
  buildClient(
    name: 'Daniela Reyes',
    email: 'daniela@ejemplo.com',
    goal: ClientGoal.loseWeight,
  ),
  buildClient(
    name: 'Luis Fonseca',
    email: 'luis@ejemplo.com',
    status: ClientStatus.inactive,
    goal: ClientGoal.loseWeight,
  ),
];

ProviderContainer buildContainer() {
  final container = ProviderContainer(
    overrides: [
      clientsProvider.overrideWith((ref) async => _clients),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

Future<List<String>> namesOf(ProviderContainer container) async {
  await container.read(clientsProvider.future);
  return container
          .read(filteredClientsProvider)
          .valueOrNull
          ?.map((client) => client.fullName)
          .toList() ??
      const [];
}

void main() {
  group('filteredClientsProvider', () {
    test('por defecto muestra solo los clientes activos', () async {
      final container = buildContainer();
      expect(await namesOf(container), ['Marcos Ibarra', 'Daniela Reyes']);
    });

    test('el filtro de inactivos muestra solo los dados de baja', () async {
      final container = buildContainer();
      container.read(clientStatusFilterProvider.notifier).state =
          ClientStatus.inactive;
      expect(await namesOf(container), ['Luis Fonseca']);
    });

    test('sin filtro de estado se ven todos, activos e inactivos', () async {
      final container = buildContainer();
      container.read(clientStatusFilterProvider.notifier).state = null;
      expect(await namesOf(container), hasLength(3));
    });

    test('el buscador encuentra por nombre, sin distinguir mayúsculas', () async {
      final container = buildContainer();
      container.read(clientSearchQueryProvider.notifier).state = 'daniela';
      expect(await namesOf(container), ['Daniela Reyes']);
    });

    test('el buscador también encuentra por correo', () async {
      final container = buildContainer();
      container.read(clientSearchQueryProvider.notifier).state = 'marcos@';
      expect(await namesOf(container), ['Marcos Ibarra']);
    });

    test('el filtro por objetivo se combina con el de estado', () async {
      final container = buildContainer();
      // Luis también busca perder peso, pero está inactivo: no debe salir.
      container.read(clientGoalFilterProvider.notifier).state =
          ClientGoal.loseWeight;
      expect(await namesOf(container), ['Daniela Reyes']);
    });

    test('una búsqueda sin coincidencias devuelve lista vacía', () async {
      final container = buildContainer();
      container.read(clientSearchQueryProvider.notifier).state = 'zzzz';
      expect(await namesOf(container), isEmpty);
    });
  });

  group('hasActiveClientFiltersProvider', () {
    test('distingue "sin clientes" de "sin resultados"', () async {
      final container = buildContainer();
      // Arranca con el filtro de activos puesto, que ya cuenta como filtro.
      expect(container.read(hasActiveClientFiltersProvider), isTrue);

      container.read(clientStatusFilterProvider.notifier).state = null;
      expect(container.read(hasActiveClientFiltersProvider), isFalse);

      container.read(clientSearchQueryProvider.notifier).state = 'ana';
      expect(container.read(hasActiveClientFiltersProvider), isTrue);
    });
  });

  group('Profile.displayName', () {
    test('cae al correo cuando el cliente aún no tiene nombre', () {
      final invited = buildClient(name: '   ', email: 'nuevo@ejemplo.com');
      expect(invited.displayName, 'nuevo@ejemplo.com');
    });
  });
}
