import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createTestApp,
  futureIso,
  hasTestDb,
  registerUser,
  resetDatabase,
  type TestSession,
} from './utils';

describe.skipIf(!hasTestDb)('演唱会与旅游局', () => {
  let app: INestApplication;
  let session: TestSession;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    session = await registerUser(app);
  });

  afterAll(async () => {
    await app.close();
  });

  function create(body: Record<string, unknown>): request.Test {
    return request(app.getHttpServer())
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send(body);
  }

  const concertBody = {
    domain: 'CONCERT',
    title: '陈粒上海站内场找同行',
    description: '散场后一起回市区，可以拼车。',
    city: '上海',
    startTime: futureIso(72),
    capacity: 4,
    concert: {
      artist: '陈粒',
      tourName: '洄游',
      venue: '梅赛德斯-奔驰文化中心',
      seatType: 'INNER',
      hasTicket: true,
      ticketNote: '内场 B 区',
    },
  };

  const travelBody = {
    domain: 'TRAVEL',
    title: '国庆大理五天找搭子',
    description: '节奏慢一点，主要想环洱海和喝咖啡。',
    city: '成都',
    startTime: futureIso(120),
    endTime: futureIso(120 + 24 * 5),
    capacity: 4,
    travel: {
      destination: '大理',
      budgetMin: 2000,
      budgetMax: 4000,
      transport: 'TRAIN',
      intensity: 'RELAXED',
      shareRoom: true,
    },
  };

  it('发布演唱会局：写入扩展表，艺人 / 座位区域可筛选', async () => {
    const created = await create(concertBody).expect(201);

    expect(created.body.domain).toBe('CONCERT');
    expect(created.body.game).toBeNull();
    expect(created.body.concert.artist).toBe('陈粒');
    expect(created.body.concert.seatType).toBe('INNER');
    expect(created.body.concert.hasTicket).toBe(true);
    expect(created.body.endTime).toBeNull();

    await create({
      ...concertBody,
      title: '五月天上海站看台找同行',
      concert: { artist: '五月天', seatType: 'STAND', hasTicket: false },
    }).expect(201);

    const byArtist = await request(app.getHttpServer())
      .get('/api/v1/posts')
      .query({ domain: 'CONCERT', artist: '陈粒' })
      .expect(200);
    expect(byArtist.body.items).toHaveLength(1);
    expect(byArtist.body.items[0].concert.artist).toBe('陈粒');

    const bySeat = await request(app.getHttpServer())
      .get('/api/v1/posts')
      .query({ domain: 'CONCERT', seatType: 'STAND' })
      .expect(200);
    expect(bySeat.body.items).toHaveLength(1);
    expect(bySeat.body.items[0].concert.artist).toBe('五月天');
  });

  it('发布旅游局：必须有返程日期，预算与交通可筛选', async () => {
    const created = await create(travelBody).expect(201);

    expect(created.body.domain).toBe('TRAVEL');
    expect(created.body.game).toBeNull();
    expect(created.body.travel.destination).toBe('大理');
    expect(created.body.travel.budgetMax).toBe(4000);
    expect(created.body.endTime).toBeTypeOf('string');

    const matched = await request(app.getHttpServer())
      .get('/api/v1/posts')
      .query({
        domain: 'TRAVEL',
        destination: '大理',
        budgetMax: 4000,
        transport: 'TRAIN',
      })
      .expect(200);
    expect(matched.body.items).toHaveLength(1);
    expect(matched.body.items[0].travel.shareRoom).toBe(true);

    // 没填预算上限的局代表「不设限」，不应该被预算筛选排除
    await create({
      ...travelBody,
      title: '周末泉州三天找饭搭子',
      travel: { destination: '泉州', transport: 'ANY' },
    }).expect(201);

    const noBudget = await request(app.getHttpServer())
      .get('/api/v1/posts')
      .query({ domain: 'TRAVEL', budgetMax: 1000 })
      .expect(200);
    expect(noBudget.body.items).toHaveLength(1);
    expect(noBudget.body.items[0].travel.destination).toBe('泉州');
  });

  it('旅游局缺返程日期返回 400', async () => {
    const { endTime: _endTime, ...withoutEnd } = travelBody;
    const response = await create(withoutEnd).expect(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });

  it('旅游预算下限高于上限返回 400', async () => {
    const response = await create({
      ...travelBody,
      travel: { ...travelBody.travel, budgetMin: 5000, budgetMax: 3000 },
    }).expect(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });

  it('演唱会艺人留空返回 400', async () => {
    const response = await create({
      ...concertBody,
      concert: { ...concertBody.concert, artist: '   ' },
    }).expect(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });
});
