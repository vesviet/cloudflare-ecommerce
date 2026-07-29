# ADR: Inventory Durable Object Sharding (DEBT-012)

- Status: **Accepted 2026-07-29** — phase 1 (shard by `location_id`) implemented in `InventoryRepository`; per-product / parent-child escalation deferred and metric-gated
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

## Research — Cloudflare official guidance (Rules of Durable Objects, updated 2026-07-15)

Source: https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/

- **Explicit anti-pattern — "Do not use a single Durable Object as a global singleton":** *"A single Durable Object handling all traffic becomes a bottleneck."* Cloudflare names global counters/limiters as the classic mistake. Our `idFromName('GLOBAL_INVENTORY')` is exactly this pattern.
- **Concrete throughput ceiling:** one DO handles ~1,000 req/s for simple pass-through, **~500–750 with JSON parsing/validation, and ~200–500 for complex operations with storage writes**. Our deduct/restock does JSON + SQLite writes + a D1 write-through, so the global object's realistic ceiling is ~200–500 checkouts/s for the entire platform. Sizing formula: `Required DOs = total_rps / per_DO_capacity`.
- **Design principle — model one DO per "atom of coordination":** Cloudflare lists *"inventory management, booking systems"* as canonical strong-consistency cases, and its **seat-booking example shards per event** via `idFromName(eventId)`. That is directly analogous to sharding inventory per `location_id` (all products at one location in one object), which keeps the common single-location, multi-item checkout atomic inside a single object.
- **Parent-child pattern** (coordinator + per-entity child DOs) enables parallelism while each child keeps single-threaded consistency — the path to finer granularity if a location gets hot.
- **Implementation notes for any shard key:** route with deterministic `getByName(key)` (not `newUniqueId()`); and note that `blockConcurrencyWhile()` across I/O (our constructor seeds from D1) plus per-request D1 write-through is itself throughput-limiting — Cloudflare recommends `transaction()` for atomic read-modify-write and keeping blocking init minimal.

## Recommendation

**Shard by `location_id`** (Option C), now backed by Cloudflare's own guidance: it matches the "atom of coordination" model (mirrors the seat-booking-per-event example), keeps the common single-location checkout atomic, and is a small change (`getByName(location_id)` instead of `'GLOBAL_INVENTORY'`). Escalate to per-`product_id` (Option B) or a parent-child design **only if** a single location is measured to exceed the ~200–500 rps complex-op ceiling (use the sizing formula). Any multi-shard checkout must acquire shards in a deterministic sorted order with a compensation path.

## Decision required from the team

1. Shard key: `location_id` (recommended), `product_id`, or `product_id+location_id`?
2. For multi-shard checkouts: define the ordering guarantee (sorted-key acquisition) and the failure/compensation path.
3. Migration path from the single `'GLOBAL_INVENTORY'` object (drain + re-seed each shard from D1 on first access; the DO already seeds from D1 on init).

_Implementation follows an accepted ADR; the shard key changes how the lock is keyed, so it needs sign-off before coding._
