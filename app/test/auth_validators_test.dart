// Pruebas de la validación de formularios de autenticación y de las reglas
// de rol que protegen el registro (el superadministrador nunca debe poder
// registrarse solo desde la app).

import 'package:flutter_test/flutter_test.dart';

import 'package:arete/features/auth/presentation/widgets/auth_validators.dart';
import 'package:arete/features/shared/models/user_role.dart';

void main() {
  group('AuthValidators.email', () {
    test('rechaza vacío', () {
      expect(AuthValidators.email(''), isNotNull);
    });

    test('rechaza sin arroba', () {
      expect(AuthValidators.email('correo.invalido'), isNotNull);
    });

    test('acepta un correo válido', () {
      expect(AuthValidators.email('persona@ejemplo.com'), isNull);
    });
  });

  group('AuthValidators.password', () {
    test('rechaza vacío', () {
      expect(AuthValidators.password(''), isNotNull);
    });

    test('rechaza menos de 8 caracteres', () {
      expect(AuthValidators.password('abc123'), isNotNull);
    });

    test('acepta 8 caracteres o más', () {
      expect(AuthValidators.password('claveSegura123'), isNull);
    });
  });

  group('AuthValidators.fullName', () {
    test('rechaza vacío', () {
      expect(AuthValidators.fullName(''), isNotNull);
    });

    test('rechaza solo espacios', () {
      expect(AuthValidators.fullName('   '), isNotNull);
    });

    test('acepta un nombre válido', () {
      expect(AuthValidators.fullName('Ana Torres'), isNull);
    });
  });

  group('UserRole.registrable', () {
    test('solo incluye entrenador y cliente, nunca superadmin', () {
      expect(UserRole.registrable, containsAll([UserRole.trainer, UserRole.client]));
      expect(UserRole.registrable, isNot(contains(UserRole.superadmin)));
    });
  });
}
