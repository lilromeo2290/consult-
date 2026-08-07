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

# 1. Fix rasmutafoundation.org - proxy to the actual IP
print('=== Fix rasmutafoundation.org ===')
conf = '''server {
    server_name rasmutafoundation.org www.rasmutafoundation.org;

    location / {
        proxy_pass http://153.75.247.4:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;
    listen [::]:80;
}
'''
vps_run(f"cat > /etc/nginx/conf.d/rasmutafoundation.org.conf << 'EOF'\n{conf}EOF")

# 2. Fix 24hournewsonline.com - WordPress with PHP-FPM
print('\n=== Fix 24hournewsonline.com (WordPress) ===')
# Check PHP-FPM config
out, _ = vps_run('ls /etc/php-fpm.d/*.conf 2>/dev/null; ls /etc/php/8.4/fpm/pool.d/*.conf 2>/dev/null; ls /etc/php-fpm.d/www.conf 2>/dev/null')
print(f'PHP-FPM pools: {out}')

# Start php-fpm
out, _ = vps_run('php-fpm 2>&1 &')  
vps_run('sleep 1; ss -tlnp | grep 9000')

# Check if php-fpm is listening
out, _ = vps_run('ss -tlnp | grep php')
print(f'PHP-FPM port: {out}')

# Try starting via systemctl
out, _ = vps_run('systemctl start php-fpm 2>&1 || true')
out, _ = vps_run('systemctl enable --now php-fpm 2>&1 || true')

time.sleep(2)
out, _ = vps_run('ss -tlnp | grep -E "9000|php"')
print(f'After start: {out}')

# Create WP nginx config with PHP
wp_conf = '''server {
    server_name 24hournewsonline.com www.24hournewsonline.com;
    root /home/clipe233/public_html/24hournewsonline.com;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.ht {
        deny all;
    }

    listen 80;
    listen [::]:80;
}
'''
vps_run(f"cat > /etc/nginx/conf.d/24hournewsonline.com.conf << 'EOF'\n{wp_conf}EOF")

print('\n=== Test and reload ===')
vps_run('nginx -t 2>&1')
vps_run('systemctl reload nginx')

time.sleep(2)

print('\n=== Final verify ===')
for domain in ['rasmutafoundation.org', '24hournewsonline.com', 'globalexperiencegh.com', 'dwellchroniclesgh.com']:
    out, _ = vps_run(f'curl -s -o /dev/null -w "%{{http_code}}" http://127.0.0.1:80 -H "Host: {domain}" --max-time 5')
    print(f'  {domain}: HTTP {out}')
for domain in ['pycclub.org', 'rms.clipeconsult.com', 'clipe233eng.net']:
    out, _ = vps_run(f'curl -sk -o /dev/null -w "%{{http_code}}" https://127.0.0.1:443 -H "Host: {domain}" --max-time 5')
    print(f'  {domain}: HTTP {out}')

c.close()
print('\nDone.')
