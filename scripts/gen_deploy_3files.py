#!/usr/bin/env python3
"""Generate a combined Python heredoc deploy command for 3 files."""
import base64
import os

BASE = '/home/z/my-project/src'
VPS_BASE = '/home/consult-rms-new/src'

files = [
    ('lib/rate-overrides.ts', f'{BASE}/lib/rate-overrides.ts'),
    ('components/rms/rate-config.tsx', f'{BASE}/components/rms/rate-config.tsx'),
    ('components/rms/businesses.tsx', f'{BASE}/components/rms/businesses.tsx'),
]

# Build a single Python script that writes all 3 files
py_lines = ['import base64', '']
for rel, local_path in files:
    with open(local_path, 'rb') as f:
        raw = f.read()
    b64 = base64.b64encode(raw).decode('ascii')
    vps_path = f"{VPS_BASE}/{rel}"
    py_lines.append(f"# {rel}")
    py_lines.append(f"_d{rel.replace('/', '_').replace('.', '_')} = '{b64}'")
    py_lines.append(f"with open('{vps_path}', 'wb') as f:")
    py_lines.append(f"    f.write(base64.b64decode(_d{rel.replace('/', '_').replace('.', '_')}))")
    py_lines.append(f"print('Written {len(raw)} bytes -> {rel}')")
    py_lines.append('')

py_script = '\n'.join(py_lines)

# Wrap in bash heredoc
bash_lines = [
    "python3 << 'PYEOF'",
    py_script,
    "PYEOF",
    "",
    "cd /home/consult-rms-new && npm run build 2>&1 | tail -15",
    "pm2 restart all",
    "echo 'DONE'",
]

script = '\n'.join(bash_lines)
out_path = '/home/z/my-project/scripts/deploy_3files.sh'
with open(out_path, 'w') as f:
    f.write(script)

total_bytes = sum(os.path.getsize(lp) for _, lp in files)
print(f'Combined deploy script: {out_path}')
print(f'Total source bytes: {total_bytes}')
print(f'Script size: {len(script)} chars')
print(f'Files: {len(files)}')
for rel, lp in files:
    print(f'  - {rel}: {os.path.getsize(lp)} bytes')
