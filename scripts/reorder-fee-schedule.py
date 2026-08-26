import json, re

# Read the ordered class names from the uploaded file
ordered_classes = []
with open('/home/z/my-project/upload/Pasted Content_1785374753306.txt', 'r') as f:
    for line in f:
        line = line.strip()
        if not line or line.lower().startswith('class'):
            continue
        if line not in ordered_classes:
            ordered_classes.append(line)

print(f'Ordered classes: {len(ordered_classes)}')

# Read the existing fee schedule JSON
with open('/home/z/my-project/src/lib/fee-schedule-data.json', 'r') as f:
    fee_data = json.load(f)

print(f'Fee data classes: {len(fee_data)}')

# Build a lookup by class name (with fuzzy matching)
fee_lookup = {}
for fd in fee_data:
    key = fd['class'].strip()
    fee_lookup[key] = fd

# Reorder the fee data according to the uploaded file's order
reordered = []
matched_classes = set()
unmatched_ordered = []

for cls in ordered_classes:
    if cls in fee_lookup:
        reordered.append(fee_lookup[cls])
        matched_classes.add(cls)
    else:
        # Try fuzzy match: normalize spaces and special chars
        cls_norm = re.sub(r'\s{2,}', ' ', cls.strip())
        found = False
        for key, val in fee_lookup.items():
            key_norm = re.sub(r'\s{2,}', ' ', key.strip())
            if cls_norm == key_norm or cls_norm.lower() == key_norm.lower():
                reordered.append(val)
                matched_classes.add(key)
                found = True
                break
        if not found:
            # Try partial match
            for key, val in fee_lookup.items():
                if cls_norm.lower() in key.lower() or key.lower() in cls_norm.lower():
                    reordered.append(val)
                    matched_classes.add(key)
                    found = True
                    break
        if not found:
            unmatched_ordered.append(cls)

# Append any remaining fee data classes not in the ordered list
remaining = []
for fd in fee_data:
    if fd['class'] not in matched_classes:
        remaining.append(fd)

print(f'Matched: {len(reordered)}')
print(f'Unmatched in ordered list: {len(unmatched_ordered)}')
print(f'Remaining not in ordered list: {len(remaining)}')

if unmatched_ordered:
    print(f'\n=== UNMATCHED CLASSES ===')
    for u in unmatched_ordered:
        print(f'  {u}')

# Combine: ordered + remaining
final = reordered + remaining

print(f'\nFinal total: {len(final)}')

# Save reordered JSON
with open('/home/z/my-project/src/lib/fee-schedule-data.json', 'w') as f:
    json.dump(final, f, indent=2)

# Generate TypeScript file
with open('/home/z/my-project/src/lib/fee-schedule.ts', 'w') as f:
    f.write('// Auto-generated from fee schedule data. Do not edit manually.\n\n')
    f.write('export interface FeeCategory {\n')
    f.write('  name: string;\n')
    f.write('  amount: number;\n')
    f.write('  ceiling: number | null;\n')
    f.write('  unit: string;\n')
    f.write('}\n\n')
    f.write('export interface FeeClass {\n')
    f.write('  class: string;\n')
    f.write('  categories: FeeCategory[];\n')
    f.write('}\n\n')
    f.write('export const FEE_SCHEDULE: FeeClass[] = ')
    f.write(json.dumps(final, indent=2))
    f.write(' as const;\n\n')
    
    # Generate lookup maps
    f.write('export const BUSINESS_CLASSES = FEE_SCHEDULE.map(f => f.class);\n\n')
    f.write('export const BUSINESS_CLASS_CATEGORIES: Record<string, FeeCategory[]> = {};\n')
    f.write('for (const fc of FEE_SCHEDULE) {\n')
    f.write('  BUSINESS_CLASS_CATEGORIES[fc.class] = fc.categories;\n')
    f.write('}\n\n')
    
    # Flat lookup
    f.write('export interface FlatRateEntry {\n')
    f.write('  class: string;\n')
    f.write('  category: string;\n')
    f.write('  amount: number;\n')
    f.write('  ceiling: number | null;\n')
    f.write('  unit: string;\n')
    f.write('}\n\n')
    f.write('export const FLAT_RATES: FlatRateEntry[] = FEE_SCHEDULE.flatMap(fc =>\n')
    f.write('  fc.categories.map(c => ({\n')
    f.write('    class: fc.class,\n')
    f.write('    category: c.name,\n')
    f.write('    amount: c.amount,\n')
    f.write('    ceiling: c.ceiling,\n')
    f.write('    unit: c.unit,\n')
    f.write('  }))\n')
    f.write(');\n')

print('Saved reordered fee-schedule.ts and fee-schedule-data.json')
