import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_MODULE, GAME_MODULES, gameModuleOf } from '@allisteam/shared';

/**
 * 游戏模块预设是发布表单的下拉建议来源。
 * 新增游戏时先加预设与 seed，再让前端按游戏名取到它，避免表单里只剩「段位 / 模式」这两个干瘪的输入框。
 */
describe('游戏模块预设', () => {
  it('守望先锋 / 第五人格 / Steam 小游戏 都有预设', () => {
    for (const name of ['守望先锋', '第五人格', 'Steam 小游戏']) {
      expect(GAME_MODULES[name], `缺少 ${name} 的预设`).toBeDefined();
    }
  });

  it('新模块的平台与默认平台一致，发布时不会选到不可用的平台', () => {
    for (const name of ['守望先锋', '第五人格', 'Steam 小游戏']) {
      const module = GAME_MODULES[name]!;
      expect(module.platforms).toContain(module.defaultPlatform);
      expect(module.platforms.length).toBeGreaterThan(0);
    }
  });

  it('守望先锋与第五人格给出模式建议，Steam 小游戏用具体游戏名作为模式', () => {
    expect(GAME_MODULES['守望先锋']!.modes).toContain('竞技');
    expect(GAME_MODULES['第五人格']!.modes).toContain('排位');
    expect(GAME_MODULES['Steam 小游戏']!.modes).toContain('胡闹厨房');
  });

  it('没有段位体系的游戏返回空段位数组，表单仍可发布', () => {
    expect(GAME_MODULES['Steam 小游戏']!.ranks).toEqual([]);
    expect(gameModuleOf('Steam 小游戏').rankLabel).toBe('段位');
  });

  it('未知游戏或空游戏名回落到兜底配置', () => {
    expect(gameModuleOf('还没上线的游戏')).toBe(DEFAULT_GAME_MODULE);
    expect(gameModuleOf(null)).toBe(DEFAULT_GAME_MODULE);
    expect(gameModuleOf(undefined)).toBe(DEFAULT_GAME_MODULE);
  });
});
