#!/usr/bin/env python3
"""Pass 2: Replace common local CSS class definitions and remaining patterns."""

import os, glob, re

RMS_DIR = '/home/z/my-project/src/components/rms'

def replace_in_file(filepath: str):
    with open(filepath, 'r') as f:
        content = f.read()
    original = content

    # ─── Fix common local CSS variable definitions ───
    # Replace old inputClass patterns
    content = content.replace(
        "'w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition'",
        "'w-full rounded-lg border border-input bg-card px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition'"
    )
    content = content.replace(
        "'w-full rounded-lg border border-border bg-slate-50 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition'",
        "'w-full rounded-lg border border-input bg-card px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition'"
    )

    # ─── Fix btnPrimary: old navy → new primary, red hover removed ───
    content = content.replace(
        "'inline-flex items-center gap-2 bg-primary hover:bg-destructive text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap'",
        "'inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap'"
    )

    # ─── Fix remaining dark:dark: prefixes (double dark from replacement) ───
    content = content.replace('dark:dark:', 'dark:')

    # ─── Fix remaining hardcoded border-border duplicates ───
    content = content.replace('border-border border-border', 'border-border')

    # ─── Fix any remaining double text- prefixes ───
    content = content.replace('text-foreground text-foreground', 'text-foreground')
    content = content.replace('text-muted-foreground text-muted-foreground', 'text-muted-foreground')

    # ─── Replace bg-white dark:bg-card that may have been created ───
    content = content.replace('bg-white dark:bg-card', 'bg-card')

    # ─── Fix remaining hardcoded slate patterns that the first pass missed ───
    # These use different spacing/ordering
    content = re.sub(
        r'bg-slate-100\s+dark:bg-slate-800',
        'bg-muted', content
    )
    content = re.sub(
        r'text-slate-600\s+dark:text-slate-400',
        'text-muted-foreground', content
    )
    content = re.sub(
        r'text-slate-400\s+dark:text-slate-500',
        'text-muted-foreground', content
    )
    content = re.sub(
        r'border-slate-200\s+dark:border-slate-700',
        'border-border', content
    )
    content = re.sub(
        r'bg-slate-50\s+dark:bg-slate-900',
        'bg-card', content
    )
    content = re.sub(
        r'text-slate-900\s+dark:text-white',
        'text-foreground', content
    )
    content = re.sub(
        r'hover:bg-slate-50\s+dark:hover:bg-slate-800',
        'hover:bg-muted', content
    )
    content = re.sub(
        r'hover:bg-slate-100\s+dark:hover:bg-slate-700',
        'hover:bg-muted', content
    )
    content = re.sub(
        r'divide-slate-100\s+dark:divide-slate-700',
        'divide-border', content
    )

    # ─── Fix common card wrapper patterns ───
    content = re.sub(
        r'rounded-xl border border-border bg-card border-border',
        'rounded-xl border border-border bg-card', content
    )

    # ─── Fix select/option elements that should use bg-card ───
    content = content.replace(
        'className={`${inputClass}`}',
        'className={inputClass}'
    )

    # ─── Fix dark mode text patterns ───
    content = re.sub(
        r'text-slate-700 dark:text-slate-300',
        'text-foreground', content
    )
    content = re.sub(
        r'text-slate-600 dark:text-slate-200',
        'text-foreground', content
    )

    # ─── Fix table header bg ───
    content = re.sub(
        r'bg-muted border-b border-border',
        'bg-muted border-b border-border', content
    )

    # ─── Fix remaining bg-slate patterns individually ───
    content = content.replace('bg-slate-50', 'bg-card')
    content = content.replace('bg-slate-100', 'bg-muted')
    content = content.replace('text-slate-900', 'text-foreground')
    content = content.replace('text-slate-800', 'text-foreground')
    content = content.replace('text-slate-700', 'text-foreground')
    content = content.replace('text-slate-600', 'text-muted-foreground')
    content = content.replace('text-slate-500', 'text-muted-foreground')
    content = content.replace('text-slate-400', 'text-muted-foreground')
    content = content.replace('border-slate-200', 'border-border')
    content = content.replace('border-slate-300', 'border-input')
    content = content.replace('divide-slate-100', 'divide-border')
    content = content.replace('hover:bg-slate-50', 'hover:bg-muted')
    content = content.replace('hover:bg-slate-100', 'hover:bg-muted')
    content = content.replace('hover:text-slate-600', 'hover:text-foreground')

    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

count = 0
for filepath in sorted(glob.glob(os.path.join(RMS_DIR, '*.tsx'))):
    fname = os.path.basename(filepath)
    if replace_in_file(filepath):
        print(f'  Updated: {fname}')
        count += 1
    else:
        print(f'  No changes: {fname}')

print(f'\nTotal files updated: {count}')
