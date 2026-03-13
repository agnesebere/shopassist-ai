/**
 * ShopAssist AI — Chat API Handler
 *
 * Streaming chat endpoint powered by Groq (llama-3.3-70b-versatile).
 * Orders are loaded from the database; tools query DB in real-time.
 */

import { streamText, stepCountIs, tool, convertToModelMessages } from "ai";
import { createGroq } from "@ai-sdk/groq";
import type { Express } from "express";
import { z } from "zod/v4";
import { ENV } from "./env";
import { getOrdersByCustomer, getOrderById } from "../db";

// Default customer ID for demo purposes
const DEMO_CUSTOMER_ID = "C-10482";

// ── System Prompt Builder ────────────────────────────────────
function buildSystemPrompt(orderSummary: string) {
  return `You are ShopAssist, a friendly and efficient AI-powered customer support agent for ShopMart, an e-commerce platform.

Your role is to help customers with:
- Order tracking and delivery status updates
- Returns, refunds, and exchanges (30-day return policy)
- Order cancellations (only possible before shipment)
- Shipping policy questions
- General FAQs

The customer (ID: ${DEMO_CUSTOMER_ID}) has the following recent orders:
${orderSummary}

Guidelines:
- Be warm, concise, and helpful. Use the customer's order data when relevant.
- Use the lookupOrder tool when a customer asks about a specific order by ID.
- Use the initiateReturn tool when a customer wants to start a return.
- For cancellations: only orders with status "processing" can be cancelled. Shipped/in-transit orders cannot be cancelled.
- For delayed orders: acknowledge the delay, share the notes/reason if available, and offer to escalate.
- For cancelled orders: confirm the cancellation and refund status.
- For refunded orders: confirm the refund was processed.
- For escalations, provide the contact: support@shopmart.com or 1-800-SHOP-123.
- Shipping policy: free standard shipping on orders over $50; express 2-day for $9.99.
- Refunds are processed within 5–7 business days.
- Always be honest if you don't know something.`;
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
          return { found: false, message: `No order found with ID ${orderId}` };
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

      // Load orders from DB to build system prompt
      const dbOrders = await getOrdersByCustomer(DEMO_CUSTOMER_ID);
      const orderSummary = dbOrders.length > 0
        ? dbOrders.map(o =>
            `- ${o.orderId}: ${o.product} | Status: ${o.statusLabel} | Ordered: ${o.orderedAt} | Price: ${o.price} | Carrier: ${o.carrier ?? "N/A"} | ETA: ${o.eta ?? "N/A"} | Tracking: ${o.trackingCode ?? "N/A"}${o.notes ? ` | Note: ${o.notes}` : ""}`
          ).join("\n")
        : "No recent orders found.";

      // Convert UIMessage[] (from @ai-sdk/react useChat) to ModelMessage[] (required by streamText)
      const modelMessages = await convertToModelMessages(messages);

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
