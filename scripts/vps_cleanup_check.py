import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4')

commands = [
    'ls -la /home/ | grep -i rms',
    'ls -la /opt/ 2>/dev/null',
    'du -sh /home/consult-rms/ 2>/dev/null',
    'du -sh /home/kpma-rms/ 2>/dev/null',
    'pm2 show consult-rms 2>/dev/null | head -20',
    'pm2 show kpma-rms 2>/dev/null | head -20',
]
for cmd in commands:
    print(f'>>> {cmd}')
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(out)
    if err:
        print(f'STDERR: {err}')
    print()

ssh.close()
