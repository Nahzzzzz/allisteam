import { describe, expect, it } from 'vitest';
import {
  HIKING_DIFFICULTIES,
  HIKING_PROVINCES,
  HIKING_ROUTES,
  filterHikingRoutes,
  hikingRouteOf,
  hikingRoutesMatching,
} from '@allisteam/shared';

/**
 * 徒步攻略是纯静态内容，没有接口可测；这里守住数据结构本身，
 * 避免新增路线时漏掉时长、携带物品或小地图坐标，详情页渲染出半张空票。
 */
describe('徒步路线攻略数据', () => {
  it('slug 唯一，详情页可以按 slug 取到', () => {
    const slugs = HIKING_ROUTES.map((route) => route.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    for (const route of HIKING_ROUTES) {
      expect(hikingRouteOf(route.slug)).toBe(route);
    }
    expect(hikingRouteOf('not-a-route')).toBeUndefined();
  });

  it('每条路线都有可展示的时长、里程与完整攻略', () => {
    for (const route of HIKING_ROUTES) {
      expect(route.name.length).toBeGreaterThan(0);
      expect(route.destination.length).toBeGreaterThan(0);
      expect(route.duration.length).toBeGreaterThan(0);
      expect(HIKING_DIFFICULTIES).toContain(route.difficulty);
      expect(route.days).toBeGreaterThanOrEqual(1);
      expect(route.distanceKm).toBeGreaterThan(0);
      expect(route.ascentM).toBeGreaterThan(0);
      expect(route.highlights.length).toBeGreaterThan(0);
      expect(route.tips.length).toBeGreaterThan(0);
      expect(route.stages.length).toBeGreaterThan(0);
      expect(route.gear.length).toBeGreaterThanOrEqual(3);
      for (const group of route.gear) {
        expect(group.label.length).toBeGreaterThan(0);
        expect(group.items.length).toBeGreaterThan(0);
      }
    }
  });

  it('示意地图的点位都在 320 × 180 画布内，海拔采样至少两个点', () => {
    for (const route of HIKING_ROUTES) {
      expect(route.map.path.startsWith('M')).toBe(true);
      expect(route.map.points.length).toBeGreaterThanOrEqual(2);
      for (const point of route.map.points) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(320);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(180);
      }
      expect(route.map.elevation.length).toBeGreaterThanOrEqual(2);
      for (const point of route.map.elevation) {
        expect(point.meters).toBeGreaterThan(0);
      }
    }
  });

  it('发布表单的目的地模糊匹配能命中常见写法', () => {
    expect(hikingRoutesMatching('雨崩')[0]?.slug).toBe('yubeng-shenpu');
    expect(hikingRoutesMatching('雨崩村')[0]?.slug).toBe('yubeng-shenpu');
    expect(hikingRoutesMatching('云南雨崩')[0]?.slug).toBe('yubeng-shenpu');
    expect(hikingRoutesMatching('   ')).toEqual([]);
    expect(hikingRoutesMatching(null)).toEqual([]);
  });

  it('难度与地区筛选可以叠加，地区列表来自路线数据', () => {
    const hard = filterHikingRoutes({ difficulty: 'HARD' });
    expect(hard.length).toBeGreaterThan(0);
    expect(hard.every((route) => route.difficulty === 'HARD')).toBe(true);

    const yunnan = filterHikingRoutes({ province: '云南' });
    expect(yunnan.length).toBeGreaterThan(1);
    expect(yunnan.every((route) => route.province === '云南')).toBe(true);

    expect(filterHikingRoutes({ difficulty: 'HARD', province: '云南' })).toEqual([]);
    expect(HIKING_PROVINCES).toContain('云南');
    expect(HIKING_PROVINCES.length).toBe(new Set(HIKING_PROVINCES).size);
  });
});
