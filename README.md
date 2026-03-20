# ShopAssist AI — E-Commerce Customer Support Chatbot

> An AI-powered customer support assistant for e-commerce platforms, built as a GenAI Enterprise PoC covering all 10 enterprise layers.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-shopassist.manus.space-1B4332?style=flat-square)](https://shopassist-ejtkhnwb.manus.space)
[![Release](https://img.shields.io/badge/Release-v1.0.0-F59E0B?style=flat-square)](https://github.com/AgnesObikaonu/shopAssist-ai/releases/tag/v1.0.0)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

---

## Problem

E-commerce customer support teams spend the majority of their time answering repetitive, low-complexity queries — order status, delivery delays, return requests, and FAQs. The average resolution time for a tier-1 support ticket is **15 minutes**, requiring a human agent to manually look up order data, compose a reply, and send it. This is slow, expensive, and does not scale.

---

## Solution

ShopAssist AI is a conversational AI assistant that handles tier-1 customer support queries automatically. A customer types a question in natural language — *"Where is my order?"* or *"I want to return my headphones"* — and the AI looks up the order from a real database, generates a structured, human-like response, and streams it back in under 2 seconds. Complex cases are escalated to a human agent.

---

## Target Users

| User | Role |
|---|---|
| **End customers** | Ask questions about their orders, returns, and shipping in natural language |
| **Support agents** | Monitor escalated cases and manage orders via the admin panel |
| **Operations team** | Add, update, and change order statuses via the `/admin` panel |
| **Executives** | Track KPIs: resolution time, CSAT, autonomous ticket rate |

---

## Key Features

- Real-time order tracking with visual progress cards (carrier, ETA, tracking code, status bar)
- 5 production guardrails: PII redaction, topic restriction, scope enforcement, hallucination prevention, tone enforcement
- Admin panel (`/admin`) to add, update, and delete orders without developer access
- Streaming AI responses powered by Groq (llama-3.3-70b-versatile)
- Quick-reply chips for one-tap follow-up actions
- Human escalation flow for complex cases
- Full MySQL database with 9 seeded test orders

---

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10+
- A Groq API key (free at [console.groq.com](https://console.groq.com))
- A MySQL database (TiDB free tier recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/AgnesObikaonu/shopAssist-ai.git
cd shopAssist-ai

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Fill in your GROQ_API_KEY and DATABASE_URL in .env

# Push the database schema
pnpm db:push

# Seed test data
node seed-orders.mjs

# Start the development server
pnpm dev
```

The app will be available at `http://localhost:3000`.

---

## Demo

**Live demo:** [https://shopassist-ejtkhnwb.manus.space](https://shopassist-ejtkhnwb.manus.space)

**Test prompts to try:**
- `"Track my order ORD-78234"`
- `"I want to return my headphones"`
- `"Where is my package? It's late"`
- `"Who won the election?"` *(triggers topic restriction guardrail)*
- `"My card number is 4111 1111 1111 1111"` *(triggers PII redaction guardrail)*

**Admin panel:** Navigate to `/admin` to add, edit, or update order statuses.

---

## AI Components Disclosure

This application uses the following AI components:

| Component | Provider | Model | Purpose |
|---|---|---|---|
| **Large Language Model** | Groq | llama-3.3-70b-versatile | Natural language understanding and response generation |
| **Tool Use / Function Calling** | Groq (via AI SDK) | llama-3.3-70b-versatile | `lookupOrder` tool for real-time database queries |
| **Streaming** | Vercel AI SDK | — | Token-by-token response streaming to the frontend |

The AI does **not** make autonomous decisions about refunds, cancellations, or account changes. All such actions require human agent confirmation.

---

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full layered diagram and data/LLM flow.

---

## Security

See [SECURITY.md](SECURITY.md) for the secrets policy, authentication, PII handling, and data residency details.

---

## Responsible AI

See [RAI.md](RAI.md) for guardrail design, evaluation policy, model selection rationale, and cost controls.

---

## Team Members

| Name | Role |
|---|---|
| Obikaonu Agnes Chidiebere | Developer & Presenter |
| Sargunam Gunasekaran | Developer & Presenter |

---

## License

MIT — see [LICENSE](LICENSE) for details.
