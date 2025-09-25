'use client';

import { useFormContext } from 'react-hook-form';
import { Button, Card } from '../../../../components/ui';
import { ALIGNMENTS } from '../../../../lib/character-data';

export default function DetailsStep({ onNext, onBack }) {
  const { register, setValue, watch } = useFormContext();
  const alignment = watch('alignment');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>Next</Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 p-2">
          <div>
            <label className="block text-sm text-amber-300 mb-1">Character Name</label>
            <input {...register('name')} placeholder="e.g. Elowen Brightleaf" className="w-full bg-slate-800/50 border border-amber-500/30 rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-amber-300 mb-1">Alignment</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ALIGNMENTS.map(al => (
                <button key={al.value} onClick={() => setValue('alignment', al.value, { shouldDirty: true })} className={`px-2 py-2 rounded bg-slate-800/50 border ${alignment === al.value ? 'border-amber-500' : 'border-amber-500/20'} text-left text-sm`}>{al.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-amber-300 mb-1">Personality</label>
              <textarea {...register('notes.personality')} rows={3} className="w-full bg-slate-800/50 border border-amber-500/30 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-amber-300 mb-1">Ideals</label>
              <textarea {...register('notes.ideals')} rows={3} className="w-full bg-slate-800/50 border border-amber-500/30 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-amber-300 mb-1">Bonds</label>
              <textarea {...register('notes.bonds')} rows={3} className="w-full bg-slate-800/50 border border-amber-500/30 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-amber-300 mb-1">Flaws</label>
              <textarea {...register('notes.flaws')} rows={3} className="w-full bg-slate-800/50 border border-amber-500/30 rounded px-3 py-2" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

