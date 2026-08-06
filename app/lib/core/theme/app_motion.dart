import 'package:flutter/material.dart';

/// Tokens de movimiento del sistema de diseño, traducidos a Flutter desde
/// los principios de las skills `animate` y `apple-design`
/// (github.com/emilkowalski/skills): duraciones cortas (menos de 300 ms
/// para UI), `ease-out` para entradas/salidas, `ease-in-out` para
/// movimiento en pantalla, nunca `ease-in`, y respeto obligatorio a
/// "reducir movimiento".
///
/// Antes de animar algo nuevo, aplica primero el filtro de esas skills:
/// ¿esto se ve/toca decenas de veces al día? Entonces casi nada de
/// movimiento. ¿Es ocasional (modal, hoja, notificación)? Animación
/// estándar. ¿Es raro o de primera vez (éxito, bienvenida)? Ahí es donde
/// se permite algo más expresivo.
class AppMotion {
  const AppMotion._();

  // Duraciones. Nunca superar 300 ms en un elemento de UI recurrente.
  static const Duration pressFeedback = Duration(milliseconds: 120);
  static const Duration popover = Duration(milliseconds: 160);
  static const Duration dropdown = Duration(milliseconds: 200);
  static const Duration sheet = Duration(milliseconds: 260);
  static const Duration pageTransition = Duration(milliseconds: 220);

  // Curvas. `Cubic` reproduce exactamente las curvas recomendadas por la
  // skill `animate` en vez de aproximarlas con un `Curves` genérico.
  //
  // Entrando o saliendo: ease-out fuerte. Nunca ease-in en UI (arranca
  // lento justo cuando el usuario está mirando).
  static const Curve enter = Cubic(0.23, 1, 0.32, 1);

  // Moviéndose/reacomodándose ya en pantalla (reordenar, expandir).
  static const Curve reposition = Cubic(0.77, 0, 0.175, 1);

  // Hover, cambios de color: una curva suave estándar basta.
  static const Curve hover = Curves.ease;

  /// Spring crítico (sin rebote) para la retroalimentación por defecto de
  /// tarjetas y botones al presionar — equivalente a `damping: 1.0` en la
  /// skill `apple-design`. El rebote (`damping ~0.8`) se reserva para
  /// interacciones con momentum real (arrastrar y soltar), que esta app
  /// todavía no tiene.
  static const double pressScale = 0.97;

  /// Devuelve la duración real a usar, respetando la preferencia de
  /// "reducir movimiento" del sistema operativo. Nunca la apaga del todo
  /// (eso rompería animaciones que ayudan a entender un cambio de
  /// estado); la acorta a algo casi instantáneo.
  static Duration resolve(BuildContext context, Duration base) {
    final reduceMotion = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    if (!reduceMotion) return base;
    return const Duration(milliseconds: 1);
  }
}
