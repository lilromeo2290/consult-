#!/bin/bash
echo "=== Test BP API ==="
curl -s "http://localhost:3008/api/rms-data?key=rms-building-permits" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Key:', d.get('key'))
data = d.get('data')
if isinstance(data, list):
    print('Records:', len(data))
    if data:
        print('First record keys:', list(data[0].keys()))
        print('permitNumber:', data[0].get('permitNumber'))
        print('applicantFullName:', data[0].get('applicantFullName'))
else:
    print('Data is:', type(data).__name__, str(data)[:200])
"
echo "=== Test error logs ==="
pm2 logs kpma-rms --lines 5 --nostream 2>&1 | grep -i error | tail -3
