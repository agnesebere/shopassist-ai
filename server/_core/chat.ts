/**
 * ShopAssist AI — Chat API Handler
 *
 * Streaming chat endpoint powered by Groq (llama-3.3-70b-versatile).
 * Orders are loaded from the database; tools query DB in real-time.
 *
 * ── GUARDRAILS ──────────────────────────────────────────────
 * 1. INPUT PII REDACTION    — masks credit cards, emails, phone numbers
 * 2. TOPIC RESTRICTION      — blocks off-topic messages before they reach the AI
 * 3. SCOPE ENFORCEMENT      — system prompt strictly limits AI to e-commerce support
 * 4. HALLUCINATION PREVENTION — AI must use tools; never invent order data
 * 5. TONE ENFORCEMENT       — system prompt mandates polite, professional tone
 */

import { streamText, stepCountIs, tool, convertToModelMessages } from "ai";
import { createGroq } from "@ai-sdk/groq";
import type { Express } from "express";
import { z } from "zod/v4";
import { ENV } from "./env";
import { getOrdersByCustomer, getOrderById } from "../db";

const DEMO_CUSTOMER_ID = "C-10482";

// ── GUARDRAIL 1: PII Redaction ───────────────────────────────
// Masks sensitive data in user input BEFORE it reaches the AI
function redactPII(text: string): string {
  return text
    // Credit/debit card numbers (13–19 digits, with or without spaces/dashes)
    .replace(/\b(?:\d[ -]?){13,19}\b/g, "[CARD REDACTED]")
    // Email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL REDACTED]")
    // Phone numbers (various formats)
    .replace(/(\+?\d[\s.-]?)?(\(?\d{3}\)?[\s.-]?)(\d{3}[\s.-]?\d{4})/g, "[PHONE REDACTED]")
    // Social security numbers (XXX-XX-XXXX)
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN REDACTED]");
}

// ── GUARDRAIL 2: Topic Restriction ──────────────────────────
// Blocks messages that are clearly off-topic (politics, entertainment, etc.)
// Returns a rejection message if off-topic, or null if the message is allowed
const OFF_TOPIC_PATTERNS = [
  /\b(politics|election|president|government|war|military|religion|god|allah|jesus|bitcoin|crypto|stock market|nfl|nba|soccer|football|movie|music|celebrity|weather forecast|recipe|homework|essay|code for me|write me a)\b/i,
  /\b(who (won|is|was) the|what is the capital of|tell me a joke|write a poem|give me a recipe)\b/i,
];

function checkTopicRestriction(text: string): string | null {
  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(text)) {
      return "I'm ShopAssist, your e-commerce support agent. I can only help with orders, returns, shipping, and related questions. Is there anything I can help you with regarding your orders?";
    }
  }
  return null;
}

// ── GUARDRAIL 3 & 4 & 5: System Prompt (Scope + Hallucination + Tone) ──
function buildSystemPrompt(orderSummary: string) {
  return `You are ShopAssist, a friendly and professional AI-powered customer support agent for ShopMart, an e-commerce platform.

SCOPE — You ONLY help with:
- Order tracking and delivery status
- Returns, refunds, and exchanges (30-day return policy)
- Order cancellations (only before shipment)
- Shipping policy questions
- General e-commerce FAQs

If a customer asks about ANYTHING outside this scope (politics, general knowledge, coding, etc.), politely decline and redirect them to their orders.

HALLUCINATION PREVENTION — CRITICAL RULES:
- NEVER invent, guess, or fabricate order details, tracking numbers, or delivery dates.
- ALWAYS use the lookupOrder tool to fetch real order data before answering order-specific questions.
- If an order is not found, say "I couldn't find that order" — do NOT make up information.
- Only state facts that come directly from the tool results or the order summary below.

TONE ENFORCEMENT:
- Always be warm, polite, and professional. Never be rude, sarcastic, or dismissive.
- Use clear, simple language. Avoid jargon.
- If a customer is frustrated, acknowledge their feelings before providing a solution.

Customer (ID: ${DEMO_CUSTOMER_ID}) recent orders:
${orderSummary}

Operational rules:
- Use lookupOrder tool for specific order queries.
- Use initiateReturn tool when a customer wants to start a return.
- Cancellations: only "processing" status orders can be cancelled.
- Delayed orders: acknowledge the delay, share the reason if available, offer escalation.
- Escalation contact: support@shopmart.com or 1-800-SHOP-123.
- Shipping: free standard on orders over $50; express 2-day for $9.99.
- Refunds: processed within 5–7 business days.`;
}

