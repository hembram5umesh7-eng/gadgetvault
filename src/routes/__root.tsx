import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import { CompareProvider } from "@/lib/compare-context";
import { Toaster } from "@/components/ui/sonner";
import { SiteVisitTracker } from "@/components/site-visit-tracker";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GadgetVault — Premium Gadgets & Accessories" },
      { name: "description", content: "Kitchen accessories, unique gadgets & daily essentials. Secure Razorpay checkout, pan-India delivery with honest timelines." },
      { property: "og:title", content: "GadgetVault — Premium Gadgets & Accessories" },
      { property: "og:description", content: "Tech that powers your everyday." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <CompareProvider>
            <Outlet />
            <SiteVisitTracker />
            <Toaster position="top-center" richColors />
          </CompareProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-7xl font-extrabold text-primary">404</h1>
        <p className="mt-4 text-xl">Page not found</p>
        <a href="/" className="mt-6 inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold">
          Back to Home
        </a>
      </div>
    </div>
  );
}
