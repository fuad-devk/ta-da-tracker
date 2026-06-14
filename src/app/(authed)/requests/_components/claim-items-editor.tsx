"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type Receipt = {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type ClaimItem = {
  type: "TA" | "DA" | "AA";
  description: string;
  quantity: number; // hidden, always 1 — kept for schema compat
  amount: number;
  receipts?: Receipt[];
};

const TYPE_INFO: Record<ClaimItem["type"], { label: string; placeholder: string; hint: string }> = {
  TA: {
    label: "Travel",
    placeholder: "e.g. Bus tickets, Uber, road toll",
    hint: "Reimbursed in full with receipts",
  },
  DA: {
    label: "Dearness",
    placeholder: "e.g. Daily food, refreshments",
    hint: "Per-band rate × trip days",
  },
  AA: {
    label: "Accommodation",
    placeholder: "e.g. Hotel stay",
    hint: "Per-band ceiling × nights",
  },
};

export function ClaimItemsEditor({
  name,
  defaultItems,
  showError,
  enableReceipts = false,
  caps,
}: {
  name: string;
  defaultItems?: ClaimItem[];
  showError?: string;
  enableReceipts?: boolean;
  caps?: { da: number | null; aa: number | null; overall: number | null };
}) {
  const [items, setItems] = useState<ClaimItem[]>(
    defaultItems ?? [{ type: "TA", description: "", quantity: 1, amount: 0, receipts: [] }]
  );

  const total = items.reduce((s, it) => s + Number(it.amount || 0), 0);
  const overCap = caps?.overall != null && total > caps.overall;

  const update = (idx: number, patch: Partial<ClaimItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const remove = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const add = (type: ClaimItem["type"]) =>
    setItems((prev) => [
      ...prev,
      { type, description: "", quantity: 1, amount: 0, receipts: [] },
    ]);

  const addReceipt = (idx: number, r: Receipt) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, receipts: [...(it.receipts ?? []), r] } : it
      )
    );
  };
  const removeReceipt = (idx: number, rIdx: number) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? { ...it, receipts: (it.receipts ?? []).filter((_, j) => j !== rIdx) }
          : it
      )
    );
  };

  const perItemCap = (t: ClaimItem["type"]): number | null => {
    if (!caps) return null;
    if (t === "DA") return caps.da;
    if (t === "AA") return caps.aa;
    return null;
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(items)} />

      <div className="space-y-2">
        {items.map((it, idx) => {
          const cap = perItemCap(it.type);
          const overItemCap = cap != null && Number(it.amount || 0) > cap;
          const info = TYPE_INFO[it.type];

          return (
            <div
              key={idx}
              className={cn(
                "group rounded-md border bg-background p-3 transition-colors",
                overItemCap && "border-destructive/40 bg-destructive/5"
              )}
            >
              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">Type</Label>
                  <div className="flex flex-wrap gap-1">
                    {(["TA", "DA", "AA"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => update(idx, { type: t })}
                        className={cn(
                          "rounded px-2 py-1 text-xs font-semibold transition-colors",
                          it.type === t
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/70"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-7 space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">
                    {info.label} description
                  </Label>
                  <Textarea
                    value={it.description}
                    onChange={(e) => update(idx, { description: e.target.value })}
                    placeholder={info.placeholder}
                    rows={2}
                    className="resize-y"
                  />
                </div>

                <div className="sm:col-span-3 space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">Amount (BDT)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={it.amount || ""}
                    onChange={(e) => update(idx, { amount: Number(e.target.value) || 0 })}
                    className={cn(overItemCap && "border-destructive")}
                  />
                  {cap != null ? (
                    <p className={cn("text-xs", overItemCap ? "text-destructive" : "text-muted-foreground")}>
                      {overItemCap ? "Over policy cap" : `Cap: BDT ${cap.toLocaleString()}`}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">{info.hint}</p>
                  )}
                </div>
              </div>

              {enableReceipts && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                  <Label className="text-xs text-muted-foreground">Receipts:</Label>
                  {(it.receipts ?? []).map((r, rIdx) => (
                    <ReceiptChip
                      key={rIdx}
                      receipt={r}
                      onRemove={() => removeReceipt(idx, rIdx)}
                    />
                  ))}
                  <ReceiptUploadButton onUploaded={(r) => addReceipt(idx, r)} />
                </div>
              )}

              {items.length > 1 && (
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(idx)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => add("TA")}>
            + Travel
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => add("DA")}>
            + Dearness
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => add("AA")}>
            + Accommodation
          </Button>
        </div>
        <div className={cn("text-sm font-semibold", overCap && "text-destructive")}>
          Total: BDT {total.toLocaleString()}
          {caps?.overall != null && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              / cap {caps.overall.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {showError && <p className="text-sm text-destructive">{showError}</p>}
      {overCap && (
        <p className="text-sm text-destructive">
          Total exceeds the policy cap. Reduce amounts before submitting.
        </p>
      )}
    </div>
  );
}

function ReceiptChip({ receipt, onRemove }: { receipt: Receipt; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs">
      <a
        href={receipt.fileUrl}
        target="_blank"
        rel="noopener"
        className="max-w-[200px] truncate text-primary underline-offset-2 hover:underline"
        title={receipt.fileName}
      >
        {receipt.fileName}
      </a>
      <span className="text-muted-foreground">
        ({Math.round(receipt.sizeBytes / 1024)} KB)
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 text-muted-foreground hover:text-destructive"
        aria-label="Remove receipt"
      >
        ✕
      </button>
    </div>
  );
}

function ReceiptUploadButton({ onUploaded }: { onUploaded: (r: Receipt) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      onUploaded(json as Receipt);
      toast.success(`Uploaded ${json.fileName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={onPick}
        className="hidden"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Uploading..." : "+ Receipt"}
      </Button>
    </>
  );
}
