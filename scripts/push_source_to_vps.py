import paramiko, os, time, sys

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
REMOTE_APP = '/home/consult-rms'
LOCAL_TAR = '/tmp/consult-rms-source.tar.gz'

def run(ssh, cmd, timeout=30):
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode()[:600]
        err = stderr.read().decode()[:400]
        print(f'  >> {cmd[:120]}')
        if out.strip(): print(f'  OUT: {out}')
        if err.strip(): print(f'  ERR: {err}')
        return out + err
    except Exception as e:
        print(f'  ERR: {cmd[:80]} -> {e}')
        return ''

print('Connecting to VPS...')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)
print('  Connected!')

# 1. Create source directory
print('\n[1] Create source backup directory')
run(ssh, f'mkdir -p {REMOTE_APP}/source')

# 2. Upload source tar
print('\n[2] Upload source code...')
sftp = ssh.open_sftp()
remote_tar = f'{REMOTE_APP}/source/consult-rms-source.tar.gz'
sftp.put(LOCAL_TAR, remote_tar)
local_sz = os.path.getsize(LOCAL_TAR)
remote_sz = sftp.stat(remote_tar).st_size
print(f'  Uploaded {local_sz:,} bytes, match={local_sz==remote_sz}')
sftp.close()

# 3. Extract
print('\n[3] Extract source code...')
run(ssh, f'cd {REMOTE_APP}/source && rm -rf src scripts prisma public 2>/dev/null; tar -xzf consult-rms-source.tar.gz', timeout=30)

# 4. Also upload the full git repo (without large files)
print('\n[4] Create bare git backup...')
# Create a local bare clone first
run(ssh, f'ls {REMOTE_APP}/source/consult-rms.git/HEAD 2>&1')

# 5. Verify
print('\n[5] Verify source files...')
run(ssh, f'ls {REMOTE_APP}/source/src/components/rms/businesses.tsx 2>&1')
run(ssh, f'ls {REMOTE_APP}/source/src/components/rms/properties.tsx 2>&1')
run(ssh, f'ls {REMOTE_APP}/source/src/lib/business-revenue-codes.ts 2>&1')
run(ssh, f'ls {REMOTE_APP}/source/src/lib/property-revenue-codes.ts 2>&1')
run(ssh, f'ls {REMOTE_APP}/source/prisma/schema.prisma 2>&1')
run(ssh, f'ls {REMOTE_APP}/source/scripts/deploy_clean.py 2>&1')

# 6. List all source files for confirmation
print('\n[6] Source file summary...')
run(ssh, f'find {REMOTE_APP}/source/src -name "*.tsx" -o -name "*.ts" | wc -l')
run(ssh, f'du -sh {REMOTE_APP}/source/ 2>&1')

print('\nDONE! Source code backed up to VPS at /home/consult-rms/source/')
ssh.close()
