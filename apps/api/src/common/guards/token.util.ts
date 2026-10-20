import type { JwtService } from '@nestjs/jwt';
import { AppException } from '../app-exception';

export interface AccessTokenPayload {
  sub: string;
  jti: string;
}

export function extractBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(' ');
  if (!token || scheme?.toLowerCase() !== 'bearer') {
    return null;
  }
  return token;
}

export async function verifyAccessToken(
  jwt: JwtService,
  token: string,
): Promise<AccessTokenPayload> {
  try {
    const payload = await jwt.verifyAsync<AccessTokenPayload>(token);
    if (!payload.sub) {
      throw new Error('missing sub');
    }
    return payload;
  } catch (error) {
    const expired = error instanceof Error && error.name === 'TokenExpiredError';
    throw new AppException(
      expired ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED',
      401,
      expired ? '登录状态已过期' : '登录凭证无效',
    );
  }
}
