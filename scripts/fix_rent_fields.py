#!/usr/bin/env python3
"""Fix all remaining old field references in rent.tsx"""
import re

path = '/home/z/my-project/src/components/rms/rent.tsx'
with open(path, 'r') as f:
    content = f.read()

# 1. Fix the form change handler - remove old rentClass/rentCategory/rentRevenue blocks
old_handler_block = '''    } else if (name === 'rentClass') {
      // Auto-fill category: if only one option, select it; otherwise reset
      const cats = RENT_CLASS_CATEGORIES[value] || [];
      const autoCat = cats.length === 1 ? cats[0] : '';
      const autoCode = autoCat ? (RENT_CODE_MAP[`${value}|${autoCat}`] || '') : '';
      setForm((prev) => ({ ...prev, rentClass: value, rentCategory: autoCat, rentCode: autoCode }));
    } else if (name === 'rentCategory') {
      // Auto-fill code when category is selected
      const code = RENT_CODE_MAP[`${form.rentClass}|${value}`] || '';
      setForm((prev) => ({ ...prev, rentCategory: value, rentCode: code }));
    } else if (name === 'rentRevenueDescription') {
      // Link Rent Revenue Description -> Rent Revenue Code
      setForm((prev) => ({
        ...prev,
        rentRevenueDescription: value,
        rentRevenueCode: DESCRIPTION_TO_CODE[value] || prev.rentRevenueCode,
      }));
    } else if (name === 'rentRevenueCode') {
      // Link Rent Revenue Code -> Rent Revenue Description
      setForm((prev) => ({
        ...prev,
        rentRevenueCode: value,
        rentRevenueDescription: CODE_TO_DESCRIPTION[value] || prev.rentRevenueDescription,
      }));
    } else {'''

new_handler_block = '''    } else if (name === 'rentPropertyType') {
      // Auto-fill type code and category when property type is selected
      const code = RENT_CODE_MAP[value] || '';
      const cats = RENT_CLASS_CATEGORIES[value] || [];
      const autoCat = cats.length === 1 ? cats[0] : '';
      setForm((prev) => ({
        ...prev,
        rentPropertyType: value,
        rentPropertyTypeCode: code,
        rentPropertyTypeCategory: autoCat,
      }));
    } else {'''

content = content.replace(old_handler_block, new_handler_block)

# 2. Fix handleEdit - Rent Object fields
old_edit_rent = '''      rentObjectName: rent.rentObjectName,
      rentRevenueCode: rent.rentRevenueCode || '',
      rentRevenueDescription: rent.rentRevenueDescription || '',
      rentCode: rent.rentCode || '',
      rentClass: rent.rentClass,
      rentCategory: rent.rentCategory || (RENT_CLASS_CATEGORIES[rent.rentClass]?.[0]) || '',
      rentUnit: rent.rentUnit,
      rentValue: rent.rentValue,
      vacant: rent.vacant,'''

new_edit_rent = '''      rentPropertyNumber: rent.rentPropertyNumber,
      rentPropertyTypeCode: rent.rentPropertyTypeCode || '',
      rentPropertyType: rent.rentPropertyType,
      rentPropertyTypeCategory: rent.rentPropertyTypeCategory || '',
      amount: rent.amount,
      vacant: rent.vacant,'''

content = content.replace(old_edit_rent, new_edit_rent)

# 3. Fix handleEdit - Renter fields
old_edit_renter = '''      renterAddress: rent.renterAddress,
      renterGhanaPostGPS: rent.renterGhanaPostGPS,
      renterLatitude: rent.renterLatitude,
      renterLongitude: rent.renterLongitude,
      phone: rent.phone,
      email: rent.email,
      tin: rent.tin,
      nationalId: rent.nationalId,'''

new_edit_renter = '''      occupantUniqueId: rent.occupantUniqueId || '',
      occupantName: rent.occupantName,
      occupantNationalId: rent.occupantNationalId,
      occupantAddress: rent.occupantAddress,
      occupantPhone: rent.occupantPhone,
      occupantEmail: rent.occupantEmail,'''

content = content.replace(old_edit_renter, new_edit_renter)

