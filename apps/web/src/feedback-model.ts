export type FeedbackTone = 'success' | 'info' | 'warning' | 'error';
export const feedbackDurations = { success: 4000, info: 5000, warning: 7000, error: 0 };
export const visibleToastLimit = 3;
export function enqueueFeedback<T extends { id: number; key?: string }>(current: T[], message: T): T[] {
  return [...current.filter(item => !message.key || item.key !== message.key), message];
}
