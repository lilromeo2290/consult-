import paramiko, time

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
APP = '/home/consult-rms'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# Create symlink: .next -> standalone/.next
print('Creating symlink...')
stdin, stdout, stderr = ssh.exec_command(f'ln -s {APP}/standalone/.next {APP}/.next 2>&1')
print(stdout.read().decode(), stderr.read().decode())

# Verify
stdin, stdout, stderr = ssh.exec_command(f'ls -la {APP}/.next 2>&1')
print('Symlink:', stdout.read().decode().strip())

# Restart
stdin, stdout, stderr = ssh.exec_command('pm2 restart consult-rms 2>&1 | tail -1')
print('PM2:', stdout.read().decode().strip())

# Wait for startup
time.sleep(5)

# Verify app responds
stdin, stdout, stderr = ssh.exec_command('curl -sI http://127.0.0.1:3001/ 2>&1 | head -3')
print('App:', stdout.read().decode().strip())

# Verify correct chunks
stdin, stdout, stderr = ssh.exec_command(f'curl -s http://127.0.0.1:3001/ 2>/dev/null | grep -oP "chunks/[^"]+" | sort -u | grep -i "d66fbf\|4809a2"')
print('Chunks:', stdout.read().decode().strip())

ssh.close()
print('Done!')