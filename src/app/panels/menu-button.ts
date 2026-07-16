import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TelegramApiService } from '../telegram-api.service';
import { ResultView } from '../result-view';
import { mkCall, run } from './call-slot';

@Component({
  selector: 'panel-menu-button',
  imports: [FormsModule, ResultView],
  template: `
    <div class="card">
      <h2>Chat menu button</h2>
      <p class="hint">
        The button next to the input field in private chats. Leave chat_id blank
        for the bot-wide <b>default</b>; set a chat_id to override one chat (e.g.
        an onboarding URL before a user links their account).
      </p>

      <label class="first">chat_id <span class="sub">(blank = default for all private chats)</span></label>
      <input [(ngModel)]="chatId" placeholder="(blank) or 123456789" class="mono" />

      <label>Button type</label>
      <select [(ngModel)]="type">
        <option value="default">default (shows commands)</option>
        <option value="commands">commands</option>
        <option value="web_app">web_app (open Mini App / URL)</option>
      </select>

      @if (type() === 'web_app') {
        <label>Button text</label>
        <input [(ngModel)]="text" placeholder="Mở Zira" maxlength="64" />
        <label>Web App URL <span class="sub">(https:// or a t.me Mini App link)</span></label>
        <input [(ngModel)]="url" placeholder="https://zira.top/app/ or https://t.me/ziragram_bot/ziradev" class="mono" />
      }

      <div class="row" style="margin-top:12px">
        <button (click)="get()" [disabled]="slot.loading()">Get current</button>
        <button class="primary" (click)="set()" [disabled]="slot.loading()">Set menu button</button>
      </div>
      <result-view [res]="slot.res()" [loading]="slot.loading()" />
    </div>
  `,
})
export class MenuButtonPanel {
  private readonly api = inject(TelegramApiService);
  readonly chatId = signal('');
  readonly type = signal('web_app');
  readonly text = signal('Mở Zira');
  readonly url = signal('');
  readonly slot = mkCall();

  private chatParam(): Record<string, unknown> {
    const c = this.chatId().trim();
    return c ? { chat_id: /^-?\d+$/.test(c) ? Number(c) : c } : {};
  }

  async get() {
    await run(this.slot, () =>
      this.api.call('getChatMenuButton', this.chatParam()),
    );
  }

  async set() {
    let menu_button: Record<string, unknown>;
    if (this.type() === 'web_app') {
      menu_button = {
        type: 'web_app',
        text: this.text(),
        web_app: { url: this.url() },
      };
    } else {
      menu_button = { type: this.type() };
    }
    await run(this.slot, () =>
      this.api.call('setChatMenuButton', {
        ...this.chatParam(),
        menu_button,
      }),
    );
  }
}
