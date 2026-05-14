import request from 'supertest';
import app from '../index';

describe('GET /api/portfolio/:userId', () => {
  it('returns 200 and a portfolio summary with totalPortfolioValueARS and assets', async () => {
    const res = await request(app).get('/api/portfolio/test-user');

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body).toHaveProperty('totalPortfolioValueARS');
    expect(res.body).toHaveProperty('assets');
    expect(Array.isArray(res.body.assets)).toBe(true);
  });
});
