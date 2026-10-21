import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const GAMES: { name: string; sortOrder: number }[] = [
  { name: '英雄联盟', sortOrder: 10 },
  { name: '无畏契约', sortOrder: 20 },
  { name: 'CS2', sortOrder: 30 },
  { name: 'Dota 2', sortOrder: 40 },
  { name: '王者荣耀', sortOrder: 50 },
  { name: '永劫无间', sortOrder: 60 },
  { name: 'APEX 英雄', sortOrder: 70 },
  { name: '原神', sortOrder: 80 },
  { name: '守望先锋', sortOrder: 90 },
  { name: '第五人格', sortOrder: 100 },
  { name: 'Steam 小游戏', sortOrder: 110 },
];

const DEMO_EMAIL = 'demo@allisteam.local';
const DEMO_NICKNAME = '演示账号';

type Platform = 'PC' | 'PLAYSTATION' | 'XBOX' | 'SWITCH' | 'MOBILE';
type ConcertSeat = 'STAND' | 'INNER' | 'UNDECIDED';
type TravelTransport = 'PLANE' | 'TRAIN' | 'SELF_DRIVE' | 'BUS' | 'ANY';
type TravelIntensity = 'RELAXED' | 'MODERATE' | 'INTENSE';

interface DemoPost {
  title: string;
  description: string;
  game: string;
  platform: Platform;
  mode: string;
  rankMin?: string;
  rankMax?: string;
  capacity: number;
  needVoice: boolean;
  hoursFromNow: number;
  city?: string;
}

interface DemoConcert {
  title: string;
  description: string;
  artist: string;
  tourName?: string;
  venue: string;
  seatType: ConcertSeat;
  hasTicket: boolean;
  ticketNote?: string;
  capacity: number;
  hoursFromNow: number;
  city: string;
}

interface DemoTrip {
  title: string;
  description: string;
  destination: string;
  budgetMin?: number;
  budgetMax?: number;
  transport: TravelTransport;
  intensity: TravelIntensity;
  shareRoom: boolean;
  capacity: number;
  hoursFromNow: number;
  days: number;
  city: string;
}

