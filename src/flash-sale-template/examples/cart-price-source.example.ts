// cart-context.tsx — separate flash vs regular line items

export type CartItem = {
  productId: string;
  price: number;
  priceSource?: "flash" | "regular";
  // ...
};

function lineKey(item: Pick<CartItem, "productId" | "variantId" | "size" | "color" | "priceSource">) {
  return `${item.productId}|${item.variantId ?? ""}|${item.size}|${item.color}|${item.priceSource ?? "regular"}`;
}
