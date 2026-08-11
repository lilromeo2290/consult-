'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Printer,
} from 'lucide-react';

type CertData = {
  cert: {
    id: string;
    certNumber: string;
    regNumber: string;
    businessUniqueNumber: string;
    businessName: string;
    ownerName: string;
    businessType: string;
    category: string;
    businessLocation: string;
    businessAddress: string;
    dateRegistered: string;
    dateIssued: string;
    expiryDate: string;
    status: string;
    assemblyName: string;
    assemblyAddress: string;
    tradingName: string;
    receiptNumber: string;
  };
  assemblySettings: {
    name?: string;
    address?: string;
    logo?: string;
    signature?: string;
    signatureTitle?: string;
  };
  financialYear: string;
};

function fmtDateParts(d: string) {
  if (!d) return { day: '........', month: '........', year: '....' };
  try {
    const dt = new Date(d);
    const day = dt.getDate();
    const s = ['th','st','nd','rd'];
    const v = day % 100;
    const suffix = s[(v-20)%10] || s[v] || s[0];
    return { day: day + suffix, month: dt.toLocaleDateString('en-US', { month: 'long' }), year: String(dt.getFullYear()) };
  } catch { return { day: '........', month: '........', year: '....' }; }
}

function CertificateView({ data }: { data: CertData }) {
  const { cert, assemblySettings, financialYear } = data;
  const asmName = assemblySettings.name || cert.assemblyName || 'Kpando Municipal Assembly';
  const asmLogo = assemblySettings.logo || '';
  const asmSig = assemblySettings.signature || '';
  const asmSigTitle = assemblySettings.signatureTitle || '';
  const bizName = cert.businessName || '';
  const bizLocation = cert.businessLocation || cert.businessAddress || '';
  const bizType = cert.businessType || '';
  const bizCategory = cert.category || '';
  const bizNumber = cert.businessUniqueNumber || cert.certNumber || '';
  const issueParts = fmtDateParts(cert.dateIssued);
  const expiryParts = fmtDateParts(cert.expiryDate);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Back Link + Print button */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" /> Print Certificate
          </button>
        </div>

        {/* Verification Badge */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 mb-6 print:hidden">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Certificate Verified Successfully</p>
            <p className="text-xs text-emerald-600">This is a valid Business Operating Permit issued by {asmName}</p>
          </div>
        </div>

        {/* Certificate */}
        <div className="p-4 bg-[#f0ece0] rounded-2xl shadow-xl">
          <div style={{ background: '#FFFFFF', border: '3px solid #8B7355', borderRadius: '20px', position: 'relative', overflow: 'hidden' }}>
            {/* Inner border */}
            <div style={{ position: 'absolute', top: '8px', left: '8px', right: '8px', bottom: '8px', border: '1px solid #8B7355', borderRadius: '14px', pointerEvents: 'none' }} />
            {/* Watermark */}
            {asmLogo && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '350px', height: '350px', opacity: 0.06, zIndex: 0, pointerEvents: 'none' }}>
                <img src={asmLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'grayscale(100%)' }} />
              </div>
            )}
            {/* Content */}
            <div style={{ margin: '35px 40px', position: 'relative', zIndex: 2 }}>
              {/* Header: Logo + Assembly Name - Centered */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ width: '90px', height: '90px', margin: '0 auto 12px auto' }}>
                  {asmLogo
                    ? <img src={asmLogo} alt={asmName} style={{ width: '90px', height: '90px', objectFit: 'contain' }} />
                    : <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: '#f0ece0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #8B7355' }}>
                        <Shield style={{ width: '40px', height: '40px', color: '#8B7355' }} />
                      </div>
                  }
                </div>
                <div>
                  {asmName.toUpperCase().split(' ').map((word, i) => (
                    <div key={i} style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '28px', fontWeight: 900, textTransform: 'uppercase', color: '#000000', letterSpacing: '-0.5px', lineHeight: 1.15 }}>{word}</div>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                <div style={{ fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif", fontSize: '20px', fontWeight: 400, letterSpacing: '2px', color: '#222222', textTransform: 'uppercase' }}>Business Operating Permit</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '10px' }}>
                  <div style={{ height: '1px', width: '120px', background: '#CD853F' }} />
                  <div style={{ width: '16px', textAlign: 'center', color: '#DAA520', fontSize: '14px', margin: '0 4px' }}>&#10086;</div>
                  <div style={{ height: '1px', width: '120px', background: '#CD853F' }} />
                </div>
              </div>

              {/* Business Identity */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif", fontSize: '14px', fontWeight: 600, color: '#000000', textTransform: 'uppercase', marginBottom: '6px' }}>Business Name</div>
                <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '40px', fontWeight: 700, color: '#B22222', lineHeight: 1.1, marginBottom: '12px' }}>{bizName.toUpperCase()}</div>
                <div style={{ fontFamily: "'Times New Roman', Times, Georgia, serif", fontSize: '11px', lineHeight: 1.6, color: '#333333', textAlign: 'center' }}>
                  Issued under the Local Governance Act, 2016 (Act 936)<br />
                  Section 87(1) to operate a business within the<br />
                  <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{asmName.toUpperCase()}</span><br />
                  Jurisdiction for the year {financialYear}.
                </div>
              </div>

              {/* Data Fields */}
              <div style={{ margin: '20px 0' }}>
                {[
                  ['1. Business Number', bizNumber],
                  ['2. Business Location', bizLocation],
                  ['3. Business Class', bizType],
                  ['4. Business Category', bizCategory],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'baseline', marginBottom: '16px' }}>
                    <div style={{ fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif", fontSize: '12px', fontWeight: 600, color: '#000000', textAlign: 'right', width: '38%', paddingRight: '10px', flexShrink: 0 }}>{label}</div>
                    <div style={{ flex: 1, borderBottom: '1px dotted #555555', minHeight: '16px', fontSize: '12px', color: '#000', paddingBottom: '1px' }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Dates */}
              <div style={{ margin: '16px 0 20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '10px' }}>
                  <div style={{ fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif", fontSize: '12px', fontWeight: 600, color: '#000000', textTransform: 'uppercase', textAlign: 'right', width: '38%', paddingRight: '10px', flexShrink: 0 }}>Date of Issue:</div>
                  <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '14px', fontWeight: 700, color: '#000000' }}>{issueParts.day}<sup style={{ fontSize: '0.6em', verticalAlign: 'super' }}>TH</sup> {issueParts.month.toUpperCase()}, {issueParts.year}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <div style={{ fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif", fontSize: '12px', fontWeight: 600, color: '#000000', textTransform: 'uppercase', textAlign: 'right', width: '38%', paddingRight: '10px', flexShrink: 0 }}>Expiry Date:</div>
                  <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '14px', fontWeight: 700, color: '#000000' }}>{expiryParts.day}<sup style={{ fontSize: '0.6em', verticalAlign: 'super' }}>TH</sup> {expiryParts.month.toUpperCase()}, {expiryParts.year}</div>
                </div>
              </div>

              {/* Footer: Note + Signature */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '24px' }}>
                <div style={{ maxWidth: '250px' }}>
                  <div style={{ fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif", fontSize: '11px', fontWeight: 700, color: '#CC0000', textTransform: 'uppercase', marginBottom: '4px' }}>Note:</div>
                  <div style={{ fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif", fontSize: '10px', lineHeight: 1.4, color: '#333333' }}>
                    This Permit is not transferable.<br />
                    Display this Permit at a conspicuous place<br />
                    at the business premises.
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  {asmSig
                    ? <div style={{ marginBottom: '3px' }}><img src={asmSig} alt="Signature" style={{ width: '140px', height: '45px', objectFit: 'contain' }} /></div>
                    : <div style={{ width: '160px', borderBottom: '1px dotted #333', marginBottom: '4px' }} />
                  }
                  <div style={{ fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif", fontSize: '9px', textTransform: 'uppercase', color: '#000000', letterSpacing: '0.5px', marginBottom: '2px' }}>Signature</div>
                  <div style={{ fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif", fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#CC0000', letterSpacing: '0.5px' }}>{asmSigTitle ? asmSigTitle.toUpperCase() : 'MUNICIPAL CO-ORDINATING DIRECTOR'}</div>
                </div>
              </div>

              {/* Barcode */}
              <div style={{ textAlign: 'center', marginTop: '28px', paddingTop: '14px', borderTop: '1px solid #CCCCCC' }}>
                <svg id="cert-barcode-verify"></svg>
                <div style={{ fontFamily: "'Arial', sans-serif", fontSize: '8px', color: '#666666', marginTop: '3px' }}>Scan to verify certificate authenticity</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center print:hidden">
          <p className="text-xs text-slate-400">
            Designed &amp; Powered by <strong className="text-slate-500">Clipe Consult</strong> &mdash; www.clipeconsult.com
          </p>
        </div>
      </div>
    </div>
  );
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const certParam = searchParams.get('cert');

  const [data, setData] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!certParam) {
      setError('No certificate number provided. Please scan a valid certificate barcode.');
      setLoading(false);
      return;
    }

    fetch(`/api/certificate-lookup?cert=${encodeURIComponent(certParam)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Certificate not found');
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load certificate');
        setLoading(false);
      });
  }, [certParam]);

  // Render barcode after data loads
  useEffect(() => {
    if (!data || !certParam) return;
    const loadBarcode = () => {
      const el = document.getElementById('cert-barcode-verify');
      if (el && (window as any).JsBarcode) {
        (window as any).JsBarcode(el, `${window.location.origin}/verify/certificate?cert=${certParam}`, {
          format: 'CODE128',
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 11,
          font: 'Arial',
          textMargin: 4,
          margin: 0,
        });
      }
    };

    if ((window as any).JsBarcode) {
      loadBarcode();
    } else {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
      s.onload = loadBarcode;
      document.head.appendChild(s);
    }
  }, [data, certParam]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Verifying certificate...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Certificate Not Found</h1>
          <p className="text-sm text-slate-500">{error || 'This certificate could not be verified. It may be invalid or the barcode may be damaged.'}</p>
          <button
            onClick={() => window.history.back()}
            className="mt-6 inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  return <CertificateView data={data} />;
}

export default function VerifyCertificatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
