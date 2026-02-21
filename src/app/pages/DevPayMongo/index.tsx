import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  CreditCard,
  Link2,
  Webhook,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  FlaskConical,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  BadgeInfo,
  QrCode,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { api } from '@/app/lib/api';

// ─── Tiny helpers ──────────────────────────────────────────────────────────────

function useCopy(timeout = 1800) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    });
  }, [timeout]);
  return { copied, copy };
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="text-[11px] font-mono leading-relaxed overflow-auto max-h-64 bg-slate-50 border border-slate-100 text-slate-600 rounded-xl p-4 whitespace-pre-wrap break-words select-text">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    awaiting_payment_method: { cls: 'bg-amber-50 text-amber-600 border-amber-200',    icon: <Clock size={10} /> },
    awaiting_next_action:    { cls: 'bg-blue-50 text-blue-600 border-blue-200',        icon: <Zap size={10} /> },
    processing:              { cls: 'bg-purple-50 text-purple-600 border-purple-200',  icon: <Loader2 size={10} className="animate-spin" /> },
    succeeded:               { cls: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: <CheckCircle2 size={10} /> },
    paid:                    { cls: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: <CheckCircle2 size={10} /> },
    active:                  { cls: 'bg-blue-50 text-blue-600 border-blue-200',        icon: <CheckCircle2 size={10} /> },
    failed:                  { cls: 'bg-rose-50 text-rose-600 border-rose-200',         icon: <AlertCircle size={10} /> },
    archived:                { cls: 'bg-slate-50 text-slate-500 border-slate-200',     icon: <AlertCircle size={10} /> },
  };
  const cfg = map[status] ?? { cls: 'bg-slate-50 text-slate-500 border-slate-200', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg.cls}`}>
      {cfg.icon}{status}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">
      {children}
    </label>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3">
      <AlertCircle size={13} className="shrink-0" />{message}
    </div>
  );
}

// ─── Tab nav ───────────────────────────────────────────────────────────────────

type Tab = 'links' | 'intents' | 'qrph' | 'webhooks';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'links',    label: 'Payment Links',   icon: <Link2 size={14} /> },
  { id: 'intents',  label: 'Payment Intents', icon: <CreditCard size={14} /> },
  { id: 'qrph',     label: 'QR Ph',           icon: <QrCode size={14} /> },
  { id: 'webhooks', label: 'Webhook Log',      icon: <Webhook size={14} /> },
];

// ─── Payment Links tab ─────────────────────────────────────────────────────────

function PaymentLinksTab() {
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('DJ Grain Hub Purchase');
  const [ref, setRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  // Status checker
  const [statusId, setStatusId] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusResult, setStatusResult] = useState<any>(null);

  const urlCopy = useCopy();
  const idCopy = useCopy();

  const checkoutUrl = result?.data?.attributes?.checkout_url;
  const linkId = result?.data?.id;
  const linkStatus = result?.data?.attributes?.status;
  const linkAmount = result?.data?.attributes?.amount;

  const handleCreate = async () => {
    if (!amount || Number(amount) < 1) { setError('Enter a valid amount (≥ ₱1)'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await api.post<any>('/payment/link', {
        amount: Number(amount),
        description: desc || 'DJ Grain Hub Purchase',
        ...(ref ? { reference_number: ref } : {}),
      });
      setResult(data);
      if (data?.data?.id) setStatusId(data.data.id);
    } catch (e: any) {
      setError(e.message || 'Failed to create payment link');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!statusId.trim()) return;
    setStatusLoading(true);
    try {
      const data = await api.get<any>(`/payment/link/${statusId.trim()}`);
      setStatusResult(data);
      // Also refresh main result if same ID
      if (data?.data?.id === linkId) setResult(data);
    } catch (e: any) {
      setStatusResult({ error: e.message });
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Create */}
      <div className="space-y-4">
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <CardHeader className="p-5 pb-0">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Create Payment Link</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div>
              <FieldLabel>Amount (PHP) *</FieldLabel>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₱</span>
                <Input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="275.00" className="pl-7 h-10 font-mono" />
              </div>
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="DJ Grain Hub Purchase" className="h-10" />
            </div>
            <div>
              <FieldLabel>Reference Number <span className="normal-case font-normal text-slate-400">(optional)</span></FieldLabel>
              <Input value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. TXN-001" className="h-10 font-mono" />
            </div>
            {error && <ErrorBanner message={error} />}
            <Button className="w-full" onClick={handleCreate} disabled={loading}>
              {loading ? <><Loader2 size={14} className="mr-2 animate-spin" />Creating…</> : <><Link2 size={14} className="mr-2" />Create Payment Link</>}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <CardHeader className="p-5 pb-0">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Check Link Status</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            <div className="flex gap-2">
              <Input value={statusId} onChange={e => setStatusId(e.target.value)} placeholder="link_xxxxxxxxxxxxxxxx" className="h-10 font-mono text-xs flex-1" />
              <Button variant="outline" onClick={handleCheckStatus} disabled={statusLoading || !statusId} className="h-10 px-3 shrink-0">
                {statusLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              </Button>
            </div>
            {statusResult && !statusResult.error && (
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Status</span>
                  <StatusBadge status={statusResult.data?.attributes?.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Amount</span>
                  <span className="text-xs font-mono font-bold text-slate-800">₱{((statusResult.data?.attributes?.amount ?? 0) / 100).toFixed(2)}</span>
                </div>
                {(statusResult.data?.attributes?.payments?.length ?? 0) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Payments</span>
                    <span className="text-xs font-mono font-bold text-slate-800">{statusResult.data.attributes.payments.length}</span>
                  </div>
                )}
              </div>
            )}
            {statusResult?.error && <ErrorBanner message={statusResult.error} />}
          </CardContent>
        </Card>
      </div>

      {/* Result */}
      <div className="space-y-4">
        {result ? (
          <>
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Link Created</CardTitle>
                <StatusBadge status={linkStatus} />
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {linkAmount && (
                  <div className="text-3xl font-black text-slate-900 tracking-tighter">₱{(linkAmount / 100).toFixed(2)}</div>
                )}
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg flex-1 truncate border border-slate-100">{linkId}</code>
                  <button onClick={() => idCopy.copy(linkId)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    {idCopy.copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="text-slate-400" />}
                  </button>
                </div>
                {checkoutUrl && (
                  <>
                    <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-xl p-3">
                      <span className="text-xs font-mono text-primary truncate flex-1">{checkoutUrl}</span>
                      <button onClick={() => urlCopy.copy(checkoutUrl)} className="p-1 hover:bg-primary/10 rounded-lg transition-colors shrink-0">
                        {urlCopy.copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-primary" />}
                      </button>
                      <a href={checkoutUrl} target="_blank" rel="noreferrer" className="p-1 hover:bg-primary/10 rounded-lg transition-colors shrink-0">
                        <ExternalLink size={12} className="text-primary" />
                      </a>
                    </div>
                    <Button className="w-full" onClick={() => window.open(checkoutUrl, '_blank')}>
                      <ExternalLink size={14} className="mr-2" />Open Checkout Page
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Raw Response</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5"><JsonBlock data={result} /></CardContent>
            </Card>
          </>
        ) : (
          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full min-h-[260px]">
            <CardContent className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3"><Link2 size={22} className="text-slate-400" /></div>
              <p className="text-sm font-semibold text-slate-500">No link yet</p>
              <p className="text-xs text-slate-400 mt-1">Create a payment link to see the response</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Payment Intents tab ───────────────────────────────────────────────────────

const METHOD_OPTIONS = [
  { id: 'gcash',     label: 'GCash' },
  { id: 'paymaya',   label: 'Maya' },
  { id: 'card',      label: 'Card' },
  { id: 'grab_pay',  label: 'GrabPay' },
  { id: 'billease',  label: 'BillEase' },
];

function PaymentIntentsTab() {
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('DJ Grain Hub Purchase');
  const [methods, setMethods] = useState(['gcash', 'paymaya', 'card']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [intentResult, setIntentResult] = useState<any>(null);

  // Attach step
  const [attachMethod, setAttachMethod] = useState<'gcash' | 'paymaya' | 'grab_pay'>('gcash');
  const [attachLoading, setAttachLoading] = useState(false);
  const [attachResult, setAttachResult] = useState<any>(null);

  // Status poll
  const [statusLoading, setStatusLoading] = useState(false);

  const idCopy  = useCopy();
  const keyCopy = useCopy();

  const intentId    = intentResult?.data?.id;
  const clientKey   = intentResult?.data?.attributes?.client_key;
  const intentStatus = intentResult?.data?.attributes?.status;

  const toggleMethod = (id: string) => {
    setMethods(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    if (!amount || Number(amount) < 1) { setError('Enter a valid amount (≥ ₱1)'); return; }
    if (methods.length === 0) { setError('Select at least one payment method'); return; }
    setError('');
    setLoading(true);
    setAttachResult(null);
    try {
      const data = await api.post<any>('/payment/intent', {
        amount: Number(amount),
        description: desc,
        payment_method_types: methods,
      });
      setIntentResult(data);
    } catch (e: any) {
      setError(e.message || 'Failed to create intent');
    } finally {
      setLoading(false);
    }
  };

  const handleAttach = async () => {
    if (!intentId || !clientKey) return;
    setAttachLoading(true);
    try {
      // First create a payment method of the selected type
      const methodData = await api.post<any>('/payment/method', { type: attachMethod });
      const methodId = methodData?.data?.id;

      // Then attach it to the intent
      const data = await api.post<any>(`/payment/intent/${intentId}/attach`, {
        payment_method_id: methodId,
        client_key: clientKey,
      });
      setAttachResult(data);

      // Refresh intent status
      const refreshed = await api.get<any>(`/payment/intent/${intentId}`);
      setIntentResult(refreshed);
    } catch (e: any) {
      setAttachResult({ error: e.message });
    } finally {
      setAttachLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!intentId) return;
    setStatusLoading(true);
    try {
      const data = await api.get<any>(`/payment/intent/${intentId}`);
      setIntentResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStatusLoading(false);
    }
  };

  const redirectUrl = attachResult?.data?.attributes?.next_action?.redirect?.url;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left */}
      <div className="space-y-4">
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <CardHeader className="p-5 pb-0">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Step 1 — Create Intent</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div>
              <FieldLabel>Amount (PHP) *</FieldLabel>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₱</span>
                <Input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="275.00" className="pl-7 h-10 font-mono" />
              </div>
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="DJ Grain Hub Purchase" className="h-10" />
            </div>
            <div>
              <FieldLabel>Payment Methods</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {METHOD_OPTIONS.map(m => (
                  <button key={m.id} onClick={() => toggleMethod(m.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      methods.includes(m.id)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}>{m.label}</button>
                ))}
              </div>
            </div>
            {error && <ErrorBanner message={error} />}
            <Button className="w-full" onClick={handleCreate} disabled={loading}>
              {loading ? <><Loader2 size={14} className="mr-2 animate-spin" />Creating…</> : <><CreditCard size={14} className="mr-2" />Create Payment Intent</>}
            </Button>
          </CardContent>
        </Card>

        {intentId && (
          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <CardHeader className="p-5 pb-0">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Step 2 — Attach Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <FieldLabel>Wallet Type</FieldLabel>
                <div className="flex gap-2">
                  {(['gcash', 'paymaya', 'grab_pay'] as const).map(t => (
                    <button key={t} onClick={() => setAttachMethod(t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        attachMethod === t
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}>{t === 'gcash' ? 'GCash' : t === 'paymaya' ? 'Maya' : 'GrabPay'}</button>
                  ))}
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={handleAttach} disabled={attachLoading}>
                {attachLoading ? <><Loader2 size={14} className="mr-2 animate-spin" />Attaching…</> : `Attach ${attachMethod === 'gcash' ? 'GCash' : attachMethod === 'paymaya' ? 'Maya' : 'GrabPay'}`}
              </Button>
              {redirectUrl && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-blue-700">Redirect URL</p>
                  <a href={redirectUrl} target="_blank" rel="noreferrer" className="text-xs font-mono text-blue-600 underline break-all block">{redirectUrl}</a>
                  <Button size="sm" className="w-full h-8" onClick={() => window.open(redirectUrl, '_blank')}>
                    <ExternalLink size={12} className="mr-1.5" />Open Payment Page
                  </Button>
                </div>
              )}
              {attachResult?.error && <ErrorBanner message={attachResult.error} />}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right */}
      <div className="space-y-4">
        {intentResult ? (
          <>
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Intent Details</CardTitle>
                <div className="flex items-center gap-2">
                  <StatusBadge status={intentStatus} />
                  <button onClick={handleRefreshStatus} title="Refresh" className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                    {statusLoading ? <Loader2 size={13} className="animate-spin text-slate-400" /> : <RefreshCw size={13} className="text-slate-400" />}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <div className="text-3xl font-black text-slate-900 tracking-tighter">
                  ₱{((intentResult?.data?.attributes?.amount ?? 0) / 100).toFixed(2)}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-20 shrink-0">Intent ID</span>
                    <code className="text-xs font-mono text-slate-700 bg-slate-50 px-2 py-1 rounded-lg flex-1 truncate border border-slate-100">{intentId}</code>
                    <button onClick={() => idCopy.copy(intentId)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                      {idCopy.copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} className="text-slate-400" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-20 shrink-0">Client Key</span>
                    <code className="text-[10px] font-mono text-slate-700 bg-slate-50 px-2 py-1 rounded-lg flex-1 truncate border border-slate-100">{clientKey}</code>
                    <button onClick={() => keyCopy.copy(clientKey)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                      {keyCopy.copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} className="text-slate-400" />}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Raw Response</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5"><JsonBlock data={intentResult} /></CardContent>
            </Card>
          </>
        ) : (
          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full min-h-[260px]">
            <CardContent className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3"><CreditCard size={22} className="text-slate-400" /></div>
              <p className="text-sm font-semibold text-slate-500">No intent yet</p>
              <p className="text-xs text-slate-400 mt-1">Create a payment intent to see the details here</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── QR Ph tab ────────────────────────────────────────────────────────────────

function QRPhTab() {
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('DJ Grain Hub Purchase');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [intentResult, setIntentResult] = useState<any>(null);
  const [attachRaw, setAttachRaw] = useState<any>(null);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const intentId     = intentResult?.data?.id;
  const intentStatus = intentResult?.data?.attributes?.status;
  const intentAmount = intentResult?.data?.attributes?.amount;

  const handleGenerate = async () => {
    if (!amount || Number(amount) < 1) { setError('Enter a valid amount (≥ ₱1)'); return; }
    setError('');
    setLoading(true);
    setQrBase64(null);
    setAttachRaw(null);
    setIntentResult(null);
    try {
      // 1. Create intent with qrph allowed
      const intentData = await api.post<any>('/payment/intent', {
        amount: Number(amount),
        description: desc || 'DJ Grain Hub Purchase',
        payment_method_types: ['qrph'],
      });
      setIntentResult(intentData);
      const id        = intentData?.data?.id;
      const clientKey = intentData?.data?.attributes?.client_key;

      // 2. Create QR Ph payment method
      const methodData = await api.post<any>('/payment/method', { type: 'qrph' });
      const methodId   = methodData?.data?.id;

      // 3. Attach → response contains the QR code image
      const attachData = await api.post<any>(`/payment/intent/${id}/attach`, {
        payment_method_id: methodId,
        client_key: clientKey,
      });
      setAttachRaw(attachData);
      console.log('[QRPh] attach response:', JSON.stringify(attachData, null, 2));

      // PayMongo may nest the image differently — try multiple paths
      const attrs = attachData?.data?.attributes;
      // PayMongo returns next_action.code.image_url as a full data: URL
      const imageUrl =
        attrs?.next_action?.code?.image_url ??
        attrs?.next_action?.qr_code?.image_base64_encoded ??
        null;
      setQrBase64(imageUrl);

      // Refresh intent for latest status
      const refreshed = await api.get<any>(`/payment/intent/${id}`);
      setIntentResult(refreshed);
    } catch (e: any) {
      setError(e.message || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!intentId) return;
    setStatusLoading(true);
    try {
      const data = await api.get<any>(`/payment/intent/${intentId}`);
      setIntentResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left — form */}
      <div className="space-y-4">
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <CardHeader className="p-5 pb-0">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Generate QR Ph Code</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div>
              <FieldLabel>Amount (PHP) *</FieldLabel>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₱</span>
                <Input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="275.00" className="pl-7 h-10 font-mono" />
              </div>
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="DJ Grain Hub Purchase" className="h-10" />
            </div>
            {error && <ErrorBanner message={error} />}
            <Button className="w-full" onClick={handleGenerate} disabled={loading}>
              {loading
                ? <><Loader2 size={14} className="mr-2 animate-spin" />Generating…</>
                : <><QrCode size={14} className="mr-2" />Generate QR Code</>
              }
            </Button>
          </CardContent>
        </Card>

        {intentId && (
          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Payment Status</CardTitle>
              <div className="flex items-center gap-2">
                <StatusBadge status={intentStatus} />
                <button onClick={handleRefresh} title="Refresh" className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                  {statusLoading ? <Loader2 size={13} className="animate-spin text-slate-400" /> : <RefreshCw size={13} className="text-slate-400" />}
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-2">
              <div className="text-3xl font-black text-slate-900 tracking-tighter">₱{((intentAmount ?? 0) / 100).toFixed(2)}</div>
              <p className="text-[11px] text-slate-400 font-mono truncate">{intentId}</p>
              {intentStatus === 'succeeded' && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl p-3 mt-1">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <p className="text-xs font-bold text-emerald-700">Payment confirmed!</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right — QR code */}
      <div className="space-y-4">
        {qrBase64 ? (
          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <CardHeader className="p-5 pb-0">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Scan to Pay</CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex flex-col items-center gap-4">
              <div className="bg-white rounded-2xl p-6 border border-slate-100 w-full flex items-center justify-center">
                <img
                  src={qrBase64}
                  alt="QR Ph payment code"
                  className="w-full max-w-[240px] aspect-square object-contain"
                />
              </div>
              {intentAmount && (
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-900 tracking-tighter">₱{(intentAmount / 100).toFixed(2)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Scan the code above to pay</p>
                </div>
              )}
              <Button variant="outline" className="w-full" onClick={handleRefresh} disabled={statusLoading}>
                {statusLoading
                  ? <><Loader2 size={13} className="mr-2 animate-spin" />Checking…</>
                  : <><RefreshCw size={13} className="mr-2" />Check Payment Status</>
                }
              </Button>
            </CardContent>
          </Card>
        ) : attachRaw ? (
          // QR image not found in response — show raw so user can debug
          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <CardHeader className="p-5 pb-0">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Attach Response</CardTitle>
              <p className="text-xs text-rose-500 mt-1">QR image not found in expected path — check raw response below</p>
            </CardHeader>
            <CardContent className="p-5"><JsonBlock data={attachRaw} /></CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full min-h-[320px]">
            <CardContent className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <QrCode size={26} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-500">QR code will appear here</p>
              <p className="text-xs text-slate-400 mt-1">Enter an amount and tap Generate</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Webhook Log tab ───────────────────────────────────────────────────────────

interface WebhookEntry {
  timestamp: string;
  type: string;
  payload: unknown;
}

function WebhookLogTab() {
  const [events, setEvents] = useState<WebhookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLog = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<WebhookEntry[]>('/payment/webhook/log');
      setEvents(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClear = async () => {
    try {
      await api.delete('/payment/webhook/log');
      setEvents([]);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchLog(); }, [fetchLog]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLog, 4000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchLog]);

  const TYPE_COLOR: Record<string, string> = {
    'payment.paid':           'bg-green-100 text-green-700 border-green-200',
    'payment.failed':         'bg-red-100 text-red-700 border-red-200',
    'link.payment.paid':      'bg-green-100 text-green-700 border-green-200',
    'payment_intent.payment_paid': 'bg-green-100 text-green-700 border-green-200',
  };

  return (
    <div className="space-y-4">
      {/* Webhook URL hint */}
      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <BadgeInfo size={16} className="text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-700">Register this URL in PayMongo dashboard → Webhooks</p>
            <code className="text-xs font-mono text-slate-500 break-all">POST http://&lt;your-server-ip&gt;:3000/api/payment/webhook</code>
          </div>
          <p className="text-[11px] text-slate-400 shrink-0">Local dev: <code className="font-mono">ngrok http 3000</code></p>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          <span className="font-bold text-slate-900">{events.length}</span>
          <span className="text-slate-400 text-xs ml-1"> events · resets on server restart</span>
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => setAutoRefresh(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              autoRefresh
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
            }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-primary-foreground animate-pulse' : 'bg-slate-400'}`} />
            {autoRefresh ? 'Live' : 'Auto-refresh'}
          </button>
          <Button variant="outline" size="sm" onClick={fetchLog} disabled={loading} className="h-8">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear} className="h-8 text-rose-500 hover:text-rose-600 border-rose-100 hover:border-rose-200 hover:bg-rose-50">
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {/* Event list */}
      {events.length === 0 ? (
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <Webhook size={22} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-500">No webhook events</p>
            <p className="text-xs text-slate-400 mt-1">Make a payment to see events appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {events.map((ev, i) => {
            const isOpen = expanded === i;
            const typeColor = TYPE_COLOR[ev.type] ?? 'bg-slate-50 text-slate-600 border-slate-200';
            return (
              <Card key={i} className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${typeColor}`}>{ev.type}</span>
                    <span className="text-xs text-slate-400 font-mono truncate">{ev.timestamp}</span>
                  </div>
                  {isOpen ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
                </button>
                {isOpen && (
                  <CardContent className="px-5 pb-5 border-t border-slate-100 pt-4">
                    <JsonBlock data={ev.payload} />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0 },
};

export function DevPayMongo() {
  const [tab, setTab] = useState<Tab>('links');

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
      className="space-y-4 md:space-y-6 pb-20 md:pb-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2.5">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">PayMongo</h2>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
            <FlaskConical size={11} />SANDBOX
          </span>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 md:flex bg-muted p-1 rounded-xl gap-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                tab === t.id
                  ? 'bg-background shadow-sm text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab content */}
      <motion.div variants={itemVariants}>
        {tab === 'links'    && <PaymentLinksTab />}
        {tab === 'intents'  && <PaymentIntentsTab />}
        {tab === 'qrph'     && <QRPhTab />}
        {tab === 'webhooks' && <WebhookLogTab />}
      </motion.div>
    </motion.div>
  );
}
