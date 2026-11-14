# Kuntalamritam – Ayurvedic Hair Oil Store (React + Fake API)

*The Goodness of Ayurveda* · कुन्तलामृतम्

## Run it (Node.js 18 or newer)

```bash
npm install        # installs React, Vite and Nodemailer
npm run dev        # website + API together → http://localhost:5173
```

Production: `npm run build` then `npm start` → http://localhost:3000 (serves the built site and the API).

**Demo login:** `demo@kuntalamritam.in` / `Demo@1234` (or register a new account).

## How it works – no fake API

The browser talks to a real JSON API using `fetch()` (`src/api.js`). The API (`server/api.js`, plain Node; the only runtime dependency is **Nodemailer** for email) stores everything in JSON files in `server/data/`:

| File | Contents |
| --- | --- |
| `products.json` | catalogue + stock |
| `reviews.json` | customer ratings & reviews (15 seeded) |
| `users.json` | accounts (scrypt-hashed passwords), phone, saved addresses |
| `carts.json`, `wishlists.json` | each signed-in user's cart and wishlist |
| `orders.json` | orders, payment record (Razorpay ids, status, refunds), cancellations |
| `newsletter.json` | subscribers (status, secret unsubscribe token) |
| `campaigns.json` | newsletters sent from the admin panel (progress, failures) |
| `activity.json` | visitor & customer event log (admin Analytics / Live activity) |
| `audit.json` | record of admin changes |

Delete the contents back to `[]` / `{}` (keep `products.json` / `reviews.json`) to reset. `npm run dev` mounts the
API inside Vite, so one command starts everything. Guests keep cart/wishlist in the browser; at sign-in they are merged into the account.

| Endpoint | |
| --- | --- |
| `GET /api/products` · `GET/POST/DELETE /api/products/:id/reviews` | catalogue, ratings & reviews |
| `POST /api/auth/register/start · /resend · /verify`, `POST /api/auth/login · logout`, `GET /api/me` | accounts (email-OTP sign-up) |
| `POST /api/auth/password/forgot · /verify · /reset` | forgot password (emailed code → new password) |
| `POST /api/newsletter · /confirm · /unsubscribe · /one-click/:token` | newsletter (double opt-in, one-click unsubscribe) |
| `PATCH /api/me`, `PUT /api/me/addresses`, `POST /api/me/password` | profile |
| `GET/PUT /api/cart`, `GET/PUT /api/wishlist` | cart & wishlist |
| `GET/POST /api/orders`, `GET /api/orders/:id`, `POST /api/orders/:id/cancel` | orders |
| `POST /api/track` | anonymous visitor events |
| `/api/admin/*` | admin panel (overview, traffic, orders, products, customers, carts, reviews, newsletter, activity, live, audit, system, backup) — admin role only |

## Admin panel (`/admin`)

Sign in at **http://localhost:5173/admin** (a link also appears in the site menu for admins). In development a demo admin is created
automatically (`admin@kuntalamritam.in` / `Admin@1234`, printed in the terminal). **For a real store** put `ADMIN_EMAIL`, `ADMIN_PASSWORD`
and `MANUAL_ORDERS=1` in `.env` (see `.env.example`) and restart.

| Screen | What you can do |
| --- | --- |
| **Dashboard** | Revenue, orders, visitors, conversion, customers, live visitors; revenue / visitors / orders charts; shopping funnel; best sellers; order-status and payment splits; low-stock and open-cart alerts; latest events and orders |
| **Orders** | Search & filter; open an order → move it Placed → Packed → Shipped → Out for delivery → Delivered, cancel (stock restored; a paid online order is **refunded through Razorpay**), **refund** all or part of an online payment, re-check a payment with Razorpay, set the payment status of cash-on-delivery orders, copy address, add private notes, export CSV |
| **Payments** | Razorpay connection status (test / live, **Test connection** button), webhook set-up steps, money collected / refunded / net, COD still to collect, every transaction with its Razorpay payment id, failed refunds that need attention, CSV export |
| **Messages** | Contact-form inbox: filter new / read / replied, open a message, reply by email, delete, export CSV |
| **Products** | Add / edit / delete, **product photos (required: 1–6 per product, ✕ to delete a photo)**, price & MRP, inline stock editing, show/hide in the shop, units sold and revenue per product |
| **Customers** | All accounts, orders & spend, last seen, open carts; detail view (orders, cart, wishlist, addresses, reviews, activity); suspend / restore an account; **delete an account**; **make someone an admin / remove admin access** |
| **Reviews** | Rating summary, filter, delete spam |
| **Analytics** | Visitors, page views, traffic by hour, top pages, referrers, devices / browsers / OS, shopper searches, most carted & wishlisted products |
| **Live activity** | Who is on the site right now and a searchable, filterable log of every event (page views, cart adds, searches, sign-ins, failed logins, orders, reviews…) |
| **Newsletter** | Subscribers with status (confirmed / awaiting / unsubscribed), delete, export CSV; **write and send a newsletter** (test to yourself first), sending history with progress and failures |
| **System & audit** | Server health, **"Send test email"** button that checks your SMTP login, data-file sizes, one-click JSON backup, and an audit log of every change an admin made |

