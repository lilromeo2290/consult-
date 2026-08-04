#!/usr/bin/env python3
"""Deploy rate-config.tsx and rate-overrides.ts to VPS via base64 heredoc.
Usage: python3 scripts/deploy_rate_config.py > deploy.sh  # then paste into VPS
"""

import base64

FILES = {
    "src/components/rms/rate-config.tsx": None,
    "src/lib/rate-overrides.ts": None,
}

for path in FILES:
    with open(f"/home/z/my-project/{path}", "rb") as f:
        FILES[path] = base64.b64encode(f.read()).decode()

print("cd /home/consult-rms-new && python3 << 'PYEOF'")
print("import base64, os")
print("")

for path, b64 in FILES.items():
    print(f"# --- {path} ---")
    print(f"os.makedirs(os.path.dirname('{path}'), exist_ok=True)")
    print(f"with open('{path}', 'wb') as f:")
    print(f"    f.write(base64.b64decode('{b64}'))")
    print(f"print('OK: {path}')")
    print("")

print("PYEOF")
print("")
print("cd /home/consult-rms-new && npm run build 2>&1 | tail -5")
print("pm2 restart rms-app")
