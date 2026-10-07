import test from 'node:test';
import assert from 'node:assert/strict';
import { enqueueFeedback, feedbackDurations, visibleToastLimit } from '../src/feedback-model.ts';

test('feedback queue preserves errors and waits for a visible slot instead of dropping results', () => {
  let queue = [];
  for (let id = 1; id <= 8; id++) queue = enqueueFeedback(queue, { id, tone: 'error' });
  assert.equal(queue.length, 8);
  assert.equal(queue.slice(0, visibleToastLimit).length, 3);
  queue = queue.filter(item => item.id !== 1);
  assert.deepEqual(queue.slice(0, visibleToastLimit).map(item => item.id), [2, 3, 4]);
});
test('keyed updates replace only their own result while unrelated messages survive', () => {
  const queue = enqueueFeedback([{ id: 1, key: 'movement' }, { id: 2, key: 'backup' }], { id: 3, key: 'movement' });
  assert.deepEqual(queue.map(item => item.id), [2, 3]);
  assert.equal(feedbackDurations.error, 0);
});
