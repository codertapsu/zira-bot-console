import { signal, WritableSignal } from '@angular/core';
import { TgResponse } from '../telegram-api.service';

/** A single Bot API call slot: its latest response + loading flag. */
export interface CallSlot {
  res: WritableSignal<TgResponse | null>;
  loading: WritableSignal<boolean>;
}

export function mkCall(): CallSlot {
  return { res: signal<TgResponse | null>(null), loading: signal(false) };
}

export async function run<T = unknown>(
  slot: CallSlot,
  fn: () => Promise<TgResponse<T>>,
): Promise<TgResponse<T>> {
  slot.loading.set(true);
  try {
    const r = await fn();
    slot.res.set(r);
    return r;
  } finally {
    slot.loading.set(false);
  }
}
