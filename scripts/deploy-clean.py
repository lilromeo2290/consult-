"""
Clean deploy script — wipes old build completely, rebuilds, deploys fresh.
Prevents: mixed-build chunks that caused 'Application error: client-side exception'.

Usage: python3 scripts/deploy-clean.py
"""
import paramiko, time, json, os, subprocess, sys, re

HOST, USER, PASS = '153.75.247.4', 'root', 'Do1_BuZe4_M1-V6v1_S4'
BASE = '/home/consult-rms'
PROJECT = '/home/z/my-project'

def ssh_cmd(ssh, cmd, timeout=60):
    si, so, se = ssh.exec_command(cmd, timeout=timeout)
    out = so.read().decode().strip()
    err = se.read().decode().strip()
    if err and 'warning' not in err.lower():
        print(f'  STDERR: {err[:300]}')
    return out

def main():
    # ── Step 1: Clean local build ─────────────────────────────────────────
    print('=== Step 1: Clean local build ===')
    subprocess.run(['rm', '-rf', f'{PROJECT}/.next'], check=True)
    print('  Old .next removed.')

    # ── Step 2: Prisma generate (for rhel-openssl-1.1.x) ───────────────────
    print('=== Step 2: Prisma generate ===')
    r = subprocess.run(['npx', 'prisma', 'generate'], cwd=PROJECT, capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        print(f'  Prisma generate FAILED: {r.stderr[:500]}')
        sys.exit(1)
    print('  Prisma generated successfully.')

    # ── Step 3: Next.js build ─────────────────────────────────────────────
    print('=== Step 3: Next.js build ===')
    r = subprocess.run(['npx', 'next', 'build'], cwd=PROJECT, capture_output=True, text=True, timeout=300)
    if r.returncode != 0:
        print(f'  Build FAILED: {r.stderr[:1000]}')
        print(r.stdout[-2000:] if len(r.stdout) > 2000 else r.stdout)
        sys.exit(1)
    print('  Build succeeded.')

    build_id = open(f'{PROJECT}/.next/BUILD_ID').read().strip()
    static_chunks = os.listdir(f'{PROJECT}/.next/static/chunks/')
    print(f'  BUILD_ID: {build_id}')
    print(f'  Static chunks: {len(static_chunks)} files')

    # ── Step 4: Create tarballs ───────────────────────────────────────────
    print('=== Step 4: Creating tarballs ===')
    os.makedirs('/tmp', exist_ok=True)
    subprocess.run(['tar', 'czf', '/tmp/rms-standalone.tar.gz', '-C', f'{PROJECT}/.next', 'standalone'], check=True)
    subprocess.run(['tar', 'czf', '/tmp/rms-static.tar.gz', '-C', f'{PROJECT}/.next', 'static'], check=True)
    subprocess.run(['tar', 'czf', '/tmp/rms-public.tar.gz', '-C', PROJECT, 'public'], check=True)
    print('  Tarballs created.')

    # ── Step 5: Connect & wipe server completely ──────────────────────────
    print('=== Step 5: Connecting to server ===')
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=20)
    print('  Connected.')

    print('=== Step 6: Wiping old build on server ===')
    ssh_cmd(ssh, f'rm -rf {BASE}/.next {BASE}/server.js {BASE}/node_modules')
    print('  Old .next, server.js, node_modules wiped.')

    # ── Step 7: Upload and extract standalone ─────────────────────────────
    # Tar contains: standalone/server.js, standalone/.next/..., standalone/node_modules/...
    # Extract to BASE, then move standalone/* up to BASE/
    print('=== Step 7: Deploying standalone ===')
    sftp = ssh.open_sftp()
    sftp.put('/tmp/rms-standalone.tar.gz', f'{BASE}/rms-standalone.tar.gz')
    sftp.close()
    ssh_cmd(ssh, f'cd {BASE} && tar xzf rms-standalone.tar.gz && rm -f rms-standalone.tar.gz')
    # Now: {BASE}/standalone/server.js, {BASE}/standalone/.next, {BASE}/standalone/node_modules
    ssh_cmd(ssh, f'cd {BASE} && mv standalone/server.js . && mv standalone/.next . && mv standalone/node_modules . && rm -rf standalone')
    # Now: {BASE}/server.js, {BASE}/.next/BUILD_ID, {BASE}/.next/server, {BASE}/node_modules
    print('  Standalone deployed and flattened.')

    # ── Step 8: Upload and extract static ─────────────────────────────────
    # Tar contains: static/chunks/..., static/media/...
    # Extract to {BASE}/.next/ without strip → {BASE}/.next/static/...
    print('=== Step 8: Deploying static assets ===')
    sftp = ssh.open_sftp()
    sftp.put('/tmp/rms-static.tar.gz', f'{BASE}/rms-static.tar.gz')
    sftp.close()
    ssh_cmd(ssh, f'mkdir -p {BASE}/.next && cd {BASE}/.next && tar xzf ../rms-static.tar.gz && rm -f ../rms-static.tar.gz')
    # Now: {BASE}/.next/static/chunks/..., {BASE}/.next/static/media/...
    print('  Static assets deployed.')

    # ── Step 9: Upload and extract public ─────────────────────────────────
    if os.path.exists('/tmp/rms-public.tar.gz'):
        print('=== Step 9: Deploying public ===')
        sftp = ssh.open_sftp()
        sftp.put('/tmp/rms-public.tar.gz', f'{BASE}/rms-public.tar.gz')
        sftp.close()
        ssh_cmd(ssh, f'cd {BASE} && tar xzf rms-public.tar.gz && rm -f rms-public.tar.gz')
        print('  Public assets deployed.')

    # ── Step 10: Verify BUILD_ID ──────────────────────────────────────────
    print('=== Step 10: Verifying BUILD_ID ===')
    server_bid = ssh_cmd(ssh, f'cat {BASE}/.next/BUILD_ID')
    print(f'  Server BUILD_ID: {server_bid}')
    print(f'  Local  BUILD_ID: {build_id}')
    assert server_bid == build_id, 'BUILD_ID mismatch!'
    print('  BUILD_ID match confirmed.')

    chunk_count = ssh_cmd(ssh, f'ls {BASE}/.next/static/chunks/ | wc -l')
    print(f'  Static chunks on server: {chunk_count}')

    # ── Step 11: Restart PM2 ─────────────────────────────────────────────
    print('=== Step 11: Restarting PM2 ===')
    ssh_cmd(ssh, 'pm2 delete consult-rms 2>/dev/null')
    ssh_cmd(ssh, f'cd {BASE} && DATABASE_URL="file:{BASE}/data/rms.db" PORT=3001 pm2 start server.js --name consult-rms')
    time.sleep(4)

    # ── Step 12: Final verification ───────────────────────────────────────
    print('=== Step 12: Verification ===')
    status = ssh_cmd(ssh, 'pm2 jlist')
    try:
        apps = json.loads(status)
        for a in apps:
            if a['name'] == 'consult-rms':
                print(f"  PM2 Status: {a['pm2_env']['status']}")
    except: pass

    http_code = ssh_cmd(ssh, 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/')
    print(f'  HTTP: {http_code}')

    html = ssh_cmd(ssh, 'curl -s http://localhost:3001/')
    chunks_in_html = set(re.findall(r'/_next/static/chunks/([a-f0-9]+\.[a-z]+)', html))
    print(f'  Chunks in HTML: {len(chunks_in_html)}')

    missing = []
    for chunk in chunks_in_html:
        exists = ssh_cmd(ssh, f'test -f {BASE}/.next/static/chunks/{chunk} && echo yes || echo no')
        if 'no' in exists:
            missing.append(chunk)
    if missing:
        print(f'  *** MISSING CHUNKS: {missing} ***')
        sys.exit(1)
    else:
        print('  All chunks verified!')

    err = ssh_cmd(ssh, 'tail -3 /root/.pm2/logs/consult-rms-error.log 2>/dev/null')
    if err:
        print(f'  Error log: {err[:300]}')
    else:
        print('  No errors.')

    ssh_cmd(ssh, 'pm2 save')
    ssh.close()
    print('=== Deploy complete! ===')

if __name__ == '__main__':
    main()
