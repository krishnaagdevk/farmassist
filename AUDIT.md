# Code Audit — `farmer-sih/sih`

Date: 2026-09-04
Scope: full read of `backend/` and `Frontend/src/` (17,100 LOC incl. lockfiles; ~5,800 LOC hand-written).

---

## 1. Headline finding

**The existing code does not implement the hackathon problem statement.**

The problem statement is a *direct farmer-to-consumer marketplace with logistics and AI
(demand forecasting + route optimization)*.

What is actually built is a **farmer advisory chatbot** — LLM Q&A, crop-disease image
diagnosis, weather lookup, crop calendar, community forum stub, rewards stub. This is a
different SIH problem statement ("AI advisory for farmers").

Coverage against the three required capabilities:

| Required capability | Status | Evidence |
|---|---|---|
| Connect farmers/FPOs directly with consumers & bulk buyers | **0% — absent** | No `Listing`/`Product`/`Order`/`Cart`/`Payment` model exists. `backend/models/` contains only `User.js` and `Chat.js`. The "Market Updates" screen is a hardcoded array — `Frontend/src/Pages/Home/Dashboard.jsx:532` (`mockMarketData`). |
| Provide logistics support | **0% — absent** | No vehicle, shipment, stop, driver, or delivery entity anywhere. No `grep` hit for `shipment`, `vehicle`, `delivery`, `driver`. |
| AI for demand forecasting & route optimization | **0% — absent** | No forecasting model, no solver, no Python service. The only price feature (`backend/routes/cropPrice.js`) asks an LLM to *invent* future prices — and that route is never mounted in `server.js`. |

**What is genuinely reusable (~35% of a head start on plumbing, 0% on the domain):**

- Email-OTP signup + JWT auth + role guards — `backend/routes/auth.js`, `backend/middleware/auth.js`
- Mongoose/Express/session/CORS server skeleton — `backend/server.js`
- SSE LLM streaming that works — `backend/services/llm.js:57`
- Weather proxy — `backend/routes/weather.js`
- Geoapify location autocomplete + browser geolocation — `Frontend/src/Pages/Landing/Landing.jsx:267`
- React 19 + Vite + react-router shell, and a large amount of finished CSS (~5,700 lines)

**Strategic recommendation:** keep the advisory features as a differentiator layer (they are
already built and they make the marketplace stickier), and build the marketplace, logistics
and AI services as the new core. Do **not** rebuild auth. See `IMPLEMENTATION_PLAN.md`.

---

## 2. P0 — Breaks at runtime today

| # | Location | Problem |
|---|---|---|
| P0-1 | `Frontend/src/Pages/Home/Dashboard.jsx:911` | Renders `weatherDisplayData.current.icon`, but the backend returns a flat object `{temperature, humidity, description, provider}` (`backend/routes/weather.js:23`). `.current` is `undefined` → **TypeError blanks the entire Dashboard** the moment the weather modal opens. |
| P0-2 | `Frontend/src/Pages/Home/Dashboard.jsx:1012` | `onClick={performCropSearch}` — `performCropSearch` is **never defined** (only this one reference exists in the whole repo). **ReferenceError** when the Crop Calendar modal renders. |
| P0-3 | `Frontend/src/Pages/Home/Dashboard.jsx:778` and `:1348` | `{isChatOpen && <Chatbox … />}` appears **twice** → two stacked chat modals. |
| P0-4 | `Frontend/src/Pages/Home/Dashboard.jsx:51-58` | `loadWeatherData(params)` ignores `params` entirely and hardcodes `lat: 10.85, lon: 76.27`. "Search" and "Use Current Location" are therefore no-ops. |
| P0-5 | `Frontend/src/Pages/Home/Chatbox.jsx:86` | `import "./home.css"` — the file on disk is `Home.css`. Works on Windows/macOS, **fails the build on Linux** (i.e. on Vercel/Netlify/Render). |
| P0-6 | `backend/routes/weather.js:31-38` | `res.status(500).json(...)` then a further `res.status(404)`/`res.status(500)` on the same request → `ERR_HTTP_HEADERS_SENT`. The 404 "City not found" branch is unreachable. |
| P0-7 | `backend/routes/diagnose.js` | This file in the **backend routes folder contains a React component** (JSX, `useState`, `export default`). It is not requireable by Node. Dead/misplaced file. |
| P0-8 | `backend/routes/cropPrice.js:53` | `require("node-fetch")` — **not in `package.json` and not installed**. Crashes the process if ever mounted. |
| P0-9 | `backend/services/stt.js`, `backend/services/tts.js` | `require("openai")` — **not in `package.json` and not installed**. Crashes if `routes/voice.js` is mounted. |
| P0-10 | `backend/server.js:51-55` | `voice.js`, `location.js`, `cropPrice.js` are **never mounted**. The location route is explicitly commented out at `server.js:48`. Three built features are unreachable; the frontend calls Geoapify directly instead. |
| P0-11 | `Frontend/src/Pages/Login/LoginSignup.jsx:2,4` | `import … from "../api/auth"` resolves to `src/Pages/api/auth` (does not exist) and `import "../Login.css"` resolves to `src/Pages/Login.css` (does not exist). Dead file — but it hard-fails the build the moment anything imports it. |
| P0-12 | `Frontend/src/App.jsx:31-39` | No `/otp` route exists, yet `Otp.jsx:27` and `LoginSignup.jsx:41` both `navigate("/otp")` → blank page mid-signup. `Otp.jsx` is not reachable from any route. `/login` renders `LoginModal` as a page although it needs `onClose`/`mode` props. |

