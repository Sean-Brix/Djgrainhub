import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hand, Settings, Lock, User, X, ShieldAlert, Eye, EyeOff, MessageSquareWarning, Send, CheckCircle2, ChevronDown } from 'lucide-react';
import logo from '@/assets/c35d81f584a09df9348d8ddde3e202e99fefbfbb.png';
import { validateCredentials } from '@/app/lib/auth';
import { useData } from '@/app/lib/DataContext';

interface IdlePageProps {
  onStart: () => void;
  onAdminExit?: () => void;
  machineId?: string;
}

const BACKGROUND_COLORS = [`var(--primary)`, `var(--secondary)`, `var(--muted)`]; // Deep, premium grain greens

export function IdlePage({ onStart, onAdminExit, machineId }: IdlePageProps) {
  const { addReport } = useData();
  const [colorIndex, setColorIndex] = useState(0);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  // Report ticket state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [reportName, setReportName] = useState('');
  const [reportMobile, setReportMobile] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportError, setReportError] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const reportTextRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % BACKGROUND_COLORS.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Generate some "floating grain" positions
  const grains = Array.from({ length: 25 }).map((_, i) => ({
    id: i,
    initialX: Math.random() * 100,
    initialY: Math.random() * 100,
    duration: 15 + Math.random() * 25,
    delay: Math.random() * 10,
    size: 8 + Math.random() * 12
  }));

  const handleAdminClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAdminModal(true);
    setAdminUsername('');
    setAdminPassword('');
    setAdminError('');
    setShowPassword(false);
    setTimeout(() => usernameRef.current?.focus(), 100);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setAdminLoading(true);

    // Small delay for UX
    await new Promise(r => setTimeout(r, 800));

    const user = await validateCredentials(adminUsername, adminPassword);
    if (user) {
      setShowAdminModal(false);
      setAdminLoading(false);
      onAdminExit?.();
    } else {
      setAdminError('Invalid credentials. Access denied.');
      setAdminLoading(false);
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
    }
  };

  const handleModalBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.target === e.currentTarget) {
      setShowAdminModal(false);
    }
  };

  const handleReportClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowReportModal(true);
    setReportCategory('');
    setReportMessage('');
    setReportName('');
    setReportMobile('');
    setReportSubmitted(false);
    setReportError('');
    setShowCategoryDropdown(false);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedName = reportName.trim();
    const normalizedMobile = reportMobile.trim();
    const normalizedMessage = reportMessage.trim();
    const mobileDigits = (normalizedMobile.match(/\d/g) || []).length;

    if (!reportCategory || !normalizedName || !normalizedMobile || !normalizedMessage) {
      setReportError('All fields are required.');
      return;
    }

    if (mobileDigits < 10) {
      setReportError('Please enter a valid mobile number (at least 10 digits).');
      return;
    }

    setReportSubmitting(true);
    setReportError('');

    try {
      if (!machineId) {
        throw new Error('No kiosk machine selected');
      }

      await addReport({
        id: `rpt-kiosk-${Date.now()}`,
        machineId,
        category: reportCategory,
        message: normalizedMessage,
        name: normalizedName,
        mobileNumber: normalizedMobile,
        timestamp: new Date().toISOString(),
        status: 'open',
      });

      setReportSubmitted(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSubmitted(false);
      }, 2500);
    } catch (error) {
      console.error('[Kiosk] Failed to submit report:', error);
      const message = error instanceof Error ? error.message : '';
      if (message) {
        setReportError(message);
      } else {
        setReportError('Unable to send report right now. Please try again.');
      }
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleReportBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.target === e.currentTarget) {
      setShowReportModal(false);
    }
  };

  const REPORT_CATEGORIES = [
    'Machine Jam',
    'Payment Issue',
    'Product Quality',
    'Display Problem',
    'Other',
  ];

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center text-white cursor-pointer select-none overflow-hidden font-sans"
      style={{ backgroundColor: BACKGROUND_COLORS[0] }}
      animate={{ backgroundColor: BACKGROUND_COLORS[colorIndex] }}
      transition={{ duration: 5, ease: "linear" }}
      onClick={onStart}
    >
      {/* Top-right action buttons */}
      <div className="absolute top-8 right-8 flex items-center gap-4 z-50">
        <button 
          onClick={handleReportClick} 
          className="p-3 bg-white/5 backdrop-blur-md rounded-2xl opacity-40 hover:opacity-100 hover:bg-white/15 transition-all cursor-pointer border border-white/10 shadow-lg"
          title="Report an Issue"
        >
          <MessageSquareWarning size={22} className="text-accent" />
        </button>
        <button 
          onClick={handleAdminClick} 
          className="p-3 bg-white/5 backdrop-blur-md rounded-2xl opacity-40 hover:opacity-100 hover:bg-white/15 transition-all cursor-pointer border border-white/10 shadow-lg"
          title="Admin Dashboard"
        >
          <Settings size={22} />
        </button>
      </div>

      {/* Admin Credentials Modal */}
      <AnimatePresence>
        {showAdminModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-6 cursor-default"
            onClick={handleModalBackdropClick}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8">
                {/* Header */}
                <div className="flex flex-col items-center mb-8">
                  <div className="w-16 h-16 rounded-3xl bg-primary/5 flex items-center justify-center mb-4">
                    <ShieldAlert size={32} className="text-primary" />
                  </div>
                  <h3 className="text-slate-900 text-2xl font-black tracking-tight">Admin Terminal</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Authorized Access Only</p>
                </div>

                {/* Form */}
                <form onSubmit={handleAdminLogin} className="space-y-6">
                  {/* Error Message */}
                  <AnimatePresence>
                    {adminError && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ 
                          opacity: 1, 
                          scale: 1,
                          x: shakeError ? [0, -6, 6, -6, 6, 0] : 0
                        }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-rose-50 border border-rose-100 rounded-2xl px-5 py-3 flex items-center gap-3"
                      >
                        <Lock size={16} className="text-rose-500 shrink-0" />
                        <p className="text-rose-600 text-xs font-bold">{adminError}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-4">
                    <div className="relative group">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <input
                        ref={usernameRef}
                        type="text"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 text-slate-900 text-sm font-bold placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Admin Username"
                        required
                        autoComplete="off"
                      />
                    </div>

                    <div className="relative group">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-12 py-4 text-slate-900 text-sm font-bold placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Security Key"
                        required
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={adminLoading || !adminUsername || !adminPassword}
                    className="w-full h-14 bg-primary hover:bg-primary/90 disabled:bg-primary/30 disabled:cursor-not-allowed text-white font-black rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
                  >
                    {adminLoading ? (
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldAlert size={18} />
                        <span>Unlock Console</span>
                      </>
                    )}
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => setShowAdminModal(false)}
                    className="w-full text-center text-slate-300 font-bold text-[10px] uppercase tracking-[0.2em] hover:text-slate-500 transition-colors"
                  >
                    Return to Hub
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Issue Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-6 cursor-default"
            onClick={handleReportBackdropClick}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-[4vh] max-h-[85vh] flex flex-col">
                <div className="flex flex-col items-center mb-[2vh] shrink-0">
                  <div className="w-[8vh] h-[8vh] max-w-[64px] max-h-[64px] rounded-[1.5vh] bg-orange-50 flex items-center justify-center mb-[1.5vh]">
                    <MessageSquareWarning size={32} className="text-orange-500 w-[50%] h-[50%]" />
                  </div>
                  <h3 className="text-slate-900 text-[2.5vh] font-black tracking-tight text-center leading-tight">Support Request</h3>
                </div>

                <div className="overflow-y-auto flex-1 pr-1 -mr-1 custom-scrollbar">
                  <AnimatePresence mode="wait">
                    {reportSubmitted ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center py-[2vh] gap-[2vh]"
                      >
                        <div className="w-[10vh] h-[10vh] max-w-[80px] max-h-[80px] rounded-full bg-emerald-50 flex items-center justify-center">
                          <CheckCircle2 size={40} className="text-emerald-500 w-[50%] h-[50%]" />
                        </div>
                        <div className="text-center">
                           <h4 className="text-slate-900 text-[2.2vh] font-black">Ticket Logged!</h4>
                           <p className="text-slate-500 text-[1.4vh] font-medium mt-1">Our technicians are on it.</p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.form
                        key="form"
                        onSubmit={handleReportSubmit}
                        className="space-y-[2vh]"
                      >
                        <div className="space-y-1">
                          <label className="text-slate-400 text-[1.2vh] font-black uppercase tracking-widest ml-1">What's wrong?</label>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                              className="w-full bg-slate-50 border-none rounded-2xl px-[2vh] py-[1.8vh] text-left text-[1.6vh] font-bold flex items-center justify-between focus:ring-2 focus:ring-orange-200 transition-all cursor-pointer"
                            >
                              <span className={reportCategory ? 'text-slate-900' : 'text-slate-300'}>
                                {reportCategory || 'Select issue type'}
                              </span>
                              <ChevronDown className={`text-slate-400 transition-transform duration-300 w-[1.8vh] h-[1.8vh] ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                              {showCategoryDropdown && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl overflow-hidden z-10 shadow-xl"
                                >
                                  {REPORT_CATEGORIES.map((cat) => (
                                    <button
                                      key={cat}
                                      type="button"
                                      onClick={() => {
                                        setReportCategory(cat);
                                        setShowCategoryDropdown(false);
                                        setTimeout(() => reportTextRef.current?.focus(), 100);
                                      }}
                                      className={`w-full text-left px-[2vh] py-[1.5vh] text-[1.4vh] font-bold transition-all cursor-pointer ${
                                        reportCategory === cat
                                          ? 'bg-orange-50 text-orange-600'
                                          : 'text-slate-600 hover:bg-slate-50'
                                      }`}
                                    >
                                      {cat}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-[1.5vh]">
                          <div className="space-y-1">
                            <label className="text-slate-400 text-[1.2vh] font-black uppercase tracking-widest ml-1">Your Name</label>
                            <input
                              type="text"
                              value={reportName}
                              onChange={(e) => setReportName(e.target.value)}
                              className="w-full bg-slate-50 border-none rounded-2xl px-[2vh] py-[1.8vh] text-slate-900 text-[1.6vh] font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-orange-200 transition-all"
                              placeholder="Full Name"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-slate-400 text-[1.2vh] font-black uppercase tracking-widest ml-1">Mobile Number</label>
                            <input
                              type="tel"
                              value={reportMobile}
                              onChange={(e) => setReportMobile(e.target.value)}
                              className="w-full bg-slate-50 border-none rounded-2xl px-[2vh] py-[1.8vh] text-slate-900 text-[1.6vh] font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-orange-200 transition-all"
                              placeholder="e.g. 0917-000-0000"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-400 text-[1.2vh] font-black uppercase tracking-widest ml-1">Details</label>
                          <textarea
                            ref={reportTextRef}
                            value={reportMessage}
                            onChange={(e) => setReportMessage(e.target.value)}
                            rows={2}
                            className="w-full bg-slate-50 border-none rounded-2xl px-[2vh] py-[1.8vh] text-slate-900 text-[1.6vh] font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-orange-200 transition-all resize-none"
                            placeholder="Describe the problem..."
                            required
                          />
                        </div>

                        {reportError && (
                          <p className="text-red-500 text-[1.2vh] font-bold px-1">{reportError}</p>
                        )}

                          <button
                            type="submit"
                            disabled={reportSubmitting || !reportCategory || !reportMessage.trim() || !reportName.trim() || !reportMobile.trim()}
                            className="w-full h-[7vh] min-h-[48px] bg-orange-500 hover:bg-orange-600 disabled:bg-orange-200 disabled:cursor-not-allowed text-white font-black rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-[1.5vh] cursor-pointer"
                          >
                          {reportSubmitting ? (
                            <div className="w-[2.5vh] h-[2.5vh] border-3 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <Send className="w-[2vh] h-[2vh]" />
                              <span className="text-[1.8vh]">Send Support Log</span>
                            </>
                          )}
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {grains.map((grain) => (
          <motion.div
            key={grain.id}
            style={{ 
              left: `${grain.initialX}%`, 
              top: `${grain.initialY}%`,
              width: grain.size, 
              height: grain.size * 1.6,
              borderRadius: '60% 60% 40% 40% / 80% 80% 20% 20%',
              opacity: 0.1
            }}
            animate={{ 
              x: [0, 60, -60, 0],
              y: [0, -100, 100, 0],
              rotate: [0, 180, 360],
              opacity: [0.05, 0.2, 0.05]
            }}
            transition={{ 
              duration: grain.duration, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: grain.delay
            }}
            className="absolute bg-accent/40 blur-[0.5px]"
          />
        ))}
        
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            x: [-50, 150, -50],
            y: [-50, 100, -50],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{ repeat: Infinity, duration: 20, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-accent rounded-full blur-[140px]"
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            x: [100, -150, 100],
            y: [100, -100, 100],
            opacity: [0.05, 0.2, 0.05]
          }}
          transition={{ repeat: Infinity, duration: 25, ease: "easeInOut" }}
          className="absolute bottom-[-20%] right-[-20%] w-[90%] h-[90%] bg-emerald-400 rounded-full blur-[160px]"
        />
      </div>

      <div className="flex flex-col items-center justify-center z-10 w-full h-full p-[4vh] relative overflow-hidden">
        {/* Central Logo & Visuals */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="relative mb-[4vh]"
        >
          <div className="w-[18vh] h-[18vh] sm:w-[25vh] sm:h-[25vh] md:w-[30vh] md:h-[30vh] max-w-[280px] max-h-[280px] bg-white/5 backdrop-blur-2xl rounded-[20%] flex items-center justify-center shadow-[0_0_80px_rgba(0,0,0,0.1)] border border-white/10 relative">
            <motion.img 
              src={logo} 
              alt="DJ Grain Hub" 
              className="w-[60%] h-[60%] object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
              animate={{ 
                y: [0, -10, 0],
                rotate: [-2, 2, -2]
              }}
              transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
            />
            
            {/* Corner Accents */}
            <div className="absolute top-[8%] left-[8%] w-[12%] h-[12%] border-t-2 border-l-2 border-accent/40 rounded-tl-xl" />
            <div className="absolute bottom-[8%] right-[8%] w-[12%] h-[12%] border-b-2 border-r-2 border-accent/40 rounded-br-xl" />
          </div>
          
          {/* External decorative rings */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
            className="absolute -inset-[10%] border border-white/5 rounded-[25%]"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
            className="absolute -inset-[15%] border border-white/5 rounded-[30%]"
          />
        </motion.div>

        {/* Text Area */}
        <div className="text-center space-y-[1vh] max-w-2xl px-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-[5vh] sm:text-[7vh] md:text-[9vh] font-black tracking-tighter leading-none"
          >
            <span className="text-white block">FRESHLY</span>
            <span className="text-accent">MILLED RICE</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.6 }}
            className="text-[1.2vh] sm:text-[1.8vh] font-bold tracking-[0.3em] uppercase text-white/80"
          >
            Premium Local Grains · Zero Additives
          </motion.p>
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-[4vh] sm:mt-[6vh] flex flex-col items-center gap-[2vh]"
        >
          <div className="relative">
            <motion.div 
              animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut" }}
              className="absolute inset-0 bg-white/20 rounded-full"
            />
            <div className="w-[7vh] h-[7vh] sm:w-[9vh] sm:h-[9vh] bg-accent rounded-[20%] flex items-center justify-center shadow-2xl relative z-10 hover:scale-110 transition-transform">
              <Hand className="text-primary w-[50%] h-[50%]" />
            </div>
          </div>
          <div className="text-center">
             <p className="text-[1.8vh] sm:text-[2.2vh] font-black text-white tracking-[0.2em] animate-pulse">TOUCH TO BEGIN</p>
             <p className="text-[0.9vh] sm:text-[1vh] font-bold text-white/30 uppercase tracking-[0.4em] mt-[0.5vh]">Mobile PWA Terminal v1.0</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
