#!/usr/bin/env python3
"""Bulk color replacement for KPMA RMS UI redesign.
Replaces old hardcoded colors with new design system tokens."""

import re, os, glob

RMS_DIR = '/home/z/my-project/src/components/rms'

def replace_in_file(filepath: str):
    with open(filepath, 'r') as f:
        content = f.read()

    original = content

    # ─── Primary color: #0B1D3E → semantic primary ───
    # bg-[#0B1D3E]
    content = content.replace("bg-[#0B1D3E]", "bg-primary")
    # hover:bg-[#0B1D3E]
    content = content.replace("hover:bg-[#0B1D3E]", "hover:bg-primary")
    # text-[#0B1D3E]
    content = content.replace("text-[#0B1D3E]", "text-primary")
    # hover:text-[#0B1D3E]
    content = content.replace("hover:text-[#0B1D3E]", "hover:text-primary")
    # focus:ring-[#0B1D3E]
    content = content.replace("focus:ring-[#0B1D3E]", "focus:ring-primary")
    # border-[#0B1D3E]
    content = content.replace("border-[#0B1D3E]", "border-primary")
    # ring-[#0B1D3E]
    content = content.replace("ring-[#0B1D3E]", "ring-primary")
    # from-[#0B1D3E]
    content = content.replace("from-[#0B1D3E]", "from-primary")
    # divide-[#0B1D3E]
    content = content.replace("divide-[#0B1D3E]", "divide-primary")
    # placeholder for inline style with #0B1D3E
    content = content.replace("color: #0B1D3E", "color: var(--primary)")

    # ─── Red accent: #E31E24 → destructive ───
    content = content.replace("bg-[#E31E24]", "bg-destructive")
    content = content.replace("text-[#E31E24]", "text-destructive")
    content = content.replace("hover:bg-[#E31E24]", "hover:bg-destructive")
    content = content.replace("to-[#E31E24]", "to-destructive")

    # ─── Dark mode navy variant: #4a7ab5 → use info token ───
    # This was used as dark mode equivalent of #0B1D3E
    # In dark mode, our primary already adapts, so replace with primary
    content = content.replace("text-[#4a7ab5]", "dark:text-primary")
    content = content.replace("bg-[#4a7ab5]", "dark:bg-primary")
    content = content.replace("text-[#4a7ab5]/20", "dark:text-primary/20")
    content = content.replace("bg-[#4a7ab5]/20", "dark:bg-primary/20")

    # ─── Replace bg-muted/30 with actual background ───
    content = content.replace("bg-muted/30", "bg-background")

    # ─── Replace common slate patterns with semantic tokens ───
    # Borders
    content = content.replace("border-slate-200 dark:border-slate-700", "border-border")
    content = content.replace("border-slate-200", "border-border")
    content = content.replace("dark:border-slate-700", "dark:border-border")
    content = content.replace("border-slate-300 dark:border-slate-600", "border-border")
    content = content.replace("border-slate-300", "border-border")
    content = content.replace("dark:border-slate-600", "dark:border-border")
    content = content.replace("border-slate-100 dark:border-slate-700", "border-border")
    content = content.replace("border-slate-100", "border-border")

    # Backgrounds
    content = content.replace("bg-slate-50 dark:bg-slate-900", "bg-card")
    content = content.replace("bg-slate-50", "bg-card")
    content = content.replace("dark:bg-slate-900", "dark:bg-card")
    content = content.replace("bg-white dark:bg-slate-900", "bg-card")
    content = content.replace("bg-white dark:bg-slate-950", "bg-card")

    # Muted backgrounds
    content = content.replace("bg-slate-100 dark:bg-slate-800", "bg-muted")
    content = content.replace("bg-slate-100", "bg-muted")
    content = content.replace("dark:bg-slate-800", "dark:bg-muted")
    content = content.replace("bg-slate-200/50 dark:bg-slate-800/50", "bg-muted")

    # Table header backgrounds
    content = content.replace("bg-slate-50 dark:bg-slate-800/60", "bg-muted")
    content = content.replace("bg-slate-50/50 dark:bg-slate-800/50", "bg-muted")

    # Text colors
    content = content.replace("text-slate-900 dark:text-white", "text-foreground")
    content = content.replace("text-slate-900", "text-foreground")
    content = content.replace("dark:text-white", "dark:text-foreground")
    content = content.replace("text-slate-800 dark:text-slate-200", "text-foreground")
    content = content.replace("text-slate-800", "text-foreground")
    content = content.replace("dark:text-slate-200", "dark:text-foreground")
    content = content.replace("text-slate-700 dark:text-slate-300", "text-foreground")
    content = content.replace("text-slate-700", "text-foreground")
    content = content.replace("dark:text-slate-300", "dark:text-foreground")

    # Muted text
    content = content.replace("text-slate-500 dark:text-slate-400", "text-muted-foreground")
    content = content.replace("text-slate-500", "text-muted-foreground")
    content = content.replace("dark:text-slate-400", "dark:text-muted-foreground")
    content = content.replace("text-slate-400 dark:text-slate-500", "text-muted-foreground")
    content = content.replace("text-slate-400", "text-muted-foreground")

    # Hover states
    content = content.replace("hover:bg-slate-50 dark:hover:bg-slate-800", "hover:bg-muted")
    content = content.replace("hover:bg-slate-50", "hover:bg-muted")
    content = content.replace("dark:hover:bg-slate-800", "dark:hover:bg-muted")
    content = content.replace("hover:bg-slate-100 dark:hover:bg-slate-700", "hover:bg-muted")
    content = content.replace("hover:bg-slate-100", "hover:bg-muted")
    content = content.replace("hover:bg-slate-50 dark:hover:bg-slate-800/40", "hover:bg-muted")
    content = content.replace("hover:bg-slate-800/40", "dark:hover:bg-muted")
    content = content.replace("hover:text-slate-600 dark:hover:text-slate-200", "hover:text-foreground")
    content = content.replace("hover:text-slate-600", "hover:text-foreground")

    # Row dividers
    content = content.replace("divide-slate-100 dark:divide-slate-700", "divide-border")
    content = content.replace("divide-slate-100", "divide-border")
    content = content.replace("dark:divide-slate-700", "dark:divide-border")
    content = content.replace("divide-y divide-slate-100 dark:divide-slate-700", "divide-y divide-border")

    # Badge/button color patterns → semantic
    content = content.replace("bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400", "bg-[var(--accent-amber-light)] text-[var(--warning)]")
    content = content.replace("bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400", "bg-[var(--accent-red-light)] text-destructive")
    content = content.replace("bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400", "bg-[var(--accent-green-light)] text-[var(--success)]")
    content = content.replace("bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400", "bg-[var(--accent-blue-light)] text-[var(--info)]")

    # Hover text colors for actions
    content = content.replace("hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20", "hover:text-destructive hover:bg-destructive/10")
    content = content.replace("hover:text-red-600", "hover:text-destructive")
    content = content.replace("hover:bg-red-50 dark:hover:bg-red-900/20", "hover:bg-destructive/10")

    # Focus ring patterns
    content = content.replace("focus:ring-[#0B1D3E]/10", "focus:ring-primary/10")
    content = content.replace("focus:ring-offset-[#0B1D3E]/5", "focus:ring-offset-primary/5")

    # Card border patterns
    content = content.replace("border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900", "border-border bg-card")
    content = content.replace("border-slate-200 dark:border-slate-700", "border-border")

    # KPI card background patterns (dashboard)
    content = content.replace("bg-[#0B1D3E]/10 dark:bg-[#4a7ab5]/20", "bg-[var(--accent-blue-light)]")
    content = content.replace("bg-amber-50 dark:bg-amber-900/30", "bg-[var(--accent-amber-light)]")
    content = content.replace("bg-red-50 dark:bg-red-900/30", "bg-[var(--accent-red-light)]")
    content = content.replace("bg-green-50 dark:bg-green-900/30", "bg-[var(--accent-green-light)]")
    content = content.replace("bg-blue-50 dark:bg-blue-900/30", "bg-[var(--accent-blue-light)]")

    # Inline color references in CSS/template strings
    content = content.replace("color: #E31E24", "color: var(--destructive)")
    content = content.replace("color: #172033", "color: var(--foreground)")
    content = content.replace("background: #0B1D3E", "background: var(--primary)")

    # Input field styling
    content = content.replace("border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800", "border-border bg-card")
    content = content.replace("bg-white dark:bg-slate-800", "bg-card")

    # Modal backdrop
    content = content.replace("bg-black/50 backdrop-blur-sm", "bg-black/40 backdrop-blur-sm")

    # ─── Replace common CSS class patterns for cards ───
    # rounded-xl border → rounded-xl border-border
    content = re.sub(r'rounded-xl border(?!-)', 'rounded-xl border-border', content)
    content = re.sub(r'rounded-2xl border(?!-)', 'rounded-2xl border-border', content)
    content = re.sub(r'rounded-lg border(?!-)', 'rounded-lg border-border', content)

    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

# Process all TSX files in the RMS directory
count = 0
for filepath in sorted(glob.glob(os.path.join(RMS_DIR, '*.tsx'))):
    fname = os.path.basename(filepath)
    if replace_in_file(filepath):
        print(f'  Updated: {fname}')
        count += 1
    else:
        print(f'  No changes: {fname}')

print(f'\nTotal files updated: {count}')
