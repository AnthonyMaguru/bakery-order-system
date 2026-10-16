# API contract

The mobile app and the dashboard both build against this file, so **update it in the same pull request as any endpoint change**.

- Base URL (local): `http://localhost:4000/api`
- Body format: JSON
- Money: whole units of the bakery's currency, as integers (`"amount": 165000`, `"currency": "UGX"`). Show it as `UGX 165,000`.
- Dates: ISO 8601 date times (`"2026-11-07T14:00:00.000+03:00"`). Calendar days are `YYYY-MM-DD` in the bakery's timezone.
- Order numbers: show `number` as `BK` followed by the number, for example `BK1043`.

## Authentication

Clients sign in with Firebase Authentication and send the Firebase ID token on every request:

```
Authorization: Bearer <firebase-id-token>
```

The first authenticated request creates the user. Everyone is a customer; a user is bakery **staff** when they are a member of that bakery (`OWNER` or `STAFF`). `GET /users/me` lists the bakeries a user works for.

**Local development without Firebase:** with `AUTH_DEV_BYPASS=true` in `backend/.env`, send `x-dev-user: <any-id>` instead of a token.

| Header | Effect |
|---|---|
| `x-dev-user: amara` | Signs in as the customer `amara` |
| `x-dev-role: STAFF` | Also makes them an owner of the seeded Sweet Crumbs Bakery |
| `x-dev-bakery: mamas-oven` | With `STAFF`, joins that bakery instead |
| `x-dev-role: ADMIN` | Platform admin: acts as staff of every bakery |

This is disabled when `NODE_ENV=production`.

Errors always look like `{ "error": "message" }`, with `details` added for validation errors. The message is written for people, so the app can show it as it is.

| Status | Meaning |
|---|---|
| 400 | The request is wrong, for example a missing delivery address |
| 401 | Not signed in |
| 403 | Signed in, but not allowed (for example a customer calling a staff endpoint) |
| 404 | Not found. Orders you can't see also return 404 |
| 409 | Valid, but clashes with the current state: a full day, an order already cancelled, a newer quote |

## How orders work

```
Ready made (STANDARD):   SUBMITTED → CONFIRMED → PREPARING → READY → COMPLETED
Custom and BULK:         SUBMITTED → QUOTED → CONFIRMED → PREPARING → READY → COMPLETED
                         (any open order can be CANCELLED)
```

- **Ready made** orders are priced straight away (`total` = products plus delivery fee). Staff confirm them.
- **Custom and bulk** orders get an `estimate` from the builder prices. Staff send a quote, the order becomes `QUOTED`, and it is only `CONFIRMED` when the **customer accepts** the latest quote. `total` is then the accepted amount.
- Staff move a confirmed order forward one step at a time.
- Customers can cancel until the bakery starts making the cake (`PREPARING`). Staff can cancel any open order, and must give a reason.
- **Capacity:** each custom or bulk order uses one of the bakery's daily slots on its due day. Closed weekdays, blocked dates, days within the notice period and full days are refused with 409. Ready made orders only need the product's `leadTimeDays` and an open day.
- **Payments** are records only; money never goes through the system. `paymentStatus` is worked out from the payments: `UNPAID`, `DEPOSIT_PAID` or `PAID`.

## Endpoints

### Bakeries (public)

| Method | Path | Purpose |
|---|---|---|
| GET | `/bakeries?area=Ntinda&country=UG&q=` | Active bakeries, soonest available first. `area` keeps bakeries that deliver there |
| GET | `/bakeries/:bakeryId` | One bakery. Accepts the id or the slug (`sweet-crumbs`) |
| GET | `/bakeries/:bakeryId/availability?from=2026-11-01&days=42` | Custom order calendar, at most 92 days |
| GET | `/bakeries/:bakeryId/products?category=CAKE` | Products customers can order |
| GET | `/bakeries/:bakeryId/products/:productId` | One product |
| GET | `/bakeries/:bakeryId/builder?category=CAKE` | Cake builder groups and the options customers can pick right now |

