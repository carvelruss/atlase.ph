import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Spinner } from '@/components/feedback/Spinner';
import { useToast } from '@/components/feedback/Toast';
import { useNavigation, useSaveMenu, type MenuItem } from '@/features/content/api';

const MENUS = [
  { handle: 'header', name: 'Header Menu' },
  { handle: 'footer', name: 'Footer Menu' },
];

function newItem(): MenuItem {
  return { label: '', linkType: 'url', url: '', refId: null, isVisible: true };
}

export function NavigationPage() {
  const toast = useToast();
  const { data, isLoading } = useNavigation();
  const save = useSaveMenu();
  const [items, setItems] = useState<Record<string, MenuItem[]>>({});

  useEffect(() => {
    if (!data) return;
    const map: Record<string, MenuItem[]> = {};
    for (const m of MENUS) {
      const found = data.menus.find((x) => x.handle === m.handle);
      map[m.handle] = found?.items ?? [];
    }
    setItems(map);
  }, [data]);

  function update(handle: string, list: MenuItem[]) {
    setItems((prev) => ({ ...prev, [handle]: list }));
  }

  async function saveMenu(handle: string, name: string) {
    try {
      await save.mutateAsync({ handle, name, items: (items[handle] ?? []).filter((i) => i.label.trim()) });
      toast.success(`${name} saved.`);
    } catch {
      toast.error('Could not save menu.');
    }
  }

  if (isLoading) return <Spinner center />;

  return (
    <div>
      <PageHeader title="Navigation" description="Manage your header and footer menus." />
      <div className="row g-3">
        {MENUS.map((menu) => {
          const list = items[menu.handle] ?? [];
          return (
            <div className="col-12 col-lg-6" key={menu.handle}>
              <div className="at-card p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h6 mb-0">{menu.name}</h2>
                  <button className="btn btn-sm btn-primary" onClick={() => saveMenu(menu.handle, menu.name)} disabled={save.isPending}>Save</button>
                </div>
                {list.map((item, i) => (
                  <div className="row g-2 mb-2 align-items-center" key={i}>
                    <div className="col-5"><input className="form-control form-control-sm" placeholder="Label" value={item.label} onChange={(e) => update(menu.handle, list.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))} /></div>
                    <div className="col"><input className="form-control form-control-sm" placeholder="/shop" value={item.url ?? ''} onChange={(e) => update(menu.handle, list.map((x, idx) => (idx === i ? { ...x, url: e.target.value } : x)))} /></div>
                    <div className="col-auto"><button className="btn btn-sm btn-outline-danger" onClick={() => update(menu.handle, list.filter((_, idx) => idx !== i))} aria-label="Remove"><i className="bi bi-x" /></button></div>
                  </div>
                ))}
                <button className="btn btn-sm btn-outline-secondary mt-1" onClick={() => update(menu.handle, [...list, newItem()])}><i className="bi bi-plus-lg me-1" />Add link</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
