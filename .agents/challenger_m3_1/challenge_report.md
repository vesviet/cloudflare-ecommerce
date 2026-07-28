# Challenge Report: Zod Schema Validation Robustness in `@ecommerce/contract`

**Target Package**: `packages/contract`  
**Challenger**: Challenger 1 (Milestone 3 - API Contracts Workspace - Slice 8)  
**Verification Date**: 2026-07-28  

---

## Challenge Summary

**Overall risk assessment**: **LOW**

The `@ecommerce/contract` package demonstrates high structural robustness in Zod schema design. All primary schemas (`cmsSchema`, `customerSchema`, `CheckoutSchema`/`checkoutSchema`, `ProductSchema`/`productFormSchema`, `categorySchema`, `CartSchema`/`CartItemSchema`, `ReviewSchema`/`PostReviewSchema`, `couponSchema`) enforce strict type validation, enum bounds, string length constraints, and custom error messages. 

Empirical testing confirmed 54/54 automated Vitest test cases passing across valid and invalid payload boundaries, with informative Zod issues (including precise `path`, `code`, `expected`, and `received` fields) returned on parsing failures.

A few minor edge-case behaviors and design observations were surfaced during stress testing (e.g., string representation of booleans, empty items array in checkout), categorized below as Low-risk findings.

---

## Challenges & Observations

### [Low] Challenge 1: String-based boolean coercion in `accepts_marketing` and `is_active`

- **Assumption challenged**: External API callers or web forms sending query/form-data payload string representations (e.g. `'true'`, `'false'`, `'1'`, `'0'`) will be parsed by `z.union([z.boolean(), z.number().transform(...)])`.
- **Attack scenario**: An API caller posts `{ accepts_marketing: "true" }` or `{ accepts_marketing: "1" }` (e.g., from `FormData` or JSON encoded by un-typed form serialization).
- **Blast radius**: Validation fails with `invalid_union` error (`Expected boolean, received string` / `Expected number, received string`).
- **Mitigation**: If string coercion is desired for form input endpoints, update union definition to include string coercion `z.union([z.boolean(), z.number().transform(v => Boolean(v)), z.string().transform(v => v === 'true' || v === '1')])` or use `z.coerce.boolean()`.

### [Low] Challenge 2: Checkout schema accepts empty `items: []` array

- **Assumption challenged**: Checkout payloads always contain at least one item.
- **Attack scenario**: A user or automated client submits `{ email: "test@example.com", items: [] }`.
- **Blast radius**: `CheckoutSchema.safeParse` passes successfully because `z.array(...)` does not enforce `.min(1)`. Downstream checkout processors must validate non-empty carts manually or handle empty carts without throwing errors.
- **Mitigation**: Add `.min(1, "Checkout must contain at least 1 item")` to `items` array definition in `CheckoutSchema` if empty checkouts are prohibited at the API boundary.

### [Low] Challenge 3: Non-zero numeric accepts_marketing coercion

- **Assumption challenged**: `accepts_marketing` numbers are strictly `0` or `1`.
- **Attack scenario**: An API caller passes `accepts_marketing: 2` or `-1`.
- **Blast radius**: `Boolean(2)` and `Boolean(-1)` evaluate to `true`.
- **Mitigation**: If only 0 and 1 are valid numbers, replace `transform(v => Boolean(v))` with an explicit check or `z.enum([0, 1])`.

---

## Stress Test Results

| Target Schema | Scenario / Payload | Expected Result | Actual Result | Status | Zod Issue Code / Details |
| --- | --- | --- | --- | --- | --- |
| `cmsSchema` | Type `article` & valid title | PASS | PASS | PASS | N/A |
| `cmsSchema` | Type `event` & valid title | PASS | PASS | PASS | N/A |
| `cmsSchema` | Invalid type `"blog_post"` | FAIL | FAIL | PASS | `invalid_enum_value` on `['type']` |
| `cmsSchema` | Missing `title` | FAIL | FAIL | PASS | `invalid_type` (`Required`) on `['title']` |
| `cmsSchema` | Empty string `title: ""` | FAIL | FAIL | PASS | `too_small` ("Title is required") on `['title']` |
| `cmsSchema` | Title > 255 chars | FAIL | FAIL | PASS | `too_big` on `['title']` |
| `customerSchema` | `accepts_marketing: true` / `false` | PASS | PASS | PASS | Parsed to boolean |
| `customerSchema` | `accepts_marketing: 1` / `0` | PASS | PASS | PASS | Coerced to `true` / `false` |
| `customerSchema` | `accepts_marketing: "true"` | FAIL | FAIL | PASS | `invalid_union` on `['accepts_marketing']` |
| `customerSchema` | Invalid email `"user@domain@com"` | FAIL | FAIL | PASS | `invalid_string` ("Invalid email format") |
| `customerSchema` | Password < 8 chars | FAIL | FAIL | PASS | `too_small` ("Password must be at least 8 characters") |
| `CheckoutSchema` | Valid items & B2B fields | PASS | PASS | PASS | Coerces accepts_marketing to true |
| `CheckoutSchema` | `checkoutSchema` reference equality | PASS | PASS | PASS | `checkoutSchema === CheckoutSchema` |
| `CheckoutSchema` | Item quantity `0` or negative | FAIL | FAIL | PASS | `too_small` on `['items', 0, 'quantity']` |
| `CheckoutSchema` | Item quantity float `2.5` | FAIL | FAIL | PASS | `invalid_type` (Expected integer) on `['items', 0, 'quantity']` |
| `CheckoutSchema` | `customer_id` non-UUID | FAIL | FAIL | PASS | `invalid_string` (Invalid uuid) on `['customer_id']` |
| `CheckoutSchema` | `redeem_points: -50` | FAIL | FAIL | PASS | `too_small` on `['redeem_points']` |
| `ProductSchema` | Catalog product valid ISO datetime | PASS | PASS | PASS | N/A |
| `ProductSchema` | Invalid date `"2026-01-01"` | FAIL | FAIL | PASS | `invalid_string` (Invalid datetime) on `['created_at']` |
| `productFormSchema` | SKU < 3 chars | FAIL | FAIL | PASS | `too_small` ("SKU is required...") |
| `categorySchema` | Valid category & empty `name: ""` | FAIL on empty | FAIL on empty | PASS | `too_small` ("Name is required") |
| `CartSchema` | Valid cart items | PASS | PASS | PASS | N/A |
| `CartSchema` | Item price `"free"` (string) | FAIL | FAIL | PASS | `invalid_type` on `['items', 0, 'price']` |
| `PostReviewSchema` | Rating `1` to `5` | PASS | PASS | PASS | N/A |
| `PostReviewSchema` | Rating `0` / `6` / `3.5` | FAIL | FAIL | PASS | `too_small` / `too_big` / `invalid_type` (float) |
| `PostReviewSchema` | Comment > 2000 chars | FAIL | FAIL | PASS | `too_big` on `['comment']` |
| `couponSchema` | Valid type `percent`/`freeship` | PASS | PASS | PASS | N/A |
| `couponSchema` | Code < 4 chars / value < 0 | FAIL | FAIL | PASS | `too_small` on `['code']` / `['value']` |

---

## Unchallenged Areas

- **OpenAPI Schema Generation**: `generate-openapi.ts` generation pipeline was not in the direct validation scope for schema parsing, but `.openapi()` annotations were confirmed intact on exported Zod schemas.
