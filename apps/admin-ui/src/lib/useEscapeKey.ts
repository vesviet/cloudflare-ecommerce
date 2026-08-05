import { useEffect } from 'react';

/** Closes an overlay when Escape is pressed. Attaches only while `active`. */
export function useEscapeKey(onClose: () => void, active: boolean = true) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, active]);
}