## 3. P1 — Security

| # | Location | Problem | Severity |
|---|---|---|---|
| S-1 | `backend/routes/auth.js:223` | `POST /api/auth/admin/signup` has **no authentication and no invite check**. Any anonymous caller can create a `role: "admin"` account and then pass every `requireAdminAuth` guard. **Full privilege escalation.** | Critical |
| S-2 | `backend/routes/image.js:60` | `POST /api/image/diagnose` has no auth (the auth'd version is commented out at `:12`). Anonymous callers can burn your paid vision API quota. | High |
| S-3 | `backend/middleware/auth.js:3`, `backend/server.js:40` | `JWT_SECRET \|\| "supersecret"` and `SESSION_SECRET \|\| "sessionsecret"`. A deploy that forgets an env var silently accepts **forgeable tokens**. Fail-closed instead. | High |
| S-4 | `Frontend/src/Pages/Landing/Landing.jsx:265` | Geoapify API key hardcoded in source: `const API_KEY = "7eba…"`. | High |
| S-5 | `Frontend/.env.local` | `VITE_OPENAI_API_KEY`, `VITE_MARKET_API_KEY`. **Every `VITE_*` variable is inlined into the shipped JS bundle** — these are public. An OpenAI key in a browser bundle is a billing incident. Must move server-side. | Critical |
| S-6 | `Frontend/src/Pages/Login/LoginSignup.jsx:39` | `localStorage.setItem("pendingUser", JSON.stringify(form))` — writes the user's **plaintext password** to localStorage. `LoginModal.jsx` does the same. | High |
| S-7 | `backend/routes/auth.js:22-56` | No rate limit and no attempt cap on `send-otp` or on OTP verification. A 6-digit OTP with unlimited guesses is brute-forceable in seconds; `send-otp` is also an unmetered email cannon. | High |
| S-8 | `backend/server.js:44` | `cookie: { secure: false }`, no `sameSite`, no `httpOnly` set explicitly. Session also accumulates one `authData[email]` entry per OTP request with no eviction. | Medium |
| S-9 | Every route | **Zero input validation** (no zod/joi/express-validator). `User.create({...req.body})`-shaped calls invite mass assignment; nothing checks types, lengths, or that `role` isn't attacker-chosen. | High |
| S-10 | `backend/server.js:26-36` | CORS hardcoded to `http://localhost:5173` (deploy breaks). No `helmet`, no rate limiter, and `multer()` has **no file-size limit** → trivial memory-exhaustion upload. | Medium |
| S-11 | repo root | **Not a git repository.** No history, no branches, no rollback, no way for a team to work in parallel, and nothing for judges to inspect. | High (process) |

## 4. P2 — Quality / maintainability

| # | Location | Problem |
|---|---|---|
| Q-1 | `Dashboard.jsx` | 1,351 lines, 10 modals, 30+ `useState` in one component. Unmaintainable during a hackathon crunch. |
| Q-2 | `Dashboard.jsx:471-522` + `:644-668` | Builds HTML **strings** into React state, then injects them **twice** — once via `dangerouslySetInnerHTML` and again via `document.getElementById(...).innerHTML` in a `useEffect`. Two competing mechanisms on the same nodes, plus a live XSS hole the instant that data becomes user-generated. |
| Q-3 | `Dashboard.jsx:558` | `onclick="alert('View …')"` inside an `innerHTML` string. Breaks under CSP and does not survive re-render. |
| Q-4 | repo-wide | **~2,000 lines of commented-out dead code**: `routes/chat.js:1-234` (72% of the file), `routes/cropPrice.js:1-49`, `services/llm.js:1-140`, `LoginModal.jsx:1-166`, `Landing.jsx:1-237`, `App.jsx:1-24`. |
| Q-5 | `backend/package.json` | Both `bcrypt` **and** `bcryptjs` installed. `eventsource`, `csv-stringify`, `twilio` unused. |
| Q-6 | `backend/package.json:8` | `"test": "jest --runInBand"` — jest is not installed and there are **zero tests**. |
| Q-7 | 5 files | `http://localhost:5000` hardcoded in `src/api.js:4`, `src/api/auth.js:4`, `src/api/chat.js:4`, `src/api/chat.js:26`, `Dashboard.jsx:55`, `Dashboard.jsx:128`. No single API base → no deploy. |
| Q-8 | `routes/chat.js:296` + `services/llm.js:22` | Two different system prompts injected into the same request. |
| Q-9 | `routes/admin.js:14` | Reads `req.user.id`, but the JWT payload uses `sub` (`auth.js:90`). `meta.by` is always `undefined`. |
| Q-10 | `Frontend/dist/` | Stale build artifacts checked in alongside source. |
| Q-11 | `Frontend/src/Pages/Home/cropCalender.json` | 0 bytes, misspelled, and duplicated by `src/cropCalendar.json` (306 lines). |
| Q-12 | `Frontend/index.html:6` | `<title>Vite + React</title>`. Judges see this. |
| Q-13 | app-wide | No React error boundary — so P0-1 and P0-2 blank the whole page instead of one modal. |
| Q-14 | `Dashboard.jsx:348` | The voice feature answers from a hardcoded `if (query.includes("fertilizer"))` string — while a real Whisper+LLM+TTS pipeline sits unmounted in `routes/voice.js`. |
| Q-15 | `backend/models/User.js` | No `2dsphere` index (required for "farms near me"), no phone uniqueness, and the role enum lacks `buyer`, `fpo`, `driver`. |
| Q-16 | all list endpoints | No pagination, no `limit`, no `.lean()`. |

## 5. Dependency reality check

- `backend`: declares 16 deps; `openai` and `node-fetch` are **used but undeclared**; `eventsource`, `csv-stringify`, `twilio`, and one of `bcrypt`/`bcryptjs` are **declared but unused**.
- `Frontend`: only `axios`, `react`, `react-dom`, `react-router-dom`. Everything the marketplace needs is missing — no map library, no charting library, no form/validation library.
- No Python anywhere. Both required AI capabilities (OR-Tools VRP, time-series forecasting) need a Python service that does not exist yet.

---

## 6. Bottom line for the hackathon

You are not "partly done" — you are **starting the stated problem from zero**, on top of a
working auth/React skeleton with 12 runtime crashes and 2 critical security holes in it.

Sequence that maximises score per hour:
1. **Half a day** on P0 + S-1/S-2/S-5 + `git init` (a demo that crashes on stage scores zero).
2. **Everything else** on the marketplace → logistics → AI path in `IMPLEMENTATION_PLAN.md`.
3. Keep the advisory chatbot. Do not spend another hour improving it.
