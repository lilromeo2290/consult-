import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4')

# Fix nginx: change proxy_pass from 3001 to 3000
cmd = "sed -i 's|proxy_pass http://127.0.0.1:3001;|proxy_pass http://127.0.0.1:3000;|' /etc/nginx/conf.d/consult-rms.conf && nginx -t 2>&1 && nginx -s reload 2>&1"
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
print('STDOUT:', stdout.read().decode())
print('STDERR:', stderr.read().decode())

# Verify
stdin, stdout, stderr = ssh.exec_command('grep proxy_pass /etc/nginx/conf.d/consult-rms.conf', timeout=10)
print('VERIFIED:', stdout.read().decode())

ssh.close()
print('Done!')
