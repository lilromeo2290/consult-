'use client';

import { useState, useMemo, useRef } from 'react';
import { useCrossTabSync } from '@/hooks/use-cross-tab-sync';
import {
  Search,
  Printer,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Award,
  Building2,
  Download,
  Filter,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Business {
  regNumber: string;
  name: string;
  owner: string;
  type: string;
  category: string;
  tin: string;
  status: 'Active' | 'Inactive';
  dateRegistered: string;
  ghanaCard: string;
  phone: string;
  email: string;
  gpsAddress: string;
  digitalAddress: string;
  residentialAddress: string;
  businessAddress: string;
  ward: string;
  electoralArea: string;
  zone: string;
  revenueArea: string;
  licenseNumber: string;
  subCategory: string;
}

interface BusinessCert {
  id: string;
  certNumber: string;
  regNumber: string;
  businessName: string;
  ownerName: string;
  businessType: string;
  category: string;
  businessAddress: string;
  dateRegistered: string;
  dateIssued: string;
  expiryDate: string;
  status: 'Active' | 'Expired' | 'Revoked';
  assemblyName: string;
  assemblyAddress: string;
  tradingName: string;
  receiptNumber: string;
}

// ─── Certificate Print Component ────────────────────────────────────────────

function parseDateParts(dateStr: string) {
  if (!dateStr) return { day: '', month: '', year: '' };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { day: '', month: '', year: '' };
    const day = d.getDate();
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return { day: String(day), month: months[d.getMonth()], year: String(d.getFullYear()) };
  } catch {
    return { day: '', month: '', year: '' };
  }
}

function DotLeader({ width = 200 }: { width?: number }) {
  const dots = '.'.repeat(Math.floor(width / 4.5));
  return (
    <span style={{
      fontFamily: 'serif',
      fontSize: '14px',
      letterSpacing: '1.5px',
      color: '#555',
      userSelect: 'none',
    }}>{dots}</span>
  );
}

