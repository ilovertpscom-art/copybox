import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { 
  FileText, 
  Eye,
  Trash2,
  Printer,
  Save,
  Search,
  Download,
  AlertCircle,
  CheckCircle2,
  User,
  Settings,
  Scale,
  Edit
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';

interface BirthRegistrationFormProps {
  userId: string;
  userRole: string | null;
  onSuccess: () => void;
  submissions: any[];
  isAdminView: boolean;
  setIsAdminView: (val: boolean) => void;
}

const numberToHindiWords = (num: number): string => {
  const words: { [key: number]: string } = {
    0: "शून्य", 1: "एक", 2: "दो", 3: "तीन", 4: "चार", 5: "पांच", 6: "छह", 7: "सात", 8: "आठ", 9: "नौ", 10: "दस",
    11: "ग्यारह", 12: "बारह", 13: "तेरह", 14: "चौदह", 15: "पंद्रह", 16: "सोलह", 17: "सत्रह", 18: "अठारह", 19: "उन्नीस", 20: "बीस",
    21: "इक्कीस", 22: "बाईस", 23: "तेईस", 24: "चौबीस", 25: "पच्चीस", 26: "छब्बीस", 27: "सत्ताईस", 28: "अट्ठाइस", 29: "उनतीस", 30: "तीस", 31: "इकतीस"
  };
  return words[num] || num.toString();
};

const monthToHindi = (month: number): string => {
  const months = ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
  return months[month - 1];
};

const yearToHindiWords = (year: number): string => {
  const words: { [key: number]: string } = {
    10: "दस", 11: "ग्यारह", 12: "बारह", 13: "तेरह", 14: "चौदह", 15: "पंद्रह", 16: "सोलह", 17: "सत्रह", 18: "अठारह", 19: "उन्नीस", 20: "बीस", 
    21: "इक्कीस", 22: "बाईस", 23: "तेईस", 24: "चौबीस", 25: "पच्चीस", 26: "छब्बीस", 27: "सत्ताईस", 28: "अट्ठाइस", 29: "उनतीस", 30: "तीस", 31: "इकतीस",
    1: "एक", 2: "दो", 3: "तीन", 4: "चार", 5: "पांच", 6: "छह", 7: "सात", 8: "आठ", 9: "नौ"
  };

  if (year >= 2000 && year < 2100) {
      const lastTwo = year % 100;
      let lastTwoWords = words[lastTwo] || lastTwo.toString();
      if (lastTwo === 0) lastTwoWords = "शून्य";
      return `दो हजार ${lastTwoWords}`;
  }
  return year.toString();
};

const formatDateHindi = (dateStr: string): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    return `${numberToHindiWords(day)} ${monthToHindi(month)} ${yearToHindiWords(year)}`;
};

