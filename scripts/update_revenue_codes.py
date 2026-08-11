#!/usr/bin/env python3
"""Update business-revenue-codes.ts with correct 7-digit codes from the image."""

import json

# Load extracted data
with open('/home/z/my-project/upload/revenue_codes_extracted.json') as f:
    raw = json.load(f)

data = json.loads(raw['choices'][0]['message']['content'])

# Generate the TypeScript file
lines = [
    '// Revenue Codes and Descriptions for Business Information',
    '// Source: Official assembly revenue code list',
    '',
    'export const BUSINESS_REVENUE_CODES: { code: string; description: string }[] = [',
]

for item in data:
    code = item['code']
    desc = item['description']
    lines.append(f"  {{ code: '{code}', description: '{desc}' }},")

lines.append('];')
lines.append('')
lines.append('export const BIZ_CODE_TO_DESC: Record<string, string> = Object.fromEntries(')
lines.append('  BUSINESS_REVENUE_CODES.map((item) => [item.code, item.description])')
lines.append(');')
lines.append('')
lines.append('export const BIZ_DESC_TO_CODE: Record<string, string> = Object.fromEntries(')
lines.append('  BUSINESS_REVENUE_CODES.map((item) => [item.description, item.code])')
lines.append(');')
lines.append('')

content = '\n'.join(lines)

with open('/home/z/my-project/src/lib/business-revenue-codes.ts', 'w') as f:
    f.write(content)

print(f'Updated {len(data)} revenue codes')
