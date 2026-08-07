#!/usr/bin/env python3
"""Restore all missing nginx site configs and start 24hournews."""
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
    if err and 'warning' not in err.lower(): print(f'  ERR: {err[-300:]}')
    return out, err

# Site configs: domain -> port
sites = {
    'rasmutafoundation.org': {'port': 3000, 'ssl': False},
    'globalexperiencegh.com': {'port': 3004, 'ssl': False},
    'dwellchroniclesgh.com': {'port': 3006, 'ssl': False},
    'pycclub.org': {'port': 3002, 'ssl': True},
    'rms.clipeconsult.com': {'port': 3005, 'ssl': True},
}

for domain, info in sites.items():
    port = info['port']
    has_ssl = info['ssl']
    print(f'\n=== Creating config for {domain} -> port {port} ===')

    if has_ssl:
        conf = f"""server {{
    server_name {domain} www.{domain};

    location / {{
        proxy_pass http://127.0.0.1:{port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }}

    listen [::]:443 ssl ipv6only=on;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/{domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{domain}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}}
server {{
    if ($host = {domain}) {{
        return 301 https://$host$request_uri;
    }}
    if ($host = www.{domain}) {{
        return 301 https://$host$request_uri;
    }}
    listen 80;
    listen [::]:80;
    server_name {domain} www.{domain};
    return 404;
}}
"""
    else:
        conf = f"""server {{
    server_name {domain} www.{domain};

    location / {{
        proxy_pass http://127.0.0.1:{port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }}

    listen 80;
    listen [::]:80;
}}
"""

    # Write config via heredoc
    vps_run(f"cat > /etc/nginx/conf.d/{domain}.conf << 'CONFEOF'\n{conf}CONFEOF")

# Also handle www.dwellchroniclesgh.com since user used that URL
# (already covered by server_name directive above)

print('\n=== Test nginx config ===')
vps_run('nginx -t 2>&1')

print('\n=== Reload nginx ===')
vps_run('systemctl reload nginx')

# Start 24hournews if it has a standalone server
print('\n=== Check 24hournews ===')
out, _ = vps_run('ls /home/clipe233/public_html/24hournewsonline.com/.next/standalone/server.js 2>/dev/null && echo EXISTS || echo NO')
if 'EXISTS' in out:
    print('  Found standalone, checking if port 3003 is free...')
    out, _ = vps_run('ss -tlnp sport = :3003')
    if not out:
        print('  Starting 24hournews on port 3003...')
        vps_run('cd /home/clipe233/public_html/24hournewsonline.com/.next/standalone && PORT=3003 HOSTNAME=0.0.0.0 nohup node server.js > /tmp/24hournews.log 2>&1 &')
        time.sleep(2)
        # Create nginx config
        conf = f"""server {{
    server_name 24hournewsonline.com www.24hournewsonline.com;

    location / {{
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }}

    listen 80;
    listen [::]:80;
}}
"""
        vps_run(f"cat > /etc/nginx/conf.d/24hournewsonline.com.conf << 'CONFEOF'\n{conf}CONFEOF")
        vps_run('nginx -t 2>&1 && systemctl reload nginx')
        print('  24hournews started and nginx config created')
    else:
        print('  Port 3003 already in use')
else:
    # Check if it's a different framework
    out, _ = vps_run('ls /home/clipe233/public_html/24hournewsonline.com/ 2>/dev/null | head -10')
    print(f'  Directory contents: {out[:300]}')
    print('  No standalone server found - may need manual setup')

# Verify all sites
print('\n=== Final Verification ===')
time.sleep(2)
all_domains = list(sites.keys()) + ['24hournewsonline.com', 'www.dwellchroniclesgh.com']
for domain in all_domains:
    out, _ = vps_run(f'curl -s -o /dev/null -w "%{{http_code}}" http://127.0.0.1:80 -H "Host: {domain}" --max-time 5')
    print(f'  {domain}: HTTP {out}')

# Also verify HTTPS for SSL sites
for domain in ['pycclub.org', 'rms.clipeconsult.com']:
    out, _ = vps_run(f'curl -sk -o /dev/null -w "%{{http_code}}" https://127.0.0.1:443 -H "Host: {domain}" --max-time 5')
    print(f'  {domain} (HTTPS): HTTP {out}')

c.close()
print('\nDone.')
