#!/usr/bin/env python3
import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4')

# Trigger the auto-sync by calling the API
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:3008/api/rms-data?key=rms-building-permits')
raw = stdout.read().decode().strip()
if raw:
    resp = json.loads(raw)
    data = resp.get('data', [])
    print(f'Building Permits ({len(data)} records):')
    for p in data:
        print(f"  {p.get('permitNumber')} | {p.get('permitStatus')} | {p.get('applicantFullName')}")

# Check PM2 logs for sync message
print()
stdin, stdout, stderr = ssh.exec_command('pm2 logs kpma-rms --lines 10 --nostream')
print(stdout.read().decode()[-500:])

ssh.close()
