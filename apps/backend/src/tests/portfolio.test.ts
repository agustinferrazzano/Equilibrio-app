import request from 'supertest';

// Mock external services before importing the app so the instances used by the app are mocked
jest.mock('../services/YahooFinanceService', () => {
  return {
    YahooFinanceService: jest.fn().mockImplementation(() => ({
      getCurrentPrice: jest.fn().mockResolvedValue(150),
    })),
  };
});

jest.mock('../services/DolarApiService', () => {
  return {
    DolarApiService: jest.fn().mockImplementation(() => ({
      getExchangeRate: jest.fn().mockResolvedValue(1000),
    })),
  };
});

import app, { database } from '../index';

describe('GET /api/portfolio/:userId', () => {
  beforeAll(() => {
    // Insert dummy transaction(s) into the in-memory DB
    const now = new Date().toISOString();
    database.prepare(
      `INSERT INTO transactions (id, userId, assetId, assetType, type, date, quantity, price, commission)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('tx-1', 'test-user', 'AAA', 'ACCION_LOCAL', 'BUY', now, 10, 100, 0);
  });

  afterAll(() => {
    try {
      database.close();
    } catch (err) {
      // ignore
    }
  });

  it('returns 200 and a portfolio summary with predictable totals using mocked services', async () => {
    const res = await request(app).get('/api/portfolio/test-user');

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body).toHaveProperty('totalPortfolioValueARS');
    expect(res.body).toHaveProperty('assets');
    expect(Array.isArray(res.body.assets)).toBe(true);

    // With one BUY of quantity 10 and mocked currentPrice 150, total = 1500
    expect(res.body.totalPortfolioValueARS).toBeCloseTo(1500, 2);

    const asset = res.body.assets.find((a: any) => a.assetId === 'AAA');
    expect(asset).toBeDefined();
    expect(asset.currentValue).toBeCloseTo(1500, 2);
  });
});
