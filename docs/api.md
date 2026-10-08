# API contract

The mobile app and the dashboard both build against this file, so **update it in the same pull request as any endpoint change**.

- Base URL (local): `http://localhost:4000/api`
- Body format: JSON
- Money: whole Uganda shillings as integers (`amountUgx: 85000`)
- Dates: ISO 8601 strings (`"2026-11-02T14:00:00.000Z"`)

## Authentication

Clients sign in with Firebase Authentication and send the Firebase ID token on every request:

```
Authorization: Bearer <firebase-id-token>
```

The first authenticated request creates a `CUSTOMER` user record. Staff accounts are promoted by setting `role = 'STAFF'` in the database (see `backend/README.md`).

**Local development without Firebase:** with `AUTH_DEV_BYPASS=true` in `backend/.env`, send `x-dev-user: <any-id>` instead of a token. Add `x-dev-role: STAFF` to act as staff. This is disabled when `NODE_ENV=production`.

Errors always look like `{ "error": "message" }`, with `details` added for validation errors (HTTP 400).

## Endpoints

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/health` | anyone | Liveness check |
| GET | `/users/me` | signed in | Current user, including `role` |
| POST | `/users/me/fcm-tokens` | signed in | Register a device/browser for push notifications: `{ "token": "..." }` |
| GET | `/products` | anyone | Active products (cakes and add-ons) |
| POST | `/products` | staff | Create a product |
| PATCH | `/products/:id` | staff | Update a product (e.g. `{ "isActive": false }`) |
| GET | `/orders` | signed in | Customers get their own orders; staff get all. Optional `?status=SUBMITTED` |
| POST | `/orders` | customer | Submit an order (body below) |
| GET | `/orders/:id` | owner or staff | Order with items, images, quotations and comments |
| PATCH | `/orders/:id/status` | staff | `{ "status": "PREPARING" }` |
| POST | `/orders/:id/quotations` | staff | `{ "amountUgx": 85000, "note": "..." }` |
| PATCH | `/orders/:id/payment` | staff | `{ "paymentStatus": "DEPOSIT_PAID", "paymentMethod": "MOBILE_MONEY", "amountPaidUgx": 40000 }` |
| GET | `/orders/:id/comments` | owner or staff | Order notes thread |
| POST | `/orders/:id/comments` | owner or staff | `{ "body": "Can the writing be gold?" }` |

### Order status flow

```
SUBMITTED → CONFIRMED → PREPARING → READY → COMPLETED
     (any stage can move to CANCELLED)
```

### `POST /orders` body

Only `type`, `dueDate` and `fulfilment` are required, so a customer who is unsure about the design can leave the rest to the bakery.

```json
{
  "type": "CUSTOM",
  "occasion": "Birthday",
  "flavour": "Vanilla",
  "icing": "Buttercream",
  "size": "2 kg",
  "colours": "Pink and gold",
  "theme": "Butterflies",
  "inscription": "Happy 5th Birthday Amara",
  "notes": "Nut-free please",
  "budgetUgx": 120000,
  "dueDate": "2026-11-02T14:00:00.000Z",
  "fulfilment": "DELIVERY",
  "deliveryAddress": "Plot 12, Ntinda",
  "items": [{ "productId": "clx...", "quantity": 1 }],
  "inspirationImageUrls": ["https://firebasestorage.googleapis.com/..."]
}
```

Values: `type` is `STANDARD`, `CUSTOM` or `BULK`. `fulfilment` is `PICKUP` or `DELIVERY`. `paymentStatus` is `UNPAID`, `DEPOSIT_PAID` or `PAID`. `paymentMethod` is `CASH` or `MOBILE_MONEY`.

Inspiration images are compressed on the phone and uploaded straight to Firebase Storage. The API only stores their URLs, at most 5 per order.
