FILE = '/home/z/my-project/src/components/rms/businesses.tsx'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the escaped dollar sign - \${ should be just ${
old = r'cert=\${viewingCert.certNumber}'
new = 'cert=${viewingCert.certNumber}'
assert old in content, 'Could not find escaped dollar sign'
content = content.replace(old, new)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print('OK: Fixed dollar sign escaping in barcode code')