import re

with open('/home/z/my-project/upload/Pasted Content_1787505576307.txt', 'r') as f:
    lines = f.readlines()

entries = []
for line in lines[1:]:
    parts = line.strip().split()
    if not parts:
        continue
    code = parts[0]
    cat_idx = None
    for i, p in enumerate(parts):
        if p.startswith('CAT'):
            cat_idx = i
            break
    if cat_idx is None:
        continue
    class_name = ' '.join(parts[1:cat_idx])
    category = ' '.join(parts[cat_idx:])
    entries.append((code, class_name, category))

print(f'Total entries: {len(entries)}')

with open('/home/z/my-project/src/lib/business-code-to-category.ts', 'w') as f:
    f.write('// Auto-generated from user data. Code -> Category mapping.\n\n')
    f.write('export const CODE_TO_CATEGORY: Record<string, string> = {\n')
    for code, cls, cat in entries:
        cat_escaped = cat.replace("'", "\\'")
        f.write(f"  '{code}': '{cat_escaped}',\n")
    f.write('};\n')

print('Done.')
