import { money } from '@/lib/format';
import { toMinorUnits, toMajorUnits } from '@shared/utils/money';
import type { ProductOptionInput, ProductVariantInput } from '@/features/catalog/types';

interface VariantsEditorProps {
  hasVariants: boolean;
  options: ProductOptionInput[];
  variants: ProductVariantInput[];
  basePrice: number;
  onChange: (next: { hasVariants: boolean; options: ProductOptionInput[]; variants: ProductVariantInput[] }) => void;
}

function cartesian(lists: string[][]): string[][] {
  return lists.reduce<string[][]>((acc, list) => acc.flatMap((combo) => list.map((v) => [...combo, v])), [[]]);
}

/** Rebuild the variant matrix from options, preserving data for unchanged combinations. */
function regenerate(options: ProductOptionInput[], existing: ProductVariantInput[]): ProductVariantInput[] {
  const valueLists = options.map((o) => o.values.filter((v) => v.trim()));
  if (valueLists.some((l) => l.length === 0)) return existing;
  const combos = cartesian(valueLists);
  const byKey = new Map(existing.map((v) => [v.optionSelections.join('|'), v]));
  return combos.map((combo) => {
    const key = combo.join('|');
    const prev = byKey.get(key);
    return (
      prev ?? {
        optionSelections: combo,
        sku: null,
        price: null,
        isActive: true,
        inventoryQuantity: 0,
      }
    );
  });
}

export function VariantsEditor({ hasVariants, options, variants, basePrice, onChange }: VariantsEditorProps) {
  const setHasVariants = (checked: boolean) => {
    if (checked) {
      const opts = options.length ? options : [{ name: '', values: [] }];
      onChange({ hasVariants: true, options: opts, variants });
    } else {
      onChange({
        hasVariants: false,
        options: [],
        variants: [{ optionSelections: [], sku: variants[0]?.sku ?? null, price: null, isActive: true, inventoryQuantity: variants[0]?.inventoryQuantity ?? 0 }],
      });
    }
  };

  const updateOption = (idx: number, patch: Partial<ProductOptionInput>) => {
    const nextOptions = options.map((o, i) => (i === idx ? { ...o, ...patch } : o));
    onChange({ hasVariants, options: nextOptions, variants: regenerate(nextOptions, variants) });
  };

  const addOption = () => onChange({ hasVariants, options: [...options, { name: '', values: [] }], variants });
  const removeOption = (idx: number) => {
    const nextOptions = options.filter((_, i) => i !== idx);
    onChange({ hasVariants, options: nextOptions, variants: regenerate(nextOptions, variants) });
  };

  const updateVariant = (idx: number, patch: Partial<ProductVariantInput>) => {
    onChange({ hasVariants, options, variants: variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)) });
  };

  return (
    <div>
      <div className="form-check form-switch mb-3">
        <input className="form-check-input" type="checkbox" id="hasVariants" checked={hasVariants} onChange={(e) => setHasVariants(e.target.checked)} />
        <label className="form-check-label" htmlFor="hasVariants">
          This product has multiple variants (e.g. size, color)
        </label>
      </div>

      {!hasVariants ? (
        <div className="row g-2">
          <div className="col-sm-6">
            <label className="form-label small">SKU</label>
            <input className="form-control" value={variants[0]?.sku ?? ''} onChange={(e) => updateVariant(0, { sku: e.target.value || null })} />
          </div>
          <div className="col-sm-6">
            <label className="form-label small">Quantity</label>
            <input type="number" className="form-control" value={variants[0]?.inventoryQuantity ?? 0} onChange={(e) => updateVariant(0, { inventoryQuantity: Number(e.target.value) || 0 })} />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3">
            {options.map((opt, i) => (
              <div key={i} className="row g-2 align-items-end mb-2">
                <div className="col-4">
                  <label className="form-label small">Option name</label>
                  <input className="form-control form-control-sm" placeholder="Size" value={opt.name} onChange={(e) => updateOption(i, { name: e.target.value })} />
                </div>
                <div className="col">
                  <label className="form-label small">Values (comma separated)</label>
                  <input className="form-control form-control-sm" placeholder="S, M, L" value={opt.values.join(', ')} onChange={(e) => updateOption(i, { values: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })} />
                </div>
                <div className="col-auto">
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeOption(i)} aria-label="Remove option">
                    <i className="bi bi-trash" />
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={addOption}>
              <i className="bi bi-plus-lg me-1" /> Add option
            </button>
          </div>

          {variants.length > 0 && variants[0]!.optionSelections.length > 0 && (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr className="small text-body-secondary">
                    <th>Variant</th>
                    <th style={{ width: 130 }}>Price</th>
                    <th style={{ width: 130 }}>SKU</th>
                    <th style={{ width: 100 }}>Qty</th>
                    <th style={{ width: 60 }}>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v, i) => (
                    <tr key={v.optionSelections.join('|')}>
                      <td className="fw-medium">{v.optionSelections.join(' / ')}</td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control form-control-sm"
                          placeholder={money(basePrice)}
                          value={v.price != null ? toMajorUnits(v.price) : ''}
                          onChange={(e) => updateVariant(i, { price: e.target.value ? toMinorUnits(e.target.value) : null })}
                        />
                      </td>
                      <td>
                        <input className="form-control form-control-sm" value={v.sku ?? ''} onChange={(e) => updateVariant(i, { sku: e.target.value || null })} />
                      </td>
                      <td>
                        <input type="number" className="form-control form-control-sm" value={v.inventoryQuantity} onChange={(e) => updateVariant(i, { inventoryQuantity: Number(e.target.value) || 0 })} />
                      </td>
                      <td className="text-center">
                        <input type="checkbox" className="form-check-input" checked={v.isActive} onChange={(e) => updateVariant(i, { isActive: e.target.checked })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
