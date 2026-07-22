import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TelegramApiService } from './telegram-api.service';
import { HealthPanel } from './panels/health';
import { IdentityPanel } from './panels/identity';
import { CommandsPanel } from './panels/commands';
import { MenuButtonPanel } from './panels/menu-button';
import { ChatToolsPanel } from './panels/chat-tools';
import { ComposePanel } from './panels/compose';
import { DangerPanel } from './panels/danger';

interface BotUser {
  id: number;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
  has_main_web_app?: boolean;
}

type Tab = 'health' | 'identity' | 'commands' | 'menu' | 'chat' | 'compose' | 'danger';

interface TabDef {
  id: Tab;
  label: string;
  desc: string;
  icon: string; // single-path SVG `d`
}

@Component({
  selector: 'app-root',
  imports: [
    FormsModule,
    HealthPanel,
    IdentityPanel,
    CommandsPanel,
    MenuButtonPanel,
    ChatToolsPanel,
    ComposePanel,
    DangerPanel,
  ],
  template: `
    @if (!api.hasToken()) {
      <!-- ── Connect screen ── -->
      <div class="connect-wrap">
        <div class="connect">
          <div class="logo-lg">Z</div>
          <h1>Zira Bot Console</h1>
          <p>
            Manage your Telegram bot directly from the browser. No backend — a bot token is all you
            need.
          </p>
          <div class="card">
            <label class="first">Bot token</label>
            <input
              type="password"
              class="mono"
              autocomplete="off"
              [(ngModel)]="tokenInput"
              (keyup.enter)="save()"
              placeholder="8676254725:AAF…"
            />
            @if (meErr()) {
              <div class="warnbox" style="margin-top:10px">{{ meErr() }}</div>
            }
            <label
              style="display:flex;align-items:center;gap:8px;margin-top:14px;font-weight:400;color:var(--text-2)"
            >
              <input type="checkbox" [(ngModel)]="remember" />
              Remember on this device
            </label>
            <button
              class="primary"
              style="width:100%;margin-top:16px;justify-content:center;display:flex;align-items:center;gap:8px"
              (click)="save()"
              [disabled]="!tokenInput().trim() || meLoading()"
            >
              @if (meLoading()) {
                <span class="spin"></span> Verifying…
              } @else {
                Connect
              }
            </button>
          </div>
          <p class="sub" style="margin-top:16px">
            Token from <b>&#64;BotFather</b> · stays in your browser · sent only to api.telegram.org
          </p>
        </div>
      </div>
    } @else {
      <!-- ── Console ── -->
      <div class="app">
        <aside class="sidebar">
          <div class="brand">
            <div class="logo">Z</div>
            <div>
              <div class="name">Bot Console</div>
              <div class="tag">Zira · internal</div>
            </div>
          </div>
          <nav class="nav">
            @for (t of tabs; track t.id) {
              <button class="nav-item" [class.active]="tab() === t.id" (click)="tab.set(t.id)">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path [attr.d]="t.icon" />
                </svg>
                <span class="lbl">{{ t.label }}</span>
              </button>
            }
          </nav>
          <div class="nav-spacer"></div>
          <div class="nav-foot">
            Calls go straight to api.telegram.org — nothing else leaves your browser.
          </div>
        </aside>

        <main class="main">
          <header class="topbar">
            <div class="title grow">
              {{ active().label }}<small>{{ active().desc }}</small>
            </div>
            <div class="idchip">
              <div class="avatar">{{ initial() }}</div>
              <div class="who">
                @if (meLoading()) {
                  <b>Verifying…</b>
                } @else if (me(); as m) {
                  <b>{{ m.first_name }}</b>
                  @if (m.username) {
                    <span>&#64;{{ m.username }}</span>
                  }
                } @else {
                  <b>Unknown bot</b><span>tap ✕ to reconnect</span>
                }
              </div>
              <button class="ghost x sm" (click)="clear()" title="Disconnect / change token">
                ✕
              </button>
            </div>
          </header>

          <div class="content panel-enter">
            @switch (tab()) {
              @case ('health') {
                <panel-health />
              }
              @case ('identity') {
                <panel-identity />
              }
              @case ('commands') {
                <panel-commands />
              }
              @case ('menu') {
                <panel-menu-button />
              }
              @case ('chat') {
                <panel-chat-tools />
              }
              @case ('compose') {
                <panel-compose />
              }
              @case ('danger') {
                <panel-danger />
              }
            }
          </div>
        </main>
      </div>
    }
  `,
})
export class App {
  readonly api = inject(TelegramApiService);
  readonly tokenInput = signal(this.api.token());
  readonly remember = signal(this.api.remember());
  readonly me = signal<BotUser | null>(null);
  readonly meErr = signal('');
  readonly meLoading = signal(false);
  readonly tab = signal<Tab>('health');

  readonly tabs: TabDef[] = [
    {
      id: 'health',
      label: 'Health',
      desc: 'Token + webhook diagnostics',
      icon: 'M22 12h-4l-3 9L9 3l-3 9H2',
    },
    {
      id: 'identity',
      label: 'Identity',
      desc: 'Name, descriptions & photo',
      icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 21a7 7 0 0 1 14 0',
    },
    {
      id: 'commands',
      label: 'Commands',
      desc: 'Slash-command menu',
      icon: 'M5 17l6-5-6-5M13 19h6',
    },
    { id: 'menu', label: 'Menu button', desc: 'Chat menu button', icon: 'M4 6h16M4 12h16M4 18h16' },
    {
      id: 'chat',
      label: 'Chat tools',
      desc: 'Inspect chats · pin · leaveChat',
      icon: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.7A8 8 0 1 1 21 12Z',
    },
    {
      id: 'compose',
      label: 'Compose',
      desc: 'Send a message or photo',
      icon: 'M22 3 11 14M22 3l-7 19-4-8-8-4 19-7Z',
    },
    {
      id: 'danger',
      label: 'Webhook',
      desc: 'setWebhook · deleteWebhook',
      icon: 'M13 3 4 14h7l-1 7 9-11h-7l1-7Z',
    },
  ];

  readonly active = computed(() => this.tabs.find((t) => t.id === this.tab()) ?? this.tabs[0]);

  constructor() {
    if (this.api.hasToken()) {
      void this.loadMe();
    }
  }

  initial(): string {
    return (this.me()?.first_name || 'B').charAt(0).toUpperCase();
  }

  async save(): Promise<void> {
    const t = this.tokenInput().trim();
    if (!t) {
      return;
    }
    this.api.setToken(t, this.remember());
    const ok = await this.loadMe();
    if (!ok) {
      // Invalid token — revert to the connect screen but keep the error shown.
      this.api.clearToken();
    }
  }

  clear(): void {
    this.api.clearToken();
    this.tokenInput.set('');
    this.me.set(null);
    this.meErr.set('');
  }

  async loadMe(): Promise<boolean> {
    this.meErr.set('');
    this.me.set(null);
    this.meLoading.set(true);
    const r = await this.api.call<BotUser>('getMe');
    this.meLoading.set(false);
    if (r.ok && r.result) {
      this.me.set(r.result);
      return true;
    }
    this.meErr.set(r.description || 'Invalid token or network error.');
    return false;
  }
}
