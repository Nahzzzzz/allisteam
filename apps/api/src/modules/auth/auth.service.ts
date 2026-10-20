import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare as comparePassword, hash as hashPassword } from 'bcryptjs';
import type { LoginInput, RegisterInput } from '@allisteam/shared';
import { EnvService } from '../../config/env.service';
import { AppException } from '../../common/app-exception';
import { ttlToSeconds } from '../../common/util/ttl';
import { AuthRepository } from './auth.repository';

const BCRYPT_COST = 12;

export interface AuthUserView {
  id: string;
  nickname: string;
  email: string;
}

export interface IssuedSession {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: AuthUserView;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly jwt: JwtService,
    private readonly env: EnvService,
  ) {}

  async register(input: RegisterInput): Promise<IssuedSession> {
    const existing = await this.repo.findUserByEmail(input.email);
    if (existing) {
      throw new AppException('EMAIL_TAKEN', 409, '该邮箱已注册');
    }

    const passwordHash = await hashPassword(input.password, BCRYPT_COST);
    const user = await this.repo.createUser({
      email: input.email,
      passwordHash,
      nickname: input.nickname,
    });

    return this.issueSession({ id: user.id, email: user.email, nickname: user.nickname });
  }

  async login(input: LoginInput): Promise<IssuedSession> {
    const user = await this.repo.findUserByEmail(input.email);
    const passwordOk = user ? await comparePassword(input.password, user.passwordHash) : false;

    if (!user || !passwordOk) {
      throw new AppException('INVALID_CREDENTIALS', 401, '邮箱或密码不正确');
    }
    if (user.status !== 'ACTIVE') {
      throw new AppException('FORBIDDEN', 403, '账号已被限制');
    }

    return this.issueSession({ id: user.id, email: user.email, nickname: user.nickname });
  }

  async refresh(rawToken: string | undefined): Promise<IssuedSession> {
    if (!rawToken) {
      throw new AppException('UNAUTHORIZED', 401, '缺少刷新令牌');
    }

    const record = await this.repo.findRefreshToken(hashToken(rawToken));
    if (!record) {
      throw new AppException('UNAUTHORIZED', 401, '刷新令牌无效');
    }

    if (record.revokedAt) {
      // 已作废的令牌再次出现，说明可能被窃取：吊销整个家族
      await this.repo.revokeFamily(record.familyId);
      throw new AppException('UNAUTHORIZED', 401, '登录状态已失效，请重新登录');
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw new AppException('TOKEN_EXPIRED', 401, '登录状态已过期');
    }

    await this.repo.revokeToken(record.id);

    return this.issueSession(
      { id: record.user.id, email: record.user.email, nickname: record.user.nickname },
      record.familyId,
    );
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) {
      return;
    }
    const record = await this.repo.findRefreshToken(hashToken(rawToken));
    if (record) {
      await this.repo.revokeFamily(record.familyId);
    }
  }

  private async issueSession(user: AuthUserView, familyId?: string): Promise<IssuedSession> {
    const accessToken = await this.jwt.signAsync({ sub: user.id, jti: randomUUID() });

    const refreshToken = randomBytes(32).toString('base64url');
    const refreshExpiresAt = new Date(
      Date.now() + this.env.values.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.repo.createRefreshToken({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      familyId: familyId ?? randomUUID(),
      expiresAt: refreshExpiresAt,
    });

    return {
      accessToken,
      expiresIn: ttlToSeconds(this.env.values.JWT_ACCESS_TTL),
      refreshToken,
      refreshExpiresAt,
      user,
    };
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
