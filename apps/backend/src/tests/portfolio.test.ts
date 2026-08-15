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
  beforeAll(async () => {
    // Ensure the user exists to satisfy foreign key constraint
    try {
      await database.user.create({
        data: {
          id: 'test-user',
          username: 'test-user',
          passwordHash: 'dummy',
          displayName: 'Test User',
          createdAt: new Date(),
        }
      });
    } catch (e) {
      // User might already exist
    }

    // Insert dummy transaction(s) into the in-memory DB
    const now = new Date();
    await database.transaction.create({
      data: {
        id: 'tx-1',
        userId: 'test-user',
        assetId: 'AAA',
        assetType: 'ACCION_LOCAL',
        type: 'BUY',
        date: now,
        quantity: 10,
        price: 100,
        commission: 0
      }
    });
  });

  afterAll(async () => {
    try {
      await database.$disconnect();
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
