#!/usr/bin/env python3
"""Parse the business revenue codes from the uploaded text file into a TypeScript data file."""

INPUT = '/home/z/my-project/upload/Pasted Content_1786052181955.txt'
OUTPUT = '/home/z/my-project/src/lib/business-revenue-codes.ts'

entries = []
with open(INPUT, 'r') as f:
    for line in f:
        line = line.rstrip()
        if not line:
            continue
        # Split by tab or multiple spaces
        parts = line.split('\t')
        if len(parts) == 2:
            code, desc = parts[0].strip(), parts[1].strip()
        else:
            # Try splitting by multiple spaces
            idx = line.find('  ')
            if idx > 0:
                code = line[:idx].strip()
                desc = line[idx:].strip()
            else:
                continue
        if code and desc:
            entries.append((code, desc))

with open(OUTPUT, 'w') as f:
    f.write('// Auto-generated from Business Revenue Codes list\n')
    f.write('export const BUSINESS_REVENUE_CODES: { code: string; description: string }[] = [\n')
    for code, desc in entries:
        # Escape single quotes in description
        safe_desc = desc.replace("'", "\\'")
        f.write(f"  {{ code: '{code}', description: '{safe_desc}' }},\n")
    f.write('];\n\n')
    # Build lookup maps
    f.write('export const BIZ_CODE_TO_DESC: Record<string, string> = Object.fromEntries(\n')
    f.write('  BUSINESS_REVENUE_CODES.map((item) => [item.code, item.description])\n')
    f.write(');\n\n')
    f.write('export const BIZ_DESC_TO_CODE: Record<string, string> = Object.fromEntries(\n')
    f.write('  BUSINESS_REVENUE_CODES.map((item) => [item.description, item.code])\n')
    f.write(');\n')

print(f'Generated {len(entries)} entries -> {OUTPUT}')
