const RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'lifetime', label: 'Lifetime' },
];

export function RangeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className="form-select form-select-sm" style={{ width: 'auto' }} value={value} onChange={(e) => onChange(e.target.value)} aria-label="Date range">
      {RANGES.map((r) => (
        <option key={r.value} value={r.value}>{r.label}</option>
      ))}
    </select>
  );
}
