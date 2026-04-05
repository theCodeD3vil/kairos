import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsInput, SettingsRow } from '@/components/settings/SettingsPrimitives';

export function ExclusionEditor({
  label,
  items,
  placeholder,
  onChange,
}: {
  label: string;
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const addItem = () => {
    const value = draft.trim();
    if (!value) return;
    if (items.includes(value)) {
      setDraft('');
      return;
    }
    onChange([...items, value]);
    setDraft('');
  };

  return (
    <SettingsRow label={label} stacked>
      <div className="flex gap-2">
        <SettingsInput
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addItem();
            }
          }}
        />
        <Button variant="secondary" size="sm" className="rounded-full!" onClick={addItem}>
          Add
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg bg-[var(--surface-pill)] px-3 py-2 text-xs text-[var(--ink-tertiary)]">
          No exclusions added.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-pill)] px-3 py-1 text-xs text-[var(--ink-strong)]"
            >
              {item}
              <button
                type="button"
                className="rounded-full text-[var(--ink-tertiary)] hover:text-[var(--ink-strong)]"
                onClick={() => onChange(items.filter((entry) => entry !== item))}
                aria-label={`Remove ${item}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </SettingsRow>
  );
}
