import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardHeader className="space-y-1.5">
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>
              Use your 10 Minute School credentials to access the TA/DA Tracker.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          Trouble signing in? Contact your administrator.
        </p>
      </div>
    </div>
  );
}
