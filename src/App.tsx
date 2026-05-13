import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, PixelCrop } from 'react-image-crop';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  Copy, 
  RefreshCw, 
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  ChevronRight,
  MessageSquare,
  Crop as CropIcon,
  Check,
  LogOut,
  Shield,
  Key,
  Users,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Edit2,
  Star,
  Zap,
  Tag,
  Gift,
  ArrowRight,
  Menu,
  X,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Heart,
  History,
  ExternalLink
} from "lucide-react";
import Markdown from "react-markdown";
import { processHindiImage, OCRResult } from "./services/geminiService";
import BirthRegistrationForm from "./components/BirthRegistrationForm";
import { db, auth, googleProvider } from "./firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  onSnapshot,
  orderBy,
  updateDoc
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { initializeApp, deleteApp } from "firebase/app";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  getAuth
} from "firebase/auth";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: undefined,
      email: undefined,
      emailVerified: undefined,
      isAnonymous: undefined,
      tenantId: undefined,
      providerInfo: []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [userStatus, setUserStatus] = useState<string>("active");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [currentUserDocId, setCurrentUserDocId] = useState<string | null>(null);
  const [loginMode, setLoginMode] = useState<"admin" | "user">("user");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLoginPage, setShowLoginPage] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regUser, setRegUser] = useState("");
  const [regPass, setRegPass] = useState("");
  const [loginErrorMessage, setLoginErrorMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"ocr" | "users" | "history" | "janam" | "ratings">("ocr");
  const [ratingsList, setRatingsList] = useState<any[]>([]);
  const [janamSubmissions, setJanamSubmissions] = useState<any[]>([]);
  const [isJanamAdminView, setIsJanamAdminView] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newCredits, setNewCredits] = useState("3");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userActionError, setUserActionError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isDeletingScan, setIsDeletingScan] = useState<string | null>(null);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [modalMode, setModalMode] = useState<"credits" | "password" | "addCredits" | "delete" | null>(null);
  const [modalValue, setModalValue] = useState("");
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const handleRatingSubmit = async () => {
    if (ratingValue === 0) return;
    setIsSubmittingRating(true);
    try {
      if (!currentUser) return;
      await addDoc(collection(db, "ratings"), {
        userId: currentUser.uid,
        userName: userName || currentUser.email || "Unknown User",
        rating: ratingValue,
        feedback: ratingFeedback,
        createdAt: serverTimestamp()
      });
      setShowRatingModal(false);
      setRatingValue(0);
      setRatingFeedback("");
      alert("Thank you for your rating!");
    } catch (err) {
      console.error(err);
      alert("Error submitting rating: " + err);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cropping state
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropping, setIsCropping] = useState(false);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        
        // Fetch user role from Firestore
        const q = query(collection(db, "users"), where("uid", "==", user.uid));
        try {
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
        const latestDoc = querySnapshot.docs.reduce((prev, current) => {
          const prevTime = prev.data().updatedAt?.toMillis ? prev.data().updatedAt.toMillis() : (prev.data().createdAt?.toMillis ? prev.data().createdAt.toMillis() : 0);
          const currTime = current.data().updatedAt?.toMillis ? current.data().updatedAt.toMillis() : (current.data().createdAt?.toMillis ? current.data().createdAt.toMillis() : 0);
          if (currTime === prevTime) {
              return (current.data().credits || 0) > (prev.data().credits || 0) ? current : prev;
          }
          return (currTime > prevTime) ? current : prev;
        });
            const userData = latestDoc.data();
            setUserRole(userData.role);
            setUserName(userData.username || "User");
            setUserCredits(userData.credits || 0);
            setUserStatus(userData.status || "active");
            setCurrentUserDocId(latestDoc.id);
          } else {
            // If user logged in via Google and is the owner, create their record
            if (user.email === "dot91siwan@gmail.com") {
              const docRef = await addDoc(collection(db, "users"), {
                uid: user.uid,
                username: "Super Admin",
                email: user.email,
                password: "GOOGLE_AUTH",
                role: "admin",
                credits: 9999,
                status: "active",
                failedAttempts: 0,
                createdAt: serverTimestamp()
              });
              setUserRole("admin");
              setUserName("Super Admin");
              setUserCredits(9999);
              setCurrentUserDocId(docRef.id);
            } else {
              // Forced sign out if record missing
              await signOut(auth);
            }
          }
          
        // Absolute Admin Overrides (Email based)
        if (user.email === "admin@hindiocr.pro" || user.email === "dot91siwan@gmail.com") {
          setUserRole("admin");
        }
      } catch (err) {
        console.error("Role fetch error:", err);
      }
    } else {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setUserRole(null);
      setUserName(null);
      setUserCredits(0);
      setUserStatus("active");
      setCurrentUserDocId(null);
    }
  });
  return () => unsubscribe();
}, []);

