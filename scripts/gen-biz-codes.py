import sys

csv_data = []
csv_raw = sys.stdin.read().strip()
for line in csv_raw.split('\n')[1:]:
    code, desc = line.split(',', 1)
    c = code.strip()
    d = desc.strip().replace("'", "''")
    csv_data.append(f"  {{ code: '{c}', description: '{d}' }}")

header = '// Revenue Codes and Descriptions for Business Information\n// Source: Official assembly revenue code list\n\nexport const BUSINESS_REVENUE_CODES: { code: string; description: string }[] = ['
footer = '];\n\nexport const BIZ_CODE_TO_DESC: Record<string, string> = Object.fromEntries(\n  BUSINESS_REVENUE_CODES.map((item) => [item.code, item.description])\n);\n\nexport const BIZ_DESC_TO_CODE: Record<string, string> = Object.fromEntries(\n  BUSINESS_REVENUE_CODES.map((item) => [item.description, item.code])\n);\n'

with open('/home/z/my-project/src/lib/business-revenue-codes.ts', 'w') as f:
    f.write(header + ',\n'.join(csv_data) + footer)

print(f'Written {len(csv_data)} entries')