How tracking works: the storefront sends anonymous events to `POST /api/track` (random id kept in the browser, **no IP addresses or cookies**, honours
"Do Not Track", `/admin` is never tracked, bots are ignored). Order, sign-in and review events are logged by the server itself. Events are kept in
`server/data/activity.json` (newest 20,000). Admin actions go to `audit.json`.

Admin security: every `/api/admin/*` route checks the server-side session **and** `role === "admin"`; roles can only be changed by an admin from Customers → open a person (never from the public site); the owner account (`ADMIN_EMAIL`),
your own account and the last remaining admin can never be demoted or deleted; admins must be demoted before they can be deleted or suspended; password hashes are never exported; CSV exports neutralise spreadsheet-formula injection.

Orders: without `MANUAL_ORDERS=1` the demo timer still advances untouched orders automatically (so the shop can be demoed). As soon as an admin sets a
status, that order follows the admin's choice only.

## Email OTP verification at sign-up

New accounts are created **only after the person types a 6-digit code emailed to them** – this blocks fake and bot sign-ups.

1. Person enters name, email, password → server validates, hashes the password and emails a code (nothing is saved to `users.json` yet).
2. They enter the code (6 boxes, paste / mobile autofill / auto-submit) → account is created, they are signed in, and cart & wishlist are merged.

