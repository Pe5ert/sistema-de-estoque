import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motionDelay } from './motion';
import { lockPageScroll } from './scroll-lock';

export function DetailDrawer({ title, close, children, busy = false, guardClose = false }: { title: string; close: () => void; children: ReactNode | ((requestClose: () => void) => ReactNode); busy?: boolean; guardClose?: boolean }) {
  const [host] = useState(() => document.createElement('div'));
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const guarded = useRef(guardClose);
  guarded.current = guardClose;
  const [closing, setClosing] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const requestClose = () => {
    if (busyRef.current || timer.current !== undefined) return;
    if (guarded.current) { closeRef.current(); return; }
    setClosing(true);
    timer.current = window.setTimeout(() => closeRef.current(), motionDelay(160));
  };
  const requestRef = useRef(requestClose);
  requestRef.current = requestClose;
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useLayoutEffect(() => { document.body.append(host); return () => host.remove(); }, [host]);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    const previousInert = root?.inert ?? false;
    const unlockScroll = lockPageScroll();
    if (root) root.inert = true;
    const controls = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]') ?? []).filter(node => node.getClientRects().length > 0 && !node.closest('[inert]'));
    const focusFirst = () => (controls()[0] ?? panel.current)?.focus();
    focusFirst();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Let a native select consume its first Escape before closing the containing form.
        if (event.defaultPrevented || (CSS.supports('selector(select:open)') && panel.current?.querySelector('select:open'))) return;
        event.preventDefault(); requestRef.current();
      }
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
      unlockScroll();
      previousFocus?.focus({ preventScroll: true });
      queueMicrotask(() => { if (!panel.current?.isConnected && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); });
    };
  }, []);
  return createPortal(<><div className={'drawer-backdrop' + (closing ? ' is-closing' : '')} aria-hidden="true" /><aside ref={panel} tabIndex={-1} className={'detail-drawer' + (closing ? ' is-closing' : '')} role="dialog" aria-modal="true" aria-label={title} aria-busy={busy}><div className="detail-header"><span className="block-label">{title}</span><button className="icon-button" aria-label="Fechar detalhes" type="button" disabled={busy || closing} onClick={requestClose}><X size={20} aria-hidden="true" /></button></div><div className="detail-content" inert={closing || undefined}>{typeof children === 'function' ? children(requestClose) : children}</div></aside></>, host);
}
export function openFromRow(event: { target: EventTarget | null }, open: () => void) {
  if (event.target instanceof Element && event.target.closest('button,a,input,select,textarea')) return;
  open();
}