# 4. Fix Card 2: Rent Object -> Rent Property Information
old_card2 = '''        {/* ════════════════════════════════════════════════════════════════════
            CARD 2: RENT OBJECT
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <Building2 className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Rent Object</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Rent Object Name</label>
                <input type="text" name="rentObjectName" value={form.rentObjectName} onChange={handleFormChange} placeholder="Enter rent object name" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Rent Revenue Code</label>
                <input type="text" name="rentRevenueCode" value={form.rentRevenueCode} onChange={handleFormChange} placeholder="e.g. 1412025" className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className={`${labelClass} block`}>Rent Revenue Description</label>
                <input type="text" name="rentRevenueDescription" value={form.rentRevenueDescription} onChange={handleFormChange} placeholder="Select or enter revenue description" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Rent Class</label>
                <select name="rentClass" value={form.rentClass} onChange={handleFormChange} className={inputClass}>
                  <option value="">Select rent class</option>
                  {RENT_CLASSES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`${labelClass} block`}>Rent Unit</label>
                <select name="rentUnit" value={form.rentUnit} onChange={handleFormChange} className={inputClass}>
                  <option value="">Select unit</option>
                  {RENT_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`${labelClass} block`}>Vacant</label>
                <select name="vacant" value={form.vacant} onChange={handleFormChange} className={inputClass}>
                  {VACANT_OPTIONS.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`${labelClass} block`}>Rent Value (GHS)</label>
                <input type="number" name="rentValue" value={form.rentValue} onChange={handleFormChange} placeholder="0.00" min="0" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Category</label>
                <select name="rentCategory" value={form.rentCategory} onChange={handleFormChange} disabled={!form.rentClass} className={inputClass}>
                  <option value="">{form.rentClass ? 'Select category' : 'Select class first'}</option>
                  {(RENT_CLASS_CATEGORIES[form.rentClass] || []).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`${labelClass} block`}>Code</label>
                <input type="text" name="rentCode" value={form.rentCode} readOnly className={`${inputClass} bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-not-allowed`} placeholder="Auto-filled" />
              </div>
            </div>
          </div>
        </div>'''

new_card2 = '''        {/* ════════════════════════════════════════════════════════════════════
            CARD 2: RENT PROPERTY INFORMATION
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <Building2 className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Rent Property Information</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              <div>
                <label className={`${labelClass} block`}>Rent Property Number</label>
                <input type="text" name="rentPropertyNumber" value={form.rentPropertyNumber} onChange={handleFormChange} placeholder="Enter property number" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Rent Property Type Code</label>
                <input type="text" name="rentPropertyTypeCode" value={form.rentPropertyTypeCode} onChange={handleFormChange} placeholder="Auto-filled" className={`${inputClass} bg-slate-50 dark:bg-slate-900/40`} readOnly />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Rent Property Type</label>
                <select name="rentPropertyType" value={form.rentPropertyType} onChange={handleFormChange} className={inputClass}>
                  <option value="">Search to select property type</option>
                  {RENT_CLASSES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`${labelClass} block`}>Rent Property Type Category</label>
                <select name="rentPropertyTypeCategory" value={form.rentPropertyTypeCategory} onChange={handleFormChange} className={inputClass}>
                  <option value="">Select category</option>
                  {(RENT_CLASS_CATEGORIES[form.rentPropertyType] || []).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`${labelClass} block`}>Amount (GHS)</label>
                <input type="number" name="amount" value={form.amount} onChange={handleFormChange} placeholder="0.00" min="0" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Vacant</label>
                <select name="vacant" value={form.vacant} onChange={handleFormChange} className={inputClass}>
                  {VACANT_OPTIONS.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>'''

content = content.replace(old_card2, new_card2)

