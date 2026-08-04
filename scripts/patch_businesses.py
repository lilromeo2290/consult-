#!/usr/bin/env python3
"""Patch businesses.tsx: add rate-overrides import and change displayAmount logic."""
import re

PATH = '/home/consult-rms-new/src/components/rms/businesses.tsx'

with open(PATH, 'r') as f:
    content = f.read()

# 1. Add import after FEE_CODE_LOOKUP import
old_import = "import { FEE_CODE_LOOKUP } from '@/lib/fee-code-lookup';"
new_import = """import { FEE_CODE_LOOKUP } from '@/lib/fee-code-lookup';
import { getRateOverride } from '@/lib/rate-overrides';"""
if old_import in content and 'rate-overrides' not in content:
    content = content.replace(old_import, new_import, 1)
    print('Added rate-overrides import')
else:
    print('Import already present or not found')

# 2. Replace displayAmount logic
old_logic = '''  // Use FEE_CODE_LOOKUP amount when available (from code selection), fallback to USER_CATEGORIES
  const codeLookupEntry = form.businessClassCode ? FEE_CODE_LOOKUP[form.businessClassCode] : null;
  const displayAmount = codeLookupEntry ? codeLookupEntry.amount : (selectedCategoryFee ? selectedCategoryFee.amount : null);'''

new_logic = '''  // Check rate overrides first (set via Rate Configuration), otherwise show nothing
  const displayAmount = form.businessClassCode
    ? getRateOverride(form.businessClassCode) ?? null
    : null;'''

if old_logic in content:
    content = content.replace(old_logic, new_logic, 1)
    print('Replaced displayAmount logic')
else:
    print('displayAmount logic not found - checking if already patched')
    if 'getRateOverride' in content.split('displayAmount')[0] if 'displayAmount' in content else False:
        print('Already patched')
    else:
        print('WARNING: Could not find patch target')

with open(PATH, 'w') as f:
    f.write(content)

print(f'Patched: {PATH}')
