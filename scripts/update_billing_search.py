import re

with open('/home/z/my-project/src/components/rms/billing.tsx', 'r') as f:
    content = f.read()

# 1. Replace the lookupEntity function with searchEntities
old_func = '''// Lookup an entity by unique number across all data sources
function lookupEntity(
  uniqueNumber: string,
  billType: Bill['billType'],
  businesses: any[],
  properties: any[],
  rents: any[],
  buildingPermits: any[],
): { businessName: string; owner: string; category: string; location: string } | null {
  const num = uniqueNumber.trim().toLowerCase();
  if (!num) return null;

  if (billType === 'BOP') {
    const biz = businesses.find(
      (b) => (b.regNumber || '').toLowerCase() === num,
    );
    if (biz) return { businessName: biz.name || '', owner: biz.owner || '', category: biz.type || biz.category || '', location: biz.businessAddress || '' };
  } else if (billType === 'Property Rate') {
    const prop = properties.find(
      (p) => (p.propNumber || '').toLowerCase() === num,
    );
    if (prop) {
      const useType = prop.propertyUseType || '';
      const classLabel = useType.split(':')[1]?.trim() || useType || prop.category || '';
      const loc = [prop.streetName, prop.houseNo, prop.locality].filter(Boolean).join(', ');
      return { businessName: prop.ownerName || '', owner: prop.ownerName || '', category: classLabel, location: loc || prop.ownerAddress || '' };
    }
  } else if (billType === 'Rent') {
    const rent = rents.find(
      (r) => (r.rentPropertyNumber || '').toLowerCase() === num || (r.id || '').toLowerCase() === num,
    );
    if (rent) return { businessName: rent.occupantName || '', owner: rent.occupantName || '', category: rent.rentPropertyType || '', location: rent.rentPropertyLocation || '' };
  } else if (billType === 'BP') {
    const bp = buildingPermits.find(
      (b) => (b.permitNumber || '').toLowerCase() === num || (b.id || '').toLowerCase() === num,
    );
    if (bp) return { businessName: bp.applicantFullName || '', owner: bp.applicantFullName || '', category: bp.typeOfDevelopment || '', location: bp.siteLocation || '' };
  }
  return null;
}'''

new_func = '''// Search entities across all data sources by unique number, business name, or owner
function searchEntities(
  query: string,
  billType: Bill['billType'],
  businesses: any[],
  properties: any[],
  rents: any[],
  buildingPermits: any[],
): { businessName: string; owner: string; category: string; location: string; uniqueNumber: string }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: { businessName: string; owner: string; category: string; location: string; uniqueNumber: string }[] = [];

  if (billType === 'BOP') {
    businesses.forEach((b) => {
      const num = (b.regNumber || '').toLowerCase();
      const name = (b.name || '').toLowerCase();
      const own = (b.owner || '').toLowerCase();
      if (num.includes(q) || name.includes(q) || own.includes(q)) {
        results.push({
          uniqueNumber: b.regNumber || '',
          businessName: b.name || '',
          owner: b.owner || '',
          category: b.type || b.category || '',
          location: b.businessAddress || '',
        });
      }
    });
  } else if (billType === 'Property Rate') {
    properties.forEach((p) => {
      const num = (p.propNumber || p.id || '').toLowerCase();
      const name = (p.ownerName || p.propertyName || '').toLowerCase();
      const own = (p.ownerName || '').toLowerCase();
      if (num.includes(q) || name.includes(q) || own.includes(q)) {
        const useType = p.propertyUseType || '';
        const classLabel = useType.split(':')[1]?.trim() || useType || p.category || '';
        const loc = [p.streetName, p.houseNo, p.locality].filter(Boolean).join(', ');
        results.push({
          uniqueNumber: p.propNumber || p.id || '',
          businessName: p.ownerName || p.propertyName || '',
          owner: p.ownerName || '',
          category: classLabel,
          location: loc || p.ownerAddress || '',
        });
      }
    });
  } else if (billType === 'Rent') {
    rents.forEach((r) => {
      const num = (r.rentPropertyNumber || r.id || '').toLowerCase();
      const name = (r.occupantName || '').toLowerCase();
      const own = (r.occupantName || '').toLowerCase();
      if (num.includes(q) || name.includes(q) || own.includes(q)) {
        results.push({
          uniqueNumber: r.rentPropertyNumber || r.id || '',
          businessName: r.occupantName || '',
          owner: r.occupantName || '',
          category: r.rentPropertyType || '',
          location: r.rentPropertyLocation || '',
        });
      }
    });
  } else if (billType === 'BP') {
    buildingPermits.forEach((b) => {
      const num = (b.permitNumber || b.id || '').toLowerCase();
      const name = (b.applicantFullName || '').toLowerCase();
      const own = (b.applicantFullName || '').toLowerCase();
      if (num.includes(q) || name.includes(q) || own.includes(q)) {
        results.push({
          uniqueNumber: b.permitNumber || b.id || '',
          businessName: b.applicantFullName || '',
          owner: b.applicantFullName || '',
          category: b.typeOfDevelopment || '',
          location: b.siteLocation || '',
        });
      }
    });
  }
  return results.slice(0, 20);
}'''

