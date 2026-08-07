#!/usr/bin/env python3
"""Check all sites on VPS."""
import sys, time
sys.path.insert(0, '/home/z/.local/lib/python3.13/site-packages')
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('153.75.247.4', port=22, username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=15)

def vps_run(cmd):
    i,o,e = c.exec_command(cmd, timeout=15)
    return o.read().decode().strip(), e.read().decode().strip()

print('=== PM2 Status ===')
out, err = vps_run('pm2 list')
print(out)

print('\n=== Nginx Status ===')
out, err = vps_run('systemctl status nginx --no-pager -l | head -15')
print(out)

print('\n=== Nginx Config Test ===')
out, err = vps_run('nginx -t 2>&1')
print(out if out else err)

print('\n=== All Nginx Site Configs ===')
out, err = vps_run('ls -la /etc/nginx/conf.d/')
print(out)

print('\n=== Port Listeners ===')
out, err = vps_run('ss -tlnp | grep -E "300[0-9]|80|443"')
print(out)

print('\n=== Curl Tests (internal) ===')
sites = [
    ('rasmutafoundation.org', 'http://127.0.0.1'),
    ('globalexperiencegh.com', 'http://127.0.0.1:3004'),
    ('dwellchroniclesgh.com', 'http://127.0.0.1:3002'),
    ('24hournewsonline.com', 'http://127.0.0.1'),
    ('pycclub.org', 'http://127.0.0.1:3005'),
    ('clipe233eng.net', 'http://127.0.0.1:3001'),
]
for name, url in sites:
    out, err = vps_run(f'curl -s -o /dev/null -w "%{{http_code}}" {url} -H "Host: {name}" --max-time 5')
    status = out if out else 'TIMEOUT'
    print(f'  {name}: HTTP {status}')

c.close()
print('\nDone.')
