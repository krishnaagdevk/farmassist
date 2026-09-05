# Context-Transfer Prompt (for a fresh Claude / Gemini chat)

**How to use:** copy everything below the horizontal line into a new chat. If the tool allows
attachments, also attach `AUDIT.md` and `IMPLEMENTATION_PLAN.md` from this repo — the prompt
works standalone, but the files add depth.

---

You are helping me build the pitch deck (PPT) for a Smart India Hackathon project. I already have
a completed technical audit and implementation plan from a prior session. Below is the full
context. Read all of it, then help me produce slide content.

## 1. The problem statement (verbatim, as issued)

> Multiple intermediaries reduce farmers' earnings and increase consumer prices.
>
> **Expected Solution:** Create a digital marketplace that:
> - Connects farmers/FPOs directly with consumers and bulk buyers
> - Provides logistics support
> - Uses AI for demand forecasting and route optimization
>
> **Benefits:** Better prices for farmers · Lower prices for consumers · Reduced supply chain inefficiencies

## 2. Our project

**Name:** AgriDirect — farm-to-table marketplace with AI logistics.

**One-line pitch:** A farmer 8 km from you gets ₹18/kg for tomatoes; you pay ₹42. Four
intermediaries take the difference. AgriDirect removes all four, and uses Google OR-Tools to
consolidate the deliveries so the logistics cost doesn't eat the saving.

## 3. Honest starting position (important — do not misrepresent this)

We inherited a partly-built codebase. A full audit found it implements a **different** problem
statement — a farmer advisory chatbot (LLM crop Q&A, disease diagnosis from photos, weather,
crop calendar). Coverage of the marketplace problem statement was **0 of 3** required
capabilities: no marketplace models, no logistics entities, no AI forecasting or routing.

The audit also found 12 runtime crashes, 11 security findings (including an unauthenticated
admin-signup endpoint allowing full privilege escalation, and an OpenAI API key exposed in the
browser bundle via a `VITE_`-prefixed env var), and 16 code-quality issues including ~2,000
lines of commented-out dead code.

**What we keep and build on** (genuinely reusable): email-OTP + JWT auth with role guards,
SSE LLM streaming, weather API proxy, geolocation autocomplete, React 19 + Vite shell, and
~5,700 lines of finished CSS. The advisory chatbot stays as a value-add layer — it makes the
marketplace stickier and costs us nothing more to keep.

For the deck: frame this as *"we inherited an advisory app and rebuilt the core around the actual
problem statement, keeping the advisory features as a differentiator."* Don't hide it and don't
dwell on it.

## 4. Architecture

```
┌──────────────────────────────────────────────────────────┐
│  React 19 + Vite frontend                                │
│  Consumer/bulk-buyer storefront · Farmer & FPO dashboard  │
│  Admin dispatch board · Driver run sheet · Order tracking │
└───────────────────────────┬──────────────────────────────┘
                            │ REST + JWT
┌───────────────────────────▼──────────────────────────────┐
│  Node 18 + Express + Mongoose  (orchestrator)            │
│  Role auth · Listings · Orders · Atomic inventory        │
│  Price ledger · Payments (Razorpay) · Payout release     │
└──────────┬───────────────────────────────┬───────────────┘
           │                               │
┌──────────▼─────────────────┐  ┌──────────▼───────────────┐
│ Route Optimizer            │  │ Demand & Price Forecast   │
│ Python FastAPI + OR-Tools  │  │ Python FastAPI + LightGBM │
│ CVRP + pickup/delivery     │  │ Lag + calendar + festival │
│ + time windows, over OSRM  │  │ features, backtested      │
└────────────────────────────┘  └──────────────────────────┘
                    MongoDB Atlas (2dsphere geo indexes)
```

**Stack choices and why:**

| Layer | Choice | Rationale |
|---|---|---|
| API | Node 18 + Express + Mongoose | Reuses the working auth layer |
| DB | MongoDB Atlas, `2dsphere` indexes | Geo queries — "farms within 25 km of me" |
| Web | React 19 + Vite | Already working, finished CSS |
| Maps | `react-leaflet` + OpenStreetMap tiles | Free, **no API key**, no billing risk on stage |
| Charts | `recharts` | Lightweight, React 19 compatible |
| Routing solver | Google **OR-Tools** (`pywrapcp`) — Capacitated VRP with pickup-and-delivery pairing and time windows | The exact algorithmic fit; the problem statement names it |
| Road distances | **OSRM** public demo `table` API, haversine × 1.3 fallback | Real road distances, keyless, free |
| Forecasting | **LightGBM** on lag/rolling/calendar/festival features | Trains in <2s, no GPU, debuggable |
| Payments | Razorpay **test mode**, server-side HMAC signature verification | Real flow, no live money |

