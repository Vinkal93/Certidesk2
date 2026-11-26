import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { webhookEventsCollection } from "@/lib/firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Webhook Logs",
  robots: { index: false, follow: false },
};

export default async function SuIntegrationsWebhooksPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const snap = await webhookEventsCollection()
    .orderBy("receivedAt", "desc")
    .limit(60)
    .get();
  const events = snap.docs.map((d) => d.data());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Webhook Delivery & Signature Logs
        </h1>
        <p className="text-muted-foreground text-sm">
          Inbound Razorpay webhook events verified against HMAC-SHA256.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Webhooks ({events.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No webhook events received yet.
            </p>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-xs"
              >
                <div>
                  <span className="font-mono font-semibold">{ev.eventType}</span> •{" "}
                  <span>{ev.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      ev.status === "rejected" || ev.status === "failed"
                        ? "danger"
                        : "success"
                    }
                  >
                    {ev.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
