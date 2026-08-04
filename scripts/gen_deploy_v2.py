#!/usr/bin/env python3
"""Generate a single Python heredoc deploy command for rate-config.tsx."""
import base64

FILE_PATH = "/home/z/my-project/src/components/rms/rate-config.tsx"

with open(FILE_PATH, "rb") as f:
    raw = f.read()

b64 = base64.b64encode(raw).decode("ascii")

# Build a Python heredoc script - base64 chars are safe in bash heredoc with single-quoted delimiter
lines = [
    "python3 << 'PYEOF'",
    "import base64",
    f"data = '{b64}'",
    "with open('/home/consult-rms-new/src/components/rms/rate-config.tsx', 'wb') as f:",
    "    f.write(base64.b64decode(data))",
    "print('Written', len(base64.b64decode(data)), 'bytes')",
    "PYEOF",
    "",
    "cd /home/consult-rms-new && npm run build 2>&1 | tail -10",
    "pm2 restart all",
    "echo 'DONE'",
]

script = "\n".join(lines)
out_path = "/home/z/my-project/scripts/deploy_v2.sh"
with open(out_path, "w") as f:
    f.write(script)

print(f"Deploy script: {out_path}")
print(f"File size: {len(raw)} bytes")
print(f"Script size: {len(script)} chars")
print(f"Lines: {len(lines)}")
