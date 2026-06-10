import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdvanceForm } from "./advance-form";

export default function NewAdvancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New advance request</h1>
          <p className="text-sm text-muted-foreground">
            Request advance disbursement before incurring travel costs.
          </p>
        </div>
        <Link href="/requests" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to my requests
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request details</CardTitle>
        </CardHeader>
        <CardContent>
          <AdvanceForm />
        </CardContent>
      </Card>
    </div>
  );
}
