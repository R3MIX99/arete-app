/// Convierte gramos a "medida casera" (p. ej. 110 g de huevo → "2 huevos
/// medianos"), redondeando a la fracción más cercana de un cuarto para
/// que el cliente no dependa de una báscula. La misma regla de redondeo
/// que usa `get_food_substitutes` en Supabase, reimplementada acá porque
/// la vista previa del constructor de platillos se calcula en el momento,
/// sin ida y vuelta al servidor.
double roundToQuarter(double value) => (value * 4).round() / 4;

/// Texto legible de una cantidad en medida casera, p. ej. `2.75` →
/// `"2 y 3/4"`, `1.0` → `"1"`, `0.5` → `"1/2"`.
String formatQuantityFraction(double quantity) {
  final rounded = roundToQuarter(quantity);
  final whole = rounded.truncate();
  final quarters = ((rounded - whole) * 4).round();

  if (quarters == 0) return '$whole';

  const fractionLabels = {1: '1/4', 2: '1/2', 3: '3/4'};
  final fraction = fractionLabels[quarters]!;
  return whole == 0 ? fraction : '$whole y $fraction';
}

/// Frase completa de medida casera para una cantidad en gramos de un
/// alimento con unidad casera conocida, p. ej. "4 huevos medianos" o
/// "2 y 1/2 rebanadas de pan". Devuelve `null` si el alimento no tiene
/// medida casera definida.
String? formatHouseholdMeasure({
  required double grams,
  required String? unitName,
  required double? unitGrams,
}) {
  if (unitName == null || unitGrams == null || unitGrams <= 0) return null;
  final quantity = grams / unitGrams;
  final fraction = formatQuantityFraction(quantity);
  final roundedQty = roundToQuarter(quantity);
  final plural = roundedQty > 1 ? _pluralize(unitName) : unitName;
  return '$fraction $plural';
}

/// Pluraliza a ojo cada palabra del nombre de la medida, no solo la
/// última: en español el sustantivo y su adjetivo concuerdan en número
/// ("huevo mediano" → "huevos medianos", no "huevo medianos"). Palabras
/// que ya terminan en "s" o que no son puramente alfabéticas (números,
/// paréntesis) se dejan tal cual — no pretende ser un pluralizador
/// general del español, solo cubrir los nombres de medida del catálogo.
String _pluralize(String unitName) {
  final onlyLetters = RegExp(r'^[a-zA-ZÀ-ÿ]+$');
  return unitName
      .split(' ')
      .map((word) {
        if (!onlyLetters.hasMatch(word) || word.toLowerCase().endsWith('s')) {
          return word;
        }
        return '${word}s';
      })
      .join(' ');
}
