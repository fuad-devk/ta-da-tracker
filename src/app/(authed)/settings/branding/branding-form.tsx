"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBrandingAction, type BrandingState } from "./actions";

export function BrandingForm({
  defaults,
}: {
  defaults: { platformName: string; organizationName: string; logoUrl: string | null };
}) {
  const [state, formAction, pending] = useActionState<BrandingState, FormData>(
    updateBrandingAction,
    undefined
  );
  const fe = state?.fieldErrors ?? {};

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(defaults.logoUrl);
  const [clearLogo, setClearLogo] = useState(false);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setClearLogo(false);
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(f);
  };

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}
      {state?.ok && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {state.message ?? "Saved."}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="organizationName">Organization name</Label>
          <Input
            id="organizationName"
            name="organizationName"
            defaultValue={defaults.organizationName}
            required
            disabled={pending}
          />
          {fe.organizationName && <p className="text-xs text-destructive">{fe.organizationName}</p>}
          <p className="text-xs text-muted-foreground">Appears next to the logo (e.g. 10 Minute School).</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="platformName">Platform name</Label>
          <Input
            id="platformName"
            name="platformName"
            defaultValue={defaults.platformName}
            required
            disabled={pending}
          />
          {fe.platformName && <p className="text-xs text-destructive">{fe.platformName}</p>}
          <p className="text-xs text-muted-foreground">Shown beneath the logo (e.g. TA/DA Tracker).</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="flex items-start gap-4 rounded-md border bg-muted/30 p-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-md border bg-background">
            {previewUrl && !clearLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Logo preview" className="h-16 w-16 object-contain" />
            ) : (
              <span className="text-xs text-muted-foreground">No logo</span>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              name="logo"
              accept="image/*"
              onChange={onPickFile}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">
              PNG, JPG, or SVG up to 5 MB. Square or wide formats both work.
            </p>
            {fe.logo && <p className="text-xs text-destructive">{fe.logo}</p>}
            {defaults.logoUrl && (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  name="clearLogo"
                  checked={clearLogo}
                  onChange={(e) => {
                    setClearLogo(e.target.checked);
                    if (e.target.checked && fileInputRef.current) {
                      fileInputRef.current.value = "";
                      setPreviewUrl(null);
                    } else {
                      setPreviewUrl(defaults.logoUrl);
                    }
                  }}
                  className="h-3.5 w-3.5"
                />
                Remove current logo (fall back to default mark)
              </label>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save branding"}
        </Button>
      </div>
    </form>
  );
}
