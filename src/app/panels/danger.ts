import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TelegramApiService } from '../telegram-api.service';
import { ResultView } from '../result-view';
import { mkCall, run } from './call-slot';

@Component({
  selector: 'panel-danger',
  imports: [FormsModule, ResultView],
  template: `
    <div class="card dz">
      <h2>Webhook ⚠ (production)</h2>
      <p class="warnbox">
        These change how Telegram delivers updates to the LIVE bot.
        <b>setWebhook</b> / <b>deleteWebhook</b> will interrupt Zira's bot until the correct webhook
        is restored. Zira normally registers its own webhook at boot — only touch this to recover or
        debug.
      </p>

      <button class="ghost" (click)="info()" [disabled]="slot.loading()" style="margin-top:12px">
        getWebhookInfo
      </button>

      <label>Webhook URL</label>
      <input
        [(ngModel)]="url"
        placeholder="https://zira-server.example/api/v1/telegram/webhook"
        class="mono"
      />
      <label
        >Secret token
        <span class="sub">(X-Telegram-Bot-Api-Secret-Token — must match the server's)</span></label
      >
      <input [(ngModel)]="secret" placeholder="(optional but recommended)" class="mono" />
      <label>Drop pending updates</label>
      <select [(ngModel)]="drop">
        <option [ngValue]="false">Keep pending updates</option>
        <option [ngValue]="true">Drop pending updates</option>
      </select>

      <label style="margin-top:14px">
        <input type="checkbox" style="width:auto;margin-right:7px" [(ngModel)]="unlock" />
        I understand this affects the production bot — enable
      </label>
      <div class="row" style="margin-top:10px">
        <button
          class="danger"
          (click)="setWebhook()"
          [disabled]="!unlock() || slot.loading() || !url().trim()"
        >
          setWebhook
        </button>
        <button class="danger" (click)="deleteWebhook()" [disabled]="!unlock() || slot.loading()">
          deleteWebhook
        </button>
      </div>
      <result-view [res]="slot.res()" [loading]="slot.loading()" />
    </div>
  `,
})
export class DangerPanel {
  private readonly api = inject(TelegramApiService);
  readonly url = signal('');
  readonly secret = signal('');
  readonly drop = signal(false);
  readonly unlock = signal(false);
  readonly slot = mkCall();

  async info() {
    await run(this.slot, () => this.api.call('getWebhookInfo'));
  }
  async setWebhook() {
    const params: Record<string, unknown> = {
      url: this.url().trim(),
      drop_pending_updates: this.drop(),
    };
    if (this.secret().trim()) {
      params['secret_token'] = this.secret().trim();
    }
    await run(this.slot, () => this.api.call('setWebhook', params));
    this.unlock.set(false);
  }
  async deleteWebhook() {
    await run(this.slot, () =>
      this.api.call('deleteWebhook', { drop_pending_updates: this.drop() }),
    );
    this.unlock.set(false);
  }
}
