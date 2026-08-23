#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4')

# Clear old logs
print('Clearing old logs...')
ssh.exec_command('pm2 flush kpma-rms')

# Verify data is correct
import json
stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:3008/api/rms-data?key=rms-building-permits")
raw = stdout.read().decode().strip()
if raw:
    resp = json.loads(raw)
    data = resp.get('data', [])
    print(f'Building Permits ({len(data)} records):')
    for p in data:
        print(f"  {p.get('permitNumber')} | {p.get('permitStatus')} | {p.get('applicantFullName')}")

ssh.close()
print('Done.')