// ── Tools ────────────────────────────────────────────────────
function buildShopTools() {
  return {
    lookupOrder: tool({
      description: "Look up the details and current status of a customer order by order ID",
      inputSchema: z.object({
        orderId: z.string().describe("The order ID to look up, e.g. ORD-78234"),
      }),
      execute: async ({ orderId }) => {
        const order = await getOrderById(orderId);
        if (!order) {
          return { found: false, message: `No order found with ID ${orderId}. Please verify the order ID and try again.` };
        }
        return {
          found: true,
          order: {
            ...order,
            steps: JSON.parse(order.steps || "[]"),
          },
        };
      },
    }),

    listOrders: tool({
      description: "List all recent orders for the customer",
      inputSchema: z.object({}),
      execute: async () => {
        const dbOrders = await getOrdersByCustomer(DEMO_CUSTOMER_ID);
        return {
          orders: dbOrders.map(o => ({
            ...o,
            steps: JSON.parse(o.steps || "[]"),
          })),
        };
      },
    }),

    initiateReturn: tool({
      description: "Initiate a return request for a delivered order",
      inputSchema: z.object({
        orderId: z.string().describe("The order ID to return"),
        reason: z.string().describe("The reason for the return"),
      }),
      execute: async ({ orderId, reason }) => {
        const order = await getOrderById(orderId);
        if (!order) {
          return { success: false, message: `Order ${orderId} not found.` };
        }
        if (order.status !== "delivered") {
          return {
            success: false,
            message: `Order ${orderId} cannot be returned yet — it has not been delivered. Current status: ${order.statusLabel}.`,
          };
        }
        const returnId = `RET-${Math.floor(10000 + Math.random() * 90000)}`;
        return {
          success: true,
          returnId,
          message: `Return initiated successfully for ${order.product}. Return ID: ${returnId}. A prepaid shipping label will be emailed to you within 24 hours. Reason recorded: "${reason}".`,
        };
      },
    }),

    cancelOrder: tool({
      description: "Cancel an order that is still in processing status",
      inputSchema: z.object({
        orderId: z.string().describe("The order ID to cancel"),
      }),
      execute: async ({ orderId }) => {
        const order = await getOrderById(orderId);
        if (!order) {
          return { success: false, message: `Order ${orderId} not found.` };
        }
        if (order.status !== "processing") {
          return {
            success: false,
            message: `Order ${orderId} cannot be cancelled — it is already ${order.statusLabel}. Only orders in "Processing" status can be cancelled.`,
          };
        }
        return {
          success: true,
          message: `Order ${orderId} (${order.product}) has been successfully cancelled. A full refund of ${order.price} will be processed within 5–7 business days.`,
        };
      },
    }),
  };
}

// ── Route Registration ───────────────────────────────────────
export function registerChatRoutes(app: Express) {
  const groq = createGroq({ apiKey: ENV.groqApiKey });

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;

      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "messages array is required" });
        return;
      }

      // Get the latest user message
      const lastMessage = messages[messages.length - 1];
      const userText: string =
        lastMessage?.role === "user"
          ? (Array.isArray(lastMessage.parts)
              ? lastMessage.parts
                  .filter((p: { type: string }) => p.type === "text")
                  .map((p: { text: string }) => p.text)
                  .join(" ")
              : String(lastMessage.content ?? ""))
          : "";

      // ── GUARDRAIL 2: Topic Restriction ──
      const topicBlock = checkTopicRestriction(userText);
      if (topicBlock) {
        // Return a proper AI SDK UI message stream so the frontend renders it correctly
        const { streamText: streamTopicBlock } = await import("ai");
        const blockResult = streamTopicBlock({
          model: groq("llama-3.3-70b-versatile"),
          system: "You are a helpful assistant. Reply ONLY with the exact message provided to you, word for word, nothing else.",
          messages: [{ role: "user", content: `Reply with exactly this message, word for word: "${topicBlock}"` }],
        });
        blockResult.pipeUIMessageStreamToResponse(res);
        return;
      }

      // ── GUARDRAIL 1: PII Redaction ──
      // Redact PII from all user messages before sending to the AI
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sanitizedMessages: any[] = messages.map((msg: any) => {
        if (msg.role !== "user") return msg;
        if (Array.isArray(msg.parts)) {
          return {
            ...msg,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parts: msg.parts.map((part: any) =>
              part.type === "text" ? { ...part, text: redactPII(part.text ?? "") } : part
            ),
          };
        }
        if (typeof msg.content === "string") {
          return { ...msg, content: redactPII(msg.content) };
        }
        return msg;
      });

      // Load orders from DB to build system prompt
      const dbOrders = await getOrdersByCustomer(DEMO_CUSTOMER_ID);
      const orderSummary =
        dbOrders.length > 0
          ? dbOrders
              .map(
                (o) =>
                  `- ${o.orderId}: ${o.product} | Status: ${o.statusLabel} | Ordered: ${o.orderedAt} | Price: ${o.price} | Carrier: ${o.carrier ?? "N/A"} | ETA: ${o.eta ?? "N/A"} | Tracking: ${o.trackingCode ?? "N/A"}${o.notes ? ` | Note: ${o.notes}` : ""}`
              )
              .join("\n")
          : "No recent orders found.";

      // Convert UIMessage[] to ModelMessage[] for streamText
      const modelMessages = await convertToModelMessages(sanitizedMessages);

      const result = streamText({
        model: groq("llama-3.3-70b-versatile"),
        system: buildSystemPrompt(orderSummary),
        messages: modelMessages,
        tools: buildShopTools(),
        stopWhen: stepCountIs(5),
      });

      result.pipeUIMessageStreamToResponse(res);
    } catch (error) {
      console.error("[/api/chat] Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });
}