// Real-time Credit/Status Sync for Current User
useEffect(() => {
  if (currentUser) {
    const qUser = query(collection(db, "users"), where("uid", "==", currentUser.uid));
    const unsubscribeUser = onSnapshot(qUser, (snapshot) => {
      if (!snapshot.empty) {
        const latestDoc = snapshot.docs.reduce((prev, current) => {
          const prevTime = prev.data().updatedAt?.toMillis ? prev.data().updatedAt.toMillis() : (prev.data().createdAt?.toMillis ? prev.data().createdAt.toMillis() : 0);
          const currTime = current.data().updatedAt?.toMillis ? current.data().updatedAt.toMillis() : (current.data().createdAt?.toMillis ? current.data().createdAt.toMillis() : 0);
          if (currTime === prevTime) {
              return (current.data().credits || 0) > (prev.data().credits || 0) ? current : prev;
          }
          return (currTime > prevTime) ? current : prev;
        });
        const userData = latestDoc.data();
        setUserCredits(userData.credits || 0);
        setUserStatus(userData.status || "active");
        setUserName(userData.username || "User");
        if (userData.role) setUserRole(userData.role);
      } else {
        // Doc is missing, sign out
        signOut(auth);
      }
    });

    return () => unsubscribeUser();
  }
}, [currentUser]);

  // Real-time Janam Submissions list for Admin/Users
  useEffect(() => {
    if (currentUser) {
      const q = userRole === "admin" 
        ? collection(db, "birth_registrations")
        : query(collection(db, "birth_registrations"), where("userId", "==", currentUser.uid));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Client-side sort
        docs.sort((a: any, b: any) => {
           const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
           const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
           return tB - tA; // descending
        });
        setJanamSubmissions(docs);
      }, (err) => {
        console.error("Janam list error:", err);
      });
      return () => unsubscribe();
    }
  }, [currentUser, userRole]);

  // Real-time Ratings list for Admin
  useEffect(() => {
    if (userRole === "admin") {
      const q = collection(db, "ratings");
      const unsubscribe = onSnapshot(q, (snapshot) => {
        let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Client-side sort descending by date
        docs.sort((a: any, b: any) => {
           const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
           const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
           return tB - tA;
        });
        setRatingsList(docs);
      }, (err) => {
        console.error("Ratings list error:", err);
      });
      return () => unsubscribe();
    }
  }, [userRole]);

  // Real-time scans list for history
  useEffect(() => {
    if (currentUser) {
      const q = query(
        collection(db, "scans"), 
        where("userId", "==", currentUser.uid)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const scans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        scans.sort((a: any, b: any) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return tB - tA;
        });
        setRecentScans(scans.slice(0, 20)); // Limit to 20 recent scans
        setHistoryError(null);
      }, (err) => {
        console.error("Scans list listen error:", err);
        if (err.message?.includes("index")) {
          setHistoryError("Firestore index required. Check console for setup link.");
        }
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  // Real-time users list for Admin
  useEffect(() => {
    if (userRole === "admin") {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        // Deduplicate using the same logic as the user fetch (latest updatedAt, then createdAt, then credits)
        const uniqueUsersMap = new Map<string, any>();
        users.forEach(user => {
            const existing = uniqueUsersMap.get(user.uid);
            if (!existing) {
                uniqueUsersMap.set(user.uid, user);
            } else {
                const prevTime = existing.updatedAt?.toMillis ? existing.updatedAt.toMillis() : (existing.createdAt?.toMillis ? existing.createdAt.toMillis() : 0);
                const currTime = user.updatedAt?.toMillis ? user.updatedAt.toMillis() : (user.createdAt?.toMillis ? user.createdAt.toMillis() : 0);
                if (currTime > prevTime || (currTime === prevTime && (user.credits || 0) > (existing.credits || 0))) {
                    uniqueUsersMap.set(user.uid, user);
                }
            }
        });
        setUsersList(Array.from(uniqueUsersMap.values()));
      }, (err) => {
        console.error("Users list listen error:", err);
      });
      return () => unsubscribe();
    }
  }, [userRole]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(false);
    setLoginErrorMessage(null);

    const cleanUser = loginUser.trim();
    const cleanPass = loginPass.trim();

    if (!cleanUser || !cleanPass) {
      setLoginError(true);
      setIsLoggingIn(false);
      return;
    }

    try {
      let email = "";
      
      if (loginMode === "admin") {
        if (cleanUser.toUpperCase() !== "ADMIN") {
          setLoginErrorMessage("Admin username must be 'ADMIN'");
          setLoginError(true);
          setIsLoggingIn(false);
          return;
        }
        // Using a v2026 email to ensure fresh account for the new master password
        email = "admin_v2026@hindiocr.pro";
      } else {
        if (cleanUser.includes("@")) {
          email = cleanUser.toLowerCase();
        } else {
          email = `${cleanUser.toLowerCase()}@hindiocr.pro`;
        }
      }

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, cleanPass);
        const user = userCredential.user;
        
        // Fetch user document AFTER successful login
        const userRef = collection(db, "users");
        const q = query(userRef, where("uid", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs.reduce((prev, current) => {
            const prevTime = prev.data().updatedAt?.toMillis ? prev.data().updatedAt.toMillis() : (prev.data().createdAt?.toMillis ? prev.data().createdAt.toMillis() : 0);
            const currTime = current.data().updatedAt?.toMillis ? current.data().updatedAt.toMillis() : (current.data().createdAt?.toMillis ? current.data().createdAt.toMillis() : 0);
            if (currTime === prevTime) {
                return (current.data().credits || 0) > (prev.data().credits || 0) ? current : prev;
            }
            return (currTime > prevTime) ? current : prev;
          });
          const userData = userDoc.data();
          
          if (userData.status === "locked" && loginMode !== "admin") {
            await signOut(auth);
            setLoginErrorMessage("This account is LOCKED. Please contact support.");
            setLoginError(true);
            setIsLoggingIn(false);
            return;
          }

          await updateDoc(doc(db, "users", userDoc.id), {
            failedAttempts: 0,
            updatedAt: serverTimestamp()
          });
        } else if (loginMode === "admin") {
          // If Firestore record missing but Auth succeeded, create it
          await addDoc(collection(db, "users"), {
            uid: user.uid,
            username: "ADMIN",
            email: "admin_v2026@hindiocr.pro",
            password: cleanPass,
            role: "admin",
            credits: 9999,
            status: "active",
            failedAttempts: 0,
            createdAt: serverTimestamp()
          });
        } else {
          // USER Login but document missing (likely deleted)
          await signOut(auth);
          setLoginErrorMessage("Admin Contect kre");
          setLoginError(true);
          setIsLoggingIn(false);
          return;
        }
      } catch (authErr: any) {
        console.warn("Auth Error Code:", authErr.code);

        // Special Admin Auto-Create Logic
        if (loginMode === "admin" && cleanPass === "Hindi@OCR@2026") {
          if (authErr.code === "auth/user-not-found" || authErr.code === "auth/invalid-credential") {
            try {
              const cred = await createUserWithEmailAndPassword(auth, email, cleanPass);
              await addDoc(collection(db, "users"), {
                uid: cred.user.uid,
                username: "ADMIN",
                email: "admin_v2026@hindiocr.pro",
                password: "Hindi@OCR@2026",
                role: "admin",
                credits: 9999,
                status: "active",
                failedAttempts: 0,
                createdAt: serverTimestamp()
              });
              return; 
            } catch (regErr: any) {
              console.error("Master Admin Reg Error:", regErr);
              if (regErr.code === "auth/email-already-in-use") {
                setLoginErrorMessage("Admin account exists but incorrect password.");
              } else {
                setLoginErrorMessage("Admin Setup Error: " + regErr.message);
              }
              setLoginError(true);
              return;
            }
          }
        }

        let msg = "Login failed. Please check credentials.";
        if (authErr.code === "auth/wrong-password" || authErr.code === "auth/invalid-credential") {
          msg = "Incorrect username or password.";
        } else if (authErr.code === "auth/too-many-requests") {
          msg = "Too many attempts. Try again later.";
        } else if (authErr.code === "auth/user-not-found") {
          msg = "Account not found.";
        }
        
        setLoginErrorMessage(msg);
        setLoginError(true);
      }
    } catch (err) {
      console.error("Critical Login error:", err);
      setLoginError(true);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginErrorMessage(null);

    const cleanUser = regUser.trim();
    const cleanPass = regPass.trim();

    if (!cleanUser || cleanPass.length < 6) {
      setLoginErrorMessage("Password must be at least 6 characters.");
      setIsLoggingIn(false);
      return;
    }

    try {
      const cleanEmail = cleanUser.toLowerCase();
      if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
        setLoginErrorMessage("Please enter a valid email address.");
        setIsLoggingIn(false);
        return;
      }

      // Check if user exists in Firestore first
      const q = query(collection(db, "users"), where("username", "==", cleanEmail));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Try logging them in automatically since they exist
        try {
          await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
          setIsRegistering(false);
          setShowLoginPage(false);
          return;
        } catch (loginErr: any) {
          setLoginUser(cleanEmail);
          setLoginPass(cleanPass);
          setLoginErrorMessage("Email is already registered. Please check your password and login.");
          setIsRegistering(false);
          setIsLoggingIn(false);
          return;
        }
      }

      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
      const user = userCredential.user;

      await addDoc(collection(db, "users"), {
        uid: user.uid,
        username: cleanEmail,
        email: cleanEmail,
        password: cleanPass,
        role: "user",
        credits: 3, // 3 Demo credits
        status: "active",
        failedAttempts: 0,
        createdAt: serverTimestamp()
      });

      setIsRegistering(false);
      setShowLoginPage(false);
    } catch (err: any) {
      console.error("Reg error details:", err);
      let msg = "Signup failed. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        // Fallback: try logging them in
        try {
          await signInWithEmailAndPassword(auth, cleanUser.toLowerCase(), cleanPass);
          setIsRegistering(false);
          setShowLoginPage(false);
          return;
        } catch (loginErr) {
          setLoginUser(cleanUser.toLowerCase());
          setLoginPass(cleanPass);
          msg = "Email already registered. Incorrect password.";
        }
      }
      setLoginErrorMessage(msg);
      setIsRegistering(false);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(false);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Google Login error:", err);
      setLoginError(true);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    reset();
  };

  const createNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = newUsername.trim();
    const cleanPassword = newPassword.trim();
    if (!cleanUsername || !cleanPassword) return;
    setIsCreatingUser(true);
    setUserActionError(null);

    try {
      const email = `${cleanUsername.toLowerCase()}@hindiocr.pro`;
      const tempApp = initializeApp(firebaseConfig, "TempCreate");
      const tempAuth = getAuth(tempApp);
      const cred = await createUserWithEmailAndPassword(tempAuth, email, cleanPassword);
      
      await addDoc(collection(db, "users"), {
        uid: cred.user.uid,
        username: cleanUsername,
        email: email,
        password: cleanPassword,
        role: newRole,
        credits: parseInt(newCredits) || 0,
        status: "active",
        failedAttempts: 0,
        createdAt: serverTimestamp()
      });
      
      await deleteApp(tempApp);
      setNewUsername("");
      setNewPassword("");
      setNewCredits("3");
    } catch (err: any) {
      setUserActionError(err.message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteScan = async (scanId: string) => {
    try {
      await deleteDoc(doc(db, "scans", scanId));
    } catch (err) {
      console.error("Delete scan failed:", err);
      handleFirestoreError(err, OperationType.DELETE, `scans/${scanId}`);
    }
  };

  const deleteUserRecord = async (docId: string) => {
    try {
      await deleteDoc(doc(db, "users", docId));
    } catch (err) {
      console.error("Delete user failed:", err);
      handleFirestoreError(err, OperationType.DELETE, `users/${docId}`);
    }
  };

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
        setCrop(undefined);
        setCompletedCrop(undefined);
        setCroppedImageUrl(null);
        setIsCropping(false);
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
        setCrop(undefined);
        setCompletedCrop(undefined);
        setCroppedImageUrl(null);
        setIsCropping(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCroppedImg = (image: HTMLImageElement, crop: PixelCrop): string => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width,
        crop.height
      );
    }

    return canvas.toDataURL(mimeType || 'image/jpeg');
  };

  const onCropComplete = (c: PixelCrop) => {
    setCompletedCrop(c);
    if (imgRef.current && c.width > 0 && c.height > 0) {
      const croppedDataUrl = getCroppedImg(imgRef.current, c);
      setCroppedImageUrl(croppedDataUrl);
    }
  };

  const clearCrop = () => {
    setCrop(undefined);
    setCompletedCrop(undefined);
    setCroppedImageUrl(null);
    setIsCropping(false);
  };

  const processImage = async () => {
    if (!image || !mimeType) return;
    
    if (userCredits <= 0 && userRole !== "admin") {
      setError("आपके पास क्रेडिट समाप्त हो गए हैं। कृपया एडमिन से संपर्क करें।");
      return;
    }

    if (userStatus === "locked" && userRole !== "admin") {
      setError("आपका अकाउंट लॉक (Lock) कर दिया गया है। कृपया एडमिन से संपर्क करें।");
      return;
    }

    const imageToProcess = croppedImageUrl || image;

    setIsProcessing(true);
    setError(null);
    setProgress(0);

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
      // Step 1: AI Analysis
      const ocrResult = await processHindiImage(imageToProcess, mimeType);
      
      // Step 2: Use credits (only if AI call succeeded)
      if (userRole !== "admin" && currentUserDocId) {
        try {
          const userRef = doc(db, "users", currentUserDocId);
          const newCreditVal = (userCredits || 0) - 1;
          await updateDoc(userRef, { 
            credits: newCreditVal,
            updatedAt: serverTimestamp()
          });
          setUserCredits(newCreditVal);
        } catch (creditErr) {
          console.error("Credit update failed:", creditErr);
          handleFirestoreError(creditErr, OperationType.UPDATE, `users/${currentUserDocId}`);
        }
      }

      clearInterval(progressInterval);
      setProgress(100);
      
      setTimeout(async () => {
        setResult(ocrResult);
        setIsProcessing(false);

        // Step 3: Save to History (if logged in)
        if (currentUser) {
          try {
            await addDoc(collection(db, "scans"), {
              userId: currentUser.uid,
              imageUrl: imageToProcess,
              text: ocrResult.formattedDraft,
              createdAt: serverTimestamp()
            });
          } catch (historyErr) {
            console.error("History save failed:", historyErr);
            handleFirestoreError(historyErr, OperationType.CREATE, "scans");
          }
        }
      }, 500);
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error("Processing error:", err);
      
      let friendlyMsg = "इमेज को प्रोसेस करने में समस्या आई। कृपया पुनः प्रयास करें।";
      if (err.message?.includes("empty response")) {
        friendlyMsg = "सर्वर से कोई उत्तर नहीं मिला। यह इमेज की क्वालिटी या सुरक्षा कारणों से हो सकता है।";
      } else if (err.message?.includes("quota")) {
        friendlyMsg = "आज की सीमा (Quota) समाप्त हो गई है। कृपया कल फिर प्रयास करें।";
      }
      
      setError(friendlyMsg);
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
    setCrop(undefined);
    setCompletedCrop(undefined);
    setCroppedImageUrl(null);
    setIsCropping(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!isAuthenticated) {
    if (showLoginPage || isRegistering) {
      return (
        <ErrorBoundary>
          <div className="min-h-screen bg-[#070708] flex items-center justify-center p-6 font-sans relative overflow-hidden text-white">
            {/* Animated Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  x: [0, 100, 0],
                  y: [0, 50, 0]
                }}
                transition={{ duration: 20, repeat: Infinity }}
                className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px]"
              />
              <motion.div 
                animate={{ 
                  scale: [1, 1.3, 1],
                  x: [0, -100, 0],
                  y: [0, -50, 0]
                }}
                transition={{ duration: 25, repeat: Infinity }}
                className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]"
              />
            </div>

            <button 
              onClick={() => { setShowLoginPage(false); setIsRegistering(false); }}
              className="fixed top-8 left-8 z-50 flex items-center gap-2 text-white/50 hover:text-white transition-all text-[11px] font-black uppercase tracking-widest group"
            >
              <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white/10">
                <ChevronRight className="w-4 h-4 rotate-180" />
              </div>
              Back to Home
            </button>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 w-full max-w-md bg-[#121214] border border-white/5 rounded-[40px] p-10 shadow-2xl space-y-8"
            >
              <div className="text-center">
                <motion.div 
                  whileHover={{ rotate: 8, scale: 1.05 }}
                  className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl"
                >
                  <FileText className="text-black w-8 h-8" />
                </motion.div>
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase">
                  {isRegistering ? "Create" : (loginMode === "admin" ? "Admin" : "User")} <span className={isRegistering ? "text-green-500" : (loginMode === "admin" ? "text-blue-500" : "text-yellow-400")}>{isRegistering ? "Account" : "Portal"}</span>
                </h1>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3">
                  {isRegistering ? "Get 2 Free AI Scans Now" : (loginMode === "admin" ? "सुरक्षित व्यवस्थापक लॉगिन" : "प्रीमियम यूजर डैशबोर्ड")}
                </p>
                <div className="mt-6 flex justify-center">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: 60 }}
                    className={`h-1 rounded-full ${isRegistering ? "bg-green-500" : (loginMode === "admin" ? "bg-blue-500" : "bg-yellow-400")}`}
                  />
                </div>
              </div>

              <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">{isRegistering ? "Email Address" : "Email or Username"}</label>
                    <input 
                      type={isRegistering ? "email" : "text"} 
                      value={isRegistering ? regUser : loginUser}
                      onChange={(e) => isRegistering ? setRegUser(e.target.value) : setLoginUser(e.target.value)}
                      placeholder={isRegistering ? "Enter your email" : (loginMode === "admin" ? "ADMIN" : "Email or Username")}
                      className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-700 font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Password</label>
                    <div className="relative group">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={isRegistering ? regPass : loginPass}
                        onChange={(e) => isRegistering ? setRegPass(e.target.value) : setLoginPass(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white/5 border border-white/10 p-4 pr-12 rounded-2xl text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-700 font-bold"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {loginErrorMessage && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-relaxed">
                      {loginErrorMessage}
                    </p>
                  </motion.div>
                )}

                <button 
                  disabled={isLoggingIn}
                  className="w-full bg-white py-4 rounded-2xl text-black font-black uppercase tracking-widest hover:bg-gray-100 transition-all shadow-xl shadow-white/5 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRegistering ? "Sign Up Free" : "Access Dashboard")}
                </button>
              </form>

              <div className="text-center pt-4">
                <button 
                  onClick={() => { setIsRegistering(!isRegistering); setLoginErrorMessage(null); }}
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-all"
                >
                  {isRegistering ? "Already have an account? Login" : "Don't have an account? Start Free Trial"}
                </button>
              </div>
            </motion.div>
          </div>
        </ErrorBoundary>
      );
    }

    // High-End Landing Page
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
          {/* Navbar */}
          <nav className="fixed top-0 left-0 w-full z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-5">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center transition-transform group-hover:scale-110">
                  <img 
                    src="https://i.ibb.co/9kZvGzyg/SCAN-HINDILOGO.png" 
                    alt="ScanHindi Logo" 
                    className="w-full h-full object-contain drop-shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="text-xl font-black tracking-tighter uppercase italic bg-gradient-to-r from-blue-600 via-purple-600 to-orange-600 bg-clip-text text-transparent hover:drop-shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all cursor-default">ScanHindi.com</span>
              </div>
              
              <div className="hidden md:flex items-center gap-10">
                {["Home", "Features", "Blog", "Pricing", "Contact"].map((item) => (
                  <a href={`#${item.toLowerCase()}`} key={item} className="text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
                    {item}
                  </a>
                ))}
              </div>

              <button 
                onClick={() => { setLoginMode("admin"); setShowLoginPage(true); }}
                className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center hover:bg-gray-800 transition-all transform active:scale-95 shadow-xl shadow-black/10 group relative"
                title="Admin Access"
              >
                <Shield className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-black text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Admin Login
                </span>
              </button>
            </div>
          </nav>

          {/* Hero Section */}
          <section id="home" className="pt-44 pb-32 px-6 overflow-hidden relative">
            <div className="absolute top-40 -left-20 w-[40vw] h-[40vw] bg-blue-50 rounded-full blur-[120px] -z-10 animate-pulse" />
            <div className="absolute top-20 -right-20 w-[30vw] h-[30vw] bg-purple-50 rounded-full blur-[100px] -z-10" />

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-10"
              >
                <div className="inline-flex items-center gap-3 px-5 py-2 bg-blue-50 border border-blue-100 rounded-full text-blue-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Next-Gen Hindi OCR Engine</span>
                </div>
                
                <h1 className="text-[64px] md:text-[92px] leading-[0.9] font-black tracking-tighter text-gray-900 italic">
                  हाथ से लिखे पत्रों <br />
                  को <br />
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-orange-600 bg-clip-text text-transparent">डिजिटल आवेदन</span> <br />
                  में बदलें
                </h1>
                
                <h2 className="text-xl md:text-2xl text-gray-600 leading-relaxed max-w-xl font-bold uppercase tracking-tight">
                  हाथ से लिखे फ़ोटो को शुद्ध हिंदी टेक्स्ट में बदलें (Free Hindi OCR Tool)
                </h2>
                
                <p className="text-lg text-gray-500 leading-relaxed max-w-xl font-medium">
                  ScanHindi.com is India's most advanced tool for extracting text from images. Whether it's handwritten notes, government documents, or old letters, our AI converts them to digital Hindi text instantly. 
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-5 pt-4">
                  <button 
                    onClick={() => { setLoginMode("user"); setShowLoginPage(true); }}
                    className="w-full sm:w-auto bg-blue-600 text-white px-10 py-5 rounded-[22px] flex items-center justify-center gap-3 text-[13px] font-black uppercase tracking-widest hover:bg-blue-700 hover:-translate-y-1 transition-all shadow-2xl shadow-blue-600/20"
                  >
                    User Login <ArrowRight className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-3 px-6 py-4">
                    <Gift className="text-orange-500 w-5 h-5" />
                    <a 
                      href="https://wa.me/916205710721?text=Namskar%20Sir%20Hmko%20Demo%20Chahiye%203%20Creadit." 
                      target="_blank" 
                      className="text-sm font-bold text-white bg-green-600 px-6 py-3 rounded-full hover:bg-green-700 hover:shadow-xl hover:shadow-green-500/30 hover:scale-105 transition-all duration-300"
                    >
                      Demo Contact
                    </a>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.8, rotate: 10 }}
                whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="aspect-square bg-gray-50 rounded-[60px] border border-gray-100 shadow-inner p-4 overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none z-20" />
                  <div className="w-full h-full border-2 border-dashed border-gray-200 rounded-[40px] flex items-center justify-center relative overflow-hidden bg-white">
                    <motion.div 
                      animate={{ y: [0, 400, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)] z-30"
                    />
                    <img 
                      src="https://hi-static.z-dn.net/files/dc0/a62c0ed78ba7402366bad2ab64d178de.jpg" 
                      alt="Hindi OCR Pro Feature"
                      className="w-full h-full object-contain p-2 z-10"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
                <div className="absolute -bottom-10 -right-10 bg-white p-6 rounded-[30px] border border-gray-100 shadow-2xl space-y-3 transform rotate-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-black uppercase italic">Accuracy: 99.9%</span>
                  </div>
                  <div className="h-1.5 w-32 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: "99.9%" }}
                      transition={{ duration: 1.5, delay: 0.5 }}
                      className="h-full bg-green-500" 
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Features Section */}
          <section id="features" className="py-24 px-6 bg-gray-50/50">
            <div className="max-w-7xl mx-auto space-y-16">
              <div className="text-center space-y-4 max-w-3xl mx-auto">
                <motion.span 
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  className="inline-block px-4 py-1.5 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-[0.3em] rounded-full"
                >
                  Premium Features
                </motion.span>
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-gray-900 italic">
                  Advanced Technology. <span className="text-blue-600">Zero Effort.</span>
                </h2>
                <p className="text-gray-500 font-medium text-lg leading-relaxed">
                  Our proprietary neural engine is trained on millions of Hindi handwritten samples, ensuring the highest accuracy even for complex dialects and styles.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { icon: Zap, title: "Instant OCR", desc: "Extract text from photos in under 3 seconds using Google Gemini AI technology.", color: "blue" },
                  { icon: Shield, title: "Safe & Private", desc: "Your data is yours. We use bank-grade encryption to process your documents securely.", color: "green" },
                  { icon: CheckCircle2, title: "High Accuracy", desc: "99.9% accuracy for clear handwritten notes and typed government documents.", color: "orange" }
                ].map((feat, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="p-10 rounded-[32px] bg-white border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-900 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <feat.icon className="w-7 h-7" />
                    </div>
                    <h4 className="text-2xl font-black text-gray-900 tracking-tight mb-3 italic">{feat.title}</h4>
                    <p className="text-gray-500 leading-relaxed font-medium text-sm">
                      {feat.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section id="how-it-works" className="py-24 px-6 overflow-hidden">
             <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div className="space-y-12">
                        <div className="space-y-4">
                            <h2 className="text-5xl font-black tracking-tighter text-gray-900 italic">How It Works</h2>
                            <p className="text-gray-500 text-lg font-medium leading-relaxed">
                                Get your digital text in three simple steps. No technical knowledge required.
                            </p>
                        </div>

                        <div className="space-y-8">
                            {[
                                { step: "01", title: "Upload Image", desc: "Select or drag and drop your handwritten document or form photo." },
                                { step: "02", title: "AI Processing", desc: "Our advanced AI engine analyzes the Devanagari script and layouts." },
                                { step: "03", title: "Copy & Edit", desc: "Get your clean, digital Hindi text ready to be pasted or edited." }
                            ].map((item, idx) => (
                                <motion.div 
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    key={idx} 
                                    className="flex gap-6 items-start"
                                >
                                    <div className="text-4xl font-black text-gray-100 italic leading-none">{item.step}</div>
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-black text-gray-900 italic">{item.title}</h4>
                                        <p className="text-gray-500 text-sm font-medium leading-relaxed">{item.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-100 blur-[80px] opacity-30 -z-10 rounded-full" />
                        <div className="bg-white p-2 rounded-[40px] shadow-2xl border border-gray-100">
                             <div className="bg-gray-50 rounded-[32px] p-8 space-y-6">
                                 <div className="flex items-center justify-between pb-6 border-b border-gray-200/50">
                                     <div className="flex items-center gap-3">
                                         <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                                            <Zap className="w-5 h-5" />
                                         </div>
                                         <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">AI Preview</span>
                                     </div>
                                     <span className="px-3 py-1 bg-green-100 text-green-700 text-[9px] font-black uppercase rounded-full">Success</span>
                                 </div>

                                 <div className="space-y-4">
                                     <div className="h-4 bg-gray-200 rounded-full w-3/4 animate-pulse" />
                                     <div className="h-4 bg-gray-200 rounded-full w-full animate-pulse" />
                                     <div className="h-4 bg-gray-200 rounded-full w-5/6 animate-pulse" />
                                 </div>

                                 <div className="pt-6">
                                     <button className="w-full py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                                         Digitalize Now
                                     </button>
                                 </div>
                             </div>
                        </div>
                    </div>
                </div>
             </div>
          </section>

          {/* Use Cases Section */}
          <section className="py-24 px-6 bg-gray-900 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/10 blur-[120px]" />
              <div className="max-w-7xl mx-auto space-y-20 relative z-10">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                      <div className="space-y-4">
                          <h2 className="text-blue-500 text-[10px] font-black uppercase tracking-[0.4em]">Use Cases</h2>
                          <h3 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter">Digitizing India's <br /> Legacy & Paperwork.</h3>
                      </div>
                      <p className="text-gray-400 max-w-md font-medium text-sm leading-relaxed">
                          From rural administration to personal archives, ScanHindi.com is the bridge between paper and digital worlds.
                      </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {[
                        { title: "Govt Forms", desc: "Scan birth, death, and land registration forms with high precision.", img: "📝" },
                        { title: "Old Letters", desc: "Preserve historical Hindi letters into digital readable archives.", img: "✉️" },
                        { title: "Students", desc: "Convert handwritten class notes into searchable study material.", img: "🎓" },
                        { title: "Legal Files", desc: "Digitize Hindi court affidavits and legal documentation instantly.", img: "⚖️" }
                      ].map((item, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/5 p-8 rounded-[32px] hover:bg-white/10 transition-colors group">
                            <div className="text-4xl mb-6 group-hover:scale-110 transition-transform">{item.img}</div>
                            <h4 className="text-white font-black italic text-xl mb-3 tracking-tight">{item.title}</h4>
                            <p className="text-gray-400 text-sm font-medium leading-relaxed">{item.desc}</p>
                        </div>
                      ))}
                  </div>
              </div>
          </section>

          {/* FAQ/SEO Section */}
          <section id="seo-faq" className="py-24 px-6 bg-white">
            <div className="max-w-4xl mx-auto space-y-20">
                <div className="space-y-6 text-center">
                    <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest">Frequently Asked Questions</h2>
                    <h3 className="text-4xl md:text-5xl font-black text-gray-900 italic tracking-tighter">Everything You Need To Know</h3>
                </div>

                <div className="space-y-4">
                    {[
                        { q: "Is Hindi OCR Pro free to use?", a: "Yes, we offer a free trial with free credits for every new user. For professional or bulk usage, you can purchase premium credit packs." },
                        { q: "How accurate is the Hindi text extraction?", a: "We achieve up to 99.9% accuracy for clear printed text and high precision for legible handwriting, thanks to the latest Gemini AI engine." },
                        { q: "Can it recognize different Hindi dialects?", a: "Yes, our AI model is trained on standard Hindi as well as various regional Devanagari handwriting styles across India." },
                        { q: "Is my data secure on ScanHindi.com?", a: "Absolutely. We do not store your images longer than necessary for processing, and all connections are secured with SSL encryption." },
                        { q: "How can I get more credits?", a: "You can easily top up your credits by contacting our support team via WhatsApp button on the dashboard." }
                    ].map((item, idx) => (
                        <details key={idx} className="group border-b border-gray-100 last:border-0">
                            <summary className="flex items-center justify-between p-8 cursor-pointer list-none hover:bg-gray-50/50 transition-colors">
                                <span className="text-lg font-black text-gray-900 italic tracking-tight">{item.q}</span>
                                <ChevronRight className="w-5 h-5 text-gray-400 group-open:rotate-90 transition-transform" />
                            </summary>
                            <div className="px-8 pb-8 text-gray-500 font-medium leading-relaxed text-sm">
                                {item.a}
                            </div>
                        </details>
                    ))}
                </div>

                <div className="p-12 rounded-[40px] bg-blue-50 border border-blue-100 space-y-6">
                    <h4 className="text-xl font-black text-blue-900 italic">About ScanHindi.com</h4>
                    <p className="text-blue-900/70 leading-relaxed font-medium text-sm">
                        ScanHindi.com is India's leading AI-powered OCR platform dedicated specifically to the Hindi language. Our mission is to bridge the digital divide in rural and urban India by providing accessible tools to digitize hand-recorded information. Our platform uses state-of-the-art neural networks to understand the nuances of Hindi handwriting, making it an essential tool for administrators, legal professionals, and students alike.
                    </p>
                </div>
            </div>
          </section>

          {/* Contact Section */}
          <section id="contact" className="py-44 px-6 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-full bg-blue-600 rounded-[80px] -z-10 group overflow-hidden">
               <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute -top-1/2 -right-1/4 w-full h-full bg-blue-500/30 rounded-full blur-[100px]" 
               />
               <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-transparent" />
            </div>

            <div className="max-w-4xl mx-auto text-center space-y-10 text-white">
              <h3 className="text-6xl font-black tracking-tighter italic text-white">Ready to digitize?</h3>
              <p className="text-xl text-blue-50/70 font-medium max-w-xl mx-auto">
                Join hundreds of users already using Hindi OCR Pro for their projects. Reach out to us for bulk orders or support.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
                <a 
                  href="https://wa.me/916205710721" 
                  target="_blank"
                  className="w-full sm:w-auto bg-white text-blue-600 px-12 py-6 rounded-[24px] flex items-center justify-center gap-4 text-[14px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-black/20"
                >
                  <MessageSquare className="w-6 h-6" /> WhatsApp Support
                </a>
                <button 
                  onClick={() => setShowLoginPage(true)}
                  className="w-full sm:w-auto bg-blue-500/20 backdrop-blur-xl border border-white/10 text-white px-12 py-6 rounded-[24px] text-[14px] font-black uppercase tracking-widest hover:bg-blue-500/30 transition-all"
                >
                  Create Account
                </button>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-20 px-6 border-t border-gray-100 bg-white">
            <div className="max-w-7xl mx-auto space-y-24">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-16 md:gap-8">
                <div className="md:col-span-1 space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center transition-transform group-hover:scale-110">
                      <img 
                        src="https://i.ibb.co/9kZvGzyg/SCAN-HINDILOGO.png" 
                        alt="ScanHindi Logo" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-xl font-black tracking-tighter italic uppercase underline decoration-blue-500 decoration-4 underline-offset-4">ScanHindi.com</span>
                  </div>
                  <p className="text-gray-400 text-sm font-medium leading-relaxed">
                    India's premier <strong>Hindi OCR</strong> technology. Digitizing Devanagari documents with unmatched AI accuracy.
                  </p>
                  <div className="flex items-center gap-4">
                    {[
                      { Icon: Twitter, url: "#" },
                      { Icon: Facebook, url: "https://www.facebook.com/profile.php?id=100031187801606&sk=photos" },
                      { Icon: Youtube, url: "#" }
                    ].map((platform, i) => (
                      <a key={i} href={platform.url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-black hover:text-white transition-all transform hover:-translate-y-1">
                        <platform.Icon className="w-5 h-5" />
                      </a>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-600">Free Tools</h4>
                  <ul className="space-y-4">
                    {["Image to Text Hindi", "Hindi OCR Tool", "Devanagari Extractor", "Handwriting Scan"].map((item) => (
                      <li key={item}><a href="#" className="text-sm font-bold text-gray-400 hover:text-black transition-colors">{item}</a></li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-8">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-600">Resources</h4>
                  <ul className="space-y-4">
                    {["Hindi Blog", "SEO Guide", "Backlink Strategy", "FAQ"].map((item) => (
                      <li key={item}><a href={item === "Blog" ? "#blog" : "#seo-faq"} className="text-sm font-bold text-gray-400 hover:text-black transition-colors">{item}</a></li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-8">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-600">Company</h4>
                  <ul className="space-y-4">
                    {["About Us", "Contact", "Privacy Policy", "Terms"].map((item) => (
                      <li key={item}><a href="#" className="text-sm font-bold text-gray-400 hover:text-black transition-colors">{item}</a></li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-12 border-t border-gray-50 space-y-6">
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-[10px] font-black uppercase tracking-widest text-gray-300">
                  <span>Hindi OCR Tool</span>
                  <span className="text-blue-500">•</span>
                  <span>Image to Text Hindi</span>
                  <span className="text-blue-500">•</span>
                  <span>Handwriting Text Converter</span>
                  <span className="text-blue-500">•</span>
                  <span>Devanagari OCR Online</span>
                  <span className="text-blue-500">•</span>
                  <span>Photo se text copy kaise kare</span>
                </div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-400">
                    <span>© 2026 ScanHindi.com - All Rights Reserved</span>
                    <span className="text-gray-200">|</span>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full">
                      <span className="text-gray-500">Design by</span>
                      <span className="text-black font-black uppercase tracking-tighter italic">Durgesh</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600/50">
                    Proudly Made in India <Star className="w-3 h-3 fill-blue-600/50" />
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </ErrorBoundary>
    );
  }

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
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">{userName || "Neural Engine Active"}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
                    <Key className="w-3 h-3 text-blue-600" />
                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">{userCredits} Credits</span>
                  </div>
                  {userCredits <= 0 && userRole !== "admin" && (
                    <a 
                      href={`https://wa.me/916205710721?text=${encodeURIComponent(`Hi, I've run out of credits for my account ${userName || currentUser?.email}. I want to buy a pack.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-1 bg-gray-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all animate-pulse"
                    >
                      <Zap className="w-3 h-3 text-yellow-400" /> Buy Credits
                    </a>
                  )}
                  {userStatus === "locked" && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-100 rounded-full border border-red-200">
                      <Lock className="w-3 h-3 text-red-600" />
                      <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">Locked</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="flex bg-gray-100 p-1 rounded-2xl">
                <button 
                  onClick={() => setActiveTab("ocr")}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "ocr" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                >
                  OCR Tool
                </button>
                <button 
                  onClick={() => setActiveTab("janam")}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "janam" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                >
                  Janam Form
                </button>
                <button 
                  onClick={() => setActiveTab("history")}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "history" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                >
                  History
                </button>
                {userRole === "admin" && (
                  <>
                    <button 
                      onClick={() => setActiveTab("users")}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "users" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                    >
                      Admin Panel
                    </button>
                    <button 
                      onClick={() => setActiveTab("ratings")}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "ratings" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                    >
                      Feedbacks
                    </button>
                  </>
                )}
              </div>
              {image && activeTab === "ocr" && (
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
              <button 
                onClick={() => setShowRatingModal(true)}
                className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 transition-all shadow-sm border border-gray-100 mr-2"
                title="Rate Us"
              >
                <Star className="w-5 h-5 fill-current" />
              </button>
              <button 
                onClick={handleLogout}
                className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm border border-gray-100"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {userCredits <= 5 && userRole !== "admin" && (
          <div className="bg-red-50 z-10 relative border-b border-red-100 px-6 py-3 text-center flex items-center justify-center gap-2 animate-pulse">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700 font-bold text-sm tracking-wide">
              ⚠️ आपका क्रेडिट खत्म होने वाला है। अभी रिचार्ज करें।
            </span>
          </div>
        )}

        <main className="relative z-10 max-w-7xl mx-auto px-6 py-16">
          {activeTab === "janam" ? (
            <BirthRegistrationForm 
              userId={currentUser?.uid} 
              userRole={userRole} 
              onSuccess={() => {}} 
              submissions={janamSubmissions}
              isAdminView={isJanamAdminView}
              setIsAdminView={setIsJanamAdminView}
            />
          ) : activeTab === "history" ? (
            <div className="max-w-5xl mx-auto space-y-12">
              {historyError && (
                <div className="p-8 bg-red-50 border border-red-100 rounded-[32px] space-y-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <h3 className="text-sm font-black text-red-900 uppercase tracking-widest">Database Index Required</h3>
                  </div>
                  <p className="text-xs text-red-700 font-medium leading-relaxed">
                    हिस्ट्री देखने के लिए डेटाबेस इंडेक्स की आवश्यकता है। कृपया नीचे दिए गए लिंक पर क्लिक करें और इंडेक्स बनाएं (यह केवल एक क्लिक का काम है)।
                  </p>
                  <a 
                    href="https://console.firebase.google.com/v1/r/project/ocrhindi-1b9a5/firestore/indexes?create_composite=Ckxwcm9qZWN0cy9vY3JoaW5kaS0xYjlhNS9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvc2NhbnMvaW5kZXhlcy9fEAEaCgoGdXNlcklkEAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg" 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-block px-6 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all"
                  >
                    Click to Create Index
                  </a>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-gray-900 uppercase">Scan History</h2>
                  <p className="text-gray-500 font-medium">Your 20 most recent scans are shown here.</p>
                </div>
                <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm">
                  <History className="w-5 h-5 text-blue-600" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">{recentScans.length} Saved Scans</span>
                </div>
              </div>

              {recentScans.length === 0 ? (
                <div className="bg-white/60 backdrop-blur-md rounded-[48px] p-24 text-center border border-white shadow-xl">
                  <div className="w-24 h-24 bg-gray-100 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <History className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-4">No Scans Found</h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-10 leading-relaxed font-medium">When you scan a document, the result will automatically be saved here for your future reference.</p>
                  <button 
                    onClick={() => setActiveTab("ocr")}
                    className="px-10 py-5 bg-blue-600 text-white font-black uppercase text-xs rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                  >
                    Start Your First Scan
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {recentScans.map((scan) => (
                    <motion.div 
                      key={scan.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group bg-white rounded-[40px] shadow-lg hover:shadow-2xl border border-gray-100 overflow-hidden transition-all flex flex-col h-[400px]"
                    >
                      <div className="relative h-48 bg-gray-50 flex items-center justify-center overflow-hidden">
                        <img 
                          src={scan.imageUrl} 
                          alt="Scan preview" 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <button 
                            onClick={() => {
                              setImage(scan.imageUrl);
                              setResult({ formattedDraft: scan.text });
                              setActiveTab("ocr");
                            }}
                            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-900 hover:bg-blue-600 hover:text-white transition-all transform hover:scale-110 active:scale-95 shadow-xl"
                            title="Open in OCR Tool"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteScan(scan.id)}
                            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-600 hover:bg-red-600 hover:text-white transition-all transform hover:scale-110 active:scale-95 shadow-xl"
                            title="Delete Permanently"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        {/* Mobile visible action buttons */}
                        <div className="absolute bottom-4 right-4 flex gap-2 sm:hidden">
                           <button 
                             onClick={() => handleDeleteScan(scan.id)}
                             className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center text-red-600 shadow-lg border border-red-100"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                        <div className="absolute top-4 left-4">
                          <span className="bg-black/60 backdrop-blur-md text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-full tracking-[0.2em]">
                            {scan.createdAt?.toDate ? new Date(scan.createdAt.toDate()).toLocaleDateString() : 'Saving...'}
                          </span>
                        </div>
                      </div>
                      <div className="p-8 flex-1 flex flex-col">
                        <div className="flex-1 overflow-hidden">
                          <p className="text-xs text-gray-500 font-medium leading-relaxed italic line-clamp-6">
                            "{scan.text.substring(0, 300)}..."
                          </p>
                        </div>
                        <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                          <button 
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(scan.text);
                                const originalText = scan.text;
                                // Simple feedback: could use a toast, but changing button text briefly is better
                              } catch(e) {
                                console.error(e);
                              }
                            }}
                            className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copy Text
                          </button>
                          <button 
                            onClick={() => {
                              setImage(scan.imageUrl);
                              setResult({ formattedDraft: scan.text });
                              setActiveTab("ocr");
                            }}
                            className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === "users" && userRole === "admin" ? (
            <div className="max-w-6xl mx-auto space-y-12">
              <div className="flex flex-col md:flex-row gap-12">
                {/* Create User Form */}
                <div className="md:w-1/3 space-y-8">
                  <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-gray-100 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-black tracking-tight text-gray-900 uppercase">Create User</h3>
                    </div>
                    <form onSubmit={createNewUser} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Username</label>
                        <input 
                          type="text" 
                          placeholder="Ex: rahul_ocr"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Password</label>
                        <div className="relative">
                          <input 
                            type={showAdminPassword ? "text" : "password"} 
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 p-4 pr-12 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-900 transition-colors"
                          >
                            {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Role</label>
                        <select 
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value as "user" | "admin")}
                          className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold appearance-none"
                        >
                          <option value="user">USER</option>
                          <option value="admin">ADMIN</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">
                          Initial Credits <span className="text-blue-500 normal-case tracking-normal ml-2">(Policy: 3 Free)</span>
                        </label>
                        <input 
                          type="number" 
                          value={newCredits}
                          onChange={(e) => setNewCredits(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                        />
                      </div>
                      {userActionError && <p className="text-red-500 text-[10px] font-black uppercase text-center">{userActionError}</p>}
                      <button 
                        disabled={isCreatingUser}
                        className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-gray-900/10"
                      >
                        {isCreatingUser ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save User"}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Users List */}
                <div className="md:w-2/3 space-y-8">
                  <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                      <h3 className="font-black text-xl tracking-tight text-gray-900">Registered Users</h3>
                      <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{usersList.length} Total</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50/50">
                          <tr>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Username</th>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Password</th>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Credits</th>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Created</th>
                            <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {usersList.map((usr) => {
                            const isPwdVisible = visiblePasswords.has(usr.id);
                            const isLocked = usr.status === "locked";
                            
                            return (
                              <tr key={usr.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-8 py-4">
                                  <div className="flex flex-col">
                                    <span className="font-black text-gray-900">{usr.username}</span>
                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{usr.uid.substring(0, 8)}...</span>
                                  </div>
                                </td>
                                <td className="px-8 py-4">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-black text-xs tracking-wider min-w-[80px] ${isPwdVisible ? "text-indigo-600" : "text-gray-300"}`}>
                                      {isPwdVisible ? (usr.password || "Not Stored") : "••••••••"}
                                    </span>
                                    <button 
                                      onClick={() => {
                                        const newSet = new Set(visiblePasswords);
                                        if (isPwdVisible) newSet.delete(usr.id);
                                        else newSet.add(usr.id);
                                        setVisiblePasswords(newSet);
                                      }}
                                      className="p-1.5 hover:bg-indigo-50 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors"
                                      title={isPwdVisible ? "Hide Password" : "Show Password"}
                                    >
                                      {isPwdVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setEditingUser(usr);
                                        setModalMode("password");
                                        setModalValue(usr.password || "");
                                      }}
                                      className="p-1.5 hover:bg-amber-50 rounded-lg text-gray-400 hover:text-amber-600 transition-colors"
                                      title="Edit Password"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                                <td className="px-8 py-4">
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${usr.role === "admin" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>
                                    {usr.role === "admin" ? "ADMIN" : "DEMO"}
                                  </span>
                                </td>
                                <td className="px-8 py-4">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-black text-gray-900">{usr.credits || 0}</span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => {
                                          setEditingUser(usr);
                                          setModalMode("credits");
                                          setModalValue((usr.credits || 0).toString());
                                        }}
                                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                        title="Update Credits"
                                      >
                                        <RefreshCw className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingUser(usr);
                                          setModalMode("addCredits");
                                          setModalValue("10");
                                        }}
                                        className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                        title="Add Credits"
                                      >
                                        <CheckCircle2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-8 py-4 text-xs font-bold text-gray-400">
                                  {usr.createdAt?.toDate().toLocaleDateString('en-IN')}
                                </td>
                                <td className="px-8 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {usr.username !== "ADMIN" && (
                                      <>
                                        <button 
                                          onClick={async () => {
                                            const nextStatus = isLocked ? "active" : "locked";
                                            const updates: any = { 
                                              status: nextStatus,
                                              updatedAt: serverTimestamp()
                                            };
                                            if (isLocked) {
                                              updates.failedAttempts = 0;
                                            }
                                            try {
                                              await updateDoc(doc(db, "users", usr.id), updates);
                                            } catch (err) {
                                              handleFirestoreError(err, OperationType.UPDATE, `users/${usr.id}`);
                                            }
                                          } }
                                          className={`p-2 rounded-xl transition-all ${isLocked ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50"}`}
                                          title={isLocked ? "Unlock User" : "Lock User"}
                                        >
                                          {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                        </button>
                                        <button 
                                          onClick={() => {
                                            setEditingUser(usr);
                                            setModalMode("delete");
                                            setModalValue("");
                                          }}
                                          className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                          title="Delete User"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "ratings" && userRole === "admin" ? (
            <div className="max-w-6xl mx-auto space-y-12">
              <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="font-black text-xl tracking-tight text-gray-900">User Feedbacks & Ratings</h3>
                  <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{ratingsList.length} Total</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">User</th>
                        <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Rating</th>
                        <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Feedback</th>
                        <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ratingsList.map((rating) => (
                        <tr key={rating.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-8 py-4">
                            <span className="font-black text-gray-900">{rating.userName}</span>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className={`w-4 h-4 ${rating.rating >= star ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />
                              ))}
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <p className="text-sm font-medium text-gray-600 max-w-sm truncate">{rating.feedback || "-"}</p>
                          </td>
                          <td className="px-8 py-4 text-xs font-bold text-gray-400">
                            {rating.createdAt?.toDate().toLocaleDateString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : !image ? (
            <>
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="max-w-4xl mx-auto text-center py-20"
                  >
                    <div className="relative inline-block mt-4 mb-4">
                      <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-orange-600 tracking-tighter leading-[0.95] absolute inset-0 blur-xl opacity-70 animate-pulse">
                        Welcome Boss
                      </h2>
                      <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-orange-600 tracking-tighter leading-[0.95] relative">
                        Welcome Boss
                      </h2>
                    </div>
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
                </>
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
                    <div className="flex items-center gap-2">
                      {completedCrop && (
                        <button 
                          onClick={clearCrop}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all"
                        >
                          Clear
                        </button>
                      )}
                      <button 
                        onClick={() => setIsCropping(!isCropping)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isCropping ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-100 hover:bg-gray-50"}`}
                      >
                        <CropIcon className="w-3 h-3" />
                        {isCropping ? "Done" : (completedCrop ? "Edit Crop" : "Crop")}
                      </button>
                    </div>
                  </div>
                  <div className="aspect-[4/5] bg-gray-50/50 flex items-center justify-center p-10">
                    {isCropping ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <ReactCrop
                          crop={crop}
                          onChange={(c) => setCrop(c)}
                          onComplete={onCropComplete}
                          className="max-w-full max-h-full"
                        >
                          <img 
                            ref={imgRef}
                            src={image} 
                            alt="To crop" 
                            className="max-w-full max-h-full object-contain rounded-3xl"
                            referrerPolicy="no-referrer"
                          />
                        </ReactCrop>
                        <button 
                          onClick={reset}
                          className="absolute top-2 right-2 z-20 w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-white transition-all shadow-xl border border-white/50"
                          title="Remove Image"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative w-full h-full flex items-center justify-center group overflow-hidden">
                        <img 
                          src={croppedImageUrl || image} 
                          alt="Uploaded preview" 
                          className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl transition-all"
                          referrerPolicy="no-referrer"
                        />
                        
                        {/* Close/Remove Image Button */}
                        <motion.button 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={reset}
                          className="absolute top-4 right-4 z-20 w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-white transition-all shadow-2xl border border-white/50 group"
                          title="Remove Image"
                        >
                          <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                        </motion.button>
                        
                        {/* Scanning Animation */}
                        {isProcessing && (
                          <motion.div 
                            initial={{ top: "0%" }}
                            animate={{ top: "100%" }}
                            transition={{ 
                              duration: 2, 
                              repeat: Infinity, 
                              ease: "linear" 
                            }}
                            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent z-10 shadow-[0_0_15px_rgba(59,130,246,0.8)]"
                          >
                            <div className="absolute top-0 left-0 right-0 h-[100px] bg-gradient-to-b from-blue-500/10 to-transparent -translate-y-full" />
                          </motion.div>
                        )}

                        {croppedImageUrl && !isProcessing && (
                          <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                            Cropped
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>

                {!result && !isProcessing && (
                  userCredits <= 0 && userRole !== "admin" ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full p-8 bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 rounded-[40px] shadow-2xl shadow-red-500/10 space-y-6"
                    >
                      <div className="flex items-center gap-4 text-red-600">
                        <AlertCircle className="w-8 h-8" />
                        <h4 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">Credits Exhausted</h4>
                      </div>
                      <p className="text-red-900/70 font-medium text-sm">
                        You have used all your free demo credits. To continue scanning documents, please select a top-up pack.
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                        {[
                          { name: "Basic Pack", price: "50", scans: "10", color: "white", text: "gray-900" },
                          { name: "Popular Pack", price: "100", scans: "30", color: "blue-600", text: "white", highlight: true },
                          { name: "Pro Pack", price: "200", scans: "80", color: "white", text: "gray-900" }
                        ].map((pack, idx) => (
                          <div 
                            key={idx}
                            className={`p-6 rounded-3xl border flex flex-col justify-between hover:shadow-xl transition-all ${
                              pack.highlight 
                                ? "bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-600/20" 
                                : "bg-white border-gray-100 text-gray-900"
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-start">
                                <h5 className={`font-black text-[10px] uppercase tracking-wider ${pack.highlight ? "text-blue-100" : "text-gray-500"}`}>{pack.name}</h5>
                                {pack.highlight && (
                                  <span className="text-[7px] bg-white text-blue-600 px-2 py-0.5 rounded-full font-black uppercase">Popular</span>
                                )}
                              </div>
                              <p className="text-3xl font-black mt-2">₹{pack.price}</p>
                              <p className={`text-[10px] font-bold mt-1 ${pack.highlight ? "text-blue-200" : "text-gray-400"}`}>{pack.scans} Scans</p>
                            </div>
                            <a 
                              href={`https://wa.me/916205710721?text=${encodeURIComponent(`Hello, I want to upgrade to ${pack.name} (₹${pack.price}). My email is ${currentUser?.email || userName || "Not Provided"}.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className={`w-full mt-6 py-3 block text-center font-black text-[10px] uppercase rounded-xl transition-colors ${
                                pack.highlight 
                                  ? "bg-white text-blue-600 hover:bg-gray-100" 
                                  : "bg-gray-900 text-white hover:bg-gray-800"
                              }`}
                            >
                              BUY NOW
                            </a>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
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
                  )
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
              <span className="font-black text-xl tracking-tighter italic">Hindi OCR <span className="text-blue-600">Pro</span></span>
            </div>
            <div className="flex flex-col items-center md:items-end gap-3 text-right">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">© 2026 All Rights Reserved</p>
              <div className="flex items-center gap-2 group">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Designed by</span>
                <span className="text-sm font-black italic uppercase italic tracking-tighter text-blue-600">Durgesh</span>
              </div>
            </div>
          </div>
        </footer>

        {/* Floating WhatsApp Button */}
        <motion.a
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1, y: -5 }}
          whileTap={{ scale: 0.9 }}
          href="https://wa.me/916205710721" 
          target="_blank"
          className="fixed bottom-8 right-8 z-50 w-16 h-16 bg-green-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-green-600 transition-colors group"
        >
          <MessageSquare className="w-8 h-8" />
          <div className="absolute right-full mr-4 bg-white text-gray-900 px-4 py-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-bold text-sm border border-gray-100">
            हमसे व्हाट्सएप पर बात करें
          </div>
        </motion.a>

        {/* Edit User Modal */}
        <AnimatePresence>
          {showRatingModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowRatingModal(false)}
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-sm bg-white rounded-[40px] shadow-2xl overflow-hidden"
              >
                <div className="p-8 pb-6 text-center">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2"> Rate Your Experience </h3>
                  <p className="text-xs font-bold text-gray-500 mb-6">How do you like our OCR Tool?</p>
                  
                  <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRatingValue(star)}
                        className={`transition-colors ${ratingValue >= star ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-200'}`}
                      >
                        <Star className="w-10 h-10 fill-current" />
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={ratingFeedback}
                    onChange={(e) => setRatingFeedback(e.target.value)}
                    placeholder="Tell us more about your experience... (optional)"
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none resize-none h-24 mb-6"
                  />

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowRatingModal(false)}
                      className="flex-1 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
                    >
                      Skip
                    </button>
                    <button 
                      disabled={ratingValue === 0 || isSubmittingRating}
                      onClick={handleRatingSubmit}
                      className="flex-[2] bg-blue-600 shadow-blue-600/20 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isSubmittingRating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit User Modal */}
        <AnimatePresence>
          {editingUser && modalMode && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setEditingUser(null);
                  setModalMode(null);
                  setModalValue("");
                }}
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden"
              >
                <div className="p-8 pb-4">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">
                      {modalMode === "credits" && "Update Credits"}
                      {modalMode === "password" && "Change Password"}
                      {modalMode === "addCredits" && "Add Credits"}
                      {modalMode === "delete" && "Delete User"}
                    </h3>
                    <div className={`${modalMode === 'delete' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'} px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest`}>
                      {editingUser.username}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {modalMode === "delete" ? (
                      <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                        <p className="text-sm font-bold text-red-600 leading-relaxed text-center">
                          क्या आप वाकई इस यूजर को हटाना चाहते हैं? यह क्रिया वापस नहीं ली जा सकती।
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">
                          {modalMode === "credits" && "New Total Credits"}
                          {modalMode === "password" && "New Password"}
                          {modalMode === "addCredits" && "Amount to Add"}
                        </label>
                        <input 
                          type={modalMode === "password" ? "text" : "number"}
                          autoFocus
                          value={modalValue}
                          onChange={(e) => setModalValue(e.target.value)}
                          className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                          placeholder="Enter value..."
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-8 pt-4 flex gap-3">
                  <button 
                    onClick={() => {
                      setEditingUser(null);
                      setModalMode(null);
                      setModalValue("");
                    }}
                    className="flex-1 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={isUpdatingUser || (modalMode !== 'delete' && !modalValue)}
                    onClick={async () => {
                      setIsUpdatingUser(true);
                      try {
                        if (modalMode === "delete") {
                          await deleteUserRecord(editingUser.id);
                        } else {
                          const updateData: any = {
                            updatedAt: serverTimestamp()
                          };
                          if (modalMode === "credits") updateData.credits = parseInt(modalValue);
                          if (modalMode === "password") updateData.password = modalValue;
                          if (modalMode === "addCredits") updateData.credits = (editingUser.credits || 0) + (parseInt(modalValue) || 0);

                          await updateDoc(doc(db, "users", editingUser.id), updateData);
                        }
                        setEditingUser(null);
                        setModalMode(null);
                        setModalValue("");
                      } catch (err) {
                        console.error("Update error:", err);
                        setUserActionError("त्रुटि: डॉक्यूमेंट अपडेट या डिलीट नहीं हो सका। कृपया अपनी अनुमति जांचें।");
                      } finally {
                        setIsUpdatingUser(false);
                      }
                    }}
                    className={`flex-[2] ${modalMode === 'delete' ? 'bg-red-600 shadow-red-600/20' : 'bg-blue-600 shadow-blue-600/20'} text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 shadow-xl transition-all flex items-center justify-center gap-2`}
                  >
                    {isUpdatingUser ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      modalMode === 'delete' ? "Delete Forever" : "Save Changes"
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
