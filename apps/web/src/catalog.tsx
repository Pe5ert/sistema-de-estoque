import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { products as examples, type ProductPresentation } from './demo-data';

export type ProductDraft = Omit<ProductPresentation, 'id' | 'stock' | 'imageUrl'> & {
  imageFile: File | null;
  removeImage: boolean;
};

type Catalog = {
  products: readonly ProductPresentation[];
  saveProduct: (draft: ProductDraft, id?: string) => Promise<ProductPresentation>;
};

const CatalogContext = createContext<Catalog | null>(null);

// Session-only presentation state. No API, browser storage or stock mutation.
export function DemoCatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<ProductPresentation[]>(() => examples.map((product) => ({ ...product, id: product.sku })));
  const latest = useRef(products);
  const ownedImageUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls = ownedImageUrls.current;
    return () => { urls.forEach((url) => URL.revokeObjectURL(url)); urls.clear(); };
  }, []);

  const saveProduct = async (draft: ProductDraft, id?: string) => {
    const current = id ? latest.current.find((product) => product.id === id) : undefined;
    if (id && !current) throw new Error('O produto não está mais disponível nesta sessão.');
    if (latest.current.some((product) => product.id !== id && product.sku.toLocaleLowerCase() === draft.sku.toLocaleLowerCase())) {
      throw new Error('Este SKU já existe nesta demonstração.');
    }
    if (draft.barcode && latest.current.some((product) => product.id !== id && product.barcode === draft.barcode)) {
      throw new Error('Este código de barras já existe nesta demonstração.');
    }
    const { imageFile, removeImage, ...fields } = draft;
    const imageUrl = imageFile ? URL.createObjectURL(imageFile) : removeImage ? null : current?.imageUrl ?? null;
    if (imageFile && imageUrl) ownedImageUrls.current.add(imageUrl);
    const saved: ProductPresentation = {
      ...fields, id: current?.id ?? crypto.randomUUID(), imageUrl,
      stock: current?.stock ?? 0,
      initialEntry: current ? current.initialEntry : fields.initialEntry,
    };
    const next = current ? latest.current.map((product) => product.id === id ? saved : product) : [...latest.current, saved];
    latest.current = next;
    setProducts(next);
    if (current?.imageUrl && current.imageUrl !== imageUrl && ownedImageUrls.current.delete(current.imageUrl)) URL.revokeObjectURL(current.imageUrl);
    return saved;
  };

  return <CatalogContext.Provider value={{ products, saveProduct }}>{children}</CatalogContext.Provider>;
}

export function useDemoCatalog() {
  const catalog = useContext(CatalogContext);
  if (!catalog) throw new Error('DemoCatalogProvider ausente.');
  return catalog;
}