function CertificatePrintView({ cert, assemblyName }: { cert: BusinessCert; assemblyName: string }) {
  const displayName = assemblyName || 'Kumasi Metropolitan Assembly';
  const issuedParts = parseDateParts(cert.dateIssued);
  const expiryParts = parseDateParts(cert.expiryDate);
  const businessAddr = cert.businessAddress || 'N/A';
  const tradingName = cert.tradingName || cert.businessName;
  const receiptNo = cert.receiptNumber || cert.certNumber;

  // Get a short code from assembly name for receipt prefix
  const assemblyCode = displayName
    .split(' ')
    .filter(w => w.length > 3)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3) || 'RMS';

  return (
    <div
      id="certificate-print-area"
      style={{
        width: '794px',
        minHeight: '1123px',
        background: '#FDFBF7',
        position: 'relative',
        padding: '0',
        fontFamily: "'Merriweather', Georgia, 'Times New Roman', serif",
      }}
    >
      {/* Gold outer border with scalloped corners */}
      <div style={{
        position: 'absolute',
        inset: '0',
        border: '16px solid #B8A441',
        borderRadius: '0',
        pointerEvents: 'none',
      }} />
      {/* Inner gold line */}
      <div style={{
        position: 'absolute',
        inset: '20px',
        border: '2px solid #9C8835',
        pointerEvents: 'none',
      }} />

      {/* Corner ornaments - top-left */}
      <div style={{ position: 'absolute', top: '30px', left: '30px', width: '60px', height: '60px', borderTop: '3px solid #B8A441', borderLeft: '3px solid #B8A441', borderRadius: '4px 0 0 0' }} />
      {/* Corner ornaments - top-right */}
      <div style={{ position: 'absolute', top: '30px', right: '30px', width: '60px', height: '60px', borderTop: '3px solid #B8A441', borderRight: '3px solid #B8A441', borderRadius: '0 4px 0 0' }} />
      {/* Corner ornaments - bottom-left */}
      <div style={{ position: 'absolute', bottom: '30px', left: '30px', width: '60px', height: '60px', borderBottom: '3px solid #B8A441', borderLeft: '3px solid #B8A441', borderRadius: '0 0 0 4px' }} />
      {/* Corner ornaments - bottom-right */}
      <div style={{ position: 'absolute', bottom: '30px', right: '30px', width: '60px', height: '60px', borderBottom: '3px solid #B8A441', borderRight: '3px solid #B8A441', borderRadius: '0 0 4px 0' }} />

      {/* Content area */}
      <div style={{ position: 'relative', zIndex: 1, padding: '52px 72px 48px' }}>

        {/* ── Header: Republic of Ghana + Logos ── */}
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '2.5px',
            textTransform: 'uppercase',
            color: '#000',
            fontFamily: "'Montserrat', Arial, sans-serif",
            marginBottom: '10px',
          }}>
            Republic of Ghana
          </div>
        </div>

        {/* Logos row */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '80px', marginBottom: '8px' }}>
          {/* Ghana Coat of Arms */}
          <div style={{
            width: '120px', height: '120px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '2px solid #B8A441',
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          }}>
            <img
              src="/ghana-coat-of-arms.png"
              alt="Coat of Arms of Ghana"
              style={{ width: '108px', height: '108px', objectFit: 'contain' }}
            />
          </div>

          {/* Assembly Logo */}
          <div style={{
            width: '120px', height: '120px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '2px solid #B8A441',
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          }}>
            <img
              src="/assembly-logo.jpeg"
              alt="Assembly Logo"
              style={{ width: '108px', height: '108px', objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* Assembly Name */}
        <div style={{ textAlign: 'center', marginTop: '12px', marginBottom: '4px' }}>
          <h1 style={{
            fontSize: '26px',
            fontWeight: 800,
            color: '#1A1A1A',
            margin: '0',
            lineHeight: 1.2,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            fontFamily: "'Montserrat', Arial, sans-serif",
          }}>
            {displayName}
          </h1>
        </div>

        {/* Certificate Title - Red Script */}
        <div style={{ textAlign: 'center', margin: '14px 0 20px' }}>
          <h2 style={{
            fontFamily: "'Great Vibes', cursive",
            fontSize: '40px',
            color: '#CC0000',
            margin: '0',
            lineHeight: 1.2,
            fontWeight: 400,
          }}>
            Certificate Of Registration
          </h2>
        </div>

        {/* ── Body: Certification Text ── */}
        <div style={{ textAlign: 'center', fontSize: '15px', color: '#1A1A1A', lineHeight: 1.8 }}>
          <p style={{ margin: '0 0 18px', fontWeight: 600 }}>
            I Hereby Certify that
          </p>
        </div>

        {/* Messrs + Business Name field */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', marginBottom: '18px', paddingLeft: '60px' }}>
          <span style={{
            fontFamily: "'Merriweather', serif",
            fontSize: '15px',
            fontWeight: 700,
            color: '#1A1A1A',
            marginRight: '8px',
            whiteSpace: 'nowrap',
          }}>Messrs</span>
          <DotLeader width={280} />
          <span style={{
            fontFamily: "'Merriweather', serif",
            fontSize: '15px',
            color: '#1A1A1A',
            fontWeight: 700,
            marginLeft: '6px',
            textTransform: 'uppercase',
          }}>{cert.businessName}</span>
        </div>

        {/* Compliance clause */}
        <div style={{ textAlign: 'center', fontSize: '15px', color: '#1A1A1A', lineHeight: 1.8 }}>
          <p style={{ margin: '0 0 4px' }}>
            has complied with the bye-laws/directives of the
          </p>
          <p style={{ margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {displayName}
          </p>
          <p style={{ margin: '0 0 18px' }}>
            and has duly been permitted to operate within the municipality.
          </p>
        </div>

        {/* Trading Name field */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', marginBottom: '22px', paddingLeft: '120px' }}>
          <span style={{
            fontFamily: "'Merriweather', serif",
            fontSize: '15px',
            fontWeight: 700,
            color: '#1A1A1A',
            marginRight: '8px',
            fontStyle: 'italic',
            whiteSpace: 'nowrap',
          }}>as</span>
          <DotLeader width={260} />
          <span style={{
            fontFamily: "'Merriweather', serif",
            fontSize: '15px',
            color: '#1A1A1A',
            fontWeight: 700,
            marginLeft: '6px',
          }}>{tradingName}</span>
        </div>

        {/* Business Address */}
        <div style={{ textAlign: 'center', fontSize: '14px', color: '#1A1A1A', marginBottom: '22px' }}>
          <span style={{ fontWeight: 600 }}>Location: </span>
          <span style={{ fontWeight: 600, color: '#1A1A1A' }}>{businessAddr}</span>
        </div>

        {/* Date Line */}
        <div style={{ textAlign: 'center', fontSize: '15px', color: '#1A1A1A', lineHeight: 2.2, marginBottom: '6px' }}>
          <p style={{ margin: '0 0 4px' }}>
            Give under my hand at{' '}
            <span style={{ fontWeight: 700 }}>{displayName.split(' ').slice(0, -1).join(' ') || displayName}</span>
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px' }}>
            <span>this</span>
            <DotLeader width={60} />
            <span style={{ fontWeight: 700, color: '#1A1A1A' }}>{issuedParts.day}</span>
            <span style={{ margin: '0 4px' }}>day of</span>
            <DotLeader width={40} />
            <span style={{ fontWeight: 700, color: '#1A1A1A' }}>{issuedParts.month}</span>
            <DotLeader width={20} />
            <span style={{ fontWeight: 700, color: '#1A1A1A' }}>{issuedParts.year}</span>
          </div>
        </div>

        {/* Validity */}
        <div style={{ textAlign: 'center', marginTop: '28px', marginBottom: '4px' }}>
          <p style={{
            fontSize: '14px',
            color: '#1A1A1A',
            margin: '0',
            fontWeight: 600,
          }}>
            Valid until {expiryParts.day ? `${expiryParts.day}st December` : cert.expiryDate || '31st December'}
          </p>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <p style={{
            fontFamily: "'Great Vibes', cursive",
            fontSize: '18px',
            color: '#CC0000',
            margin: '0',
            fontWeight: 400,
          }}>
            Renew Yearly
          </p>
        </div>

        {/* Signature Block */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{ textAlign: 'center', width: '340px' }}>
            <div style={{
              borderBottom: '1px dotted #333',
              marginBottom: '10px',
              paddingBottom: '4px',
              height: '40px',
            }} />
            <p style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#1A1A1A',
              margin: '0',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              fontFamily: "'Montserrat', Arial, sans-serif",
            }}>
              Municipal Co-ordinating Director
            </p>
            <p style={{
              fontSize: '11px',
              color: '#555',
              margin: '2px 0 0',
              fontFamily: "'Montserrat', sans-serif",
            }}>
              {displayName}
            </p>
          </div>
        </div>

        {/* Receipt Number */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          marginTop: '16px',
        }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#1A1A1A',
            letterSpacing: '0.5px',
            fontFamily: "'Montserrat', sans-serif",
          }}>RECEIPT No.:-</span>
          <DotLeader width={120} />
          <span style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#1A1A1A',
            fontFamily: "'Courier New', monospace",
            marginLeft: '6px',
          }}>{assemblyCode} {receiptNo}</span>
        </div>

      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 10;

