import { useRef } from "react";

/** Detecta un swipe horizontal (izquierda/derecha) sobre cualquier
 * elemento y llama al callback correspondiente — usado para pasar de
 * día o de mes en el calendario con el dedo, sin ninguna librería. Se
 * ignora si el gesto es más vertical que horizontal (para no robarle el
 * scroll normal de la página) o si no se movió lo suficiente. */
export function useSwipeNavigation(onSwipeLeft: () => void, onSwipeRight: () => void, threshold = 50) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  function onTouchStart(event: React.TouchEvent) {
    startX.current = event.touches[0].clientX;
    startY.current = event.touches[0].clientY;
  }

  function onTouchEnd(event: React.TouchEvent) {
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
