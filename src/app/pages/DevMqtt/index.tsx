import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Radio,
  Send,
  Trash2,
  RefreshCw,
  PlayCircle,
  Wifi,
  WifiOff,
  ArrowUpCircle,
  ArrowDownCircle,
  FlaskConical,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { getStoredToken } from '@/app/lib/auth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
      {children}
    </p>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="text-[11px] font-mono leading-relaxed overflow-auto max-h-48 bg-slate-50 border border-slate-100 text-slate-600 rounded-xl p-3 whitespace-pre-wrap break-words select-text">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
      {message}
    </div>
  );
}

function TopicBadge({ topic }: { topic: string }) {
  const color =
    topic.includes('order')
      ? 'bg-blue-50 text-blue-600 border-blue-200'
      : topic.includes('dispense')
      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
      : 'bg-slate-50 text-slate-500 border-slate-200';
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-1.5 py-0.5 ${color}`}>
      {topic}
    </span>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─── Default payloads ────────────────────────────────────────────────────────

const PRESET_PAYLOADS: Record<string, object> = {
  order: {
    id: '',
    slot1: 0,
    slot2: 0,
    slot3: 0,
    slot4: 0,
    slot5: 0,
    slot6: 0,
  },
  dispense: {
    id: '',
    slot1: true,
    slot2: true,
    slot3: true,
    slot4: true,
    slot5: true,
    slot6: true,
  },
};

type TabId = 'publish' | 'simulate' | 'order-inbox' | 'monitor';

// ─── Component ────────────────────────────────────────────────────────────────

export function DevMqtt() {
  const [tab, setTab] = useState<TabId>('publish');

  // ── Publish tab ─────────────────────────────────────────────────────────
  const [pubTopic, setPubTopic] = useState('order');
  const [pubPayload, setPubPayload] = useState(
    JSON.stringify(PRESET_PAYLOADS.order, null, 2)
  );
  const [pubResult, setPubResult] = useState<unknown>(null);
  const [pubError, setPubError] = useState('');
  const [pubLoading, setPubLoading] = useState(false);

  // ── Simulate tab ────────────────────────────────────────────────────────
  const [simMachineId, setSimMachineId] = useState('');
  const [simSlots, setSimSlots] = useState<Record<string, boolean>>({
    slot1: true, slot2: true, slot3: true, slot4: true, slot5: true, slot6: true,
  });
  const [simResult, setSimResult] = useState<unknown>(null);
  const [simError, setSimError] = useState('');
  const [simLoading, setSimLoading] = useState(false);

  // ── Monitor tab ─────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<any[]>([]);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Order inbox tab ──────────────────────────────────────────────────────
  const [orderMessages, setOrderMessages] = useState<any[]>([]);
  const [orderPolling, setOrderPolling] = useState(false);
  const orderPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function authHeaders() {
    const token = getStoredToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // Update payload textarea when topic preset changes
  function handleTopicChange(t: string) {
    setPubTopic(t);
    const preset = PRESET_PAYLOADS[t as keyof typeof PRESET_PAYLOADS];
    if (preset) setPubPayload(JSON.stringify(preset, null, 2));
  }

  // ── Publish ───────────────────────────────────────────────────────────
  async function handlePublish() {
    setPubError('');
    setPubResult(null);
    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(pubPayload);
    } catch {
      setPubError('Payload is not valid JSON.');
      return;
    }
    setPubLoading(true);
    try {
      const res = await fetch('/api/dev/mqtt/publish', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ topic: pubTopic, payload: parsedPayload }),
      });
      const data = await res.json();
      if (!res.ok) { setPubError(data.error || 'Failed to publish.'); return; }
      setPubResult(data);
    } catch (e: any) {
      setPubError(e.message || 'Network error');
    } finally {
      setPubLoading(false);
    }
  }

  // ── Simulate dispense ─────────────────────────────────────────────────
  async function handleSimulate() {
    setSimError('');
    setSimResult(null);
    if (!simMachineId.trim()) { setSimError('Machine ID is required.'); return; }
    setSimLoading(true);
    try {
      const res = await fetch('/api/dev/mqtt/simulate-dispense', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ machineId: simMachineId.trim(), ...simSlots }),
      });
      const data = await res.json();
      if (!res.ok) { setSimError(data.error || 'Simulation failed.'); return; }
      setSimResult(data);
    } catch (e: any) {
      setSimError(e.message || 'Network error');
    } finally {
      setSimLoading(false);
    }
  }

  // ── Monitor polling ───────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/dev/mqtt/messages?limit=80', { headers: authHeaders() });
      if (res.ok) setMessages(await res.json());
    } catch { /* ignore */ }
  }, []);

  // ── Order inbox polling ───────────────────────────────────────────────
  const fetchOrderMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/dev/mqtt/messages?limit=200', { headers: authHeaders() });
      if (res.ok) {
        const all = await res.json();
        setOrderMessages(all.filter((m: any) => m.topic === 'order'));
      }
    } catch { /* ignore */ }
  }, []);

  function toggleOrderPolling() {
    if (orderPolling) {
      if (orderPollRef.current) clearInterval(orderPollRef.current);
      orderPollRef.current = null;
      setOrderPolling(false);
    } else {
      fetchOrderMessages();
      orderPollRef.current = setInterval(fetchOrderMessages, 2000);
      setOrderPolling(true);
    }
  }

  function togglePolling() {
    if (polling) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      setPolling(false);
    } else {
      fetchMessages();
      pollRef.current = setInterval(fetchMessages, 2000);
      setPolling(true);
    }
  }

  async function clearAllMessages() {
    await fetch('/api/dev/mqtt/messages', { method: 'DELETE', headers: authHeaders() });
    setMessages([]);
  }

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (orderPollRef.current) clearInterval(orderPollRef.current);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────

  const tabs: { id: TabId; label: string }[] = [
    { id: 'publish',      label: 'Publish' },
    { id: 'simulate',     label: 'Simulate Dispense' },
    { id: 'order-inbox',  label: 'Order Inbox (ESP32 view)' },
    { id: 'monitor',      label: 'All Messages' },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 md:p-8 max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Radio size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">MQTT Dev Console</h1>
          <p className="text-sm text-muted-foreground">Publish, simulate, and monitor vending machine MQTT traffic</p>
        </div>
      </motion.div>

      {/* Info bar */}
      <motion.div
        variants={itemVariants}
        className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 leading-relaxed"
      >
        <span className="font-bold">ESP32 contract — </span>
        Subscribe to <code className="bg-blue-100 px-1 rounded">order</code> (receives dispatch instructions with <code className="bg-blue-100 px-1 rounded">id</code> key) ·
        Publish to <code className="bg-blue-100 px-1 rounded">dispense</code> (confirmation payload must include <code className="bg-blue-100 px-1 rounded">id</code>)
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants} className="bg-muted p-1 rounded-lg flex gap-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all cursor-pointer ${
              tab === t.id
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </motion.div>

      {/* ── Publish Tab ───────────────────────────────────────────────────── */}
      {tab === 'publish' && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowUpCircle size={16} className="text-blue-500" /> Publish to Topic
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <FieldLabel>Topic</FieldLabel>
                  <div className="flex gap-2 flex-wrap">
                    {['order', 'dispense'].map(t => (
                      <button
                        key={t}
                        onClick={() => handleTopicChange(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          pubTopic === t
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                    <Input
                      placeholder="custom/topic"
                      value={['order', 'dispense'].includes(pubTopic) ? '' : pubTopic}
                      onChange={e => setPubTopic(e.target.value)}
                      className="h-8 text-xs w-40"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Currently publishing to: <code className="bg-muted px-1 rounded font-mono">{pubTopic}</code>
                  </p>
                </div>

                <div>
                  <FieldLabel>Payload (JSON)</FieldLabel>
                  <textarea
                    value={pubPayload}
                    onChange={e => setPubPayload(e.target.value)}
                    rows={8}
                    spellCheck={false}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl p-3 resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {pubError && <ErrorBanner message={pubError} />}

                <Button onClick={handlePublish} disabled={pubLoading} className="gap-2">
                  {pubLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Publish
                </Button>

                {pubResult && (
                  <div>
                    <FieldLabel>Response</FieldLabel>
                    <JsonBlock data={pubResult} />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* ── Simulate Dispense Tab ─────────────────────────────────────────── */}
      {tab === 'simulate' && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PlayCircle size={16} className="text-emerald-500" /> Simulate ESP32 Dispense Confirmation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
                  This bypasses MQTT and fires the dispense confirmation directly on the server bus — use it to test the kiosk dispensing flow without physical hardware.
                </div>

                <div>
                  <FieldLabel>Machine ID</FieldLabel>
                  <Input
                    placeholder="e.g. clxxx123..."
                    value={simMachineId}
                    onChange={e => setSimMachineId(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>

                <div>
                  <FieldLabel>Slot Results — toggle true (ok) / false (malfunction)</FieldLabel>
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map(n => {
                      const key = `slot${n}`;
                      const ok = simSlots[key];
                      return (
                        <button
                          key={key}
                          onClick={() => setSimSlots(s => ({ ...s, [key]: !ok }))}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                            ok
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-rose-50 border-rose-200 text-rose-600'
                          }`}
                        >
                          <span>Slot {n}</span>
                          {ok
                            ? <CheckCircle2 size={16} className="text-emerald-500" />
                            : <XCircle size={16} className="text-rose-500" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setSimSlots({ slot1: true, slot2: true, slot3: true, slot4: true, slot5: true, slot6: true })}
                      className="text-[11px] text-emerald-600 hover:underline cursor-pointer"
                    >
                      All OK
                    </button>
                    <span className="text-muted-foreground text-[11px]">·</span>
                    <button
                      onClick={() => setSimSlots({ slot1: false, slot2: false, slot3: false, slot4: false, slot5: false, slot6: false })}
                      className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                    >
                      All Fail
                    </button>
                  </div>
                </div>

                {simError && <ErrorBanner message={simError} />}

                <Button onClick={handleSimulate} disabled={simLoading} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  {simLoading ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
                  Fire Simulate
                </Button>

                {simResult && (
                  <div>
                    <FieldLabel>Result</FieldLabel>
                    <JsonBlock data={simResult} />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* ── Order Inbox Tab (ESP32 view) ──────────────────────────────────── */}
      {tab === 'order-inbox' && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowDownCircle size={16} className="text-blue-500" />
                    Order Inbox — what the ESP32 receives on <code className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-mono">order</code>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchOrderMessages}
                      title="Refresh once"
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                    >
                      <RefreshCw size={14} className="text-muted-foreground" />
                    </button>
                    <Button
                      size="sm"
                      variant={orderPolling ? 'destructive' : 'default'}
                      onClick={toggleOrderPolling}
                      className="gap-1.5 h-7 text-xs"
                    >
                      {orderPolling
                        ? <><WifiOff size={12} /> Stop</>
                        : <><Wifi size={12} /> Start Live</>}
                    </Button>
                  </div>
                </div>
                {orderPolling && (
                  <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    Polling every 2s — showing only <strong>order</strong> topic
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700 mb-4">
                  This is a read-only view of <code className="bg-amber-100 px-1 rounded">order</code> messages that the server has published. The ESP32 subscribes to this topic and reads the slot quantities.
                </div>

                {orderMessages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    <ArrowDownCircle size={32} className="mx-auto mb-3 opacity-20" />
                    No order messages yet. Send an order from the kiosk or use the <strong>Publish</strong> tab.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                    {orderMessages.map((msg) => {
                      const p = typeof msg.payload === 'object' ? msg.payload : {};
                      const slots = [1, 2, 3, 4, 5, 6].map(n => ({
                        key: `slot${n}`,
                        n,
                        qty: p[`slot${n}`] ?? 0,
                      }));
                      const hasOrder = slots.some(s => s.qty > 0);
                      return (
                        <div key={msg.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                          {/* Header row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TopicBadge topic={msg.topic} />
                              {p.id && (
                                <span className="text-[11px] font-mono text-slate-500 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                                  id: {p.id}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(msg.ts).toLocaleTimeString()}
                            </span>
                          </div>

                          {/* Slot grid — visual ESP32 view */}
                          <div className="grid grid-cols-6 gap-2">
                            {slots.map(({ key, n, qty }) => (
                              <div
                                key={key}
                                className={`flex flex-col items-center justify-center rounded-xl py-3 border text-center transition-all ${
                                  qty > 0
                                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                                    : 'bg-white border-slate-200 text-slate-400'
                                }`}
                              >
                                <span className="text-[10px] font-bold uppercase tracking-wider mb-1">
                                  S{n}
                                </span>
                                <span className={`text-2xl font-black ${qty > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                                  {qty}
                                </span>
                                <span className="text-[9px] mt-0.5 font-medium">
                                  {qty > 0 ? 'dispense' : 'skip'}
                                </span>
                              </div>
                            ))}
                          </div>

                          {!hasOrder && (
                            <p className="text-[11px] text-muted-foreground text-center">All slots are 0 — nothing to dispense</p>
                          )}

                          {/* Raw JSON toggle */}
                          <details className="text-[11px]">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
                              Raw JSON
                            </summary>
                            <pre className="mt-2 font-mono text-slate-600 bg-white border border-slate-100 rounded-lg p-2 whitespace-pre-wrap break-words">
                              {JSON.stringify(p, null, 2)}
                            </pre>
                          </details>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* ── Monitor Tab ───────────────────────────────────────────────────── */}
      {tab === 'monitor' && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowDownCircle size={16} className="text-violet-500" />
                    Live Message Monitor
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchMessages}
                      title="Refresh once"
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                    >
                      <RefreshCw size={14} className="text-muted-foreground" />
                    </button>
                    <Button
                      size="sm"
                      variant={polling ? 'destructive' : 'default'}
                      onClick={togglePolling}
                      className="gap-1.5 h-7 text-xs"
                    >
                      {polling
                        ? <><WifiOff size={12} /> Stop</>
                        : <><Wifi size={12} /> Start Live</>}
                    </Button>
                    <button
                      onClick={clearAllMessages}
                      title="Clear log"
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} className="text-destructive/60" />
                    </button>
                  </div>
                </div>
                {polling && (
                  <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    Polling every 2s
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    <Radio size={32} className="mx-auto mb-3 opacity-20" />
                    No messages yet. Hit <strong>Start Live</strong> or <strong>Refresh</strong>.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <TopicBadge topic={msg.topic} />
                          <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                            {new Date(msg.ts).toLocaleTimeString()}
                          </span>
                        </div>
                        <pre className="text-[11px] font-mono text-slate-600 whitespace-pre-wrap break-words">
                          {typeof msg.payload === 'string'
                            ? msg.payload
                            : JSON.stringify(msg.payload, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
