#!/usr/bin/env python3
import sys, time
sys.path.insert(0, '/home/z/.local/lib/python3.13/site-packages')
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('153.75.247.4', port=22, username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=15)

def vps_run(cmd, t=60):
    i,o,e = c.exec_command(cmd, timeout=t)
    out = o.read().decode().strip()
    err = e.read().decode().strip()
    if out: print(f'  {out[-800:]}')
    if err: print(f'  ERR: {err[-300:]}')
    return out, err

print('=== Installing php-fpm ===')
vps_run('yum install -y php-fpm php-mysqlnd 2>&1 | tail -10', 120)

print('\n=== Starting php-fpm ===')
vps_run('systemctl enable --now php-fpm 2>&1')
time.sleep(2)
out, _ = vps_run('systemctl is-active php-fpm')
print(f'PHP-FPM status: {out}')

out, _ = vps_run('ss -tlnp | grep 9000')
print(f'Port 9000: {out}')

print('\n=== Verify ===')
for domain in ['24hournewsonline.com']:
    out, _ = vps_run(f'curl -s -o /dev/null -w "%{{http_code}}" http://127.0.0.1:80 -H "Host: {domain}" --max-time 5')
    print(f'  {domain}: HTTP {out}')

c.close()
print('Done.')
