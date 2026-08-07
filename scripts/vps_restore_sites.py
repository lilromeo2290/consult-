#!/usr/bin/env python3
import sys
sys.path.insert(0, '/home/z/.local/lib/python3.13/site-packages')
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('153.75.247.4', port=22, username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=15)

def vps_run(cmd, t=10):
    i,o,e = c.exec_command(cmd, timeout=t)
    return o.read().decode().strip(), e.read().decode().strip()

# Check 24hournews
print('=== 24hournews ===')
out, _ = vps_run('find /home -maxdepth 3 -name "*24hour*" -o -name "*24Hour*" 2>/dev/null')
print(out)

# Check pyc-club cwd and port
print('\n=== pyc-club details ===')
out, _ = vps_run('ls /root/dwellchronicles/ 2>/dev/null | head -5')
print(f'dwellchronicles dir: {out}')
out, _ = vps_run('ls /home/pycclub/ 2>/dev/null | head -10')
print(f'pycclub dir: {out}')

# Check what port pyc-club listens on
out, _ = vps_run('pm2 prettylist 2>/dev/null | grep -B5 -A20 "pyc-club" | grep -E "cwd|PORT|port"')
print(f'pyc-club port: {out}')

# Check 3005 process details
print('\n=== Port 3005 (clipeconsult) ===')
out, _ = vps_run('ls /home/clipeconsult/public_html/.next/standalone/server.js 2>/dev/null && echo EXISTS || echo NO')
print(f'server.js: {out}')

# Check all nginx-related SSL domains
print('\n=== All SSL domains ===')
out, _ = vps_run('ls /etc/letsencrypt/live/')
print(out)

c.close()