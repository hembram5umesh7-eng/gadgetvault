import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = Omit<ComponentProps<typeof Button>, "onClick"> & {
  url: string;
  onOpen: (url: string) => void | Promise<void>;
  children: ReactNode;
};

/** Opens Shopify links via parent callback (typically Brave on local dev server). */
export function ShopifyBraveButton({ url, onOpen, children, ...props }: Props) {
  const handleClick = async () => {
    try {
      await onOpen(url);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Button type="button" {...props} onClick={handleClick}>
      {children}
    </Button>
  );
}
