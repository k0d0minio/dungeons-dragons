'use client';

import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button, Card } from '../../../../components/ui';
import { getStandardArrayOptions, getPointBuyRemaining } from '../../../../lib/characterCreateStore';

const abilities = ['strength','dexterity','constitution','intelligence','wisdom','charisma'];

export default function AbilitiesStep({ onNext, onBack }) {
  const { watch, setValue } = useFormContext();
  const mode = watch('mode');
  const method = watch('abilityMethod');
  const scores = watch('abilityScores');

  const standardArray = useMemo(() => getStandardArrayOptions(), []);
  const pointBuyRemaining = useMemo(() => getPointBuyRemaining(scores || {}), [scores]);
  const isStandardArrayValid = useMemo(() => {
    const assigned = abilities.map((a) => scores?.[a] ?? 10).slice().sort((a,b)=>a-b);
    const target = standardArray.slice().sort((a,b)=>a-b);
    return assigned.length === target.length && assigned.every((v,i)=>v===target[i]);
  }, [scores, standardArray]);

  const assign = (ability, delta) => {
    const next = { ...scores, [ability]: Math.max(8, Math.min(15, (scores?.[ability] ?? 10) + delta)) };
    setValue('abilityScores', next, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button onClick={onNext} disabled={(method === 'pointBuy' && pointBuyRemaining !== 0) || (method === 'standardArray' && !isStandardArrayValid)}>Next</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <div className="space-y-2">
            <div className="text-sm text-amber-300">Assignment Method</div>
            {mode === 'advanced' ? (
              <div className="flex gap-2">
                <Button variant={method === 'standardArray' ? 'primary' : 'ghost'} onClick={() => setValue('abilityMethod','standardArray',{ shouldDirty: true })}>Standard Array</Button>
                <Button variant={method === 'pointBuy' ? 'primary' : 'ghost'} onClick={() => setValue('abilityMethod','pointBuy',{ shouldDirty: true })}>Point Buy</Button>
              </div>
            ) : (
              <div className="text-xs text-amber-400">Beginner mode uses Standard Array for a smoother start.</div>
            )}
            {method === 'standardArray' && (
              <div className="text-xs text-amber-400">Use exactly: {standardArray.join(', ')} {isStandardArrayValid ? '✓' : '(not matched)'}
              </div>
            )}
            {method === 'pointBuy' && (
              <div className={`${pointBuyRemaining === 0 ? 'text-green-300' : 'text-amber-400'} text-xs`}>Points remaining: {pointBuyRemaining}</div>
            )}
          </div>
        </Card>

        <Card className="md:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {abilities.map((a) => (
              <div key={a} className="bg-slate-800/40 rounded p-3 text-center">
                <div className="text-amber-300 uppercase text-xs">{a}</div>
                <div className="text-amber-100 text-2xl font-bold">{scores?.[a] ?? 10}</div>
                <div className="flex justify-center gap-2 mt-2">
                  <Button size="sm" variant="ghost" onClick={() => assign(a, -1)}>-</Button>
                  <Button size="sm" variant="ghost" onClick={() => assign(a, +1)}>+</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

