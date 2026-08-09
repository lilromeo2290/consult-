'use client';

import { FileQuestion } from 'lucide-react';

export function PenaltiesPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <FileQuestion className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
      <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">Penalties</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
        No penalty configurations have been set up yet.
      </p>
    </div>
  );
}
