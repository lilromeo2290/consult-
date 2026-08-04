#!/usr/bin/env python3
"""Generate Python heredoc deploy command for rent.tsx + import-export.ts."""
import base64
import os

files = [
    ("/home/z/my-project/src/components/rms/rent.tsx", "/home/consult-rms-new/src/components/rms/rent.tsx"),
    ("/home/z/my-project/src/lib/import-export.ts", "/home/consult-rms-new/src/lib/import-export.ts"),
]

lines = ["python3 << 'PYEOF'", "import base64"]

for src, dst in files:
    with open(src, "rb") as f:
        raw = f.read()
    b64 = base64.b64encode(raw).decode("ascii")
    varname = os.path.basename(src).replace(".", "_").replace("-", "_")
    lines.append(f"{varname} = '{b64}'")
    lines.append(f"with open('{dst}', 'wb') as f:")
    lines.append(f"    f.write(base64.b64decode({varname}))")
    lines.append(f"print('Written {len(raw)} bytes -> {os.path.relpath(dst, '/home/consult-rms-new')}')")

lines.append("PYEOF")
lines.append("")
lines.append("cd /home/consult-rms-new && npm run build 2>&1 | tail -10")
lines.append("pm2 restart all")
lines.append("echo 'DONE'")

script = "\n".join(lines)
out_path = "/home/z/my-project/scripts/deploy_rent.sh"
with open(out_path, "w") as f:
    f.write(script)

print(f"Deploy script: {out_path}")
for src, dst in files:
    sz = os.path.getsize(src)
    print(f"  {os.path.basename(src)}: {sz} bytes")
print(f"Script total: {len(script)} chars")
