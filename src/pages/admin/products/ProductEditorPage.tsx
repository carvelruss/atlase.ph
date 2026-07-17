import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Spinner } from '@/components/feedback/Spinner';
import { RichTextEditor } from '@/components/forms/RichTextEditor';
import { ImageUploader } from '@/components/forms/ImageUploader';
import { TagInput } from '@/components/forms/TagInput';
import { VariantsEditor } from '@/features/products/VariantsEditor';
import { useToast } from '@/components/feedback/Toast';
import { ApiError } from '@/lib/api';
import { toMajorUnits, toMinorUnits } from '@shared/utils/money';
import { useProduct, useSaveProduct } from '@/features/products/api';
import { useCategories } from '@/features/categories/api';
import { useCollections } from '@/features/collections/api';
import type { AdminProductDetail, ProductInput } from '@/features/catalog/types';
import styles from './ProductEditor.module.scss';

function blankProduct(): ProductInput {
  return {
    name: '',
    shortDescription: '',
    description: '',
    status: 'draft',
    price: 0,
    compareAtPrice: null,
    costPerItem: null,
    taxable: true,
    sku: '',
    barcode: '',
    trackInventory: true,
    continueSellingWhenOutOfStock: false,
    lowStockThreshold: 5,
    requiresShipping: true,
    weightGrams: null,
    brand: '',
    tags: [],
    isFeatured: false,
    seoTitle: '',
    seoDescription: '',
    featuredImageAssetId: null,
    categoryIds: [],
    collectionIds: [],
    images: [],
    options: [],
    variants: [{ optionSelections: [], sku: null, price: null, isActive: true, inventoryQuantity: 0 }],
  };
}

function toForm(d: AdminProductDetail): ProductInput {
  return {
    name: d.name,
    slug: d.slug,
    shortDescription: d.shortDescription ?? '',
    description: d.description ?? '',
    status: d.status,
    price: d.price,
    compareAtPrice: d.compareAtPrice,
    costPerItem: d.costPerItem,
    taxable: d.taxable,
    sku: d.sku ?? '',
    barcode: d.barcode ?? '',
    trackInventory: d.trackInventory,
    continueSellingWhenOutOfStock: d.continueSellingWhenOutOfStock,
    lowStockThreshold: d.lowStockThreshold,
    requiresShipping: d.requiresShipping,
    weightGrams: d.weightGrams,
    brand: d.brand ?? '',
    tags: d.tags ?? [],
    isFeatured: d.isFeatured,
    seoTitle: d.seoTitle ?? '',
    seoDescription: d.seoDescription ?? '',
    featuredImageAssetId: d.featuredImageAssetId,
    categoryIds: d.categoryIds ?? [],
    collectionIds: d.collectionIds ?? [],
    images: (d.images ?? []).map((im) => ({ assetId: im.assetId, altText: im.altText, url: im.url ?? undefined })),
    options: (d.options ?? []).map((o) => ({ name: o.name, values: (o.values ?? []).map((v) => v.value) })),
    variants: (d.variants ?? []).map((v) => ({
      id: v.id,
      optionSelections: v.title && v.title !== 'Default' ? v.title.split(' / ') : [],
      sku: v.sku ?? null,
      price: v.price ?? null,
      compareAtPrice: v.compareAtPrice ?? null,
      isActive: v.isActive,
      inventoryQuantity: v.inventoryQuantity ?? 0,
    })),
  };
}

