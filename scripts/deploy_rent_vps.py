#!/usr/bin/env python3
"""Generate a self-contained deployment script for rent.tsx.
Run locally: python3 scripts/deploy_rent_vps.py
Then copy the OUTPUT file to VPS and run it.
"""
import base64

src = '/home/z/my-project/src/components/rms/rent.tsx'
with open(src, 'rb') as f:
    b64data = base64.b64encode(f.read()).decode()

# Split into chunks of 8000 chars for safe pasting
chunk_size = 8000
chunks = [b64data[i:i+chunk_size] for i in range(0, len(b64data), chunk_size)]

lines = []
lines.append('#!/bin/bash')
lines.append('set -e')
lines.append('')
lines.append('B64_PARTS=()')

for idx, chunk in enumerate(chunks):
    lines.append(f'B64_PARTS[{idx}]="{chunk}"')

lines.append('')
lines.append('# Reassemble and decode')
lines.append('FULL_B64=""')
lines.append(f'for i in $(seq 0 {len(chunks)-1}); do')
lines.append('  FULL_B64="${FULL_B64}${B64_PARTS[$i]}"')
lines.append('done')
lines.append('')
lines.append('python3 -c "')
lines.append('import base64, sys')
lines.append('b = sys.argv[1]')
lines.append('import os')
lines.append('os.makedirs(\"src/components/rms\", exist_ok=True)')
lines.append('with open(\"src/components/rms/rent.tsx\", \"wb\") as f:')
lines.append('    f.write(base64.b64decode(b))')
lines.append('print(\"OK: rent.tsx written (\", len(base64.b64decode(b)), \" bytes)\")')
lines.append(f'" "$FULL_B64"')

output = '\n'.join(lines)
outpath = '/home/z/my-project/scripts/deploy_rent.sh'
with open(outpath, 'w') as f:
    f.write(output)

print(f'Generated: {outpath}')
print(f'Size: {len(output)} bytes, {len(chunks)} chunks')
print(f'Original file: {len(b64data)} base64 chars')
