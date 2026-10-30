// --- FREE TOOLS MAPPING ---
const freeToolsMap = {
  "Passport Photo Sheet": "passport-photo-sheet.html",
  "Passport Photo Maker": "passport_photo.html",
  "QR Code Generator": "qr-code-generator.html",
  "Stamp Designer": "stamp-designer.html",
  "ID Card Front & Back to A4": "id-card-front-back-a4.html",
  "What Is My IP": "what-is-my-ip.html",
  "Letterhead Maker": "letterhead-maker.html",
  "Visiting Card Designer": "visiting-card-designer.html",
  "Marriage Biodata Maker": "marriage-biodata-maker.html",
  "Age Calculator": "age-calculator.html",
  "Photo & Signature Resizer": "photo-signature-resizer.html",
  "JPG / PNG to PDF": "jpg-png-to-pdf.html",
  "PDF Merge": "pdf-merge.html",
  "PDF Split & Page Extract": "pdf-split-extract.html",
  "PDF to JPG": "pdf-to-jpg.html",
  "PDF Rotate & Reorder": "pdf-rotate-reorder.html",
  "PDF Compressor (KB)": "pdf-compressor.html",
  "Document Scanner & PDF": "document-scanner.html",
  "Photo Compressor (KB)": "photo-compressor.html",
  "Image Format Converter": "image-converter.html",
  "Background Remover": "background-remover.html",
  "WebP to JPG Converter": "webp-to-jpg.html",
  "Digital Signature Maker": "digital-signature-maker.html",
  "Photo Color Changer": "photo-color-changer.html",
  "Photo Blur Tool": "photo-blur.html",
  "PDF Page Number Adder": "pdf-page-number-adder.html",
  "PDF Header & Footer Maker": "pdf-header-footer-maker.html",
  "Image to Black & White": "image-black-and-white.html",
  "Hindi Typing Tool": "hindi-typing.html",
  "GST Calculator": "gst-calculator.html",
  "GST Inclusive & Exclusive Calculator": "gst-inclusive-exclusive.html",
  "Printing Cost Calculator": "printing-cost-calculator.html",
  "Cash Denomination Calculator": "cash-denomination-calculator.html",
  "Salary Calculator": "salary-calculator.html",
  "Percentage Calculator": "percentage-calculator.html",
  "Loan / EMI Calculator": "loan-emi-calculator.html",
  "Word Counter": "word-counter.html"
};

// --- PAID SERVICES MAPPING ---
const paidToolsMap = {
  "RC PDF INSTANT": "vehicle-and-transport-services/rc-pdf-instant.html",
  "RC PDF Server 1": "vehicle-and-transport-services/rc-pdf-instant.html",
  "RC PDF Server 2": "vehicle-and-transport-services/rc-pdf-instant.html"
};

// --- MAIN GET URL FUNCTION ---
function getToolUrl(name) {
  if (paidToolsMap[name]) {
    return `paidtools/${paidToolsMap[name]}`;
  }
  if (freeToolsMap[name]) {
    return `freetools/${freeToolsMap[name]}`;
  }
  const fallback = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `freetools/${fallback}.html`;
}
