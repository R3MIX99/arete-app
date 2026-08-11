/// Día de la semana dentro de un programa. Usa ISO 8601 (1 = lunes,
/// 7 = domingo) para no depender de la configuración regional, igual que
/// la columna `day_of_week` de `program_routines` en Supabase.
enum Weekday {
  monday(1, 'Lunes'),
  tuesday(2, 'Martes'),
  wednesday(3, 'Miércoles'),
  thursday(4, 'Jueves'),
  friday(5, 'Viernes'),
  saturday(6, 'Sábado'),
  sunday(7, 'Domingo');

  const Weekday(this.raw, this.label);

  final int raw;
  final String label;

  static Weekday fromRaw(int raw) {
    for (final day in Weekday.values) {
      if (day.raw == raw) return day;
    }
    return Weekday.monday;
  }
}
