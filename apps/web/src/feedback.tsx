import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { CircleCheck, Info, TriangleAlert, CircleAlert, X } from 'lucide-react';
import { DetailDrawer } from './DetailDrawer';
import { enqueueFeedback, feedbackDurations, visibleToastLimit, type FeedbackTone } from './feedback-model';
import { FeedbackContext, type FeedbackMessage as Message, type FeedbackAction as Action } from './feedback-context';
export { useFeedback } from './feedback-context';

type Toast = Message & { id: number };
const icons = { success: CircleCheck, info: Info, warning: TriangleAlert, error: CircleAlert };

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Toast[]>([]);
  const [announcement, setAnnouncement] = useState({ polite: '', urgent: '' });
  const announced = useRef(new Set<number>());
  const sequence = useRef(0);
  const notify = useCallback((message: Message) => {
    const id = ++sequence.current;
    setMessages(current => enqueueFeedback(current, { ...message, id }));
  }, []);
  const clear = useCallback(() => { setMessages([]); setAnnouncement({ polite: '', urgent: '' }); announced.current.clear(); }, []);
  const dismiss = useCallback((id: number) => setMessages(current => current.filter(item => item.id !== id)), []);
  useEffect(() => {
    const fresh = messages.slice(0, visibleToastLimit).filter(message => !announced.current.has(message.id));
    if (!fresh.length) return;
    fresh.forEach(message => announced.current.add(message.id));
    const text = (message: Toast) => [message.title, message.description, message.action?.label].filter(Boolean).join(' ');
    setAnnouncement({ polite: fresh.filter(message => message.tone !== 'error').map(text).join(' '), urgent: fresh.filter(message => message.tone === 'error').map(text).join(' ') });
  }, [messages]);
  return <FeedbackContext.Provider value={{ notify, clear }}>{children}
    <div className="sr-only" role="status" aria-atomic="true">{announcement.polite}</div><div className="sr-only" role="alert" aria-atomic="true">{announcement.urgent}</div>
    <section className="toast-stack" aria-label="Avisos da operação">{messages.slice(0, visibleToastLimit).map(message => <ToastItem key={message.id} message={message} dismiss={dismiss} />)}</section>
  </FeedbackContext.Provider>;
}

function ToastItem({ message, dismiss }: { message: Toast; dismiss: (id: number) => void }) {
  const returnFocus = useRef<HTMLElement | null>(null);
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [modalOpen, setModalOpen] = useState(() => {
    const root = document.getElementById('root');
    return Boolean(root?.hasAttribute('inert') || root?.querySelector('.workspace[inert]'));
  });
  const remaining = useRef(message.action ? 0 : feedbackDurations[message.tone]);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    const root = document.getElementById('root');
    const observer = new MutationObserver(() => setModalOpen(Boolean(root?.hasAttribute('inert') || root?.querySelector('.workspace[inert]'))));
    if (root) observer.observe(root, { attributes: true, subtree: true, attributeFilter: ['inert'] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!remaining.current || hovered || focused || hidden || modalOpen) return;
    const start = Date.now();
    const timer = window.setTimeout(() => dismiss(message.id), remaining.current);
    return () => { window.clearTimeout(timer); remaining.current = Math.max(1, remaining.current - (Date.now() - start)); };
  }, [dismiss, message.id, hovered, focused, hidden, modalOpen]);
  const Icon = icons[message.tone];
  const close = () => {
    const previous = returnFocus.current;
    if (previous?.isConnected) previous.focus({ preventScroll: true });
    else (document.getElementById('main-content') ?? document.querySelector<HTMLElement>('input'))?.focus({ preventScroll: true });
    dismiss(message.id);
  };
  return <div className={'feedback toast feedback-' + message.tone} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) returnFocus.current = event.relatedTarget instanceof HTMLElement ? event.relatedTarget : null; setFocused(true); }} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
    <Icon className="feedback-icon" size={19} aria-hidden="true" />
    <div className="feedback-copy"><div><strong>{message.title}</strong>{message.description && <p>{message.description}</p>}</div>
      {message.action && <button className="text-button" type="button" onClick={() => { message.action!.run(); dismiss(message.id); }}>{message.action.label}</button>}
    </div><button type="button" className="icon-button feedback-close" aria-label={'Fechar aviso: ' + message.title} onClick={close}><X size={17} aria-hidden="true" /></button>
  </div>;
}

export function Alert({ tone = 'info', title, children, action }: { tone?: FeedbackTone; title: string; children?: ReactNode; action?: Action }) {
  const Icon = icons[tone];
  return <div className={'feedback inline-alert feedback-' + tone} role={tone === 'error' ? 'alert' : 'status'}><Icon className="feedback-icon" size={19} aria-hidden="true" /><div className="feedback-copy"><strong>{title}</strong>{children && <div className="feedback-description">{children}</div>}{action && <button type="button" className="text-button" onClick={action.run}>{action.label}</button>}</div></div>;
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return <span className="field-error" id={id}><CircleAlert size={13} aria-hidden="true" />{children}</span>;
}

export function ConfirmDialog({ title, description, confirmLabel, cancelLabel = 'Continuar preenchendo', confirm, cancel, busy = false }: { title: string; description: string; confirmLabel: string; cancelLabel?: string; confirm: () => void; cancel: () => void; busy?: boolean }) {
  return <DetailDrawer title={title} close={cancel}><p>{description}</p><div className="inline-actions"><button type="button" className="secondary-button" onClick={cancel}>{cancelLabel}</button><button type="button" className="destructive-button" disabled={busy} onClick={confirm}>{confirmLabel}</button></div></DetailDrawer>;
}
