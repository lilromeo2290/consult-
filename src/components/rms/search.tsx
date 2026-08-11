'use client';

import { useState } from 'react';
import { Search, Building2, Home, FileText, Receipt, Hash, Phone, MapPin, CreditCard, User, X } from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'business' | 'property' | 'bill' | 'receipt';
  title: string;
  subtitle: string;
  detail: string;
  amount?: string;
  status?: string;
  statusColor?: string;
}

const MOCK_RESULTS: SearchResult[] = [];

const SEARCH_CATEGORIES = [
  { id: 'all', label: 'All', icon: Search },
  { id: 'business', label: 'Businesses', icon: Building2 },
  { id: 'property', label: 'Properties', icon: Home },
  { id: 'bill', label: 'Bills', icon: FileText },
  { id: 'receipt', label: 'Receipts', icon: Receipt },
];

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  const results = query.trim().length > 0
    ? MOCK_RESULTS.filter((r) => {
      if (category !== 'all' && r.type !== category) return false;
      const q = query.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.detail.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q);
    })
    : [];

  const typeIcon = (type: string) => {
    switch (type) {
      case 'business': return Building2;
      case 'property': return Home;
      case 'bill': return FileText;
      case 'receipt': return Receipt;
      default: return Hash;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Global Search</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Search across businesses, properties, bills, and receipts</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, owner, bill number, receipt number, GPS address, Ghana Card, TIN..."
          className="w-full pl-12 pr-12 py-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-[#0B1D3E] focus:border-[#0B1D3E] outline-none transition"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Quick filters */}
      <div className="flex gap-2 overflow-x-auto">
        {SEARCH_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              category === cat.id
                ? 'bg-[#0B1D3E] text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-[#0B1D3E]/40 dark:hover:border-[#0B1D3E]'
            }`}
          >
            <cat.icon className="w-4 h-4" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Quick search hints */}
      {query.trim().length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { icon: User, label: 'Owner Name' },
            { icon: Phone, label: 'Phone Number' },
            { icon: Hash, label: 'Bill Number' },
            { icon: Receipt, label: 'Receipt Number' },
            { icon: MapPin, label: 'GPS Address' },
            { icon: CreditCard, label: 'Ghana Card / TIN' },
          ].map((hint) => (
            <button
              key={hint.label}
              onClick={() => setQuery(hint.label + ': ')}
              className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:border-[#0B1D3E]/40 dark:hover:border-[#0B1D3E] transition-colors"
            >
              <hint.icon className="w-4 h-4 text-slate-400" />
              {hint.label}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {query.trim().length > 0 && results.length === 0 && (
        <div className="text-center py-16">
          <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-slate-500 dark:text-slate-400">No results found</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
          {results.map((result) => {
            const Icon = typeIcon(result.type);
            return (
              <div
                key={result.id}
                className="flex items-start gap-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md hover:border-[#0B1D3E]/30 dark:hover:border-[#0B1D3E] transition-all cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  result.type === 'business' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' :
                  result.type === 'property' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' :
                  result.type === 'bill' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600' :
                  'bg-[#0B1D3E]/10 dark:bg-[#4a7ab5]/20 text-[#0B1D3E]'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{result.title}</p>
                    {result.status && (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${result.statusColor === 'emerald' ? 'bg-[#0B1D3E]/10 dark:bg-[#4a7ab5]/20 text-[#0B1D3E] dark:text-[#4a7ab5]' : result.statusColor === 'red' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : result.statusColor === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                        {result.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{result.detail}</p>
                </div>
                {result.amount && (
                  <p className="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">{result.amount}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}