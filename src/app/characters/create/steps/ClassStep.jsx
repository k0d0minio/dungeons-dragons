'use client';

import { useFormContext } from 'react-hook-form';
import ClassViewer from '../../../../components/classes/ClassViewer';
import { Button } from '../../../../components/ui';

export default function ClassStep({ onNext, onBack }) {
  const { setValue, watch } = useFormContext();
  const selected = watch('class');

  const handleBack = () => onBack();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={handleBack}>Back</Button>
        <Button onClick={onNext} disabled={!selected}>Next</Button>
      </div>
      <ClassViewer onBack={() => {}} onSelect={(value) => setValue('class', value, { shouldDirty: true })} />
      <div className="text-amber-300 text-sm">Tap a class to view details, then press Next.</div>
    </div>
  );
}

