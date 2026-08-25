import { eq, and, sql, inArray } from 'drizzle-orm';
import * as localSchema from './local-schema';

/**
 * Phase 2A — Promotion Rules Engine (Laravel PromotionRule parity).
 *
 * Pipeline per Laravel baseline:
 *   1. Partition flash-sale rules (reserved for Phase 2 flash sales; none yet).
 *   2. Automatic cart rules applied cumulatively by priority ASC,
 *      honouring stop_further_rules.
 *   3. Legacy coupon layer runs afterwards (PromotionEngine) on the same subtotal.
 *
 * Strategies ported from app/Services/Promotions/Strategies/*:
 *   - percentage_with_max_cap : value% off eligible subtotal, capped at max_discount_amount
 *   - fixed_amount            : value off, capped at eligible subtotal
 *   - free_shipping           : value>0 = partial subsidy of base fee, else full fee
 *   - tiered_quantity         : conditions_json.tiered_steps [{min_qty, percent}]
 *   - buy_x_get_y             : conditions_json.bxgy_config {buy_product_id?, buy_qty, get_product_id?, get_qty, max_rewards}
 *
 * Tier targeting (CustomerTierResolver semantics):
 *   all | guest | first_time | bronze | silver | gold | platinum
 *   Named tiers match their ladder inclusively (silver matches silver/gold/platinum).
 *   Thresholds mirror CustomerTierResolver: Silver >= 5M, Gold >= 20M, Platinum >= 50M lifetime.
 */

export const TIER_LADDER = ['bronze', 'silver', 'gold', 'platinum'] as const;
export type ResolvableTier = 'all' | 'guest' | 'first_time' | typeof TIER_LADDER[number];

export interface RulesCartContext {
  db: any;
  subTotal: number;
  baseShippingFee: number;
  customerId?: string;
  customerEmail?: string;
  cartItems: Array<{ product_id: string; quantity: number; price: number }>;
}

export interface AppliedRuleDiscount {
  ruleId: string;
  name: string;
  actionType: string;
  amount: number;
  description: string;
}

export interface RulesResult {
  totalDiscount: number;
  shippingSubsidy: number;
  gifts: Array<{ product_id: string; quantity: number }>;
  appliedRules: AppliedRuleDiscount[];
}

interface ParsedConditions {
  min_order_amount?: number;
  target_product_ids?: string[];
  tiered_steps?: Array<{ min_qty: number; percent: number }>;
  bxgy_config?: {
    buy_product_id?: string;
    buy_qty: number;
    get_product_id?: string;
    get_qty: number;
    max_rewards?: number;
  };
}

function parseConditions(rule: any): ParsedConditions {
  try {
    return JSON.parse(rule.conditions_json || '{}') || {};
  } catch {
    return {};
  }
}

function eligibleSubtotalFor(items: RulesCartContext['cartItems'], targetIds?: string[]): { subtotal: number; qty: number } {
  if (!targetIds || targetIds.length === 0) {
    return {
      subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
      qty: items.reduce((s, i) => s + i.quantity, 0),
    };
  }
  let subtotal = 0;
  let qty = 0;
  for (const item of items) {
    if (targetIds.includes(item.product_id)) {
      subtotal += item.price * item.quantity;
      qty += item.quantity;
    }
  }
  return { subtotal, qty };
}

/** Resolves the customer's tier from lifetime confirmed+ spend (Laravel thresholds). */
export async function resolveCustomerTier(db: any, customerId?: string): Promise<{ tier: string; isFirstTime: boolean }> {
  if (!customerId) return { tier: 'guest', isFirstTime: false };

  const spendRow = await db.select({
    lifetime: sql`coalesce(sum(${localSchema.orders.total_amount}), 0)`,
  })
    .from(localSchema.orders)
    .where(and(
      eq(localSchema.orders.customer_id, customerId),
      inArray(localSchema.orders.status, ['confirmed', 'processing', 'shipped', 'completed'])
    ))
    .get();

  const orderCountRow = await db.select({
    count: sql`count(*)`,
  })
    .from(localSchema.orders)
    .where(eq(localSchema.orders.customer_id, customerId))
    .get();

  const lifetime = Number(spendRow?.lifetime || 0);
  const isFirstTime = Number(orderCountRow?.count || 0) === 0;

  let tier = 'bronze';
  if (lifetime >= 50000000) tier = 'platinum';
  else if (lifetime >= 20000000) tier = 'gold';
  else if (lifetime >= 5000000) tier = 'silver';
  return { tier, isFirstTime };
}

/** Tier targeting with inclusive ladder matching. */
function isTargeted(target: string | null | undefined, resolved: { tier: string; isFirstTime: boolean }): boolean {
  const t = (target || 'all').toLowerCase();
  if (!t || t === 'all') return true;
  if (t === 'guest') return !resolved.tier || resolved.tier === 'guest';
  if (t === 'first_time') return resolved.isFirstTime;
  const idx = TIER_LADDER.indexOf(t as any);
  if (idx === -1) return false;
  const custIdx = TIER_LADDER.indexOf(resolved.tier as any);
  // bronze targets everyone on the ladder; higher tiers only match at/above themselves
  return idx === 0 ? custIdx !== -1 : custIdx >= idx;
}