export function BusinessCertsPage() {
  const businesses = useCrossTabSync<Business[]>('rms-businesses', []);
  const certificates = useCrossTabSync<BusinessCert[]>('rms-business-certs', []);

  // Read assembly name from settings
  const assemblyName = useMemo(() => {
    if (typeof window === 'undefined') return '';
    try {
      const raw = localStorage.getItem('rms-settings-assembly');
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.name || '';
      }
    } catch { /* ignore */ }
    return '';
  }, []);

  const assemblyAddress = useMemo(() => {
    if (typeof window === 'undefined') return '';
    try {
      const raw = localStorage.getItem('rms-settings-assembly');
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.address || '';
      }
    } catch { /* ignore */ }
    return '';
  }, []);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [page, setPage] = useState(1);
  const [viewCert, setViewCert] = useState<BusinessCert | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filtered & paginated
  const filtered = useMemo(() => {
    return certificates.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.businessName.toLowerCase().includes(q) ||
        c.ownerName.toLowerCase().includes(q) ||
        c.certNumber.toLowerCase().includes(q) ||
        c.regNumber.toLowerCase().includes(q) ||
        c.businessType.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'All' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [certificates, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE;
  const paged = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  const showingFrom = filtered.length === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(startIdx + ITEMS_PER_PAGE, filtered.length);

  // Stats
  const activeCount = certificates.filter((c) => c.status === 'Active').length;
  const expiredCount = certificates.filter((c) => c.status === 'Expired').length;
  const revokedCount = certificates.filter((c) => c.status === 'Revoked').length;

  const printRef = useRef<HTMLDivElement>(null);

  // Convert the assembly logo image to base64 so it prints correctly in new windows
  const getPrintHTML = async (certNum: string) => {
    const printArea = document.getElementById('certificate-print-area');
    if (!printArea) return '';
    let html = printArea.innerHTML;
    try {
      // Convert both logo images to base64 for print
      const logos = ['/assembly-logo.jpeg', '/ghana-coat-of-arms.png'];
      for (const logoPath of logos) {
        const resp = await fetch(logoPath);
        const blob = await resp.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        const searchPattern = `src="${logoPath}"`;
        html = html.split(searchPattern).join(`src="${base64}"`);
      }
    } catch { /* fallback: leave as-is */ }
    return html;
  };

  const fontLinks = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Great+Vibes&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Montserrat:wght@400;600;700;800&display=swap" rel="stylesheet">
  `;
  const printStyles = `
    @page { size: A4; margin: 0; }
    body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; background: white; }
    @media print { body { margin: 0; } }
  `;

  const handlePrint = async () => {
    const html = await getPrintHTML(viewCert?.certNumber || '');
    if (!html) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head>
      <title>Business Certificate - ${viewCert?.certNumber || ''}</title>
      ${fontLinks}
      <style>${printStyles}</style>
      </head><body>${html}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const handleDownloadPDF = async () => {
    const html = await getPrintHTML(viewCert?.certNumber || '');
    if (!html) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head>
      <title>Business Certificate - ${viewCert?.certNumber || ''}</title>
      ${fontLinks}
      <style>${printStyles}</style>
      </head><body>${html}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
  };

  const inputCls =
    'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition';

  // ── Certificate Viewer Modal ─────────────────────────────────────────────
  if (viewCert) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewCert(null)}
            className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Certificate: {viewCert.certNumber}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {viewCert.businessName} &mdash; {viewCert.ownerName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              Save as PDF
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Certificate
            </button>
          </div>
        </div>

        {/* Certificate Preview */}
        <div className="flex justify-center">
          <div className="shadow-2xl rounded-lg overflow-auto max-h-[75vh]">
            <CertificatePrintView cert={viewCert} assemblyName={assemblyName} />
          </div>
        </div>
      </div>
    );
  }

  // ── List View ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Business Certificates
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          View, retrieve, and print all business registration certificates issued by the assembly.
          Certificates are automatically generated when a new business is registered.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
            <Award className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{certificates.length}</p>
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Active</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{activeCount}</p>
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Expired</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{expiredCount}</p>
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <X className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Revoked</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{revokedCount}</p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by business name, owner, cert number, or reg number..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className={`${inputCls} pl-10`}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              showFilters
                ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
        {showFilters && (
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className={`${inputCls} w-full sm:w-48`}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Revoked">Revoked</option>
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Cert #
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Business Name
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap hidden md:table-cell">
                  Owner
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap hidden lg:table-cell">
                  Type
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap hidden sm:table-cell">
                  Date Issued
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Status
                </th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500">
                    <Award className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    {certificates.length === 0
                      ? 'No certificates issued yet. Certificates are automatically created when businesses are registered.'
                      : 'No certificates match your search criteria.'}
                  </td>
                </tr>
              ) : (
                paged.map((cert) => (
                  <tr
                    key={cert.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {cert.certNumber}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      {cert.businessName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap hidden md:table-cell">
                      {cert.ownerName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap hidden lg:table-cell">
                      {cert.businessType}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap hidden sm:table-cell">
                      {cert.dateIssued}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          cert.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : cert.status === 'Expired'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {cert.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setViewCert(cert)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                          title="View & Print Certificate"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            setViewCert(cert);
                            setTimeout(async () => {
                              const printArea = document.getElementById('certificate-print-area');
                              if (printArea) {
                                let html = printArea.innerHTML;
                                try {
                                  const logos = ['/assembly-logo.jpeg', '/ghana-coat-of-arms.png'];
                                  for (const logoPath of logos) {
                                    const resp = await fetch(logoPath);
                                    const blob = await resp.blob();
                                    const base64 = await new Promise<string>((resolve) => {
                                      const reader = new FileReader();
                                      reader.onloadend = () => resolve(reader.result as string);
                                      reader.readAsDataURL(blob);
                                    });
                                    html = html.split(`src="${logoPath}"`).join(`src="${base64}"`);
                                  }
                                } catch { /* fallback */ }
                                const pw = window.open('', '_blank');
                                if (!pw) return;
                                pw.document.write(`
                                  <!DOCTYPE html><html><head>
                                  <title>Cert - ${cert.certNumber}</title>
                                  <link rel="preconnect" href="https://fonts.googleapis.com">
                                  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                                  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Great+Vibes&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Montserrat:wght@400;600;700;800&display=swap" rel="stylesheet">
                                  <style>@page{size:A4;margin:0;}body{margin:0;display:flex;justify-content:center;background:#fff;}</style>
                                  </head><body>${html}</body></html>
                                `);
                                pw.document.close();
                                pw.focus();
                                setTimeout(() => { pw.print(); pw.close(); }, 500);
                              }
                            }, 100);
                          }}
                          className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Quick Print"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <p className="text-slate-500 dark:text-slate-400">
          Showing {showingFrom}-{showingTo} of {filtered.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
            {safePage} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
