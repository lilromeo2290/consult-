#!/usr/bin/env python3
import sys
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

# Fix pycclub.org - remove ipv6only=on
pyc_conf = '''server {
    server_name pycclub.org www.pycclub.org;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl;
    listen [::]:443 ssl;
    ssl_certificate /etc/letsencrypt/live/pycclub.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pycclub.org/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
server {
    if ($host = pycclub.org) {
        return 301 https://$host$request_uri;
    }
    if ($host = www.pycclub.org) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    listen [::]:80;
    server_name pycclub.org www.pycclub.org;
    return 404;
}
'''

rms_conf = '''server {
    server_name rms.clipeconsult.com;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl;
    listen [::]:443 ssl;
    ssl_certificate /etc/letsencrypt/live/rms.clipeconsult.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rms.clipeconsult.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
server {
    if ($host = rms.clipeconsult.com) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    listen [::]:80;
    server_name rms.clipeconsult.com;
    return 404;
}
'''

print('=== Writing fixed pycclub.org config ===')
vps_run(f"cat > /etc/nginx/conf.d/pycclub.org.conf << 'EOF'\n{pyc_conf}EOF")

print('\n=== Writing rms.clipeconsult.com config ===')
vps_run(f"cat > /etc/nginx/conf.d/rms.clipeconsult.com.conf << 'EOF'\n{rms_conf}EOF")

print('\n=== Also fix consult-rms.conf (remove ipv6only=on) ===')
# Read current config, replace the listen lines
vps_run("sed -i 's/listen \[::\]:443 ssl ipv6only=on;/listen [::]:443 ssl;/' /etc/nginx/conf.d/consult-rms.conf")

print('\n=== Test and reload ===')
vps_run('nginx -t 2>&1')
vps_run('systemctl reload nginx')

import time
time.sleep(2)

print('\n=== Verify all sites ===')
sites = [
    ('rasmutafoundation.org', 'http'),
    ('globalexperiencegh.com', 'http'),
    ('dwellchroniclesgh.com', 'http'),
    ('24hournewsonline.com', 'http'),
    ('pycclub.org', 'https'),
    ('rms.clipeconsult.com', 'https'),
    ('clipe233eng.net', 'https'),
]
for domain, proto in sites:
 port = 443 if proto == 'https' else 80
 out, _ = vps_run(f'curl -sk -o /dev/null -w "%{{http_code}}" {proto}://127.0.0.1:{port} -H "Host: {domain}" --max-time 5')
 print(f'  {domain}: HTTP {out}')

c.close()
print('\nDone.')