export default function BirthRegistrationForm({ 
  userId, 
  userRole, 
  onSuccess, 
  submissions, 
  isAdminView,
  setIsAdminView 
}: BirthRegistrationFormProps) {
  const [formData, setFormData] = useState({
    // no serial number
    applicantName: '',
    fatherHusbandName: '',
    applicantVillage: '',
    applicantPost: '',
    applicantThana: '',
    applicantZilla: '',
    applicantState: 'बिहार',
    currentVillage: '',
    currentWard: '',
    currentPost: '',
    currentThana: '',
    currentZilla: '',
    currentState: 'बिहार',
    applicantRelationship: '',
    
    childName: '',
    childNameEnglish: '',
    birthDate: '',
    birthDateWords: '',
    birthPlace: '',
    fatherName: '',
    fatherNameEnglish: '',
    motherName: '',
    motherNameEnglish: '',
    permanentAddress: '',
    
    advocateName: '',
    advocateRegNo: '',
    advocateRegYear: '',
    place: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [activeTab, setActiveTab] = useState<"fill" | "preview" | "admin">("fill");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const draft = localStorage.getItem('janam_form_draft');
    if (draft) {
      try {
        setFormData(prev => ({ ...prev, ...JSON.parse(draft) }));
      } catch (e) { console.error(e); }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let updatedData = { ...formData, [name]: value };
    
    if (name === "birthDate") {
        updatedData.birthDateWords = formatDateHindi(value);
    }
    
    setFormData(updatedData);
    localStorage.setItem('janam_form_draft', JSON.stringify(updatedData));
  };

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      await addDoc(collection(db, "birth_registrations"), {
        ...formData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      alert("सफलतापूर्वक सहेजा गया!");
      onSuccess();
      setActiveTab("fill");
      // Clear draft
      localStorage.removeItem('janam_form_draft');
    } catch (err) {
      console.error(err);
      alert("त्रुटि: " + err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
      if (!editingId) return;
      setIsSaving(true);
      try {
          await updateDoc(doc(db, "birth_registrations", editingId), {
              ...formData,
              updatedAt: serverTimestamp()
          });
          alert("रिकॉर्ड अपडेट कर दिया गया है!");
          setEditingId(null);
          onSuccess();
          setActiveTab("admin");
      } catch (err) {
          console.error(err);
          alert("त्रुटि: " + err);
      } finally {
          setIsSaving(false);
      }
  };

  const deleteSubmission = async (id: string) => {
      try {
          await deleteDoc(doc(db, "birth_registrations", id));
      } catch (err) { console.error("त्रुटि: " + err); }
  };

  const editSubmission = (sub: any) => {
      setFormData({ ...sub });
      setEditingId(sub.id);
      setActiveTab("fill");
  };

  const handleResetForm = () => {
      setFormData({
            applicantName: '',
            fatherHusbandName: '',
            applicantVillage: '',
            applicantPost: '',
            applicantThana: '',
            applicantZilla: '',
            applicantState: 'बिहार',
            currentVillage: '',
            currentWard: '',
            currentPost: '',
            currentThana: '',
            currentZilla: '',
            currentState: 'बिहार',
            applicantRelationship: '',
            childName: '',
            childNameEnglish: '',
            birthDate: '',
            birthDateWords: '',
            birthPlace: '',
            fatherName: '',
            fatherNameEnglish: '',
            motherName: '',
            motherNameEnglish: '',
            permanentAddress: '',
            advocateName: '',
            advocateRegNo: '',
            advocateRegYear: '',
            place: '',
            date: new Date().toISOString().split('T')[0]
      });
      setEditingId(null);
      localStorage.removeItem('janam_form_draft');
  };

  const printRecord = (sub: any) => {
      flushSync(() => {
          setFormData({ ...sub });
      });
      setTimeout(() => {
          try {
              window.focus();
              window.print();
          } catch (err) {
              console.error("Print failed:", err);
          }
      }, 500);
  };

  const handleGlobalPrint = () => {
    try {
        window.focus();
        window.print();
    } catch (err) {
        console.error("Global print failed:", err);
        alert("प्रिंट विंडो खोलने में समस्या हुई। कृपया मैन्युअल रूप से प्रिंट (Ctrl+P) दबाएं।");
    }
  };

  const filteredSubmissions = submissions.filter(s => 
    s.childName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.applicantName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const PrintTemplate = ({ data, id }: { data: typeof formData, id?: string }) => (
    <div id={id} className="bg-white print:w-full print:h-auto print:min-h-0 w-[210mm] min-h-[297mm] mx-auto p-[15mm] print:p-[5mm] text-gray-900 relative font-['Noto_Sans_Devanagari'] leading-[1.6] print:leading-[1.5] text-[15px] print:text-[14px] box-border">
        {/* Header Section */}
        <div className="text-center mb-8 print:mb-4 pt-6 print:pt-2">
            <h1 className="text-2xl print:text-xl font-black mb-1 tracking-tighter">जन्म के विलम्बित निबन्धन</h1>
            <h2 className="text-4xl print:text-3xl font-black underline underline-offset-8 decoration-2 tracking-[0.1em]">शपथ-पत्र</h2>
        </div>

        {/* Form Body */}
        <div className="space-y-5 print:space-y-3">
            <p className="text-justify indent-12">
                <strong className="font-black text-black">मैं</strong> <strong className="font-black text-black">{data.applicantName || "...................................."}</strong> पिता/पति <strong className="font-black text-black">{data.fatherHusbandName || "...................................."}</strong> ग्राम/मुहल्ला <strong className="font-black text-black">{data.applicantVillage || "...................................."}</strong> पो. <strong className="font-black text-black">{data.applicantPost || "...................................."}</strong> थाना <strong className="font-black text-black">{data.applicantThana || "...................................."}</strong> जिला <strong className="font-black text-black">{data.applicantZilla || "...................................."}</strong> राज्य <strong className="font-black text-black">{data.applicantState || "बिहार"}</strong> का स्थायी निवासी हूँ एवं वर्तमान में मैं ग्राम/मुहल्ला <strong className="font-black text-black">{data.currentVillage || "...................................."}</strong> वार्ड नं. <strong className="font-black text-black">{data.currentWard || "................"}</strong> पो. <strong className="font-black text-black">{data.currentPost || "...................................."}</strong> थाना <strong className="font-black text-black">{data.currentThana || "...................................."}</strong> जिला <strong className="font-black text-black">{data.currentZilla || "...................................."}</strong> राज्य <strong className="font-black text-black">{data.currentState || "बिहार"}</strong> में रह रहा/रही हूँ।
            </p>

            <p className="text-justify">
                <strong className="font-black text-black">मैं</strong> अपने <strong className="font-black text-black">{data.applicantRelationship || "पुत्र/पुत्री"}</strong> के जन्म का निबन्धन समय पर नहीं कराया हूँ।
            </p>

            <p className="text-justify">
                अतः इसके विलम्बित निबन्धन कि स्वीकृति हेतु शपथ पूर्वक निम्न बयान देता हूँ। साथ ही यह भी शपथ पूर्वक बयान देता हूँ कि इस जन्म की घटना का निबन्धन पूर्व में अन्यत्र किसी भी जन्म-मृत्यु निबन्धन कार्यालय में नहीं कराया हूँ।
            </p>

            <div className="space-y-4 pt-4 ml-12">
                <div className="flex">
                    <span className="w-8 font-bold">1.</span>
                    <p>बालक/बालिका का पूरा नाम - <strong className="font-black text-black">{data.childName || "...................................."}</strong> {data.childNameEnglish && <span className="ml-2 uppercase tracking-wide font-black text-black">({data.childNameEnglish})</span>}</p>
                </div>
                <div className="flex">
                    <span className="w-8 font-bold">2.</span>
                    <div className="flex-1 flex gap-8 items-center">
                        <p>बालक/बालिका की जन्म-तिथि अंकों में - <strong className="font-black text-black">{data.birthDate.split('-').reverse().join('/') || "........................"}</strong></p>
                        <p>(शब्दों में) - <strong className="font-black text-black">{data.birthDateWords || "...................................."}</strong></p>
                    </div>
                </div>
                <div className="flex">
                    <span className="w-8 font-bold">3.</span>
                    <p>बालक/बालिका का जन्म स्थान - <strong className="font-black text-black">{data.birthPlace || "...................................."}</strong></p>
                </div>
                <div className="flex">
                    <span className="w-8 font-bold">4.</span>
                    <p>बालक/बालिका के पिता का पूरा नाम - <strong className="font-black text-black">{data.fatherName || "...................................."}</strong> {data.fatherNameEnglish && <span className="ml-2 uppercase tracking-wide font-black text-black">({data.fatherNameEnglish})</span>}</p>
                </div>
                <div className="flex">
                    <span className="w-8 font-bold">5.</span>
                    <p>बालक/बालिका के माता का पूरा नाम - <strong className="font-black text-black">{data.motherName || "...................................."}</strong> {data.motherNameEnglish && <span className="ml-2 uppercase tracking-wide font-black text-black">({data.motherNameEnglish})</span>}</p>
                </div>
                <div className="flex">
                    <span className="w-8 font-bold">6.</span>
                    <p>बालक/बालिका का स्थायी पता - <strong className="font-black text-black">{data.permanentAddress || "...................................."}</strong></p>
                </div>
            </div>

            <div className="pt-8 print:pt-4 flex flex-col items-end pr-10">
                <div className="w-72 print:w-64 border-b-2 border-gray-900 mb-2"></div>
                <p className="text-[17px] print:text-[14px] pr-10 font-bold">शपथकर्ता का हस्ताक्षर</p>
            </div>

            <div className="pt-8 print:pt-4">
                <p className="text-justify leading-[2] print:leading-[1.6] text-[16px] print:text-[14px]">
                    <strong className="font-black text-black">मैं</strong> <strong className="font-black text-black mx-1">{data.applicantName || "...................................."}</strong> पिता/पति <strong className="font-black text-black mx-1">{data.fatherHusbandName || "...................................."}</strong> शपथपूर्वक एकरार करता/करती हूँ कि शपथ-पत्र में दी गयी सभी सूचना मेरी जानकारी एवं विश्वास में सही एवं सत्य है एवं कोई भी अंश छुपाया नहीं गया है।
                </p>
            </div>

            <div className="flex justify-end mt-12 print:mt-6 pr-10">
                <div className="text-center">
                    <div className="w-80 print:w-72 border-b-2 border-gray-900 mb-3 print:mb-2"></div>
                    <p className="text-[17px] print:text-[14px] font-bold">शपथकर्ता का हस्ताक्षर / अंगूठे का निशान</p>
                </div>
            </div>

            <div className="mt-12 print:mt-6 border-t-2 border-gray-200 pt-6 print:pt-4 space-y-4 print:space-y-2">
                <p className="text-justify italic leading-relaxed text-[15px] print:text-[13px]">
                    प्रमाणित किया जाता है कि शपथकर्ता ने उक्त शपथ-पत्र का कुल मजमून मेरे समक्ष सही एवं सत्य होना स्वीकार किया है और जिसका पहचान श्री <strong className="font-black text-black">{data.advocateName || "................................"}</strong> अधिवक्ता, सिवान ने किया है।
                </p>

                
                <div className="flex justify-between items-start pt-10 print:pt-4">
                    <div className="pl-4 mt-24 print:mt-8">
                        <p className="text-[19px] print:text-[15px] font-bold">तिथि ........................</p>
                    </div>

                    <div className="relative pr-12">
                        <div className="space-y-4 print:space-y-2 text-[16px] print:text-[14px] text-left min-w-[300px]">
                            <p className="text-center text-xl print:text-lg mb-4 print:mb-2 font-bold">लेख्य प्रमाणक</p>
                            <div className="space-y-2 print:space-y-1">
                                <p>पूरा नाम <strong className="ml-2">............................................</strong></p>
                            </div>
                            <div className="space-y-2 print:space-y-1">
                                <p>रजिस्ट्रेशन <strong className="ml-2">........................................</strong></p>
                            </div>
                            <div className="space-y-2 print:space-y-1">
                                <p>रजिस्ट्रेशन का वर्ष - <strong className="ml-2">.......................</strong></p>
                            </div>
                            <div className="space-y-2 print:space-y-1">
                                <p>स्थान - <strong className="ml-2">...................................</strong></p>
                            </div>
                        </div>
                        
                        {/* Official Seal Stamped over the details */}
                        <div className="absolute -right-8 -top-12 w-64 h-64 border-4 border-purple-600/5 rounded-full flex flex-col items-center justify-center text-purple-600/10 text-[12px] uppercase font-black rotate-[-15deg] pointer-events-none select-none">
                            <div className="border-2 border-purple-600/5 rounded-full w-56 h-56 flex flex-col items-center justify-center p-3">
                                <div className="border border-purple-600/5 rounded-full w-full h-full flex flex-col items-center justify-center">
                                    <span className="mb-1">OFFICIAL</span>
                                    <span>SEAL</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

  );


  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Internal Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 no-print">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-20">
              <div className="flex items-center gap-8">
                  <button 
                    onClick={() => setActiveTab("fill")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "fill" ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
                  >
                      <FileText className="w-4 h-4" /> Entry Form
                  </button>
                  <button 
                    onClick={() => setActiveTab("preview")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "preview" ? "bg-purple-50 text-purple-600" : "text-gray-400 hover:text-gray-600"}`}
                  >
                      <Eye className="w-4 h-4" /> Live Preview
                  </button>
                  {userRole === "admin" && (
                    <button 
                        onClick={() => setActiveTab("admin")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "admin" ? "bg-orange-50 text-orange-600" : "text-gray-400 hover:text-gray-600"}`}
                    >
                        <Settings className="w-4 h-4" /> Records Database
                    </button>
                  )}
              </div>
              <div className="flex items-center gap-4">
                  <button 
                    onClick={handleGlobalPrint}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl shadow-black/10"
                  >
                      <Printer className="w-4 h-4" /> Print Document
                  </button>
              </div>
          </div>
      </div>

      <div id="print-area-wrapper" className="hidden" aria-hidden="true">
          <PrintTemplate data={formData} id="print-area" />
      </div>

      <div className="max-w-7xl mx-auto p-8 flex gap-8 no-print pb-32">
          {/* Main Area */}
          <div className="flex-1">
              {activeTab === "fill" && (
                  <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden">
                      <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                          <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">{editingId ? "Edit Record" : "Digital Entry Form"}</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mt-1">शपथ-पत्र विवरण भरें</p>
                          </div>
                      </div>

                      <div className="p-10 space-y-12">
                          <div className="space-y-6">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                      <User className="w-4 h-4" />
                                  </div>
                                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-600">आवेदक (शपथकर्ता) का विवरण</h3>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="space-y-1.5 md:col-span-2">
                                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">शपथकर्ता का नाम</label>
                                      <input type="text" name="applicantName" value={formData.applicantName} onChange={handleChange} placeholder="मैं ________________" className="w-full bg-gray-50 border-none px-6 py-4 rounded-2xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">पिता/पति का नाम</label>
                                      <input type="text" name="fatherHusbandName" value={formData.fatherHusbandName} onChange={handleChange} className="w-full bg-gray-50 border-none px-6 py-4 rounded-2xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">सांबंध (Relationship)</label>
                                      <select 
                                        name="applicantRelationship" 
                                        value={formData.applicantRelationship} 
                                        onChange={handleChange} 
                                        className="w-full bg-gray-50 border-none px-6 py-4 rounded-2xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none"
                                      >
                                          <option value="">-- संबंध चुनें --</option>
                                          <option value="पिता">पिता</option>
                                          <option value="माता">माता</option>
                                          <option value="पत्नी">पत्नी</option>
                                          <option value="पति">पति</option>
                                          <option value="पुत्र">पुत्र</option>
                                          <option value="पुत्री">पुत्री</option>
                                          <option value="भाई">भाई</option>
                                          <option value="बहन">बहन</option>
                                          <option value="दादा">दादा</option>
                                          <option value="दादी">दादी</option>
                                          <option value="नाना">नाना</option>
                                          <option value="नानी">नानी</option>
                                          <option value="ससुर">ससुर</option>
                                          <option value="सास">सास</option>
                                          <option value="स्वयं">स्वयं</option>
                                      </select>
                                  </div>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                  <input type="text" name="applicantVillage" value={formData.applicantVillage} onChange={handleChange} placeholder="ग्राम/मुहल्ला" className="bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold outline-none" />
                                  <input type="text" name="applicantPost" value={formData.applicantPost} onChange={handleChange} placeholder="पोस्ट" className="bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold outline-none" />
                                  <input type="text" name="applicantThana" value={formData.applicantThana} onChange={handleChange} placeholder="थाना" className="bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold outline-none" />
                                  <input type="text" name="applicantZilla" value={formData.applicantZilla} onChange={handleChange} placeholder="जिला" className="bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold outline-none" />
                                  <input type="text" name="applicantState" value={formData.applicantState} onChange={handleChange} placeholder="राज्य" className="bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold outline-none" />
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-gray-50">
                                  <div className="col-span-5 flex items-center justify-between">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">वर्तमान पता</p>
                                      <label className="flex items-center gap-2 cursor-pointer group">
                                          <input 
                                            type="checkbox" 
                                            className="w-3 h-3 rounded text-blue-600 focus:ring-blue-500/20 border-gray-300"
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    const updatedData = {
                                                        ...formData,
                                                        currentVillage: formData.applicantVillage,
                                                        currentPost: formData.applicantPost,
                                                        currentThana: formData.applicantThana,
                                                        currentZilla: formData.applicantZilla,
                                                        currentState: formData.applicantState
                                                    };
                                                    setFormData(updatedData);
                                                    localStorage.setItem('janam_form_draft', JSON.stringify(updatedData));
                                                }
                                            }}
                                          />
                                          <span className="text-[10px] font-black uppercase tracking-tight text-gray-400 group-hover:text-blue-600 transition-colors">स्थायी पता के समान (Same as Permanent)</span>
                                      </label>
                                  </div>
                                  <input type="text" name="currentVillage" value={formData.currentVillage} onChange={handleChange} placeholder="ग्राम/मुहल्ला" className="bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold outline-none" />
                                  <input type="text" name="currentWard" value={formData.currentWard} onChange={handleChange} placeholder="वार्ड नं." className="bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold outline-none" />
                                  <input type="text" name="currentPost" value={formData.currentPost} onChange={handleChange} placeholder="पोस्ट" className="bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold outline-none" />
                                  <input type="text" name="currentThana" value={formData.currentThana} onChange={handleChange} placeholder="थाना" className="bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold outline-none" />
                                  <input type="text" name="currentZilla" value={formData.currentZilla} onChange={handleChange} placeholder="जिला" className="bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold outline-none" />
                              </div>
                          </div>

                          <div className="space-y-6 pt-12 border-t border-gray-50">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                                      <CheckCircle2 className="w-4 h-4" />
                                  </div>
                                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-600">बालक/बालिका की जानकारी</h3>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <input type="text" name="childName" value={formData.childName} onChange={handleChange} placeholder="बालक/बालिका का पूरा नाम" className="w-full bg-gray-50 border-none px-6 py-4 rounded-2xl text-sm font-bold outline-none" />
                                  <input type="text" name="childNameEnglish" value={formData.childNameEnglish} onChange={handleChange} placeholder="Child Full Name (English)" className="w-full bg-gray-50 border-none px-6 py-4 rounded-2xl text-sm font-bold outline-none" />
                                  
                                  <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className="w-full bg-gray-50 border-none px-6 py-4 rounded-2xl text-sm font-bold outline-none" />
                                  <input type="text" name="birthPlace" value={formData.birthPlace} onChange={handleChange} placeholder="जन्म स्थान" className="w-full bg-gray-50 border-none px-6 py-4 rounded-2xl text-sm font-bold outline-none" />
                                  
                                  <input type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} placeholder="पिता का पूरा नाम" className="w-full bg-gray-50 border-none px-6 py-4 rounded-2xl text-sm font-bold outline-none" />
                                  <input type="text" name="fatherNameEnglish" value={formData.fatherNameEnglish} onChange={handleChange} placeholder="Father's Full Name (English)" className="w-full bg-gray-50 border-none px-6 py-4 rounded-2xl text-sm font-bold outline-none" />
                                  
                                  <input type="text" name="motherName" value={formData.motherName} onChange={handleChange} placeholder="माता का पूरा नाम" className="w-full bg-gray-50 border-none px-6 py-4 rounded-2xl text-sm font-bold outline-none" />
                                  <input type="text" name="motherNameEnglish" value={formData.motherNameEnglish} onChange={handleChange} placeholder="Mother's Full Name (English)" className="w-full bg-gray-50 border-none px-6 py-4 rounded-2xl text-sm font-bold outline-none" />
                                  
                                  <input type="text" name="permanentAddress" value={formData.permanentAddress} onChange={handleChange} placeholder="स्थायी पता" className="w-full md:col-span-2 bg-gray-50 border-none px-6 py-4 rounded-2xl text-sm font-bold outline-none" />
                              </div>
                          </div>

                          <div className="space-y-6 pt-12 border-t border-gray-50">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                                      <Scale className="w-4 h-4" />
                                  </div>
                                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-600">अधिवक्ता एवं प्रमाणीकरण</h3>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <input type="text" name="advocateName" value={formData.advocateName} onChange={handleChange} placeholder="अधिवक्ता का नाम" className="w-full bg-gray-50 border-none px-6 py-4 rounded-2xl text-sm font-bold outline-none" />
                                  <input type="text" name="advocateRegNo" value={formData.advocateRegNo} onChange={handleChange} placeholder="रजिस्ट्रेशन नंबर" className="w-full bg-gray-50 border-none px-6 py-4 rounded-2xl text-sm font-bold outline-none" />
                                  <input type="text" name="advocateRegYear" value={formData.advocateRegYear} onChange={handleChange} placeholder="वर्ष" className="w-full bg-gray-50 border-none px-6 py-4 rounded-2xl text-sm font-bold outline-none" />
                              </div>
                          </div>

                          <div className="flex gap-4 pt-12">
                              <button 
                                onClick={editingId ? handleUpdate : handleCreate}
                                disabled={isSaving}
                                className={`flex-1 ${editingId ? 'bg-orange-600' : 'bg-blue-600'} text-white py-5 rounded-2xl text-[13px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl flex items-center justify-center gap-3`}
                              >
                                  {isSaving ? <Download className="w-5 h-5 animate-spin" /> : <Edit className="w-5 h-5" />}
                                  {editingId ? "UPDATE RECORD" : "EDIT & UPDATE RECORD"}
                              </button>
                              <button 
                                onClick={handleResetForm}
                                className="flex-1 bg-gray-100 text-gray-700 border border-gray-200 py-5 rounded-2xl text-[13px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center gap-3"
                              >
                                  <Edit className="w-5 h-5" /> NEW ENTRY
                              </button>
                              <button 
                                onClick={() => {
                                  flushSync(() => {
                                    setActiveTab("preview");
                                  });
                                  setTimeout(() => {
                                      try {
                                          window.focus();
                                          window.print();
                                      } catch (err) {
                                          console.error("Print failed:", err);
                                      }
                                  }, 500);
                                }}
                                className="flex-1 bg-gray-50 text-gray-900 border border-gray-100 py-5 rounded-2xl text-[13px] font-black uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-3"
                              >
                                  <Printer className="w-5 h-5" /> PRINT
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === "preview" && (
                  <div className="flex flex-col items-center gap-8">
                      <div className="flex gap-4 no-print">
                          <button 
                            onClick={() => setActiveTab("fill")}
                            className="flex items-center gap-2 px-6 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-lg"
                          >
                              <FileText className="w-4 h-4" /> Edit Form
                          </button>
                          <button 
                            onClick={handleGlobalPrint}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                          >
                              <Printer className="w-4 h-4" /> Print Document
                          </button>
                      </div>
                      
                      <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 min-h-[1000px] flex flex-col items-center p-12 overflow-hidden w-full max-w-[900px]">
                          <div className="scale-90 origin-top transform-gpu">
                            <PrintTemplate data={formData} />
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === "admin" && userRole === "admin" && (
                  <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden">
                      <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                          <h3 className="font-black text-2xl tracking-tighter text-gray-900 uppercase italic">Registered Documents</h3>
                          <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name..." 
                                className="bg-gray-50 border-none pl-12 pr-6 py-3 rounded-2xl text-xs font-bold outline-none w-64 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                            />
                          </div>
                      </div>
                      <div className="overflow-x-auto">
                          <table className="w-full">
                              <thead className="bg-gray-50/50 uppercase">
                                  <tr>
                                      <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 tracking-widest">Child</th>
                                      <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 tracking-widest">Applicant</th>
                                      <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 tracking-widest">Actions</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                  {filteredSubmissions.map((sub) => (
                                      <tr key={sub.id} className="hover:bg-gray-50/50 transition-all group">
                                          <td className="px-8 py-6">
                                              <div className="flex flex-col">
                                                  <span className="font-black text-gray-900 group-hover:text-blue-600 transition-colors uppercase leading-tight">{sub.childName}</span>
                                                  <span className="text-[10px] font-bold text-gray-400 mt-1">DOB: {sub.birthDate}</span>
                                              </div>
                                          </td>
                                          <td className="px-8 py-6">
                                              <span className="font-bold text-gray-700">{sub.applicantName}</span>
                                          </td>
                                          <td className="px-8 py-6">
                                              <div className="flex justify-end gap-3">
                                                  <button onClick={() => printRecord(sub)} title="Print Document" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm"><Printer className="w-4 h-4" /></button>
                                                  <button onClick={() => editSubmission(sub)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-white rounded-xl transition-all shadow-sm"><FileText className="w-4 h-4" /></button>
                                                  <button onClick={() => deleteSubmission(sub.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-xl transition-all shadow-sm"><Trash2 className="w-4 h-4" /></button>
                                              </div>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}
          </div>

          <div className="w-80 space-y-8 sticky top-24 h-fit">
              <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-gray-100 space-y-8">
                  <h3 className="text-xl font-black italic uppercase tracking-tighter text-gray-900">Stats & Help</h3>
                  <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                        <span className="text-[10px] font-black uppercase text-blue-400">Total Entries</span>
                        <span className="text-2xl font-black text-blue-600 italic">{submissions.length}</span>
                      </div>
                      <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50 space-y-2">
                          <p className="text-[10px] font-black uppercase text-orange-400">Draft Status</p>
                          <p className="text-xs font-bold text-orange-700">Auto-saved to Browser</p>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}
