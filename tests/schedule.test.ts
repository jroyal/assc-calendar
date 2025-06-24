import { describe, it, expect } from 'vitest';
import worker from '../src/index';
import { createICS } from '../src/lib/ics';

function mockEnv(ics: string) {
  return {
    KV: {
      get: async () => ics,
      put: async () => {},
    },
    ASSC_USERNAME: 'testuser',
    ASSC_PASSWORD: 'password',
  } as any;
}

describe('schedule endpoint', () => {
  it('returns a valid ics file', async () => {
    const { value: ics } = createICS([
      {
        title: 'Game 1',
        start: [2025, 7, 1, 10, 0],
        duration: { hours: 1 },
        location: 'Field 1',
      },
    ]);

    const env = mockEnv(ics!);
    const res = await worker.fetch(new Request('http://localhost/schedule'), env, {} as any);
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(text.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(text.trim().endsWith('END:VCALENDAR')).toBe(true);
  });
});
