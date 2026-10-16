# API fixtures

Real responses from the backend, used by `test/api_contract_test.dart` to check the app still understands the API. They come from the seeded database (`npm run db:seed` in `backend/`), so the names and prices are sample data.

Record them again after changing the API: start the backend with a freshly seeded database, then for each file call the endpoint below with `x-dev-user: Amara` (staff calls add `x-dev-role: STAFF`) and save the JSON.

| File | Request |
|---|---|
| `bakeries.json` | `GET /bakeries` |
| `products.json` | `GET /bakeries/:id/products` (Sweet Crumbs) |
| `builder.json` | `GET /bakeries/:id/builder` |
| `availability.json` | `GET /bakeries/:id/availability?days=42` |
| `order_detail_quoted.json` | A custom order (Round, 2 tiers, 2 kg, Vanilla, Blush pink, Pearls, Fresh flowers) with one message each way and a quote of 165000, then `GET /orders/:id` |
| `my_orders.json` | `GET /orders` for the same customer |