A bakery in the list includes `cakesFrom` (cheapest cake) and `nextCustomDate` (first day a custom cake could be due).

Availability returns one entry per day:

```json
{ "date": "2026-11-07", "status": "OPEN", "booked": 1, "limit": 4 }
```

`status` is `OPEN`, `FULL`, `CLOSED`, `BLOCKED` or `TOO_SOON`.

The builder returns groups in display order. Options whose linked stock has run out, or that staff switched off, are left out:

```json
[
  {
    "id": "grp_…", "kind": "DECORATION", "name": "Decorations", "multiple": true, "required": false,
    "options": [{ "id": "opt_…", "name": "Pearls", "price": 10000, "value": "pearls", "serves": null, "imageUrl": null }]
  }
]
```

`kind` tells the app how to draw the preview: `SHAPE` (`value` is `ROUND` or `SQUARE`), `TIERS` (`value` is the number), `SIZE` (`serves` is filled in), `FLAVOUR`, `ICING_COLOUR` (`value` is a colour like `#F5B8C9`), `DECORATION` (`value` names the decoration) and `OTHER`.

### Orders (signed in)

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/orders?status=QUOTED` | customer | Your own orders |
| POST | `/orders` | customer | Place an order (body below). 201 when created, 200 when the same `clientRequestId` was already saved |
| GET | `/orders/:id` | customer or staff | Order with items, builder choices, photos, quotes, payments and messages |
| POST | `/orders/:id/accept-quote` | customer | `{ "quotationId": "…" }`, the latest quote. 409 if the bakery has sent a newer one |
| POST | `/orders/:id/cancel` | customer or staff | `{ "reason": "…" }`, required for staff |
| PATCH | `/orders/:id/status` | staff | `{ "status": "PREPARING" }`, the next step only |
| POST | `/orders/:id/quotations` | staff | `{ "amount": 165000, "note": "…" }`. Sets the order to `QUOTED` |
| POST | `/orders/:id/payments` | staff | `{ "amount": 80000, "method": "MOBILE_MONEY", "note": "…" }` |
| DELETE | `/orders/:id/payments/:paymentId` | staff | Remove a payment entered by mistake |
| GET | `/orders/:id/comments` | customer or staff | Messages, oldest first. `fromBakery` marks the bakery's |
| POST | `/orders/:id/comments` | customer or staff | `{ "body": "Can the writing be gold?" }` |

#### `POST /orders` body

Only `bakeryId`, `type`, `dueDate` and `fulfilment` are always required, so a customer who is unsure can leave the design to the bakery.

```json
{
  "bakeryId": "clx…",
  "clientRequestId": "6f1c2e0a-5b7d-4e5f-9a51-3c2b1d0e9f88",
  "type": "CUSTOM",
  "occasion": "Birthday",
  "inscription": "Happy 5th Birthday Amara",
  "theme": "Butterflies",
  "notes": "No nuts please",
  "budget": 120000,
  "dueDate": "2026-11-07T14:00:00+03:00",
  "fulfilment": "DELIVERY",
  "deliveryArea": "Ntinda",
  "deliveryAddress": "Plot 12, Ntinda",
  "optionIds": ["opt_round", "opt_2tiers", "opt_2kg", "opt_vanilla", "opt_pink", "opt_pearls"],
  "designImageUrl": "https://firebasestorage.googleapis.com/…",
  "items": [],
  "inspirationImageUrls": ["https://firebasestorage.googleapis.com/…"]
}
```

- `type`: `STANDARD` (ready made, needs `items`, no `optionIds`), `CUSTOM` or `BULK`.
- `clientRequestId`: make a new random id (a UUID) for each order the customer places, and **keep it when retrying**. If the phone lost its connection and sends the order again, the API returns the first order instead of saving a second one.
- `deliveryArea` must be one of the bakery's `deliveryAreas`. `DELIVERY` also needs `deliveryAddress`.
- `optionIds` come from the builder. Only one option per group unless the group is `multiple`, and required groups need a choice.
- `items` with a customisable product on a `CUSTOM` order means "based on this cake".
- `designImageUrl` is a picture of the builder preview. Images are compressed on the phone and uploaded straight to Firebase Storage; the API only stores their URLs, at most 5 inspiration photos per order.

### Users

| Method | Path | Purpose |
|---|---|---|
| GET | `/users/me` | Current user, plus `bakeries: [{ id, slug, name, memberRole }]` for staff |
| PATCH | `/users/me` | `{ "name": "…", "phone": "…" }` |
| POST | `/users/me/fcm-tokens` | Register a device or browser for push notifications: `{ "token": "…" }` |

### Bakery staff (dashboard)

All need a signed in member of the bakery. **Owner** means `OWNER` only.

| Method | Path | Purpose |
|---|---|---|
| GET | `/bakeries/:bakeryId/orders?status=&from=&to=&q=` | The bakery's orders, soonest due first. `q` searches customer name, phone or `BK1043` |
| GET | `/bakeries/:bakeryId/orders/summary` | `{ counts: { SUBMITTED: 2, … }, needsAttention: 2 }`: open orders due within 48 hours and untouched for a day |
| GET | `/bakeries/:bakeryId/settings` | All settings, including capacity rules |
| PATCH | `/bakeries/:bakeryId` | Owner. Profile, `deliveryAreas`, `deliveryFee`, `pickupAvailable`, payment methods, `customCakesPerDay`, `customNoticeDays`, `closedWeekdays` (1 is Monday, 7 is Sunday) |
| GET | `/bakeries/:bakeryId/products?all=true` | Includes hidden products |
| POST | `/bakeries/:bakeryId/products` | `{ name, category, price, description?, sizeLabel?, serves?, leadTimeDays?, customisable?, imageUrl? }` |
| PATCH | `/bakeries/:bakeryId/products/:productId` | Any of those fields, or `{ "isActive": false }` to hide |
| GET | `/bakeries/:bakeryId/option-groups` | Every builder option, with `available`, `hiddenBecause` and its stock |
| POST | `/bakeries/:bakeryId/option-groups` | `{ kind, name, multiple?, required?, position? }` |
| PATCH | `/bakeries/:bakeryId/option-groups/:groupId` | Any of those fields |
| POST | `/bakeries/:bakeryId/option-groups/:groupId/options` | `{ name, price?, value?, serves?, stockItemId?, isActive?, position? }` |
| PATCH | `/bakeries/:bakeryId/options/:optionId` | Any of those fields |
| GET | `/bakeries/:bakeryId/stock` | Stock items with `level`: `OK`, `LOW` or `OUT`, and the options linked to each |
| POST | `/bakeries/:bakeryId/stock` | `{ name, unit, quantity?, lowAt? }` |
| PATCH | `/bakeries/:bakeryId/stock/:itemId` | For example `{ "quantity": 12 }` after restocking |
| DELETE | `/bakeries/:bakeryId/stock/:itemId` | Linked options stay, no longer tied to stock |
| GET | `/bakeries/:bakeryId/blocked-dates` | Upcoming days the bakery takes no orders |
| POST | `/bakeries/:bakeryId/blocked-dates` | `{ "date": "2026-10-28", "reason": "Staff training" }` |
| DELETE | `/bakeries/:bakeryId/blocked-dates/:blockedDateId` | Open the day again |
| GET | `/bakeries/:bakeryId/members` | Staff list |
| POST | `/bakeries/:bakeryId/members` | Owner. `{ "email": "…", "role": "STAFF" }`. The person must have signed in once |
| DELETE | `/bakeries/:bakeryId/members/:memberId` | Owner. The last owner can't be removed |

### Health

`GET /health` returns `{ "status": "ok" }`.
