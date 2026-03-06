/**
 * ShopAssist AI — Chat API Handler
 *
 * Streaming chat endpoint powered by Groq (llama-3.3-70b-versatile).
 * Includes order-lookup and return-initiation tools backed by mock data.
 */

import { streamText, stepCountIs, tool, convertToModelMessages } from "ai";
import { createGroq } from "@ai-sdk/groq";
import type { Express } from "express";
import { z } from "zod/v4";
import { ENV } from "./env";

// ── Mock Order Database ──────────────────────────────────────
const ORDERS = [
  {
    id: "ORD-78234",
    product: "Wireless Noise-Cancelling Headphones",
    date: "Feb 28, 2026",
    status: "in_transit",
    statusLabel: "In Transit",
    eta: "Mar 8, 2026",
    carrier: "FedEx",
    trackingCode: "FX9284710234",
    price: "$149.99",
    steps: ["ordered", "processed", "shipped", "in_transit"],
  },
  {
    id: "ORD-77891",
    product: "Ergonomic Office Chair",
    date: "Feb 20, 2026",
    status: "delivered",
    statusLabel: "Delivered",
    eta: "Feb 25, 2026",
    carrier: "UPS",
    trackingCode: "UP1928374650",
    price: "$329.00",
    steps: ["ordered", "processed", "shipped", "in_transit", "delivered"],
  },
  {
    id: "ORD-76540",
    product: "Stainless Steel Water Bottle (3-pack)",
    date: "Mar 1, 2026",
    status: "processing",
    statusLabel: "Processing",
    eta: "Mar 10, 2026",
    carrier: "DHL",
    trackingCode: "DH7364829103",
    price: "$44.99",
    steps: ["ordered", "processed"],
  },
];

// ── System Prompt ────────────────────────────────────────────
const SYSTEM_PROMPT = `You are ShopAssist, a friendly and efficient AI-powered customer support agent for ShopMart, an e-commerce platform.

Your role is to help customers with:
- Order tracking and delivery status updates
- Returns, refunds, and exchanges (30-day return policy)
- Order cancellations (only possible before shipment)
- Shipping policy questions
- General FAQs

The customer has the following recent orders:
${ORDERS.map(o => `- ${o.id}: ${o.product} | Status: ${o.statusLabel} | Ordered: ${o.date} | Price: ${o.price} | Carrier: ${o.carrier} | ETA: ${o.eta} | Tracking: ${o.trackingCode}`).join("\n")}

Guidelines:
- Be warm, concise, and helpful. Use the customer's order data when relevant.
- Use the lookupOrder tool when a customer asks about a specific order.
- Use the initiateReturn tool when a customer wants to start a return.
- For cancellations: only ORD-76540 is still in "processing" and can be cancelled. ORD-78234 is already shipped and cannot be cancelled.
- For escalations, provide the contact: support@shopmart.com or 1-800-SHOP-123.
- Shipping policy: free standard shipping on orders over $50; express 2-day for $9.99.
- Refunds are processed within 5–7 business days.
- Always be honest if you don't know something.`;

// ── Tools ────────────────────────────────────────────────────
const shopTools = {
  lookupOrder: tool({
    description: "Look up the details and current status of a customer order by order ID",
    inputSchema: z.object({
      orderId: z.string().describe("The order ID to look up, e.g. ORD-78234"),
    }),
    execute: async ({ orderId }) => {
      const order = ORDERS.find(o => o.id.toLowerCase() === orderId.toLowerCase());
      if (!order) {
        return { found: false, message: `No order found with ID ${orderId}` };
      }
      return { found: true, order };
    },
  }),

  initiateReturn: tool({
    description: "Initiate a return request for a delivered order",
    inputSchema: z.object({
      orderId: z.string().describe("The order ID to return"),
      reason: z.string().describe("The reason for the return"),
    }),
    execute: async ({ orderId, reason }) => {
      const order = ORDERS.find(o => o.id.toLowerCase() === orderId.toLowerCase());
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

  listOrders: tool({
    description: "List all recent orders for the customer",
    inputSchema: z.object({}),
    execute: async () => {
      return { orders: ORDERS };
    },
  }),
};

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

      // Convert UIMessage[] (from @ai-sdk/react useChat) to ModelMessage[] (required by streamText)
      const modelMessages = await convertToModelMessages(messages);

      const result = streamText({
        model: groq("llama-3.3-70b-versatile"),
        system: SYSTEM_PROMPT,
        messages: modelMessages,
        tools: shopTools,
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

export { shopTools as tools };
