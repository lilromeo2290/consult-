#!/usr/bin/env python3
"""Deploy RMS standalone build to VPS via SFTP.

Tarball is created from INSIDE .next/standalone/ so extraction
goes directly into the target directory.
"""

import paramiko
import os
import time

VPS_HOST = '153.75.247.4'
VPS_USER = 'root'
VPS_PASS = 'Do1_BuZe4_M1-V6v1_S4'
REMOTE_BASE = '/home/consult-rms'
REMOTE_STANDALONE = f'{REMOTE_BASE}/.next/standalone'
LOCAL_TARBALL = '/tmp/rms-deploy.tar.gz'


def run_cmd(ssh, cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if err and 'warning' not in err.lower():
        print(f'  STDERR: {err[:300]}')
    return out


def main():
    print(f'Connecting to {VPS_HOST}...')
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30)
    print('Connected.')

    # 1. Backup
    print('\n[1/5] Backing up current deployment...')
    run_cmd(ssh, f'mkdir -p {REMOTE_BASE}/backups')
    run_cmd(ssh, f'tar czf {REMOTE_BASE}/backups/pre-deploy-$(date +%Y%m%d-%H%M%S).tar.gz -C {REMOTE_BASE} .next server.js 2>/dev/null || true')
    print('  Backup done.')

    # 2. Completely remove old standalone
    print('\n[2/5] Removing old standalone build...')
    run_cmd(ssh, f'rm -rf {REMOTE_STANDALONE}')
    run_cmd(ssh, f'mkdir -p {REMOTE_STANDALONE}')
    print('  Cleared.')

    # 3. Upload tarball via SFTP
    print('\n[3/5] Uploading build (SFTP)...')
    sftp = ssh.open_sftp()
    remote_tarball = f'{REMOTE_BASE}/rms-deploy.tar.gz'
    local_size = os.path.getsize(LOCAL_TARBALL)
    print(f'  Local tarball: {local_size / 1024 / 1024:.1f} MB')

    uploaded_mb = [0]
    def progress_callback(sent, total):
        mb = sent / 1024 / 1024
        if mb - uploaded_mb[0] >= 5 or sent == total:
            uploaded_mb[0] = mb
            print(f'  Uploaded: {sent / total * 100:.0f}% ({mb:.1f} / {total / 1024 / 1024:.1f} MB)')

    sftp.put(LOCAL_TARBALL, remote_tarball, callback=progress_callback)
    sftp.close()
    print('  Upload complete.')

    # 4. Extract directly into standalone directory
    print('\n[4/5] Extracting on VPS...')
    # The tarball was created with `tar czf -C .next/standalone .`
    # So extracting into REMOTE_STANDALONE puts files in the right place
    run_cmd(ssh, f'cd {REMOTE_STANDALONE} && tar xzf {REMOTE_BASE}/rms-deploy.tar.gz')
    run_cmd(ssh, f'rm -f {REMOTE_BASE}/rms-deploy.tar.gz')

    # Write .env for Prisma
    run_cmd(ssh, f"echo 'DATABASE_URL=file:/home/consult-rms/data/rms.db' > {REMOTE_STANDALONE}/.env")

    # Copy prisma schema for reference
    run_cmd(ssh, f'mkdir -p {REMOTE_STANDALONE}/prisma')
    run_cmd(ssh, f'cp {REMOTE_BASE}/prisma/schema.prisma {REMOTE_STANDALONE}/prisma/ 2>/dev/null || true')

    # Copy server.js to root (for compatibility with current ecosystem.config)
    run_cmd(ssh, f'cp {REMOTE_STANDALONE}/server.js {REMOTE_BASE}/server.js')

    # CRITICAL: Next.js standalone does NOT include static files.
    # We must copy .next/static and public into the standalone directory.
    # First upload them via SFTP.
    print('  Uploading static files...')
    sftp2 = ssh.open_sftp()
    local_static = '/tmp/rms-static.tar.gz'
    os.system(f'tar czf {local_static} -C .next static')
    remote_static = f'{REMOTE_BASE}/rms-static.tar.gz'
    sftp2.put(local_static, remote_static)
    sftp2.close()
    run_cmd(ssh, f'mkdir -p {REMOTE_STANDALONE}/.next')
    run_cmd(ssh, f'tar xzf {remote_static} -C {REMOTE_STANDALONE}/.next')
    run_cmd(ssh, f'rm -f {remote_static}')
    # Also copy public folder
    if os.path.exists('public'):
        local_public = '/tmp/rms-public.tar.gz'
        os.system(f'tar czf {local_public} -C . public')
        sftp3 = ssh.open_sftp()
        remote_public = f'{REMOTE_BASE}/rms-public.tar.gz'
        sftp3.put(local_public, remote_public)
        sftp3.close()
        run_cmd(ssh, f'tar xzf {remote_public} -C {REMOTE_STANDALONE}')
        run_cmd(ssh, f'rm -f {remote_public}')
    # Also update top-level .next for static serving (legacy fallback)
    run_cmd(ssh, f'cp -r {REMOTE_STANDALONE}/.next/static {REMOTE_BASE}/.next/static 2>/dev/null || true')
    run_cmd(ssh, f'cp {REMOTE_STANDALONE}/.next/BUILD_ID {REMOTE_BASE}/.next/BUILD_ID 2>/dev/null || true')

    print('  Extraction done.')

    # Verify
    print('\nVerifying deployment...')
    build_id = run_cmd(ssh, f'cat {REMOTE_STANDALONE}/.next/BUILD_ID')
    prisma_check = run_cmd(ssh, f'ls {REMOTE_STANDALONE}/node_modules/.prisma/client/ 2>/dev/null | head -3 || echo NO_PRISMA')
    nm_size = run_cmd(ssh, f'du -sh {REMOTE_STANDALONE}/node_modules/ 2>/dev/null || echo NO_NM')
    print(f'  BUILD_ID: {build_id}')
    print(f'  Prisma client: {prisma_check}')
    print(f'  node_modules size: {nm_size}')

    # 5. Restart PM2
    print('\n[5/5] Restarting PM2 process...')
    run_cmd(ssh, 'pm2 restart consult-rms')
    time.sleep(5)
    status = run_cmd(ssh, 'pm2 jlist')
    # Parse just consult-rms
    import json
    try:
        apps = json.loads(status)
        for a in apps:
            if a['name'] == 'consult-rms':
                print(f"  Status: {a['pm2_env']['status']}, Uptime: {a['pm2_env'].get('pm_uptime', '?')}, Restarts: {a['pm2_env']['restart_time']}")
    except:
        print(f'  Status: {status[:300]}')

    # Check for errors
    time.sleep(2)
    err_log = run_cmd(ssh, 'tail -30 /root/.pm2/logs/consult-rms-error.log')
    if err_log and 'RmsData' not in err_log:
        print(f'  No critical errors.')
    elif err_log:
        print(f'  Error log (last lines): {err_log[:600]}')
    out_log = run_cmd(ssh, 'tail -5 /root/.pm2/logs/consult-rms-out.log')
    print(f'  Out log: {out_log[:400]}')

    ssh.close()
    print('\nDeployment complete!')


if __name__ == '__main__':
    main()