**Two deliberate substitutions to state openly if asked:** the problem statement's reading list
names `unit8co/darts` and `microsoft/forecasting`. Both are heavyweight (darts pulls a large
dependency tree; the Microsoft repo is a research scaffold, not a library). LightGBM on lag
features is the same model class those libraries would select for tabular daily demand, and the
service boundary (`POST /forecast/demand`) is identical — swapping in `darts.models.LightGBMModel`
is a one-file change. Similarly, self-hosting `osrm-backend` needs a multi-GB India OSM extract
and a 20-minute preprocessing step; the public demo server returns identical road distances at
demo scale. Both self-hosted versions are on the production-hardening slide. Presented as
engineering judgment, these read as strengths, not gaps.

## 5. Feature list, by user role

**Farmer**
- Create produce listings: crop, variety, grade (A/B/C), organic flag, quantity, ₹/kg, harvest date, pickup geo-point, pickup time window
- Listings carry shelf life, so the router can prioritise perishables
- **AI price advisor:** suggested ₹/kg band, shown against today's mandi price and today's retail price, with a plain-language rationale ("14-day demand up 18%; you're 9% below the local median")
- **14-day demand forecast chart:** history solid, forecast dashed, shaded 80% confidence band
- Earnings panel: payouts held vs released, plus a cumulative "₹X more than mandi rates would have paid" figure computed from real benchmark price data
- Incoming orders, accept/decline

**FPO (Farmer Producer Organisation)**
- **CSV bulk upload** — 40 member farmers' lots in one file, per-row validation, valid rows insert even when some fail
- **Bulk pooling** — aggregate many smallholder lots into one truck-sized listing that no individual farmer could fill alone. This is the mechanism that makes the logistics saving actually reach a farmer with 40 kg to sell.

**Consumer / bulk buyer**
- Geo-aware storefront: filter by crop, radius, grade, organic, minimum lot size, price; sort by distance / price / freshness
- Map view with a pin per farm
- Every card shows distance ("4.2 km away") and freshness ("harvested 2 days ago") — you're choosing a *farm*, not a warehouse
- Cart, checkout with delivery slot, live logistics quote
- **Price Transparency Ledger** — the headline screen (see §6)
- Order tracking: status stepper plus the live route map with completed stops filled in

**Admin / dispatcher**
- **Dispatch board:** unrouted paid orders on the left, live map centre, vehicle fleet with capacity-utilisation bars on the right, one big **"Optimize Routes"** button
- Optimizer output renders as one coloured polyline per vehicle with numbered stops and per-stop ETAs
- Results strip with the before/after savings numbers

**Driver**
- Mobile-first ordered run sheet: pickup/drop badge, address, contact, load, ETA
- Mark-done with optional camera proof photo
- Google Maps deep link per stop for turn-by-turn
- Completing the final drop flips the buyer's order to delivered and releases the farmer's payout

**Retained advisory layer (already built)**
- LLM crop Q&A chat, crop-disease diagnosis from a photo, weather with farm advisory, crop calendar, community forum, learning hub, rewards

## 6. The three headline numbers

These are the metrics engineered into the build specifically to be provable on stage.

**(a) Price Transparency Ledger** — both supply chains, same basket, side by side:

| | Direct (AgriDirect) | Traditional (mandi chain) |
|---|---|---|
| Farmer receives | ₹840 | ₹504 |
| Commission agent | — | ₹84 |
| Wholesaler | — | ₹126 |
| Retailer | — | ₹420 |
| Platform fee (2%) | ₹16.80 | — |
| Logistics | ₹64 | included in margins |
| **Consumer pays** | **₹920.80** | **₹1,134** |
| **Farmer's share** | **91.2%** | **44.4%** |

Farmer earns **66.7% more**. Consumer pays **18.8% less**. The farmer receives **100%** of the
produce subtotal — our 2% fee is charged to the buyer, never deducted from the farmer.

**(b) Route optimization** — OR-Tools vs an unoptimized nearest-neighbour baseline over the
identical stop set and distance matrix:

> 3 vehicles · 21 stops · **96.4 km optimized vs 142.1 km unoptimized → 32.2% shorter** ·
> ~₹366 fuel saved · all 14 delivery time windows met · solver status OPTIMAL in 1.8 s

**(c) Demand forecasting** — always reported against a seasonal-naive baseline:

> LightGBM **8.4% MAPE vs 14.1% naive baseline**, expanding-window backtest

### Data-honesty rules — apply these to every slide

Judges discount an entire deck over one unlabelled invented statistic. So:

- The **direct-chain** side of the ledger is **real** — computed from an actual order in our system.
- The **traditional-chain** margin split (8% agent / 12% wholesaler / 40% retailer) is
  **modelled from published margin studies**, stored as an adjustable configuration document,
  and rendered in the UI with its source line visible. Label it that way on the slide too.
- Mandi and retail reference prices come from **Agmarknet / data.gov.in** daily market prices,
  with a committed historical CSV fallback so the demo never depends on a live third party.
- Demand history is seeded, structured synthetic data for a cold start (fixed random seed, so
  every demo run is identical). The API response carries `"source": "orders" | "seed"` and the
  UI displays it.
- **The routing and forecasting figures in §6(b) and §6(c) are the plan's target/illustrative
  values, measured against a seeded scenario. If I have not yet confirmed to you that the build
  is finished and these were actually measured, mark them on the slide as "projected on seeded
  scenario" or ask me for the real measured numbers. Do not present targets as achieved
  results.**

