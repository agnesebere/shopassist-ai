/* =============================================================
   ShopAssist AI — Home Page (Chatbot Interface)
   Design: Warm Commerce — Forest Green sidebar, Cream chat area
   Two-column layout: Left sidebar (35%) + Right chat (65%)
   ============================================================= */

import { useState, useRef, useEffect } from "react";
import { Send, Package, RotateCcw, HelpCircle, ChevronRight, Truck, CheckCircle2, Clock, AlertCircle, MessageSquare, Phone, Mail, Star } from "lucide-react";

// ── Mock Order Data ──────────────────────────────────────────
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

// ── LLM-style Response Engine ────────────────────────────────
function generateBotResponse(userMessage: string): { text: string; orderCard?: typeof MOCK_ORDERS[0]; chips?: string[] } {
  const msg = userMessage.toLowerCase();

  // Order tracking intent
  const orderMatch = MOCK_ORDERS.find(o =>
    msg.includes(o.id.toLowerCase()) || msg.includes(o.product.toLowerCase().split(" ")[0])
  );

  if (orderMatch || msg.includes("order") || msg.includes("track") || msg.includes("where")) {
    const order = orderMatch || MOCK_ORDERS[0];
    return {
      text: `I found your order **${order.id}** for *${order.product}*. Here's the latest update:`,
      orderCard: order,
      chips: ["Track another order", "Start a return", "Contact support"],
    };
  }

  if (msg.includes("return") || msg.includes("refund") || msg.includes("exchange")) {
    return {
      text: "I can help you with a return or refund. Our return policy allows returns within **30 days** of delivery for most items. To start a return:\n\n1. Select the order you'd like to return\n2. Choose your reason\n3. Print the prepaid label we'll email you\n\nWould you like me to initiate a return for one of your recent orders?",
      chips: ["Return ORD-78234", "Return ORD-77891", "Return policy FAQ"],
    };
  }

  if (msg.includes("delay") || msg.includes("late") || msg.includes("slow")) {
    return {
      text: "I understand your frustration — delays are never fun! Your order **ORD-78234** is currently in transit and is experiencing a **1-day delay** due to high carrier volume. The updated estimated delivery is **March 8, 2026**.\n\nWould you like me to escalate this to our logistics team or send you a delivery notification?",
      chips: ["Escalate to team", "Set delivery alert", "Request compensation"],
    };
  }

  if (msg.includes("cancel")) {
    return {
      text: "I can check if your order is still eligible for cancellation. Orders can be cancelled **before they are shipped**. Your order **ORD-76540** (Stainless Steel Water Bottle) is still in processing and **can be cancelled**.\n\nWould you like to proceed with the cancellation?",
      chips: ["Yes, cancel ORD-76540", "No, keep it", "Talk to an agent"],
    };
  }

  if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey") || msg.includes("help")) {
    return {
      text: "Hello! I'm **ShopAssist**, your AI-powered support agent. I'm here to help you with:\n\n- Order tracking & delivery updates\n- Returns, refunds & exchanges\n- Cancellations\n- Product questions & FAQs\n\nWhat can I help you with today?",
      chips: ["Track my order", "Start a return", "Cancel an order", "Talk to an agent"],
    };
  }

  if (msg.includes("agent") || msg.includes("human") || msg.includes("person") || msg.includes("support")) {
    return {
      text: "Of course! I'm connecting you with a live support agent. Our team is available **Monday–Friday, 9am–6pm EST**.\n\nCurrent wait time: **~3 minutes**\n\nAlternatively, you can reach us at:\n- **Email:** support@shopmart.com\n- **Phone:** 1-800-SHOP-123",
      chips: ["Join queue", "Send email instead", "Schedule callback"],
    };
  }

  if (msg.includes("faq") || msg.includes("policy") || msg.includes("shipping")) {
    return {
      text: "Here are our most common policies:\n\n**Shipping:** Free standard shipping on orders over $50. Express (2-day) available for $9.99.\n\n**Returns:** 30-day return window for all items in original condition.\n\n**Refunds:** Processed within 5–7 business days to your original payment method.\n\nIs there anything specific you'd like to know more about?",
      chips: ["Shipping details", "Return policy", "Payment methods"],
    };
  }

  return {
    text: "I'm here to help! Could you give me a bit more detail about your question? For example, you can share your **order number** (e.g., ORD-78234) or describe what you need help with.",
    chips: ["Track my order", "Start a return", "Shipping FAQ", "Talk to an agent"],
  };
}

// ── Types ────────────────────────────────────────────────────
type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
  orderCard?: typeof MOCK_ORDERS[0];
  chips?: string[];
  timestamp: Date;
};

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

