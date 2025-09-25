'use client';

import { useFormContext } from 'react-hook-form';
import RaceViewer from '../../../../components/races/RaceViewer';
import { Button } from '../../../../components/ui';

export default function RaceStep({ onNext, onBack }) {
  const { watch, setValue } = useFormContext();
  const selected = watch('race');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button onClick={onNext} disabled={!selected}>Next</Button>
      </div>
      <RaceViewer onBack={() => {}} onSelect={(value) => setValue('race', value, { shouldDirty: true })} />
      <div className="text-amber-300 text-sm">Tap a race to view details, then press Next.</div>
    </div>
  );
}

