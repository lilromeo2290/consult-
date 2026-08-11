with open('/home/z/my-project/src/components/rms/billing.tsx', 'r') as f:
    content = f.read()

# 1. Add payments data loading after building permits data
old_data_loading = '''  const [bpData] = useSyncedStorage<any[]>('rms-building-permits', []);
  // Field officers from user management'''

new_data_loading = '''  const [bpData] = useSyncedStorage<any[]>('rms-building-permits', []);
  // Payments data for arrears calculation
  const [paymentsData] = useSyncedStorage<any[]>('rms-payments', []);
  // Field officers from user management'''

assert old_data_loading in content, 'Could not find data loading section!'
content = content.replace(old_data_loading, new_data_loading, 1)

# 2. Update handleSelectEntity to also calculate arrears
old_handler = '''  const handleSelectEntity = (entity: { businessName: string; owner: string; category: string; location: string; uniqueNumber: string }) => {
    setFormData((p) => ({
      ...p,
      uniqueNumber: entity.uniqueNumber,
      businessName: entity.businessName,
      owner: entity.owner,
      category: entity.category,
      location: entity.location,
    }));
    setEntitySearch(entity.uniqueNumber);
    setShowEntityDropdown(false);
  };'''

new_handler = '''  const handleSelectEntity = (entity: { businessName: string; owner: string; category: string; location: string; uniqueNumber: string }) => {
    // Calculate arrears: sum of outstanding balances from existing unpaid/partial bills
    // for the same uniqueNumber + billType
    let arrears = 0;
    const entityBills = bills.filter(
      (b) => b.uniqueNumber === entity.uniqueNumber && b.billType === formData.billType && b.status !== 'Paid'
    );
    entityBills.forEach((b) => {
      const totalPaid = paymentsData
        .filter((p: any) => p.billNo === b.billNumber)
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      const outstanding = Math.max(0, (b.amountDue || 0) - totalPaid);
      arrears += outstanding;
    });

    setFormData((p) => ({
      ...p,
      uniqueNumber: entity.uniqueNumber,
      businessName: entity.businessName,
      owner: entity.owner,
      category: entity.category,
      location: entity.location,
      arrears,
    }));
    setEntitySearch(entity.uniqueNumber);
    setShowEntityDropdown(false);
  };'''

assert old_handler in content, 'Could not find handleSelectEntity!'
content = content.replace(old_handler, new_handler, 1)

# 3. Update the reset when modal opens to also clear arrears
old_reset = '''    setEntitySearch('');
    setShowEntityDropdown(false);
    setFormData({
      billType: 'BOP',
      uniqueNumber: '',
      businessName: '',
      owner: '',
      category: '',
      location: '',
      arrears: 0,
      charge: 0,
      amountDue: 0,
      dueDate: '',
    });'''

new_reset = '''    setEntitySearch('');
    setShowEntityDropdown(false);
    setFormData({
      billType: 'BOP',
      uniqueNumber: '',
      businessName: '',
      owner: '',
      category: '',
      location: '',
      arrears: 0,
      charge: 0,
      amountDue: 0,
      dueDate: '',
    });'''

# This is already correct, just verify
assert old_reset in content, 'Could not find reset block!'

# 4. Update handleBillTypeChange to also clear arrears when bill type changes
old_type_change = '''  const handleBillTypeChange = (value: Bill['billType']) => {
    setFormData((p) => ({
      ...p,
      billType: value,
      uniqueNumber: '',
      businessName: '',
      owner: '',
      category: '',
      location: '',
    }));
    setEntitySearch('');
    setShowEntityDropdown(false);
  };'''

new_type_change = '''  const handleBillTypeChange = (value: Bill['billType']) => {
    setFormData((p) => ({
      ...p,
      billType: value,
      uniqueNumber: '',
      businessName: '',
      owner: '',
      category: '',
      location: '',
      arrears: 0,
    }));
    setEntitySearch('');
    setShowEntityDropdown(false);
  };'''

assert old_type_change in content, 'Could not find handleBillTypeChange!'
content = content.replace(old_type_change, new_type_change, 1)

with open('/home/z/my-project/src/components/rms/billing.tsx', 'w') as f:
    f.write(content)

print('billing.tsx updated with arrears autofill successfully')
