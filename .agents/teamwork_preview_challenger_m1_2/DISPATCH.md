# Dispatch Instructions for Challenger M1_2

You are teamwork_preview_challenger_m1_2. Working directory: D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_challenger_m1_2.
Read ORIGINAL_REQUEST.md at D:\myproject\cloudflare-ecommerce\.agents\ORIGINAL_REQUEST.md.
Read PROJECT.md at D:\myproject\cloudflare-ecommerce\.agents\orchestrator\PROJECT.md.
Read Worker M1 handoff at D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_worker_m1_1\handoff.md.

Adversarially challenge and stress-test the backend API changes:
- Verify edge cases for missing product_id, non-existent product, missing price list items, missing variants, or empty stock.
- Verify PUT update on existing LP slug without changing slug succeeds (id == currentId check).

Provide your verdict (APPROVE or REJECT) with empirical evidence in D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_challenger_m1_2\handoff.md. Send a message to orchestrator when complete.
