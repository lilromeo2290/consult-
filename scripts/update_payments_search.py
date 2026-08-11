import re

with open('/home/z/my-project/src/components/rms/payments.tsx', 'r') as f:
    content = f.read()

# 1. Add billSearchInput state after existing state declarations
old_modal_state = '''  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [payRevenueCategory, setPayRevenueCategory] = useState<BillType | ''>('');
  const [selectedBillNo, setSelectedBillNo] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Cash');
  const [payReference, setPayReference] = useState('');
  const [payRemarks, setPayRemarks] = useState('');'''

new_modal_state = '''  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [payRevenueCategory, setPayRevenueCategory] = useState<BillType | ''>('');
  const [selectedBillNo, setSelectedBillNo] = useState('');
  const [billSearchInput, setBillSearchInput] = useState('');
  const [showBillDropdown, setShowBillDropdown] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Cash');
  const [payReference, setPayReference] = useState('');
  const [payRemarks, setPayRemarks] = useState('');'''

assert old_modal_state in content, "Could not find old modal state!"
content = content.replace(old_modal_state, new_modal_state, 1)

# 2. Add billSearchResults useMemo after autoFill
old_autofill_end = '''  }, [selectedBillNo, availableBills]);'''

new_autofill_end = '''  }, [selectedBillNo, availableBills]);

  const billSearchResults = useMemo(() => {
    if (!billSearchInput.trim()) return availableBills;
    const q = billSearchInput.trim().toLowerCase();
    return availableBills.filter((b) => {
      return (b.billNo || '').toLowerCase().includes(q) ||
             (b.business || '').toLowerCase().includes(q) ||
             (b.owner || '').toLowerCase().includes(q) ||
             (b.uniqueNumber || '').toLowerCase().includes(q);
    });
  }, [billSearchInput, availableBills]);

  const handleSelectBill = (bill: typeof availableBills[0]) => {
    setSelectedBillNo(bill.billNo);
    setBillSearchInput(bill.billNo);
    setShowBillDropdown(false);
  };'''

assert old_autofill_end in content, "Could not find autoFill useMemo end!"
content = content.replace(old_autofill_end, new_autofill_end, 1)

# 3. Update openModal to reset new state
old_open = '''  const openModal = () => {
    setPayRevenueCategory('');
    setSelectedBillNo('');
    setPayAmount('');
    setPayMethod('Cash');
    setPayReference('');
    setPayRemarks('');
    setModalOpen(true);
  };'''

new_open = '''  const openModal = () => {
    setPayRevenueCategory('');
    setSelectedBillNo('');
    setBillSearchInput('');
    setShowBillDropdown(false);
    setPayAmount('');
    setPayMethod('Cash');
    setPayReference('');
    setPayRemarks('');
    setModalOpen(true);
  };'''

assert old_open in content, "Could not find old openModal!"
content = content.replace(old_open, new_open, 1)

# 4. Update revenue category onChange to also reset search
old_cat_change = '''                  onChange={(e) => {
                      setPayRevenueCategory(e.target.value as BillType | '');
                      setSelectedBillNo('');
                    }}'''

new_cat_change = '''                  onChange={(e) => {
                      setPayRevenueCategory(e.target.value as BillType | '');
                      setSelectedBillNo('');
                      setBillSearchInput('');
                      setShowBillDropdown(false);
                    }}'''

assert old_cat_change in content, "Could not find old category change handler!"
content = content.replace(old_cat_change, new_cat_change, 1)

# 5. Replace the Select Bill Number dropdown with Search input
old_bill_select = '''              {/* 2. Select Bill Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Bill Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedBillNo}
                    onChange={(e) => setSelectedBillNo(e.target.value)}
                    disabled={!payRevenueCategory}
                    className="w-full appearance-none rounded-lg border border-gray-300 py-2.5 pl-3 pr-9 text-sm text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">{payRevenueCategory ? 'Select a bill\u2026' : 'Select a revenue category first'}</option>
                    {availableBills.map((b) => (
                      <option key={b.billNo} value={b.billNo}>
                        {b.billNo} — {b.uniqueNumber}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
                {payRevenueCategory && availableBills.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1 font-medium">No unpaid bills found for this category.</p>
                )}
              </div>'''

new_bill_select = '''              {/* 2. Search (Bill Number / Business Name / Owner Name) */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search <span className="text-xs text-gray-400 font-normal">(Bill Number / Business Name / Owner Name)</span> <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={billSearchInput}
                    onChange={(e) => {
                      setBillSearchInput(e.target.value);
                      setSelectedBillNo('');
                      setShowBillDropdown(true);
                    }}
                    onFocus={() => {
                      setShowBillDropdown(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowBillDropdown(false), 200);
                    }}
                    disabled={!payRevenueCategory}
                    placeholder={payRevenueCategory ? 'Search by bill number, business name, or owner...' : 'Select a revenue category first'}
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                {showBillDropdown && billSearchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {billSearchResults.map((b) => (
                      <button
                        key={b.billNo}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectBill(b)}
                        className={`w-full text-left px-4 py-2.5 hover:bg-emerald-50 border-b border-gray-100 last:border-b-0 transition-colors ${selectedBillNo === b.billNo ? 'bg-emerald-50' : ''}`}
                      >
                        <p className="text-sm font-medium text-gray-900 truncate">{b.billNo}{b.uniqueNumber ? ` — ${b.uniqueNumber}` : ''}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{b.business}{b.owner && b.owner !== b.business ? ` · ${b.owner}` : ''}</p>
                        <p className="text-xs text-emerald-600 font-medium mt-0.5">Balance: GH\u20a8 {b.balance.toLocaleString('en-GH', { minimumFractionDigits: b.balance % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}</p>
                      </button>
                    ))}
                  </div>
                )}
                {showBillDropdown && billSearchInput.trim() && billSearchResults.length === 0 && payRevenueCategory && (
                  <div className="absolute z-50 w-full mt-1 rounded-lg border border-gray-200 bg-white shadow-lg px-4 py-3">
                    <p className="text-sm text-gray-400">No matching bills found.</p>
                  </div>
                )}
                {payRevenueCategory && availableBills.length === 0 && !billSearchInput.trim() && (
                  <p className="text-xs text-amber-600 mt-1 font-medium">No unpaid bills found for this category.</p>
                )}
              </div>'''

assert old_bill_select in content, "Could not find old bill select!"
content = content.replace(old_bill_select, new_bill_select, 1)

with open('/home/z/my-project/src/components/rms/payments.tsx', 'w') as f:
    f.write(content)

print("payments.tsx updated successfully")
