import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

// Single-page tabbed console — no router needed. All Telegram calls go
// straight to api.telegram.org from the browser (CORS is open), so no
// HttpClient/interceptors either; the TelegramApiService uses fetch.
export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners()],
};