function OrderProgressBar({ steps, currentSteps }: { steps: string[]; currentSteps: string[] }) {
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
        <OrderProgressBar steps={STATUS_STEPS} currentSteps={order.steps} />
      </div>
    </div>
  );
}

function BotMessage({ message }: { message: Message }) {
  const lines = message.text.split("\n").filter(Boolean);
  return (
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
          <div className="text-sm text-gray-800 leading-relaxed space-y-1">
            {lines.map((line, i) => {
              // Bold markdown
              const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
              return (
                <p key={i} className={line.startsWith("-") ? "pl-3" : ""}>
                  {parts.map((part, j) => {
                    if (part.startsWith("**") && part.endsWith("**"))
                      return <strong key={j} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
                    if (part.startsWith("*") && part.endsWith("*"))
                      return <em key={j} className="italic text-gray-700">{part.slice(1, -1)}</em>;
                    return <span key={j}>{part}</span>;
                  })}
                </p>
              );
            })}
          </div>
          {message.orderCard && <OrderCard order={message.orderCard} />}
        </div>
        {message.chips && message.chips.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.chips.map((chip, i) => (
              <button
                key={chip}
                data-chip={chip}
                className="chip-animate text-xs px-3 py-1.5 rounded-full border border-[#1B4332]/20 text-[#1B4332] bg-white hover:bg-[#1B4332] hover:text-white transition-all duration-150 font-medium shadow-sm"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
        <p className="text-[10px] text-gray-400 mt-1 ml-1">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

function UserMessage({ message }: { message: Message }) {
  return (
    <div className="flex gap-3 justify-end message-animate">
      <div className="flex-1 min-w-0 flex flex-col items-end">
        <div className="bg-[#1B4332] text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm max-w-sm">
          <p className="text-sm leading-relaxed">{message.text}</p>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 mr-1">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-amber-700 font-semibold text-sm">
        Y
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

// ── Main Component ───────────────────────────────────────────
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Hello! I'm **ShopAssist**, your AI-powered support agent. I'm here to help you with:\n\n- Order tracking & delivery updates\n- Returns, refunds & exchanges\n- Cancellations\n- Product questions & FAQs\n\nWhat can I help you with today?",
      chips: ["Track my order", "Start a return", "Cancel an order", "Talk to an agent"],
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<typeof MOCK_ORDERS[0] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: text.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = generateBotResponse(text);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        text: response.text,
        orderCard: response.orderCard,
        chips: response.chips,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
      if (response.orderCard) setSelectedOrder(response.orderCard);
    }, 1000 + Math.random() * 600);
  };

  const handleChipClick = (e: React.MouseEvent) => {
    const chip = (e.target as HTMLElement).closest("[data-chip]")?.getAttribute("data-chip");
    if (chip) sendMessage(chip);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
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
            <p className="text-[10px] text-gray-400 font-body">E-Commerce Support Bot</p>
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
          {/* Sidebar overlay for readability */}
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
                  { icon: <Package className="w-4 h-4" />, label: "Track an Order", prompt: "Track my order" },
                  { icon: <RotateCcw className="w-4 h-4" />, label: "Start a Return", prompt: "I want to start a return" },
                  { icon: <HelpCircle className="w-4 h-4" />, label: "Shipping FAQ", prompt: "What is your shipping policy?" },
                  { icon: <MessageSquare className="w-4 h-4" />, label: "Talk to an Agent", prompt: "I need to speak to a human agent" },
                ].map(({ icon, label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => sendMessage(prompt)}
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
                    onClick={() => sendMessage(`Track my order ${order.id}`)}
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
                  <button key={star} className="text-amber-300 hover:text-amber-500 transition-colors">
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
          <div
            className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 space-y-5"
            onClick={handleChipClick}
          >
            {messages.map(msg =>
              msg.role === "bot"
                ? <BotMessage key={msg.id} message={msg} />
                : <UserMessage key={msg.id} message={msg} />
            )}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="border-t border-gray-100 bg-white px-6 py-4">
            <div className="flex items-center gap-3 bg-[#FAFAF7] border border-gray-200 rounded-2xl px-4 py-2.5 focus-within:border-[#1B4332]/40 focus-within:ring-2 focus-within:ring-[#1B4332]/10 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your order, returns, or anything else..."
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none font-body"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                className="w-8 h-8 rounded-xl bg-[#1B4332] text-white flex items-center justify-center disabled:opacity-30 hover:bg-[#1B4332]/90 transition-all active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              ShopAssist AI · Powered by LLM · Responses may not always be accurate
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
