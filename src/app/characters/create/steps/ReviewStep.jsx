'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button, Card } from '../../../../components/ui';

export default function ReviewStep({ onBack }) {
  const { getValues } = useFormContext();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const draft = getValues();

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save');
      }
      window.location.href = '/';
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button onClick={save} loading={saving}>Create Character</Button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded p-3 text-red-200 text-sm">{error}</div>
      )}

      <Card>
        <div className="p-4 space-y-2">
          <div className="text-amber-300 text-sm">Review</div>
          <div className="text-xl font-serif">{draft.name || 'Unnamed Hero'}</div>
          <div className="text-amber-200 text-sm">{(draft.race || '—') + ' ' + (draft.class || '—')}</div>
          <div className="grid grid-cols-3 gap-2 text-sm mt-2">
            {Object.entries(draft.abilityScores || {}).map(([k, v]) => (
              <div key={k} className="bg-slate-800/60 rounded p-2 text-center">
                <div className="text-amber-300 uppercase">{k.slice(0,3)}</div>
                <div className="text-amber-100 font-bold">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

