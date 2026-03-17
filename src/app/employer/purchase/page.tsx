"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { calculateTotal, PRICING_TIERS, MIN_SEAT_PURCHASE } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { CheckCircle2, Minus, Plus, ShoppingCart, Users } from "lucide-react";
import { EmployerRoute } from "@/components/auth/protected-route";
import { EmployerLayout } from "@/components/layout/employer-sidebar";

type PurchaseState = "input" | "processing" | "success";

interface PurchaseResult {
  seats_purchased: number;
  balance: {
    total_purchased: number;
    available: number;
  };
}

function PurchasePageContent() {
  const router = useRouter();
  const [quantity, setQuantity] = useState(10);
  const [state, setState] = useState<PurchaseState>("input");
  const [error, setError] = useState("");
  const [result, setResult] = useState<PurchaseResult | null>(null);

  const pricing = useMemo(() => calculateTotal(Math.max(quantity, MIN_SEAT_PURCHASE)), [quantity]);

  const handleQuantityChange = (value: number) => {
    const clamped = Math.max(MIN_SEAT_PURCHASE, Math.min(10000, value));
    setQuantity(clamped);
    setError("");
  };

  const handlePurchase = async () => {
    if (quantity < MIN_SEAT_PURCHASE) {
      setError(`Minimum purchase is ${MIN_SEAT_PURCHASE} seats`);
      return;
    }

    setState("processing");
    setError("");

    try {
      const res = await fetch("/api/v1/employer/seats/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message || "Purchase failed. Please try again.");
        setState("input");
        return;
      }

      setResult(json.data);
      setState("success");
    } catch {
      setError("Network error. Please try again.");
      setState("input");
    }
  };

  // ─── Success State ────────────────────────────────────────────────
  if (state === "success" && result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">
            You&apos;re ready to launch
          </h1>
          <p className="text-text-secondary">
            You purchased <span className="font-semibold text-text-primary">{result.seats_purchased} seats</span>.
            You now have{" "}
            <span className="font-semibold text-text-primary">{result.balance.available} available seats</span>{" "}
            to assign to employees.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => router.push("/employer/invite")}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-md font-medium hover:bg-primary/90 transition-colors"
            >
              <Users className="w-4 h-4" />
              Invite employees
            </button>
            <button
              onClick={() => router.push("/employer/dashboard")}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-border text-text-primary rounded-md font-medium hover:bg-gray-50 transition-colors"
            >
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Purchase Form ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-text-primary">Purchase seats</h1>
          <p className="text-text-secondary">
            Each seat gives one employee 90 days of full access to Waypointer&apos;s career transition tools.
            Minimum purchase: {MIN_SEAT_PURCHASE} seats.
          </p>
        </div>

        {/* Quantity Selector */}
        <div className="bg-white rounded-lg border border-border p-6 space-y-6">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary">Number of seats</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= MIN_SEAT_PURCHASE || state === "processing"}
                className="w-9 h-9 rounded-md border border-border flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || MIN_SEAT_PURCHASE)}
                min={MIN_SEAT_PURCHASE}
                max={10000}
                disabled={state === "processing"}
                className="w-24 text-center text-lg font-semibold border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <button
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= 10000 || state === "processing"}
                className="w-9 h-9 rounded-md border border-border flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Live Price Display */}
          <div className="bg-gray-50 rounded-md p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Price per seat</span>
              <span className="font-medium text-text-primary">{pricing.pricePerSeatDisplay}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Quantity</span>
              <span className="font-medium text-text-primary">{pricing.quantity}</span>
            </div>
            <div className="border-t border-border my-2" />
            <div className="flex justify-between">
              <span className="font-medium text-text-primary">Total</span>
              <span className="text-lg font-semibold text-primary">{pricing.totalDisplay}</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
          )}

          {/* CTA */}
          <button
            onClick={handlePurchase}
            disabled={state === "processing" || quantity < MIN_SEAT_PURCHASE}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-6 py-3 rounded-md font-medium transition-colors",
              state === "processing"
                ? "bg-primary/70 text-white cursor-wait"
                : "bg-primary text-white hover:bg-primary/90"
            )}
          >
            <ShoppingCart className="w-4 h-4" />
            {state === "processing" ? "Processing purchase..." : `Purchase ${quantity} seats`}
          </button>

          <p className="text-xs text-center text-muted">
            Payment is simulated for now. No real charges will be made.
          </p>
        </div>

        {/* Pricing Tiers */}
        <div className="bg-white rounded-lg border border-border p-6">
          <h2 className="text-sm font-medium text-text-primary mb-4">Volume pricing</h2>
          <div className="space-y-2">
            {PRICING_TIERS.slice().reverse().map((tier) => (
              <div
                key={tier.label}
                className={cn(
                  "flex justify-between items-center px-4 py-2.5 rounded-md text-sm",
                  quantity >= tier.min && quantity <= tier.max
                    ? "bg-primary-light border border-primary/20"
                    : "bg-gray-50"
                )}
              >
                <span className={cn(
                  quantity >= tier.min && quantity <= tier.max
                    ? "font-medium text-primary"
                    : "text-text-secondary"
                )}>
                  {tier.label} seats
                </span>
                <span className={cn(
                  "font-medium",
                  quantity >= tier.min && quantity <= tier.max
                    ? "text-primary"
                    : "text-text-primary"
                )}>
                  ${(tier.pricePerSeat / 100).toFixed(0)}/seat
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PurchasePage() {
  return (
    <EmployerRoute>
      <EmployerLayout>
        <PurchasePageContent />
      </EmployerLayout>
    </EmployerRoute>
  );
}
