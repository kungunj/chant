# SparesHub

A marketplace where technicians in Kenya buy and sell spares and used parts for dead electronics:
laptops, TVs, radios, phones, car electronics and more.

- **Search** by product name or part/product number. Part numbers match regardless of case, spaces or
  dashes, so `bn4400807a` finds `BN44-00807A`.
- **Technician stores**: sellers open a store, post products (part number, brand, fits-model, condition,
  price, stock, photos) and edit or delete them.
- **M-Pesa checkout** via Safaricom Daraja STK Push. The buyer gets a PIN prompt on their phone; the
  order is marked paid when Safaricom calls back (or when a status query confirms it).
- **Delivery tracking** for Posta Kenya and Fargo Courier, with a public "Track parcel" page.

## Stack

Next.js 15 (App Router, server actions) · TypeScript · Tailwind CSS 4 · PostgreSQL with Prisma · Vitest.

## Running locally

```bash
cp .env.example .env          # then edit DATABASE_URL and AUTH_SECRET
npm install
npx prisma migrate dev        # creates the tables
npm run db:seed               # demo store and products
npm run dev
```

Demo logins after seeding: `tech@example.com` (seller) and `buyer@example.com` (buyer), password `password123`.

With `MPESA_MOCK=true` (the default in `.env.example`) checkout works without Safaricom credentials: the
STK push is simulated and the payment succeeds a few seconds later.

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## M-Pesa (Daraja) setup

1. Create an app on <https://developer.safaricom.co.ke> with **M-Pesa Express** enabled.
2. Set `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY` and `MPESA_SHORTCODE`
   (sandbox shortcode `174379`), and set `MPESA_MOCK=false`.
3. Safaricom must reach the callback over public HTTPS at `APP_URL/api/mpesa/callback`. Locally, use a
   tunnel (e.g. ngrok) and set `MPESA_CALLBACK_URL`.
4. Set `MPESA_CALLBACK_TOKEN` to a random string; callbacks without it are rejected.
5. For production set `MPESA_ENV=production`, your own paybill/till and passkey, and use
   `MPESA_TRANSACTION_TYPE=CustomerBuyGoodsOnline` for a till number.

One checkout can include items from several stores. It is paid with one STK push into the platform's
paybill and split into one order per store. Paying sellers out (B2C or manual settlement) is not built yet.

## Courier tracking

Neither Posta Kenya nor Fargo Courier publishes an open tracking API, so tracking works like this:

- When a seller ships a paid order they enter the courier and the waybill/tracking number.
- The seller posts status updates (in transit, arrived at branch, out for delivery, delivered) copied
  from the courier; the buyer sees them as a timeline and can confirm delivery themselves.
- `src/lib/couriers` is pluggable. If you get API access from either courier, set
  `POSTA_TRACKING_API_URL` / `FARGO_TRACKING_API_URL` (and the matching `_API_KEY`) and adjust `parse` in
  `src/lib/couriers/http.ts` to their response format. Shipments then sync automatically (at most every
  10 minutes, when the order or track page is viewed) and free-text statuses are mapped onto ours.

## Not built yet

- Photo uploads: sellers paste https image links for now. Hook up object storage (S3, Cloudinary,
  Supabase Storage) for direct uploads.
- Seller payouts, delivery fees, reviews/ratings, buyer–seller messaging, admin moderation, email/SMS
  notifications, password reset.
