import { describe, expect, it } from 'vitest';
import {
  createToastRecord,
  createToastState,
  DEFAULT_MAX_VISIBLE,
  dismissToast,
  enqueueToast,
  type ToastRecord,
} from '@/lib/toast-controller';

const buildToast = (id: string): ToastRecord =>
  ({
    ...createToastRecord({
      title: `Toast ${id}`,
      body: 'Body',
    }),
    id,
  }) as ToastRecord;

describe('toast-controller', () => {
  it('keeps max visible and pushes overflow to pending in order', () => {
    let state = createToastState();
    const all = Array.from({ length: 6 }, (_, index) => buildToast(`t${index + 1}`));

    for (const toast of all) {
      state = enqueueToast(state, toast, DEFAULT_MAX_VISIBLE);
    }

    expect(state.visible).toHaveLength(4);
    expect(state.pending).toHaveLength(2);
    expect(state.visible.map((item) => item.id)).toEqual(['t1', 't2', 't3', 't4']);
    expect(state.pending.map((item) => item.id)).toEqual(['t5', 't6']);
  });

  it('promotes pending toast when a visible toast is dismissed', () => {
    let state = createToastState();
    for (const id of ['a', 'b', 'c', 'd', 'e']) {
      state = enqueueToast(state, buildToast(id), DEFAULT_MAX_VISIBLE);
    }

    state = dismissToast(state, 'b', DEFAULT_MAX_VISIBLE);

    expect(state.visible.map((item) => item.id)).toEqual(['a', 'c', 'd', 'e']);
    expect(state.pending).toHaveLength(0);
  });

  it('removes pending toast directly when dismissed before becoming visible', () => {
    let state = createToastState();
    for (const id of ['a', 'b', 'c', 'd', 'e']) {
      state = enqueueToast(state, buildToast(id), DEFAULT_MAX_VISIBLE);
    }

    state = dismissToast(state, 'e', DEFAULT_MAX_VISIBLE);

    expect(state.visible.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(state.pending).toHaveLength(0);
  });

  it('resolves default duration by type when creating records', () => {
    const success = createToastRecord({
      title: 'Saved',
      body: 'Preferences updated.',
      type: 'success',
    });
    const error = createToastRecord({
      title: 'Failed',
      body: 'Could not save.',
      type: 'error',
    });

    expect(success.durationMs).toBe(4000);
    expect(error.durationMs).toBe(6000);
  });
});

