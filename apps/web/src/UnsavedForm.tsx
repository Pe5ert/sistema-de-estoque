import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';
import { ConfirmDialog } from './feedback';
export function useUnsavedForm(dirty: boolean, busy: boolean) {
  const saved = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !saved.current && (dirty || busy) && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (!dirty || saved.current) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener('beforeunload', prevent); return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  return { saved, dialog: blocker.state === 'blocked' ? <ConfirmDialog title="Descartar alterações?" description="As alterações não salvas serão perdidas." confirmLabel="Descartar e sair" cancelLabel="Continuar preenchendo" cancel={() => blocker.reset()} confirm={() => blocker.proceed()} busy={busy} /> : null };
}
