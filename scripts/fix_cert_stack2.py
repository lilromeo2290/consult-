FILE = '/home/z/my-project/src/components/rms/businesses.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# The print HTML is inside a JS template literal (backtick string).
# In the file, ${dynAssemblyName.toUpperCase()} is literal text.
# We need to replace it with a version that stacks the words.

# 1. Stack assembly name in the header (print view)
old_header_asm = '${dynAssemblyName.toUpperCase()}'
new_header_asm = '${dynAssemblyName.toUpperCase().split(" ").join("<br/>")}'

# There are TWO occurrences of this in the print view:
# a) <div class="assembly-name">${dynAssemblyName.toUpperCase()}</div>
# b) <span class="bold-asm">${dynAssemblyName.toUpperCase()}</span>
# We need to replace them differently.

# Replace the header one (assembly-name div)
old_header = '<div class="assembly-name">${dynAssemblyName.toUpperCase()}</div>'
new_header = '<div class="assembly-name">${dynAssemblyName.toUpperCase().split(" ").join("<br/>")}</div>'
assert old_header in content, 'Could not find print header assembly name'
content = content.replace(old_header, new_header)

# Replace the legal text one (bold-asm span)
old_legal = '<span class="bold-asm">${dynAssemblyName.toUpperCase()}</span>'
new_legal = '<span class="bold-asm">${dynAssemblyName.toUpperCase().split(" ").join("<br/>")}</span>'
assert old_legal in content, 'Could not find print legal assembly name'
content = content.replace(old_legal, new_legal)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print('OK: Stacked assembly name in print view (header + legal text)')
