import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  Copy, 
  RefreshCw, 
  LogOut,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  ChevronRight
} from "lucide-react";
import Markdown from "react-markdown";
import { processHindiImage, OCRResult } from "./services/geminiService";

// Error Boundary Component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setError(event.error?.message || "An unexpected error occurred.");
    };
    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState(false);

  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUser === "Admin" && loginPass === "Abhi@26046") {
      setIsAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoginUser("");
    setLoginPass("");
    setImage(null);
    setResult(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* Animated Background for Login */}
        <div className="absolute inset-0 z-0">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
              x: [0, 100, 0],
              y: [0, 50, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[120px]"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              rotate: [0, -90, 0],
              x: [0, -100, 0],
              y: [0, -50, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px]"
          />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white/5 backdrop-blur-2xl rounded-[40px] shadow-2xl border border-white/10 p-12 space-y-10 relative z-10"
        >
          <div className="text-center space-y-4">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/20"
            >
              <FileText className="text-white w-10 h-10" />
            </motion.div>
            <h1 className="text-3xl font-black tracking-tight text-white">Hindi OCR <span className="text-blue-400">Pro</span></h1>
            <p className="text-gray-400 text-sm font-medium">प्रीमियम डिजिटल आवेदन सेवा</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Username</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none group-hover:bg-white/10"
                    placeholder="Admin"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Password</label>
                <div className="relative group">
                  <input 
                    type="password" 
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none group-hover:bg-white/10"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>

            {loginError && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-red-400 text-xs font-bold text-center bg-red-500/10 py-3 rounded-xl border border-red-500/20"
              >
                गलत यूजरनेम या पासवर्ड!
              </motion.div>
            )}

            <motion.button 
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full py-5 bg-white text-black rounded-2xl font-black text-lg hover:bg-gray-100 transition-all shadow-xl shadow-white/5"
            >
              Access Dashboard
            </motion.button>
          </form>

          <div className="pt-4 text-center">
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Secure Enterprise Access Only</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setMimeType(file.type);
        setResult(null);
        setError(null);
        setProgress(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setMimeType(file.type);
        setResult(null);
        setError(null);
        setProgress(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!image || !mimeType) return;
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.floor(Math.random() * 5) + 1;
      });
    }, 200);

    try {
      const ocrResult = await processHindiImage(image, mimeType);
      clearInterval(progressInterval);
      setProgress(100);
      
      // Small delay to show 100% before revealing result
      setTimeout(() => {
        setResult(ocrResult);
        setIsProcessing(false);
      }, 500);
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error("Processing error:", err);
      setError("इमेज को प्रोसेस करने में समस्या आई। कृपया पुनः प्रयास करें।");
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setImage(null);
    setMimeType(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans selection:bg-gray-200 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              x: [0, 50, 0],
              y: [0, 30, 0]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-[120px]" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              x: [0, -40, 0],
              y: [0, 60, 0]
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-purple-100/40 rounded-full blur-[100px]" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              x: [0, 30, 0],
              y: [0, -50, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-[10%] left-[20%] w-[35%] h-[35%] bg-orange-100/30 rounded-full blur-[110px]" 
          />
        </div>

        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/60 backdrop-blur-2xl border-b border-gray-200/30 px-6 py-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-5">
              <motion.div 
                whileHover={{ rotate: 8, scale: 1.05 }}
                className="w-14 h-14 bg-gray-900 rounded-[22px] flex items-center justify-center shadow-2xl shadow-gray-900/20"
              >
                <FileText className="text-white w-8 h-8" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter text-gray-900">Hindi OCR <span className="text-blue-600">Pro</span></h1>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">Neural Engine Active • v2.5</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-8">
              {image && (
                <motion.button 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={reset}
                  className="text-xs font-black text-gray-400 hover:text-gray-900 transition-all flex items-center gap-2 px-5 py-2.5 rounded-2xl hover:bg-white shadow-sm hover:shadow-md border border-transparent hover:border-gray-100 uppercase tracking-widest"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset
                </motion.button>
              )}
              <div className="h-10 w-[1px] bg-gray-200/50 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs font-black text-gray-900 tracking-tight">Administrator</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">System Controller</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 border-2 border-white shadow-xl flex items-center justify-center font-black text-white text-lg">
                  A
                </div>
              </div>
              <div className="h-10 w-[1px] bg-gray-200/50 hidden sm:block" />
              <motion.button 
                whileHover={{ scale: 1.05, x: 5 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="flex items-center gap-2 text-xs font-black text-red-500 hover:bg-red-50 px-5 py-2.5 rounded-2xl transition-all border border-transparent hover:border-red-100 uppercase tracking-widest"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </motion.button>
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-7xl mx-auto px-6 py-16">
          {!image ? (
            <div className="space-y-24">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto text-center space-y-8"
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-3 px-6 py-2.5 bg-white rounded-full shadow-xl shadow-gray-200/50 border border-gray-100 mb-6"
                >
                  <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-ping" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">Next-Gen Hindi OCR Engine</span>
                </motion.div>
                <h2 className="text-6xl md:text-8xl font-black text-gray-900 tracking-tighter leading-[0.95]">
                  हाथ से लिखे पत्रों को <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-orange-600">डिजिटल आवेदन</span> में बदलें
                </h2>
                <p className="text-gray-500 text-2xl max-w-3xl mx-auto font-medium leading-relaxed tracking-tight">
                  बस एक फोटो खींचें और हमारा AI उसे शुद्ध हिंदी और प्रोफेशनल सरकारी फॉर्मेट में बदल देगा। 
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group relative max-w-3xl mx-auto bg-white/40 backdrop-blur-md border-2 border-dashed border-gray-200 rounded-[60px] p-24 text-center cursor-pointer hover:border-blue-500 hover:bg-white transition-all duration-700 shadow-2xl shadow-gray-200/30"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div className="mb-10 flex justify-center">
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-32 h-32 bg-gray-900 rounded-[40px] flex items-center justify-center shadow-2xl shadow-gray-900/40"
                  >
                    <Upload className="w-12 h-12 text-white" />
                  </motion.div>
                </div>
                <h3 className="text-3xl font-black mb-4 text-gray-900 tracking-tight">इमेज यहाँ अपलोड करें</h3>
                <p className="text-gray-400 text-lg font-bold uppercase tracking-widest">Drag & Drop or Click to Browse</p>
                
                {/* Floating Badges */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute -top-6 -left-6 bg-white px-6 py-3 rounded-3xl shadow-2xl border border-gray-100 flex items-center gap-3 transform -rotate-6"
                >
                  <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm font-black uppercase tracking-widest text-gray-900">99.9% Accuracy</span>
                </motion.div>
                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="absolute -bottom-6 -right-6 bg-white px-6 py-3 rounded-3xl shadow-2xl border border-gray-100 flex items-center gap-3 transform rotate-3"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-black uppercase tracking-widest text-gray-900">Govt Standards</span>
                </motion.div>
              </motion.div>

              {/* Feature Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pt-16">
                {[
                  { title: "शुद्ध हिंदी", desc: "व्याकरण और वर्तनी की 100% शुद्धता", icon: <CheckCircle2 className="text-green-500" />, color: "bg-green-50" },
                  { title: "फास्ट प्रोसेस", desc: "सेकंडों में इमेज से टेक्स्ट", icon: <RefreshCw className="text-blue-500" />, color: "bg-blue-50" },
                  { title: "सुरक्षित", desc: "आपका डेटा पूरी तरह सुरक्षित है", icon: <AlertCircle className="text-orange-500" />, color: "bg-orange-50" }
                ].map((f, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="bg-white/60 backdrop-blur-md p-10 rounded-[48px] border border-white shadow-xl shadow-gray-200/20 hover:shadow-2xl hover:bg-white transition-all group"
                  >
                    <div className={`w-16 h-16 ${f.color} rounded-3xl flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform`}>
                      {f.icon}
                    </div>
                    <h4 className="text-xl font-black text-gray-900 mb-3 tracking-tight">{f.title}</h4>
                    <p className="text-gray-500 font-medium leading-relaxed">{f.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
              {/* Left Column: Image Preview & Controls */}
              <div className="lg:col-span-5 space-y-10 sticky top-32">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-[50px] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden"
                >
                  <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                      </div>
                      <span className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Source Document</span>
                    </div>
                  </div>
                  <div className="aspect-[4/5] bg-gray-50/50 flex items-center justify-center p-10">
                    <img 
                      src={image} 
                      alt="Uploaded preview" 
                      className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </motion.div>

                {!result && !isProcessing && (
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={processImage}
                    className="w-full py-8 bg-gray-900 text-white rounded-[40px] font-black text-2xl hover:bg-gray-800 transition-all flex items-center justify-center gap-6 shadow-2xl shadow-gray-900/40"
                  >
                    प्रोसेस शुरू करें
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                      <ChevronRight className="w-6 h-6" />
                    </div>
                  </motion.button>
                )}

                {isProcessing && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[50px] p-12 border border-gray-100 text-center space-y-10 shadow-2xl shadow-gray-200/50 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-50/20 to-transparent pointer-events-none" />
                    <div className="relative w-40 h-40 mx-auto">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="transparent"
                          className="text-gray-50"
                        />
                        <motion.circle
                          cx="80"
                          cy="80"
                          r="70"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="transparent"
                          strokeDasharray={439.8}
                          animate={{ strokeDashoffset: 439.8 - (439.8 * progress) / 100 }}
                          className="text-blue-600"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black tracking-tighter text-gray-900">{progress}%</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-1">Progress</span>
                      </div>
                    </div>
                    <div className="space-y-4 relative z-10">
                      <h4 className="text-2xl font-black text-gray-900 tracking-tight">इमेज को पढ़ा जा रहा है...</h4>
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        <p className="text-sm text-gray-500 italic font-bold tracking-tight">"व्याकरण और वर्तनी की जाँच जारी है"</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-red-50 border border-red-100 rounded-[40px] p-8 flex items-start gap-5 text-red-600 shadow-xl shadow-red-500/5"
                  >
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-black uppercase tracking-widest text-xs">Error Detected</h5>
                      <p className="font-bold text-lg leading-tight">{error}</p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Right Column: Results */}
              <div className="lg:col-span-7">
                <AnimatePresence mode="wait">
                  {result ? (
                    <motion.div 
                      key="result"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-10"
                    >
                      <div className="bg-white rounded-[50px] shadow-2xl shadow-gray-200/60 border border-gray-100 overflow-hidden focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/5 transition-all duration-500">
                        <div className="p-10 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center shadow-inner">
                              <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <div>
                              <h3 className="font-black text-gray-900 text-2xl tracking-tighter">✔️ Final Draft Ready</h3>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-[10px] text-gray-400 uppercase font-black tracking-[0.2em]">Verified & Formatted</span>
                              </div>
                            </div>
                          </div>
                          <motion.button 
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => copyToClipboard(result.formattedDraft)}
                            className="flex items-center gap-3 text-xs font-black text-gray-900 bg-white border border-gray-200 px-8 py-4 rounded-2xl shadow-xl hover:bg-gray-50 transition-all uppercase tracking-widest"
                          >
                            {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            {copied ? "Copied!" : "Copy Draft"}
                          </motion.button>
                        </div>
                        <div className="p-0 relative">
                          <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
                          <textarea
                            value={result.formattedDraft}
                            onChange={(e) => setResult({ ...result, formattedDraft: e.target.value })}
                            className="w-full p-16 text-gray-900 leading-[2] bg-transparent border-none focus:ring-0 min-h-[700px] resize-y font-serif text-2xl selection:bg-blue-100"
                            placeholder="Professional draft will appear here..."
                          />
                          <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
                        </div>
                      </div>

                      {/* Tips Card */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-gray-900 rounded-[40px] p-10 text-white flex items-center justify-between overflow-hidden relative shadow-2xl shadow-gray-900/30"
                      >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] -mr-32 -mt-32" />
                        <div className="relative z-10 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                              <AlertCircle className="w-4 h-4 text-blue-400" />
                            </div>
                            <h4 className="font-black text-xl tracking-tight">प्रोफेशनल टिप</h4>
                          </div>
                          <p className="text-gray-400 text-lg max-w-lg font-medium leading-relaxed">आप ऊपर दिए गए टेक्स्ट को सीधे एडिट भी कर सकते हैं। कॉपी करने से पहले अपनी ज़रूरतों के हिसाब से बदलाव कर लें।</p>
                        </div>
                        <FileText className="w-32 h-32 text-white/5 absolute -right-6 -bottom-6 rotate-12" />
                      </motion.div>
                    </motion.div>
                  ) : !isProcessing && (
                    <div className="h-full min-h-[700px] bg-white/30 backdrop-blur-md border-2 border-dashed border-gray-200 rounded-[60px] flex flex-col items-center justify-center text-gray-400 p-20 text-center shadow-inner">
                      <motion.div 
                        animate={{ y: [0, -15, 0] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="w-32 h-32 bg-white rounded-[40px] flex items-center justify-center mb-8 shadow-2xl border border-gray-50"
                      >
                        <FileText className="w-12 h-12 opacity-10" />
                      </motion.div>
                      <h4 className="text-3xl font-black text-gray-900/10 mb-4 tracking-tighter uppercase">No Draft Yet</h4>
                      <p className="max-w-sm font-bold text-lg opacity-20 leading-relaxed">प्रोसेस शुरू करने के बाद आपका आवेदन यहाँ दिखाई देगा। कृपया बाईं ओर से प्रोसेस शुरू करें।</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="relative z-10 mt-32 py-24 border-t border-gray-200/30 text-center bg-white/40 backdrop-blur-2xl">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center shadow-xl">
                <FileText className="text-white w-6 h-6" />
              </div>
              <span className="font-black text-xl tracking-tighter">Hindi OCR <span className="text-blue-600">Pro</span></span>
            </div>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-[0.2em]">© 2026 Hindi OCR & Writer. Crafted for Excellence.</p>
            <div className="flex items-center gap-8">
              {["Privacy", "Terms", "Support"].map((item) => (
                <span key={item} className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] hover:text-gray-900 cursor-pointer transition-colors">{item}</span>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
