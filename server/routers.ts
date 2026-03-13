import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getOrdersByCustomer, getOrderById, getAllOrders, createOrder, updateOrderStatus, deleteOrder } from "./db";
import { z } from "zod/v4";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Customer-facing orders (filtered by customer) ────────────
  orders: router({
    list: publicProcedure.query(async () => {
      const rows = await getOrdersByCustomer("C-10482");
      return rows.map(o => ({
        ...o,
        steps: JSON.parse(o.steps || "[]") as string[],
      }));
    }),
  }),

  // ── Admin procedures (full CRUD on all orders) ───────────────
  admin: router({
    listAllOrders: publicProcedure.query(async () => {
      const rows = await getAllOrders();
      return rows.map(o => ({
        ...o,
        steps: JSON.parse(o.steps || "[]") as string[],
      }));
    }),

    createOrder: publicProcedure
      .input(z.object({
        orderId: z.string().min(1),
        customerId: z.string().min(1),
        product: z.string().min(1),
        category: z.string().optional(),
        price: z.string().min(1),
        status: z.enum(["ordered", "processing", "shipped", "in_transit", "delivered", "cancelled", "refunded", "delayed"]),
        carrier: z.string().optional(),
        trackingCode: z.string().optional(),
        eta: z.string().optional(),
        orderedAt: z.string().min(1),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const STATUS_LABELS: Record<string, string> = {
          ordered: "Ordered",
          processing: "Processing",
          shipped: "Shipped",
          in_transit: "In Transit",
          delivered: "Delivered",
          cancelled: "Cancelled",
          refunded: "Refunded",
          delayed: "Delayed",
        };
        const STATUS_STEPS: Record<string, string[]> = {
          ordered: ["ordered"],
          processing: ["ordered", "processed"],
          shipped: ["ordered", "processed", "shipped"],
          in_transit: ["ordered", "processed", "shipped", "in_transit"],
          delivered: ["ordered", "processed", "shipped", "in_transit", "delivered"],
          delayed: ["ordered", "processed", "shipped"],
          cancelled: ["ordered"],
          refunded: ["ordered", "processed", "shipped", "in_transit", "delivered"],
        };
        await createOrder({
          ...input,
          statusLabel: STATUS_LABELS[input.status] ?? input.status,
          steps: JSON.stringify(STATUS_STEPS[input.status] ?? ["ordered"]),
          category: input.category ?? null,
          carrier: input.carrier ?? null,
          trackingCode: input.trackingCode ?? null,
          eta: input.eta ?? null,
          notes: input.notes ?? null,
        });
        return { success: true };
      }),

    updateStatus: publicProcedure
      .input(z.object({
        orderId: z.string(),
        status: z.enum(["ordered", "processing", "shipped", "in_transit", "delivered", "cancelled", "refunded", "delayed"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const STATUS_LABELS: Record<string, string> = {
          ordered: "Ordered",
          processing: "Processing",
          shipped: "Shipped",
          in_transit: "In Transit",
          delivered: "Delivered",
          cancelled: "Cancelled",
          refunded: "Refunded",
          delayed: "Delayed",
        };
        const STATUS_STEPS: Record<string, string[]> = {
          ordered: ["ordered"],
          processing: ["ordered", "processed"],
          shipped: ["ordered", "processed", "shipped"],
          in_transit: ["ordered", "processed", "shipped", "in_transit"],
          delivered: ["ordered", "processed", "shipped", "in_transit", "delivered"],
          delayed: ["ordered", "processed", "shipped"],
          cancelled: ["ordered"],
          refunded: ["ordered", "processed", "shipped", "in_transit", "delivered"],
        };
        await updateOrderStatus(input.orderId, {
          status: input.status,
          statusLabel: STATUS_LABELS[input.status] ?? input.status,
          steps: JSON.stringify(STATUS_STEPS[input.status] ?? ["ordered"]),
          notes: input.notes ?? null,
        });
        return { success: true };
      }),

    deleteOrder: publicProcedure
      .input(z.object({ orderId: z.string() }))
      .mutation(async ({ input }) => {
        await deleteOrder(input.orderId);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
