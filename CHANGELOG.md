# Changelog

All notable changes to ShopAssist AI are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v1.0.0] — 2026-03-20

### Added

**Core Application**
- React 19 + Tailwind CSS 4 frontend with "Warm Commerce" design system (forest green, amber, cream)
- Express 4 + tRPC 11 backend with full type-safe API layer
- Streaming AI chat endpoint (`/api/chat`) powered by Groq llama-3.3-70b-versatile via Vercel AI SDK
- Real-time token streaming from Groq to the browser via `toDataStreamResponse()`

**Chatbot Features**
- Natural language order tracking with visual order cards (carrier, ETA, tracking code, progress bar)
- Quick-reply chips for one-tap follow-up actions after each AI response
- Sidebar showing all recent orders with status badges
- Human escalation flow ("Talk to an Agent") for complex cases
- Typing indicator during AI response generation

**Guardrails (5 implemented)**
- PII redaction — strips credit card numbers, emails, phones, and national IDs before LLM call
- Topic restriction — blocks off-topic queries (politics, sports, etc.) in under 25ms without calling Groq
- Scope enforcement — system prompt limits AI to e-commerce support only
- Hallucination prevention — `lookupOrder` tool mandate; AI must query DB, never invent data
- Tone enforcement — system prompt enforces polite, professional responses

**Database**
- MySQL orders table via Drizzle ORM (order ID, product, status, carrier, ETA, tracking code, price, notes)
- 9 seeded test orders covering all statuses: processing, shipped, in_transit, delivered, delayed, cancelled, return_requested
- `seed-orders.mjs` script for database seeding

**Admin Panel**
- `/admin` page with full orders table (all columns, status badges)
- Add new order form with all fields
- Inline status change dropdown with optional notes
- Delete order with confirmation

**Backend Procedures (tRPC)**
- `orders.list` — fetch all orders for the sidebar
- `admin.listOrders` — fetch all orders for the admin panel
- `admin.createOrder` — create a new order
- `admin.updateOrderStatus` — update status and notes for an existing order
- `admin.deleteOrder` — delete an order by ID

**Documentation**
- `README.md` — problem, solution, quick start, demo link, AI disclosure, team
- `ARCHITECTURE.md` — layered diagram and data/LLM flow
- `SECURITY.md` — secrets policy, auth, PII handling, data residency
- `RAI.md` — responsible and frugal AI choices
- `CHANGELOG.md` — this file
- `.env.example` — placeholder environment variables

---

## Team

| Name | Role |
|---|---|
| Obikaonu Agnes Chidiebere | Developer & Presenter |
| Sargunam Gunasekaran | Developer & Presenter |

---

## Roadmap

### [v1.1.0] — Planned (Month 1 Pilot)
- Connect to real carrier tracking APIs (AfterShip, FedEx, DHL)
- Add conversation history persistence to the database
- Add guardrail block log panel in the admin page
- Add a "Rate this response" thumbs up/down feedback mechanism

### [v2.0.0] — Planned (Month 2 Production)
- RAG pipeline for FAQ documents (vector DB + scheduled ingestion)
- Full customer authentication — users see only their own orders
- Multi-language support (French, Arabic, Spanish)
- KPI dashboard with real-time CSAT, resolution time, and autonomous rate charts
