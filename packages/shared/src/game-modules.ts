import type { Platform } from './enums';

/**
 * 游戏模块预设：只影响表单的选项与默认值，不改变数据模型。
 *
 * 游戏是 `Game` 字典里的一行，新增游戏不需要迁移；这里给常玩的游戏补上
 * 「平台 / 模式 / 段位」的推荐值，发布表单与游戏档案用它做下拉建议，
 * 玩家仍然可以自己填。键名必须与 seed 里的 `Game.name` 完全一致。
 */
export interface GameModule {
  /** 副标题，列表与表单里用一句话说明这个游戏怎么玩 */
  tagline: string;
  /** 发布时默认选中的平台 */
  defaultPlatform: Platform;
  /** 这个游戏实际存在的平台，发布表单只列这些 */
  platforms: Platform[];
  /** 模式建议，前端用 datalist，不限制自由输入 */
  modes: string[];
  /** 段位建议，按从低到高排列；空数组表示这个游戏没有通用段位 */
  ranks: string[];
  /** 段位字段的显示名，例如原神用「冒险等阶」 */
  rankLabel: string;
  /** 发布表单顶部的提示 */
  hint: string;
}

const PC_ONLY: Platform[] = ['PC'];

export const GAME_MODULES: Record<string, GameModule> = {
  英雄联盟: {
    tagline: '5v5 MOBA · 排位与灵活组排',
    defaultPlatform: 'PC',
    platforms: PC_ONLY,
    modes: ['排位', '灵活组排', '大乱斗', '克隆大作战', '云顶之弈'],
    ranks: ['黑铁', '青铜', '白银', '黄金', '铂金', '翡翠', '钻石', '大师', '宗师', '王者'],
    rankLabel: '段位',
    hint: '写清位置和段位，比如「打野，黄金一」。',
  },
  无畏契约: {
    tagline: '5v5 战术射击 · 竞技与快速',
    defaultPlatform: 'PC',
    platforms: PC_ONLY,
    modes: ['竞技', '快速', '团队死斗', '自定义'],
    ranks: ['黑铁', '青铜', '白银', '黄金', '铂金', '钻石', '超凡', '神话', '辐能'],
    rankLabel: '段位',
    hint: '写清段位和常用英雄，是否开麦影响很大。',
  },
  CS2: {
    tagline: '5v5 战术射击 · 竞技与休闲',
    defaultPlatform: 'PC',
    platforms: PC_ONLY,
    modes: ['竞技', '休闲', '死亡竞赛', '搭档'],
    ranks: [
      '白银',
      '黄金新星',
      '大师守卫',
      '杰出大师',
      '传奇之鹰',
      '大师之鹰',
      '全球精英',
    ],
    rankLabel: '段位',
    hint: '写清地图池和是否会报点，夜里打记得注明时间。',
  },
  'Dota 2': {
    tagline: '5v5 MOBA · 天梯与匹配',
    defaultPlatform: 'PC',
    platforms: PC_ONLY,
    modes: ['天梯', '普通匹配', '全英雄选择', '加速模式'],
    ranks: ['先锋', '卫士', '十字军', '执政官', '传奇', '万古', '神圣', '冠绝'],
    rankLabel: '段位',
    hint: '写清打几号位，队长模式要提前说。',
  },
  王者荣耀: {
    tagline: '5v5 MOBA · 排位与巅峰赛',
    defaultPlatform: 'MOBILE',
    platforms: ['MOBILE', 'SWITCH'],
    modes: ['排位', '巅峰赛', '战队赛', '大乱斗'],
    ranks: [
      '倔强青铜',
      '秩序白银',
      '荣耀黄金',
      '尊贵铂金',
      '永恒钻石',
      '至尊星耀',
      '最强王者',
      '荣耀王者',
    ],
    rankLabel: '段位',
    hint: '写清分路和常玩英雄，五排最好注明是否开麦。',
  },
  永劫无间: {
    tagline: '武侠吃鸡 · 单排与三排',
    defaultPlatform: 'PC',
    platforms: PC_ONLY,
    modes: ['排位', '三排', '单排', '无尽试炼'],
    ranks: ['青铜', '白银', '黄金', '铂金', '陨星', '蚀月', '坠日', '无间'],
    rankLabel: '段位',
    hint: '写清主玩角色和是否会振刀，三排要说明谁打前排。',
  },
  'APEX 英雄': {
    tagline: '三人小队战术竞技',
    defaultPlatform: 'PC',
    platforms: ['PC', 'PLAYSTATION', 'XBOX', 'SWITCH'],
    modes: ['排位', '休闲', '竞技场'],
    ranks: ['青铜', '白银', '黄金', '铂金', '钻石', '大师', '猎杀者'],
    rankLabel: '段位',
    hint: '写清主玩传奇和平台，主机端要注明手柄还是键鼠。',
  },
  原神: {
    tagline: '开放世界联机 · 深渊与周本',
    defaultPlatform: 'PC',
    platforms: ['PC', 'PLAYSTATION', 'MOBILE'],
    modes: ['联机', '深渊', '周本', '钓鱼'],
    ranks: ['世界等级 1', '世界等级 2', '世界等级 3', '世界等级 4', '世界等级 5', '世界等级 6', '世界等级 7', '世界等级 8'],
    rankLabel: '世界等级',
    hint: '写清世界等级和需要帮忙的内容，比如深渊 12 层。',
  },
  守望先锋: {
    tagline: '5v5 英雄射击 · 坦克 / 输出 / 辅助',
    defaultPlatform: 'PC',
    platforms: ['PC', 'PLAYSTATION', 'XBOX', 'SWITCH'],
    modes: ['竞技', '快速游戏', '街机', '角斗领域'],
    ranks: ['青铜', '白银', '黄金', '白金', '钻石', '大师', '宗师', '冠军'],
    rankLabel: '段位',
    hint: '写清位置（坦 / 输出 / 辅助）和段位，双排更容易配合。',
  },
  第五人格: {
    tagline: '1v4 非对称对抗 · 求生者 / 监管者',
    defaultPlatform: 'MOBILE',
    platforms: ['MOBILE', 'PC'],
    modes: ['排位', '匹配', '联合狩猎', '黑杰克'],
    ranks: ['一阶', '二阶', '三阶', '四阶', '五阶', '六阶', '七阶', '巅峰'],
    rankLabel: '段位',
    hint: '注明玩求生者还是监管者，以及常玩的角色。',
  },
  'Steam 小游戏': {
    tagline: '联机 / 派对 / 双人合作',
    defaultPlatform: 'PC',
    platforms: PC_ONLY,
    modes: ['胡闹厨房', 'Among Us', '双人成行', '星露谷物语', '恐鬼症', '泰拉瑞亚', '其他'],
    ranks: [],
    rankLabel: '段位',
    hint: '在模式里写具体游戏名，方便找到玩同一款的人。',
  },
};

/** 字典里没有预设的游戏（后台新增）走这套兜底，不阻塞发布 */
export const DEFAULT_GAME_MODULE: GameModule = {
  tagline: '找同好一起开一局',
  defaultPlatform: 'PC',
  platforms: ['PC', 'PLAYSTATION', 'XBOX', 'SWITCH', 'MOBILE'],
  modes: [],
  ranks: [],
  rankLabel: '段位',
  hint: '写清平台、时间和门槛，别人一眼就能判断合不合适。',
};

/** 用游戏名取预设；未知游戏或未选择时返回兜底配置 */
export function gameModuleOf(name: string | null | undefined): GameModule {
  if (!name) {
    return DEFAULT_GAME_MODULE;
  }
  return GAME_MODULES[name] ?? DEFAULT_GAME_MODULE;
}