# 5. Fix Card 4: Renter Information -> Occupant's Information
old_card4 = '''        {/* ════════════════════════════════════════════════════════════════════
            CARD 4: RENTER INFORMATION
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <User className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Renter Information</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              {/* Renter Name — full width */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Renter Name <span className="text-red-500">*</span></label>
                <input type="text" name="renterName" value={form.renterName} onChange={handleFormChange} placeholder="Enter full name of renter" className={inputClass} />
              </div>
              {/* Renter Address | Renter GhanaPost GPS */}
              <div className="sm:col-span-2">
                <label className={`${labelClass} block`}>Renter Address</label>
                <input type="text" name="renterAddress" value={form.renterAddress} onChange={handleFormChange} placeholder="Enter renter address" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Renter GhanaPost GPS</label>
                <input type="text" name="renterGhanaPostGPS" value={form.renterGhanaPostGPS} onChange={handleFormChange} placeholder="XX-XXX-XXXX" className={inputClass} />
              </div>
              {/* Phone | Email | TIN */}
              <div>
                <label className={`${labelClass} block`}>Phone</label>
                <input type="text" name="phone" value={form.phone} onChange={handleFormChange} placeholder="e.g. 024 XXX XXXX" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Email</label>
                <input type="email" name="email" value={form.email} onChange={handleFormChange} placeholder="email@example.com" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>TIN</label>
                <input type="text" name="tin" value={form.tin} onChange={handleFormChange} placeholder="Tax Identification Number" className={inputClass} />
              </div>
              {/* National ID — full width */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>National ID</label>
                <input type="text" name="nationalId" value={form.nationalId} onChange={handleFormChange} placeholder="e.g. GHA-XXXXXXXXX" className={inputClass} />
              </div>
            </div>
          </div>
        </div>'''

new_card4 = '''        {/* ════════════════════════════════════════════════════════════════════
            CARD 4: OCCUPANT'S INFORMATION
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <User className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Occupant's Information</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              <div>
                <label className={`${labelClass} block`}>Unique ID</label>
                <input type="text" name="occupantUniqueId" value={form.occupantUniqueId} onChange={handleFormChange} placeholder="Auto-generated" className={`${inputClass} bg-slate-50 dark:bg-slate-900/40`} readOnly />
              </div>
              <div className="sm:col-span-2">
                <label className={`${labelClass} block`}>Occupant's Name <span className="text-red-500">*</span></label>
                <input type="text" name="occupantName" value={form.occupantName} onChange={handleFormChange} placeholder="Enter full name of occupant" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>National ID Number</label>
                <input type="text" name="occupantNationalId" value={form.occupantNationalId} onChange={handleFormChange} placeholder="e.g. GHA-XXXXXXXXX" className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className={`${labelClass} block`}>Address</label>
                <input type="text" name="occupantAddress" value={form.occupantAddress} onChange={handleFormChange} placeholder="Enter occupant address" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Phone Number</label>
                <input type="text" name="occupantPhone" value={form.occupantPhone} onChange={handleFormChange} placeholder="e.g. 024 XXX XXXX" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Email Address</label>
                <input type="email" name="occupantEmail" value={form.occupantEmail} onChange={handleFormChange} placeholder="email@example.com" className={inputClass} />
              </div>
            </div>
          </div>
        </div>'''

content = content.replace(old_card4, new_card4)

# 6. Fix table columns - rentObjectName -> rentPropertyType, rentClass -> rentPropertyTypeCategory, rentValue -> amount
content = content.replace(
    'rent.rentObjectName || \'--\'',
    'rent.rentPropertyType || \'--\''
)
content = content.replace(
    'rent.rentClass || \'--\'',
    'rent.rentPropertyTypeCategory || \'--\''
)
content = content.replace(
    'rent.rentValue ? `GHS ${Number(rent.rentValue).toLocaleString()}` : \'-\'',
    'rent.amount ? `GHS ${Number(rent.amount).toLocaleString()}` : \'-\''
)

# 7. Fix class filter options
content = content.replace(
    'RENT_CLASSES.map((c)',
    'RENT_CLASSES.map((c)'
)  # keep same

# 8. Fix save validation message
content = content.replace(
    "Please fill in the required field: Renter Name.",
    "Please fill in the required field: Occupant's Name."
)

with open(path, 'w') as f:
    f.write(content)

print('Done. Verifying no old references remain...')
old_refs = ['rentObjectName', 'rentRevenueCode', 'rentRevenueDescription', 'rentCode', 'rentClass', 'rentCategory', 'rentUnit', 'rentValue',
             'renterAddress', 'renterGhanaPost', 'renterLatitude', 'renterLongitude', 'form.phone', 'form.email', 'form.tin', 'nationalId']
for ref in old_refs:
    count = content.count(ref)
    if count > 0:
        print(f'  WARNING: {ref} still found {count} times')
    else:
        print(f'  OK: {ref} removed')
