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
];

const DEMO_EMAIL = 'demo@allisteam.local';
const DEMO_NICKNAME = '演示账号';

type Platform = 'PC' | 'PLAYSTATION' | 'XBOX' | 'SWITCH' | 'MOBILE';

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

  console.log(`seed 完成：${games.size} 款游戏，${DEMO_POSTS.length} 个演示局`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
