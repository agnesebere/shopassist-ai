/* =============================================================
   ShopAssist AI — Admin Panel
   Manage all orders: add, update status, delete
   ============================================================= */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Package, Plus, Trash2, RefreshCw, ChevronLeft,
  CheckCircle2, Truck, Clock, AlertCircle, XCircle, Loader2
} from "lucide-react";
import { Link } from "wouter";

const STATUS_OPTIONS = [
  { value: "ordered",    label: "Ordered",     color: "bg-gray-100 text-gray-700" },
  { value: "processing", label: "Processing",  color: "bg-blue-100 text-blue-700" },
  { value: "shipped",    label: "Shipped",     color: "bg-indigo-100 text-indigo-700" },
  { value: "in_transit", label: "In Transit",  color: "bg-amber-100 text-amber-700" },
  { value: "delivered",  label: "Delivered",   color: "bg-emerald-100 text-emerald-700" },
  { value: "delayed",    label: "Delayed",     color: "bg-red-100 text-red-700" },
  { value: "cancelled",  label: "Cancelled",   color: "bg-gray-100 text-gray-500" },
  { value: "refunded",   label: "Refunded",    color: "bg-purple-100 text-purple-700" },
] as const;

type StatusValue = typeof STATUS_OPTIONS[number]["value"];

function StatusBadge({ status, label }: { status: string; label: string }) {
  const opt = STATUS_OPTIONS.find(s => s.value === status);
  const color = opt?.color ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

const EMPTY_FORM = {
  orderId: "",
  customerId: "C-10482",
  product: "",
  category: "",
  price: "",
  status: "processing" as StatusValue,
  carrier: "",
  trackingCode: "",
  eta: "",
  orderedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  notes: "",
};

export default function Admin() {
  const utils = trpc.useUtils();
  const { data: orders = [], isLoading } = trpc.admin.listAllOrders.useQuery();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingStatus, setEditingStatus] = useState<{ orderId: string; status: StatusValue; notes: string } | null>(null);

  const createMutation = trpc.admin.createOrder.useMutation({
    onSuccess: () => {
      toast.success("Order created successfully!");
      utils.admin.listAllOrders.invalidate();
      utils.orders.list.invalidate();
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
    },
    onError: (e) => toast.error("Failed to create order: " + e.message),
  });

  const updateMutation = trpc.admin.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated!");
      utils.admin.listAllOrders.invalidate();
      utils.orders.list.invalidate();
      setEditingStatus(null);
    },
    onError: (e) => toast.error("Failed to update: " + e.message),
  });

  const deleteMutation = trpc.admin.deleteOrder.useMutation({
    onSuccess: () => {
      toast.success("Order deleted.");
      utils.admin.listAllOrders.invalidate();
      utils.orders.list.invalidate();
    },
    onError: (e) => toast.error("Failed to delete: " + e.message),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.orderId || !form.product || !form.price) {
      toast.error("Order ID, Product, and Price are required.");
      return;
    }
    createMutation.mutate({
      orderId: form.orderId,
      customerId: form.customerId,
      product: form.product,
      category: form.category || undefined,
      price: form.price,
      status: form.status,
      carrier: form.carrier || undefined,
      trackingCode: form.trackingCode || undefined,
      eta: form.eta || undefined,
      orderedAt: form.orderedAt,
      notes: form.notes || undefined,
    });
  };

  const handleStatusSave = () => {
    if (!editingStatus) return;
    updateMutation.mutate({
      orderId: editingStatus.orderId,
      status: editingStatus.status,
      notes: editingStatus.notes || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/">
            <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1B4332] transition-colors mr-2">
              <ChevronLeft className="w-4 h-4" /> Back to Chat
            </button>
          </Link>
          <div className="w-8 h-8 rounded-lg bg-[#1B4332] flex items-center justify-center">
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h1 className="font-bold text-[#1B4332] text-lg leading-none">Admin Panel</h1>
            <p className="text-[10px] text-gray-400">Order Management</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setEditingStatus(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1B4332] text-white rounded-lg text-sm font-medium hover:bg-[#1B4332]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Order
        </button>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Add Order Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-5">New Order</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              {[
                { label: "Order ID *", key: "orderId", placeholder: "e.g. ORD-99001" },
                { label: "Customer ID *", key: "customerId", placeholder: "e.g. C-10482" },
                { label: "Product Name *", key: "product", placeholder: "e.g. iPhone 15 Pro" },
                { label: "Category", key: "category", placeholder: "e.g. Electronics" },
                { label: "Price *", key: "price", placeholder: "e.g. $999.00" },
                { label: "Carrier", key: "carrier", placeholder: "e.g. FedEx" },
                { label: "Tracking Code", key: "trackingCode", placeholder: "e.g. FX123456789" },
                { label: "Estimated Delivery", key: "eta", placeholder: "e.g. Mar 20, 2026" },
                { label: "Ordered At *", key: "orderedAt", placeholder: "e.g. Mar 13, 2026" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type="text"
                    placeholder={placeholder}
                    value={(form as Record<string, string>)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]/40"
                  />
                </div>
              ))}

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status *</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as StatusValue }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]/40 bg-white"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Notes — full width */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <textarea
                  placeholder="e.g. Delayed due to weather conditions at Memphis hub"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]/40 resize-none"
                />
              </div>

              <div className="col-span-2 flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 bg-[#1B4332] text-white rounded-lg text-sm font-medium hover:bg-[#1B4332]/90 transition-colors disabled:opacity-60"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Order
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Status Modal */}
        {editingStatus && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-base font-semibold text-gray-800 mb-4">Update Status — {editingStatus.orderId}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">New Status</label>
                  <select
                    value={editingStatus.status}
                    onChange={e => setEditingStatus(s => s ? { ...s, status: e.target.value as StatusValue } : null)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 bg-white"
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                  <textarea
                    value={editingStatus.notes}
                    onChange={e => setEditingStatus(s => s ? { ...s, notes: e.target.value } : null)}
                    rows={2}
                    placeholder="Reason for status change..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-5">
                <button
                  onClick={() => setEditingStatus(null)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusSave}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 bg-[#1B4332] text-white rounded-lg text-sm font-medium hover:bg-[#1B4332]/90 disabled:opacity-60 transition-colors"
                >
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">All Orders ({orders.length})</h2>
            <button
              onClick={() => utils.admin.listAllOrders.invalidate()}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#1B4332] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#1B4332]/40" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No orders yet. Add one above.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    {["Order ID", "Customer", "Product", "Price", "Status", "Carrier", "ETA", "Ordered", "Notes", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.map(order => (
                    <tr key={order.orderId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{order.orderId}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{order.customerId}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px] truncate">{order.product}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{order.price}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={order.status} label={order.statusLabel} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{order.carrier ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{order.eta ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{order.orderedAt}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-[140px] truncate">{order.notes ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingStatus({ orderId: order.orderId, status: order.status as StatusValue, notes: order.notes ?? "" })}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1B4332] border border-[#1B4332]/20 rounded-lg hover:bg-[#1B4332]/5 transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" /> Status
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete order ${order.orderId}?`)) {
                                deleteMutation.mutate({ orderId: order.orderId });
                              }
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick test tip */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4 text-sm text-amber-800">
          <strong>How to test:</strong> Add or update an order here, then go back to the chat and ask about it by order ID (e.g. <span className="font-mono bg-amber-100 px-1 rounded">What is the status of ORD-99001?</span>). The AI will fetch the latest data from the database in real-time.
        </div>
      </div>
    </div>
  );
}
