/**
 * 国内热门徒步路线攻略：人工整理的静态内容，不建表、不走接口。
 *
 * 这些数据只做行前参考与「按路线发局」的入口，不提供轨迹下载与导航；
 * 小地图与海拔剖面是 `map` 里的示意数据，前端用 SVG 画出来即可，
 * 不引入地图 SDK，也不把坐标当作真实经纬度使用。
 *
 * 新增路线时只需要往 `HIKING_ROUTES` 里追加一项，列表、详情页与首页入口
 * 都是从这份数据派生出来的。数值统一用「约」，并在页面上注明以景区公告为准。
 */
export const HIKING_DIFFICULTIES = ['EASY', 'MODERATE', 'HARD'] as const;

export type HikingDifficulty = (typeof HIKING_DIFFICULTIES)[number];

export const HIKING_DIFFICULTY_LABELS: Record<HikingDifficulty, string> = {
  EASY: '轻松',
  MODERATE: '进阶',
  HARD: '硬核',
};

/** 携带物品按用途分组，详情页按组渲染成清单 */
export interface HikingGearGroup {
  label: string;
  items: string[];
}

/** 行程节点：`day` 是展示用的「D1 / 单日」，不参与日期计算 */
export interface HikingStage {
  day: string;
  title: string;
  detail: string;
  /** 当天里程，0 表示不单独计（如机动日） */
  distanceKm: number;
}

/**
 * 示意地图上的标注点：坐标系固定为 320 × 180，与 `path` 同一个 viewBox。
 * kind 只影响前端画点样式（起点 / 营地 / 水点 / 垭口 / 终点）。
 */
export interface HikingMapPoint {
  x: number;
  y: number;
  label: string;
  kind: 'start' | 'camp' | 'water' | 'peak' | 'end';
}

export interface HikingElevationPoint {
  label: string;
  meters: number;
}

export interface HikingRoute {
  slug: string;
  name: string;
  /** 发布旅行局时预填的目的地短名 */
  destination: string;
  /** 展示用地区：省份 · 具体区域 */
  region: string;
  /** 列表筛选用的一级地区 */
  province: string;
  summary: string;
  difficulty: HikingDifficulty;
  /** 推荐时长，展示用（例如「2 天 1 夜」） */
  duration: string;
  days: number;
  distanceKm: number;
  ascentM: number;
  /** 海拔范围文案，例如「2,300–3,800 m」 */
  altitude: string;
  bestSeason: string;
  startPoint: string;
  /** 参考人均花费，含交通与住宿的粗略区间 */
  budgetHint: string;
  highlights: string[];
  gear: HikingGearGroup[];
  stages: HikingStage[];
  tips: string[];
  map: {
    /** SVG path，viewBox 0 0 320 180 */
    path: string;
    points: HikingMapPoint[];
    elevation: HikingElevationPoint[];
  };
}

