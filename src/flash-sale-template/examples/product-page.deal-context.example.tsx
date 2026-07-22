// product.$slug.tsx — only apply flash price when user came from deals/home

export const Route = createFileRoute("/product/$slug")({
  validateSearch: (s) => ({ deal: s.deal === true || s.deal === "true" }),
  component: ProductPage,
});

function ProductPage() {
  const { deal: flashDealContext } = Route.useSearch();

  useEffect(() => {
    if (!product) return;
    fetchFlashSalePrice(product.id).then(setFlashPrice);
  }, [product?.id]);

  const isFlashCheckout =
    flashDealContext && flashPrice.active && flashPrice.salePrice != null;

  const addToCart = () => {
    addItem({
      ...item,
      price: isFlashCheckout ? flashPrice.salePrice! : product.base_price,
      priceSource: isFlashCheckout ? "flash" : "regular",
    });
  };
}
