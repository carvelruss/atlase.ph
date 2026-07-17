import { useEffect, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PageHeader } from '@/components/common/PageHeader';
import { Spinner } from '@/components/feedback/Spinner';
import { useToast } from '@/components/feedback/Toast';
import { useHomepageSections, useSaveHomepage, type HomepageSection } from '@/features/appearance/api';

interface FieldDef { key: string; label: string }
const SECTION_TYPES: Record<string, { label: string; fields: FieldDef[] }> = {
  announcement: { label: 'Announcement bar', fields: [{ key: 'text', label: 'Text' }, { key: 'link', label: 'Link' }] },
  hero: { label: 'Hero banner', fields: [{ key: 'heading', label: 'Heading' }, { key: 'subheading', label: 'Subheading' }, { key: 'ctaLabel', label: 'Button label' }, { key: 'ctaHref', label: 'Button link' }] },
  featured_categories: { label: 'Featured categories', fields: [{ key: 'title', label: 'Title' }] },
  featured_products: { label: 'Featured products', fields: [{ key: 'title', label: 'Title' }] },
  promo_banner: { label: 'Promotional banner', fields: [{ key: 'heading', label: 'Heading' }, { key: 'subheading', label: 'Subheading' }, { key: 'ctaLabel', label: 'Button label' }, { key: 'ctaHref', label: 'Button link' }] },
  newsletter: { label: 'Newsletter signup', fields: [{ key: 'heading', label: 'Heading' }, { key: 'subheading', label: 'Subheading' }] },
  testimonials: { label: 'Testimonials', fields: [{ key: 'title', label: 'Title' }] },
};

function SortableSection({ section, index, onToggle, onChange, onRemove }: { section: HomepageSection; index: number; onToggle: () => void; onChange: (key: string, value: string) => void; onRemove: () => void }) {
  const sortId = section.id ?? `new-${index}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortId });
  const def = SECTION_TYPES[section.type];
  const [open, setOpen] = useState(false);
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }} className="at-card p-3 mb-2">
      <div className="d-flex align-items-center gap-2">
        <button className="btn btn-sm btn-link text-body-secondary p-0" {...attributes} {...listeners} aria-label="Reorder"><i className="bi bi-grip-vertical fs-5" /></button>
        <span className="fw-semibold">{def?.label ?? section.type}</span>
        <div className="form-check form-switch ms-auto mb-0">
          <input className="form-check-input" type="checkbox" checked={section.isEnabled} onChange={onToggle} aria-label="Enabled" />
        </div>
        <button className="btn btn-sm btn-link" onClick={() => setOpen((v) => !v)} aria-label="Edit"><i className={`bi bi-chevron-${open ? 'up' : 'down'}`} /></button>
        <button className="btn btn-sm btn-link text-danger" onClick={onRemove} aria-label="Remove"><i className="bi bi-trash" /></button>
      </div>
      {open && def && (
        <div className="row g-2 mt-2">
          {def.fields.map((f) => (
            <div className="col-md-6" key={f.key}>
              <label className="form-label small">{f.label}</label>
              <input className="form-control form-control-sm" value={String(section.settings[f.key] ?? '')} onChange={(e) => onChange(f.key, e.target.value)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HomepageEditorPage() {
  const toast = useToast();
  const { data, isLoading } = useHomepageSections();
  const save = useSaveHomepage();
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [addType, setAddType] = useState('hero');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => { if (data) setSections(data.sections); }, [data]);

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = sections.map((s, i) => s.id ?? `new-${i}`);
    const oldIndex = ids.indexOf(active.id as number | string);
    const newIndex = ids.indexOf(over.id as number | string);
    if (oldIndex >= 0 && newIndex >= 0) setSections(arrayMove(sections, oldIndex, newIndex));
  }

  const patch = (i: number, changes: Partial<HomepageSection>) => setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...changes } : s)));

  async function onSave() {
    try {
      await save.mutateAsync(sections.map(({ type, isEnabled, settings }) => ({ type, isEnabled, settings })));
      toast.success('Homepage published.');
    } catch { toast.error('Could not save.'); }
  }

  if (isLoading) return <Spinner center />;

  return (
    <div>
      <PageHeader title="Homepage sections" description="Arrange and edit the sections shown on your storefront homepage."
        actions={<><a href="/" target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary"><i className="bi bi-box-arrow-up-right me-1" />Preview</a><button className="btn btn-sm btn-primary" onClick={onSave} disabled={save.isPending}>{save.isPending ? 'Publishing…' : 'Publish'}</button></>} />

      <div className="d-flex gap-2 mb-3">
        <select className="form-select form-select-sm" style={{ maxWidth: 240 }} value={addType} onChange={(e) => setAddType(e.target.value)}>
          {Object.entries(SECTION_TYPES).map(([type, def]) => <option key={type} value={type}>{def.label}</option>)}
        </select>
        <button className="btn btn-sm btn-outline-primary" onClick={() => setSections([...sections, { type: addType, isEnabled: true, settings: {} }])}><i className="bi bi-plus-lg me-1" />Add section</button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sections.map((s, i) => s.id ?? `new-${i}`)} strategy={verticalListSortingStrategy}>
          {sections.map((section, i) => (
            <SortableSection key={section.id ?? `new-${i}`} section={section} index={i} onToggle={() => patch(i, { isEnabled: !section.isEnabled })} onChange={(key, value) => patch(i, { settings: { ...section.settings, [key]: value } })} onRemove={() => setSections(sections.filter((_, idx) => idx !== i))} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