export function ProductEditorPage() {
  const { productId } = useParams();
  const isNew = !productId || productId === 'new';
  const id = isNew ? null : Number(productId);
  const navigate = useNavigate();
  const toast = useToast();

  const { data: loaded, isLoading } = useProduct(id);
  const { data: categoriesData } = useCategories();
  const { data: collectionsData } = useCollections();
  const save = useSaveProduct(id);

  const [form, setForm] = useState<ProductInput>(blankProduct());
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (loaded) setForm(toForm(loaded));
  }, [loaded]);

  const patch = (p: Partial<ProductInput>) => setForm((f) => ({ ...f, ...p }));
  const hasVariants = useMemo(() => form.options.length > 0, [form.options.length]);

  async function onSave() {
    setErrors({});
    if (!form.name.trim()) {
      setErrors({ name: ['Product name is required.'] });
      return;
    }
    const payload: ProductInput = {
      ...form,
      featuredImageAssetId: form.images[0]?.assetId ?? null,
      variants: form.variants.length ? form.variants : blankProduct().variants,
    };
    try {
      const result = await save.mutateAsync(payload);
      toast.success(isNew ? 'Product created.' : 'Product saved.');
      if (isNew) navigate(`/admin/products/${result.id}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast.error(err instanceof ApiError ? err.message : 'Could not save product.');
    }
  }

  if (!isNew && isLoading) return <Spinner center />;

  const categories = categoriesData?.items ?? [];
  const collections = collectionsData?.items ?? [];

  return (
    <div>
      <PageHeader
        title={isNew ? 'Add product' : form.name || 'Edit product'}
        breadcrumbs={[{ label: 'Products', href: '/admin/products' }, { label: isNew ? 'New' : 'Edit' }]}
        actions={
          <>
            <button className="btn btn-sm btn-light" onClick={() => navigate('/admin/products')}>
              Cancel
            </button>
            <button className="btn btn-sm btn-primary" onClick={onSave} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save product'}
            </button>
          </>
        }
      />

      <div className="row g-3">
        {/* Main column */}
        <div className="col-12 col-lg-8">
          <div className="at-card p-3 p-md-4 mb-3">
            <div className="mb-3">
              <label className="form-label">Product name</label>
              <input className={`form-control ${errors.name ? 'is-invalid' : ''}`} value={form.name} onChange={(e) => patch({ name: e.target.value })} />
              {errors.name && <div className="invalid-feedback">{errors.name[0]}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label">Short description</label>
              <input className="form-control" value={form.shortDescription ?? ''} onChange={(e) => patch({ shortDescription: e.target.value })} maxLength={500} />
            </div>
            <div>
              <label className="form-label">Description</label>
              <RichTextEditor value={form.description ?? ''} onChange={(html) => patch({ description: html })} />
            </div>
          </div>

          <div className="at-card p-3 p-md-4 mb-3">
            <h2 className="h6 mb-3">Media</h2>
            <ImageUploader value={form.images} onChange={(images) => patch({ images })} folder="products" entityId={id ?? undefined} />
          </div>

          <div className="at-card p-3 p-md-4 mb-3">
            <h2 className="h6 mb-3">Pricing</h2>
            <div className="row g-3">
              <PriceField label="Price" value={form.price} onChange={(v) => patch({ price: v ?? 0 })} />
              <PriceField label="Compare-at price" value={form.compareAtPrice ?? null} onChange={(v) => patch({ compareAtPrice: v })} />
              <PriceField label="Cost per item" value={form.costPerItem ?? null} onChange={(v) => patch({ costPerItem: v })} />
              <div className="col-12">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="taxable" checked={form.taxable} onChange={(e) => patch({ taxable: e.target.checked })} />
                  <label className="form-check-label" htmlFor="taxable">
                    Charge tax on this product
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="at-card p-3 p-md-4 mb-3">
            <h2 className="h6 mb-3">Variants &amp; inventory</h2>
            <VariantsEditor
              hasVariants={hasVariants}
              options={form.options}
              variants={form.variants}
              basePrice={form.price}
              onChange={({ options, variants }) => patch({ options, variants })}
            />
            <hr />
            <div className="row g-3">
              <div className="col-sm-6">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="track" checked={form.trackInventory} onChange={(e) => patch({ trackInventory: e.target.checked })} />
                  <label className="form-check-label" htmlFor="track">
                    Track quantity
                  </label>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="continueSelling" checked={form.continueSellingWhenOutOfStock} onChange={(e) => patch({ continueSellingWhenOutOfStock: e.target.checked })} />
                  <label className="form-check-label" htmlFor="continueSelling">
                    Continue selling when out of stock
                  </label>
                </div>
              </div>
              <div className="col-sm-6">
                <label className="form-label small">Low-stock threshold</label>
                <input type="number" className="form-control" value={form.lowStockThreshold} onChange={(e) => patch({ lowStockThreshold: Number(e.target.value) || 0 })} />
              </div>
            </div>
          </div>

          <div className="at-card p-3 p-md-4 mb-3">
            <h2 className="h6 mb-3">Shipping</h2>
            <div className="form-check mb-3">
              <input className="form-check-input" type="checkbox" id="requiresShipping" checked={form.requiresShipping} onChange={(e) => patch({ requiresShipping: e.target.checked })} />
              <label className="form-check-label" htmlFor="requiresShipping">
                This is a physical product that requires shipping
              </label>
            </div>
            {form.requiresShipping && (
              <div className="row g-3">
                <div className="col-sm-6">
                  <label className="form-label small">Weight (grams)</label>
                  <input type="number" className="form-control" value={form.weightGrams ?? ''} onChange={(e) => patch({ weightGrams: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
            )}
          </div>

          <div className="at-card p-3 p-md-4">
            <h2 className="h6 mb-3">Search engine listing</h2>
            <div className="mb-3">
              <label className="form-label small">SEO title</label>
              <input className="form-control" value={form.seoTitle ?? ''} onChange={(e) => patch({ seoTitle: e.target.value })} maxLength={200} />
            </div>
            <div>
              <label className="form-label small">Meta description</label>
              <textarea className="form-control" rows={2} value={form.seoDescription ?? ''} onChange={(e) => patch({ seoDescription: e.target.value })} maxLength={500} />
            </div>
          </div>
        </div>

        {/* Sticky organization column */}
        <div className="col-12 col-lg-4">
          <div className={styles.sticky}>
            <div className="at-card p-3 p-md-4 mb-3">
              <h2 className="h6 mb-3">Status</h2>
              <select className="form-select mb-3" value={form.status} onChange={(e) => patch({ status: e.target.value as ProductInput['status'] })}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" id="featured" checked={form.isFeatured} onChange={(e) => patch({ isFeatured: e.target.checked })} />
                <label className="form-check-label" htmlFor="featured">
                  Featured product
                </label>
              </div>
            </div>

            <div className="at-card p-3 p-md-4 mb-3">
              <h2 className="h6 mb-3">Organization</h2>
              <div className="mb-3">
                <label className="form-label small">Brand</label>
                <input className="form-control" value={form.brand ?? ''} onChange={(e) => patch({ brand: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className="form-label small">Categories</label>
                <div className="border rounded p-2" style={{ maxHeight: 180, overflowY: 'auto' }}>
                  {categories.length === 0 && <div className="text-body-secondary small">No categories yet.</div>}
                  {categories.map((c) => (
                    <div className="form-check" key={c.id}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`cat-${c.id}`}
                        checked={form.categoryIds.includes(c.id)}
                        onChange={(e) => patch({ categoryIds: e.target.checked ? [...form.categoryIds, c.id] : form.categoryIds.filter((x) => x !== c.id) })}
                      />
                      <label className="form-check-label" htmlFor={`cat-${c.id}`}>
                        {c.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label small">Collections</label>
                <div className="border rounded p-2" style={{ maxHeight: 140, overflowY: 'auto' }}>
                  {collections.length === 0 && <div className="text-body-secondary small">No collections yet.</div>}
                  {collections.filter((c) => c.type === 'manual').map((c) => (
                    <div className="form-check" key={c.id}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`col-${c.id}`}
                        checked={form.collectionIds.includes(c.id)}
                        onChange={(e) => patch({ collectionIds: e.target.checked ? [...form.collectionIds, c.id] : form.collectionIds.filter((x) => x !== c.id) })}
                      />
                      <label className="form-check-label" htmlFor={`col-${c.id}`}>
                        {c.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label small">Tags</label>
                <TagInput value={form.tags} onChange={(tags) => patch({ tags })} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceField({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="col-sm-4">
      <label className="form-label small">{label}</label>
      <div className="input-group">
        <span className="input-group-text">₱</span>
        <input
          type="number"
          step="0.01"
          min="0"
          className="form-control"
          value={value != null ? toMajorUnits(value) : ''}
          onChange={(e) => onChange(e.target.value ? toMinorUnits(e.target.value) : null)}
        />
      </div>
    </div>
  );
}
