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
    print("Creating tar archive...")
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w:') as tar:
        # standalone (server code + .next/static copied into it)
        standalone_dir = '/home/z/my-project/.next/standalone'
        for root, dirs, files in os.walk(standalone_dir):
            for f in files:
                full = os.path.join(root, f)
                arc = os.path.relpath(full, standalone_dir)
                tar.add(full, arcname='standalone/' + arc)
        # static files go into standalone/.next/static/
        static_dir = '/home/z/my-project/.next/static'
        for root, dirs, files in os.walk(static_dir):
            for f in files:
                full = os.path.join(root, f)
                arc = os.path.relpath(full, static_dir)
                tar.add(full, arcname='standalone/.next/static/' + arc)

    buf.seek(0)
    remote_tar = REMOTE_APP + '/deploy.tar'
    sz = buf.getbuffer().nbytes / 1024 / 1024
    print(f"Uploading tar ({sz:.1f} MB)...")
    sftp.putfo(buf, remote_tar)
    print("Upload complete.")

    # Clean old chunks, extract, restart
    print("Cleaning old files...")
    cmds = [
        'rm -rf ' + REMOTE_APP + '/standalone/.next/static/',
        'cd ' + REMOTE_APP + ' && tar xf deploy.tar && rm deploy.tar',
    ]
    for cmd in cmds:
        print(f"  {cmd[:80]}")
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=120)
        out = stdout.read().decode()
        err = stderr.read().decode()
        if out.strip(): print(f"  OUT: {out[:200]}")
        if err.strip(): print(f"  ERR: {err[:200]}")

    # Verify chunks
    stdin, stdout, stderr = ssh.exec_command('ls ' + REMOTE_APP + '/standalone/.next/static/chunks/*.js 2>&1 | wc -l')
    print(f"Chunks count: {stdout.read().decode().strip()}")

    stdin, stdout, stderr = ssh.exec_command('ls ' + REMOTE_APP + '/standalone/.next/static/chunks/*.js 2>&1')
    print(f"Chunks: {stdout.read().decode().strip()[:500]}")

    # Check 1413001
    stdin, stdout, stderr = ssh.exec_command('grep -rl "1413001" ' + REMOTE_APP + '/standalone/.next/static/chunks/ 2>/dev/null')
    print(f"1413001 in: {stdout.read().decode().strip()}")

    # Check Property Revenue Code
    stdin, stdout, stderr = ssh.exec_command('grep -rl "Property Revenue Code" ' + REMOTE_APP + '/standalone/.next/static/chunks/ 2>/dev/null')
    print(f"Property Revenue Code in: {stdout.read().decode().strip()}")

    # Restart PM2
    stdin, stdout, stderr = ssh.exec_command('pm2 restart consult-rms 2>&1 | tail -5')
    print(stdout.read().decode().strip())

    sftp.close()
    ssh.close()
    print("Done!")

if __name__ == '__main__':
    deploy()
