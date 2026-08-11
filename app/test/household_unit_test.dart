// La medida casera de un ingrediente se calcula en la app, no en la base
// de datos (dish_ingredients solo guarda gramos). Estas pruebas fijan el
// redondeo a cuartos y el texto que arma el constructor de platillos.

import 'package:flutter_test/flutter_test.dart';

import 'package:arete/core/utils/household_unit.dart';

void main() {
  group('roundToQuarter', () {
    test('redondea al cuarto más cercano', () {
      expect(roundToQuarter(2.4), 2.5);
      expect(roundToQuarter(2.1), 2.0);
      expect(roundToQuarter(0.5), 0.5);
      expect(roundToQuarter(1.0), 1.0);
    });
  });

  group('formatQuantityFraction', () {
    test('un número entero no lleva fracción', () {
      expect(formatQuantityFraction(3.0), '3');
    });

    test('cuartos, medios y tres cuartos se escriben como fracción', () {
      expect(formatQuantityFraction(0.25), '1/4');
      expect(formatQuantityFraction(0.5), '1/2');
      expect(formatQuantityFraction(0.75), '3/4');
    });

    test('un entero más una fracción se unen con "y"', () {
      expect(formatQuantityFraction(2.5), '2 y 1/2');
      expect(formatQuantityFraction(1.25), '1 y 1/4');
    });
  });

  group('formatHouseholdMeasure', () {
    test('devuelve null si el alimento no tiene medida casera', () {
      expect(
        formatHouseholdMeasure(grams: 100, unitName: null, unitGrams: null),
        isNull,
      );
    });

    test('120 g de huevo (50 g cada uno) da "2 y 1/2 huevos"', () {
      expect(
        formatHouseholdMeasure(
          grams: 120,
          unitName: 'huevo mediano',
          unitGrams: 50,
        ),
        '2 y 1/2 huevos medianos',
      );
    });

    test('45 g de avena (90 g la taza) da "1/2 taza", sin pluralizar', () {
      expect(
        formatHouseholdMeasure(grams: 45, unitName: 'taza', unitGrams: 90),
        '1/2 taza',
      );
    });

    test('una sola unidad no se pluraliza', () {
      expect(
        formatHouseholdMeasure(
          grams: 50,
          unitName: 'huevo mediano',
          unitGrams: 50,
        ),
        '1 huevo mediano',
      );
    });
  });
}
