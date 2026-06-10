"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export type Receipt = {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type ClaimItem = {
  type: "TA" | "DA" | "AA";
  description: string;
  quantity: number;
  amount: number;
  receipts?: Receipt[];
};

const TYPE_LABEL: Record<ClaimItem["type"], string> = {
  TA: "Travel Allowance",
  DA: "Dearness Allowance",
  AA: "Accommodation Allowance",
};

const QUANTITY_LABEL: Record<ClaimItem["type"], string> = {
  TA: "Count",
  DA: "Days",
  AA: "Nights",
};

export function ClaimItemsEditor({
  name,
  defaultItems,
  showError,
  enableReceipts = false,
}: {
  name: string;
  defaultItems?: ClaimItem[];
  showError?: string;
  enableReceipts?: boolean;
}) {
  const [items, setItems] = useState<ClaimItem[]>(
    defaultItems ?? [{ type: "TA", description: "", quantity: 1, amount: 0, receipts: [] }]
  );

  const total = items.reduce(
    (s, it) => s + Number(it.amount || 0) * Number(it.quantity || 1),
    0
  );

  const update = (idx: number, patch: Partial<ClaimItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const remove = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const add = () =>
    setItems((prev) => [
      ...prev,
      { type: "TA", description: "", quantity: 1, amount: 0, receipts: [] },
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

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={JSON.stringify(items)} />

      <div className="space-y-3">
        {items.map((it, idx) => (
          <div key={idx} className="rounded-md border bg-background p-4">
            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-3 space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={it.type}
                  onValueChange={(v) => update(idx, { type: v as ClaimItem["type"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["TA", "DA", "AA"] as const).map((t) => (
                      <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-5 space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={it.description}
                  onChange={(e) => update(idx, { description: e.target.value })}
                  placeholder={it.type === "TA" ? "e.g. Uber to airport" : it.type === "DA" ? "e.g. Daily food expenses" : "e.g. Hotel stay"}
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label>{QUANTITY_LABEL[it.type]}</Label>
                <Input
                  type="number"
                  min={1}
                  value={it.quantity}
                  onChange={(e) => update(idx, { quantity: Number(e.target.value) || 1 })}
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label>Amount (BDT)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={it.amount}
                  onChange={(e) => update(idx, { amount: Number(e.target.value) || 0 })}
                />
              </div>
            </div>

            {enableReceipts && (
              <div className="mt-3 space-y-2">
                <Label className="text-xs">Receipts</Label>
                <div className="flex flex-wrap gap-2">
                  {(it.receipts ?? []).map((r, rIdx) => (
                    <ReceiptChip
                      key={rIdx}
                      receipt={r}
                      onRemove={() => removeReceipt(idx, rIdx)}
                    />
                  ))}
                  <ReceiptUploadButton onUploaded={(r) => addReceipt(idx, r)} />
                </div>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Line total: BDT {(Number(it.amount || 0) * Number(it.quantity || 1)).toLocaleString()}
              </div>
              {items.length > 1 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => remove(idx)}>
                  Remove
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={add}>
          + Add claim item
        </Button>
        <div className="text-sm font-semibold">
          Total: BDT {total.toLocaleString()}
        </div>
      </div>

      {showError && <p className="text-sm text-destructive">{showError}</p>}
    </div>
  );
}

function ReceiptChip({ receipt, onRemove }: { receipt: Receipt; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1 text-xs">
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
