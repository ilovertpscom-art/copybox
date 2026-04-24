import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface OCRResult {
  formattedDraft: string;
}

export async function processHindiImage(base64Image: string, mimeType: string): Promise<OCRResult> {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    आप एक विशेषज्ञ कानूनी टाइपिस्ट और OCR विशेषज्ञ हैं।
    
    आपका कार्य:
    1. इमेज से टेक्स्ट को बिल्कुल वैसा ही निकालें जैसा वह लिखा गया है।
    2. केवल व्याकरण (Grammar) और वर्तनी (Spelling) में बहुत मामूली सुधार करें ताकि वह पढ़ने में साफ लगे।
    3. **सबसे महत्वपूर्ण निर्देश:** अपनी ओर से कोई भी नया शब्द, वाक्य, शीर्षक (Heading), विषय (Subject), या औपचारिक शब्द (जैसे 'सेवा में', 'महोदय' आदि) **तब तक न जोड़ें जब तक वे इमेज में पहले से न लिखे हों।**
    4. जैसा यूजर ने हाथ से लिखा है, उसे बस साफ-सुथरे टाइप किए हुए टेक्स्ट में बदल दें।
    5. टेक्स्ट का क्रम (Order) और पैराग्राफ बिल्कुल मूल पत्र (Original Letter) की तरह ही रखें।
    
    आउटपुट हमेशा "formattedDraft" की के साथ JSON फॉर्मेट में होना चाहिए।
  `;

  try {
    // Basic validation of base64 data
    const parts = base64Image.split(',');
    const base64Data = parts.length > 1 ? parts[1] : base64Image;

    const response = await ai.models.generateContent({
      model: model,
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: "कृपया इस इमेज का OCR करें और इसे एक सरकारी आवेदन की तरह शुद्ध हिंदी में व्यवस्थित करें।",
            },
          ],
        },
      ],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            formattedDraft: {
              type: Type.STRING,
              description: "The OCR processed text formatted professionally.",
            },
          },
          required: ["formattedDraft"],
        },
      },
    });

    if (!response.text) {
      throw new Error("Model returned an empty response. It might be due to safety filters.");
    }

    try {
      const result = JSON.parse(response.text);
      if (!result.formattedDraft) {
        // Fallback if schema failed but text exists
        return { formattedDraft: response.text };
      }
      return {
        formattedDraft: result.formattedDraft,
      };
    } catch (parseErr) {
      console.warn("JSON Parse failed, falling back to raw text:", parseErr);
      // If it's not valid JSON but has text, return the text as is
      return { formattedDraft: response.text };
    }
  } catch (err: any) {
    console.error("OCR API error:", err);
    throw new Error(err.message || "Failed to process image with Gemini AI.");
  }
}
