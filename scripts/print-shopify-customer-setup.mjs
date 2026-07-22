/**
 * Print URLs to paste in Shopify Admin → Headless → Customer API → Application setup
 * Run: npm run shopify:customer-setup
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const publicUrl = (process.env.VITE_APP_PUBLIC_URL || "https://gadgetvault.in").replace(/\/$/, "");
const localUrl = (process.env.VITE_APP_URL || "http://localhost:8080").replace(/\/$/, "");

console.log("\n=== Shopify Headless → Customer API → Application setup ===\n");
console.log("Callback URI(s):");
console.log(" ", `${publicUrl}/account/authorize`);
console.log("\nJavascript origin(s):");
console.log(" ", publicUrl);
console.log("\nLogout URI:");
console.log(" ", `${publicUrl}/account/logout`);
console.log("\n--- Admin OAuth (Dev Dashboard app) ---");
console.log("Redirect URL:", `${localUrl}/api/shopify/auth/callback`);
console.log("\n--- Hostinger domain par ---");
console.log("Sirf .env mein set karo: VITE_APP_PUBLIC_URL=https://yourdomain.com");
console.log("Phir upar ki 3 Customer API URLs Shopify mein update karo.\n");
