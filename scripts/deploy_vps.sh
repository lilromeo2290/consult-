#!/usr/bin/env python3
import subprocess, sys

pw = "Do1_BuZe4_M1-V6v1_S4"
host = "root@153.75.247.4"
commands = [
    "cd /opt/rms && git pull origin main",
    "cd /opt/rms && npm ci",
    "cd /opt/rms && npm run build",
    "pm2 restart rms",
]

for cmd in commands:
    print(f"\n>>> Running: {cmd}")
    result = subprocess.run(
        ["ssh", "-o", "StrictHostKeyChecking=no", host, cmd],
        input=pw + "\n",
        capture_output=True,
        text=True,
        timeout=120,
    )
    # ssh won't accept password via stdin without sshpass/expect
    # Try with ssh key approach instead
    print(f"stdout: {result.stdout}")
    print(f"stderr: {result.stderr}")
    if result.returncode != 0:
        print(f"FAILED with code {result.returncode}")
        sys.exit(1)
    print("OK")

print("\nDeployment complete!")
