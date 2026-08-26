import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4')

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    return stdout.read().decode().strip()

print('Standalone check (new):')
print(run('ls -la /home/rms-clipeconsult/.next/standalone/server.js 2>/dev/null || echo NOT_FOUND'))
print()
print('Standalone check (kpma):')
print(run('ls -la /home/kpma-rms/.next/standalone/server.js 2>/dev/null || echo NOT_FOUND'))
print()
print('KPMA start script:')
print(run("cat /home/kpma-rms/package.json | grep -A3 'start'"))
print()
print('KPMA PM2 info:')
print(run('pm2 show kpma-rms 2>/dev/null | grep -E "script path|exec cwd|exec mode|node args|pm exec path"'))

ssh.close()