async function loadActiveRules(db: any, ruleType: 'cart_rule' | 'catalog_rule'): Promise<any[]> {
  const nowUnix = Math.floor(Date.now() / 1000);
  const rows = await db.select()
    .from(localSchema.promotionRules)
    .where(and(
      eq(localSchema.promotionRules.rule_type, ruleType),
      eq(localSchema.promotionRules.status, 'active')
    ))
    .all();
  return rows.filter((r: any) => (!r.starts_at || nowUnix >= r.starts_at) && (!r.ends_at || nowUnix <= r.ends_at))
    .sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0));
}

/** Public accessor so callers can preload rules once for batch operations. */
export function getActiveCatalogRules(db: any): Promise<any[]> {
  return loadActiveRules(db, 'catalog_rule');
}

function computeRuleDiscount(rule: any, ctx: RulesCartContext, remainingSubtotal: number): { amount: number; shippingSubsidy: number; gifts: RulesResult['gifts'] } | null {
  const cond = parseConditions(rule);
  const value = Number(rule.action_value || 0);

  if ((cond.min_order_amount ?? 0) > ctx.subTotal) return null;

  switch (rule.action_type) {
    case 'percentage_with_max_cap': {
      const eligible = eligibleSubtotalFor(ctx.cartItems, cond.target_product_ids);
      if (eligible.subtotal <= 0) return null;
      let amount = Math.round(eligible.subtotal * (value / 100));
      if (rule.max_discount_amount != null && rule.max_discount_amount > 0) {
        amount = Math.min(amount, rule.max_discount_amount);
      }
      amount = Math.min(amount, remainingSubtotal);
      return amount > 0 ? { amount, shippingSubsidy: 0, gifts: [] } : null;
    }

    case 'fixed_amount': {
      const eligible = eligibleSubtotalFor(ctx.cartItems, cond.target_product_ids);
      if (eligible.subtotal <= 0) return null;
      const amount = Math.min(Math.round(value), eligible.subtotal, remainingSubtotal);
      return amount > 0 ? { amount, shippingSubsidy: 0, gifts: [] } : null;
    }

    case 'free_shipping': {
      if (ctx.baseShippingFee <= 0) return null;
      const subsidy = value > 0 ? Math.min(Math.round(value), ctx.baseShippingFee) : ctx.baseShippingFee;
      return subsidy > 0 ? { amount: 0, shippingSubsidy: subsidy, gifts: [] } : null;
    }

    case 'tiered_quantity': {
      const steps = (cond.tiered_steps || []).slice().sort((a, b) => b.min_qty - a.min_qty);
      if (steps.length === 0) return null;
      const eligible = eligibleSubtotalFor(ctx.cartItems, cond.target_product_ids);
      const step = steps.find(s => eligible.qty >= s.min_qty);
      if (!step || eligible.subtotal <= 0) return null;
      let amount = Math.round(eligible.subtotal * (step.percent / 100));
      if (rule.max_discount_amount != null && rule.max_discount_amount > 0) {
        amount = Math.min(amount, rule.max_discount_amount);
      }
      amount = Math.min(amount, remainingSubtotal);
      return amount > 0 ? { amount, shippingSubsidy: 0, gifts: [] } : null;
    }

    case 'buy_x_get_y': {
      const cfg = cond.bxgy_config;
      if (!cfg || !cfg.buy_qty || !cfg.get_qty) return null;
      const buyPool = cfg.buy_product_id
        ? ctx.cartItems.filter(i => i.product_id === cfg.buy_product_id)
        : ctx.cartItems;
      const buyUnits = buyPool.reduce((s, i) => s + i.quantity, 0);
      if (buyUnits < cfg.buy_qty) return null;

      const rewardSets = Math.floor(buyUnits / cfg.buy_qty);
      let rewardQty = rewardSets * cfg.get_qty;
      if (cfg.max_rewards && cfg.max_rewards > 0) {
        rewardQty = Math.min(rewardQty, cfg.max_rewards);
      }

      const getPool = cfg.get_product_id
        ? ctx.cartItems.filter(i => i.product_id === cfg.get_product_id)
        : ctx.cartItems;
      if (getPool.length === 0) return null;

      // Reward the cheapest units so the discount never exceeds real cart value.
      const unitPrices = getPool.flatMap(i => Array.from({ length: i.quantity }, () => i.price)).sort((a, b) => a - b);
      const availableQty = Math.min(rewardQty, unitPrices.length);
      if (availableQty <= 0) return null;

      const giftAmount = unitPrices.slice(0, availableQty).reduce((s, p) => s + p, 0);
      const amount = Math.min(giftAmount, remainingSubtotal);

      const gifts = cfg.get_product_id
        ? [{ product_id: cfg.get_product_id, quantity: availableQty }]
        : [];

      return amount > 0 ? { amount, shippingSubsidy: 0, gifts } : null;
    }

    default:
      return null;
  }
}