## 7. Engineering rigour worth putting on a technical slide

- **Atomic inventory:** conditional `findOneAndUpdate` with `availableGrams: {$gte: n}` plus
  `$inc`, with compensating release on partial failure — two buyers can never oversell one lot.
  Verified by a 20-way concurrency self-check.
- **Server is the price authority.** Client-sent prices and totals are ignored; every order
  re-reads the database and recomputes.
- **Money as integers** (paise), weight as integers (grams). No float currency drift.
- **OR-Tools model correctness:** disjunctions with a large penalty (so one infeasible time
  window degrades to a dropped stop with an honest "unassigned" list, instead of returning no
  solution and an empty map); `VehicleVar(pickup) == VehicleVar(drop)` (pairing alone does not
  force one vehicle to do both legs); negative demand on drops (so capacity is peak load, not
  the day's total); time-dimension slack (so waiting is permitted and tight windows stay feasible).
- **Graceful degradation everywhere:** ML service down → nearest-neighbour fallback in Node;
  OSRM unreachable → haversine × 1.3; payment gateway unreachable → `MOCK_PAYMENTS` flag.
  Nothing on the demo path has a single point of failure.
- **Fail-closed config:** the server refuses to boot with a missing secret rather than falling
  back to a default one.
- Logistics fee allocated across orders **by leg distance**, so a buyer 2 km away doesn't
  subsidise one 40 km away.

## 8. Data model (7 new collections)

`Crop` (catalog, shelf life, MSP) · `Listing` (produce lot, geo pickup point, available quantity,
status) · `Order` (frozen line prices, fee breakdown, payouts, status log) · `Vehicle` (driver,
capacity, cost/km, depot, shift) · `Shipment` (one vehicle's optimized run: ordered stops with
ETAs, encoded polyline, planned vs naive distance) · `PriceBenchmark` (Agmarknet mandi + retail
prices — the anti-middleman evidence base) · `BulkPool` (FPO aggregation).
Plus an extended `User` with roles farmer / fpo / buyer / driver / officer / admin and a
`2dsphere`-indexed location.

## 9. Build plan

7 phases, ~40 hours:
0. Fix 12 crashes + close security holes + `git init` (4h)
1. Domain model, 7 collections, geo indexes (3h)
2. Listings + geo storefront read path (6h)
3. Orders, atomic inventory, payments, transparency ledger (7h)
4. Python `ml-service`: OR-Tools CVRP + OSRM matrix + naive baseline (6h)
5. Dispatch board, driver run sheet, order tracking (6h)
6. LightGBM demand/price forecasting + farmer insights (5h)
7. Seed data, demo rehearsal, deploy, polish (5h)

**Production roadmap beyond the hackathon** (for the feasibility/scale slide): self-hosted OSRM
on an India OSM extract; real RBI-compliant escrow via a payment aggregator (currently a status
field, honestly labelled); WebSocket live tracking instead of 15s polling; per-region forecast
model retraining; cold-chain-aware routing using the shelf-life field we already store; ONDC
network integration.

## 10. Demo flow (3 minutes)

1. **(15s)** The problem in one number — storefront at a real location, ₹18/kg vs ₹42/kg
2. **(30s)** Farmer: demand forecast → price advisor suggests ₹24/kg → create listing in 3 fields
3. **(30s)** Consumer: that listing appears 8.2 km away, harvested today → cart → checkout → **open the ledger**
4. **(45s)** Admin dispatch board: 10 paid orders, 3 vehicles → **Optimize Routes** → routes animate → read the savings strip *(this is the centrepiece)*
5. **(30s)** Driver marks a pickup done → buyer's tracking advances → payout releases
6. **(30s)** Close on scale: 2% fee, zero farmer commission, FPO CSV onboarding, pooling fills a truck no smallholder could fill alone

---

# What I want from you

Help me turn the above into deck content. Specifically:

1. **Ask me first** whether I need the **official SIH 5-slide template** (Idea/Proposed Solution ·
   Technical Approach · Feasibility & Viability · Impact & Benefits · Research & References) or a
   **longer 10–12 slide pitch deck**, and confirm any word/slide limits my organisers set. Then
   write to that format.
2. For each slide give me: a **headline** (under 10 words), **3–5 bullets of under 15 words each**
   (deck bullets, not paragraphs), and **speaker notes** of 2–3 sentences I can actually say aloud.
3. Tell me exactly **which visual** goes on each slide — the architecture diagram, the ledger
   comparison table, the before/after route map, the forecast chart with its confidence band —
   and describe each one precisely enough that I can build it.
4. Lead with **numbers, not adjectives.** "32% shorter routes" beats "highly optimized."
5. Respect the data-honesty rules in §6. Label modelled figures as modelled, cite Agmarknet where
   it applies, and don't invent any statistic that isn't in this prompt. If you think a slide
   needs a number I haven't given you, **ask me for it** rather than filling it in.
6. Flag anything in here that a technical judge would attack, and give me a one-sentence answer
   for each. I want the hard questions before the judges ask them.
