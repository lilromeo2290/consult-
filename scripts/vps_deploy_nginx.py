#!/usr/bin/env python3
"""Deploy PM2 + Nginx config for RMS on VPS."""
import sys
sys.path.insert(0, '/home/z/.local/lib/python3.13/site-packages')
import paramiko

def run(c, cmd, t=30):
    i,o,e = c.exec_command(cmd, timeout=t)
    out = o.read().decode()
    err = e.read().decode()
    if out: print(out[-2000:])
    if err: print('ERR:', err[-1000:])
    return out, err

h='153.75.247.4'; u='root'; p='Do1_BuZe4_M1-V6v1_S4'
c=paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy()); c.connect(h, port=22, username=u, password=p, timeout=15)

# 1. Start with PM2 on port 3001
print('=== PM2 START ===')
run(c, 'cd /home/consult-rms && HOSTNAME=0.0.0.0 PORT=3001 DATABASE_URL="file:/home/consult-rms/data/rms.db" pm2 start server.js --name consult-rms', t=30)
run(c, 'pm2 save', t=15)

# 2. Create nginx config for clipe233eng.net -> port 3001
print('=== NGINX CONFIG ===')
nginx_conf = r"""server {
    listen 80;
    listen [::]:80;
    server_name clipe233eng.net www.clipe233eng.net;

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
    }
}
"""

# Write config via SFTP
sftp = c.open_sftp()
with sftp.open('/etc/nginx/conf.d/consult-rms.conf', 'w') as f:
    f.write(nginx_conf)
sftp.close()
print('Nginx config written')

# Verify and reload
print('=== NGINX TEST & RELOAD ===')
run(c, 'nginx -t 2>&1', t=10)
run(c, 'systemctl reload nginx 2>&1', t=10)

# 3. Verify PM2 status
print('=== PM2 STATUS ===')
run(c, 'pm2 list')

# 4. Test local curl
print('=== CURL TEST ===')
run(c, 'curl -s -o /dev/null -w "HTTP %{http_code}\n" -H "Host: clipe233eng.net" http://127.0.0.1:80/')

# 5. Init the database
print('=== DB CHECK ===')
run(c, 'ls -la /home/consult-rms/data/')

c.close()
print('\n=== DEPLOY COMPLETE ===')
