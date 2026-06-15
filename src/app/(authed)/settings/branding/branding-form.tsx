"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBrandingAction, type BrandingState } from "./actions";

export function BrandingForm({
  defaults,
}: {
  defaults: {
    platformName: string;
    organizationName: string;
    hasLogo: boolean;
    logoVersion: number;
    logoHeightPx: number;
  };
}) {
  const [state, formAction, pending] = useActionState<BrandingState, FormData>(
    updateBrandingAction,
    undefined
  );
  const fe = state?.fieldErrors ?? {};

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    defaults.hasLogo ? `/api/branding/logo?v=${defaults.logoVersion}` : null
  );
  const [clearLogo, setClearLogo] = useState(false);
  const [height, setHeight] = useState(defaults.logoHeightPx);

  // After a successful save, refresh the preview using the new server-side version.
  useEffect(() => {
    if (state?.ok && defaults.hasLogo) {
      setPreviewUrl(`/api/branding/logo?v=${Date.now()}`);
    }
  }, [state?.ok, defaults.hasLogo]);

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

      <div className="space-y-3 rounded-md border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <Label>Logo</Label>
          <span className="text-xs text-muted-foreground">PNG, JPG, or SVG up to 5 MB</span>
        </div>

        <div className="rounded-md border bg-background p-4">
          <div className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
            Live preview ({height}px tall)
          </div>
          <div className="flex min-h-[80px] items-center gap-3 rounded-md bg-muted/20 px-4 py-3">
            {previewUrl && !clearLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Logo preview"
                style={{ height: `${height}px`, width: "auto" }}
                className="max-w-[280px] object-contain"
              />
            ) : (
              <div
                style={{ height: `${height}px`, width: `${height}px` }}
                className="flex items-center justify-center rounded-sm bg-primary text-xs font-semibold text-primary-foreground"
              >
                10
              </div>
            )}
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight">10 Minute School</span>
              <span className="text-xs text-muted-foreground">TA/DA Tracker</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo">Replace logo</Label>
          <input
            ref={fileInputRef}
            id="logo"
            type="file"
            name="logo"
            accept="image/*"
            onChange={onPickFile}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
            disabled={pending}
          />
          {fe.logo && <p className="text-xs text-destructive">{fe.logo}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="logoHeightPx">Display size</Label>
            <span className="text-xs font-medium text-muted-foreground">{height}px</span>
          </div>
          <input
            id="logoHeightPx"
            name="logoHeightPx"
            type="range"
            min={16}
            max={96}
            step={1}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="w-full accent-primary"
            disabled={pending}
          />
          <div className="flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
            <span>Small</span>
            <span>Medium</span>
            <span>Large</span>
          </div>
        </div>

        {defaults.hasLogo && (
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
                }
              }}
              className="h-3.5 w-3.5"
              disabled={pending}
            />
            Remove current logo (fall back to default mark)
          </label>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save branding"}
        </Button>
      </div>
    </form>
  );
}