assert old_func in content, "Could not find old lookupEntity function!"
content = content.replace(old_func, new_func, 1)

# 2. Replace handleUniqueNumberChange and handleBillTypeChange
old_handlers = '''  // Auto-lookup when unique number changes
  const handleUniqueNumberChange = (value: string) => {
    setFormData((p) => ({ ...p, uniqueNumber: value }));
    if (!value.trim()) return;
    const found = lookupEntity(value, formData.billType, bizData, propData, rentData, bpData);
    if (found) {
      setFormData((p) => ({
        ...p,
        businessName: found.businessName,
        owner: found.owner,
        category: found.category,
        location: found.location,
      }));
    }
  };

  // Auto-lookup when bill type changes (re-lookup with existing number)
  const handleBillTypeChange = (value: Bill['billType']) => {
    setFormData((p) => ({
      ...p,
      billType: value,
      businessName: '',
      owner: '',
      category: '',
      location: '',
    }));
    // If unique number already entered, re-lookup for new type
    if (formData.uniqueNumber.trim()) {
      const found = lookupEntity(formData.uniqueNumber, value, bizData, propData, rentData, bpData);
      if (found) {
        setFormData((p) => ({
          ...p,
          billType: value,
          businessName: found.businessName,
          owner: found.owner,
          category: found.category,
          location: found.location,
        }));
      }
    }
  };'''

new_handlers = '''  // Search input state for the modal
  const [entitySearch, setEntitySearch] = useState('');
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const entitySearchResults = useMemo(() => {
    if (!entitySearch.trim()) return [];
    return searchEntities(entitySearch, formData.billType, bizData, propData, rentData, bpData);
  }, [entitySearch, formData.billType, bizData, propData, rentData, bpData]);

  const handleSelectEntity = (entity: { businessName: string; owner: string; category: string; location: string; uniqueNumber: string }) => {
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
  };

  // Auto-lookup when bill type changes (clear search)
  const handleBillTypeChange = (value: Bill['billType']) => {
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

assert old_handlers in content, "Could not find old handler functions!"
content = content.replace(old_handlers, new_handlers, 1)

# 3. Replace the Unique Number input field with Search
old_input = '''              {/* 2. Enter Unique Number */}
              <div>
                <label className={labelClass}>Unique Number</label>
                <input
                  type="text"
                  value={formData.uniqueNumber}
                  onChange={(e) => handleUniqueNumberChange(e.target.value)}
                  className={inputClass}
                  placeholder="Enter registration / property / rent number"
                />
              </div>'''

new_input = '''              {/* 2. Search (Unique Number / Business Name / Owner) */}
              <div className="relative">
                <label className={labelClass}>Search <span className="text-xs text-slate-400 font-normal">(Unique Number / Business Name / Owner)</span></label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={entitySearch}
                    onChange={(e) => {
                      setEntitySearch(e.target.value);
                      setShowEntityDropdown(true);
                      if (!e.target.value.trim()) {
                        setFormData((p) => ({ ...p, uniqueNumber: '', businessName: '', owner: '', category: '', location: '' }));
                      }
                    }}
                    onFocus={() => {
                      if (entitySearch.trim()) setShowEntityDropdown(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowEntityDropdown(false), 200);
                    }}
                    className={`${inputClass} pl-10`}
                    placeholder="Type to search by unique number, business name, or owner..."
                  />
                </div>
                {showEntityDropdown && entitySearchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg">
                    {entitySearchResults.map((entity, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectEntity(entity)}
                        className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-b border-slate-100 dark:border-slate-700 last:border-b-0 transition-colors"
                      >
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{entity.businessName || entity.uniqueNumber}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {entity.uniqueNumber}{entity.owner && entity.owner !== entity.businessName ? ` · ${entity.owner}` : ''}{entity.category ? ` · ${entity.category}` : ''}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                {showEntityDropdown && entitySearch.trim() && entitySearchResults.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg px-4 py-3">
                    <p className="text-sm text-slate-400 dark:text-slate-500">No matching entities found.</p>
                  </div>
                )}
              </div>'''

assert old_input in content, "Could not find old Unique Number input!"
content = content.replace(old_input, new_input, 1)

# 4. Update the placeholders on autofilled fields
content = content.replace('placeholder="Auto-filled from Unique Number"', 'placeholder="Auto-filled from search"', -1)

# 5. Also update the modal reset when generating a bill to clear entitySearch
old_reset = '''    setShowModal(false);
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

new_reset = '''    setShowModal(false);
    setEntitySearch('');
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

assert old_reset in content, "Could not find old reset block!"
content = content.replace(old_reset, new_reset, 1)

with open('/home/z/my-project/src/components/rms/billing.tsx', 'w') as f:
    f.write(content)

print("billing.tsx updated successfully")
