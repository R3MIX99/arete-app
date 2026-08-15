import { useRef } from "react";

/**
 * Detecta un swipe horizontal (izquierda/derecha) sobre cualquier
 * elemento y llama al callback correspondiente — usado para pasar de
 * día o de mes en el calendario con el dedo, sin ninguna librería. Se
 * ignora si el gesto es más vertical que horizontal (para no robarle el
 * scroll normal de la página) o si no se movió lo suficiente.
 *
 * Siempre corta la propagación del evento: el selector de mes vive
 * dentro de un Drawer que, aunque se pinta en otro lugar del DOM (portal),
 * sigue colgando del mismo árbol de React que la vista del día — un
 * swipe en React "burbujea" por ese árbol, no por el DOM real, así que
 * sin stopPropagation un swipe sobre la rejilla del mes también le
 * llegaba al contenedor de arriba y cambiaba de día en vez de mes.
 */
export function useSwipeNavigation(onSwipeLeft: () => void, onSwipeRight: () => void, threshold = 50) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  function onTouchStart(event: React.TouchEvent) {
    event.stopPropagation();
    startX.current = event.touches[0].clientX;
    startY.current = event.touches[0].clientY;
  }

  function onTouchEnd(event: React.TouchEvent) {
    event.stopPropagation();
    const fromX = startX.current;
    const fromY = startY.current;
    startX.current = null;
    startY.current = null;
    if (fromX === null || fromY === null) return;

    const dx = event.changedTouches[0].clientX - fromX;
    const dy = event.changedTouches[0].clientY - fromY;
    if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    if (dx < 0) onSwipeLeft();
    else onSwipeRight();
  }

  return { onTouchStart, onTouchEnd };
}
