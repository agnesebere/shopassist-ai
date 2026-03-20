# Security Policy — ShopAssist AI

## Secrets Management

All secrets and API keys are managed as environment variables and are **never committed to the repository**. The `.env.example` file contains only placeholder values to guide setup.

| Secret | Purpose | Storage |
|---|---|---|
| `GROQ_API_KEY` | Authenticates requests to the Groq LLM API | Environment variable (server-side only) |
| `DATABASE_URL` | MySQL connection string | Environment variable (server-side only) |
| `JWT_SECRET` | Signs session cookies for user authentication | Environment variable (server-side only) |
| `VITE_APP_ID` | Manus OAuth application identifier | Environment variable |

**Rule:** No secret is ever exposed to the frontend bundle. All LLM API calls are made server-side via the `/api/chat` endpoint. The Groq API key is never accessible in the browser.

---

## Authentication & Authorisation

ShopAssist AI uses **Manus OAuth** for user authentication. The flow is as follows:

1. The user is redirected to the Manus login portal.
2. On successful login, an OAuth callback sets a signed, HTTP-only session cookie.
3. Every subsequent request to `/api/trpc` validates the session cookie via `server/_core/context.ts`.
4. Protected procedures use `protectedProcedure` which injects `ctx.user` and rejects unauthenticated requests with a 401 error.

**Role-based access control** is implemented via the `role` field on the `users` table (`admin` | `user`). Admin-only procedures check `ctx.user.role === 'admin'` before executing.

---

## PII Handling

Personal Identifiable Information (PII) is handled at the **input guardrail layer** before any data reaches the LLM.

The following patterns are detected and redacted server-side in `server/_core/chat.ts`:

| PII Type | Pattern | Replacement |
|---|---|---|
| Credit / debit card numbers | 13–19 digit sequences | `[CARD REDACTED]` |
| Email addresses | Standard email regex | `[EMAIL REDACTED]` |
| Phone numbers | International and local formats | `[PHONE REDACTED]` |
| Social security / national ID | Common SSN patterns | `[ID REDACTED]` |

Redaction occurs **before** the message is passed to `convertToModelMessages()` and before the Groq API call. The LLM never receives raw PII.

**Data minimisation:** The `orders` table stores only the data necessary for support queries (order ID, product, status, carrier, ETA, tracking code, price). No payment card data is stored in the database.

---

## Data Residency

| Data | Location |
|---|---|
| Order and user data | TiDB Cloud (MySQL-compatible) — EU region |
| LLM inference | Groq Cloud API — data is not retained by Groq beyond the request |
| Session cookies | Client browser (HTTP-only, Secure, SameSite=None) |
| Static assets | Manus CDN |

**GDPR note:** No personal data is sent to the LLM. Order data injected into the system prompt contains only order IDs, product names, statuses, and logistics details — no customer names, addresses, or payment information.

---

## Guardrails as a Security Control

The five guardrails implemented in `server/_core/chat.ts` serve a dual purpose — they are both safety controls and security controls:

| Guardrail | Security function |
|---|---|
| PII Redaction | Prevents sensitive data from leaving the organisation via the LLM API |
| Topic Restriction | Prevents prompt injection attacks that attempt to redirect the AI |
| Scope Enforcement | Limits the AI's attack surface to e-commerce support only |
| Hallucination Prevention | Prevents the AI from fabricating order data or policies |
| Tone Enforcement | Prevents the AI from being manipulated into producing harmful content |

---

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please open a GitHub issue marked `[SECURITY]` or contact the project owner directly. Do not disclose vulnerabilities publicly before they have been addressed.
