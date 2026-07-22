// ProductCard — add flashDeal prop so links carry ?deal=true

export function ProductCard({
  p,
  flashDeal = false,
}: {
  p: ProductCardData;
  flashDeal?: boolean;
}) {
  return (
    <Link
      to="/product/$slug"
      params={{ slug: p.slug }}
      search={flashDeal ? { deal: true } : {}}
    >
      {/* badge when flashDeal */}
    </Link>
  );
}