**Turn on real emails:** copy `.env.example` to `.env`, fill in your SMTP details (Gmail app-password, Brevo, SendGrid, Zoho… any SMTP) and restart. Email is sent with [Nodemailer](https://nodemailer.com) (pooled connections, TLS certificate always verified, one retry on temporary errors). Run `npm run mail:test` (or open **Admin → System & audit → Send test email**) to check the settings; the server terminal also prints `[mail] ready` or the exact problem at start-up. Gmail app passwords may be pasted with or without spaces. If port 465 is blocked on your network the mailer automatically tries 587 (and the other way round).
Without it the site runs in *demo mode* (the code is shown on screen and in the terminal) so you can test immediately.
On a live server set `NODE_ENV=production` so the code is never shown on screen.

| Protection | How |
| --- | --- |
| Code | 6 digits from a cryptographic RNG, stored only as an HMAC (never in plain text), valid 10 min, **single use** |
| Guessing | 5 wrong tries cancel the sign-up; per-IP verify limit |
| Email bombing / bots | 30 s resend gap, max 5 codes per address per hour, max 10 sign-ups per IP per hour, hidden honeypot field |
| Password | hashed (scrypt) immediately, plaintext never stored; weak passwords rejected before any email is sent |
| Mailer | Nodemailer over TLS (465) or STARTTLS (587), certificate always verified, credentials never sent unencrypted, header-injection safe |
| No bypass | the old direct "register" endpoint no longer exists |

## Emails (Nodemailer)

All emails use branded HTML templates (`server/emailTemplates.js`) with a plain-text twin, and are sent by `server/mail.js`.

| Email | When |
| --- | --- |
| Verification code | Sign-up (6 digits, 10 min, single use) |
| Reset-password code | "Forgot password?" on the sign-in page |
| Password changed alert | After changing the password in My Account **or** resetting it – with a one-click "reset it now" link if it wasn't you |
| Welcome | After the sign-up code is verified |
| Confirm your subscription | Footer newsletter form (**double opt-in** – nobody can subscribe someone else's address) |
| Newsletter welcome | After the subscriber clicks the confirm link |
| Newsletter issue | Written and sent from **Admin → Newsletter** |

Set `SITE_URL=https://your-domain` in `.env` on a live server so the links inside emails point to your website.

### Forgot / change password
- **Forgot password** (`/forgot-password`): email → 6-digit code → new password. The answer is identical for unknown emails (no account enumeration),
  codes are single-use with 5 tries, and a successful reset signs the user out everywhere, clears any login lock-out and emails an alert.
- **Change password** (My Account): needs the current password, must differ from it, signs out other devices and emails an alert.

### Newsletter
- Footer form → confirmation email → subscriber confirmed. Every issue contains an Unsubscribe link and the `List-Unsubscribe` one-click
  header (Gmail / Apple Mail show their own Unsubscribe button). Unsubscribed people are kept on file as "unsubscribed" so they are never mailed again.
- **Admin → Newsletter → Send newsletter**: subject, heading, message, optional button, **Send test to me**, then send to all confirmed
  subscribers. Sending runs in the background (`MAIL_RATE_MS` between mails); progress and failures are shown in *History*.
- Without SMTP (demo mode) the footer form subscribes instantly and emails are printed in the terminal.
- Gmail limits sending to roughly 500 mails a day. For a big list use a transactional provider (Brevo, Amazon SES, SendGrid) with the same SMTP settings.

## Features

- Home with brand hero, highlights, "Why Kuntalamritam?", the 12 ingredients, directions / storage / caution, badges
- Shop with search & sort; product pages with details, **star ratings and customer reviews** (write / edit / delete, verified-purchase badge)
- **Cart**, **Wishlist**, **Proceed to Buy**; cart & wishlist saved per account in JSON
- Register with **email OTP verification**, Sign in / Sign out, protected pages, **My Account** (profile, mobile number, saved addresses, change password)
- **Home delivery** (Standard / Express with estimated dates) and **secure online payment with Razorpay** (UPI, cards, netbanking, wallets) or Cash on Delivery
- **Orders**: list, **order details**, live **tracking**, **cancel** (within 5 min, with refund status), **Buy again**, printable **receipt / invoice** (Print / Save as PDF)

## Contact page, social links & password reset

- **Contact Us** (`/contact`, also in the menu and footer): name, email, optional mobile, topic, optional order number and message. It is validated, rate-limited and has a hidden anti-bot field.
  Each message is saved (**Admin → Messages**: new / read / replied, reply by email, delete, CSV export), emailed to `CONTACT_EMAIL` with *reply-to* set to the customer, and the customer gets an automatic "we received it" email.
- **Social icons** (Instagram, Facebook, YouTube, X, WhatsApp) appear in the footer and on the Contact page. Put your real page links, phone, email and address in `.env` (`SOCIAL_*`, `CONTACT_*`) and restart; no rebuild needed. Icons whose link is empty go to the platform's home page.
- **Forgot password** now checks the email against the registered customers: an unknown address gets "No account was found with this email" (with a *Create an account* link), a suspended account is told to contact you, and a registered one receives the 6-digit code. It is still rate-limited per email and per network.

## Online payments (Razorpay)

Customers pick **Pay online** or **Cash on Delivery** at checkout. Online payment opens Razorpay's own secure window, so card / UPI / bank details are
typed into Razorpay – **they never reach this website or its server**, which keeps you out of PCI-DSS card-data scope.

**Set-up (2 minutes)** – put the keys from *Razorpay Dashboard → Account & Settings → API keys* in `.env` and restart:

```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=any-long-random-text      # see "Webhook" below
```

The terminal then prints `[razorpay] ready – TEST mode`. Open **Admin → Payments → Test connection** to double-check. Without keys the shop simply offers Cash on Delivery.

**How a payment is kept trustworthy**

1. The **server** prices the order and creates the Razorpay order (amount in paise). The browser can never choose what to pay.
2. After paying, the browser sends Razorpay's signed result to `/api/payments/verify`. The server checks the **HMAC-SHA256 signature** (timing-safe), then **re-reads the payment from Razorpay** and confirms order id, amount, currency and status before marking the order **PAID**.
3. Three independent routes confirm a payment, any one is enough, all are idempotent: the browser callback, Razorpay's **signed webhook**, and a background **reconciliation** job that asks Razorpay about unpaid orders (covers closed tabs and dropped webhooks). A customer can never be charged twice for one order (the same gateway order is reused on retry).
4. Stock is held for 20 minutes while the customer pays, then released. If a payment still arrives for an order that was cancelled or expired, it is **refunded automatically**.
5. Cancelling a paid order refunds the money through Razorpay; admins can also refund partly or fully, with a reason. Every refund is written to the audit log; a failed refund is flagged in red for a retry.
6. The key **secret** and webhook secret live only in `.env` on the server (never in the browser, a data file, a log, an API response or a backup). Strict CSP allows only Razorpay's own domains; HSTS is sent on HTTPS.
7. Customers get an order / payment confirmation email, a printable receipt with the Razorpay payment id, and a "Complete your payment" button if they closed the window.

**Webhook (recommended)** – *Razorpay Dashboard → Account & Settings → Webhooks → Add*: URL `https://your-domain/api/payments/webhook`, secret = your `RAZORPAY_WEBHOOK_SECRET`,
events `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed`, `refund.failed`. It needs a public https address
(for local testing use a tunnel such as ngrok); without it everything still works through the verify + reconciliation routes. *Admin → Payments* shows the exact URL and the last event received.

**Test mode** – with `rzp_test_` keys no real money moves. Test card `4111 1111 1111 1111` (any future expiry, any CVV, any OTP), test UPI `success@razorpay` (succeeds) or `failure@razorpay` (fails).
More: <https://razorpay.com/docs/payments/payments/test-card-details/>

**Going live** – (1) complete Razorpay KYC and generate **live** keys, (2) serve the site over **HTTPS**, (3) in `.env` set `rzp_live_…` keys, `SITE_URL=https://your-domain`, `NODE_ENV=production`, `TRUST_PROXY=1` (behind nginx / Cloudflare) and `MANUAL_ORDERS=1`,
(4) add the webhook above with the live-mode secret, (5) make one small real payment and refund it. Admin → Payments shows a red warning if live keys run without HTTPS.
Treat the key secret like a password: if it was ever pasted into a chat, email or screenshot, **regenerate it** in the Razorpay dashboard.

**Automated tests** – `npm run test:payments` runs the real server code against a local fake of the Razorpay API (forged signatures, wrong amounts, webhooks, retries, late payments, refunds, admin permissions). No network, no money.

| Endpoint | |
| --- | --- |
| `GET /api/payments/config` | is online payment available (and in which mode) |
| `POST /api/orders` | place an order; for `payment: "ONLINE"` returns the Razorpay checkout details |
| `POST /api/payments/verify` | verify the signed result of a payment |
| `POST /api/orders/:id/pay` | re-open payment for a still-unpaid order |
| `POST /api/payments/webhook` | Razorpay → server (signature required) |
| `GET /api/admin/payments`, `POST /api/admin/payments/test`, `POST /api/admin/orders/:id/refund`, `POST /api/admin/orders/:id/sync` | admin only |

## Shipping with Shiprocket (Admin → Shipping)

1. Shiprocket → **Settings → API → Configure → Create an API User** (use a new email, not your main login).
2. Put it in `.env`: `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, and `SHIPROCKET_PICKUP` (exact pickup-address name, default `Primary`). Restart.
3. Admin → Shipping → **Test connection**. Keep some balance in your Shiprocket wallet – shipping charges are deducted from it.

Then: open **Ship…** on an order, pick a courier (cheapest / fastest / Shiprocket's pick are tagged) and press **Ship now**. The site creates the
Shiprocket order, books the courier, schedules the pickup and saves the label. Tick several orders and press **Smart ship** to do them all with your
default strategy (Shiprocket pick, cheapest, fastest or balanced – set in the same page). Customers see the courier, tracking number and a live-tracking
link on their order page, and their status moves along by itself (the site checks Shiprocket every 20 minutes; add the optional webhook for instant updates).
Cancelling an order also cancels its Shiprocket booking. For cash-on-delivery parcels the courier collects the order total (items − coupon + delivery charge).
Tests: `npm run test:shipping` (runs against a local fake of Shiprocket).

## Gallery page (Admin → Gallery)

The public **Gallery** page (`/gallery`, linked in the menu and footer) shows photos and videos that you manage in **Admin → Gallery**:

- **Add photos** (JPG/PNG/WebP, several at once, resized automatically), **Upload a video** (MP4 or WebM, up to 50 MB; a cover picture is taken from the video
  automatically) or **paste a YouTube link** (best for long videos – nothing stored on your server).
- Give each item an optional title, caption and a link to a product ("View product" button). **← →** reorder, **Hide** takes it off the website without
  deleting it, **Delete** erases it (and its files) for good.
- Safety: only admins can upload; videos are checked by their real contents (not the file name), size-limited and stored under random names; YouTube links
  are reduced to the 11-character video id and played via youtube-nocookie.com. The gallery is included in the admin backup.
- Change the video size limit with `GALLERY_VIDEO_MAX_MB` in `.env`. If the site is behind nginx, raise `client_max_body_size` (e.g. `60m`) or video uploads will fail.
- Tests: `npm run test:gallery`.

## Security

| Area | What is done |
| --- | --- |
| Sessions | Random token in an **HttpOnly, SameSite=Strict** cookie (JavaScript cannot read it); 30-min idle timeout; revoked on logout |
| Passwords | scrypt + per-user salt on the server; constant-time compare; changing it signs out other devices |
| Brute force | 5 failed logins → 60 s lockout; same error for unknown email / wrong password |
| Authorisation | Every private endpoint checks the session; users can only read their own orders/cart/addresses |
| Prices | Browser sends only product ids & quantities; the server prices the order, shipping and stock |
| Input | Validated on both sides (shared `shared/validate.js`) and sanitised; body-size limit |
| CSRF | SameSite=Strict + same-origin check + JSON-only requests |
| XSS | No `dangerouslySetInnerHTML`; production CSP (`script-src 'self'`, `object-src 'none'`…); review text stripped of markup |
| Payments | Razorpay-hosted checkout (no card / UPI data on our side); server-side pricing; HMAC-verified callbacks and webhooks; amount, currency and status re-checked with Razorpay; idempotent confirmation; rate-limited verify / order endpoints; refunds audit-logged; key secret only in `.env` |
| Static files | `server/data` is never served over HTTP; path traversal blocked; nosniff / X-Frame-Options headers |

> Note: JSON files are fine for a small store but are not a production database. For a busy live store move to PostgreSQL / MongoDB, always use HTTPS,
> and keep regular backups (Admin → System & audit → Download backup).


## Fill in your own details

The label's MRP, batch no., licence no., manufacturer address, customer-care number and email were blank in the design.
Add them to `src/components/Footer.jsx` and `src/components/ProductInfo.jsx`.

## Responsive & performance notes
- Tested at 320, 360, 375, 390 (iPhone 12/13/14), 414, 768, 1024 and 1440 px: no horizontal overflow, cart/wishlist icons always visible.
- On phones the account links move into the ☰ menu so the cart and wishlist icons always have room.
- Bottle-label text is pinned to the label width (SVG `textLength`) so it can't overflow on any font.
- Routes are lazy-loaded (only the home page ships in the first download); React/router sit in a separate cached `vendor` chunk.
- Fonts trimmed to 3 families / 4 weights, and the Hindi font is subset to just the brand name.
- Shared catalogue cache, gzip + long-cache headers on the production server, no dead code or unused CSS.




## Troubleshooting
- Open **http://localhost:5173** (the URL Vite prints). Run commands inside the folder that contains `package.json`.
- If a page ever crashes, an on-screen error box now shows the message instead of a blank page; press F12 → Console for details.
- To reset demo data, restore `server/data/*.json` (users/orders `[]`, carts/wishlists/ `{}`).


## Product photos

Every new product needs at least one photo (up to 6) in **Admin → Products → Add product**. The first photo is the main one;
use the ← → buttons to reorder. In the browser each photo is checked (JPG/PNG/WebP, 10 MB max, at least 600×600 px), resized
without cropping and saved twice: a 1200 px image for the product page and a 400 px thumbnail for shop cards, the cart and the
admin list. The server re-checks the file type and size and stores the files in `server/data/uploads/` (served at `/uploads/…`).
Press **✕** on a photo to delete it (with a *Delete / Keep* confirmation). A photo you just uploaded is erased from the server immediately; a photo that belongs to a saved product is removed when you press *Save product* (an *Undo* link appears until then). Cancelling the form erases photos uploaded in it. Deleting a product deletes all its files. Products created before this feature show the drawn bottle until a
photo is added; the admin list marks them "No photo".

**Back up `server/data/uploads/` together with the JSON files** (the "Download backup" button exports data only, not images).