export const HIKING_ROUTES: HikingRoute[] = [
  {
    slug: 'yubeng-shenpu',
    name: '雨崩神瀑线',
    destination: '雨崩村',
    region: '云南 · 迪庆',
    province: '云南',
    summary:
      '从西当温泉进雨崩村，第二天往返神瀑，再沿尼农峡谷出山。雪山、原始森林和藏村一次走完。',
    difficulty: 'MODERATE',
    duration: '3 天 2 夜',
    days: 3,
    distanceKm: 38,
    ascentM: 1700,
    altitude: '2,050–3,700 m',
    bestSeason: '4–6 月、9–11 月',
    startPoint: '西当温泉停车场',
    budgetHint: '人均 ¥1,200–1,800（含进出村越野车与两晚住宿）',
    highlights: ['神瀑', '冰湖', '下雨崩村', '日照金山', '尼农峡谷'],
    gear: [
      {
        label: '鞋服',
        items: ['中帮徒步鞋', '速干衣裤', '抓绒或薄羽绒', '冲锋衣', '雨衣'],
      },
      {
        label: '装备',
        items: ['30L 背包', '登山杖', '头灯', '保温杯', '充电宝'],
      },
      {
        label: '补给',
        items: ['1.5–2L 水', '两天路餐', '能量胶', '坚果', '电解质片'],
      },
      {
        label: '证件与药品',
        items: ['身份证', '防晒霜', '墨镜', '创可贴', '肠胃药', '高反药（遵医嘱）'],
      },
    ],
    stages: [
      {
        day: 'D1',
        title: '西当温泉 → 雨崩上村',
        detail: '沿机耕道上行，翻过南争垭口后下到村里；也可坐越野车进村，把体力留给后面两天。',
        distanceKm: 12,
      },
      {
        day: 'D2',
        title: '雨崩上村 → 神瀑 → 雨崩下村',
        detail: '穿过原始森林到神瀑，原路返回后住下雨崩；雨季瀑布水量大，别在瀑底久留。',
        distanceKm: 12,
      },
      {
        day: 'D3',
        title: '下雨崩 → 尼农峡谷 → 尼农桥',
        detail: '沿峡谷一路下撤，部分路段临崖且碎石多，雨天放慢速度。',
        distanceKm: 14,
      },
    ],
    tips: [
      '旺季村里床位紧张，出发前先订好住宿。',
      '海拔从 2,000 米升到 3,700 米，第一天不要走太猛。',
      '雨季注意塌方与落石，出发前问清路况再进山。',
      '村里补给有限，路餐和现金都多带一点。',
    ],
    map: {
      path: 'M 30 148 C 52 144 62 120 86 112 S 118 118 136 98 S 162 62 192 70 S 236 54 288 38',
      points: [
        { x: 30, y: 148, label: '西当温泉', kind: 'start' },
        { x: 86, y: 112, label: '雨崩上村', kind: 'camp' },
        { x: 150, y: 82, label: '神瀑', kind: 'water' },
        { x: 288, y: 38, label: '尼农桥', kind: 'end' },
      ],
      elevation: [
        { label: '西当温泉', meters: 2230 },
        { label: '南争垭口', meters: 3700 },
        { label: '雨崩上村', meters: 3150 },
        { label: '神瀑', meters: 3650 },
        { label: '雨崩下村', meters: 3050 },
        { label: '尼农桥', meters: 2050 },
      ],
    },
  },
  {
    slug: 'wugongshan-jinding',
    name: '武功山金顶穿越',
    destination: '武功山',
    region: '江西 · 萍乡',
    province: '江西',
    summary:
      '从龙山村爬上山脊，两天穿过发云界、绝望坡到金顶。高山草甸、云海和日出是这条路线的招牌。',
    difficulty: 'MODERATE',
    duration: '2 天 1 夜',
    days: 2,
    distanceKm: 22,
    ascentM: 1300,
    altitude: '500–1,918 m',
    bestSeason: '5–6 月、9–10 月',
    startPoint: '萍乡龙山村',
    budgetHint: '人均 ¥500–800（含山上床位与下山交通）',
    highlights: ['金顶日出', '发云界', '绝望坡', '高山草甸', '云海'],
    gear: [
      {
        label: '鞋服',
        items: ['防滑徒步鞋', '速干衣裤', '抓绒', '冲锋衣', '雨衣'],
      },
      {
        label: '装备',
        items: ['35L 背包', '登山杖', '头灯', '充电宝', '睡袋内胆（住床位）'],
      },
      {
        label: '补给',
        items: ['2L 水', '路餐', '能量棒', '电解质片'],
      },
      {
        label: '证件与药品',
        items: ['身份证', '防晒霜', '驱蚊液', '创可贴', '常用药'],
      },
    ],
    stages: [
      {
        day: 'D1',
        title: '龙山村 → 发云界',
        detail: '持续爬升进入草甸山脊，下午在发云界附近住下，傍晚看云海。',
        distanceKm: 12,
      },
      {
        day: 'D2',
        title: '发云界 → 绝望坡 → 金顶 → 景区大门',
        detail: '山脊起伏多，绝望坡一段较陡；金顶之后可坐索道或走台阶下山。',
        distanceKm: 10,
      },
    ],
    tips: [
      '山上床位和餐饮都有限，旺季务必提前预订。',
      '山脊无遮挡，雷雨天不要停留，尽快下撤。',
      '冬季路面结冰，需要冰爪并评估经验。',
      '垃圾带下山，草甸生态恢复很慢。',
    ],
    map: {
      path: 'M 28 152 C 70 140 74 108 108 98 S 150 108 176 78 S 214 52 248 44 S 280 38 296 30',
      points: [
        { x: 28, y: 152, label: '龙山村', kind: 'start' },
        { x: 120, y: 102, label: '发云界', kind: 'camp' },
        { x: 176, y: 78, label: '绝望坡', kind: 'peak' },
        { x: 248, y: 44, label: '金顶', kind: 'peak' },
        { x: 296, y: 30, label: '景区大门', kind: 'end' },
      ],
      elevation: [
        { label: '龙山村', meters: 600 },
        { label: '发云界', meters: 1600 },
        { label: '绝望坡', meters: 1500 },
        { label: '金顶', meters: 1918 },
        { label: '景区大门', meters: 500 },
      ],
    },
  },
  {
    slug: 'huihang-gudao',
    name: '徽杭古道',
    destination: '徽杭古道',
    region: '浙江 · 临安 / 安徽 · 绩溪',
    province: '浙江',
    summary:
      '从安徽绩溪伏岭走到浙江临安浙川，青石板、峡谷和徽派村落连成一条线，适合第一次走长线。',
    difficulty: 'EASY',
    duration: '1 天',
    days: 1,
    distanceKm: 20,
    ascentM: 600,
    altitude: '320–1,050 m',
    bestSeason: '3–5 月、10–11 月',
    startPoint: '绩溪伏岭镇江南村',
    budgetHint: '人均 ¥200–400（含两端接驳与门票）',
    highlights: ['江南第一关', '逍遥河', '蓝天凹', '徽派村落'],
    gear: [
      {
        label: '鞋服',
        items: ['轻量徒步鞋或越野跑鞋', '速干衣裤', '薄外套', '雨衣'],
      },
      {
        label: '装备',
        items: ['20L 背包', '登山杖（可选）', '充电宝'],
      },
      {
        label: '补给',
        items: ['1–1.5L 水', '一顿路餐', '能量零食'],
      },
      {
        label: '证件与药品',
        items: ['身份证', '防晒霜', '创可贴', '常用药'],
      },
    ],
    stages: [
      {
        day: '单日',
        title: '伏岭 → 江南第一关 → 蓝天凹 → 浙川',
        detail: '前段台阶多，中段沿峡谷缓行，蓝天凹之后以下坡为主；可提前约好两端接驳车。',
        distanceKm: 20,
      },
    ],
    tips: [
      '雨后青石板很滑，鞋底抓地力比轻便更重要。',
      '正穿、反穿都可以，提前确认两端班车时间。',
      '古道内有村民补给点，但价格偏高，水还是自己带够。',
      '部分路段与村民生活区重叠，不要打扰住户。',
    ],
    map: {
      path: 'M 26 140 C 60 132 76 108 112 100 S 164 108 196 86 S 244 62 294 48',
      points: [
        { x: 26, y: 140, label: '伏岭', kind: 'start' },
        { x: 112, y: 100, label: '江南第一关', kind: 'peak' },
        { x: 196, y: 86, label: '蓝天凹', kind: 'camp' },
        { x: 294, y: 48, label: '浙川', kind: 'end' },
      ],
      elevation: [
        { label: '伏岭', meters: 320 },
        { label: '江南第一关', meters: 600 },
        { label: '蓝天凹', meters: 1050 },
        { label: '浙川', meters: 380 },
      ],
    },
  },
  {
    slug: 'tiger-leaping-gorge',
    name: '虎跳峡高路',
    destination: '虎跳峡',
    region: '云南 · 香格里拉',
    province: '云南',
    summary:
      '沿金沙江上方的高路走两天，一侧是玉龙雪山，另一侧是哈巴雪山。临崖路段多，但视野是国内独一档。',
    difficulty: 'MODERATE',
    duration: '2 天 1 夜',
    days: 2,
    distanceKm: 22,
    ascentM: 900,
    altitude: '1,700–2,400 m',
    bestSeason: '3–5 月、9–11 月',
    startPoint: '虎跳峡镇桥头',
    budgetHint: '人均 ¥600–900（含客栈与中虎跳门票）',
    highlights: ['28 道拐', 'Halfway 客栈', '中虎跳', '玉龙雪山', '金沙江'],
    gear: [
      {
        label: '鞋服',
        items: ['防滑徒步鞋', '速干衣裤', '薄外套', '雨衣'],
      },
      {
        label: '装备',
        items: ['25L 背包', '登山杖', '头灯', '充电宝'],
      },
      {
        label: '补给',
        items: ['1.5–2L 水', '路餐', '能量零食'],
      },
      {
        label: '证件与药品',
        items: ['身份证', '防晒霜', '创可贴', '常用药'],
      },
    ],
    stages: [
      {
        day: 'D1',
        title: '桥头 → 28 道拐 → Halfway',
        detail: '持续爬升到高路，之后沿山腰横切；下午在 Halfway 一带住下，看玉龙雪山日落。',
        distanceKm: 11,
      },
      {
        day: 'D2',
        title: 'Halfway → 中虎跳 → Tina’s',
        detail: '先走一段崖边高路，再下到中虎跳江边；下江步道陡且需另付村民维护费。',
        distanceKm: 11,
      },
    ],
    tips: [
      '部分路段临崖且没有护栏，恐高或雨天建议改走低路。',
      '落石区不要停留拍照，快速通过。',
      '中虎跳下江步道单独收费，往返约 1–2 小时。',
      '雨季（7–8 月）落石和塌方风险明显上升。',
    ],
    map: {
      path: 'M 32 150 C 58 130 72 96 104 92 S 142 104 168 76 S 212 46 250 52 S 282 38 296 34',
      points: [
        { x: 32, y: 150, label: '桥头', kind: 'start' },
        { x: 104, y: 92, label: '28 道拐', kind: 'peak' },
        { x: 168, y: 76, label: 'Halfway', kind: 'camp' },
        { x: 250, y: 52, label: '中虎跳', kind: 'water' },
        { x: 296, y: 34, label: '大具', kind: 'end' },
      ],
      elevation: [
        { label: '桥头', meters: 1800 },
        { label: '28 道拐', meters: 2300 },
        { label: 'Halfway', meters: 2400 },
        { label: '中虎跳', meters: 1900 },
        { label: '大具', meters: 1700 },
      ],
    },
  },
  {
    slug: 'siguniang-changping',
    name: '四姑娘山长坪沟',
    destination: '长坪沟',
    region: '四川 · 阿坝',
    province: '四川',
    summary:
      '从喇嘛寺进沟，穿过原始森林到木骡子，在幺妹峰脚下住一晚。海拔不低，但坡度比想象中温和。',
    difficulty: 'MODERATE',
    duration: '2 天 1 夜',
    days: 2,
    distanceKm: 24,
    ascentM: 700,
    altitude: '3,200–3,800 m',
    bestSeason: '5–6 月、9–10 月',
    startPoint: '长坪沟游客中心',
    budgetHint: '人均 ¥800–1,200（含门票、观光车与沟内住宿）',
    highlights: ['木骡子', '幺妹峰', '枯树滩', '原始森林'],
    gear: [
      {
        label: '鞋服',
        items: ['中帮徒步鞋', '速干衣裤', '抓绒或薄羽绒', '冲锋衣', '雨衣'],
      },
      {
        label: '装备',
        items: ['30–40L 背包', '登山杖', '头灯', '保温杯', '充电宝'],
      },
      {
        label: '补给',
        items: ['1.5–2L 水', '两天路餐', '能量胶', '电解质片'],
      },
      {
        label: '证件与药品',
        items: ['身份证', '防晒霜', '墨镜', '高反药（遵医嘱）', '常用药'],
      },
    ],
    stages: [
      {
        day: 'D1',
        title: '喇嘛寺 → 枯树滩 → 木骡子',
        detail: '前半段沿栈道，后半段进入原始森林；木骡子有客栈和营地，提前确认营业情况。',
        distanceKm: 12,
      },
      {
        day: 'D2',
        title: '木骡子 → 喇嘛寺',
        detail: '原路返回，下坡为主；时间充裕可以多留一小时拍幺妹峰。',
        distanceKm: 12,
      },
    ],
    tips: [
      '需要购买景区门票与观光车票，沟内住宿单独预订。',
      '海拔 3,200 米起步，前一晚住在四姑娘山镇适应。',
      '沟内信号弱，提前把行程告诉家人或队友。',
      '露营需按景区规定报备，不要在林区用明火。',
    ],
    map: {
      path: 'M 28 146 C 66 138 78 112 112 106 S 154 116 186 92 S 234 68 288 54',
      points: [
        { x: 28, y: 146, label: '喇嘛寺', kind: 'start' },
        { x: 112, y: 106, label: '枯树滩', kind: 'water' },
        { x: 186, y: 92, label: '木骡子', kind: 'camp' },
        { x: 288, y: 54, label: '幺妹峰', kind: 'peak' },
      ],
      elevation: [
        { label: '喇嘛寺', meters: 3200 },
        { label: '枯树滩', meters: 3350 },
        { label: '木骡子', meters: 3760 },
        { label: '沟尾', meters: 3900 },
      ],
    },
  },
  {
    slug: 'huangshan-guangmingding',
    name: '黄山光明顶环线',
    destination: '黄山',
    region: '安徽 · 黄山',
    province: '安徽',
    summary:
      '云谷寺上山，经始信峰、光明顶、西海大峡谷，再从玉屏楼下山。两天刚好把主要景点串成一圈。',
    difficulty: 'MODERATE',
    duration: '2 天 1 夜',
    days: 2,
    distanceKm: 16,
    ascentM: 1500,
    altitude: '890–1,864 m',
    bestSeason: '4–5 月、9–11 月',
    startPoint: '云谷寺换乘中心',
    budgetHint: '人均 ¥800–1,500（山上住宿占比最大）',
    highlights: ['始信峰', '光明顶', '西海大峡谷', '迎客松', '云海'],
    gear: [
      {
        label: '鞋服',
        items: ['防滑徒步鞋', '速干衣裤', '薄外套', '雨衣'],
      },
      {
        label: '装备',
        items: ['25L 背包', '登山杖', '护膝', '头灯', '充电宝'],
      },
      {
        label: '补给',
        items: ['1–1.5L 水', '路餐', '能量零食'],
      },
      {
        label: '证件与药品',
        items: ['身份证', '防晒霜', '创可贴', '常用药'],
      },
    ],
    stages: [
      {
        day: 'D1',
        title: '云谷寺 → 始信峰 → 光明顶',
        detail: '台阶持续爬升，始信峰一段视野最好；傍晚在光明顶附近看日落。',
        distanceKm: 8,
      },
      {
        day: 'D2',
        title: '光明顶 → 西海大峡谷 → 玉屏楼 → 慈光阁',
        detail: '西海大峡谷步道较陡，冬季可能关闭；玉屏楼之后可坐索道下山。',
        distanceKm: 8,
      },
    ],
    tips: [
      '山上住宿贵且紧张，至少提前一周预订。',
      '周末与节假日索道排队时间长，尽量早出门。',
      '雨天石阶湿滑，下坡用登山杖和护膝。',
      '西海大峡谷步道有季节性关闭，出发前查景区公告。',
    ],
    map: {
      path: 'M 34 150 C 60 128 82 112 104 96 S 140 88 168 70 S 214 52 246 58 S 282 44 300 36',
      points: [
        { x: 34, y: 150, label: '云谷寺', kind: 'start' },
        { x: 104, y: 96, label: '始信峰', kind: 'peak' },
        { x: 168, y: 70, label: '光明顶', kind: 'camp' },
        { x: 246, y: 58, label: '西海大峡谷', kind: 'water' },
        { x: 300, y: 36, label: '玉屏楼', kind: 'end' },
      ],
      elevation: [
        { label: '云谷寺', meters: 890 },
        { label: '始信峰', meters: 1680 },
        { label: '光明顶', meters: 1860 },
        { label: '西海大峡谷', meters: 1500 },
        { label: '玉屏楼', meters: 1680 },
      ],
    },
  },
  {
    slug: 'yading-long-line',
    name: '稻城亚丁长线',
    destination: '稻城亚丁',
    region: '四川 · 甘孜',
    province: '四川',
    summary:
      '从扎灌崩进沟，经洛绒牛场上牛奶海、五色海。全程在 4,000 米以上，风景顶级，高反风险也顶级。',
    difficulty: 'HARD',
    duration: '1 天（建议留 2 天适应）',
    days: 1,
    distanceKm: 12,
    ascentM: 700,
    altitude: '3,900–4,700 m',
    bestSeason: '5–6 月、9–10 月',
    startPoint: '扎灌崩',
    budgetHint: '人均 ¥1,000–1,500（含门票、观光车与住宿）',
    highlights: ['牛奶海', '五色海', '仙乃日', '洛绒牛场', '央迈勇'],
    gear: [
      {
        label: '鞋服',
        items: ['徒步鞋', '速干衣裤', '抓绒或薄羽绒', '冲锋衣', '雨衣'],
      },
      {
        label: '装备',
        items: ['25L 背包', '登山杖', '头灯', '保温杯', '充电宝', '氧气瓶（按需）'],
      },
      {
        label: '补给',
        items: ['1.5–2L 水', '路餐', '能量胶', '电解质片', '糖'],
      },
      {
        label: '证件与药品',
        items: ['身份证', '防晒霜', '墨镜', '高反药（遵医嘱）', '常用药'],
      },
    ],
    stages: [
      {
        day: '单日',
        title: '扎灌崩 → 冲古寺 → 洛绒牛场 → 牛奶海 → 五色海',
        detail: '前段坐观光车到扎灌崩，洛绒牛场之后开始持续爬升；下午天气变化快，尽量早出发。',
        distanceKm: 12,
      },
    ],
    tips: [
      '提前一晚住在香格里拉镇（日瓦）适应海拔，不要当天从成都直接上山。',
      '马帮通常只到洛绒牛场，最后一段只能自己走。',
      '高反明显时立即下撤，不要硬撑到五色海。',
      '景区 16:00 后逐步清场，算好返程时间。',
    ],
    map: {
      path: 'M 30 150 C 58 136 70 116 104 110 S 150 116 184 90 S 236 62 294 44',
      points: [
        { x: 30, y: 150, label: '扎灌崩', kind: 'start' },
        { x: 104, y: 110, label: '冲古寺', kind: 'camp' },
        { x: 184, y: 90, label: '洛绒牛场', kind: 'camp' },
        { x: 236, y: 62, label: '牛奶海', kind: 'water' },
        { x: 294, y: 44, label: '五色海', kind: 'end' },
      ],
      elevation: [
        { label: '扎灌崩', meters: 4100 },
        { label: '冲古寺', meters: 3900 },
        { label: '洛绒牛场', meters: 4180 },
        { label: '牛奶海', meters: 4600 },
        { label: '五色海', meters: 4700 },
      ],
    },
  },
  {
    slug: 'huashan-north-west',
    name: '华山北峰—西峰',
    destination: '华山',
    region: '陕西 · 渭南',
    province: '陕西',
    summary:
      '从玉泉院走「自古华山一条路」上北峰，再经擦耳崖、苍龙岭到西峰，最后坐索道下山。台阶多，爬升扎实。',
    difficulty: 'HARD',
    duration: '1 天',
    days: 1,
    distanceKm: 14,
    ascentM: 1600,
    altitude: '400–2,087 m',
    bestSeason: '3–5 月、9–11 月',
    startPoint: '玉泉院',
    budgetHint: '人均 ¥400–700（含门票与西峰索道）',
    highlights: ['千尺幢', '百尺峡', '苍龙岭', '西峰', '长空栈道'],
    gear: [
      {
        label: '鞋服',
        items: ['防滑徒步鞋', '速干衣裤', '薄外套', '手套（抓铁链）', '雨衣'],
      },
      {
        label: '装备',
        items: ['20–25L 背包', '护膝', '头灯（夜爬）', '充电宝'],
      },
      {
        label: '补给',
        items: ['1.5L 水', '路餐', '能量零食'],
      },
      {
        label: '证件与药品',
        items: ['身份证', '防晒霜', '创可贴', '常用药'],
      },
    ],
    stages: [
      {
        day: '单日',
        title: '玉泉院 → 北峰 → 苍龙岭 → 西峰',
        detail: '前段持续台阶爬升，北峰之后沿山脊走；西峰坐索道下山，避免夜间走台阶。',
        distanceKm: 14,
      },
    ],
    tips: [
      '夜爬看日出要戴头灯，台阶窄且陡，结伴走。',
      '长空栈道、鹞子翻身单独收费且排队，恐高慎选。',
      '雨雪天部分路段关闭，手套和防滑鞋底很关键。',
      '下山索道末班时间随季节变化，进山前先确认。',
    ],
    map: {
      path: 'M 32 150 C 64 134 74 104 104 96 S 146 104 174 74 S 214 50 248 54 S 284 40 300 34',
      points: [
        { x: 32, y: 150, label: '玉泉院', kind: 'start' },
        { x: 104, y: 96, label: '北峰', kind: 'peak' },
        { x: 174, y: 74, label: '苍龙岭', kind: 'peak' },
        { x: 248, y: 54, label: '西峰', kind: 'camp' },
        { x: 300, y: 34, label: '西峰索道', kind: 'end' },
      ],
      elevation: [
        { label: '玉泉院', meters: 400 },
        { label: '北峰', meters: 1614 },
        { label: '苍龙岭', meters: 1700 },
        { label: '西峰', meters: 2087 },
      ],
    },
  },
];

