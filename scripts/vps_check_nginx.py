#!/usr/bin/env python3
"""Check all nginx configs and find missing site configs."""
import sys
sys.path.insert(0, '/home/z/.local/lib/python3.13/site-packages')
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('153.75.247.4', port=22, username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=15)

def vps_run(cmd):
    i,o,e = c.exec_command(cmd, timeout=15)
    return o.read().decode().strip(), e.read().decode().strip()

print('=== consult-rms.conf ===')
out, _ = vps_run('cat /etc/nginx/conf.d/consult-rms.conf')
print(out)

print('\n=== Check sites-available ===')
out, _ = vps_run('ls -la /etc/nginx/sites-available/ 2>&1; echo "---"; ls -la /etc/nginx/sites-enabled/ 2>&1')
print(out)

print('\n=== Check main nginx.conf includes ===')
out, _ = vps_run('cat /etc/nginx/nginx.conf')
print(out)

print('\n=== Check certbot configs ===')
out, _ = vps_run('ls -la /etc/letsencrypt/live/ 2>&1')
print(out)

print('\n=== Check if there are backup configs ===')
out, _ = vps_run('find /etc/nginx -name "*.conf" -o -name "*.conf.bak" 2>/dev/null')
print(out)

c.close()
