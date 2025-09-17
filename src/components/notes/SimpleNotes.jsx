'use client';

export default function SimpleNotes() {
  return (
    <div className="space-y-6">
      <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
        <div className="text-red-200 text-center">
          <div className="text-lg font-bold mb-2">🧪 Simple Notes Test</div>
          <div className="text-sm">This is a very simple component</div>
          <div className="text-sm">No imports, no complex logic</div>
        </div>
      </div>
      
      <div className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/20">
        <div className="text-amber-100 text-center">
          <div className="text-lg font-bold mb-2">📝 Notes System</div>
          <div className="text-sm">This would be the notes interface</div>
        </div>
      </div>
    </div>
  );
}
