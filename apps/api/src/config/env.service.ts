import { Injectable } from '@nestjs/common';
import { type Env, loadEnv } from './env';

@Injectable()
export class EnvService {
  readonly values: Env = loadEnv();
}