const DEMO_POSTS: DemoPost[] = [
  {
    title: '今晚八点无畏契约排位缺一',
    description: '钻石二，打竞技，要求能开麦沟通，稳定两小时，心态好不喷人。',
    game: '无畏契约',
    platform: 'PC',
    mode: '竞技',
    rankMin: '钻石',
    rankMax: '不朽',
    capacity: 5,
    needVoice: true,
    hoursFromNow: 6,
    city: '成都',
  },
  {
    title: '英雄联盟灵活组排找野辅',
    description: '现在黄金一，想打灵活组排上分，缺打野和辅助，会语音就行。',
    game: '英雄联盟',
    platform: 'PC',
    mode: '灵活组排',
    rankMin: '黄金',
    rankMax: '铂金',
    capacity: 5,
    needVoice: true,
    hoursFromNow: 10,
  },
  {
    title: 'CS2 五排冲段，晚上九点开',
    description: '需要会报点、会拉枪的队友，主打 Mirage 和 Inferno，拒绝挂机。',
    game: 'CS2',
    platform: 'PC',
    mode: '竞技',
    rankMin: '黄金新星',
    rankMax: '大师守卫',
    capacity: 5,
    needVoice: true,
    hoursFromNow: 8,
  },
  {
    title: '王者荣耀三排缺个射手',
    description: '星耀段位，缺一个稳定射手，可语音，晚八点半到十一点。',
    game: '王者荣耀',
    platform: 'MOBILE',
    mode: '排位',
    rankMin: '星耀',
    rankMax: '王者',
    capacity: 3,
    needVoice: true,
    hoursFromNow: 7,
    city: '重庆',
  },
  {
    title: '永劫无间三人组队刷分',
    description: '会振刀、会救人，主打排位，缺一个能打前排的。',
    game: '永劫无间',
    platform: 'PC',
    mode: '排位',
    capacity: 3,
    needVoice: true,
    hoursFromNow: 12,
  },
  {
    title: 'APEX 休闲三排，新手也行',
    description: '不追求上分，边打边聊，欢迎刚入坑的朋友，打两三个小时。',
    game: 'APEX 英雄',
    platform: 'PC',
    mode: '休闲',
    capacity: 3,
    needVoice: false,
    hoursFromNow: 20,
  },
  {
    title: 'Dota2 天梯双排找中单',
    description: '传奇段位，主玩三号位，找一个会带节奏的中单。',
    game: 'Dota 2',
    platform: 'PC',
    mode: '天梯',
    rankMin: '传奇',
    capacity: 2,
    needVoice: true,
    hoursFromNow: 26,
  },
  {
    title: '主机端无畏契约求队友',
    description: 'PlayStation 端，手柄玩家，找同样用手柄的朋友一起打。',
    game: '无畏契约',
    platform: 'PLAYSTATION',
    mode: '竞技',
    capacity: 5,
    needVoice: true,
    hoursFromNow: 30,
  },
  {
    title: '周末下午英雄联盟大乱斗',
    description: '纯娱乐，随机英雄，打一下午，不骂人不投降。',
    game: '英雄联盟',
    platform: 'PC',
    mode: '大乱斗',
    capacity: 5,
    needVoice: false,
    hoursFromNow: 40,
  },
  {
    title: '原神联机打深渊，缺两个',
    description: '世界等级 8，帮忙打深渊和刷周本，随便聊。',
    game: '原神',
    platform: 'PC',
    mode: '联机',
    capacity: 4,
    needVoice: false,
    hoursFromNow: 50,
  },
  {
    title: 'Switch 端王者荣耀缺双排',
    description: '手感和手机不太一样，想找同样用 Switch 的玩家练练。',
    game: '王者荣耀',
    platform: 'SWITCH',
    mode: '排位',
    capacity: 2,
    needVoice: false,
    hoursFromNow: 55,
  },
  {
    title: '凌晨 CS2 上分车队',
    description: '夜猫子车队，凌晨一点开打，主打配合和道具。',
    game: 'CS2',
    platform: 'PC',
    mode: '竞技',
    capacity: 5,
    needVoice: true,
    hoursFromNow: 15,
  },
  {
    title: '无畏契约新手教学局',
    description: '刚玩两周，想找愿意带新人的朋友，可以一起练枪。',
    game: '无畏契约',
    platform: 'PC',
    mode: '练习',
    capacity: 3,
    needVoice: true,
    hoursFromNow: 34,
  },
  {
    title: '永劫无间三排冲分，晚九点',
    description: '需要会玩顾清寒或者岳山，打三排上分。',
    game: '永劫无间',
    platform: 'PC',
    mode: '排位',
    capacity: 3,
    needVoice: true,
    hoursFromNow: 9,
  },
  {
    title: '英雄联盟克隆大作战',
    description: '想玩克隆模式，凑五个人，纯娱乐。',
    game: '英雄联盟',
    platform: 'PC',
    mode: '克隆大作战',
    capacity: 5,
    needVoice: false,
    hoursFromNow: 44,
  },
  {
    title: 'Xbox 端 APEX 三排',
    description: '主机端，找两个同样用手柄打 APEX 的，休闲为主。',
    game: 'APEX 英雄',
    platform: 'XBOX',
    mode: '休闲',
    capacity: 3,
    needVoice: false,
    hoursFromNow: 60,
  },
  {
    title: 'Dota2 周末开黑五人局',
    description: '不ban不选随便玩，周末下午两点开始，能打三局。',
    game: 'Dota 2',
    platform: 'PC',
    mode: '普通匹配',
    capacity: 5,
    needVoice: true,
    hoursFromNow: 48,
  },
  {
    title: '王者荣耀五排打战队赛',
    description: '固定队缺一个辅助，会玩张飞或者蔡文姬优先。',
    game: '王者荣耀',
    platform: 'MOBILE',
    mode: '战队赛',
    capacity: 5,
    needVoice: true,
    hoursFromNow: 22,
    city: '成都',
  },
  {
    title: '无畏契约双排找固定搭档',
    description: '长期一起打，铂金段位，时间比较固定，晚上八点后。',
    game: '无畏契约',
    platform: 'PC',
    mode: '竞技',
    rankMin: '铂金',
    capacity: 2,
    needVoice: true,
    hoursFromNow: 28,
  },
  {
    title: 'CS2 休闲局，随便来',
    description: '不看重输赢，主要想找人一起玩，打两小时就够了。',
    game: 'CS2',
    platform: 'PC',
    mode: '休闲',
    capacity: 5,
    needVoice: false,
    hoursFromNow: 70,
  },
  {
    title: '守望先锋双排上分，奶妈缺一人',
    description: '白金段位，主打辅助位，需要一个能打坦的搭档，能开麦报点。',
    game: '守望先锋',
    platform: 'PC',
    mode: '竞技',
    rankMin: '白金',
    rankMax: '钻石',
    capacity: 2,
    needVoice: true,
    hoursFromNow: 5,
    city: '上海',
  },
  {
    title: '守望先锋快速游戏，练新英雄',
    description: '不打竞技，随便玩玩练英雄池，输赢无所谓，聊得来就行。',
    game: '守望先锋',
    platform: 'PC',
    mode: '快速游戏',
    capacity: 5,
    needVoice: true,
    hoursFromNow: 18,
  },
  {
    title: '第五人格四人开黑，缺调香师',
    description: '监管者排位，缺一个会玩调香师或者佣兵的，能语音沟通救人位。',
    game: '第五人格',
    platform: 'MOBILE',
    mode: '排位',
    rankMin: '四阶',
    rankMax: '六阶',
    capacity: 4,
    needVoice: true,
    hoursFromNow: 6,
    city: '杭州',
  },
  {
    title: '第五人格萌新一起玩',
    description: '刚玩一个月，还在熟悉地图，想找同样在学的人一起摸索。',
    game: '第五人格',
    platform: 'MOBILE',
    mode: '匹配',
    capacity: 4,
    needVoice: false,
    hoursFromNow: 32,
  },
  {
    title: 'Steam 小游戏联机：胡闹厨房',
    description: '两个人玩到四个人玩都行，主打一个手忙脚乱，不骂人不甩锅。',
    game: 'Steam 小游戏',
    platform: 'PC',
    mode: '胡闹厨房',
    capacity: 4,
    needVoice: true,
    hoursFromNow: 11,
    city: '深圳',
  },
  {
    title: 'Steam 小游戏：Among Us 八人局',
    description: '凑满八个人开一局，语音开黑，新手也欢迎，别急着投人。',
    game: 'Steam 小游戏',
    platform: 'PC',
    mode: 'Among Us',
    capacity: 8,
    needVoice: true,
    hoursFromNow: 24,
  },
  {
    title: 'Steam 小游戏：双人成行找搭档',
    description: '通关过一遍了，想再玩一次高难度，需要一个有耐心的搭档。',
    game: 'Steam 小游戏',
    platform: 'PC',
    mode: '双人成行',
    capacity: 2,
    needVoice: true,
    hoursFromNow: 38,
  },
];

