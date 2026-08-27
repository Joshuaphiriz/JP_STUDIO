"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteMediaAction } from "./actions";

type Asset = {
  id: string;
  url: string;
  kind: "image" | "video";
  fileName: string;
  sizeBytes: number | null;
  createdAt: string;
};

export function MediaClient({
  workspaceSlug,
  assets: initial,
}: {
  workspaceSlug: string;
  assets: Asset[];
}) {
  const [assets, setAssets] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.set("workspace", workspaceSlug);
        fd.set("file", file);
        const res = await fetch("/api/media/upload", {
          method: "POST",
          body: fd,
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error ?? "Upload failed");
          continue;
        }
        setAssets((a) => [
          {
            ...json.asset,
            sizeBytes: file.size,
            createdAt: new Date().toISOString(),
          },
          ...a,
        ]);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          Upload
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => upload(e.target.files)}
        />
      </div>

      {assets.length === 0 ? (
        <Card className="p-12 text-center text-sm text-[var(--text-tertiary)]">
          No media yet.
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {assets.map((a) => (
            <div
              key={a.id}
              className="group relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-0)]"
            >
              {a.kind === "video" ? (
                <video
                  src={a.url}
                  className="aspect-square w-full object-cover"
                  muted
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.url}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
              )}
              <div className="flex items-center justify-between gap-1 p-2">
                <span className="truncate text-[11px] text-[var(--text-tertiary)]">
                  {a.fileName}
                </span>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() =>
                    start(async () => {
                      await deleteMediaAction(workspaceSlug, a.id);
                      setAssets((s) => s.filter((x) => x.id !== a.id));
                      toast.success("Deleted");
                    })
                  }
                  className="shrink-0 text-[var(--text-ghost)] hover:text-[var(--error)]"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
