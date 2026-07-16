import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TelegramApiService } from '../telegram-api.service';
import { ResultView } from '../result-view';
import { mkCall, run } from './call-slot';

@Component({
  selector: 'panel-identity',
  imports: [FormsModule, ResultView],
  template: `
    <div class="card">
      <h2>Language</h2>
      <p class="hint">
        Bot name & descriptions are per-language. Leave as <b>Default</b> for
        the fallback shown to everyone; pick a language for a dedicated variant
        (set the Vietnamese copy as Default, then add an <code>en</code>
        variant).
      </p>
      <select [(ngModel)]="lang">
        <option value="">Default (fallback for all)</option>
        <option value="vi">vi — Tiếng Việt</option>
        <option value="en">en — English</option>
      </select>
    </div>

    <div class="card">
      <h2>Name <span class="sub">(0–64 chars)</span></h2>
      <input maxlength="64" [(ngModel)]="name" placeholder="Zira – Task Manager" />
      <div class="row" style="margin-top:10px">
        <button (click)="getName()" [disabled]="nameSlot.loading()">Get</button>
        <button class="primary" (click)="setName()" [disabled]="nameSlot.loading()">Set name</button>
      </div>
      <result-view [res]="nameSlot.res()" [loading]="nameSlot.loading()" />
    </div>

    <div class="card">
      <h2>Description <span class="sub">(0–512 — the "what can this bot do?" screen)</span></h2>
      <textarea maxlength="512" [(ngModel)]="desc" placeholder="Get task notifications, run quick commands, open the Zira Mini App…"></textarea>
      <div class="row" style="margin-top:10px">
        <button (click)="getDesc()" [disabled]="descSlot.loading()">Get</button>
        <button class="primary" (click)="setDesc()" [disabled]="descSlot.loading()">Set description</button>
      </div>
      <result-view [res]="descSlot.res()" [loading]="descSlot.loading()" />
    </div>

    <div class="card">
      <h2>Short description <span class="sub">(0–120 — profile + travels with shared links)</span></h2>
      <textarea maxlength="120" [(ngModel)]="short" placeholder="Zira — quản lý công việc & dự án ngay trong Telegram."></textarea>
      <div class="row" style="margin-top:10px">
        <button (click)="getShort()" [disabled]="shortSlot.loading()">Get</button>
        <button class="primary" (click)="setShort()" [disabled]="shortSlot.loading()">Set short description</button>
      </div>
      <result-view [res]="shortSlot.res()" [loading]="shortSlot.loading()" />
    </div>

    <div class="card">
      <h2>Profile photo</h2>
      <p class="hint">
        Static .JPG (or .PNG). Uploaded fresh each time (Telegram does not allow
        reusing a file_id for profile photos). Applies to all languages.
      </p>
      <input type="file" accept="image/*" (change)="pickPhoto($event)" />
      <div class="row" style="margin-top:10px">
        <button class="primary" (click)="setPhoto()" [disabled]="!photoFile() || photoSlot.loading()">Upload photo</button>
        <button class="danger" (click)="removePhoto()" [disabled]="photoSlot.loading()">Remove photo</button>
      </div>
      <result-view [res]="photoSlot.res()" [loading]="photoSlot.loading()" />
    </div>
  `,
})
export class IdentityPanel {
  private readonly api = inject(TelegramApiService);

  readonly lang = signal('');
  readonly name = signal('');
  readonly desc = signal('');
  readonly short = signal('');
  readonly photoFile = signal<File | null>(null);

  readonly nameSlot = mkCall();
  readonly descSlot = mkCall();
  readonly shortSlot = mkCall();
  readonly photoSlot = mkCall();

  private langParam(): Record<string, unknown> {
    return this.lang() ? { language_code: this.lang() } : {};
  }

  async getName() {
    const r = await run(this.nameSlot, () =>
      this.api.call<{ name: string }>('getMyName', this.langParam()),
    );
    if (r.ok && r.result) {
      this.name.set(r.result.name);
    }
  }
  async setName() {
    await run(this.nameSlot, () =>
      this.api.call('setMyName', { name: this.name(), ...this.langParam() }),
    );
  }

  async getDesc() {
    const r = await run(this.descSlot, () =>
      this.api.call<{ description: string }>(
        'getMyDescription',
        this.langParam(),
      ),
    );
    if (r.ok && r.result) {
      this.desc.set(r.result.description);
    }
  }
  async setDesc() {
    await run(this.descSlot, () =>
      this.api.call('setMyDescription', {
        description: this.desc(),
        ...this.langParam(),
      }),
    );
  }

  async getShort() {
    const r = await run(this.shortSlot, () =>
      this.api.call<{ short_description: string }>(
        'getMyShortDescription',
        this.langParam(),
      ),
    );
    if (r.ok && r.result) {
      this.short.set(r.result.short_description);
    }
  }
  async setShort() {
    await run(this.shortSlot, () =>
      this.api.call('setMyShortDescription', {
        short_description: this.short(),
        ...this.langParam(),
      }),
    );
  }

  pickPhoto(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0] ?? null;
    this.photoFile.set(f);
  }
  async setPhoto() {
    const f = this.photoFile();
    if (!f) {
      return;
    }
    const form = new FormData();
    form.append('photo', JSON.stringify({ type: 'static', photo: 'attach://pic' }));
    form.append('pic', f, f.name);
    await run(this.photoSlot, () =>
      this.api.call('setMyProfilePhoto', undefined, form),
    );
  }
  async removePhoto() {
    await run(this.photoSlot, () => this.api.call('removeMyProfilePhoto'));
  }
}
