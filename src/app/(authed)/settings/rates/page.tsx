import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DA_BASE_RATE,
  AA_CEILING,
  ADVANCE_AMOUNT_CAP,
  ADVANCE_MIN_TRIP_DAYS,
  ADVANCE_RETURN_DAYS,
  CAR_RENTAL_CAP,
  ELEVATED_APPROVAL_THRESHOLD,
  PARTIAL_MEAL_DEDUCTION,
  RETROACTIVE_WORKING_DAYS,
  INTERCITY_MULTIPLIER_WEEKDAY,
  INTERCITY_MULTIPLIER_WEEKEND,
  DA_MIN_HOURS,
  DA_FULL_HOURS,
} from "@/lib/policy";

export default function RatesPage() {
  const rows = [
    { group: "A & B (CXO, SVP, VP)", da: DA_BASE_RATE.AB, aa: AA_CEILING.AB, flight: "Yes" },
    { group: "C, D & E (GM → Specialist)", da: DA_BASE_RATE.CDE, aa: AA_CEILING.CDE, flight: "No (Car Pool)" },
    { group: "F (Sr. Exec, Exec)", da: DA_BASE_RATE.F, aa: AA_CEILING.F, flight: "No (Car Pool)" },
    { group: "G (Temp / Intern)", da: DA_BASE_RATE.G, aa: AA_CEILING.G, flight: "No" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Allowance rates</h1>
        <p className="text-sm text-muted-foreground">
          Policy V2.0 — effective July 1, 2026. Read-only for v1 of the app; HR can request rate changes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-band rates (BDT)</CardTitle>
          <CardDescription>
            Intercity is {INTERCITY_MULTIPLIER_WEEKDAY}× base on weekdays and {INTERCITY_MULTIPLIER_WEEKEND}× on weekends (Fri/Sat).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Band group</TableHead>
                <TableHead>DA / day (City)</TableHead>
                <TableHead>DA / day (Intercity, weekday)</TableHead>
                <TableHead>DA / day (Intercity, weekend)</TableHead>
                <TableHead>AA / night ceiling</TableHead>
                <TableHead>Flight eligible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.group}>
                  <TableCell className="font-medium">{r.group}</TableCell>
                  <TableCell>{r.da.toLocaleString()}</TableCell>
                  <TableCell>{(r.da * INTERCITY_MULTIPLIER_WEEKDAY).toLocaleString()}</TableCell>
                  <TableCell>{(r.da * INTERCITY_MULTIPLIER_WEEKEND).toLocaleString()}</TableCell>
                  <TableCell>{r.aa.toLocaleString()}</TableCell>
                  <TableCell>{r.flight}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dearness Allowance — hour tiering</CardTitle>
          <CardDescription>V2 §4.3</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Duty hours outside station</TableHead>
                <TableHead>DA payable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Under {DA_MIN_HOURS} hours</TableCell>
                <TableCell>None</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{DA_MIN_HOURS}–{DA_FULL_HOURS} hours</TableCell>
                <TableCell>50% of daily rate</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Over {DA_FULL_HOURS} hours or overnight</TableCell>
                <TableCell>100% of daily rate</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meal deductions</CardTitle>
          <CardDescription>V2 §4.4 — partial-meal proration</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>All meals provided by company → <strong>no DA</strong></li>
            <li>Each company-provided meal → <strong>BDT {PARTIAL_MEAL_DEDUCTION.toLocaleString()} deducted</strong> from that day&apos;s DA</li>
            <li>Maximum 3 meals (breakfast, lunch, dinner) per day</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approval thresholds</CardTitle>
          <CardDescription>V2 §3 — Competent Authority</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trigger</TableHead>
                <TableHead>Required approver at Stage 2 (HR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Standard claim</TableCell>
                <TableCell>HR Manager <em className="text-muted-foreground">(or Dept Head)</em></TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Total &gt; BDT {ELEVATED_APPROVAL_THRESHOLD.toLocaleString()}</TableCell>
                <TableCell><strong>Department Head</strong> (VP-level)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Retroactive (submitted &gt; {RETROACTIVE_WORKING_DAYS} working days after trip)</TableCell>
                <TableCell><strong>Department Head</strong> (VP-level)</TableCell>
              </TableRow>
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
            <li><strong>Advance cap:</strong> BDT {ADVANCE_AMOUNT_CAP.toLocaleString()} (trips longer than {ADVANCE_MIN_TRIP_DAYS} days). Larger amounts need Department Head approval.</li>
            <li><strong>Unused advance return:</strong> {ADVANCE_RETURN_DAYS} working days after trip end.</li>
            <li><strong>Shared car rental:</strong> BDT {CAR_RENTAL_CAP.toLocaleString()} max, requires 3+ employees together. Inter-district only.</li>
            <li><strong>Flights:</strong> Bands A & B only.</li>
            <li><strong>Personal vehicle:</strong> Not reimbursable.</li>
            <li><strong>Shared ride:</strong> T/A only to the employee who paid.</li>
            <li><strong>Shared accommodation:</strong> Room rent split equally among occupants.</li>
            <li><strong>Company-booked travel/accommodation:</strong> No allowance disbursed for that component.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
