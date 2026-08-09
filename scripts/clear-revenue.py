import paramiko, json, sys

HOST, USER, PASS = '153.75.247.4', 'root', 'Do1_BuZe4_M1-V6v1_S4'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

# Step 1: Read current businesses JSON from DB
print('Reading current businesses data...')
cmd = "sqlite3 /home/consult-rms/data/rms.db 'SELECT data FROM RmsData WHERE key=\"rms-businesses\"'"
si, so, se = ssh.exec_command(cmd, timeout=30)
raw = so.read().decode().strip()

if not raw:
    print('No businesses data found in database.')
    ssh.close()
    sys.exit(0)

businesses = json.loads(raw)
print(f'Total businesses: {len(businesses)}')

# Step 2: Clear revenue code and description fields
cleared = 0
for b in businesses:
    had = b.get('code') or b.get('revenueDescription') or b.get('revenueDescription2') or b.get('revenueCode')
    if had:
        cleared += 1
    b['code'] = ''
    b['revenueDescription'] = ''
    b['revenueDescription2'] = ''
    b['revenueCode'] = ''

print(f'Businesses that had revenue data: {cleared}')

# Step 3: Write back to DB
new_json = json.dumps(businesses, ensure_ascii=False)
print(f'Writing back ({len(new_json)} bytes)...')

# Write to a temp file on server
sftp = ssh.open_sftp()

# Write the SQL script to a file
sql = """UPDATE RmsData SET data = readfile('/tmp/biz_update.json') WHERE key = 'rms-businesses';
"""
with sftp.open('/tmp/update_biz.sql', 'w') as f:
    f.write(sql)

with sftp.open('/tmp/biz_update.json', 'w') as f:
    f.write(new_json)
sftp.close()

si, so, se = ssh.exec_command("sqlite3 /home/consult-rms/data/rms.db < /tmp/update_biz.sql", timeout=30)
err = se.read().decode().strip()
if err:
    print(f'Error: {err}')
else:
    print('Successfully cleared Revenue Code and Revenue Description for all businesses.')

# Verify
si, so, se = ssh.exec_command("""sqlite3 /home/consult-rms/data/rms.db "SELECT length(data) FROM RmsData WHERE key='rms-businesses'""""", timeout=10)
print(f'Verify - new data length: {so.read().decode().strip()} bytes')

# Cleanup
ssh.exec_command('rm -f /tmp/biz_update.json /tmp/update_biz.sql', timeout=5)

ssh.close()
print('Done.')
