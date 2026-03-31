import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  Copy, 
  RefreshCw, 
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
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      <div className="min-h-screen bg-[#F5F5F5] text-gray-900 font-sans selection:bg-gray-200">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                <FileText className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Hindi OCR & Writer</h1>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Expert Hindi Application Assistant</p>
              </div>
            </div>
            {image && (
              <button 
                onClick={reset}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reset
              </button>
            )}
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-12">
          {!image ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl font-light mb-4 tracking-tight">इमेज से प्रोफेशनल आवेदन बनाएं</h2>
                <p className="text-gray-500 text-lg">हस्तलिखित या प्रिंटेड इमेज अपलोड करें, हम उसे शुद्ध हिंदी में सरकारी आवेदन में बदल देंगे।</p>
              </div>

              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group relative border-2 border-dashed border-gray-300 rounded-3xl p-16 text-center cursor-pointer hover:border-gray-900 hover:bg-white transition-all duration-300"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div className="mb-6 flex justify-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-10 h-10 text-gray-400 group-hover:text-gray-900" />
                  </div>
                </div>
                <p className="text-xl font-medium mb-2">इमेज यहाँ ड्रैग करें या क्लिक करें</p>
                <p className="text-gray-400">JPG, PNG या WEBP (Max 10MB)</p>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Left Column: Image Preview & Controls */}
              <div className="lg:col-span-5 space-y-8">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                      <ImageIcon className="w-4 h-4" />
                      Original Image
                    </div>
                  </div>
                  <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center p-4">
                    <img 
                      src={image} 
                      alt="Uploaded preview" 
                      className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </motion.div>

                {!result && !isProcessing && (
                  <button 
                    onClick={processImage}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-semibold text-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-3 shadow-lg shadow-gray-200"
                  >
                    प्रोसेस शुरू करें
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}

                {isProcessing && (
                  <div className="bg-white rounded-3xl p-8 border border-gray-200 text-center space-y-6">
                    <div className="relative w-24 h-24 mx-auto">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          className="text-gray-100"
                        />
                        <motion.circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={251.2}
                          animate={{ strokeDashoffset: 251.2 - (251.2 * progress) / 100 }}
                          className="text-gray-900"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold">{progress}%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium text-gray-900">इमेज को पढ़ा जा रहा है...</p>
                      <p className="text-sm text-gray-500 italic">"हम व्याकरण और वर्तनी (spelling) भी सुधार रहे हैं"</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 text-red-600">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}
              </div>

              {/* Right Column: Results */}
              <div className="lg:col-span-7">
                <AnimatePresence mode="wait">
                  {result ? (
                    <motion.div 
                      key="result"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-8"
                    >
                      {/* Formatted Draft */}
                      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900 transition-all">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <h3 className="font-semibold text-gray-900">✔️ Final Draft Ready</h3>
                            <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded uppercase font-bold">Editable</span>
                          </div>
                          <button 
                            onClick={() => copyToClipboard(result.formattedDraft)}
                            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
                          >
                            {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            {copied ? "Copied!" : "Copy Draft"}
                          </button>
                        </div>
                        <div className="p-0">
                          <textarea
                            value={result.formattedDraft}
                            onChange={(e) => setResult({ ...result, formattedDraft: e.target.value })}
                            className="w-full p-8 text-gray-900 leading-relaxed bg-transparent border-none focus:ring-0 min-h-[500px] resize-y font-serif text-lg"
                            placeholder="Professional draft will appear here..."
                          />
                        </div>
                      </div>
                    </motion.div>
                  ) : !isProcessing && (
                    <div className="h-full min-h-[400px] border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 p-12 text-center">
                      <FileText className="w-16 h-16 mb-4 opacity-20" />
                      <p className="text-lg">प्रोसेस शुरू करने के बाद आपका आवेदन यहाँ दिखाई देगा</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-20 py-12 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-400">© 2026 Hindi OCR & Writer. Built for professional efficiency.</p>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
