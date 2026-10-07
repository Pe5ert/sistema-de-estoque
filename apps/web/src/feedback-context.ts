import { createContext, useContext } from 'react';
import type { FeedbackTone } from './feedback-model';

export type FeedbackAction = { label: string; run: () => void };
export type FeedbackMessage = { tone: FeedbackTone; title: string; description?: string; action?: FeedbackAction; key?: string };
export const FeedbackContext = createContext<{ notify: (message: FeedbackMessage) => void; clear: () => void } | null>(null);
export function useFeedback() {
  const feedback = useContext(FeedbackContext);
  if (!feedback) throw new Error('FeedbackProvider ausente.');
  return feedback;
}
