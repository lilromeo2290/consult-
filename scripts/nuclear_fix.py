import paramiko, json

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
APP = '/home/consult-rms'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# 1. Find the correct nginx config for clipe233eng.net
print('=== All nginx configs ===')
stdin, stdout, stderr = ssh.exec_command('ls /etc/nginx/conf.d/ /etc/nginx/sites-enabled/ 2>/dev/null')
print(stdout.read().decode())

# 2. Check for clipe233eng
stdin, stdout, stderr = ssh.exec_command('grep -rl "clipe233" /etc/nginx/ 2>/dev/null')
print('clipe233eng config:', stdout.read().decode().strip())

# 3. Check ALL proxy configs
stdin, stdout, stderr = ssh.exec_command('grep -r "proxy_pass\|proxy_cache" /etc/nginx/conf.d/ /etc/nginx/sites-enabled/ 2>/dev/null')
print('Proxy configs:', stdout.read().decode().strip())

# 4. Check what port the app actually listens on
stdin, stdout, stderr = ssh.exec_command('ss -tlnp | grep node')
print('Node ports:', stdout.read().decode().strip())

# 5. Directly check what the app returns for the main page
stdin, stdout, stderr = ssh.exec_command('curl -s http://127.0.0.1:3001/ 2>/dev/null | grep -o "buildId[^,]*" | head -3')
print('App buildId:', stdout.read().decode().strip())

# 6. Check the ACTUAL chunk file being served
stdin, stdout, stderr = ssh.exec_command('curl -s http://127.0.0.1:3001/ 2>/dev/null | grep -o "d66fbf[^\"]*" | head -3')
print('d66fbf refs in HTML:', stdout.read().decode().strip())

stdin, stdout, stderr = ssh.exec_command('curl -s http://127.0.0.1:3001/ 2>/dev/null | grep -o "80e8dda[^\"]*" | head -3')
print('80e8dda refs in HTML:', stdout.read().decode().strip())

# 7. Check the RSC response
stdin, stdout, stderr = ssh.exec_command('curl -s -H "RSC: 1" http://127.0.0.1:3001/ 2>/dev/null | grep -o "d66fbf\|80e8dda\|c4d780" | sort -u')
print('RSC chunk refs:', stdout.read().decode().strip())

ssh.close()