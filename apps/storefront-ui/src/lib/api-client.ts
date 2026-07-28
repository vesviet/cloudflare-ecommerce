import { hc } from 'hono/client';
import type { AppType } from '../../../public-api/src/index';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export const apiClient = hc<AppType>(API_BASE);
export type { AppType };
