import { io, type Socket } from 'socket.io-client';
import {
  WS_EVENTS,
  type JoinPostAck,
  type SendMessageAck,
  type SendMessagePayload,
} from '@allisteam/shared';

const CONNECT_TIMEOUT_MS = 10_000;
const EVENT_TIMEOUT_MS = 8_000;

export function connectChat(baseUrl: string, token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(`${baseUrl}/ws`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
      timeout: CONNECT_TIMEOUT_MS,
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error('WebSocket 连接超时'));
    }, CONNECT_TIMEOUT_MS);

    socket.once('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      socket.disconnect();
      reject(error);
    });
  });
}

/** 用错误令牌连接：服务端发 auth:error 后断开，客户端一定能连上随后被踢 */
export async function expectAuthRejected(baseUrl: string, token: string): Promise<void> {
  const socket = io(`${baseUrl}/ws`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
    timeout: CONNECT_TIMEOUT_MS,
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('服务端没有断开未认证连接')), EVENT_TIMEOUT_MS);
      socket.on('disconnect', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  } finally {
    socket.disconnect();
  }
}

export function joinRoom(socket: Socket, postId: string): Promise<JoinPostAck> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('加入房间超时')), EVENT_TIMEOUT_MS);
    socket.emit(WS_EVENTS.join, { postId }, (ack: JoinPostAck) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}

export function sendChat(
  socket: Socket,
  payload: SendMessagePayload,
): Promise<SendMessageAck> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('发送消息超时')), EVENT_TIMEOUT_MS);
    socket.emit(WS_EVENTS.send, payload, (ack: SendMessageAck) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}

export function waitForEvent<T>(
  socket: Socket,
  event: string,
  predicate?: (payload: T) => boolean,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const handler = (payload: T): void => {
      if (predicate && !predicate(payload)) {
        return;
      }
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`等待事件 ${event} 超时`));
    }, EVENT_TIMEOUT_MS);
    socket.on(event, handler);
  });
}

export function waitForDisconnect(socket: Socket): Promise<void> {
  if (socket.disconnected) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('等待断开超时')), EVENT_TIMEOUT_MS);
    socket.once('disconnect', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
