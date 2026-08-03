'use client';

import { useState, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  Power,
  Save,
  X,
  Settings2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SubRate {
  id: string;
  name: string;
  amount: number;
}

interface RateType {
  id: string;
  name: string;
  category: 'Business' | 'Property' | 'Rent';
  subRates: SubRate[];
  status: 'Active' | 'Inactive';
  effectiveDate: string;
  expiryDate: string;
  annualIncrement: number;
}

interface RateFormData {
  id: string;
  name: string;
  category: 'Business' | 'Property' | 'Rent';
  subRateName: string;
  amount: number;
  effectiveDate: string;
  expiryDate: string;
  status: 'Active' | 'Inactive';
  annualIncrement: number;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const initialRates: RateType[] = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `GH₵ ${amount.toLocaleString()}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RateConfigPage() {
  const [rates, setRates] = useState<RateType[]>(initialRates);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showModal, setShowModal] = useState(false);
  const [editingRate, setEditingRate] = useState<RateType | null>(null);
  const [formData, setFormData] = useState<RateFormData>({
    id: '',
    name: '',
    category: 'Business',
    subRateName: '',
    amount: 0,
    effectiveDate: '',
    expiryDate: '',
    status: 'Active',
    annualIncrement: 0,
  });

  // ── Filtering ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return rates.filter((r) => {
      const matchSearch =
        searchQuery === '' ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory =
        categoryFilter === 'All' || r.category === categoryFilter;
      const matchStatus =
        statusFilter === 'All' || r.status === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [rates, searchQuery, categoryFilter, statusFilter]);

  // ── Toggle expand ───────────────────────────────────────────────────────

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── Toggle status ──────────────────────────────────────────────────────

  const toggleStatus = (id: string) => {
    setRates((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: r.status === 'Active' ? 'Inactive' : 'Active' }
          : r
      )
    );
  };

  // ── Delete ──────────────────────────────────────────────────────────────

  const handleDelete = (id: string) => {
    setRates((prev) => prev.filter((r) => r.id !== id));
  };

  // ── Modal open for Add ──────────────────────────────────────────────────

  const openAddModal = (preselectedCategory: 'Business' | 'Property' | 'Rent' = 'Business') => {
    setEditingRate(null);
    setFormData({
      id: '',
      name: '',
      category: preselectedCategory,
      subRateName: '',
      amount: 0,
      effectiveDate: '',
      expiryDate: '',
      status: 'Active',
      annualIncrement: 0,
    });
    setShowModal(true);
  };

  // ── Modal open for Edit ─────────────────────────────────────────────────

  const openEditModal = (rate: RateType) => {
    setEditingRate(rate);
    setFormData({
      id: rate.id,
      name: rate.name,
      category: rate.category,
      subRateName: rate.subRates[0]?.name ?? '',
      amount: rate.subRates[0]?.amount ?? 0,
      effectiveDate: rate.effectiveDate,
      expiryDate: rate.expiryDate,
      status: rate.status,
      annualIncrement: rate.annualIncrement,
    });
    setShowModal(true);
  };

  // ── Save ────────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!formData.name.trim() || !formData.subRateName.trim() || formData.amount <= 0) return;

    if (editingRate) {
      // Update existing rate
      setRates((prev) =>
        prev.map((r) =>
          r.id === editingRate.id
            ? {
                ...r,
                name: formData.name,
                category: formData.category,
                subRates: [{ id: r.subRates[0]?.id ?? `${r.id}-sub`, name: formData.subRateName, amount: formData.amount }],
                effectiveDate: formData.effectiveDate,
                expiryDate: formData.expiryDate,
                status: formData.status,
                annualIncrement: formData.annualIncrement,
              }
            : r
        )
      );
    } else {
      // Add new rate
      const newId = `RT-${String(rates.length + 1).padStart(3, '0')}`;
      const newRate: RateType = {
        id: newId,
        name: formData.name,
        category: formData.category,
        subRates: [{ id: `${newId}-sub`, name: formData.subRateName, amount: formData.amount }],
        effectiveDate: formData.effectiveDate,
        expiryDate: formData.expiryDate,
        status: formData.status,
        annualIncrement: formData.annualIncrement,
      };
      setRates((prev) => [...prev, newRate]);
    }

    setShowModal(false);
  };

  // ── CSS classes ──────────────────────────────────────────────────────────

  const inputClass =
    'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition';
  const labelClass =
    'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';
  const btnPrimary =
    'inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap';
  const btnSecondary =
    'inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap';

  // ── Compute display amount from sub-rates ────────────────────────────────

  const getDisplayAmount = (rate: RateType) => {
    if (rate.subRates.length === 1) return formatCurrency(rate.subRates[0].amount);
    const min = Math.min(...rate.subRates.map((s) => s.amount));
    const max = Math.max(...rate.subRates.map((s) => s.amount));
    return `${formatCurrency(min)} – ${formatCurrency(max)}`;
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Rate Configuration
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage revenue rate types, sub-rates, and fee structures.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => openAddModal('Business')} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap">
            <Plus className="w-4 h-4" />
            Add New Business Rate
          </button>
          <button onClick={() => openAddModal('Property')} className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap">
            <Plus className="w-4 h-4" />
            Add Property Rate
          </button>
          <button onClick={() => openAddModal('Rent')} className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap">
            <Plus className="w-4 h-4" />
            Add Rent Rate
          </button>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search rate types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={`${inputClass} w-full sm:w-44`}
        >
          <option value="All">All Categories</option>
          <option value="Business">Business</option>
          <option value="Property">Property</option>
          <option value="Rent">Rent</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${inputClass} w-full sm:w-44`}
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap w-10" />
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Rate Name
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Category
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Amount
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap hidden md:table-cell">
                  Effective Date
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap hidden md:table-cell">
                  Expiry Date
                </th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-12 text-slate-400 dark:text-slate-500"
                  >
                    <Settings2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    No rate types found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((rate) => {
                  const isExpanded = expandedRows.has(rate.id);
                  return (
                    <>
                      {/* Parent row */}
                      <tr
                        key={rate.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      >
                        <td
                          className="px-4 py-3 text-slate-400"
                          onClick={() => toggleExpand(rate.id)}
                        >
                          {rate.subRates.length > 1 ? (
                            isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )
                          ) : (
                            <span className="w-4 h-4 inline-block" />
                          )}
                        </td>
                        <td
                          className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap"
                          onClick={() => toggleExpand(rate.id)}
                        >
                          {rate.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              rate.category === 'Business'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                                : rate.category === 'Property'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                  : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
                            }`}
                          >
                            {rate.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                          {getDisplayAmount(rate)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              rate.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                            }`}
                          >
                            {rate.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap hidden md:table-cell">
                          {rate.effectiveDate}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap hidden md:table-cell">
                          {rate.expiryDate}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(rate)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleStatus(rate.id)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                              title="Toggle Status"
                            >
                              <Power className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(rate.id)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded sub-rate rows */}
                      {isExpanded && rate.subRates.length > 1 && (
                        <tr key={`${rate.id}-sub`} className="bg-slate-50/60 dark:bg-slate-800/30">
                          <td />
                          <td colSpan={7} className="py-0">
                            <div className="px-6 py-3">
                              <div className="ml-4 border-l-2 border-emerald-400 dark:border-emerald-600 pl-4">
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                                  Sub-Rates
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {rate.subRates.map((sr) => (
                                    <div
                                      key={sr.id}
                                      className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2.5"
                                    >
                                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {sr.name}
                                      </span>
                                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                        {formatCurrency(sr.amount)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                {rate.annualIncrement > 0 && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                    Annual increment: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{rate.annualIncrement}%</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Summary ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          Showing {filtered.length} of {rates.length} rate types
        </span>
        {rates.filter((r) => r.status === 'Active').length > 0 && (
          <span>
            {rates.filter((r) => r.status === 'Active').length} active &middot;{' '}
            {rates.filter((r) => r.status === 'Inactive').length} inactive
          </span>
        )}
      </div>

      {/* ── Add/Edit Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingRate ? `Edit ${formData.category} Rate` : `Add New ${formData.category} Rate`}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Rate Name */}
              <div>
                <label className={labelClass}>Rate Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Business Operating Permit"
                  className={inputClass}
                />
              </div>

              {/* Category */}
              <div>
                <label className={labelClass}>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      category: e.target.value as 'Business' | 'Property' | 'Rent',
                    }))
                  }
                  className={inputClass}
                >
                  <option value="Business">Business</option>
                  <option value="Property">Property</option>
                  <option value="Rent">Rent</option>
                </select>
              </div>

              {/* Sub-rate name + Amount row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Sub-rate Name</label>
                  <input
                    type="text"
                    value={formData.subRateName}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        subRateName: e.target.value,
                      }))
                    }
                    placeholder="e.g. Small, Medium"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Amount (GH₵)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.amount || ''}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        amount: Number(e.target.value),
                      }))
                    }
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Effective Date + Expiry Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Effective Date</label>
                  <input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        effectiveDate: e.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        expiryDate: e.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Annual Increment */}
              <div>
                <label className={labelClass}>Annual Increment (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.annualIncrement || ''}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      annualIncrement: Number(e.target.value),
                    }))
                  }
                  placeholder="0"
                  className={inputClass}
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Status
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formData.status === 'Active'
                      ? 'This rate type is currently active'
                      : 'This rate type is currently inactive'}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setFormData((p) => ({
                      ...p,
                      status:
                        p.status === 'Active' ? 'Inactive' : 'Active',
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                    formData.status === 'Active'
                      ? 'bg-emerald-600'
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                  role="switch"
                  aria-checked={formData.status === 'Active'}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
                      formData.status === 'Active'
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700 px-6 py-4">
              <button onClick={() => setShowModal(false)} className={btnSecondary}>
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className={btnPrimary}
                disabled={
                  !formData.name.trim() ||
                  !formData.subRateName.trim() ||
                  formData.amount <= 0
                }
              >
                <Save className="w-4 h-4" />
                {editingRate ? 'Update Rate' : 'Save Rate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
