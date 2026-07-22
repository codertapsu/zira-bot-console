import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TelegramApiService } from '../telegram-api.service';
import { ResultView } from '../result-view';
import { mkCall, run } from './call-slot';

@Component({
  selector: 'panel-chat-tools',
  imports: [FormsModule, ResultView],
  template: `
    <div class="card">
      <h2>Chat lookup</h2>
      <p class="hint">
        Inspect any chat the bot can see. For a Zira project group, find its chat_id in the server
        DB (<code>telegram_bot_project_chats.chat_id</code>).
      </p>
      <label class="first">chat_id</label>
      <input [(ngModel)]="chatId" placeholder="-1001234567890 or @publicname" class="mono" />
      <div class="row" style="margin-top:10px">
        <button (click)="getChat()" [disabled]="info.loading()">getChat</button>
        <button (click)="count()" [disabled]="info.loading()">getChatMemberCount</button>
      </div>
      <label>user_id <span class="sub">(for getChatMember — blank uses no id)</span></label>
      <input [(ngModel)]="userId" placeholder="123456789" class="mono" />
      <div class="row" style="margin-top:10px">
        <button (click)="member()" [disabled]="info.loading() || !userId().trim()">
          getChatMember
        </button>
      </div>
      <result-view [res]="info.res()" [loading]="info.loading()" />
    </div>

    <div class="card">
      <h2>Pin / unpin</h2>
      <p class="hint">
        Requires the bot to be an admin with <code>can_pin_messages</code>. Uses the chat_id above.
      </p>
      <label class="first">message_id</label>
      <input [(ngModel)]="messageId" placeholder="42" class="mono" />
      <label>Silent</label>
      <select [(ngModel)]="silentPin">
        <option [ngValue]="true">disable_notification: true</option>
        <option [ngValue]="false">disable_notification: false</option>
      </select>
      <div class="row" style="margin-top:10px">
        <button (click)="pin()" [disabled]="pinSlot.loading()">Pin</button>
        <button (click)="unpin()" [disabled]="pinSlot.loading()">Unpin (by id)</button>
      </div>
      <result-view [res]="pinSlot.res()" [loading]="pinSlot.loading()" />
    </div>

    <div class="card dz">
      <h2>Leave chat ⚠</h2>
      <p class="hint">
        The bot leaves the chat above. <b>No admin rights needed</b> — it always works. For a
        Zira-bound project group this does NOT clean up the DB binding (do that via the Zira
        server). Irreversible from here.
      </p>
      <label class="first">
        <input type="checkbox" style="width:auto;margin-right:7px" [(ngModel)]="unlock" />
        Enable destructive action
      </label>
      <div class="row" style="margin-top:10px">
        <button class="danger" (click)="leave()" [disabled]="!unlock() || leaveSlot.loading()">
          leaveChat
        </button>
      </div>
      <result-view [res]="leaveSlot.res()" [loading]="leaveSlot.loading()" />
    </div>
  `,
})
export class ChatToolsPanel {
  private readonly api = inject(TelegramApiService);
  readonly chatId = signal('');
  readonly userId = signal('');
  readonly messageId = signal('');
  readonly silentPin = signal(true);
  readonly unlock = signal(false);

  readonly info = mkCall();
  readonly pinSlot = mkCall();
  readonly leaveSlot = mkCall();

  private cid(): string | number {
    const c = this.chatId().trim();
    return /^-?\d+$/.test(c) ? Number(c) : c;
  }

  async getChat() {
    await run(this.info, () => this.api.call('getChat', { chat_id: this.cid() }));
  }
  async count() {
    await run(this.info, () => this.api.call('getChatMemberCount', { chat_id: this.cid() }));
  }
  async member() {
    await run(this.info, () =>
      this.api.call('getChatMember', {
        chat_id: this.cid(),
        user_id: Number(this.userId()),
      }),
    );
  }
  async pin() {
    await run(this.pinSlot, () =>
      this.api.call('pinChatMessage', {
        chat_id: this.cid(),
        message_id: Number(this.messageId()),
        disable_notification: this.silentPin(),
      }),
    );
  }
  async unpin() {
    await run(this.pinSlot, () =>
      this.api.call('unpinChatMessage', {
        chat_id: this.cid(),
        message_id: Number(this.messageId()),
      }),
    );
  }
  async leave() {
    await run(this.leaveSlot, () => this.api.call('leaveChat', { chat_id: this.cid() }));
    this.unlock.set(false);
  }
}
