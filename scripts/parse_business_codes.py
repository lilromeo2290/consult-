import json
import re

# Read the TSV file
with open('/home/z/my-project/upload/Pasted Content_1787744027803.txt', 'r') as f:
    content = f.read()

lines = content.strip().split('\n')

# Parse - some categories span multiple lines (quoted)
rows = []
header = lines[0]
i = 1
while i < len(lines):
    line = lines[i]
    # If line starts with a code (number), it's a new row
    if re.match(r'^\d', line.strip()):
        parts = line.split('\t')
        if len(parts) >= 4:
            code = parts[0].strip()
            desc = parts[1].strip()
            biz_class = parts[2].strip()
            category = parts[3].strip().strip('"')
            rows.append({'code': code, 'revenueDescription': desc, 'businessClass': biz_class, 'category': category})
    elif rows and not re.match(r'^\d', line.strip()) and line.strip():
        # Continuation of previous row's category
        rows[-1]['category'] += ' ' + line.strip().strip('"')
    i += 1

# Build mappings
# 1. code -> revenue description (1:1)
code_to_desc = {}
for r in rows:
    code_to_desc[r['code']] = r['revenueDescription']

# 2. code -> list of unique business classes
code_to_classes = {}
for r in rows:
    code = r['code']
    if code not in code_to_classes:
        code_to_classes[code] = []
    if r['businessClass'] not in code_to_classes[code]:
        code_to_classes[code].append(r['businessClass'])

# 3. (code, businessClass) -> list of categories
class_to_categories = {}
for r in rows:
    key = f"{r['code']}|{r['businessClass']}"
    if key not in class_to_categories:
        class_to_categories[key] = []
    if r['category'] not in class_to_categories[key]:
        class_to_categories[key].append(r['category'])

# 4. Unique list of codes for dropdown
codes = sorted(set(r['code'] for r in rows), key=lambda x: int(x))

print(f'Total rows: {len(rows)}')
print(f'Unique codes: {len(codes)}')
print(f'Unique code->class mappings: {len(code_to_classes)}')
print(f'Unique (code,class)->category mappings: {len(class_to_categories)}')

# Write as TypeScript
with open('/home/z/my-project/src/lib/business-code-class-category-map.ts', 'w') as f:
    f.write('// Auto-generated from business code data\n\n')
    
    f.write('export interface BizCodeEntry {\n')
    f.write('  code: string;\n')
    f.write('  revenueDescription: string;\n')
    f.write('  businessClass: string;\n')
    f.write('  category: string;\n')
    f.write('}\n\n')
    
    # All entries
    f.write(f'export const BIZ_CODE_ENTRIES: BizCodeEntry[] = {json.dumps(rows, indent=2)};\n\n')
    
    # Code -> revenue description
    f.write(f'export const BIZ_CODE_TO_REVENUE_DESC: Record<string, string> = {json.dumps(code_to_desc, indent=2)};\n\n')
    
    # Code -> list of business classes
    f.write(f'export const BIZ_CODE_TO_CLASSES: Record<string, string[]> = {json.dumps(code_to_classes, indent=2)};\n\n')
    
    # (code, class) -> list of categories
    f.write(f'export const BIZ_CODE_CLASS_TO_CATEGORIES: Record<string, string[]> = {json.dumps(class_to_categories, indent=2)};\n\n')
    
    # Sorted unique codes for dropdown
    f.write(f'export const BIZ_CODE_OPTIONS = {json.dumps(codes)};\n\n')

print('Written to src/lib/business-code-class-category-map.ts')