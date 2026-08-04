#!/usr/bin/env python3
"""Generate a VPS deploy script for rate-config.tsx using small base64 chunks."""
import base64

FILE_PATH = "/home/z/my-project/src/components/rms/rate-config.tsx"
VPS_PATH = "/home/consult-rms-new/src/components/rms/rate-config.tsx"

with open(FILE_PATH, "rb") as f:
    raw = f.read()

b64 = base64.b64encode(raw).decode("ascii")

# Split into chunks of 500 chars (very safe for terminal)
CHUNK = 500
chunks = [b64[i:i+CHUNK] for i in range(0, len(b64), CHUNK)]

lines = ["#!/bin/bash", "set -e", "", f"# Deploy rate-config.tsx ({len(raw)} bytes, {len(chunks)} chunks)"]
lines.append("")
lines.append("rm -f /tmp/rc.b64")
for i, c in enumerate(chunks):
    lines.append(f"echo '{c}' >> /tmp/rc.b64")
lines.append("")
lines.append(f"base64 -d /tmp/rc.b64 > {VPS_PATH}")
lines.append(f"echo 'File written: {VPS_PATH}'")
lines.append(f"wc -c {VPS_PATH}")
lines.append("")
lines.append("cd /home/consult-rms-new && npm run build 2>&1 | tail -20")
lines.append("")
lines.append("# Restart PM2")
lines.append("pm2 restart all 2>&1 || true")
lines.append("echo 'DONE'")

script = "\n".join(lines)
out_path = "/home/z/my-project/scripts/deploy_rate_config.sh"
with open(out_path, "w") as f:
    f.write(script)

print(f"Deploy script generated: {out_path}")
print(f"File size: {len(raw)} bytes")
print(f"B64 size: {len(b64)} chars")
print(f"Chunks: {len(chunks)} (each {CHUNK} chars)")
print(f"Script size: {len(script)} bytes")
