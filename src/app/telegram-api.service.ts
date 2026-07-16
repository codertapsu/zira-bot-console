import { Injectable, computed, signal } from '@angular/core';

/** Raw Telegram Bot API response envelope. */
export interface TgResponse<T = unknown> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}

const API_BASE = 'https://api.telegram.org';
const LS_TOKEN = 'zbc.token'; // persisted ("remember on this device")
const SS_TOKEN = 'zbc.token.session'; // session-only (default)

/**
 * Talks to the Telegram Bot API directly from the browser. Telegram serves
 * `access-control-allow-origin: *`, so no backend/proxy is needed — the bot
 * TOKEN is the only credential (a token IS full bot control in Telegram's
 * model). The token is held in memory + optional session/local storage; it is
 * never sent anywhere except api.telegram.org.
 */
@Injectable({ providedIn: 'root' })
export class TelegramApiService {
  readonly token = signal<string>('');
  readonly remember = signal<boolean>(false);
  readonly hasToken = computed(() => this.token().trim().length > 0);

  /** Masked token for display, e.g. `8676…4725:AAF…xyz`. */
  readonly masked = computed(() => {
    const t = this.token().trim();
    if (!t) {
      return '';
    }
    const [id, secret] = t.split(':');
    const shortId = id.length > 8 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
    const shortSecret = secret
      ? `${secret.slice(0, 3)}…${secret.slice(-3)}`
      : '';
    return shortSecret ? `${shortId}:${shortSecret}` : shortId;
  });

  constructor() {
    // Restore a remembered token first, else a session token.
    const remembered =
      typeof localStorage !== 'undefined' ? localStorage.getItem(LS_TOKEN) : null;
    const session =
      typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem(SS_TOKEN)
        : null;
    if (remembered) {
      this.token.set(remembered);
      this.remember.set(true);
    } else if (session) {
      this.token.set(session);
    }
  }

  setToken(value: string, remember: boolean): void {
    const t = value.trim();
    this.token.set(t);
    this.remember.set(remember);
    try {
      localStorage.removeItem(LS_TOKEN);
      sessionStorage.removeItem(SS_TOKEN);
      if (t) {
        if (remember) {
          localStorage.setItem(LS_TOKEN, t);
        } else {
          sessionStorage.setItem(SS_TOKEN, t);
        }
      }
    } catch {
      /* storage may be unavailable (private mode) — in-memory still works */
    }
  }

  clearToken(): void {
    this.token.set('');
    this.remember.set(false);
    try {
      localStorage.removeItem(LS_TOKEN);
      sessionStorage.removeItem(SS_TOKEN);
    } catch {
      /* ignore */
    }
  }

  /**
   * Call a Bot API method. Pass `form` (FormData) for multipart uploads
   * (e.g. setMyProfilePhoto / sendPhoto), otherwise `params` is sent as JSON.
   */
  async call<T = unknown>(
    method: string,
    params?: Record<string, unknown>,
    form?: FormData,
  ): Promise<TgResponse<T>> {
    const token = this.token().trim();
    if (!token) {
      return { ok: false, description: 'No bot token set.' };
    }
    const url = `${API_BASE}/bot${token}/${method}`;
    let res: Response;
    try {
      res = form
        ? await fetch(url, { method: 'POST', body: form })
        : await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(params ?? {}),
          });
    } catch (e) {
      return {
        ok: false,
        description: `Network/CORS error: ${(e as Error).message}`,
      };
    }
    try {
      return (await res.json()) as TgResponse<T>;
    } catch {
      return { ok: false, description: `Non-JSON response (HTTP ${res.status}).` };
    }
  }
}
