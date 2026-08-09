import paramiko

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
APP = '/home/consult-rms'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

nginx_conf = '''server {
    server_name clipe233eng.net www.clipe233eng.net;

    # Disable all caching
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

        # Remove Next.js cache headers
        proxy_hide_header Cache-Control;
        proxy_hide_header x-nextjs-cache;
        proxy_hide_header x-nextjs-stale-time;

        # Force no-cache
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

sftp = ssh.open_sftp()
with sftp.open('/etc/nginx/conf.d/consult-rms.conf', 'w') as f:
    f.write(nginx_conf)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('nginx -t 2>&1 && nginx -s reload 2>&1')
print('Nginx:', stdout.read().decode().strip())

stdin, stdout, stderr = ssh.exec_command('pm2 restart consult-rms 2>&1 | tail -1')
print('PM2:', stdout.read().decode().strip())

# Verify - should only see our no-cache header
stdin, stdout, stderr = ssh.exec_command('curl -sI https://clipe233eng.net/ -k 2>&1 | grep -i cache')
print('Headers:', stdout.read().decode().strip())

ssh.close()
print('Done!')
