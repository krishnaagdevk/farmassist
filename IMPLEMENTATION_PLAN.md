# Implementation Plan — AgriDirect: Farmer-to-Consumer Marketplace with Logistics + AI

**Read `AUDIT.md` first.** It establishes that the marketplace, logistics, and AI capabilities
in the problem statement do not exist yet, and lists 12 runtime crashes and 2 critical security
holes in the existing advisory app.

This document is the executable spec. Follow phases in order. Every phase has a
**Definition of Done** — do not start the next phase until the current one passes it.

---

## 0. Ground rules for the implementer

1. **Do not rewrite what works.** Reuse `backend/middleware/auth.js`, `backend/routes/auth.js`,
   `backend/services/llm.js`, and the existing CSS. Extend, don't replace.
2. **One API base.** Delete every hardcoded `http://localhost:5000`. Single source:
   `Frontend/src/lib/api.js` reading `import.meta.env.VITE_API_BASE`.
3. **No secret may ever be prefixed `VITE_`.** Vite inlines those into the browser bundle.
   Every third-party key lives in `backend/.env` and is proxied through the backend.
4. **Server is the price authority.** Never trust a price, quantity, or total sent by the client.
   Recompute from the database on every order.
5. **Money and quantities are integers.** Store paise (`Int32`) and grams (`Int32`).
   Never use floats for currency. Format for display only at the edge.
6. **Every list endpoint is paginated** (`?page=&limit=`, `limit` capped at 100) and uses `.lean()`.
7. **Every write endpoint validates with zod** before touching Mongo.
8. Mark deliberate hackathon shortcuts with a `// ponytail:` comment naming the ceiling and
   the upgrade path, so the debt is visible rather than forgotten.

### Target stack

| Layer | Choice | Why |
|---|---|---|
| API | Existing Node 18 + Express + Mongoose | Already working; don't restart |
| DB | MongoDB Atlas (M0 free) | Need a replica set for `2dsphere` + change-safe writes |
| Web | Existing React 19 + Vite | Already working |
| Map | `react-leaflet` + OpenStreetMap raster tiles | Free, **no API key**, no billing surprise on stage |
| Charts | `recharts` | 5-line line/bar charts, works with React 19 |
| AI service | New Python 3.11 **FastAPI** on `:8000` | OR-Tools and LightGBM are Python-first |
| Routing solver | `ortools` (`pywrapcp`) — CVRP with pickup-and-delivery + time windows | The exact fit named in the problem statement |
| Road distances | **OSRM public demo** `router.project-osrm.org/table/v1/driving/` | Free, keyless real road distances. Haversine × 1.3 fallback |
| Forecasting | `lightgbm` on lag/calendar features, `sklearn` metrics | 60 lines, trains in <2s, beats a naive baseline, no GPU |
| Payments | Razorpay **test mode** order creation + signature verify | Test keys are free and the flow is real; no live money |

