/**
 * Copy to: src/lib/flash-sale-client.ts
 */
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT } from "@/lib/product-pricing";
import { createFlashSaleClient } from "@flash-sale-template";

const client = createFlashSaleClient(supabase, PRODUCT_CARD_SELECT);

export const fetchFlashSaleCatalog = client.fetchFlashSaleCatalog;
export const fetchFlashSalePrice = client.fetchFlashSalePrice;
