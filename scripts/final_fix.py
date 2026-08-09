import paramiko

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
APP = '/home/consult-rms'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# 1. Fix nginx config - add no-cache to ALL locations
nginx_conf = '''server {
    server_name clipe233eng.net www.clipe233eng.net;

    # Disable all caching for this app
    proxy_no_cache 1;
    proxy_cache_bypass 1;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
    }

    listen [::]:443 ssl;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/clipe233eng.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/clipe233eng.net/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = www.clipe233eng.net) {
        return 301 https://$host$request_uri;
    }
    if ($host = clipe233eng.net) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    listen [::]:80;
    server_name clipe233eng.net www.clipe233eng.net;
    return 404;
}
'''

# Write nginx config
sftp = ssh.open_sftp()
with sftp.open('/etc/nginx/conf.d/consult-rms.conf', 'w') as f:
    f.write(nginx_conf)
sftp.close()

# 2. Clear Next.js cache on server
print('Clearing Next.js cache...')
stdin, stdout, stderr = ssh.exec_command('rm -rf ' + APP + '/standalone/.next/cache/ 2>&1')
stdout.read()

# 3. Test and reload nginx
print('Testing nginx...')
stdin, stdout, stderr = ssh.exec_command('nginx -t 2>&1')
print(stdout.read().decode(), stderr.read().decode())

print('Reloading nginx...')
stdin, stdout, stderr = ssh.exec_command('nginx -s reload 2>&1')
stdout.read()

# 4. Restart PM2 to clear its cache
print('Restarting app...')
stdin, stdout, stderr = ssh.exec_command('pm2 restart consult-rms 2>&1 | grep consult')
print(stdout.read().decode().strip())

# 5. Verify the cache headers are now correct
print('Verifying headers...')
stdin, stdout, stderr = ssh.exec_command('curl -sI http://127.0.0.1:3001/ 2>&1 | grep -i cache')
print('Next.js headers:', stdout.read().decode().strip())

stdin, stdout, stderr = ssh.exec_command('curl -sI https://clipe233eng.net/ -k 2>&1 | grep -i cache')
print('Nginx headers:', stdout.read().decode().strip())

ssh.close()
print('Done!')
