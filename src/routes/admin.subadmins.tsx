import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  createSubAdminMember,
  listSubAdminsWithStats,
  listAllProductPushesForAdmin,
  markProductPushLive,
  removeSubAdminMember,
  type SubAdminRow,
} from "@/lib/subadmin.functions";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import { parseEmailInput } from "@/lib/server-fn-error";
import { CredentialsDialog, type PortalCredentials } from "@/components/credentials-dialog";
import { Plus, Trash2, UserPlus, Package, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { shopifyStoreDomain } from "@/integrations/shopify/config";
import { formatINR } from "@/lib/order-utils";

export const Route = createFileRoute("/admin/subadmins")({ component: AdminSubAdmins });

type PushRow = Awaited<ReturnType<typeof listAllProductPushesForAdmin>>["pushes"][number];

function AdminSubAdmins() {
  const listFn = useAuthedServerFn(listSubAdminsWithStats);
  const pushesFn = useAuthedServerFn(listAllProductPushesForAdmin);
  const createFn = useAuthedServerFn(createSubAdminMember);
  const removeFn = useAuthedServerFn(removeSubAdminMember);
  const markLiveFn = useAuthedServerFn(markProductPushLive);

  const [subAdmins, setSubAdmins] = useState<SubAdminRow[]>([]);
  const [pushes, setPushes] = useState<PushRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "SubAdmin@1234" });
  const [creds, setCreds] = useState<PortalCredentials | null>(null);

  const shopifyAdminUrl = `https://${shopifyStoreDomain() || "gharstoreessential.myshopify.com"}/admin`;

  const refresh = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([listFn(), pushesFn()]);
      setSubAdmins(s.subAdmins ?? []);
      setPushes(p.pushes ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const addSubAdmin = async () => {
    const emailCheck = parseEmailInput(form.email);
    if (!emailCheck.ok) return toast.error(emailCheck.message);
    if (!form.fullName.trim()) return toast.error("Name required");
    try {
      const result = await createFn({ data: { ...form, email: emailCheck.value } });
      setCreds({
        title: "Sub-Admin account created",
        email: result.email,
        password: result.password,
        loginUrl: result.loginUrl,
        portalLabel: result.portal,
      });
      setOpen(false);
      setForm({ fullName: "", email: "", password: "SubAdmin@1234" });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    }
  };

  const remove = async (row: SubAdminRow) => {
    if (!confirm(`Remove sub-admin ${row.fullName}?`)) return;
    try {
      await removeFn({ data: { userId: row.userId } });
      toast.success("Sub-admin removed");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    }
  };

  const toggleLive = async (push: PushRow, live: boolean) => {
    try {
      await markLiveFn({ data: { pushId: push.id, live } });
      toast.success(live ? "Marked live on store" : "Marked pending");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const totalPushes = subAdmins.reduce((s, a) => s + a.pushCount, 0);

  return (
    <AdminShell
      title="Sub-Admins"
      subtitle="Sirf Dropship India product push — live/publish admin Shopify se karega"
      superAdminOnly
      actions={
        <Button onClick={() => setOpen(true)} className="font-bold">
          <Plus className="h-4 w-4 mr-1" /> Add Sub-Admin
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Sub-admins", value: subAdmins.length },
          { label: "Total pushes", value: totalPushes },
          { label: "Pending live", value: pushes.filter((p) => !p.admin_live).length },
        ].map((s) => (
          <div key={s.label} className="bg-card border rounded-xl p-4">
            <p className="text-xs uppercase font-bold text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-extrabold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-xl p-4 mb-6 text-sm">
        <p className="font-bold mb-2">Role split</p>
        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
          <li><strong>Sub-admin:</strong> Dropship India se Shopify mein product push + yahan register</li>
          <li><strong>Admin (tum):</strong> Shopify dashboard mein product Live/Active karo + Headless publish</li>
          <li>Sub-admin ko orders, payments, staff — kuch access nahi</li>
        </ul>
        <Button className="mt-3" variant="outline" size="sm" asChild>
          <a href={`${shopifyAdminUrl}/products`} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4 mr-1" /> Open Shopify Products (Live karo)
          </a>
        </Button>
      </div>

      <h2 className="font-bold mb-3">Sub-admin team</h2>
      <div className="bg-card border rounded-xl overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground bg-muted/40 border-b">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Pushes</th>
              <th className="text-left p-3">Live</th>
              <th className="text-left p-3">Last push</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading…</td></tr>}
            {!loading && subAdmins.map((s) => (
              <tr key={s.userId} className="border-b last:border-0">
                <td className="p-3 font-semibold">{s.fullName}</td>
                <td className="p-3">{s.email}</td>
                <td className="p-3">{s.pushCount}</td>
                <td className="p-3 text-green-600 font-semibold">{s.liveCount}</td>
                <td className="p-3 text-muted-foreground">{s.lastPushAt ? new Date(s.lastPushAt).toLocaleDateString("en-IN") : "—"}</td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(s)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {!loading && subAdmins.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No sub-admins. Add one to start.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="font-bold mb-3 flex items-center gap-2"><Package className="h-5 w-5" /> All product pushes</h2>
      <div className="bg-card border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="text-xs uppercase text-muted-foreground bg-muted/40 border-b">
            <tr>
              <th className="text-left p-3">Product</th>
              <th className="text-left p-3">Sub-admin</th>
              <th className="text-left p-3">Price</th>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Live on store</th>
            </tr>
          </thead>
          <tbody>
            {pushes.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-3 font-semibold">{p.shopify_product_title}</td>
                <td className="p-3">
                  <span className="block font-medium">{p.pusherName}</span>
                  <span className="text-xs text-muted-foreground">{p.pusherEmail}</span>
                </td>
                <td className="p-3">{p.shopify_price_inr != null ? formatINR(Number(p.shopify_price_inr)) : "—"}</td>
                <td className="p-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString("en-IN")}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={p.admin_live} onCheckedChange={(v) => toggleLive(p, v)} />
                    <span className="text-xs">{p.admin_live ? "Live" : "Pending"}</span>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && pushes.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No pushes yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <Dialog open onOpenChange={(v) => !v && setOpen(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Add Sub-Admin</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Sirf Dropship India push access — admin panel nahi milega</p>
            <div className="grid gap-3 py-2">
              <div><Label>Full name</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Password</Label><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={addSubAdmin}>Create Sub-Admin</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <CredentialsDialog creds={creds} onClose={() => setCreds(null)} />
    </AdminShell>
  );
}