const DEMO_CONCERTS: DemoConcert[] = [
  {
    title: '陈粒「洄游」上海站找同行',
    description:
      '内场看台都可以，一个人去看有点闷。散场后想一起走回地铁站，安全第一，不喝酒也可以。',
    artist: '陈粒',
    tourName: '洄游',
    venue: '梅赛德斯-奔驰文化中心',
    seatType: 'INNER',
    hasTicket: true,
    ticketNote: '内场 B 区，票已自备',
    capacity: 4,
    hoursFromNow: 52,
    city: '上海',
  },
  {
    title: '五月天上海站看台，散场拼车',
    description: '看台 3 区，票已买好。散场不好打车，想找两三个人一起拼车到市区。',
    artist: '五月天',
    tourName: '回到那一天',
    venue: '上海体育场',
    seatType: 'STAND',
    hasTicket: true,
    ticketNote: '看台 3 区连座两张',
    capacity: 5,
    hoursFromNow: 76,
    city: '上海',
  },
  {
    title: '林俊杰 JJ20 北京站求同行',
    description: '还没抢到票，先找一起去的朋友，抢到哪一档都可以，主要是想有人一起排队入场。',
    artist: '林俊杰',
    tourName: 'JJ20',
    venue: '国家体育场（鸟巢）',
    seatType: 'UNDECIDED',
    hasTicket: false,
    capacity: 3,
    hoursFromNow: 96,
    city: '北京',
  },
  {
    title: '薛之谦广州站找搭子',
    description: '看台票已自备，想找人一起提前两小时到场拍拍照，散场一起吃饭。',
    artist: '薛之谦',
    tourName: '天外来物',
    venue: '广州体育馆',
    seatType: 'STAND',
    hasTicket: true,
    capacity: 4,
    hoursFromNow: 120,
    city: '广州',
  },
  {
    title: '周深成都站，找同场次的朋友',
    description: '座位还没定，先约个同场次，入场前一起在附近吃个饭再进去。',
    artist: '周深',
    tourName: '9.29Hz',
    venue: '成都东安湖体育公园',
    seatType: 'UNDECIDED',
    hasTicket: true,
    capacity: 4,
    hoursFromNow: 150,
    city: '成都',
  },
];

