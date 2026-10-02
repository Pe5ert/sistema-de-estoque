import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function DetailDrawer({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const [host] = useState(() => document.createElement('div'));
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useLayoutEffect(() => { document.body.append(host); return () => host.remove(); }, [host]);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    const previousInert = root?.inert ?? false;
    const overflow = document.body.style.overflow;
    if (root) root.inert = true;
    document.body.style.overflow = 'hidden';
    const controls = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]') ?? []).filter(node => node.getClientRects().length > 0 && !node.closest('[inert]'));
    const focusFirst = () => (controls()[0] ?? panel.current)?.focus();
    focusFirst();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const nodes = controls();
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (!first) { event.preventDefault(); panel.current?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const containFocus = (event: FocusEvent) => { if (event.target instanceof Node && !panel.current?.contains(event.target)) focusFirst(); };
    window.addEventListener('keydown', key);
    document.addEventListener('focusin', containFocus);
    return () => {
      window.removeEventListener('keydown', key);
      document.removeEventListener('focusin', containFocus);
      if (root) root.inert = previousInert;
      document.body.style.overflow = overflow;
      previousFocus?.focus({ preventScroll: true });
      queueMicrotask(() => { if (!panel.current?.isConnected && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); });
    };
  }, []);
  return createPortal(<><div className="drawer-backdrop" aria-hidden="true" /><aside ref={panel} tabIndex={-1} className="detail-drawer" role="dialog" aria-modal="true" aria-label={title}><div className="detail-header"><span className="block-label">{title}</span><button className="icon-button" aria-label="Fechar detalhes" type="button" onClick={close}><X size={20} aria-hidden="true" /></button></div><div className="detail-content">{children}</div></aside></>, host);
}
export function openFromRow(event: { target: EventTarget | null }, open: () => void) {
  if (event.target instanceof Element && event.target.closest('button,a,input,select,textarea')) return;
  open();
}
