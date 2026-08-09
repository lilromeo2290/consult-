import paramiko
import tarfile
import io
import os

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
REMOTE_APP = '/home/consult-rms'

def deploy():
    # SSH client
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS)
    
    # SFTP client
    sftp = ssh.open_sftp()
    
    # Create tar of standalone + static
    print("Creating tar archive...")
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w:') as tar:
        # standalone
        standalone_dir = '/home/z/my-project/.next/standalone'
        for root, dirs, files in os.walk(standalone_dir):
            for f in files:
                full = os.path.join(root, f)
                arc = os.path.relpath(full, standalone_dir)
                tar.add(full, arcname=f'standalone/{arc}')
        # static
        static_dir = '/home/z/my-project/.next/static'
        for root, dirs, files in os.walk(static_dir):
            for f in files:
                full = os.path.join(root, f)
                arc = os.path.relpath(full, static_dir)
                tar.add(full, arcname=f'standalone/.next/static/{arc}')
    
    buf.seek(0)
    remote_tar = f'{REMOTE_APP}/deploy.tar'
    print(f"Uploading tar ({buf.getbuffer().nbytes / 1024 / 1024:.1f} MB)...")
    sftp.putfo(buf, remote_tar)
    print("Upload complete.")
    
    # Extract and restart
    print("Extracting on server...")
    cmds = [
        f'cd {REMOTE_APP} && tar xf deploy.tar && rm deploy.tar',
        f'cd {REMOTE_APP} && pm2 restart consult-rms',
    ]
    for cmd in cmds:
        print(f"  Running: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
        out = stdout.read().decode()
        err = stderr.read().decode()
        if out: print(f"  OUT: {out}")
        if err: print(f"  ERR: {err}")
    
    # Verify
    stdin, stdout, stderr = ssh.exec_command('pm2 status consult-rms', timeout=10)
    print("PM2 status:", stdout.read().decode().strip())
    
    sftp.close()
    ssh.close()
    print("Deploy complete!")

if __name__ == '__main__':
    deploy()