const DEMO_TRIPS: DemoTrip[] = [
  {
    title: '国庆大理五天，慢慢逛不赶路',
    description:
      '主要想环洱海、逛古城、找咖啡店坐着发呆。不赶行程，每天最多两个点，住宿可以分开也可以拼房。',
    destination: '大理',
    budgetMin: 2000,
    budgetMax: 4000,
    transport: 'PLANE',
    intensity: 'RELAXED',
    shareRoom: true,
    capacity: 4,
    hoursFromNow: 168,
    days: 5,
    city: '上海',
  },
  {
    title: '新疆伊犁八天自驾，缺两个司机',
    description:
      '伊宁进出，走赛里木湖、那拉提、喀拉峻，每天开车四五小时。已经租好车，需要至少一个人能轮换开。',
    destination: '伊犁',
    budgetMin: 6000,
    budgetMax: 9000,
    transport: 'SELF_DRIVE',
    intensity: 'MODERATE',
    shareRoom: true,
    capacity: 4,
    hoursFromNow: 216,
    days: 8,
    city: '上海',
  },
  {
    title: '泉州三天，吃遍老城区',
    description: '主要是吃，面线糊、姜母鸭、四果汤。住在西街附近，走路就能逛完，不爬坡。',
    destination: '泉州',
    budgetMin: 1200,
    budgetMax: 2000,
    transport: 'TRAIN',
    intensity: 'RELAXED',
    shareRoom: false,
    capacity: 3,
    hoursFromNow: 192,
    days: 3,
    city: '厦门',
  },
  {
    title: '川西环线四天，特种兵节奏',
    description:
      '成都出发，四天跑完四姑娘山、丹巴、新都桥，早出晚归。高反明显的朋友建议不要跟，行程比较硬。',
    destination: '川西',
    budgetMin: 3000,
    budgetMax: 5000,
    transport: 'SELF_DRIVE',
    intensity: 'INTENSE',
    shareRoom: true,
    capacity: 4,
    hoursFromNow: 240,
    days: 4,
    city: '成都',
  },
  {
    title: '三亚四天躺平，只晒太阳',
    description: '酒店已经订好海景房，白天基本在酒店和沙滩，晚上出去吃海鲜。想找人分摊房费。',
    destination: '三亚',
    budgetMin: 4000,
    budgetMax: 7000,
    transport: 'PLANE',
    intensity: 'RELAXED',
    shareRoom: true,
    capacity: 3,
    hoursFromNow: 300,
    days: 4,
    city: '北京',
  },
];

