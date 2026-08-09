import paramiko
import tarfile
import io
import os

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
REMOTE_APP = '/home/consult-rms'

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

    # Clean old static, extract, ensure symlink, restart
    cmds = [
        'rm -rf ' + REMOTE_APP + '/standalone/.next/static/',
        'cd ' + REMOTE_APP + ' && tar xf deploy.tar && rm deploy.tar',
        'rm -f ' + REMOTE_APP + '/.next',
        'ln -sf ' + REMOTE_APP + '/standalone/.next ' + REMOTE_APP + '/.next',
        'ls -la ' + REMOTE_APP + '/.next',
        'pm2 restart consult-rms',
    ]
    for cmd in cmds:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        if out: print(f'  {out[:200]}')
        if err and 'cannot' not in err.lower(): print(f'  ERR: {err[:200]}')

    sftp.close()
    ssh.close()
    print('Deployed!')

if __name__ == '__main__':
    deploy()
