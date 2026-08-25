import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TelegramApiService } from '../telegram-api.service';
import { ResultView } from '../result-view';
import { mkCall, run } from './call-slot';

// Shown as a placeholder, never as the field's value: the box used to ship
// pre-filled, so pressing "Set commands" before "Get" replaced the live menu
// with these three examples.
const EXAMPLE = `[{ "command": "today", "description": "Nhiệm vụ hôm nay" }]`;

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
      <textarea
        rows="9"
        [(ngModel)]="json"
        class="mono"
        spellcheck="false"
        [attr.placeholder]="example"
      ></textarea>

      <div class="row" style="margin-top:10px">
        <button (click)="get()" [disabled]="slot.loading()">Get</button>
      </div>

      <div class="card dz" style="margin-top:12px">
        <h3>Danger zone</h3>
        <p class="hint">
          Both of these replace the LIVE bot's slash menu for the selected scope, which defaults to
          every private chat. The server re-registers its webhook at boot but not its command menu,
          so a restart will not undo this — recovery means rebuilding the list by hand.
        </p>
        <label>
          <input type="checkbox" style="width:auto;margin-right:7px" [(ngModel)]="unlock" />
          I understand this affects the production bot — enable
        </label>
        <div class="row" style="margin-top:10px">
          <button class="danger" (click)="set()" [disabled]="!unlock() || slot.loading()">
            Set commands
          </button>
          <button class="danger" (click)="del()" [disabled]="!unlock() || slot.loading()">
            Delete (this scope)
          </button>
        </div>
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
  readonly json = signal('');
  readonly unlock = signal(false);
  readonly parseError = signal('');
  readonly example = EXAMPLE;
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
    // Reset the gate after the call, matching the webhook/leaveChat panels: the
    // checkbox is a per-action confirmation, not a session-wide mode.
    await run(this.slot, () =>
      this.api.call('setMyCommands', {
        commands,
        scope: this.scopeObj(),
        ...this.langParam(),
      }),
    );
    this.unlock.set(false);
  }

  async del() {
    await run(this.slot, () =>
      this.api.call('deleteMyCommands', {
        scope: this.scopeObj(),
        ...this.langParam(),
      }),
    );
    this.unlock.set(false);
  }
}