/** 列表筛选用的地区顺序，按路线在数据里的出现顺序去重 */
export const HIKING_PROVINCES: string[] = Array.from(
  new Set(HIKING_ROUTES.map((route) => route.province)),
);

export function hikingRouteOf(slug: string): HikingRoute | undefined {
  return HIKING_ROUTES.find((route) => route.slug === slug);
}

/**
 * 发布旅行局时按目的地找攻略：目的地可能写「雨崩」「雨崩村」或「云南雨崩」，
 * 三种写法都尽量命中；空字符串返回空数组，交给调用方显示通用入口。
 */
export function hikingRoutesMatching(keyword: string | null | undefined): HikingRoute[] {
  const query = keyword?.trim();
  if (!query) {
    return [];
  }
  return HIKING_ROUTES.filter((route) =>
    [route.name, route.destination, route.region, route.province, route.startPoint].some(
      (value) =>
        value.includes(query) ||
        query.includes(value) ||
        query.includes(route.destination),
    ),
  );
}

export interface HikingRouteFilter {
  difficulty?: HikingDifficulty;
  province?: string;
}

export function filterHikingRoutes(filter: HikingRouteFilter = {}): HikingRoute[] {
  return HIKING_ROUTES.filter((route) => {
    if (filter.difficulty && route.difficulty !== filter.difficulty) {
      return false;
    }
    if (filter.province && route.province !== filter.province) {
      return false;
    }
    return true;
  });
}
