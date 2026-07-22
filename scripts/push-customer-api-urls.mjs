import {spawnSync} from 'node:child_process';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const publicUrl = (process.env.VITE_APP_PUBLIC_URL || 'https://gadgetvault.in').replace(/\/$/, '');
const storefrontId = process.env.SHOPIFY_HEADLESS_STOREFRONT_ID || '307797';
const toolDir = join(root, 'tools', 'shopify-headless-push');

console.log('Pushing Customer API URLs to Shopify Admin...');
console.log('Origin:', publicUrl);

const push = spawnSync(
  'npx',
  [
    '@shopify/cli@3.84.1',
    'hydrogen',
    'customer-account-push',
    `--dev-origin=${publicUrl}`,
    `--storefront-id=gid://shopify/HydrogenStorefront/${storefrontId}`,
    '--relative-redirect-uri=/account/authorize',
    '--relative-logout-uri=/account/logout',
  ],
  {
    cwd: toolDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      SHOPIFY_HYDROGEN_FLAG_PATH: toolDir,
      SHOPIFY_CLI_PARTNERS_TOKEN:
        process.env.SHOPIFY_CLI_PARTNERS_TOKEN || process.env.SHOPIFY_APP_AUTOMATION_TOKEN || '',
    },
  },
);

if (push.status === 0) {
  console.log('\n✓ Done — Customer API URLs Shopify Admin mein set ho gaye!');
} else {
  console.error('\n❌ Push failed. Run: shopify auth login');
}
process.exit(push.status ?? 1);
