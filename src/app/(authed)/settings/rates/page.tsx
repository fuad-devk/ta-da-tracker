import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DA_BASE_RATE, AA_CEILING, ADVANCE_AMOUNT_CAP, ADVANCE_MIN_TRIP_DAYS, CAR_RENTAL_CAP } from "@/lib/policy";

export default function RatesPage() {
  const rows = [
    { group: "A & B", da: DA_BASE_RATE.AB, aa: AA_CEILING.AB },
    { group: "C, D & E", da: DA_BASE_RATE.CDE, aa: AA_CEILING.CDE },
    { group: "F", da: DA_BASE_RATE.F, aa: AA_CEILING.F },
    { group: "G", da: DA_BASE_RATE.G, aa: AA_CEILING.G },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Allowance rates</h1>
        <p className="text-sm text-muted-foreground">
          Read-only for v1. Edit will be added if HR needs to change the policy without a code change.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-band rates (BDT)</CardTitle>
          <CardDescription>Inter-district DA is 2× the city rate.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Band group</TableHead>
                <TableHead>DA / day (City)</TableHead>
                <TableHead>DA / day (Intercity)</TableHead>
                <TableHead>AA / night (ceiling)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.group}>
                  <TableCell className="font-medium">{r.group}</TableCell>
                  <TableCell>{r.da.toLocaleString()}</TableCell>
                  <TableCell>{(r.da * 2).toLocaleString()}</TableCell>
                  <TableCell>{r.aa.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Other limits</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li><strong>Advance cap:</strong> BDT {ADVANCE_AMOUNT_CAP.toLocaleString()} (trips longer than {ADVANCE_MIN_TRIP_DAYS} days)</li>
            <li><strong>Shared car rental:</strong> BDT {CAR_RENTAL_CAP.toLocaleString()} max, requires 3+ employees</li>
            <li><strong>Flights:</strong> Bands A & B only</li>
            <li><strong>DA eligibility:</strong> Trip must exceed 6 hours outside station; not paid if company provides meals</li>
            <li><strong>AA eligibility:</strong> Overnight stay outside district; not paid if company provides lodging</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