> **Deliberate substitution, state it in the pitch:** the problem statement's reading list names
> `unit8co/darts` and `microsoft/forecasting`. Both are heavyweight installs (darts pulls a large
> dependency tree; Microsoft's repo is a research scaffold, not a library). LightGBM on lag features
> is the same model class those libraries would select for tabular daily demand, installs in
> seconds, and is what you can actually debug at 3am. The service boundary
> (`POST /forecast/demand`) is identical either way — swapping in `darts.models.LightGBMModel`
> later is a one-file change. Say this out loud if a judge asks; it reads as engineering judgment,
> not as a gap.
>
> Same for OSRM: self-hosting `osrm-backend` needs a multi-GB India OSM extract and a 20-minute
> preprocessing step. The public demo server gives identical road distances for a demo-scale
> matrix. Keep the self-host note in the "production hardening" slide.

### Repo layout after this plan

```
sih/
├── AUDIT.md
├── IMPLEMENTATION_PLAN.md
├── README.md                    ← NEW: setup + demo script
├── docker-compose.yml           ← NEW: optional, one-command demo
├── backend/
│   ├── models/                  User(extended) Chat Listing Order Shipment
│   │                            Vehicle Crop PriceBenchmark BulkPool
│   ├── routes/                  auth chat admin weather image
│   │                            + listings orders payments logistics insights crops
│   ├── services/                llm vision openweather
│   │                            + mlClient.js  pricing.js  inventory.js
│   ├── middleware/              auth.js + validate.js  rateLimit.js  errorHandler.js
│   ├── scripts/seed.js          ← NEW: deterministic demo data
│   └── config/env.js            ← NEW: fail-closed env loading
├── ml-service/                  ← NEW Python FastAPI
│   ├── main.py
│   ├── routing.py               OR-Tools CVRP + pickup/delivery + time windows
│   ├── matrix.py                OSRM table API + haversine fallback
│   ├── forecast.py              LightGBM lag-feature forecaster
│   ├── test_routing.py
│   └── requirements.txt
└── Frontend/src/
    ├── lib/api.js               ← NEW single axios instance
    ├── context/AuthContext.jsx  ← NEW
    ├── components/              ProtectedRoute ErrorBoundary Money
    │                            ListingCard CartDrawer RouteMap StopList
    │                            ForecastChart PriceLedger
    └── Pages/
        ├── Landing/  Home/      (existing, keep)
        ├── Market/              Storefront ListingDetail Cart Checkout
        ├── Orders/              OrderList OrderTrack
        ├── Farmer/              FarmerDashboard ListingForm BulkUpload Payouts
        ├── Fpo/                 PoolDashboard
        ├── Dispatch/            DispatchBoard
        └── Driver/              DriverRun
```

---

## Phase 0 — Stop the bleeding (target: 3–4 hours)

Nothing else matters if the demo crashes on stage or a judge finds an open admin endpoint.

### 0.1 Version control
```bash
cd sih
git init
git add -A && git commit -m "chore: baseline import of existing advisory app"
```
Then `.gitignore` at repo root: `node_modules/`, `.env`, `.env.local`, `dist/`, `__pycache__/`,
`.venv/`, `*.pyc`. **Delete the checked-in `Frontend/dist/`** (Q-10).

### 0.2 Fix the 12 P0 crashes
Work the `AUDIT.md` P0 table top to bottom. Specifics that need a decision:

- **P0-1** — Fix the *contract*, not the component. Make `GET /api/weather` return the nested
  shape the UI already expects, so the finished CSS keeps working:
  ```js
  res.json({ weather: {
    location: data.name,
    current: {
      icon: iconFor(data.weather[0].id), temp: Math.round(data.main.temp),
      condition: data.weather[0].description, feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity, wind: `${data.wind.speed} m/s`,
      uv: "—", visibility: `${(data.visibility/1000).toFixed(1)} km`,
      pressure: `${data.main.pressure} hPa`,
    }
  }});
  ```
  `uv` needs a second API call — return `"—"`. `// ponytail: UV omitted, One Call API 3.0 if asked.`
- **P0-2** — Delete the search input and its button from the Crop Calendar modal
  (`Dashboard.jsx:1009-1014`). The crop `<select>` right below it already covers the two seeded
  crops. Deleting is smaller and safer than writing a search over a 2-item object.
- **P0-4** — Make `loadWeatherData(params)` actually pass `params` through to axios.
- **P0-6** — `return` after the first `res.json`. Check `err.response?.status === 404` **before**
  the generic 500.
- **P0-7 / P0-11** — `git rm backend/routes/diagnose.js Frontend/src/Pages/Login/LoginSignup.jsx`.
  Both are dead duplicates of working files (`routes/image.js`, `Pages/Home/LoginModal.jsx`).
- **P0-8 / P0-9** — Replace `require("node-fetch")` with the global `fetch` (Node 18+ has it).
  Add `openai` to `backend/package.json` if you keep voice; otherwise delete
  `routes/voice.js`, `services/stt.js`, `services/tts.js` — the frontend uses the
  browser Web Speech API anyway (`Dashboard.jsx:304`), so the server pipeline is unused.
- **P0-12** — Add `<Route path="/otp" element={<OtpVerify />} />` and remove the
  `/login` route (`LoginModal` is a modal, not a page).

Add an error boundary so any future throw degrades one panel instead of the app:
`Frontend/src/components/ErrorBoundary.jsx`, wrap `<App/>` in `main.jsx`. (Q-13)

### 0.3 Close the security holes
- **S-1** — Gate `POST /api/auth/admin/signup` on `req.body.inviteCode === process.env.ADMIN_INVITE_CODE`,
  and refuse to start if that env var is unset.
- **S-2** — Re-enable `requireFarmerAuth` on `POST /api/image/diagnose`.
- **S-3** — New `backend/config/env.js`: fail-closed loader.
  ```js
  const REQUIRED = ["MONGO_URI","JWT_SECRET","SESSION_SECRET","ADMIN_INVITE_CODE"];
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length) { console.error("Missing env:", missing.join(", ")); process.exit(1); }
  ```
  Require it first in `server.js` and **delete every `|| "supersecret"` fallback**.
- **S-4 / S-5** — Move Geoapify server-side: mount the already-written
  `backend/routes/location.js` at `/api/location` and add
  `GET /api/location/autocomplete?q=` that proxies Geoapify with the key from `backend/.env`.
  Point `Landing.jsx` at it and delete the hardcoded key. **Delete `Frontend/.env.local`
  entirely** — nothing in the browser needs a secret. Rotate the Geoapify and OpenAI keys that
  were exposed.
- **S-6** — Never store the password. `send-otp` already holds the full signup payload in the
  server session; the client only needs `{ email }` in localStorage.
- **S-7** — `npm i express-rate-limit`. Cap `send-otp` at 3/15min per IP+email. Add
  `attempts` to the session OTP record and reject after 5 failures.
- **S-8** — `cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 15*60*1000 }`.
- **S-10** — `npm i helmet`; `app.use(helmet())`. CORS origin from
  `process.env.CORS_ORIGINS.split(",")`. `multer({ limits: { fileSize: 5*1024*1024 } })`.

### 0.4 Housekeeping that pays for itself immediately
- `Frontend/index.html` → `<title>AgriDirect — Farm to Table, No Middlemen</title>`.
- Create `Frontend/src/lib/api.js` (single axios instance, `VITE_API_BASE`, JWT interceptor,
  401 → clear token + redirect) and repoint `api/auth.js`, `api/chat.js`, `Dashboard.jsx`. (Q-7)
- `git rm Frontend/src/Pages/Home/cropCalender.json` (0 bytes). (Q-11)
- Remove `bcrypt` (keep `bcryptjs`, which is what the model imports), and remove
  `eventsource`, `csv-stringify`, `twilio`. (Q-5)
- Delete the ~2,000 lines of commented-out code listed in Q-4. It is pure noise in review.
- Write `backend/.env.example` and `Frontend/.env.example` with **key names only**.

**Definition of Done for Phase 0:** every existing screen opens without a console error;
`git log` has commits; an anonymous `curl` to `/api/auth/admin/signup` and
`/api/image/diagnose` both return 401/403; `grep -r "localhost:5000" Frontend/src` is empty;
the server refuses to boot with an empty `.env`.

---

## Phase 1 — Domain model (target: 3 hours)

All schemas go in `backend/models/`. Money in **paise** (`Int32`), weight in **grams** (`Int32`).

### 1.1 Extend `User.js`
```js
role: { type: String, enum: ["farmer","fpo","buyer","driver","officer","admin"], default: "buyer" },
phone:    { type: String, index: true, sparse: true },
orgName:  String,                                   // FPO / business buyer
buyerType:{ type: String, enum: ["consumer","bulk"], default: "consumer" },
fpo:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },   // farmer → parent FPO
location: {                                          // pickup point / delivery default
  type: { type: String, enum: ["Point"], default: "Point" },
  coordinates: { type: [Number], default: undefined }, // [lng, lat] — GeoJSON order!
},
address:  { line1: String, village: String, district: String, state: String, pincode: String },
kycStatus:{ type: String, enum: ["none","pending","verified"], default: "none" },
ratingAvg:{ type: Number, default: 0 }, ratingCount: { type: Number, default: 0 },
```
```js
userSchema.index({ location: "2dsphere" });
```
> `[lng, lat]`, not `[lat, lng]`. This is the single most common bug in geo code. Write it in a
> comment above every coordinate literal.

### 1.2 `Crop.js` — shared catalog (drives forecasting keys and units)
```js
{ slug: {type:String, unique:true},        // "tomato"
  name: String, nameHi: String,            // "Tomato", "टमाटर"
  category: {type:String, enum:["vegetable","fruit","cereal","pulse","spice"]},
  unit: {type:String, enum:["kg"], default:"kg"},
  shelfLifeDays: Number,                   // drives route urgency weighting
  imageUrl: String, msppaisePerKg: Number } // MSP where applicable, else null
```

### 1.3 `Listing.js` — a farmer's produce lot (the supply side)
```js
{ farmer: {ref:"User", required, index:true},
  fpo:    {ref:"User", default:null},       // set if pooled
  crop:   {ref:"Crop", required, index:true},
  variety: String,
  grade:  {type:String, enum:["A","B","C"], default:"A"},
  organic: {type:Boolean, default:false},
  totalGrams:     {type:Number, required},
  availableGrams: {type:Number, required, index:true},
  pricePaisePerKg:{type:Number, required},
  minOrderGrams:  {type:Number, default:1000},
  harvestedOn: Date,
  expiresOn:   Date,                        // harvestedOn + crop.shelfLifeDays
  pickup: { type:{type:String,default:"Point"}, coordinates:[Number] },  // [lng,lat]
  pickupWindow: { startHour:{type:Number,default:6}, endHour:{type:Number,default:18} },
  images: [String],
  status: {type:String, enum:["draft","active","sold_out","expired","paused"], default:"active", index:true},
}
```
```js
listingSchema.index({ pickup: "2dsphere" });
listingSchema.index({ crop: 1, status: 1, pricePaisePerKg: 1 });
```

### 1.4 `Order.js` — the demand side, plus the transparency ledger
```js
{ orderNo: {type:String, unique:true},              // "AD-260904-0007"
  buyer: {ref:"User", required, index:true},
  items: [{
    listing: {ref:"Listing", required},
    farmer:  {ref:"User", required},                // denormalised for payout query
    crop:    {ref:"Crop"},
    grams:   Number,
    pricePaisePerKg: Number,                        // frozen at order time
    lineTotalPaise:  Number,
  }],
  // ── money, all server-computed, all paise ──
  produceSubtotalPaise: Number,     // Σ lineTotal → goes to farmers, 100%
  logisticsFeePaise:    Number,     // from /api/logistics/quote
  platformFeePaise:     Number,     // PLATFORM_FEE_BPS (default 200 = 2%)
  totalPaise:           Number,
  // ── fulfilment ──
  deliveryAddress: { line1:String, city:String, pincode:String,
                     point:{type:{type:String,default:"Point"}, coordinates:[Number]} },
  deliverySlot: { date: Date, startHour: Number, endHour: Number },
  shipment: {ref:"Shipment", default:null},
  status: {type:String, enum:[
    "pending_payment","paid","confirmed","routed","picked_up","delivered","cancelled","refunded"
  ], default:"pending_payment", index:true},
  payment: { provider:{type:String,default:"razorpay"}, orderId:String,
             paymentId:String, signature:String, paidAt:Date },
  payouts: [{ farmer:{ref:"User"}, amountPaise:Number,
              status:{type:String,enum:["held","released"],default:"held"}, releasedAt:Date }],
  statusLog: [{ status:String, at:{type:Date,default:Date.now}, by:{ref:"User"}, note:String }],
}
```

### 1.5 `Vehicle.js`
```js
{ driver:{ref:"User", required}, regNo:{type:String, unique:true},
  kind:{type:String, enum:["bike","tempo","truck"], default:"tempo"},
  capacityGrams:Number, refrigerated:{type:Boolean,default:false},
  costPaisePerKm:Number,
  start:{type:{type:String,default:"Point"}, coordinates:[Number]},   // depot / home base
  shift:{ startHour:{type:Number,default:6}, endHour:{type:Number,default:20} },
  active:{type:Boolean, default:true} }
```

### 1.6 `Shipment.js` — one vehicle's optimized run for one day
```js
{ code:{type:String, unique:true},                  // "TRIP-260904-A"
  vehicle:{ref:"Vehicle", required}, driver:{ref:"User"},
  date: Date,
  stops: [{
    seq: Number,
    kind: {type:String, enum:["pickup","drop"]},
    order:   {ref:"Order"},
    listing: {ref:"Listing", default:null},         // pickups only
    label: String,                                  // "Ramesh — Tomato 40kg"
    point: {type:{type:String,default:"Point"}, coordinates:[Number]},
    loadGrams: Number,                              // +pickup / −drop
    etaMinutes: Number,                             // from optimizer, minutes from trip start
    status:{type:String, enum:["pending","done","failed"], default:"pending"},
    doneAt: Date, proofUrl: String,
  }],
  polyline: String,                                 // OSRM encoded polyline, precision 5
  plannedDistanceKm: Number, plannedDurationMin: Number,
  naiveDistanceKm: Number,                          // ← the savings number for the demo
  costPaise: Number,
  status:{type:String, enum:["planned","in_progress","completed"], default:"planned", index:true},
  optimizerMeta: mongoose.Schema.Types.Mixed,       // solver status, objective, wall time
}
```
> `naiveDistanceKm` (nearest-neighbour, unoptimized) is stored on purpose. "OR-Tools cut this
> route from 142 km to 96 km — 32% less fuel" is the single most persuasive number in the demo.
> Compute both, always.

### 1.7 `PriceBenchmark.js` — the anti-middleman evidence base
```js
{ crop:{ref:"Crop", index:true}, market:String, state:String, date:{type:Date, index:true},
  mandiModalPaisePerKg:Number, mandiMinPaisePerKg:Number, mandiMaxPaisePerKg:Number,
  retailPaisePerKg:Number,                       // what a city consumer actually pays
  source:{type:String, default:"agmarknet"} }
```
```js
priceBenchmarkSchema.index({ crop:1, market:1, date:-1 });
```
Seed from **Agmarknet / data.gov.in** ("Variety-wise Daily Market Prices of Commodities",
free API key at data.gov.in). Fall back to a committed CSV of real historical prices so the demo
never depends on a live third party. **Label the source in the UI** — a cited number beats an
impressive one.

### 1.8 `BulkPool.js` — FPO aggregation (the FPO half of the problem statement)
```js
{ fpo:{ref:"User", required}, crop:{ref:"Crop"}, grade:String,
  targetGrams:Number, committedGrams:{type:Number, default:0},
  pricePaisePerKg:Number,
  window:{ from:Date, to:Date },
  members:[{ farmer:{ref:"User"}, listing:{ref:"Listing"}, grams:Number }],
  status:{type:String, enum:["open","closed","listed","fulfilled"], default:"open"},
  resultListing:{ref:"Listing", default:null} }
```

**Definition of Done for Phase 1:** `node -e "require('./models/Order')"` etc. loads every model;
`db.listings.getIndexes()` shows the `2dsphere`; a hand-inserted document round-trips.

---

## Phase 2 — Supply + storefront: the read path (target: 6 hours)

### 2.1 Shared middleware first
- `middleware/validate.js` — `validate(schema)` → parses `req.body`/`req.query` with zod,
  400 with field errors on failure, assigns the parsed value back.
- `middleware/errorHandler.js` — terminal handler; logs the stack server-side, returns
  `{error, requestId}` only. Never leak `err.message` to the client (currently
  `auth.js:106` and `:216` do).
- `services/pricing.js` — the one place fees are computed (see §3.3).

### 2.2 Endpoints

**`GET /api/crops`** → `[{_id,slug,name,nameHi,category,imageUrl,msppaisePerKg}]`, cached 1h.

**`GET /api/listings`** — the storefront query. Public.
```
?crop=tomato            crop slug
&lat=&lng=&radiusKm=25  geo filter via $geoNear
&grade=A&organic=true
&minGrams=5000          bulk buyers only want lots ≥ N
&maxPricePaisePerKg=
&sort=price|distance|freshness   (default: distance when lat/lng given, else freshness)
&page=1&limit=24
```
Implementation — one aggregation, because `$geoNear` must be the first stage:
```js
const pipeline = [];
if (lat && lng) pipeline.push({ $geoNear: {
  near: { type:"Point", coordinates:[Number(lng), Number(lat)] },   // [lng,lat]
  distanceField: "distanceMeters",
  maxDistance: (Number(radiusKm)||25) * 1000,
  query: { status: "active", availableGrams: { $gt: 0 } },
  spherical: true,
}});
else pipeline.push({ $match: { status:"active", availableGrams:{ $gt:0 } } });
// … $match crop/grade/organic/price → $lookup farmer + crop → $sort → $skip/$limit
```
Response items carry `distanceKm` (rounded to 0.1) and `freshnessDays`
(`(now - harvestedOn)/86400000`), because those two fields are what make the storefront feel
different from Amazon — the buyer is choosing a *farm*, not a warehouse.

**`GET /api/listings/:id`** → listing + farmer public profile (`name`, `village`, `district`,
`ratingAvg`, `kycStatus`) + `priceComparison` from §3.4.

**`POST /api/listings`** (`requireRole("farmer","fpo")`) — zod-validated. Server sets
`farmer = req.user.sub`, `availableGrams = totalGrams`,
`expiresOn = harvestedOn + crop.shelfLifeDays`, and defaults `pickup` to the farmer's
`user.location` when omitted. Reject `pricePaisePerKg <= 0`.

**`PATCH /api/listings/:id`**, **`DELETE /api/listings/:id`** — ownership check
(`listing.farmer.equals(req.user.sub)`) or admin. Never allow raising `availableGrams` above
`totalGrams`. Soft-delete to `status:"paused"` if the listing has orders.

**`POST /api/listings/bulk`** (`requireRole("farmer","fpo")`) — CSV upload, multer memory,
5 MB cap. Columns: `crop_slug,variety,grade,organic,total_kg,price_per_kg,harvested_on`.
Parse with `csv-parse`, validate every row, and return
`{ created: n, errors: [{row, message}] }` — **insert the valid rows even when some rows fail**.
This is the FPO onboarding story: 40 farmers' lots in one file.

**`GET /api/listings/mine`** (`requireRole("farmer","fpo")`) — with aggregate sold/available.

### 2.3 Frontend

`Frontend/src/context/AuthContext.jsx` — holds `{user, token, login, logout}`, hydrates from
localStorage, exposes `hasRole(...roles)`. `components/ProtectedRoute.jsx` wraps role-gated routes.

New routes in `App.jsx`:
```
/market            → Market/Storefront.jsx
/market/:id        → Market/ListingDetail.jsx
/farmer            → Farmer/FarmerDashboard.jsx     (farmer, fpo)
/advisory          → Home/Dashboard.jsx             (rename of /dashboard — the existing app)
```
- **`Storefront.jsx`** — filter rail (crop chips, radius slider, grade, organic toggle,
  price slider), `ListingCard` grid, and a **map/list toggle** using `react-leaflet` with a
  marker per listing. Location comes from the existing `Landing.jsx` geolocation flow; persist
  the chosen `{lat,lng,label}` in `AuthContext` so the storefront opens pre-localised.
- **`ListingCard.jsx`** — farm photo, crop, `₹/kg`, `grade`, `4.2 km away`, `harvested 2 days ago`,
  farmer name + village, and a green `PriceLedger` badge: **"₹12/kg cheaper than retail"**.
- **`ListingDetail.jsx`** — quantity stepper honouring `minOrderGrams`, live line total,
  the full `PriceLedger` breakdown, a small map of the farm, farmer profile, add-to-cart.

**Definition of Done for Phase 2:** a farmer can create 5 listings through the UI and upload
30 more by CSV; an anonymous visitor at a given lat/lng sees them sorted by distance with
correct `distanceKm`; the map shows a pin per listing; every list response is paginated.

---

## Phase 3 — Orders, payment, and the transparency ledger (target: 7 hours)

This phase contains the two things that win the problem statement: **correct inventory under
concurrency** and **a defensible farmer-share number**.

### 3.1 Atomic inventory — do this exactly
Two buyers must never oversell one lot. **Do not** `findById` → check → `save()`; that is a
lost-update race. Use a conditional atomic decrement per line item, and compensate on failure:

```js
// services/inventory.js
async function reserve(listingId, grams) {
  const res = await Listing.findOneAndUpdate(
    { _id: listingId, status: "active", availableGrams: { $gte: grams } },
    { $inc: { availableGrams: -grams } },
    { new: true }
  );
  if (!res) return null;                       // insufficient stock — caller compensates
  if (res.availableGrams === 0) {
    await Listing.updateOne({ _id: listingId }, { $set: { status: "sold_out" } });
  }
  return res;
}
async function release(listingId, grams) {     // compensation / cancellation
  await Listing.updateOne({ _id: listingId },
    { $inc: { availableGrams: grams }, $set: { status: "active" } });
}
```
`POST /api/orders` reserves each line in sequence; on the first failure, `release()` everything
already reserved and return `409 { error:"insufficient_stock", listingId }`.

> `// ponytail: compensating writes, not a transaction. Atlas supports multi-doc txns —`
> `// switch to withTransaction() if partial-failure windows ever matter.`

Add a **self-check** — this is the money path, it does not ship untested:
`backend/scripts/check-inventory.js` fires 20 concurrent `reserve(listing, 10kg)` calls against a
100 kg lot and asserts exactly 10 succeed and `availableGrams === 0`.

### 3.2 Endpoints
```
POST   /api/orders                  buyer. Body: {items:[{listingId, grams}], deliveryAddress, deliverySlot}
                                    Server: re-reads every listing, recomputes every price,
                                    reserves stock, quotes logistics, creates order
                                    status=pending_payment. IGNORES any client-sent price/total.
GET    /api/orders                  role-scoped: buyer→own; farmer→orders containing own items;
                                    admin→all. ?status=&page=&limit=
GET    /api/orders/:id              + populated shipment stops (access-checked)
GET    /api/orders/:id/ledger       the transparency breakdown (§3.4)
POST   /api/orders/:id/confirm      farmer accepts their line items
POST   /api/orders/:id/cancel       buyer (before pickup) or farmer → release() stock, refund
POST   /api/orders/:id/rate         buyer rates farmer after delivery
```

### 3.3 Fee math — `services/pricing.js`, one function, one source of truth
```js
const PLATFORM_FEE_BPS   = Number(process.env.PLATFORM_FEE_BPS   ?? 200);  // 2.00%
const LOGISTICS_BASE     = Number(process.env.LOGISTICS_BASE_PAISE ?? 3000);   // ₹30
const LOGISTICS_PER_KM   = Number(process.env.LOGISTICS_PAISE_PER_KM ?? 800);  // ₹8/km
const LOGISTICS_PER_KG   = Number(process.env.LOGISTICS_PAISE_PER_KG ?? 100);  // ₹1/kg

function quote({ distanceKm, grams }) {
  return LOGISTICS_BASE
       + Math.round(distanceKm * LOGISTICS_PER_KM)
       + Math.round((grams / 1000) * LOGISTICS_PER_KG);
}
function totals({ items, logisticsFeePaise }) {
  const produceSubtotalPaise = items.reduce((s, i) =>
    s + Math.round((i.grams / 1000) * i.pricePaisePerKg), 0);
  const platformFeePaise = Math.round(produceSubtotalPaise * PLATFORM_FEE_BPS / 10000);
  return { produceSubtotalPaise, platformFeePaise, logisticsFeePaise,
           totalPaise: produceSubtotalPaise + platformFeePaise + logisticsFeePaise };
}
```
**The farmer receives 100% of `produceSubtotalPaise`.** The platform fee is charged to the
buyer, not deducted from the farmer. That is the entire pitch — say it in one sentence on the
checkout screen.

### 3.4 `GET /api/orders/:id/ledger` — the winning screen
Return both chains side by side for the same basket:
```json
{
  "direct": { "farmerReceivesPaise": 84000, "platformFeePaise": 1680,
              "logisticsFeePaise": 6400, "consumerPaysPaise": 92080,
              "farmerSharePct": 91.2 },
  "traditional": { "farmerReceivesPaise": 50400, "commissionAgentPaise": 8400,
                   "wholesalerPaise": 12600, "retailerPaise": 42000,
                   "consumerPaysPaise": 113400, "farmerSharePct": 44.4 },
  "savings": { "farmerGainsPaise": 33600, "farmerGainsPct": 66.7,
               "consumerSavesPaise": 21320, "consumerSavesPct": 18.8 },
  "assumptions": {
    "mandiModalPaisePerKg": 1800, "retailPaisePerKg": 2700,
    "commissionAgentPct": 8, "wholesalerMarginPct": 12, "retailerMarginPct": 40,
    "source": "Agmarknet daily modal price, <market>, <date>; margin split configurable in ChainAssumption"
  }
}
```
Store the margin percentages in a seeded `ChainAssumption` document, **not** as literals in code,
and render the `assumptions` block in the UI with its source line visible.

> **Be honest here — it is a competitive advantage.** These margin splits are *modelled*, not
> measured from your own data. Label them "modelled from published margin studies; adjustable"
> in the UI. A judge who spots an unlabelled invented statistic discounts everything else you
> showed. A judge who sees a cited, adjustable assumption panel concludes you understand your
> own model. The direct-chain half of the comparison is fully real — it comes from your
> actual order.

### 3.5 Payments — Razorpay test mode
```
POST /api/payments/intent   {orderId} → creates a Razorpay order for totalPaise,
                            returns {razorpayOrderId, keyId, amount}
POST /api/payments/verify   {orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature}
                            → HMAC-SHA256 verify with the key secret. On success:
                              order.status="paid", payouts[] created with status="held"
POST /api/payments/:orderId/release  (admin/system, on delivery) → payouts → "released"
```
Verify the signature **server-side**; a client-reported "payment succeeded" is not evidence.
Frontend uses Razorpay Checkout.js with the **test** key.

> `// ponytail: escrow is a status field, not a regulated account. Real escrow needs an`
> `// RBI-compliant PA/PG + settlement account — out of hackathon scope, in the roadmap slide.`
> Add a `MOCK_PAYMENTS=true` env flag that skips Razorpay entirely and jumps straight to
> `paid`. **You will need this when the venue wifi dies mid-demo.**

### 3.6 Frontend
- `Market/Cart.jsx` — cart in `localStorage` via a `useCart` hook; per-line quantity stepper;
  live subtotal.
  `// ponytail: localStorage cart. Server-side cart only if cross-device matters.`
- `Market/Checkout.jsx` — address form (default from the user profile), delivery slot picker
  (`<input type="date">` + a 3-slot radio group — **native inputs, no date-picker library**),
  live logistics quote from `POST /api/logistics/quote`, the `PriceLedger` panel, then pay.
- `Orders/OrderList.jsx` + `Orders/OrderTrack.jsx` — status stepper, the ledger, and (after
  Phase 5) the live route map.

**Definition of Done for Phase 3:** the concurrency self-check passes; a buyer completes
checkout in Razorpay test mode and the order reaches `paid` with `payouts[]` `held`;
`GET /:id/ledger` returns a farmer share above 85% for the direct chain; cancelling restores
`availableGrams` exactly.

---

## Phase 4 — `ml-service`: OR-Tools route optimization (target: 6 hours)

This is the highest-risk phase. Build it standalone with a test **before** wiring the backend.

`ml-service/requirements.txt`
```
fastapi==0.115.*
uvicorn[standard]==0.32.*
ortools==9.11.*
lightgbm==4.5.*
pandas==2.2.*
scikit-learn==1.5.*
httpx==0.27.*
pydantic==2.9.*
```

### 4.1 `POST /optimize-routes` — contract

Request:
```json
{
  "depot": {"lat": 28.6692, "lng": 77.4538},
  "vehicles": [{"id":"V1","capacityGrams":500000,"costPaisePerKm":800,
                "shiftStartMin":360,"shiftEndMin":1200}],
  "stops": [
    {"id":"L7","kind":"pickup","lat":28.70,"lng":77.50,"grams":40000,
     "pairId":"O1","twStartMin":360,"twEndMin":1080,"serviceMin":10},
    {"id":"O1","kind":"drop","lat":28.61,"lng":77.23,"grams":40000,
     "pairId":"O1","twStartMin":540,"twEndMin":1140,"serviceMin":8}
  ],
  "objective": "distance"
}
```
Response:
```json
{
  "routes": [{"vehicleId":"V1","sequence":["L7","O1"],
              "arrivalMin":[42,95],"distanceKm":31.4,"durationMin":95,
              "loadPeakGrams":40000,"polyline":"…","costPaise":25120}],
  "unassigned": [],
  "naiveDistanceKm": 46.8,
  "solverStatus": "OPTIMAL",
  "wallMs": 1840
}
```

### 4.2 `matrix.py` — distances
```python
async def road_matrix(points):           # points: [(lat, lng), ...]
    coords = ";".join(f"{lng},{lat}" for lat, lng in points)   # OSRM wants lng,lat
    url = f"https://router.project-osrm.org/table/v1/driving/{coords}"
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.get(url, params={"annotations": "duration,distance"})
            r.raise_for_status()
            d = r.json()
            return d["distances"], d["durations"], "osrm"
    except Exception:
        return *haversine_matrix(points), "haversine"   # ×1.3 road-winding factor
```
Cache by a rounded-coordinate key. The public OSRM demo caps at 100 locations per table
request — assert and shard above that. **The haversine fallback is not optional**: it is what
keeps the demo alive when the venue blocks outbound HTTP.

### 4.3 `routing.py` — the OR-Tools model
Key points that are easy to get wrong; get them right the first time:

```python
from ortools.constraint_solver import routing_enums_pb2, pywrapcp

def solve(depot, vehicles, stops, dist_m, dur_s, time_limit_s=10):
    # index 0 = depot; stops occupy 1..n
    n = len(stops) + 1
    mgr = pywrapcp.RoutingIndexManager(n, len(vehicles), 0)
    routing = pywrapcp.RoutingModel(mgr)

    def dist_cb(i, j):
        return int(dist_m[mgr.IndexToNode(i)][mgr.IndexToNode(j)])
    transit = routing.RegisterTransitCallback(dist_cb)
    routing.SetArcCostEvaluatorOfAllVehicles(transit)

    # ── capacity: pickups +grams, drops −grams (a truck empties as it delivers) ──
    def demand_cb(i):
        node = mgr.IndexToNode(i)
        if node == 0: return 0
        s = stops[node - 1]
        return s.grams if s.kind == "pickup" else -s.grams
    demand = routing.RegisterUnaryTransitCallback(demand_cb)
    routing.AddDimensionWithVehicleCapacity(
        demand, 0, [v.capacityGrams for v in vehicles],
        True,            # start cumul at zero
        "Capacity")

    # ── time dimension: travel + service, with per-stop windows ──
    def time_cb(i, j):
        a, b = mgr.IndexToNode(i), mgr.IndexToNode(j)
        service = 0 if a == 0 else stops[a - 1].serviceMin * 60
        return int(dur_s[a][b] + service)
    time_idx = routing.RegisterTransitCallback(time_cb)
    routing.AddDimension(time_idx, 3600, 24 * 3600, False, "Time")   # 60-min slack
    time_dim = routing.GetDimensionOrDie("Time")
    for k, s in enumerate(stops, start=1):
        idx = mgr.NodeToIndex(k)
        time_dim.CumulVar(idx).SetRange(s.twStartMin * 60, s.twEndMin * 60)
    for vi, v in enumerate(vehicles):
        time_dim.CumulVar(routing.Start(vi)).SetRange(v.shiftStartMin*60, v.shiftEndMin*60)

    # ── pickup-and-delivery pairing: same vehicle, pickup strictly before drop ──
    for pu, dr in pairs(stops):                       # match on pairId
        p, d = mgr.NodeToIndex(pu), mgr.NodeToIndex(dr)
        routing.AddPickupAndDelivery(p, d)
        routing.solver().Add(routing.VehicleVar(p) == routing.VehicleVar(d))
        routing.solver().Add(time_dim.CumulVar(p) <= time_dim.CumulVar(d))

    # ── let the solver drop a stop rather than return "no solution" ──
    for k in range(1, n):
        routing.AddDisjunction([mgr.NodeToIndex(k)], 5_000_000)   # penalty >> any arc cost

    params = pywrapcp.DefaultRoutingSearchParameters()
    params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION)
    params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH)
    params.time_limit.FromSeconds(time_limit_s)
    return routing.SolveWithParameters(params), mgr, routing, time_dim
```
The four things that break naive OR-Tools attempts, all handled above:
1. **Disjunctions with a large penalty.** Without them one infeasible time window makes the
   whole solve return `None` and your demo shows an empty map. With them you get a valid route
   plus an `unassigned` list you can display honestly.
2. **`VehicleVar(pickup) == VehicleVar(drop)`.** `AddPickupAndDelivery` alone does *not*
   force one vehicle to do both legs.
3. **Negative demand on drops.** Otherwise capacity is the sum of the whole day, not the peak
   load, and every route looks infeasible.
4. **Slack on the time dimension.** Zero slack means no waiting is permitted and tight windows
   go infeasible.

`test_routing.py` — the one runnable check for this phase:
```python
def test_pickup_before_drop_and_capacity_respected():
    res = solve_from_payload(FIXTURE_2_ORDERS_1_TRUCK)
    for r in res["routes"]:
        for pu, dr in [("L7","O1"), ("L9","O2")]:
            assert r["sequence"].index(pu) < r["sequence"].index(dr)
        assert r["loadPeakGrams"] <= 500_000
    assert res["unassigned"] == []
    assert res["routes"][0]["distanceKm"] < res["naiveDistanceKm"]   # optimization helps
```

### 4.4 Naive baseline (for the savings headline)
`naive_nearest_neighbour(stops)` — greedy nearest unvisited, pickups before their drop, one
vehicle. Sum its distance from the same matrix. Same inputs, same units, so the comparison
is fair and you can defend it.

### 4.5 Backend client
`backend/services/mlClient.js` — thin axios wrapper on `process.env.ML_SERVICE_URL`,
8s timeout, and a **graceful degradation path**: if the ML service is down, fall back to
nearest-neighbour ordering in Node and set `optimizerMeta.fallback = true`. The dispatch
screen must never be a blank page because a Python process died.

**Definition of Done for Phase 4:** `pytest ml-service` is green; `POST /optimize-routes` with
8 orders × 3 vehicles returns in under 10s with every pickup before its drop, capacity
respected, and `distanceKm < naiveDistanceKm`; killing the Python process degrades the backend
to the fallback instead of erroring.

---

## Phase 5 — Dispatch, driver, tracking (target: 6 hours)

### 5.1 Endpoints
```
POST /api/logistics/quote      public. {items:[{listingId,grams}], dropLat, dropLng}
                               → {distanceKm, feePaise, etaMinutes}
                               Uses the matrix for pickup→drop legs. Cache 5 min.
POST /api/logistics/plan       admin. {date, orderIds[], vehicleIds[]}
                               → builds the stop list (one pickup per order line + one drop
                                 per order), calls the optimizer, creates one Shipment per
                                 returned route, sets order.status="routed", returns a summary
                                 {shipments[], totalPlannedKm, totalNaiveKm, savingsPct}
GET  /api/logistics/shipments  ?date=&status=  role-scoped (driver → own only)
GET  /api/logistics/shipments/:id
POST /api/logistics/shipments/:id/start        driver → status="in_progress"
POST /api/logistics/shipments/:id/stops/:stopId/complete
                               driver. multipart, optional proof photo.
                               Last drop of an order → order.status="delivered",
                               triggers payout release.
```
Allocate `logisticsFeePaise` across the orders on a shipment **by leg distance**, not evenly —
a buyer 2 km away should not subsidise one 40 km away. Recompute after planning and store the
delta on the order.

### 5.2 `Dispatch/DispatchBoard.jsx` (admin) — the logistics demo screen
Three-pane layout:
- **Left:** unrouted paid orders (checkbox list, total weight, earliest slot).
- **Centre:** Leaflet map. Farm pins green, delivery pins blue, depot pin black. After
  planning, one coloured polyline per vehicle with numbered stop markers.
- **Right:** vehicle list with capacity utilisation bars, and a big
  **"Optimize Routes"** button.

Above the map, after planning, a single results strip:
> **3 vehicles · 21 stops · 96.4 km planned vs 142.1 km unoptimized → 32.2% shorter ·
> ₹366 fuel saved · all 14 delivery windows met**

That strip is the whole logistics score. Make it large, make the numbers real, and animate the
before/after polylines on toggle if you have spare time.

### 5.3 `Driver/DriverRun.jsx`
Mobile-first (this is the one screen judges will resize). Ordered stop list with
`pickup`/`drop` badge, address, contact, load, ETA; a **Mark done** button with optional camera
capture (reuse the working `getUserMedia` code at `Dashboard.jsx:158`); and a
`https://www.google.com/maps/dir/?api=1&destination=lat,lng` link per stop.
`// ponytail: deep-link to Maps for turn-by-turn. In-app navigation is a product, not a feature.`

### 5.4 `Orders/OrderTrack.jsx` (buyer)
Status stepper (`paid → confirmed → routed → picked_up → delivered`), the shipment map with
the driver's completed stops filled in, and ETA. Poll `GET /shipments/:id` every 15s while
`in_progress`.
`// ponytail: 15s polling, not WebSockets. Sockets when concurrent trips > ~50.`

**Definition of Done for Phase 5:** from an empty board, an admin selects 8 paid orders and
3 vehicles, clicks Optimize, and sees 3 coloured routes with a savings percentage; the assigned
driver's phone view lists their stops in order; marking the final drop flips the buyer's order
to `delivered` and releases the payout.

---

## Phase 6 — Demand forecasting + farmer insights (target: 5 hours)

### 6.1 `ml-service/forecast.py`
Contract (same shape for demand and price, so one frontend chart component serves both):
```
POST /forecast/demand   {crop, region, horizonDays, history:[{date, qtyKg}]}
POST /forecast/price    {crop, market, horizonDays, history:[{date, pricePaisePerKg}]}
→ {points:[{date, yhat, lo, hi}], model:"lightgbm", mape:8.4,
   baselineMape:14.1, trainedOn:210, warnings:[]}
```
Feature build (`pandas`): lags 1, 7, 14, 28; rolling mean/std over 7 and 28 days;
`dayofweek`, `weekofyear`, `month`; an `is_festival` flag from a small committed
`festivals.csv` (Diwali, Onam, Eid, Pongal — Indian produce demand is festival-driven and this
one feature makes the chart visibly smarter). Recursive multi-step forecast for the horizon.
Interval = ±1.28 × residual std (an 80% band).

Guardrails:
- `len(history) < 30` → return a **seasonal-naive** forecast with
  `warnings:["insufficient_history_seasonal_naive"]`. Never fabricate confidence you don't have.
- Always report `baselineMape` (seasonal naive) alongside `mape`. **"LightGBM 8.4% MAPE vs
  14.1% naive baseline"** is a real claim. A bare "8.4% MAPE" is not.
- Backtest with an expanding-window split, never a random split — random splits leak the future
  into training and produce impressive nonsense.

### 6.2 Where demand history comes from
Order history won't exist on day one. Two sources, in priority order:
1. **Real orders** once seeded (`Order.items` grouped by crop, region, day).
2. **Seeded 12-month synthetic-but-structured series** in `scripts/seed.js`: base level per
   crop × district, weekly seasonality, festival spikes, monsoon dip, Gaussian noise. Generate
   it with a **fixed random seed** so the demo is byte-identical every run.

Label the source in the API response (`"source":"orders"|"seed"`) and show it in the UI. Never
present seeded data as production data.

### 6.3 Backend insight endpoints
```
GET /api/insights/demand?crop=tomato&district=Ghaziabad&horizon=14
GET /api/insights/price?crop=tomato&market=Azadpur&horizon=14
GET /api/insights/suggest-price?cropId=&grade=&district=
    → {suggestedPaisePerKg, bandLoPaise, bandHiPaise,
       mandiTodayPaise, retailTodayPaise, rationale}
GET /api/insights/what-to-sow?district=            (bonus, only if Phase 7 is comfortably done)
    → crops ranked by forecast demand ÷ current local supply
```
Cache forecasts for 6h in a `ForecastCache` collection keyed by
`crop|region|horizon|dataVersion`. **Never** call the ML service synchronously from a page load
that a judge is watching.

### 6.4 Farmer-facing UI — `Farmer/FarmerDashboard.jsx`
Four cards:
1. **My listings** — table with sold/available progress bars, quick price edit.
2. **Demand forecast** — `recharts` line chart, actual history solid + forecast dashed +
   shaded confidence band, with the MAPE-vs-baseline caption underneath.
3. **Price advisor** — suggested `₹/kg` band with today's mandi and retail prices as reference
   lines, and a one-line rationale ("14-day demand up 18%; you are 9% below the local median").
4. **Earnings** — payouts held vs released, and a cumulative
   *"₹18,400 more than mandi rates would have paid"* figure computed from `PriceBenchmark`.

**Definition of Done for Phase 6:** the forecast endpoint returns 14 points with a band and a
`mape` strictly better than `baselineMape` on the seeded series; a <30-point history returns the
naive fallback with its warning; the farmer chart renders from cache in under 300 ms.

---

## Phase 7 — Seed, demo, deploy, polish (target: 5 hours)

### 7.1 `backend/scripts/seed.js` — deterministic, idempotent, `--reset` flag
Fix the RNG seed. Create:
- 8 crops (tomato, onion, potato, brinjal, okra, banana, wheat, rice) with real shelf lives.
- 1 admin, 1 FPO (`Ghaziabad Kisan Producer Co.`), **12 farmers** with real lat/lng scattered
  15–60 km around the depot, 6 consumers, 2 bulk buyers (a restaurant chain, a retailer),
  3 drivers + 3 vehicles (bike 50 kg, tempo 500 kg, truck 2000 kg).
- **40 active listings** across those farmers with plausible prices anchored to `PriceBenchmark`.
- **12 months of daily `PriceBenchmark` rows** per crop for one market (from a committed
  Agmarknet CSV where available; structured synthetic otherwise, flagged as such).
- **~120 historical orders** spread over 90 days, so forecasts and the earnings card have
  something real to compute from.
- **10 paid, unrouted orders dated today** — this is what the Optimize Routes demo consumes.
  Re-seeding must restore exactly this state, because you will demo more than once.

`npm run seed` and `npm run seed:reset`. Test the reset path *before* demo day.

### 7.2 One-command startup
`docker-compose.yml` with three services (`api`, `ml`, `web`) plus an Atlas connection string,
**and** a `README.md` fallback with three plain terminal commands. Docker Desktop on a borrowed
laptop is a coin flip; have both paths.

### 7.3 Demo script (rehearse it, 3 minutes, aloud, twice)
1. **(15s) The problem, in one number.** Storefront open at a real location: "A farmer 8 km
   from here gets ₹18/kg for tomatoes. You pay ₹42. Four intermediaries take the rest."
2. **(30s) Farmer side.** Log in as a farmer → demand forecast card ("demand up 18% over the
   next two weeks, and here is the MAPE against a naive baseline — 8.4% vs 14.1%") → price
   advisor suggests ₹24/kg → create a listing in 3 fields.
3. **(30s) Buyer side.** Switch to a consumer → the new listing appears, 8.2 km away, harvested
   today → add 5 kg → checkout → **open the ledger panel**: "farmer receives 91% of what you
   pay, versus 44% through the mandi chain — and here are the assumptions, with sources."
4. **(45s) Logistics — the centrepiece.** Admin dispatch board, 10 paid orders sitting
   unrouted, 3 vehicles → click **Optimize Routes** → routes animate onto the map →
   read the strip: "96 km instead of 142 — 32% less driving, every delivery window met,
   OR-Tools solved it in 1.8 seconds."
5. **(30s) Driver + tracking.** Driver phone view, mark a pickup done → the buyer's tracking
   page advances and the payout releases.
6. **(30s) Close on scale.** "2% platform fee, no commission on the farmer's side. The FPO
   uploads 40 members' lots in one CSV. Aggregate lots fill a truck that no single smallholder
   could fill alone — that is how the 32% logistics saving reaches a farmer with 40 kg to sell."

Have a **90-second version** ready. Judging slots always run short.

### 7.4 Reliability rules for demo day (non-negotiable)
- `MOCK_PAYMENTS=true` toggle, tested.
- Haversine matrix fallback, tested with outbound HTTP blocked.
- Every forecast pre-warmed in `ForecastCache` before you walk up.
- Record a **2-minute screen capture of the full happy path** the night before. If the wifi
  dies, you play the video and narrate. Teams that lose the room are the ones with nothing
  to show.
- One final `npm run seed:reset` immediately before your slot.

### 7.5 If you run out of time, cut in this order
Cut from the bottom. Everything above the line is what the problem statement is actually asking for.

| Keep (scored directly) | Cut first (nice-to-have) |
|---|---|
| Storefront + listings + geo search | `what-to-sow` recommender |
| Cart → order → ledger | Ratings & reviews |
| **Dispatch board + OR-Tools + savings number** | Driver proof-of-delivery photos |
| Demand forecast chart with baseline comparison | KYC flows |
| Farmer dashboard + price advisor | Bulk pool UI (keep the model + seed a pooled listing) |
| FPO CSV bulk upload | Live tracking polling (a static planned route demos fine) |
| Razorpay test checkout | Advisory chatbot improvements — **already done, touch nothing** |

---

## Appendix A — Environment variables

`backend/.env` (server-only; **never** `VITE_`-prefixed)
```
PORT=5000
MONGO_URI=
JWT_SECRET=                 # 32+ random bytes, no fallback in code
SESSION_SECRET=
ADMIN_INVITE_CODE=
CORS_ORIGINS=http://localhost:5173
ML_SERVICE_URL=http://localhost:8000
OPENWEATHER_API_KEY=
GEOAPIFY_API_KEY=           # moved out of Landing.jsx
DHENU_API_KEY=
LLM_API_KEY=
LLM_MODEL=dhenu2-in-8b-preview
GMAIL_USER=
GMAIL_PASS=
RAZORPAY_KEY_ID=            # test mode
RAZORPAY_KEY_SECRET=
MOCK_PAYMENTS=false
PLATFORM_FEE_BPS=200
LOGISTICS_BASE_PAISE=3000
LOGISTICS_PAISE_PER_KM=800
LOGISTICS_PAISE_PER_KG=100
DATA_GOV_API_KEY=           # Agmarknet price benchmarks
```
`Frontend/.env` (public by definition — nothing secret)
```
VITE_API_BASE=http://localhost:5000
VITE_RAZORPAY_KEY_ID=       # publishable key only, safe
```
**Delete `Frontend/.env.local`. Rotate the Geoapify and OpenAI keys that were exposed in it
and in `Landing.jsx`.**

## Appendix B — Test checklist (the minimum that must be runnable)

Not a test suite. Five checks on the five paths where a silent bug costs you the demo.

| Check | File | Asserts |
|---|---|---|
| Concurrent reservations | `backend/scripts/check-inventory.js` | 20 concurrent 10 kg reservations on a 100 kg lot → exactly 10 succeed, `availableGrams === 0`, status `sold_out` |
| Fee math | `backend/scripts/check-pricing.js` | `totals()` is integer-exact; farmer share > 85%; no float drift over 1,000 random baskets |
| VRP correctness | `ml-service/test_routing.py` | pickup before drop, capacity respected, `distanceKm < naiveDistanceKm`, no unassigned on a feasible fixture |
| Forecast sanity | `ml-service/test_forecast.py` | `mape < baselineMape` on the seeded series; <30 points → naive fallback + warning |
| Auth boundaries | `backend/scripts/check-authz.js` | anonymous, buyer, and farmer tokens each get 401/403 on admin routes; a farmer cannot PATCH another farmer's listing |

## Appendix C — Mapping back to the problem statement

| Problem statement asks for | Delivered by | Demo proof |
|---|---|---|
| Connect farmers/FPOs directly with consumers and bulk buyers | Phase 2 storefront + geo search; Phase 3 orders; FPO CSV upload + `BulkPool`; `buyerType: consumer\|bulk` | Farmer lists → consumer buys, in one continuous flow, no intermediary entity anywhere in the schema |
| Provide logistics support | Phases 4–5: `Vehicle`, `Shipment`, dispatch board, driver run sheet, distance-allocated delivery fee | 10 orders → 3 optimized trips, on a map, with per-stop ETAs |
| Uses AI for demand forecasting and route optimization | Phase 6 LightGBM forecast + price advisor; Phase 4 OR-Tools CVRP with pickup/delivery and time windows over OSRM road distances | 14-day forecast with a beaten baseline; `96 km vs 142 km`, solver status `OPTIMAL`, 1.8s |
| **Benefit:** better prices for farmers | 100% of produce subtotal to the farmer; platform fee charged to the buyer; price advisor | Ledger: farmer share 91% vs 44%; earnings card: "₹18,400 more than mandi rates" |
| **Benefit:** lower prices for consumers | Removal of agent/wholesaler/retailer margin stack | Ledger: consumer pays 18.8% less than retail for the same basket |
| **Benefit:** reduced supply chain inefficiency | OR-Tools consolidation + FPO pooling + shelf-life-aware routing | 32% fewer kilometres on the same set of deliveries |
