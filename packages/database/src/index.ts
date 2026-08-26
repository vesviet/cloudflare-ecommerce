import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

// Export schema để các app lấy Type
export { schema };

// Hàm khởi tạo connection với Type-Safety
export const createDb = (d1: any) => {
  return drizzle(d1, { schema });
};

// Export auth utilities
export * from './auth';
export * from './totp';
