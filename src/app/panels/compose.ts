import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TelegramApiService } from '../telegram-api.service';
import { ResultView } from '../result-view';
import { mkCall, run } from './call-slot';

const KB_EXAMPLE = `{
  "inline_keyboard": [
    [
      { "text": "🌐 Mở Zira", "url": "https://zira.top/app/" },
      { "text": "📣 Tin tức", "url": "https://zira.top/" }
    ]
  ]
}`;

@Component({
  selector: 'panel-compose',
  imports: [FormsModule, ResultView],
  template: `
    <div class="card">
      <h2>Compose message</h2>
      <p class="hint">
        Send a test or promotional message to any chat_id. HTML parse mode.
        Attach a photo to send a rich card (<code>sendPhoto</code> with caption);
        otherwise plain <code>sendMessage</code>. Silent = no sound/vibration.
      </p>

      <label class="first">chat_id</label>
      <input [(ngModel)]="chatId" placeholder="123456789 or -1001234567890" class="mono" />

      <label>Text / caption <span class="sub">(HTML: &lt;b&gt; &lt;i&gt; &lt;a href&gt; &lt;code&gt;)</span></label>
      <textarea rows="5" [(ngModel)]="text" placeholder="<b>Zira</b> vừa có tính năng mới! <a href='https://zira.top'>Xem ngay</a>"></textarea>

      <div class="row">
        <div class="grow">
          <label>Silent</label>
          <select [(ngModel)]="silent">
            <option [ngValue]="false">Audible (default)</option>
            <option [ngValue]="true">Silent (disable_notification)</option>
          </select>
        </div>
        <div class="grow">
          <label>Web page preview</label>
          <select [(ngModel)]="preview">
            <option [ngValue]="false">Off</option>
            <option [ngValue]="true">On</option>
          </select>
        </div>
      </div>

      <label>Photo <span class="sub">(optional — sends as a card with the text as caption; caption max 1024)</span></label>
      <input type="file" accept="image/*" (change)="pickPhoto($event)" />

      <label>Inline keyboard <span class="sub">(optional reply_markup JSON)</span></label>
      <textarea rows="7" [(ngModel)]="kb" class="mono" spellcheck="false"></textarea>

      <div class="row" style="margin-top:12px">
        <button class="primary" (click)="send()" [disabled]="slot.loading() || !chatId().trim()">
          {{ photoFile() ? 'Send photo' : 'Send message' }}
        </button>
        <button class="ghost" (click)="kb.set('')">Clear keyboard</button>
      </div>
      @if (parseError()) {
        <div class="warnbox" style="margin-top:10px">Invalid keyboard JSON: {{ parseError() }}</div>
      }
      <result-view [res]="slot.res()" [loading]="slot.loading()" />
    </div>
  `,
})
export class ComposePanel {
  private readonly api = inject(TelegramApiService);
  readonly chatId = signal('');
  readonly text = signal('');
  readonly silent = signal(false);
  readonly preview = signal(false);
  readonly kb = signal(KB_EXAMPLE);
  readonly photoFile = signal<File | null>(null);
  readonly parseError = signal('');
  readonly slot = mkCall();

  private cid(): string | number {
    const c = this.chatId().trim();
    return /^-?\d+$/.test(c) ? Number(c) : c;
  }

  pickPhoto(e: Event) {
    this.photoFile.set((e.target as HTMLInputElement).files?.[0] ?? null);
  }

  private replyMarkup(): unknown | undefined | 'ERROR' {
    const raw = this.kb().trim();
    if (!raw) {
      return undefined;
    }
    try {
      this.parseError.set('');
      return JSON.parse(raw);
    } catch (e) {
      this.parseError.set((e as Error).message);
      return 'ERROR';
    }
  }

  async send() {
    const markup = this.replyMarkup();
    if (markup === 'ERROR') {
      return;
    }
    const file = this.photoFile();
    if (file) {
      const form = new FormData();
      form.append('chat_id', String(this.cid()));
      form.append('photo', file, file.name);
      if (this.text()) {
        form.append('caption', this.text());
        form.append('parse_mode', 'HTML');
      }
      form.append('disable_notification', String(this.silent()));
      if (markup) {
        form.append('reply_markup', JSON.stringify(markup));
      }
      await run(this.slot, () => this.api.call('sendPhoto', undefined, form));
    } else {
      const params: Record<string, unknown> = {
        chat_id: this.cid(),
        text: this.text(),
        parse_mode: 'HTML',
        disable_notification: this.silent(),
        link_preview_options: { is_disabled: !this.preview() },
      };
      if (markup) {
        params['reply_markup'] = markup;
      }
      await run(this.slot, () => this.api.call('sendMessage', params));
    }
  }
}
