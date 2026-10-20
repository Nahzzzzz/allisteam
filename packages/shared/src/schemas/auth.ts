import { z } from 'zod';

export const emailSchema = z.email();
export const passwordSchema = z
  .string()
  .min(8)
  .max(72)
  .regex(/[A-Za-z]/, '密码需包含字母')
  .regex(/[0-9]/, '密码需包含数字');
export const nicknameSchema = z.string().trim().min(2).max(20);

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    nickname: nicknameSchema,
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(72),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;

/** 登录/注册成功返回的令牌；刷新令牌通过 httpOnly cookie 传递，不在响应体里 */
export interface AuthResult {
  accessToken: string;
  expiresIn: number;
  user: {
    id: string;
    nickname: string;
    email: string;
  };
}
