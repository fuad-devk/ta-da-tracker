import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppSettings } from "@/lib/app-settings";
import { BrandingForm } from "./branding-form";

export const dynamic = "force-dynamic";

export default async function BrandingPage() {
  const settings = await getAppSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Branding</h1>
        <p className="text-sm text-muted-foreground">
          Customize the platform name, organization, and logo. Changes appear everywhere within a minute.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identity</CardTitle>
          <CardDescription>How the platform identifies itself in the header, login, and emails.</CardDescription>
        </CardHeader>
        <CardContent>
          <BrandingForm defaults={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
