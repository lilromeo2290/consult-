#!/usr/bin/env python3
import sys, time
sys.path.insert(0, '/home/z/.local/lib/python3.13/site-packages')
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('153.75.247.4', port=22, username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=15)

def vps_run(cmd, t=15):
    i,o,e = c.exec_command(cmd, timeout=t)
    out = o.read().decode().strip()
    err = e.read().decode().strip()
    if out: print(f'  {out[-500:]}')
    if err: print(f'  ERR: {err[-300:]}')
    return out, err

# 1. Fix rasmutafoundation.org (502 = port 3000 dead)
print('=== Checking port 3000 ===')
out, _ = vps_run('ss -tlnp sport = :3000')
print(f'Port 3000: {out if out else "NOT LISTENING"}')

if not out or '3000' not in out:
    print('Restarting rasmutafoundation...')
    # Check if bun is available
    out, _ = vps_run('which bun 2>/dev/null')
    bun_path = out if out else '/root/.bun/bin/bun'
    vps_run(f'cd /home/clipe233/public_html/rasmutafoundation.org/.next/standalone && PORT=3000 HOSTNAME=0.0.0.0 nohup {bun_path} server.js > /tmp/rasmuta.log 2>&1 &')
    time.sleep(3)
    out, _ = vps_run('ss -tlnp sport = :3000')
    print(f'Port 3000 now: {"LISTENING" if "3000" in (out or "") else "STILL DEAD"}')
    out, _ = vps_run('tail -5 /tmp/rasmuta.log 2>/dev/null')
    print(f'Log: {out}')

# 2. Fix 24hournewsonline.com (WordPress)
print('\n=== Checking WordPress ===')
out, _ = vps_run('which php 2>/dev/null; php -v 2>/dev/null | head -1')
print(f'PHP: {out}')
out, _ = vps_run('systemctl status php-fpm 2>/dev/null | head -3; systemctl status php-fpm.service 2>/dev/null | head -3')
print(f'PHP-FPM: {out}')

# Check if it's really WP
out, _ = vps_run('cat /home/clipe233/public_html/24hournewsonline.com/wp-config.php 2>/dev/null | head -5')
if 'DB_NAME' in (out or ''):
    print('Confirmed WordPress site')
    # Check if php-fpm is running
    out, _ = vps_run('systemctl is-active php-fpm 2>/dev/null || systemctl is-active php-fpm.service 2>/dev/null || echo INACTIVE')
    if 'INACTIVE' in out or 'inactive' in out:
        print('PHP-FPM not running, checking available services...')
        out, _ = vps_run('systemctl list-units --type=service --state=running | grep -i php')
        print(f'PHP services: {out}')
        # Try to find and start PHP
        out, _ = vps_run('ls /etc/php-fpm.d/ 2>/dev/null || ls /etc/php/*/fpm/ 2>/dev/null || echo NO_CONFIG')
        print(f'PHP config: {out}')
else:
    print('Not a standard WordPress install or wp-config missing')
    # Check if there's another way it was served
    out, _ = vps_run('ls /home/24hournews/ 2>/dev/null | head -10')
    print(f'/home/24hournews/: {out[:300]}')
    out, _ = vps_run('ls /home/24hour-news/ 2>/dev/null | head -10')
    print(f'/home/24hour-news/: {out[:300]}')

# Final verify
print('\n=== Final check ===')
time.sleep(2)
for domain in ['rasmutafoundation.org', '24hournewsonline.com']:
    out, _ = vps_run(f'curl -s -o /dev/null -w "%{{http_code}}" http://127.0.0.1:80 -H "Host: {domain}" --max-time 5')
    print(f'  {domain}: HTTP {out}')

c.close()
print('\nDone.')
