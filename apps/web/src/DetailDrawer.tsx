import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
// Modeless on desktop so another table row can replace the selected record.
// Focus is trapped only for the mobile full-screen sheet.
export function DetailDrawer({ title, close, children, modal = false }: { title: string; close: () => void; children: ReactNode; modal?: boolean }) {
  const [host] = useState(() => document.createElement('div'));
  const [mobile, setMobile] = useState(() => matchMedia('(max-width: 700px)').matches);
  const trap = useRef(modal || mobile);
  trap.current = modal || mobile;
  const panel = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useLayoutEffect(() => { document.body.append(host); return () => host.remove(); }, [host]);
  useEffect(() => {
    const media = matchMedia('(max-width: 700px)');
    const change = () => setMobile(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    const previous = previousFocus.current ?? document.activeElement as HTMLElement | null;
    previousFocus.current = previous;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key === 'Tab' && trap.current) {
        const nodes = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]');
        if (!nodes?.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      // Restore after the mobile root loses inert, without stealing focus on
      // StrictMode's effect replay or a replacement drawer.
      queueMicrotask(() => { if (!panel.current?.isConnected && previous?.isConnected) previous.focus(); });
    };
  }, []);
  useEffect(() => {
    if (!modal && !mobile) return;
    const root = document.getElementById('root');
    const previous = root?.inert ?? false;
    const overflow = document.body.style.overflow;
    if (root) root.inert = true;
    document.body.style.overflow = 'hidden';
    return () => { if (root) root.inert = previous; document.body.style.overflow = overflow; };
  }, [mobile, modal]);
  return createPortal(<aside ref={panel} className="detail-drawer" role="dialog" aria-modal={modal || mobile || undefined} aria-label={title}><div className="detail-header"><span className="block-label">{title}</span><button className="row-action" aria-label="Fechar detalhes" type="button" onClick={close}><X size={20} /></button></div>{children}</aside>, host);
}
export function openFromRow(event: { target: EventTarget | null }, open: () => void) {
  if (event.target instanceof Element && event.target.closest('button,a,input,select,textarea')) return;
  open();
}
