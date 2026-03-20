# Responsible & Frugal AI — ShopAssist AI

## Overview

ShopAssist AI was designed with two guiding principles: **Responsible AI** (the AI should be safe, fair, and transparent) and **Frugal AI** (the AI should deliver maximum value at minimum cost and environmental impact). This document details the specific choices made to honour both principles.

---

## Model Selection Rationale

| Model considered | Quality | Latency | Cost (per 1M tokens) | Decision |
|---|---|---|---|---|
| GPT-4o (OpenAI) | Excellent | ~800ms | ~$15 input / $60 output | Rejected — too expensive for PoC |
| Claude 3.5 Sonnet (Anthropic) | Excellent | ~600ms | ~$3 input / $15 output | Rejected — still costly at scale |
| **llama-3.3-70b-versatile (Groq)** | **Very good** | **~150ms** | **Free tier / $0.59 input** | **Selected** |

**Justification:** For a customer support use case where queries are short and structured (order IDs, status requests), a 70B open-weight model on Groq provides sufficient quality at a fraction of the cost of frontier models. The open-weight nature of llama-3.3-70b also eliminates vendor lock-in and allows future self-hosting if needed.

---

## Guardrails Design

Five guardrails are implemented in `server/_core/chat.ts` and run on every request before the LLM is called.

### 1. PII Redaction (Input)
Credit card numbers, email addresses, phone numbers, and national IDs are detected via regex and replaced with `[REDACTED]` tokens before the message reaches the LLM. This ensures no personal data leaves the organisation via the API.

### 2. Topic Restriction (Input)
Messages containing keywords related to politics, sports, entertainment, and other non-support topics are blocked immediately — without calling the LLM — saving both cost and latency. The user receives a polite redirect message.

### 3. Scope Enforcement (System Prompt)
The system prompt explicitly instructs the model to only answer questions about orders, returns, shipping, cancellations, and FAQs. Any other topic is outside scope.

### 4. Hallucination Prevention (Tool Mandate)
The AI is given a `lookupOrder` tool and instructed via the system prompt that it **must** use this tool to retrieve order data. It is explicitly forbidden from inventing order numbers, statuses, or ETAs. All order data in responses is sourced directly from the database.

### 5. Tone Enforcement (System Prompt)
The system prompt instructs the model to always be polite, professional, and empathetic. It must never be dismissive, sarcastic, or rude — regardless of how the user phrases their message.

---

## Evaluation Policy

| Cadence | What is tested | Method |
|---|---|---|
| On every deployment | 3 order lookups + 2 off-topic blocks | Manual smoke test |
| Weekly | 10 standard prompts — correctness, groundedness, refusal rate | Manual review |
| Monthly | Full regression — all guardrail scenarios + edge cases | Manual review |

**Evaluation criteria for each response:**
- **Correct:** Does the answer match the database record?
- **Grounded:** Is every factual claim sourced from the database or the system prompt?
- **Safe:** Did the guardrails fire correctly on adversarial inputs?
- **Useful:** Would a real customer find this response helpful?

---

## Cost Controls

| Control | Implementation |
|---|---|
| **Topic restriction guardrail** | Blocks off-topic requests before calling Groq — saves ~100% of LLM cost for those requests |
| **Free tier usage** | Groq free tier covers all PoC traffic at €0 |
| **No RAG at PoC stage** | Order data is injected via system prompt (no vector DB cost) |
| **Model pinning** | `llama-3.3-70b-versatile` is pinned in code to prevent accidental upgrade to a more expensive model |
| **No persistent conversation history** | Each session is stateless — no storage cost for chat logs |

**Estimated PoC cost:** €0 (Groq free tier + TiDB free tier + Manus free hosting)
**Estimated pilot cost (100 orders/day, 5 agents):** ~€15/month on Groq paid tier

---

## Human-in-the-Loop Design

ShopAssist AI is designed to **augment**, not replace, human support agents. The following safeguards ensure humans remain in control:

- The AI never autonomously processes refunds, cancellations, or account changes.
- A "Talk to an Agent" escalation path is always available and prominently displayed.
- The admin panel (`/admin`) requires a human operator to add, update, or delete orders.
- The AI explicitly tells users when it cannot help and directs them to human support.

---

## Transparency

- The chatbot header clearly states *"Powered by Groq · llama-3.3-70b"* so users know they are interacting with an AI.
- The system prompt is not hidden from the development team — it is version-controlled in `server/_core/chat.ts`.
- All guardrail blocks are logged server-side with a timestamp and reason for audit purposes.

---

## Environmental Impact

- **No GPU infrastructure:** All inference runs on Groq's shared infrastructure, which uses custom LPU (Language Processing Unit) hardware optimised for energy efficiency.
- **Serverless-first:** No always-on servers. The backend only consumes compute when a request is made.
- **Minimal data storage:** No chat history is persisted. Only order records are stored in the database.

---

## Team

| Name | Role |
|---|---|
| Obikaonu Agnes Chidiebere | Developer & Presenter |
| Sargunam Gunasekaran | Developer & Presenter |
