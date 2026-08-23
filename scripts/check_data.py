#!/usr/bin/env python3
import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4')

# Check building permits data
stdin, stdout, stderr = ssh.exec_command(
    'sqlite3 /home/kpma-rms-build-fresh/db/custom.db \"SELECT data FROM RmsData WHERE key = \'rms-building-permits\';\"'
)
raw = stdout.read().decode().strip()
if raw:
    data = json.loads(raw)
    print(f"Total permits: {len(data)}")
    if data:
        # Show first record's keys and values
        print(f"\nKeys in first record: {list(data[0].keys())}")
        print(f"\nFirst record:")
        for k, v in data[0].items():
            print(f"  {k}: {v}")
        # Show all permitNumbers and permitStatuses
        print(f"\nAll permit numbers and statuses:")
        for p in data:
            pn = p.get('permitNumber', 'N/A')
            ps = p.get('permitStatus', 'N/A')
            name = p.get('applicantFullName', 'N/A')
            print(f"  {pn} | {ps} | {name}")
else:
    print('No data found for rms-building-permits')

print('\n--- BP Official reviews ---')
stdin, stdout, stderr = ssh.exec_command(
    'sqlite3 /home/kpma-rms-build-fresh/db/custom.db \"SELECT substr(data, 1, 3000) FROM RmsData WHERE key = \'rms-bp-official\';\"'
)
raw2 = stdout.read().decode().strip()
if raw2:
    data2 = json.loads(raw2)
    print(f"Total reviews: {len(data2)}")
    if data2:
        for r in data2:
            print(f"  appNum: {r.get('applicationNumber')} | routingStatus: {r.get('routingStatus')} | status: {r.get('status')} | name: {r.get('applicantFullName')}")
else:
    print('No data found for rms-bp-official')

ssh.close()
