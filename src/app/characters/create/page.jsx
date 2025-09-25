'use client';

import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useCharacterCreateStore } from '../../../lib/characterCreateStore';
import { Button, Card } from '../../../components/ui';
import ModeStep from './steps/ModeStep';
import ClassStep from './steps/ClassStep';
import RaceStep from './steps/RaceStep';
import BackgroundStep from './steps/BackgroundStep';
import AbilitiesStep from './steps/AbilitiesStep';
import DetailsStep from './steps/DetailsStep';
import ReviewStep from './steps/ReviewStep';
import { validateCharacterName } from '../../../lib/validation';

const steps = [
  { key: 'mode', label: 'Mode' },
  { key: 'class', label: 'Class' },
  { key: 'race', label: 'Race' },
  { key: 'background', label: 'Background' },
  { key: 'abilities', label: 'Abilities' },
  { key: 'details', label: 'Details' },
  { key: 'review', label: 'Review' },
];

export default function CreateCharacterPage() {
  const { stepIndex, draft, nextStep, prevStep, goToStep, updateDraft } = useCharacterCreateStore();

  const methods = useForm({
    defaultValues: draft,
    mode: 'onChange',
  });

  // Sync RHF form with store draft
  useEffect(() => {
    const subscription = methods.watch((values) => {
      updateDraft(values);
    });
    return () => subscription.unsubscribe();
  }, [methods, updateDraft]);

  const proceed = async () => {
    const key = steps[stepIndex].key;
    if (key === 'class' && !methods.getValues('class')) return;
    if (key === 'race' && !methods.getValues('race')) return;
    if (key === 'details') {
      const name = methods.getValues('name');
      const result = validateCharacterName(name);
      if (!result.isValid) {
        methods.setError('name', { type: 'manual', message: result.message });
        return;
      }
    }
    nextStep();
  };

  const CurrentStep = () => {
    switch (steps[stepIndex].key) {
      case 'mode':
        return <ModeStep onNext={proceed} />;
      case 'class':
        return <ClassStep onNext={proceed} onBack={prevStep} />;
      case 'race':
        return <RaceStep onNext={proceed} onBack={prevStep} />;
      case 'background':
        return <BackgroundStep onNext={proceed} onBack={prevStep} />;
      case 'abilities':
        return <AbilitiesStep onNext={proceed} onBack={prevStep} />;
      case 'details':
        return <DetailsStep onNext={proceed} onBack={prevStep} />;
      case 'review':
        return <ReviewStep onBack={prevStep} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-amber-100">
      <div className="mx-auto max-w-5xl p-4">
        <header className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🧝‍♀️</div>
              <div>
                <h1 className="text-lg font-bold font-serif tracking-wider">Create Character</h1>
                <p className="text-amber-300 text-sm">Beginner-friendly guided workflow</p>
              </div>
            </div>
            <div className="text-sm text-amber-300">Step {stepIndex + 1} of {steps.length}</div>
          </div>
          <nav className="mt-3 grid grid-cols-7 gap-1 text-xs">
            {steps.map((s, idx) => (
              <button
                key={s.key}
                onClick={() => goToStep(idx)}
                className={`px-2 py-1 rounded ${idx === stepIndex ? 'bg-amber-600 text-white' : 'bg-slate-800/60 text-amber-300'}`}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormProvider {...methods}>
            <Card className="md:col-span-2">
              <div className="p-4">
                <CurrentStep />
              </div>
            </Card>
            <aside>
              <PreviewSidebar draft={draft} />
            </aside>
          </FormProvider>
        </div>
      </div>
    </div>
  );
}

function PreviewSidebar({ draft }) {
  return (
    <Card>
      <div className="p-4 space-y-3">
        <div className="text-sm text-amber-300">Live Preview</div>
        <div className="text-xl font-serif">{draft.name || 'Unnamed Hero'}</div>
        <div className="text-amber-200 text-sm">
          {(draft.race || '—') + ' ' + (draft.class || '—')}
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {Object.entries(draft.abilityScores || {}).map(([k, v]) => (
            <div key={k} className="bg-slate-800/60 rounded p-2 text-center">
              <div className="text-amber-300 uppercase">{k.slice(0,3)}</div>
              <div className="text-amber-100 font-bold">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

