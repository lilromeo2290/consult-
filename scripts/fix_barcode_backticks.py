FILE = '/home/z/my-project/src/components/rms/businesses.tsx'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the escaped backticks in the barcode ref callback
old = r"\`\${" 
new = "`${" 
assert old in content, f'Could not find escaped backticks'
content = content.replace(old, new)

old2 = r"}\`"
new2 = "}`"  
assert old2 in content, f'Could not find closing escaped backticks'
content = content.replace(old2, new2)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print('OK: Fixed backtick escaping in barcode code')
