import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface OCRResult {
  formattedDraft: string;
}

export async function processHindiImage(base64Image: string, mimeType: string): Promise<OCRResult> {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    आप एक विशेषज्ञ कानूनी टाइपिस्ट हैं।
    
    आपका कार्य:
    1. इमेज से टेक्स्ट को बिल्कुल वैसा ही निकालें जैसा वह लिखा गया है।
    2. केवल व्याकरण (Grammar) और वर्तनी (Spelling) में बहुत मामूली सुधार करें ताकि वह पढ़ने में साफ लगे।
    3. **सबसे महत्वपूर्ण निर्देश:** अपनी ओर से कोई भी नया शब्द, वाक्य, शीर्षक (Heading), विषय (Subject), या औपचारिक शब्द (जैसे 'सेवा में', 'महोदय' आदि) **तब तक न जोड़ें जब तक वे इमेज में पहले से न लिखे हों।**
    4. जैसा यूजर ने हाथ से लिखा है, उसे बस साफ-सुथरे टाइप किए हुए टेक्स्ट में बदल दें।
    5. टेक्स्ट का क्रम (Order) और पैराग्राफ बिल्कुल मूल पत्र (Original Letter) की तरह ही रखें।
    
    आउटपुट केवल JSON फॉर्मेट में होना चाहिए:
    {
      "formattedDraft": "..."
    }
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1],
              mimeType: mimeType,
            },
          },
          {
            text: "कृपया इस इमेज का OCR करें और इसे एक सरकारी आवेदन में बदलें।",
          },
        ],
      },
    ],
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
    },
  });

  const result = JSON.parse(response.text);
  return {
    formattedDraft: result.formattedDraft,
  };
}
