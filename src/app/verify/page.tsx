'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { decodeBarcodeData, fmtGhc } from '@/lib/barcode-utils';
import { Shield, Phone, Mail, Send, CheckCircle, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';

type SendStatus = 'idle' | 'sending' | 'success' | 'error';

function VerifyContent() {
  const searchParams = useSearchParams();
  const encoded = searchParams.get('d');

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [decodedData, setDecodedData] = useState<ReturnType<typeof decodeBarcodeData>>(null);
  const [decodeError, setDecodeError] = useState(false);

  useEffect(() => {
    if (encoded) {
      const data = decodeBarcodeData(encoded);
      if (data) {
        setDecodedData(data);
      } else {
        setDecodeError(true);
      }
    }
  }, [encoded]);

  const handleSend = async () => {
    if (!phone && !email) {
      setErrorMsg('Please enter at least a phone number or email address.');
      return;
    }
    if (phone && !/^\+?\d{8,15}$/.test(phone.replace(/\s/g, ''))) {
      setErrorMsg('Please enter a valid phone number (e.g. +233 24 567 8901).');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setErrorMsg('');
    setSendStatus('sending');

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encoded, phone, email }),
      });
      const json = await res.json();
      if (res.ok) {
        setSendStatus('success');
      } else {
        setErrorMsg(json.error || 'Verification failed.');
        setSendStatus('error');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setSendStatus('error');
    }
  };

  // ── Error: No barcode data ──
  if (!encoded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Barcode Data</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Please scan a valid receipt or invoice barcode to verify it.</p>
        </div>
      </div>
    );
  }

  // ── Error: Invalid barcode ──
  if (decodeError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Invalid Barcode</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">This barcode could not be verified. It may be corrupted or tampered with. Please contact the issuing assembly if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  // ── Success: Show decoded data + verification form ──
  if (!decodedData) return null;

  const docType = decodedData.type === 'RECEIPT' ? 'Receipt' : decodedData.type === 'PAYMENT' ? 'Payment Receipt' : 'Invoice';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Back Link */}
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#0B1D3E] p-6 text-center text-white">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold">{docType} Verification</h1>
            <p className="text-[#4a7ab5] text-sm mt-1">${decodedData.assemblyName} — Revenue Management System</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Verification Status */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#0B1D3E]/10 dark:bg-[#4a7ab5]/20 border border-[#0B1D3E]/20 dark:border-[#4a7ab5]/30">
              <CheckCircle className="w-5 h-5 text-[#0B1D3E] dark:text-[#4a7ab5] flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#0B1D3E] dark:text-[#4a7ab5]">Verified Successfully</p>
                <p className="text-xs text-[#0B1D3E]/70 dark:text-[#4a7ab5]/70">Barcode integrity confirmed (Checksum: {decodedData.checksum})</p>
              </div>
            </div>

            {/* Summary Card */}
            <div>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">{docType} Summary</h2>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    <tr className="bg-slate-50 dark:bg-slate-900/40">
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">{docType} Number</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-900 dark:text-white">{decodedData.refNo}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">Issued To</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-900 dark:text-white">{decodedData.issuedTo}</td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-slate-900/40">
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">Entity Type</td>
                      <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{decodedData.entityType}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">Revenue Item</td>
                      <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{decodedData.revenueItem}</td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-slate-900/40">
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">Amount</td>
                      <td className="px-4 py-2.5 text-right font-bold text-[#0B1D3E] dark:text-[#4a7ab5] text-base">{fmtGhc(decodedData.amount)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">Date</td>
                      <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{decodedData.date}</td>
                    </tr>
                    {decodedData.method && (
                      <tr className="bg-slate-50 dark:bg-slate-900/40">
                        <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">Payment Method</td>
                        <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{decodedData.method}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">Status</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          decodedData.status === 'Valid' || decodedData.status === 'Paid'
                            ? 'bg-[#0B1D3E]/10 text-[#0B1D3E] dark:bg-[#4a7ab5]/20 dark:text-[#4a7ab5]'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                        }`}>
                          {decodedData.status}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Send Summary Form */}
            {sendStatus === 'success' ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#0B1D3E]/10 dark:bg-[#4a7ab5]/20 border border-[#0B1D3E]/20 dark:border-[#4a7ab5]/30">
                <CheckCircle className="w-5 h-5 text-[#0B1D3E] dark:text-[#4a7ab5] flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#0B1D3E] dark:text-[#4a7ab5]">Summary Sent!</p>
                  <p className="text-xs text-[#0B1D3E]/70 dark:text-[#4a7ab5]/70">The {docType.toLowerCase()} details have been sent{email ? ' to ' + email : ''}{phone ? ' to ' + phone : ''}.</p>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Receive Summary via SMS/Email</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Enter your phone number and/or email to receive a copy of this verification summary.</p>

                <div className="space-y-3">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="Phone number (e.g. +233 24 567 8901)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1D3E] focus:border-transparent transition"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="Email address (e.g. name@example.com)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1D3E] focus:border-transparent transition"
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {errorMsg}
                    </p>
                  )}

                  <button
                    onClick={handleSend}
                    disabled={sendStatus === 'sending'}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#0B1D3E] hover:bg-[#1a3a6e] disabled:bg-[#4a7ab5] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                  >
                    {sendStatus === 'sending' ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Send Summary</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-700 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Designed &amp; Powered by <strong className="text-slate-500 dark:text-slate-400">Clipe Consult</strong> — www.clipeconsult.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0B1D3E] animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
