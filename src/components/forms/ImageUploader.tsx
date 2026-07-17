import { useRef, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { uploadImage } from '@/features/products/api';
import { useToast } from '@/components/feedback/Toast';
import type { ProductImageInput } from '@/features/catalog/types';
import styles from './ImageUploader.module.scss';

interface ImageUploaderProps {
  value: ProductImageInput[];
  onChange: (images: ProductImageInput[]) => void;
  folder: string;
  entityId?: number;
}

function SortableImage({ image, onRemove, isFirst }: { image: ProductImageInput; onRemove: () => void; isFirst: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.assetId });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className={styles.thumb}>
      <img src={image.url} alt={image.altText ?? ''} />
      {isFirst && <span className={styles.featuredTag}>Featured</span>}
      <button type="button" className={styles.dragHandle} {...attributes} {...listeners} aria-label="Reorder">
        <i className="bi bi-grip-vertical" />
      </button>
      <button type="button" className={styles.remove} onClick={onRemove} aria-label="Remove image">
        <i className="bi bi-x-lg" />
      </button>
    </div>
  );
}

export function ImageUploader({ value, onChange, folder, entityId }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: ProductImageInput[] = [];
      for (const file of Array.from(files)) {
        const asset = await uploadImage(file, folder, { entityId });
        uploaded.push({ assetId: asset.id, url: asset.url, altText: asset.altText });
      }
      onChange([...value, ...uploaded]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = value.findIndex((i) => i.assetId === active.id);
    const newIndex = value.findIndex((i) => i.assetId === over.id);
    if (oldIndex >= 0 && newIndex >= 0) onChange(arrayMove(value, oldIndex, newIndex));
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={value.map((i) => i.assetId)} strategy={rectSortingStrategy}>
          <div className={styles.grid}>
            {value.map((img, i) => (
              <SortableImage
                key={img.assetId}
                image={img}
                isFirst={i === 0}
                onRemove={() => onChange(value.filter((x) => x.assetId !== img.assetId))}
              />
            ))}
            <button type="button" className={styles.addTile} onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? (
                <span className="spinner-border spinner-border-sm" role="status" />
              ) : (
                <>
                  <i className="bi bi-plus-lg fs-4" aria-hidden="true" />
                  <span className="small">Add image</span>
                </>
              )}
            </button>
          </div>
        </SortableContext>
      </DndContext>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      <p className="text-body-secondary small mt-2 mb-0">The first image is used as the featured image. Drag to reorder.</p>
    </div>
  );
}
