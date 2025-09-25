'use client';

import { useFormContext } from 'react-hook-form';
import { Button, Card } from '../../../../components/ui';

export default function ModeStep({ onNext }) {
  const { setValue, watch } = useFormContext();
  const mode = watch('mode');

  const choose = (value) => {
    setValue('mode', value, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div className="space-y-4">
      <div className="text-amber-200">
        Choose a mode. Beginner mode explains concepts and recommends choices. Advanced mode shows all options.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <button onClick={() => choose('beginner')} className={`w-full text-left p-4 ${mode === 'beginner' ? 'ring-2 ring-amber-500 rounded' : ''}`}>
            <div className="text-lg font-serif">Beginner Mode</div>
            <div className="text-amber-300 text-sm">Guided with tips, recommended choices, tooltips.</div>
          </button>
        </Card>
        <Card>
          <button onClick={() => choose('advanced')} className={`w-full text-left p-4 ${mode === 'advanced' ? 'ring-2 ring-amber-500 rounded' : ''}`}>
            <div className="text-lg font-serif">Advanced Mode</div>
            <div className="text-amber-300 text-sm">Full customization and all options.</div>
          </button>
        </Card>
      </div>
      <div className="flex justify-end">
        <Button onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}

