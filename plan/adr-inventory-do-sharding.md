# ADR: Inventory Durable Object Sharding (DEBT-012)

- Status: **Proposed — needs decision**
- Date: 2026-07-29
- Owner: Technical Architect
- Related debt: DEBT-012 (P1). Correctness is already sound (DEBT-006/008 resolved: DO write-through to D1, location-scoped deductions).

## Context

- `InventoryRepository` addresses the inventory Durable Object through a single named instance: `idFromName('GLOBAL_INVENTORY')`.
- `InventoryLockManagerDO` serialises **every** request in the platform through one promise queue (`this.queue = this.queue.then(...)`), guaranteeing correctness by making all stock movements sequential.
- Effect: all checkout inventory operations funnel through one object → this **caps checkout throughput** and concentrates failure/latency in a single actor. It is a scalability limit, not a correctness bug.

## The core trade-off

The single global object gives **global serialization for free**, which makes multi-item checkouts trivially atomic (one lock covers all items). Any sharding scheme breaks that: a checkout touching items in different shards must acquire multiple locks, which reintroduces ordering/atomicity concerns (deadlock, partial reservation).

## Options

### Option A — Status quo (single global DO)
Keep it. **Pros:** simplest, correct, atomic multi-item checkout. **Cons:** throughput ceiling, single hot object.

### Option B — Shard by `product_id`
One DO per product. **Pros:** maximum parallelism across products. **Cons:** a multi-item order must lock N shards; requires a **deterministic global lock ordering** (e.g. acquire shards sorted by product_id) to avoid deadlock, plus a saga/compensation path if a later reservation fails. Highest complexity.

### Option C — Shard by `location_id`
One DO per fulfilment location. Aligns with the location-scoped inventory model from DEBT-008. **Pros:** far fewer shards than per-product, most orders are single-location so they stay atomic within one DO; simple keying. **Cons:** a single scorching-hot location is still a bottleneck; multi-location orders (rare) need cross-shard handling.

### Option D — Shard by `product_id` + `location_id`
Finest granularity, highest parallelism, highest cross-shard complexity for any multi-line order.

## Recommendation

Start with **Option C (shard by `location_id`)**: it matches the existing location-scoped inventory semantics, keeps the common single-location checkout atomic inside one DO, and is a small, reversible keying change (`idFromName(location_id)` instead of `'GLOBAL_INVENTORY'`). Only move to B/D if per-location contention is later proven by metrics — and only with a defined multi-shard acquisition protocol.

## Decision required from the team

1. Shard key: `location_id` (recommended), `product_id`, or `product_id+location_id`?
2. For multi-shard checkouts: define the ordering guarantee (sorted-key acquisition) and the failure/compensation path.
3. Migration path from the single `'GLOBAL_INVENTORY'` object (drain + re-seed each shard from D1 on first access; the DO already seeds from D1 on init).

_Implementation follows an accepted ADR; the shard key changes how the lock is keyed, so it needs sign-off before coding._
