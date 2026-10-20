import { io, type Socket } from 'socket.io-client';

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';

/**
 * 局内聊天连接：access token 从内存读取，通过握手 auth 传给服务端。
 * 每次进房新建连接，离开页面时由调用方 disconnect，避免残留房间订阅。
 */
export function createChatSocket(accessToken: string): Socket {
  return io(`${WS_URL}/ws`, {
    auth: { token: accessToken },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
}
