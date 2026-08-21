import csv

with open('/home/z/my-project/upload/Pasted Content_1787341851542.txt', 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f, delimiter='\t')
    rows = []
    for row in reader:
        if len(row) >= 2:
            code = row[0].strip()
            desc = row[1].strip()
            if code and desc:
                rows.append((code, desc))

with open('/home/z/my-project/src/lib/revenue-code-map.ts', 'w', encoding='utf-8') as f:
    f.write("export const REVENUE_CODE_MAP: [string, string][] = [\n")
    for code, desc in rows:
        # Escape single quotes in description
        desc_escaped = desc.replace("'", "'")
        f.write(f"  ['{code}', '{desc_escaped}'],\n")
    f.write("];\n")

print(f"Generated {len(rows)} entries")
