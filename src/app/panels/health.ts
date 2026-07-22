import { Component, inject } from '@angular/core';
import { TelegramApiService } from '../telegram-api.service';
import { ResultView } from '../result-view';
import { mkCall, run } from './call-slot';

@Component({
  selector: 'panel-health',
  imports: [ResultView],
  template: `
    <div class="card">
      <h2>Bot health — getMe</h2>
      <p class="hint">
        Verifies the token and shows the bot's capabilities. Watch for
        <code>has_main_web_app</code> (Mini App registered) and <code>can_join_groups</code> (group
        binding possible).
      </p>
      <button class="primary" (click)="getMe()" [disabled]="me.loading()">Run getMe</button>
      <result-view [res]="me.res()" [loading]="me.loading()" />
    </div>

    <div class="card">
      <h2>Webhook diagnostics — getWebhookInfo</h2>
      <p class="hint">
        Free health check. Alert if <code>pending_update_count</code> keeps growing (handler
        down/slow); read <code>last_error_message</code> + <code>last_error_date</code> for delivery
        failures.
      </p>
      <button class="primary" (click)="webhook()" [disabled]="wh.loading()">
        Run getWebhookInfo
      </button>
      <result-view [res]="wh.res()" [loading]="wh.loading()" />
    </div>
  `,
})
export class HealthPanel {
  private readonly api = inject(TelegramApiService);
  readonly me = mkCall();
  readonly wh = mkCall();

  async getMe() {
    await run(this.me, () => this.api.call('getMe'));
  }
  async webhook() {
    await run(this.wh, () => this.api.call('getWebhookInfo'));
  }
}
