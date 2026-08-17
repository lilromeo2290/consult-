#!/bin/bash
echo "=== Tables in rms.db ==="
sqlite3 /home/kpma-rms/rms.db ".tables" 2>/dev/null
echo "=== Tables in custom.db ==="
sqlite3 /home/kpma-rms-build-fresh/db/custom.db ".tables" 2>/dev/null
echo "=== Check bp data in custom.db ==="
sqlite3 /home/kpma-rms-build-fresh/db/custom.db "SELECT key, length(data) as data_len FROM RmsData;" 2>/dev/null
echo "=== Check bp data key ==="
sqlite3 /home/kpma-rms-build-fresh/db/custom.db "SELECT key FROM RmsData WHERE key LIKE '%building%' OR key LIKE '%permit%';" 2>/dev/null
