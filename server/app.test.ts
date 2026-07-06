import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';

describe('server', () => {
  it('reports health without cloud credentials', async () => {
    const response = await request(createApp()).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('requires authentication for private data', async () => {
    const response = await request(createApp()).get('/api/child-profiles');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTH_REQUIRED');
  });
});
