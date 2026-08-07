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

print('=== PHP-FPM config ===')
out, _ = vps_run('cat /etc/php-fpm.d/www.conf | grep -E "^listen|^user|^group"')
print(out)

print('=== PHP-FPM listening ===')
out, _ = vps_run('ss -tlnp | grep php; ss -xlnp | grep php')
print(f'TCP: {(out or "none")}')
out, _ = vps_run('ls /run/php-fpm/ 2>/dev/null')
print(f'Unix sockets: {out}')

print('=== PHP version mismatch? ===')
out, _ = vps_run('php -v | head -1; php-fpm -v 2>/dev/null | head -1')
print(out)

c.close()
