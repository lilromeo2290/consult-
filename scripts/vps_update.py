#!/usr/bin/env python3
"""Update the RMS on VPS with latest local code.
Usage: python3 scripts/vps_update.py

Steps:
1. Build Next.js standalone locally
2. Upload to VPS via SFTP
3. Restart PM2 process
"""
import sys, os, subprocess, time
sys.path.insert(0, '/home/z/.local/lib/python3.13/site-packages')
import paramiko

VPS_HOST = '153.75.247.4'
VPS_USER = 'root'
VPS_PASS = 'Do1_BuZe4_M1-V6v1_S4'
VPS_APP_DIR = '/home/consult-rms'
VPS_PORT = '3001'
LOCAL_PROJECT = '/home/z/my-project'

def run_local(cmd):
    """Run a command locally."""
    print(f'[LOCAL] {cmd}')
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=LOCAL_PROJECT)
    if r.stdout: print(r.stdout[-2000:])
    if r.stderr: print(f'  ERR: {r.stderr[-1000:]}')
    return r.returncode == 0

def vps_connect():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VPS_HOST, port=22, username=VPS_USER, password=VPS_PASS, timeout=15)
    return c

def vps_run(c, cmd, t=60):
    """Run command on VPS."""
    print(f'[VPS] {cmd[:100]}')
    i,o,e = c.exec_command(cmd, timeout=t)
    out = o.read().decode()
    err = e.read().decode()
    if out: print(f'  {out[-1500:]}')
    if err: print(f'  ERR: {err[-500:]}')
    return out, err

def main():
    print('=' * 50)
    print('  RMS VPS Update Script')
    print('=' * 50)

    # Step 1: Build locally
    print('\n[1/5] Building Next.js standalone...')
    if not run_local('DATABASE_URL="file:./db/custom.db" npx prisma generate'):
        print('BUILD FAILED: prisma generate'); return
    if not run_local('DATABASE_URL="file:./db/custom.db" npm run build'):
        print('BUILD FAILED: next build'); return

    # Step 2: Prepare standalone with static + public + prisma
    print('\n[2/5] Preparing standalone package...')
    sa = os.path.join(LOCAL_PROJECT, '.next', 'standalone')
    os.makedirs(os.path.join(sa, 'prisma'), exist_ok=True)
    subprocess.run(f'cp -r {LOCAL_PROJECT}/.next/static {sa}/.next/', shell=True)
    subprocess.run(f'cp -r {LOCAL_PROJECT}/public {sa}/', shell=True)
    subprocess.run(f'cp {LOCAL_PROJECT}/prisma/schema.prisma {sa}/prisma/', shell=True)

    # Step 3: Tar and upload
    tar_path = '/tmp/rms-update.tar.gz'
    print(f'\n[3/5] Packaging and uploading...')
    subprocess.run(f'tar czf {tar_path} -C {sa} .', shell=True)
    size = os.path.getsize(tar_path)
    print(f'  Package size: {size/1024/1024:.1f} MB')

    c = vps_connect()
    sftp = c.open_sftp()
    remote_tar = f'{VPS_APP_DIR}/rms-update.tar.gz'
    sftp.put(tar_path, remote_tar)
    sftp.close()
    print(f'  Uploaded to VPS')

    # Step 4: Extract on VPS
    print(f'\n[4/5] Extracting on VPS...')
    vps_run(c, f'cd {VPS_APP_DIR} && rm -rf server.js .next public node_modules prisma && tar xzf rms-update.tar.gz && rm rms-update.tar.gz')

    # Upload prisma RHEL engine
    rhel_engine = os.path.join(LOCAL_PROJECT, 'node_modules/.prisma/client', 'libquery_engine-rhel-openssl-1.1.x.so.node')
    if os.path.exists(rhel_engine):
        print('  Uploading Prisma RHEL engine...')
        vps_run(c, f'mkdir -p {VPS_APP_DIR}/node_modules/.prisma/client')
        sftp = c.open_sftp()
        sftp.put(rhel_engine, f'{VPS_APP_DIR}/node_modules/.prisma/client/libquery_engine-rhel-openssl-1.1.x.so.node')
        sftp.close()

    # Step 5: Restart PM2
    print(f'\n[5/5] Restarting application...')
    vps_run(c, f'pm2 restart consult-rms')
    time.sleep(3)
    vps_run(c, f'curl -s -o /dev/null -w "HTTP %{{http_code}}\n" -H "Host: clipe233eng.net" https://127.0.0.1:443/')

    # Cleanup
    os.remove(tar_path)
    c.close()

    print('\n' + '=' * 50)
    print('  UPDATE COMPLETE - https://clipe233eng.net')
    print('=' * 50)

if __name__ == '__main__':
    main()
