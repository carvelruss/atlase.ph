import { useState, type KeyboardEvent } from 'react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder = 'Add a tag and press Enter' }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const t = draft.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="form-control d-flex flex-wrap gap-1 align-items-center" style={{ minHeight: 38 }}>
      {value.map((tag) => (
        <span key={tag} className="badge text-bg-light border d-inline-flex align-items-center gap-1">
          {tag}
          <button type="button" className="btn-close btn-close-sm" style={{ fontSize: '0.6rem' }} aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((t) => t !== tag))} />
        </span>
      ))}
      <input
        className="border-0 flex-grow-1"
        style={{ outline: 'none', minWidth: 120 }}
        value={draft}
        placeholder={value.length ? '' : placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
      />
    </div>
  );
}
