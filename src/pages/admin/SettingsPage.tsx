import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Spinner } from '@/components/feedback/Spinner';
import { useToast } from '@/components/feedback/Toast';
import { toMinorUnits, toMajorUnits } from '@shared/utils/money';
import { useSettingsGroup, useSaveSettingsGroup } from '@/features/settings/api';

type FieldType = 'text' | 'number' | 'checkbox' | 'money';
interface Field { key: string; label: string; type: FieldType }

const TABS: { group: string; label: string; fields: Field[] }[] = [
  { group: 'store', label: 'Store', fields: [
    { key: 'name', label: 'Store name', type: 'text' }, { key: 'email', label: 'Store email', type: 'text' },
    { key: 'supportEmail', label: 'Support email', type: 'text' }, { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'address', label: 'Address', type: 'text' }, { key: 'currency', label: 'Currency', type: 'text' }, { key: 'timezone', label: 'Time zone', type: 'text' },
  ] },
  { group: 'checkout', label: 'Checkout', fields: [
    { key: 'guestCheckout', label: 'Allow guest checkout', type: 'checkbox' }, { key: 'requirePhone', label: 'Require phone', type: 'checkbox' },
    { key: 'termsAcceptance', label: 'Require terms acceptance', type: 'checkbox' }, { key: 'marketingOptIn', label: 'Show marketing opt-in', type: 'checkbox' },
    { key: 'minOrderValue', label: 'Minimum order value', type: 'money' },
  ] },
  { group: 'tax', label: 'Tax', fields: [
    { key: 'enabled', label: 'Enable tax', type: 'checkbox' }, { key: 'pricesIncludeTax', label: 'Prices include tax', type: 'checkbox' }, { key: 'defaultRate', label: 'Default rate (%)', type: 'number' },
  ] },
  { group: 'charges', label: 'Charges', fields: [
    { key: 'handlingFee', label: 'Handling fee', type: 'money' }, { key: 'codFee', label: 'COD fee', type: 'money' },
  ] },
  { group: 'seo', label: 'SEO', fields: [
    { key: 'defaultTitle', label: 'Default title', type: 'text' }, { key: 'titleTemplate', label: 'Title template', type: 'text' },
    { key: 'defaultDescription', label: 'Default description', type: 'text' }, { key: 'robots', label: 'Robots', type: 'text' },
  ] },
  { group: 'social', label: 'Social', fields: [
    { key: 'facebook', label: 'Facebook', type: 'text' }, { key: 'instagram', label: 'Instagram', type: 'text' }, { key: 'tiktok', label: 'TikTok', type: 'text' }, { key: 'youtube', label: 'YouTube', type: 'text' },
  ] },
];

function GroupForm({ group, fields }: { group: string; fields: Field[] }) {
  const toast = useToast();
  const { data, isLoading } = useSettingsGroup(group);
  const save = useSaveSettingsGroup(group);
  const [values, setValues] = useState<Record<string, unknown>>({});

  useEffect(() => { if (data) setValues(data.data); }, [data]);
  const set = (key: string, value: unknown) => setValues((prev) => ({ ...prev, [key]: value }));

  async function onSave() {
    try { await save.mutateAsync(values); toast.success('Settings saved.'); } catch { toast.error('Could not save.'); }
  }

  if (isLoading) return <Spinner center />;

  return (
    <div className="at-card p-4">
      <div className="row g-3">
        {fields.map((f) => (
          <div className={f.type === 'checkbox' ? 'col-12' : 'col-md-6'} key={f.key}>
            {f.type === 'checkbox' ? (
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" id={f.key} checked={Boolean(values[f.key])} onChange={(e) => set(f.key, e.target.checked)} />
                <label className="form-check-label" htmlFor={f.key}>{f.label}</label>
              </div>
            ) : (
              <>
                <label className="form-label">{f.label}</label>
                {f.type === 'money' ? (
                  <input className="form-control" type="number" step="0.01" value={values[f.key] != null ? toMajorUnits(Number(values[f.key])) : ''} onChange={(e) => set(f.key, e.target.value ? toMinorUnits(e.target.value) : 0)} />
                ) : (
                  <input className="form-control" type={f.type} value={String(values[f.key] ?? '')} onChange={(e) => set(f.key, f.type === 'number' ? Number(e.target.value) || 0 : e.target.value)} />
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4"><button className="btn btn-primary" onClick={onSave} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save changes'}</button></div>
    </div>
  );
}

export function SettingsPage() {
  const [active, setActive] = useState('store');
  const tab = TABS.find((t) => t.group === active)!;
  return (
    <div>
      <PageHeader title="Settings" description="Configure your store." />
      <ul className="nav nav-pills mb-3 flex-wrap gap-1">
        {TABS.map((t) => (
          <li className="nav-item" key={t.group}>
            <button className={`nav-link ${active === t.group ? 'active' : ''}`} onClick={() => setActive(t.group)}>{t.label}</button>
          </li>
        ))}
      </ul>
      <GroupForm key={tab.group} group={tab.group} fields={tab.fields} />
    </div>
  );
}
