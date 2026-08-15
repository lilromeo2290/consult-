#!/usr/bin/env python3
"""Quick verification after deploy."""
import sys, time
sys.path.insert(0, '/home/z/.local/lib/python3.13/site-packages')
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('153.75.247.4', port=22, username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=15)

def vps_run(cmd):
    i,o,e = c.exec_command(cmd, timeout=15)
    return o.read().decode().strip(), e.read().decode().strip()

print('Waiting 3s for app startup...')
time.sleep(3)

print('=== API Test ===')
out, err = vps_run('curl -s http://127.0.0.1:3001/api/rms-data?key=rms-businesses | head -c 300')
print(f'API: {out[:300]}')

print('\n=== PM2 Status ===')
out, err = vps_run('pm2 jlist | python3 -c "import sys,json; apps=json.load(sys.stdin); [print(f\"  {a[\"name\"]}: status={a[\"pm2_env\"].get(\"status\")}, restarts={a[\"pm2_env\"].get(\"restart_time\",0)}\") for a in apps if a[\"name\"]==\"consult-rms\"]"')
print(out)

print('\n=== Error Logs (last 5) ===')
out, err = vps_run('pm2 logs consult-rms --nostream --err --lines 5')
print(out[-500:] if out else 'No errors')

c.close()
print('\nVerification complete.')
