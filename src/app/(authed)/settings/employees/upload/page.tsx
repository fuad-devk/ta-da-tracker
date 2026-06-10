import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadForm } from "./upload-form";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bulk upload employees</h1>
          <p className="text-sm text-muted-foreground">
            Upload a CSV to create or update employees in bulk.
          </p>
        </div>
        <Link href="/settings/employees" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to list
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload</CardTitle>
          <CardDescription>
            Existing employees (matched by email) will be updated. New rows get a default password
            (Change123!) and are flagged to change on first login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">CSV template</CardTitle>
        </CardHeader>
        <CardContent>
          <a
            href="/template.csv"
            download
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Download template.csv
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
