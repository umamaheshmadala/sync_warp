
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Example handler - replace with actual API endpoints as needed
  http.get('*/api/v1/auth/session', () => {
    return HttpResponse.json({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'authenticated'
      },
      session: {
        access_token: 'valid-test-token',
        refresh_token: 'valid-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }
    });
  }),

  http.get('*/api/v1/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),
];
