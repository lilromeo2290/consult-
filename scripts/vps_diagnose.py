#!/usr/bin/env python3
"""Diagnose VPS database and API issues."""
import sys
sys.path.insert(0, '/home/z/.local/lib/python3.13/site-packages')
import paramiko

VPS_HOST = '153.75.247.4'
VPS_USER = 'root'
VPS_PASS = 'Do1_BuZe4_M1-V6v1_S4'
VPS_APP_DIR = '/home/consult-rms'

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_HOST, port=22, username=VPS_USER, password=VPS_PASS, timeout=15)

def vps_run(cmd, t=30):
    print(f'>> {cmd}')
    i,o,e = c.exec_command(cmd, timeout=t)
    out = o.read().decode()
    err = e.read().decode()
    if out: print(out)
    if err: print(f'STDERR: {err}')
    return out, err

print('=== CHECK 1: PM2 Status ===')
vps_run('pm2 list')

print('\n=== CHECK 2: Database file exists? ===')
vps_run(f'ls -la {VPS_APP_DIR}/data/')

print('\n=== CHECK 3: Database tables and data ===')
vps_run(f'cd {VPS_APP_DIR} && sqlite3 data/rms.db ".tables"')
vps_run(f'cd {VPS_APP_DIR} && sqlite3 data/rms.db "SELECT key, length(data) as data_size FROM RmsData;"')

print('\n=== CHECK 4: Test API endpoint ===')
vps_run(f'curl -s http://127.0.0.1:3001/api/rms-data?key=rms-businesses')

print('\n=== CHECK 5: PM2 Error Logs (last 50 lines) ===')
vps_run('pm2 logs consult-rms --nostream --err --lines 50')

print('\n=== CHECK 6: PM2 Out Logs (last 30 lines) ===')
vps_run('pm2 logs consult-rms --nostream --out --lines 30')

c.close()
print('\nDone.')
