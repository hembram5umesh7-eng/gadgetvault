import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface CompareItem {
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  specs: string | null;
  category: string;
}

interface CompareContextValue {
  items: CompareItem[];
  add: (item: CompareItem) => boolean;
  remove: (productId: string) => void;
  clear: () => void;
  has: (productId: string) => boolean;
  count: number;
  max: number;
}

const CompareContext = createContext<CompareContextValue | undefined>(undefined);
const STORAGE_KEY = "gv_compare_v1";
const MAX_COMPARE = 3;

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const has = (productId: string) => items.some((i) => i.productId === productId);

  const add = (item: CompareItem) => {
    if (items.some((i) => i.productId === item.productId)) return true;
    if (items.length >= MAX_COMPARE) return false;
    setItems((prev) => [...prev, item]);
    return true;
  };

  const remove = (productId: string) => setItems((prev) => prev.filter((i) => i.productId !== productId));
  const clear = () => setItems([]);

  return (
    <CompareContext.Provider value={{ items, add, remove, clear, has, count: items.length, max: MAX_COMPARE }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be inside CompareProvider");
  return ctx;
}
