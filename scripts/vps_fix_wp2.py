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

# Fix nginx to use unix socket
print('=== Update 24hournewsonline nginx config ===')
wp_conf = '''server {
    server_name 24hournewsonline.com www.24hournewsonline.com;
    root /home/clipe233/public_html/24hournewsonline.com;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php-fpm/www.sock;
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

# Fix permissions so apache (php-fpm user) can read WP files
print('=== Fix permissions ===')
vps_run('chmod -R o+rx /home/clipe233/public_html/24hournewsonline.com/')

# Reload nginx
print('=== Reload nginx ===')
vps_run('nginx -t 2>&1')
vps_run('systemctl reload nginx')

time.sleep(2)
print('=== Verify ===')
out, _ = vps_run('curl -s -o /dev/null -w "%{{http_code}}" http://127.0.0.1:80 -H "Host: 24hournewsonline.com" --max-time 5')
print(f'  24hournewsonline.com: HTTP {out}')
# Check actual response
out, _ = vps_run('curl -s http://127.0.0.1:80 -H "Host: 24hournewsonline.com" --max-time 5 | head -5')
print(f'  Response: {out[:200]}')

c.close()
print('Done.')
