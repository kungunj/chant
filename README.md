# SparesHub

A marketplace where technicians in Kenya buy and sell spares and used parts for dead electronics:
laptops, TVs, radios, phones, car electronics and more.

- **Search** by product name or part/product number. Part numbers match regardless of case, spaces or
  dashes, so `bn4400807a` finds `BN44-00807A`.
- **Verified technician stores**: sellers open a store, upload their ID (national ID, passport or alien ID)
  and a selfie, and a SparesHub moderator approves the store before it or its products become public.
  Sellers can post, edit and delete products while waiting.
- **M-Pesa checkout** via Safaricom Daraja STK Push. The buyer gets a PIN prompt on their phone; the
  order is marked paid when Safaricom calls back (or when a status query confirms it).
- **Escrow wallet**: the buyer's money is held by SparesHub and only moves to the seller's wallet when the
  buyer confirms they received the item. Sellers withdraw their wallet balance to M-Pesa.
- **Disputes with a moderator**: buyer or seller can open a dispute while money is in escrow. That opens a
  three-way chat with a moderator, who decides how much to refund the buyer and how much to release.
- **Delivery** by Posta Kenya or Fargo Courier, with per-store delivery fees, a tracking timeline and a
  public "Track parcel" page.
- **Product photos** uploaded from the phone (resized, location data stripped), reviews and star ratings
  for stores, cancellations with automatic refunds, in-app and SMS notifications, and password reset by
  SMS code.

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

Demo logins after seeding (password `password123`): `tech@example.com` (approved seller),
`buyer@example.com` (buyer) and `admin@example.com` (moderator). To make an existing account a moderator:
`npm run make-admin -- someone@example.com`.

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
paybill and split into one order per store, each with that store's delivery fee for the chosen courier.

## Store verification

1. A technician signs up, creates their store and is sent to **Verify your identity**.
2. They upload ID front, ID back (not for passports), a selfie holding the ID and optionally a business
   permit. Files are checked by their actual content (JPG, PNG, WebP or PDF, max 5 MB each) and stored
   privately in `UPLOAD_DIR`, never under `public/`. Only the store owner and moderators can open them.
3. Moderators see the queue at **Admin → Store approvals**, view the documents and approve or reject with a
   note. A rejected seller sees the note and can resubmit. Approved stores can later be suspended, which
   hides them and their products immediately.

On a host without a persistent private disk (Netlify, Vercel), set `STORAGE_DRIVER=database` to keep the
files in Postgres instead, or replace the functions in `src/lib/storage.ts` with a private bucket.

## Escrow, wallet and withdrawals

- When M-Pesa confirms a payment, each order's money (items plus delivery fee) is marked **held in escrow**.
- The buyer releases it with **"I received it, release payment"**. A seller or courier marking a parcel
  delivered does *not* release money; it starts a timer instead: if the buyer neither confirms nor opens a
  dispute within `ESCROW_AUTO_RELEASE_DAYS` (default 7, `0` turns it off), the money is released
  automatically. The buyer is told this by SMS when the parcel is marked delivered.
- Auto-release runs from `GET /api/cron/escrow` with `Authorization: Bearer $CRON_SECRET`. Call it hourly
  from any scheduler; `vercel.json` schedules it on Vercel (Hobby plans only allow daily crons).
- Paid orders that have not shipped can be cancelled by the buyer or the seller, refunding the buyer in
  full to their wallet and returning the stock.
- Released money (minus `PLATFORM_COMMISSION_PERCENT`, default 0) is credited to the seller's wallet.
  The wallet is an append-only ledger, so every shilling has an entry tied to an order or withdrawal.
- Sellers (and buyers with refunds) request a withdrawal to M-Pesa from **Wallet**. Moderators pay it out
  at **Admin → Withdrawals** and record the M-Pesa transaction code, or reject it, which returns the money
  to the wallet.

All money is collected into the SparesHub paybill, so the escrow is the platform's own M-Pesa balance;
make sure the business account and terms of service cover holding customer funds.

## Disputes

While an order's money is in escrow, the buyer or the seller can **open a dispute** from the order page. The
escrow is frozen (the buyer can no longer release it) and a chat opens between buyer, seller and the
SparesHub moderators, refreshing every few seconds. Moderators find open disputes under **Admin → Disputes**
and resolve them by choosing how much to refund the buyer (0 to the full amount); the rest goes to the
seller. Refunds land in the buyer's wallet and can be withdrawn to M-Pesa.

## Courier tracking

Neither Posta Kenya nor Fargo Courier publishes an open tracking API, so tracking works like this:

- When a seller ships a paid order they enter the courier and the waybill/tracking number.
- The seller posts status updates (in transit, arrived at branch, out for delivery, delivered) copied
  from the courier; the buyer sees them as a timeline and can confirm delivery themselves.
- `src/lib/couriers` is pluggable. If you get API access from either courier, set
  `POSTA_TRACKING_API_URL` / `FARGO_TRACKING_API_URL` (and the matching `_API_KEY`) and adjust `parse` in
  `src/lib/couriers/http.ts` to their response format. Shipments then sync automatically (at most every
  10 minutes, when the order or track page is viewed) and free-text statuses are mapped onto ours.

## Notifications

Every important event creates an in-app notification (the **Alerts** link in the header): new paid order,
shipped, tracking updates, payment released, dispute opened / new message / resolved, store approved or
rejected, withdrawal sent or rejected. Events that need action also go out by SMS through
[Africa's Talking](https://africastalking.com) when `AT_USERNAME` and `AT_API_KEY` are set
(`AT_USERNAME=sandbox` for testing). Without them, SMS are skipped and logged.

Forgotten passwords are reset with a 6-digit code sent by SMS to the phone on the account (valid 15 minutes,
5 tries, 3 codes an hour), so SMS must be configured in production for password reset to work. Logins
lock for 15 minutes after 8 wrong passwords for an email.

## Photos and files

Product photos are re-encoded to WebP at most 1600px with [sharp](https://sharp.pixelplumbing.com), which
also strips EXIF data such as the GPS location of the technician's workshop. They are stored under
`UPLOAD_DIR/public` and served from `/api/images/...`. ID documents live in `UPLOAD_DIR` and are only served
to their owner and moderators. Use a persistent disk for `UPLOAD_DIR`, set `STORAGE_DRIVER=database` to store
files in Postgres, or swap the functions in `src/lib/storage.ts` for object storage.

## Deploying

Any Node host with PostgreSQL works (Railway, Render, a VPS, or Netlify/Vercel with
`STORAGE_DRIVER=database`; serverless hosts cap request bodies at about 6 MB, which limits photos per upload). Set the variables from `.env.example`, run `npx prisma migrate deploy`, then
`npm run build && npm start`. CI (`.github/workflows/ci.yml`) runs lint, type checks, unit tests and a build
against Postgres on every pull request.

## Not built yet

- Automatic M-Pesa B2C payouts: withdrawals are paid by a moderator from the M-Pesa business account and
  the transaction code recorded. Daraja B2C needs a separate Safaricom approval.
- Buyer–seller chat outside disputes, email notifications, admin user management and reports.
