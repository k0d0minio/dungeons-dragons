'use client';

import { useFormContext } from 'react-hook-form';
import { BACKGROUNDS } from '../../../../lib/character-data';
import { Button, Card } from '../../../../components/ui';

export default function BackgroundStep({ onNext, onBack }) {
  const { setValue, watch } = useFormContext();
  const selected = watch('background');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button onClick={onNext} disabled={!selected}>Next</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {BACKGROUNDS.map(bg => (
          <Card key={bg.value} clickable hover onClick={() => setValue('background', bg.value, { shouldDirty: true })}>
            <div className={`p-4 ${selected === bg.value ? 'ring-2 ring-amber-500 rounded' : ''}`}>
              <div className="text-lg font-serif">{bg.label}</div>
              <div className="text-amber-300 text-sm">Feature previews and skills (MVP placeholder)</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

