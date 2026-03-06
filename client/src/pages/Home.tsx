/* =============================================================
   ShopAssist AI — Home Page (Groq-powered Chatbot)
   Design: Warm Commerce — Forest Green sidebar, Cream chat area
   Uses useChat from @ai-sdk/react for real streaming LLM responses
   ============================================================= */

import { useChat, type UIMessage, Chat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import {
  Send, Package, RotateCcw, HelpCircle, ChevronRight,
  Truck, CheckCircle2, Clock, AlertCircle, MessageSquare,
  Phone, Mail, Star, Loader2
} from "lucide-react";
import { Streamdown } from "streamdown";

// ── Mock Order Data (mirrors server) ────────────────────────
const MOCK_ORDERS = [
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

const STATUS_STEPS = ["ordered", "processed", "shipped", "in_transit", "delivered"];
const STATUS_LABELS: Record<string, string> = {
  ordered: "Ordered",
  processed: "Processed",
  shipped: "Shipped",
  in_transit: "In Transit",
  delivered: "Delivered",
};

// ── Quick Reply Chips per context ────────────────────────────
const WELCOME_CHIPS = ["Track my order", "Start a return", "Cancel an order", "Talk to an agent"];
const TRACKING_CHIPS = ["Track another order", "Start a return", "Contact support"];
const RETURN_CHIPS = ["Return ORD-78234", "Return ORD-77891", "Return policy FAQ"];
const GENERAL_CHIPS = ["Track my order", "Shipping policy", "Talk to an agent"];

// ── Sub-components ───────────────────────────────────────────
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "delivered": return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    case "in_transit": return <Truck className="w-4 h-4 text-amber-500" />;
    case "processing": return <Clock className="w-4 h-4 text-blue-500" />;
    default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
  }
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const colors: Record<string, string> = {
    delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
    in_transit: "bg-amber-50 text-amber-700 border-amber-200",
    processing: "bg-blue-50 text-blue-700 border-blue-200",
    delayed: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${colors[status] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
      <StatusIcon status={status} />
      {label}
    </span>
  );
}

function OrderProgressBar({ currentSteps }: { currentSteps: string[] }) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        {STATUS_STEPS.map((step, i) => {
          const completed = currentSteps.includes(step);
          const isLast = i === STATUS_STEPS.length - 1;
          return (
            <div key={step} className="flex items-center flex-1">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 transition-all ${completed ? "bg-green-600" : "bg-gray-200"}`} />
              {!isLast && (
                <div className={`h-0.5 flex-1 mx-0.5 ${completed && currentSteps.includes(STATUS_STEPS[i + 1]) ? "bg-green-600" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between">
        {STATUS_STEPS.map(step => (
          <span key={step} className={`text-[9px] font-medium ${currentSteps.includes(step) ? "text-green-700" : "text-gray-400"}`}>
            {STATUS_LABELS[step]}
          </span>
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: typeof MOCK_ORDERS[0] }) {
  return (
    <div className="mt-2 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-gray-400">{order.id}</p>
          <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">{order.product}</p>
          <p className="text-xs text-gray-500 mt-0.5">Ordered {order.date} · {order.price}</p>
        </div>
        <StatusBadge status={order.status} label={order.statusLabel} />
      </div>
      <div className="mt-2 pt-2 border-t border-gray-50 grid grid-cols-2 gap-2 text-xs text-gray-600">
        <div>
          <span className="text-gray-400">Carrier</span>
          <p className="font-medium">{order.carrier}</p>
        </div>
        <div>
          <span className="text-gray-400">Est. Delivery</span>
          <p className="font-medium">{order.eta}</p>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-50">
        <p className="text-[10px] text-gray-400 mb-1">Tracking: <span className="font-mono text-gray-600">{order.trackingCode}</span></p>
        <OrderProgressBar currentSteps={order.steps} />
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 message-animate">
      <div className="w-8 h-8 rounded-full bg-[#1B4332] flex items-center justify-center flex-shrink-0">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/116904845/ejTkHNWBAbKrRgMUkRFbyy/hero-bot-avatar-5Ecm4BhbQjjHou96DWQk9W.webp"
          alt="Bot"
          className="w-full h-full rounded-full object-cover"
        />
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 inline-block" />
          <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 inline-block" />
          <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 inline-block" />
        </div>
      </div>
    </div>
  );
}

// Detect if a bot message mentions an order and return the matching order card
function detectOrderCard(text: string): typeof MOCK_ORDERS[0] | null {
  for (const order of MOCK_ORDERS) {
    if (text.includes(order.id)) return order;
  }
  return null;
}

// Detect which quick-reply chips to show based on message content
function detectChips(text: string): string[] {
  const t = text.toLowerCase();
  if (t.includes("track") || t.includes("in transit") || t.includes("delivered") || t.includes("carrier")) return TRACKING_CHIPS;
  if (t.includes("return") || t.includes("refund") || t.includes("exchange")) return RETURN_CHIPS;
  return GENERAL_CHIPS;
}

// ── Main Component ───────────────────────────────────────────
export default function Home() {
  const [selectedOrder, setSelectedOrder] = useState<typeof MOCK_ORDERS[0] | null>(null);
  const [rating, setRating] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [inputValue, setInputValue] = useState("");

  const [chat] = useState(() => new Chat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: ({ message }: { message: UIMessage }) => {
      const text = message.parts.filter(p => p.type === "text").map(p => (p as { type: "text"; text: string }).text).join("");
      const order = detectOrderCard(text);
      if (order) setSelectedOrder(order);
    },
  }));

  const { messages, sendMessage, status } = useChat({ chat });

  const isLoading = status === "streaming" || status === "submitted";

  const doSend = (text: string) => {
    if (!text.trim() || isLoading) return;
    sendMessage({ text: text.trim() });
    setInputValue("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendChip = (chip: string) => {
    doSend(chip);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend(inputValue);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#FAFAF7] overflow-hidden">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1B4332] flex items-center justify-center">
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-[#1B4332] leading-none">ShopAssist AI</h1>
            <p className="text-[10px] text-gray-400 font-body">Powered by Groq · llama-3.3-70b</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Agent Online
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors" title="Phone support">
              <Phone className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors" title="Email support">
              <Mail className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className="w-72 flex-shrink-0 flex flex-col border-r border-gray-100 overflow-hidden"
          style={{
            background: `url('https://d2xsxph8kpxj0f.cloudfront.net/116904845/ejTkHNWBAbKrRgMUkRFbyy/sidebar-pattern-Rkw96c4TLYDSLWCyMDvY56.webp') center/cover`,
          }}
        >
          <div className="flex flex-col flex-1 overflow-hidden bg-white/80 backdrop-blur-sm">
            {/* User greeting */}
            <div className="px-4 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-base">
                  Y
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Welcome back!</p>
                  <p className="text-xs text-gray-500">Customer #C-10482</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-4 border-b border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick Actions</p>
              <div className="space-y-1">
                {[
                  { icon: <Package className="w-4 h-4" />, label: "Track an Order", prompt: "Track my most recent order" },
                  { icon: <RotateCcw className="w-4 h-4" />, label: "Start a Return", prompt: "I want to start a return" },
                  { icon: <HelpCircle className="w-4 h-4" />, label: "Shipping FAQ", prompt: "What is your shipping policy?" },
                  { icon: <MessageSquare className="w-4 h-4" />, label: "Talk to an Agent", prompt: "I need to speak to a human agent" },
                ].map(({ icon, label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => sendChip(prompt)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-[#1B4332]/5 hover:text-[#1B4332] transition-colors group"
                  >
                    <span className="text-[#1B4332]/50 group-hover:text-[#1B4332] transition-colors">{icon}</span>
                    {label}
                    <ChevronRight className="w-3 h-3 ml-auto text-gray-300 group-hover:text-[#1B4332]/50" />
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Orders */}
            <div className="px-4 py-4 flex-1 overflow-y-auto custom-scrollbar">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent Orders</p>
              <div className="space-y-2">
                {MOCK_ORDERS.map(order => (
                  <button
                    key={order.id}
                    onClick={() => sendChip(`What is the status of my order ${order.id}?`)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedOrder?.id === order.id
                        ? "border-[#1B4332]/30 bg-[#1B4332]/5"
                        : "border-gray-100 bg-white hover:border-[#1B4332]/20 hover:bg-[#1B4332]/3"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-mono text-gray-400">{order.id}</p>
                      <StatusBadge status={order.status} label={order.statusLabel} />
                    </div>
                    <p className="text-xs font-medium text-gray-700 mt-1 line-clamp-1">{order.product}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{order.date}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Satisfaction rating */}
            <div className="px-4 py-3 border-t border-gray-100 bg-amber-50/50">
              <p className="text-[10px] text-gray-500 mb-1.5">Rate your experience</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`transition-colors ${star <= rating ? "text-amber-500" : "text-amber-200 hover:text-amber-400"}`}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 space-y-5">
            {/* Static welcome message — always shown, never sent to API */}
            <div className="flex gap-3 message-animate">
              <div className="w-8 h-8 rounded-full bg-[#1B4332] flex items-center justify-center flex-shrink-0 mt-0.5">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/116904845/ejTkHNWBAbKrRgMUkRFbyy/hero-bot-avatar-5Ecm4BhbQjjHou96DWQk9W.webp"
                  alt="Bot"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-lg">
                  <div className="text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none">
                    <Streamdown>{"Hello! I'm **ShopAssist**, your AI-powered support agent. I'm here to help you with order tracking, returns, cancellations, and more.\n\nWhat can I help you with today?"}</Streamdown>
                  </div>
                </div>
                {messages.length === 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {WELCOME_CHIPS.map((chip, i) => (
                      <button
                        key={chip}
                        onClick={() => sendChip(chip)}
                        className="chip-animate text-xs px-3 py-1.5 rounded-full border border-[#1B4332]/20 text-[#1B4332] bg-white hover:bg-[#1B4332] hover:text-white transition-all duration-150 font-medium shadow-sm"
                        style={{ animationDelay: `${i * 60}ms` }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {messages.map((msg, idx) => {
              const isBot = msg.role === "assistant";
              const isLast = idx === messages.length - 1;
              const msgText = msg.parts.filter(p => p.type === "text").map(p => (p as { type: "text"; text: string }).text).join("");
              const orderCard = isBot ? detectOrderCard(msgText) : null;
              const chips = isBot && isLast && !isLoading ? detectChips(msgText) : null;

              if (!isBot) {
                return (
                  <div key={msg.id} className="flex gap-3 justify-end message-animate">
                    <div className="flex-1 min-w-0 flex flex-col items-end">
                      <div className="bg-[#1B4332] text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm max-w-sm">
                        <p className="text-sm leading-relaxed">{msgText}</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-amber-700 font-semibold text-sm">
                      Y
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex gap-3 message-animate">
                  <div className="w-8 h-8 rounded-full bg-[#1B4332] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <img
                      src="https://d2xsxph8kpxj0f.cloudfront.net/116904845/ejTkHNWBAbKrRgMUkRFbyy/hero-bot-avatar-5Ecm4BhbQjjHou96DWQk9W.webp"
                      alt="Bot"
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-lg">
                      <div className="text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none">
                        <Streamdown>{msgText}</Streamdown>
                      </div>
                      {orderCard && <OrderCard order={orderCard} />}
                    </div>
                    {chips && chips.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {chips.map((chip, i) => (
                          <button
                            key={chip}
                            onClick={() => sendChip(chip)}
                            className="chip-animate text-xs px-3 py-1.5 rounded-full border border-[#1B4332]/20 text-[#1B4332] bg-white hover:bg-[#1B4332] hover:text-white transition-all duration-150 font-medium shadow-sm"
                            style={{ animationDelay: `${i * 60}ms` }}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}



            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="border-t border-gray-100 bg-white px-6 py-4">
            <form onSubmit={(e) => { e.preventDefault(); doSend(inputValue); }}>
              <div className="flex items-center gap-3 bg-[#FAFAF7] border border-gray-200 rounded-2xl px-4 py-2.5 focus-within:border-[#1B4332]/40 focus-within:ring-2 focus-within:ring-[#1B4332]/10 transition-all">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your order, returns, or anything else..."
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none font-body"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="w-8 h-8 rounded-xl bg-[#1B4332] text-white flex items-center justify-center disabled:opacity-30 hover:bg-[#1B4332]/90 transition-all active:scale-95"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </form>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              ShopAssist AI · Powered by Groq (llama-3.3-70b) · Responses may not always be accurate
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
