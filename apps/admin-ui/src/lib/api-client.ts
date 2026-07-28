import { hc } from 'hono/client';
import type { AppType } from '../../../admin-api/src/index';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8788';

export const adminApiClient = hc<AppType>(API_BASE);
export type { AppType };