export class PromotionRulesEngine {
  /** Evaluates automatic cart rules (priority ASC, stop_further_rules honoured). */
  static async evaluateCart(ctx: RulesCartContext): Promise<RulesResult> {
    const result: RulesResult = { totalDiscount: 0, shippingSubsidy: 0, gifts: [], appliedRules: [] };
    if (!ctx.cartItems || ctx.cartItems.length === 0) return result;

    const rules = await loadActiveRules(ctx.db, 'cart_rule');
    if (rules.length === 0) return result;

    const resolvedTier = await resolveCustomerTier(ctx.db, ctx.customerId);
    let remainingSubtotal = ctx.subTotal;

    for (const rule of rules) {
      if (!isTargeted(rule.target_customer_tier, resolvedTier)) continue;

      const outcome = computeRuleDiscount(rule, ctx, remainingSubtotal);
      if (!outcome) continue;

      if (outcome.amount > 0) {
        remainingSubtotal -= outcome.amount;
        result.totalDiscount += outcome.amount;
        result.gifts.push(...outcome.gifts);
        result.appliedRules.push({
          ruleId: rule.id,
          name: rule.name,
          actionType: rule.action_type,
          amount: outcome.amount,
          description: `${rule.name} (${rule.action_type})`,
        });
      }
      if (outcome.shippingSubsidy > 0) {
        result.shippingSubsidy = Math.max(result.shippingSubsidy, outcome.shippingSubsidy);
        result.appliedRules.push({
          ruleId: rule.id,
          name: rule.name,
          actionType: rule.action_type,
          amount: 0,
          description: `${rule.name} (free_shipping subsidy)`,
        });
      }

      if (rule.stop_further_rules === 1) break;
    }

    return result;
  }

  /**
   * Evaluates catalog rules for a single product's base price and returns the
   * promoted strike-through price, or null when no rule applies.
   * Pass preloaded `rules` (getActiveCatalogRules) to avoid N+1 loads.
   */
  static async resolveCatalogPrice(
    db: any,
    productId: string,
    categoryId: string | null,
    basePrice: number,
    rules?: any[]
  ): Promise<{ promoted_price: number; rule_name: string } | null> {
    if (!(basePrice > 0)) return null;
    const active = rules || await loadActiveRules(db, 'catalog_rule');
    if (active.length === 0) return null;

    let best: { promoted_price: number; rule_name: string } | null = null;

    for (const rule of active) {
      const cond = parseConditions(rule);
      const targets = cond.target_product_ids || [];
      const inScope = targets.length === 0 || targets.includes(productId);
      if (!inScope) continue;

      const value = Number(rule.action_value || 0);
      let promoted = basePrice;
      if (rule.action_type === 'percentage_with_max_cap' && value > 0 && value < 100) {
        promoted = Math.round(basePrice * (1 - value / 100));
        if (rule.max_discount_amount != null && rule.max_discount_amount > 0) {
          promoted = Math.max(promoted, basePrice - rule.max_discount_amount);
        }
      } else if (rule.action_type === 'fixed_amount' && value > 0) {
        promoted = Math.max(0, basePrice - Math.round(value));
      } else {
        continue;
      }

      if (!best || promoted < best.promoted_price) {
        best = { promoted_price: promoted, rule_name: rule.name };
      }
    }

    if (best && best.promoted_price < basePrice) return best;
    return null;
  }

  /**
   * Atomically locks usage for applied rules BEFORE order creation (same
   * pattern as the legacy coupon lock). Throws when a limit is exhausted so
   * checkout aborts without creating an order. Also writes the immutable
   * promotion_usages audit rows (Laravel PRM-09).
   */
  static async lockUsage(
    drizzleDb: any,
    appliedRules: AppliedRuleDiscount[],
    orderId: string,
    customerId?: string,
    customerEmail?: string
  ): Promise<void> {
    if (!appliedRules || appliedRules.length === 0) return;

    for (const rule of appliedRules) {
      const locked = await drizzleDb
        .update(localSchema.promotionRules)
        .set({ times_used: sql`times_used + 1` })
        .where(and(
          eq(localSchema.promotionRules.id, rule.ruleId),
          orNull(localSchema.promotionRules.usage_limit)
        ))
        .run();

      const affected = (locked as any)?.meta?.changes ?? (locked as any)?.changes ?? 0;
      if (affected === 0) {
        throw new Error(`Promotion rule "${rule.name}" usage limit reached`);
      }

      await drizzleDb.insert(localSchema.promotionUsages).values({
        id: crypto.randomUUID(),
        promotion_id: rule.ruleId,
        kind: 'rule',
        customer_id: customerId ?? null,
        email: customerEmail ?? null,
        order_id: orderId,
        discount_amount: rule.amount,
      });
    }
  }
}

/** Helper building the atomic global-limit guard clause. */
function orNull(usageLimitColumn: any) {
  return sql`(${usageLimitColumn} IS NULL OR ${localSchema.promotionRules.times_used} < ${usageLimitColumn})`;
}
