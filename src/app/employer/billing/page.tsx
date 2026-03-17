"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, ShoppingCart, Users, Package } from "lucide-react";

interface SeatBalance {
  total_purchased: number;
  total_assigned: number;
  available: number;
}

interface PurchaseRecord {
  id: string;
  seats_purchased: number;
  price_per_seat: string;
  total: string;
  payment_method: string;
  date: string;
}

export default function BillingPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<SeatBalance | null>(null);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [balanceRes, historyRes] = await Promise.all([
        fetch("/api/v1/employer/seats"),
        fetch("/api/v1/employer/seats/history"),
      ]);

      const balanceJson = await balanceRes.json();
      const historyJson = await historyRes.json();

      if (balanceRes.ok && balanceJson.data) {
        setBalance(balanceJson.data);
      }
      if (historyRes.ok && historyJson.data) {
        setPurchases(historyJson.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Loading Skeleton ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-border p-5 space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg border border-border p-5 space-y-3">
          <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Billing</h1>
          <p className="text-sm text-text-secondary mt-1">Manage your seat purchases and usage.</p>
        </div>
        <button
          onClick={() => router.push("/employer/purchase")}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          Buy more seats
        </button>
      </div>

      {/* Seat Balance Cards */}
      {balance && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 text-sm text-text-secondary mb-1">
              <Package className="w-4 h-4" />
              Available
            </div>
            <p className="text-2xl font-semibold text-primary">{balance.available}</p>
          </div>
          <div className="bg-white rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 text-sm text-text-secondary mb-1">
              <Users className="w-4 h-4" />
              Assigned
            </div>
            <p className="text-2xl font-semibold text-text-primary">{balance.total_assigned}</p>
          </div>
          <div className="bg-white rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 text-sm text-text-secondary mb-1">
              <CreditCard className="w-4 h-4" />
              Total purchased
            </div>
            <p className="text-2xl font-semibold text-text-primary">{balance.total_purchased}</p>
          </div>
        </div>
      )}

      {/* Purchase History */}
      <div className="bg-white rounded-lg border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-text-primary">Purchase history</h2>
        </div>

        {purchases.length === 0 ? (
          <div className="p-10 text-center">
            <CreditCard className="w-10 h-10 text-text-secondary mx-auto mb-3" />
            <p className="text-text-secondary">No purchases yet.</p>
            <button
              onClick={() => router.push("/employer/purchase")}
              className="mt-3 text-sm text-primary font-medium hover:underline"
            >
              Purchase your first seats
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  <th className="text-left px-5 py-3 font-medium text-text-secondary">Date</th>
                  <th className="text-left px-5 py-3 font-medium text-text-secondary">Seats</th>
                  <th className="text-left px-5 py-3 font-medium text-text-secondary">Price/seat</th>
                  <th className="text-left px-5 py-3 font-medium text-text-secondary">Total</th>
                  <th className="text-left px-5 py-3 font-medium text-text-secondary">Payment</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="border-b border-border last:border-b-0 hover:bg-gray-50">
                    <td className="px-5 py-3 text-text-primary">
                      {new Date(purchase.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3 text-text-primary">{purchase.seats_purchased}</td>
                    <td className="px-5 py-3 text-text-primary">{purchase.price_per_seat}</td>
                    <td className="px-5 py-3 font-medium text-text-primary">{purchase.total}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-text-secondary capitalize">
                        {purchase.payment_method}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
