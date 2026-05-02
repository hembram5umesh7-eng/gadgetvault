import { useRef, useState, useCallback, type DragEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BUCKET = "product-images";

async function uploadFile(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Only image files allowed");
  if (file.size > 5 * 1024 * 1024) throw new Error("Max 5MB per image");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Hook to manage drag state + handlers for a drop zone. */
function useDropZone(onFiles: (files: File[]) => void, disabled?: boolean) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  const onDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (disabled) return;
    depth.current += 1;
    if (e.dataTransfer?.types?.includes("Files")) setOver(true);
  }, [disabled]);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setOver(false);
  }, []);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    depth.current = 0;
    setOver(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      if ((e.dataTransfer?.files?.length ?? 0) > 0) toast.error("Only image files allowed");
      return;
    }
    onFiles(files);
  }, [disabled, onFiles]);

  return { over, dropProps: { onDragEnter, onDragLeave, onDragOver, onDrop } };
}

/** Single image upload with preview + clear + URL fallback + drag-and-drop. */
export function SingleImageUpload({
  value, onChange, folder = "mockups", placeholder = "https://…",
}: { value: string | null; onChange: (url: string | null) => void; folder?: string; placeholder?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try { onChange(await uploadFile(file, folder)); toast.success("Uploaded"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  };

  const { over, dropProps } = useDropZone((files) => { void onPick(files[0]); }, busy);

  return (
    <div className="space-y-2">
      <div
        {...dropProps}
        className={cn(
          "flex gap-2 items-center rounded-md border border-dashed border-transparent p-1 transition-colors",
          over && "border-primary bg-primary/5",
        )}
      >
        <div className="w-12 h-14 rounded bg-muted overflow-hidden shrink-0 border">
          {value && <img src={value} alt="" className="w-full h-full object-cover" />}
        </div>
        <Input value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} placeholder={placeholder} />
        <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
        {value && (
          <Button type="button" size="icon" variant="ghost" onClick={() => onChange(null)}><X className="h-4 w-4" /></Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Drop an image here or click upload.</p>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => onPick(e.target.files?.[0])} />
    </div>
  );
}

/** Multi-image gallery uploader with drag-and-drop. */
export function MultiImageUpload({
  values, onChange, folder = "products",
}: { values: string[]; onChange: (urls: string[]) => void; folder?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const uploadMany = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setBusy(true);
    try {
      const urls = await Promise.all(files.map((f) => uploadFile(f, folder)));
      onChange([...values, ...urls]);
      toast.success(`Uploaded ${urls.length} image${urls.length > 1 ? "s" : ""}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }, [folder, onChange, values]);

  const onPick = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    void uploadMany(Array.from(files));
  };

  const { over, dropProps } = useDropZone(uploadMany, busy);

  const setAt = (i: number, url: string) => {
    const next = [...values]; next[i] = url; onChange(next);
  };
  const removeAt = (i: number) => onChange(values.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {values.map((url, i) => (
        <div key={i} className="flex gap-2 items-center">
          <div className="w-12 h-14 rounded bg-muted overflow-hidden shrink-0 border">
            {url && <img src={url} alt="" className="w-full h-full object-cover" />}
          </div>
          <Input value={url} onChange={(e) => setAt(i, e.target.value)} placeholder="https://…" />
          <Button type="button" size="icon" variant="ghost" onClick={() => removeAt(i)}><X className="h-4 w-4" /></Button>
        </div>
      ))}
      <div
        {...dropProps}
        onClick={() => !busy && inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed p-6 text-center transition-colors cursor-pointer",
          over ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50",
          busy && "opacity-60 cursor-wait",
        )}
      >
        {busy ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Uploading…</p>
          </>
        ) : (
          <>
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">
              {over ? "Drop to upload" : "Drag & drop images here"}
            </p>
            <p className="text-xs text-muted-foreground">or click to browse · PNG, JPG, WebP up to 5MB each</p>
          </>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? "Uploading…" : "Upload images"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange([...values, ""])}>
          + Add URL
        </Button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => onPick(e.target.files)} />
    </div>
  );
}
