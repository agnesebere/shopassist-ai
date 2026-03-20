# Architecture — ShopAssist AI

## Overview

ShopAssist AI follows a standard three-tier web architecture extended with an AI orchestration layer. The frontend communicates with the backend exclusively via tRPC (for data) and a streaming HTTP endpoint (for AI chat). The backend orchestrates the LLM, enforces guardrails, and queries the database.

---

## Layered Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│   React 19 + Tailwind CSS 4 + Vercel AI SDK (@ai-sdk/react)     │
│   • Chatbot UI (streaming, order cards, quick-reply chips)       │
│   • Admin Panel (/admin) — CRUD for orders                       │
│   • tRPC client for data queries                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP (tRPC + streaming)
┌───────────────────────────▼─────────────────────────────────────┐
│                       APPLICATION LAYER                          │
│   Express 4 + tRPC 11 + Vercel AI SDK (server)                  │
│   • /api/chat  — streaming chat endpoint with guardrails         │
│   • /api/trpc  — tRPC procedures (orders CRUD, auth)             │
│   • Guardrail engine (PII redaction, topic restriction, etc.)    │
│   • Tool registry (lookupOrder)                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS API call
┌───────────────────────────▼─────────────────────────────────────┐
│                          AI LAYER                                │
│   Groq API — llama-3.3-70b-versatile                             │
│   • Receives sanitised messages (UIMessage → ModelMessage)       │
│   • Calls lookupOrder tool when order data is needed             │
│   • Streams response tokens back to the backend                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ SQL (mysql2 + Drizzle ORM)
┌───────────────────────────▼─────────────────────────────────────┐
│                         DATA LAYER                               │
│   TiDB (MySQL-compatible) — managed cloud database              │
│   • users table — auth, roles                                    │
│   • orders table — all order data (9 seeded test records)        │
│   Drizzle ORM — type-safe schema + migrations                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data & LLM Flow — Single Chat Request

```
1. USER types message in React chat UI
        │
        ▼
2. GUARDRAIL CHECK (client-side: none; server-side below)
        │
        ▼
3. POST /api/chat  { messages: UIMessage[] }
        │
        ▼
4. SERVER — Input Guardrails (chat.ts)
   ├── PII Redaction   → strip credit cards, emails, phones
   ├── Topic Check     → block if off-topic (politics, sports, etc.)
   └── Scope Check     → enforce e-commerce support only
        │
        ▼
5. convertToModelMessages(messages)  → ModelMessage[]
        │
        ▼
6. streamText({
     model: groq("llama-3.3-70b-versatile"),
     system: [system prompt with order context],
     messages: ModelMessage[],
     tools: { lookupOrder }
   })
        │
        ├── IF AI calls lookupOrder(orderId)
        │       └── getOrderById(orderId) → MySQL query → return order row
        │
        ▼
7. AI response tokens stream back → toDataStreamResponse()
        │
        ▼
8. SERVER — Output Guardrails
   └── (enforced via system prompt: tone, scope, no hallucination)
        │
        ▼
9. FRONTEND receives stream → useChat renders tokens in real time
        │
        ▼
10. ORDER CARD rendered if AI response contains order data
```

---

## Key Files

| File | Purpose |
|---|---|
| `server/_core/chat.ts` | Main AI chat route — guardrails, streamText, tool registry |
| `server/routers.ts` | tRPC procedures — orders CRUD, auth |
| `server/db.ts` | Database query helpers |
| `drizzle/schema.ts` | Database schema — users + orders tables |
| `client/src/pages/Home.tsx` | Main chatbot UI |
| `client/src/pages/Admin.tsx` | Admin panel — order management |
| `seed-orders.mjs` | Seeds 9 test orders into the database |

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React | 19 |
| Styling | Tailwind CSS | 4 |
| Backend framework | Express | 4 |
| API layer | tRPC | 11 |
| AI SDK | Vercel AI SDK | 6 |
| LLM provider | Groq | — |
| LLM model | llama-3.3-70b-versatile | — |
| Database | TiDB (MySQL-compatible) | — |
| ORM | Drizzle ORM | 0.44 |
| Runtime | Node.js | 22 |
| Package manager | pnpm | 10 |
