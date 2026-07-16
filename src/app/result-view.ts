import { Component, input } from '@angular/core';
import { TgResponse } from './telegram-api.service';

/** Renders the ok/error bar + pretty-printed JSON for a Bot API response. */
@Component({
  selector: 'result-view',
  template: `
    @if (loading()) {
      <div class="result">
        <div class="bar"><span class="spin"></span> Calling Telegram…</div>
      </div>
    } @else if (res(); as r) {
      <div class="result" [class.ok]="r.ok" [class.err]="!r.ok">
        <div class="bar">
          @if (r.ok) {
            <span class="badge ok">✓ ok</span>
          } @else {
            <span class="badge err">✕ error {{ r.error_code }}</span>
            <span>{{ r.description }}</span>
          }
        </div>
        <pre>{{ pretty(r) }}</pre>
      </div>
    }
  `,
})
export class ResultView {
  readonly res = input<TgResponse | null>(null);
  readonly loading = input<boolean>(false);

  pretty(r: TgResponse): string {
    return JSON.stringify(r.ok ? (r.result ?? r) : r, null, 2);
  }
}
