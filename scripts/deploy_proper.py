import paramiko
import tarfile
import io
import os

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
REMOTE_APP = '/home/consult-rms'
CORRECT_DB_URL = 'file:/home/consult-rms/data/rms.db'

def deploy():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS)
    sftp = ssh.open_sftp()

    # Create tar: standalone + static
    print('Creating tar...')
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w:') as tar:
        for root, dirs, files in os.walk('/home/z/my-project/.next/standalone'):
            for f in files:
                full = os.path.join(root, f)
                arc = os.path.relpath(full, '/home/z/my-project/.next/standalone')
                tar.add(full, arcname='standalone/' + arc)
        for root, dirs, files in os.walk('/home/z/my-project/.next/static'):
            for f in files:
                full = os.path.join(root, f)
                arc = os.path.relpath(full, '/home/z/my-project/.next/static')
                tar.add(full, arcname='standalone/.next/static/' + arc)

    buf.seek(0)
    remote_tar = REMOTE_APP + '/deploy.tar'
    sz = buf.getbuffer().nbytes / 1024 / 1024
    print(f'Uploading ({sz:.1f} MB)...')
    sftp.putfo(buf, remote_tar)
    print('Upload done.')

    # Ensure data directory exists
    cmds = [
        'mkdir -p ' + REMOTE_APP + '/data',
        'rm -rf ' + REMOTE_APP + '/standalone/.next/static/',
        'cd ' + REMOTE_APP + ' && tar xf deploy.tar && rm deploy.tar',
        'rm -f ' + REMOTE_APP + '/.next',
        'ln -sf ' + REMOTE_APP + '/standalone/.next ' + REMOTE_APP + '/.next',
        # ALWAYS write the correct .env (overwrite whatever was baked at build time)
        f'printf "DATABASE_URL={CORRECT_DB_URL}\nPORT=3000" > {REMOTE_APP}/standalone/.env',
        f'printf "DATABASE_URL={CORRECT_DB_URL}\nPORT=3000" > {REMOTE_APP}/.env',
    ]
    for cmd in cmds:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        if out: print(f'  {out[:200]}')
        if err and 'cannot' not in err.lower(): print(f'  ERR: {err[:200]}')

    # Restart PM2 process
    stdin, stdout, stderr = ssh.exec_command(
        'pm2 restart consult-rms 2>&1', timeout=30
    )
    out = stdout.read().decode().strip()
    if 'not found' in out.lower() or 'error' in out.lower():
        # Process doesn't exist — start it
        stdin, stdout, stderr = ssh.exec_command(
            f'cd {REMOTE_APP}/standalone && pm2 start server.js --name consult-rms 2>&1',
            timeout=30,
        )
        out2 = stdout.read().decode().strip()
        print(f'  {out2[:200]}')
    else:
        print(f'  {out[:200]}')

    ssh.exec_command('pm2 save 2>&1', timeout=15)
    sftp.close()
    ssh.close()
    print('Deployed!')

if __name__ == '__main__':
    deploy()
