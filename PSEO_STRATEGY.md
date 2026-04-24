# Programmatic SEO (pSEO) Strategy for ScanHindi.com

Programmatic SEO is the process of generating thousands of landing pages at scale using templates and data. For a tool like ScanHindi, this is the most effective way to capture "long-tail" search traffic.

---

## 1. Core Keyword Templates
We will use variables to generate 100+ high-intent pages.

### Variable Sets:
- **{Document_Type}**: Legal Affidavit, Court Order, School Application, Land Record, Marriage Certificate, Medical Prescription, Old Letter, UPSC Notes.
- **{User_Type}**: Students, Lawyers, Government Clerks, Archivists, NRIs, Writers.
- **{Target_Format}**: Word, Excel, PDF, WhatsApp, Unicode.
- **{Language_Variant}**: Pure Hindi, Hinglish, Marathi, Sanskrit, Konkani, Bhojpuri (Devanagari).
- **{Region}**: Delhi, Mumbai, Patna, Lucknow, Jaipur, Indore, Ranchi.

---

## 2. 100 Page Ideas (Samples)

### Group A: Document-Specific (30 Pages)
1. Convert **Handwritten Hindi Letter** to Text Online
2. Best OCR for **Hindi Legal Affidavits**
3. Extract Text from **Hindi Land Records (Bhulekh)**
4. Scan **Hindi Government Applications** to Digital Unicode
5. Image to Text for **UPSC Hindi Literature Notes**
6. ... (Repeat for all 30 document types)

### Group B: User & Use-Case (30 Pages)
31. Best Hindi OCR Tool for **Lawyers in Delhi**
32. How **Government Clerks** can digitize Hindi files fast
33. **Student Guide**: Convert Hindi textbook photos to notes
34. Transcription tool for **Hindi Manuscript Researchers**
35. Digital archiving for **Hindi Libraries and Museum**
36. ... (Repeat for specific professional niches)

### Group C: Format & Technical (20 Pages)
61. Convert **Low Quality JPG** to Hindi Text Online
62. Extract Devanagari Text from **WhatsApp Image Screenhots**
63. Batch process **Hindi Scanned PDFs** to Word
64. Best Hindi OCR for **Mobile Phone Photos**
65. High Accuracy **Devanagari OCR for Old Books**
66. ... (Repeat for format/technical variations)

### Group D: Region & Language (20 Pages)
81. Online **Marathi Handwriting** to Text Converter
82. Best **Sanskrit Shloka** OCR for Researchers
83. Convert **Bhojpuri (Devanagari)** handwriting to Unicode
84. Hindi OCR Services for **Hindi Speaking NRI in USA**
85. Regional Hindi Dialect Text Extraction online
86. ... (Repeat for regional variations)

---

## 3. How to Scale Automatically

To build these pages without writing 100 separate files, follow this technical approach:

### Step 1: Create a Keyword Database (JSON)
Create a file `seo_data.json` containing the metadata for each page.
```json
[
  {
    "slug": "convert-hindi-affidavit-to-text",
    "title": "Convert Hindi Legal Affidavit to Text Online - 99% Accuracy",
    "h1": "Digitize Your Hindi Legal Affidavits Instantly",
    "description": "Download and edit scanned Hindi affidavits in MS Word. Best tool for lawyers using Devanagari OCR."
  },
  ...
]
```

### Step 2: Implement Dynamic Routing
In your React application (`src/App.tsx`), use a wildcard route:
```tsx
<Route path="/tools/:slug" element={<SEOLandingPage data={seoData} />} />
```

### Step 3: Use a Smart Template Component
Create a reusable component that accepts data and renders a high-quality landing page:
- **Dynamic H1/H2**: Injected from the JSON.
- **Dynamic Content**: Use a pattern like: "If you are looking for {Title}, ScanHindi is the perfect tool for {User_Type}."
- **Social Proof**: "Used by 500+ {User_Type} in {Region}."

### Step 4: Automate the Sitemap
Use a script to read `seo_data.json` and generate a `sitemap.xml` file every time you add a new keyword. This ensures Google crawls all 100+ pages automatically.

---

## 4. Content Checklist for pSEO Pages
- **Trust Badges**: "Zero Storage Policy", "Made in India".
- **Real-time Demo**: Embed a small "Preview" of the OCR tool on every page.
- **Internal Linking**: Every pSEO page should link back to the main homepage (`ScanHindi.com`) and the Blog.
