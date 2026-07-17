import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Spinner } from '@/components/feedback/Spinner';
import { useToast } from '@/components/feedback/Toast';
import { useTheme, useSaveTheme } from '@/features/appearance/api';

type ThemeData = Record<string, string | number>;

const COLOR_FIELDS = [
  { key: 'primaryColor', label: 'Primary color' },
  { key: 'secondaryColor', label: 'Secondary color' },
  { key: 'accentColor', label: 'Accent color' },
];

export function ThemeEditorPage() {
  const toast = useToast();
  const { data, isLoading } = useTheme();
  const save = useSaveTheme();
  const [theme, setTheme] = useState<ThemeData>({});

  useEffect(() => { if (data) setTheme(data.theme as ThemeData); }, [data]);

  const set = (key: string, value: string | number) => setTheme((prev) => ({ ...prev, [key]: value }));

  async function onSave() {
    try {
      await save.mutateAsync(theme);
      toast.success('Theme saved.');
    } catch { toast.error('Could not save theme.'); }
  }

  if (isLoading) return <Spinner center />;

  return (
    <div>
      <PageHeader title="Theme editor" description="Your storefront branding and colors." actions={<button className="btn btn-sm btn-primary" onClick={onSave} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>} />
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="at-card p-4">
            <h2 className="h6 mb-3">Branding</h2>
            <div className="mb-3"><label className="form-label">Store name</label><input className="form-control" value={String(theme.brandName ?? '')} onChange={(e) => set('brandName', e.target.value)} /></div>
            <div className="row g-3 mb-3">
              <div className="col-6"><label className="form-label">Heading font</label><input className="form-control" value={String(theme.headingFont ?? 'Inter')} onChange={(e) => set('headingFont', e.target.value)} /></div>
              <div className="col-6"><label className="form-label">Body font</label><input className="form-control" value={String(theme.bodyFont ?? 'Inter')} onChange={(e) => set('bodyFont', e.target.value)} /></div>
            </div>
            <div className="row g-3">
              <div className="col-6"><label className="form-label">Border radius (px)</label><input type="number" className="form-control" value={Number(theme.borderRadius ?? 10)} onChange={(e) => set('borderRadius', Number(e.target.value) || 0)} /></div>
              <div className="col-6"><label className="form-label">Container width (px)</label><input type="number" className="form-control" value={Number(theme.containerWidth ?? 1280)} onChange={(e) => set('containerWidth', Number(e.target.value) || 0)} /></div>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="at-card p-4">
            <h2 className="h6 mb-3">Colors</h2>
            {COLOR_FIELDS.map((f) => (
              <div className="mb-3 d-flex align-items-center gap-2" key={f.key}>
                <input type="color" className="form-control form-control-color" value={String(theme[f.key] ?? '#4f46e5')} onChange={(e) => set(f.key, e.target.value)} aria-label={f.label} />
                <div className="flex-grow-1">
                  <label className="form-label small mb-0">{f.label}</label>
                  <input className="form-control form-control-sm" value={String(theme[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
