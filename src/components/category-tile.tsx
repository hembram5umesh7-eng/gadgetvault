import { Link } from "@tanstack/react-router";

const CATEGORY_IMAGES: Record<string, string> = {
  smartphones: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80",
  audio: "https://images.unsplash.com/photo-1590658268037-6bf9d7a3d96f?w=600&q=80",
  chargers: "https://images.unsplash.com/photo-1583394838336-acd977736298?w=600&q=80",
  smartwatches: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80",
  powerbanks: "https://images.unsplash.com/photo-1609091839311-9a442fbd5297?w=600&q=80",
  accessories: "https://images.unsplash.com/photo-1625948515291-69613efd447f?w=600&q=80",
};

export function getCategoryImage(slug: string, imageUrl?: string | null) {
  return CATEGORY_IMAGES[slug] || imageUrl || "";
}

const CATEGORY_GRADIENTS = [
  "from-slate-800 to-slate-600",
  "from-blue-700 to-blue-500",
  "from-violet-700 to-violet-500",
  "from-cyan-700 to-cyan-500",
  "from-indigo-700 to-indigo-500",
  "from-sky-700 to-sky-500",
];

interface CategoryTileProps {
  slug: string;
  name: string;
  imageUrl?: string | null;
  index: number;
}

export function CategoryTile({ slug, name, imageUrl, index }: CategoryTileProps) {
  const src = getCategoryImage(slug, imageUrl);
  const gradient = CATEGORY_GRADIENTS[index % CATEGORY_GRADIENTS.length];

  return (
    <Link
      to="/category/$category"
      params={{ category: slug }}
      className={`group relative overflow-hidden rounded-2xl aspect-square bg-gradient-to-br ${gradient}`}
    >
      {src && (
        <img
          src={src}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <h3 className="absolute bottom-0 left-0 right-0 p-3 md:p-4 text-sm md:text-base font-extrabold text-white">
        {name}
      </h3>
    </Link>
  );
}