async function main() {
  const games = new Map<string, string>();

  for (const game of GAMES) {
    const record = await prisma.game.upsert({
      where: { name: game.name },
      update: { sortOrder: game.sortOrder, isActive: true },
      create: { name: game.name, sortOrder: game.sortOrder },
    });
    games.set(game.name, record.id);
  }

  const passwordHash = await bcrypt.hash(randomBytes(24).toString('base64url'), 12);
  const demo = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      nickname: DEMO_NICKNAME,
      city: '成都',
      bio: '用于本地演示的账号，不能登录。',
    },
  });

  // 演示数据整体重建：三个领域都以演示账号为发起人，删除时连扩展表一起级联
  await prisma.post.deleteMany({ where: { authorId: demo.id } });

  for (const post of DEMO_POSTS) {
    const gameId = games.get(post.game);
    if (!gameId) {
      throw new Error(`seed 中的游戏不存在：${post.game}`);
    }

    await prisma.post.create({
      data: {
        authorId: demo.id,
        domain: 'GAME',
        title: post.title,
        description: post.description,
        city: post.city ?? null,
        startTime: new Date(Date.now() + post.hoursFromNow * 60 * 60 * 1000),
        capacity: post.capacity,
        memberCount: 1,
        status: 'OPEN',
        gameId,
        gameInfo: {
          create: {
            gameId,
            platform: post.platform,
            mode: post.mode,
            rankMin: post.rankMin ?? null,
            rankMax: post.rankMax ?? null,
            needVoice: post.needVoice,
          },
        },
        members: {
          create: { userId: demo.id, role: 'HOST' },
        },
      },
    });
  }

  for (const concert of DEMO_CONCERTS) {
    await prisma.post.create({
      data: {
        authorId: demo.id,
        domain: 'CONCERT',
        title: concert.title,
        description: concert.description,
        city: concert.city,
        startTime: new Date(Date.now() + concert.hoursFromNow * 60 * 60 * 1000),
        capacity: concert.capacity,
        memberCount: 1,
        status: 'OPEN',
        concertInfo: {
          create: {
            artist: concert.artist,
            tourName: concert.tourName ?? null,
            venue: concert.venue,
            seatType: concert.seatType,
            hasTicket: concert.hasTicket,
            ticketNote: concert.ticketNote ?? null,
          },
        },
        members: {
          create: { userId: demo.id, role: 'HOST' },
        },
      },
    });
  }

  for (const trip of DEMO_TRIPS) {
    const startTime = new Date(Date.now() + trip.hoursFromNow * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + trip.days * 24 * 60 * 60 * 1000);

    await prisma.post.create({
      data: {
        authorId: demo.id,
        domain: 'TRAVEL',
        title: trip.title,
        description: trip.description,
        city: trip.city,
        startTime,
        endTime,
        capacity: trip.capacity,
        memberCount: 1,
        status: 'OPEN',
        travelInfo: {
          create: {
            destination: trip.destination,
            budgetMin: trip.budgetMin ?? null,
            budgetMax: trip.budgetMax ?? null,
            transport: trip.transport,
            intensity: trip.intensity,
            shareRoom: trip.shareRoom,
          },
        },
        members: {
          create: { userId: demo.id, role: 'HOST' },
        },
      },
    });
  }

  console.log(
    `seed 完成：${games.size} 款游戏，${DEMO_POSTS.length} 个游戏局，${DEMO_CONCERTS.length} 个演唱会局，${DEMO_TRIPS.length} 个旅行局`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
