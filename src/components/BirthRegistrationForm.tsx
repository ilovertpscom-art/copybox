import React, { useState } from 'react';
import { 
  FileText, 
  List,
  Eye,
  Trash2
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface BirthRegistrationFormProps {
  userId: string;
  userRole: string | null;
  onSuccess: () => void;
  submissions: any[];
  isAdminView: boolean;
  setIsAdminView: (val: boolean) => void;
}

export default function BirthRegistrationForm({ 
  userId, 
  userRole, 
  onSuccess, 
  submissions, 
  isAdminView,
  setIsAdminView 
}: BirthRegistrationFormProps) {
  const [formData, setFormData] = useState({
    birthDate: '', gender: 'MALE', childName: '',
    birthPlaceType: 'HOSPITAL', hospitalName: '', birthPlaceAddress: '',
    fatherName: '', fatherUid: '', fatherEducation: '', fatherOccupation: '',
    motherName: '', motherUid: '', motherEducation: '', motherOccupation: '',
    addressAtBirth: '', permanentAddress: '', mobileNumber: '',
    motherAgeAtBirth: '', birthWeight: '', deliveryMethod: 'NORMAL', orderOfBirth: '1'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "birth_registrations"), {
        ...formData,
        userId,
        status: 'PENDING',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      alert("Submitted!");
      onSuccess();
    } catch (err) {
      console.error("Submit error:", err);
      alert("Error.");
    }
  };

  if (isAdminView && userRole === 'admin') {
    return (
      <div className="space-y-4 p-4">
        <h2 className="text-xl font-bold">All Submissions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {submissions.map((sub) => (
            <div key={sub.id} className="bg-white p-4 rounded-lg border shadow">
              <h3 className="font-bold">{sub.childName}</h3>
              <p className="text-sm">{sub.fatherName} child</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const Input = ({ name, placeholder }: { name: string, placeholder: string }) => (
    <input name={name} onChange={handleChange} placeholder={placeholder} className="border border-gray-300 p-1 text-xs w-full"/>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white border-2 border-blue-200 shadow-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Part 1 */}
        <div className="space-y-1">
            <h2 className="font-bold text-xs bg-blue-50 p-1 border-b border-blue-200 bg-gray-50">भाग 1: आवेदककर्ता और पते की जानकारी *</h2>
            <div className="grid grid-cols-4 gap-2">
                <Input name="applicantName" placeholder="आवेदक का नाम *" />
                <Input name="relation" placeholder="आवेदक का संबंध *" />
                <Input name="fatherHusbandName" placeholder="पिता/पति का नाम *" />
                <Input name="age" placeholder="उम्र (वर्ष में) *" />
                <Input name="gramShahr" placeholder="ग्राम/शहर *" />
                <Input name="dakghar" placeholder="डाकघर *" />
                <Input name="thana" placeholder="थाना *" />
                <Input name="anumandal" placeholder="अनुमंडल *" />
                <Input name="zilla" placeholder="जिला *" />
                <Input name="rajya" placeholder="राज्य *" />
                <Input name="mobile" placeholder="मोबाइल नंबर *" />
            </div>
        </div>

        {/* Part 2 */}
        <div className="space-y-1">
            <h2 className="font-bold text-xs bg-gray-50 p-1 border-b border-blue-200">भाग 2: बच्चे और परिवार की जानकारी *</h2>
            <div className="grid grid-cols-2 gap-2">
                <Input name="childNameEng" placeholder="बालक/बालिका का नाम (English) *" />
                <Input name="childNameHindi" placeholder="बालक/बालिका का नाम (हिंदी) *" />
                <Input name="fatherNameEng" placeholder="पिता का नाम (English) *" />
                <Input name="fatherNameHindi" placeholder="पिता का नाम (हिंदी) *" />
                <Input name="motherNameEng" placeholder="माता का नाम (English) *" />
                <Input name="motherNameHindi" placeholder="माता का नाम (हिंदी) *" />
            </div>
        </div>

        {/* Part 2 Continued */}
        <div className="space-y-1">
            <h2 className="font-bold text-xs bg-gray-50 p-1 border-b border-blue-200">जन्म का स्थान विवरण *</h2>
            <div className="grid grid-cols-3 gap-2">
                <Input name="birthPlaceState" placeholder="राज्य *" />
                <Input name="birthPlaceZilla" placeholder="जिला *" />
                <Input name="birthPlaceAnumandal" placeholder="अनुमंडल *" />
                <Input name="birthPlacePrakhand" placeholder="प्रखण्ड *" />
                <Input name="birthPlacePanchayat" placeholder="पंचायत *" />
                <Input name="birthPlaceThana" placeholder="थाना *" />
            </div>
            <Input name="birthPlaceDetail" placeholder="जन्म स्थान पूरा पता *" />
        </div>

        {/* Part 3 */}
        <div className="space-y-1">
            <h2 className="font-bold text-xs bg-blue-50 p-1 border-b border-blue-200 bg-gray-50">भाग 3: गवाहों एवं जाँचकर्ता की जानकारी *</h2>
            <div className="grid grid-cols-3 gap-2">
                <Input name="witness1Name" placeholder="गवाह 1 का नाम *" />
                <Input name="witness1Father" placeholder="गवाह 1 के पिता का नाम *" />
                <Input name="witness1Mohalla" placeholder="गवाह 1 का मुहल्ला *" />
                <Input name="witness2Name" placeholder="गवाह 2 का नाम *" />
                <Input name="witness2Father" placeholder="गवाह 2 के पिता का नाम *" />
                <Input name="witness2Mohalla" placeholder="गवाह 2 का मुहल्ला *" />
            </div>
        </div>

        {/* Part 4 */}
        <div className="space-y-1">
            <h2 className="font-bold text-xs bg-blue-50 p-1 border-b border-blue-200 bg-gray-50">भाग 4: शपथ-पत्र (Affidavit) की जानकारी *</h2>
            <Input name="birthDateWords" placeholder="जन्म-तिथि (शब्दों में) *" />
            <Input name="address" placeholder="वर्तमान पता *" />
        </div>

        <div className="flex gap-2 pt-4 border-t border-gray-200">
            <button type="submit" className="flex-1 bg-green-600 text-white p-2 text-xs font-bold rounded">पीडीएफ़ बनाएँ और प्रिंट करें</button>
            <button type="button" className="flex-1 bg-blue-600 text-white p-2 text-xs font-bold rounded">मैनुअल फॉर्म डाउनलोड करें</button>
            <button type="reset" className="flex-1 bg-red-600 text-white p-2 text-xs font-bold rounded">फॉर्म रीसेट करें</button>
        </div>
      </form>
      {userRole === 'admin' && (
          <button onClick={() => setIsAdminView(true)} className="mt-4 w-full bg-gray-600 text-white p-2 rounded text-xs uppercase font-bold">Admin View</button>
      )}
    </div>
  );
}
