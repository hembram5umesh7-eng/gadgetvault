/** Publish products to Headless (gadgetvault) sales channel */

import { shopifyAdminQuery } from "./admin";

export type PublishResult = {
  ok: boolean;
  published: number;
  skipped: number;
  total: number;
  publicationName?: string;
  message: string;
};

const SCOPE_FIX_MESSAGE =
  "Admin panel → Shopify Connect kholo, scopes wala naya token paste karo, phir Sync Everything dabao.";

export function headlessPublicationIdFromEnv(): string | null {
  return process.env.SHOPIFY_HEADLESS_PUBLICATION_ID?.trim() || null;
}

export async function resolveHeadlessPublication(): Promise<{ id: string; name: string } | null> {
  const fromEnv = headlessPublicationIdFromEnv();
  if (fromEnv) return { id: fromEnv, name: "gadgetvault (Headless)" };

  const pubData = await shopifyAdminQuery<{
    publications: { edges: { node: { id: string; name: string } }[] };
  }>(`query { publications(first: 25) { edges { node { id name } } } }`);

  const publications = pubData.publications.edges.map((e) => e.node);
  const headlessPub =
    publications.find((p) => /headless|gadgetvault/i.test(p.name)) ??
    publications.find((p) => /headless/i.test(p.name));

  return headlessPub ?? null;
}

export async function publishProductToHeadless(productGid: string): Promise<{ ok: boolean; message: string }> {
  let publication: { id: string; name: string } | null;
  try {
    publication = await resolveHeadlessPublication();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/read_publications|access denied/i.test(msg)) {
      return { ok: false, message: SCOPE_FIX_MESSAGE };
    }
    throw err;
  }

  if (!publication) {
    return {
      ok: false,
      message: "Headless publication not found. Set SHOPIFY_HEADLESS_PUBLICATION_ID in .env or enable gadgetvault channel.",
    };
  }

  try {
    const result = await shopifyAdminQuery<{
      publishablePublish: { userErrors: { message: string }[] };
    }>(
      `mutation Publish($id: ID!, $input: [PublicationInput!]!) {
        publishablePublish(id: $id, input: $input) {
          userErrors { message }
        }
      }`,
      { id: productGid, input: [{ publicationId: publication.id }] },
    );

    const errs = result.publishablePublish.userErrors ?? [];
    if (errs.some((e) => /already published/i.test(e.message))) {
      return { ok: true, message: "Already published to Headless" };
    }
    if (errs.length) {
      return { ok: false, message: errs.map((e) => e.message).join("; ") };
    }
    return { ok: true, message: `Published to ${publication.name}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/write_publications|access denied/i.test(msg)) {
      return { ok: false, message: SCOPE_FIX_MESSAGE };
    }
    throw err;
  }
}

export async function publishAllProductsToHeadless(): Promise<PublishResult> {
  let publication: { id: string; name: string } | null;
  try {
    publication = await resolveHeadlessPublication();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/read_publications|access denied/i.test(msg)) {
      return { ok: false, published: 0, skipped: 0, total: 0, message: SCOPE_FIX_MESSAGE };
    }
    throw err;
  }

  if (!publication) {
    return {
      ok: false,
      published: 0,
      skipped: 0,
      total: 0,
      message: "No Headless publication found. Enable Headless → gadgetvault sales channel in Shopify.",
    };
  }

  let products: { id: string; title: string }[];
  try {
    products = [];
    let cursor: string | null = null;
    for (;;) {
      const data = await shopifyAdminQuery<{
        products: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          edges: { node: { id: string; title: string; status: string } }[];
        };
      }>(
        `query Products($cursor: String) {
          products(first: 50, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            edges { node { id title status } }
          }
        }`,
        { cursor },
      );
      for (const e of data.products.edges) {
        if (e.node.status === "ACTIVE") products.push({ id: e.node.id, title: e.node.title });
      }
      if (!data.products.pageInfo.hasNextPage) break;
      cursor = data.products.pageInfo.endCursor;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/read_products|access denied/i.test(msg)) {
      return { ok: false, published: 0, skipped: 0, total: 0, message: SCOPE_FIX_MESSAGE };
    }
    throw err;
  }

  let published = 0;
  let skipped = 0;

  for (const { id } of products) {
    const result = await publishProductToHeadless(id);
    if (result.ok && /already published/i.test(result.message)) skipped++;
    else if (result.ok) published++;
  }

  return {
    ok: true,
    published,
    skipped,
    total: products.length,
    publicationName: publication.name,
    message: `Published ${published} product(s) to ${publication.name}. ${skipped} already live.`,
  };
}
