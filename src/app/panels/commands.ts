import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TelegramApiService } from '../telegram-api.service';
import { ResultView } from '../result-view';
import { mkCall, run } from './call-slot';

const EXAMPLE = `[
  { "command": "today", "description": "Nhiệm vụ hôm nay" },
  { "command": "new", "description": "Tạo nhiệm vụ nhanh" },
  { "command": "app", "description": "Mở Zira Mini App" }
]`;

@Component({
  selector: 'panel-commands',
  imports: [FormsModule, ResultView],
  template: `
    <div class="card">
      <h2>Command menu</h2>
      <p class="hint">
        Manage the slash-command list per <b>scope</b> × language. Tip: put personal commands under
        <code>all_private_chats</code> and group ones under <code>all_group_chats</code>. Narrower
        scopes override wider ones.
      </p>

      <div class="row">
        <div class="grow">
          <label class="first">Scope</label>
          <select [(ngModel)]="scope">
            <option value="default">default</option>
            <option value="all_private_chats">all_private_chats</option>
            <option value="all_group_chats">all_group_chats</option>
            <option value="all_chat_administrators">all_chat_administrators</option>
            <option value="chat">chat (one chat)</option>
            <option value="chat_administrators">chat_administrators (one chat)</option>
            <option value="chat_member">chat_member (one user in one chat)</option>
          </select>
        </div>
        <div class="grow">
          <label class="first">Language code <span class="sub">(blank = fallback)</span></label>
          <input [(ngModel)]="lang" placeholder="vi / en / (blank)" class="mono" />
        </div>
      </div>

      @if (needsChat()) {
        <label>chat_id</label>
        <input [(ngModel)]="chatId" placeholder="-1001234567890 or @channelusername" class="mono" />
      }
      @if (scope() === 'chat_member') {
        <label>user_id</label>
        <input [(ngModel)]="userId" placeholder="123456789" class="mono" />
      }

      <label>Commands (JSON array of {{ '{command, description}' }})</label>
      <textarea rows="9" [(ngModel)]="json" class="mono" spellcheck="false"></textarea>

      <div class="row" style="margin-top:10px">
        <button (click)="get()" [disabled]="slot.loading()">Get</button>
        <button class="primary" (click)="set()" [disabled]="slot.loading()">Set commands</button>
        <button class="danger" (click)="del()" [disabled]="slot.loading()">
          Delete (this scope)
        </button>
      </div>
      @if (parseError()) {
        <div class="warnbox" style="margin-top:10px">Invalid JSON: {{ parseError() }}</div>
      }
      <result-view [res]="slot.res()" [loading]="slot.loading()" />
    </div>
  `,
})
export class CommandsPanel {
  private readonly api = inject(TelegramApiService);
  readonly scope = signal('all_private_chats');
  readonly lang = signal('');
  readonly chatId = signal('');
  readonly userId = signal('');
  readonly json = signal(EXAMPLE);
  readonly parseError = signal('');
  readonly slot = mkCall();

  readonly needsChat = computed(() =>
    ['chat', 'chat_administrators', 'chat_member'].includes(this.scope()),
  );

  private scopeObj(): Record<string, unknown> {
    const type = this.scope();
    const s: Record<string, unknown> = { type };
    if (this.needsChat()) {
      s['chat_id'] = this.numOrStr(this.chatId());
    }
    if (type === 'chat_member') {
      s['user_id'] = Number(this.userId());
    }
    return s;
  }

  private numOrStr(v: string): string | number {
    const t = v.trim();
    return /^-?\d+$/.test(t) ? Number(t) : t;
  }

  private langParam(): Record<string, unknown> {
    return this.lang().trim() ? { language_code: this.lang().trim() } : {};
  }

  async get() {
    const r = await run(this.slot, () =>
      this.api.call('getMyCommands', {
        scope: this.scopeObj(),
        ...this.langParam(),
      }),
    );
    if (r.ok && Array.isArray(r.result)) {
      this.json.set(JSON.stringify(r.result, null, 2));
    }
  }

  async set() {
    this.parseError.set('');
    let commands: unknown;
    try {
      commands = JSON.parse(this.json());
    } catch (e) {
      this.parseError.set((e as Error).message);
      return;
    }
    await run(this.slot, () =>
      this.api.call('setMyCommands', {
        commands,
        scope: this.scopeObj(),
        ...this.langParam(),
      }),
    );
  }

  async del() {
    await run(this.slot, () =>
      this.api.call('deleteMyCommands', {
        scope: this.scopeObj(),
        ...this.langParam(),
      }),
    );
  }
}
