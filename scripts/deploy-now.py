#!/usr/bin/env python3
"""One-shot deploy: build artifacts already exist, just tar + SFTP + extract + restart."""
import paramiko
import os
import tarfile
import io
import time

VPS_HOST = '153.75.247.4'
VPS_PORT = 22
VPS_USER = 'root'
SSH_KEY = '/home/z/.ssh/vps_deploy_key'
PROJECT = '/home/z/my-project/Rev_Mgnt_Sys'
DEPLOY_DIR = '/home/kpma-rms'
DB_URL = 'file:/home/kpma-rms-build-fresh/db/custom.db'

def log(msg):
    print(f'[DEPLOY] {msg}')

def main():
    # Load key
    key = paramiko.RSAKey.from_private_key_file(SSH_KEY)
    log('SSH key loaded')

    # Connect
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, pkey=key, timeout=15)
    log(f'Connected to {VPS_HOST}')

    # Backup DB first
    log('Backing up database...')
    sftp = client.open_sftp()
    try:
        os.makedirs(f'{PROJECT}/db', exist_ok=True)
        sftp.get('/home/kpma-rms-build-fresh/db/custom.db', f'{PROJECT}/db/custom.db')
        log('Database backed up locally')
    except Exception as e:
        log(f'DB backup warning: {e}')

    # Create tar files
    tars = {}
    for name, src in [
        ('standalone', f'{PROJECT}/.next/standalone/Rev_Mgnt_Sys'),
        ('static', f'{PROJECT}/.next/static'),
        ('public', f'{PROJECT}/public'),
    ]:
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode='w:gz') as tar:
            for item in os.listdir(src):
                tar.add(os.path.join(src, item), arcname=item)
        tars[name] = buf.getvalue()
        log(f'Created {name}.tar.gz ({len(tars[name]):,} bytes)')

    # Upload
    for name, data in tars.items():
        remote = f'/tmp/{name}.tar.gz'
        log(f'Uploading {name}.tar.gz...')
        with sftp.open(remote, 'wb') as f:
            f.write(data)
        log(f'Uploaded {name}.tar.gz')

    # Deploy commands
    cmds = [
        f'rm -rf {DEPLOY_DIR}/*',
        f'cd {DEPLOY_DIR} && tar xzf /tmp/standalone.tar.gz',
        f'mkdir -p {DEPLOY_DIR}/.next/static',
        f'cd {DEPLOY_DIR}/.next/static && tar xzf /tmp/static.tar.gz',
        f'cd {DEPLOY_DIR} && tar xzf /tmp/public.tar.gz',
        f'echo "{DB_URL}" > {DEPLOY_DIR}/.env',
        'pm2 restart all',
    ]
    for cmd in cmds:
        log(f'Running: {cmd[:80]}...')
        stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
        out = stdout.read().decode()
        err = stderr.read().decode()
        if err and 'warning' not in err.lower():
            log(f'  stderr: {err[:200]}')

    time.sleep(3)

    # Verify
    stdin, stdout, stderr = client.exec_command('pm2 status')
    log('PM2 Status:')
    print(stdout.read().decode())

    # Cleanup
    for name in tars:
        client.exec_command(f'rm -f /tmp/{name}.tar.gz')

    sftp.close()
    client.close()
    log('Deploy complete!')

if __name__ == '__main__':
    main()
