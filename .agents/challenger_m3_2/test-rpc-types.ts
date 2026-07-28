import { hc } from 'hono/client';
import type { AppType as PublicAppType } from '../../apps/public-api/src/index';
import type { AppType as AdminAppType } from '../../apps/admin-api/src/index';
import type {
  Product,
  CheckoutInput,
  ErrorResponse,
  Coupon,
  Review,
  Cart,
  CustomerRegisterInput,
  CustomerLoginInput,
  AdminUser,
  Category,
  CMSItem,
} from '../../packages/contract/src/index';

// 1. Verify Public API RPC client instantiation
const publicClient = hc<PublicAppType>('http://localhost:8787');

// 2. Verify Admin API RPC client instantiation
const adminClient = hc<AdminAppType>('http://localhost:8788');

// 3. Verify RPC Route endpoints inference on publicClient
// /api/products
const getProducts = publicClient.api.products.$get;
// /api/categories
const getCategories = publicClient.api.categories.$get;
// /api/cart
const getCart = publicClient.api.cart.$get;

// 4. Verify RPC Route endpoints inference on adminClient
// /api/admin-users
const getAdminUsers = adminClient.api['admin-users'].$get;
// /api/categories
const getAdminCategories = adminClient.api.categories.$get;

console.log('RPC Client creation & AppType inference verified successfully!');
