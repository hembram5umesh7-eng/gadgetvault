import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { loginWithPassword, resolvePostLoginRedirect, rolesFromUser } from "@/lib/auth-session";
import { toast } from "sonner";
import { z } from "zod";
import { Lock, Mail, ShoppingBag, UserRound } from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect:
      typeof s.redirect === "string" && s.redirect.startsWith("/") && !s.redirect.startsWith("//")
        ? s.redirect
        : "/",
    email: typeof s.email === "string" ? s.email : "",
    tab: s.tab === "signup" ? ("signup" as const) : ("login" as const),
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Invalid email").max(255);
const pwSchema = z.string().min(8, "At least 8 characters").max(72);

function redirectHint(path: string) {
  if (path === "/checkout") return "Sign in to complete your purchase";
  if (path === "/orders") return "Sign in to view your orders";
  if (path === "/account") return "Sign in to manage your account";
  return "Shop premium gadgets · Track orders · Fast checkout";
}

function AuthPage() {
  const { redirect, email: emailParam, tab: tabParam } = Route.useSearch();
  const { user, ready, roles } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"login" | "signup">(tabParam);

  useEffect(() => {
    if (emailParam) setEmail(emailParam);
  }, [emailParam]);

  useEffect(() => {
    setTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    if (!ready || !user) return;
    const dest = resolvePostLoginRedirect(redirect, roles);
    window.location.replace(dest);
  }, [ready, user, redirect, roles]);

  const finishLogin = (target: string, loginUser: { app_metadata?: Record<string, unknown> } | null) => {
    const userRoles = rolesFromUser(loginUser as Parameters<typeof rolesFromUser>[0]);
    const dest = resolvePostLoginRedirect(target, userRoles);
    toast.success("Welcome back!");
    window.location.replace(dest);
  };

  const doLogin = async (loginEmail: string, loginPassword: string, target = redirect) => {
    const ev = emailSchema.safeParse(loginEmail);
    if (!ev.success) {
      toast.error(ev.error.issues[0].message);
      return;
    }
    const pv = pwSchema.safeParse(loginPassword);
    if (!pv.success) {
      toast.error(pv.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const data = await loginWithPassword(loginEmail.trim(), loginPassword);
      finishLogin(target, data.user);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.name === "AbortError"
            ? "Login timed out. Check internet and try again."
            : err.message
          : "Login failed";
      toast.error(msg);
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await doLogin(email, password);
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const signupEmail = String(fd.get("email") ?? "");
    const signupPassword = String(fd.get("password") ?? "");
    const fullName = String(fd.get("name") ?? "");
    const ev = emailSchema.safeParse(signupEmail);
    if (!ev.success) return toast.error(ev.error.issues[0].message);
    const pv = pwSchema.safeParse(signupPassword);
    if (!pv.success) return toast.error(pv.error.issues[0].message);

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/` },
    });

    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }

    if (data.session && data.user) {
      toast.success("Account created!");
      finishLogin(redirect, data.user);
      return;
    }

    try {
      const loginData = await loginWithPassword(signupEmail.trim(), signupPassword);
      toast.success("Account created!");
      finishLogin(redirect, loginData.user);
    } catch {
      setLoading(false);
      toast.success("Account created! Sign in with your email and password.");
      setEmail(signupEmail);
      setTab("login");
    }
  };

  if (ready && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Taking you to your page…</p>
      </div>
    );
  }

  const checkoutFlow = redirect === "/checkout";

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-10 lg:py-14 flex items-start justify-center">
        <div className="w-full max-w-4xl grid lg:grid-cols-[1fr_420px] gap-8 items-start">
          <section className="hidden lg:block pt-4">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">GadgetVault</p>
            <h1 className="text-3xl font-extrabold tracking-tight mb-3">Your account for smarter shopping</h1>
            <p className="text-muted-foreground mb-8 max-w-md">{redirectHint(redirect)}</p>
            <ul className="space-y-4 text-sm">
              <li className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShoppingBag className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">Save your cart & checkout faster</p>
                  <p className="text-muted-foreground">COD or online payment · Free shipping above ₹999</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mail className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">Track every order</p>
                  <p className="text-muted-foreground">Live status from order placed to delivery</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Lock className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">Secure sign-in</p>
                  <p className="text-muted-foreground">Your details stay private and encrypted</p>
                </div>
              </li>
            </ul>
          </section>

          <div className="w-full bg-card border rounded-2xl p-6 sm:p-8 shadow-product">
            {checkoutFlow && (
              <div className="mb-5 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                <ShoppingBag className="h-4 w-4 text-primary shrink-0" />
                <span>Almost there — sign in to place your order</span>
              </div>
            )}

            <div className="mb-6 lg:hidden">
              <h1 className="text-2xl font-extrabold mb-1">{checkoutFlow ? "Checkout sign-in" : "Sign in"}</h1>
              <p className="text-sm text-muted-foreground">{redirectHint(redirect)}</p>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
              <TabsList className="grid grid-cols-2 w-full mb-5">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                    />
                  </div>
                  <Button type="submit" className="w-full font-bold" size="lg" disabled={loading}>
                    {loading ? "Signing in…" : checkoutFlow ? "Sign in & continue checkout" : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-name">Full Name</Label>
                    <div className="relative">
                      <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-name" name="name" required className="pl-9" placeholder="Your name" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Min. 8 characters"
                    />
                  </div>
                  <Button type="submit" className="w-full font-bold" size="lg" disabled={loading}>
                    {loading ? "Creating account…" : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="mt-5 text-xs text-muted-foreground text-center leading-relaxed">
              By continuing you agree to our{" "}
              <Link to="/terms" className="text-primary font-medium hover:underline">Terms</Link>,{" "}
              <Link to="/privacy" className="text-primary font-medium hover:underline">Privacy Policy</Link>, and{" "}
              <Link to="/refund" className="text-primary font-medium hover:underline">Refund Policy</Link>.
            </p>
            <p className="mt-3 text-xs text-center">
              <Link to="/" className="text-muted-foreground hover:text-foreground">
                ← Continue shopping
              </Link>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
