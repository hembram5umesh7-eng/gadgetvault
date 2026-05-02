import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

/** Single image upload with preview + clear + URL fallback. */
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

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
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
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => onPick(e.target.files?.[0])} />
    </div>
  );
}

/** Multi-image gallery uploader. */
export function MultiImageUpload({
  values, onChange, folder = "products",
}: { values: string[]; onChange: (urls: string[]) => void; folder?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const urls = await Promise.all(Array.from(files).map((f) => uploadFile(f, folder)));
      onChange([...values, ...urls]);
      toast.success(`Uploaded ${urls.length} image${urls.length > 1 ? "s" : ""}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  };

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
      <p className="text-xs text-muted-foreground">PNG, JPG, WebP up to 5MB each. Stored in <code>product-images</code>.</p>
    </div>
  );
}
