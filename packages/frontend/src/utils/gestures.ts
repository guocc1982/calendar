export interface SwipeEvent {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
}

export function useTouchSwipe(element: HTMLElement, onSwipe: (e: SwipeEvent) => void) {
  let startX = 0;
  let startY = 0;
  const threshold = 50;

  function onTouchStart(e: TouchEvent) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }

  function onTouchEnd(e: TouchEvent) {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - startX;
    const dy = endY - startY;

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      onSwipe({ direction: dx > 0 ? 'right' : 'left', distance: Math.abs(dx) });
    } else {
      onSwipe({ direction: dy > 0 ? 'down' : 'up', distance: Math.abs(dy) });
    }
  }

  element.addEventListener('touchstart', onTouchStart, { passive: true });
  element.addEventListener('touchend', onTouchEnd, { passive: true });

  return () => {
    element.removeEventListener('touchstart', onTouchStart);
    element.removeEventListener('touchend', onTouchEnd);
  };
}
