// --- FREE TOOLS MAPPING ---
const freeToolsMap = {
  "Passport Photo Sheet": "passport-photo-sheet.html",
  "Passport Photo Maker": "passport_photo.html",
  "PDF to Excel": "pdf-to-excel.html",
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
  "PDF Page Number Adder": "pdf_page_number_adder.html",
  "PDF Header & Footer Maker": "pdf_header_footer_maker.html",
  "Photo Compressor (KB)": "photo-compressor.html",
  "Image Format Converter": "image-converter.html",
  "Background Remover": "background-remover.html",
  "WebP to JPG Converter": "webp-to-jpg.html",
  "Digital Signature Maker": "digital-signature-maker.html",
  "Photo Color Changer": "photo-color-changer.html",
  "Photo Blur Tool": "photo-blur.html",
  "Image to Black & White": "image-black-and-white.html",
  "Background Black & White": "background_black_white.html",
  "Photo Border Maker": "photo-border.html",
  "Color Picker from Image": "color-picker.html",
  "ID Card Maker": "id_card_maker.html",
  "Employee ID Card Maker": "employee-id-card-maker.html",
  "Student ID Card Maker": "student-id-card-maker.html",
  "A4 Photo Print Layout": "a4-photo-print-layout.html",
  "Text to PDF / Application": "text-to-pdf.html",
  "Resume Maker": "resume-maker.html",
  "Invoice Maker": "invoice-maker.html",
  "Quotation Maker": "quotation-maker.html",
  "Hindi Typing Tool": "hindi-typing.html",
  "GST Calculator": "gst-calculator.html",
  "GST Inclusive & Exclusive Calculator": "gst-inclusive-exclusive.html",
  "Printing Cost Calculator": "printing-cost-calculator.html",
  "Cash Denomination Calculator": "cash-denomination-calculator.html",
  "Salary Calculator": "salary-calculator.html",
  "Percentage Calculator": "percentage-calculator.html",
  "Loan / EMI Calculator": "loan-emi-calculator.html",
  "Word Counter": "word-counter.html",
  "ICO to PNG": "ico_to_png.html",
  "ICO Converter (Favicon)": "ico_converter_favicon.html",
  "Thumbnail Resizer": "thumbnail_resizer.html",
  "Favicon Preview Tool & Maker": "favicon_preview_tool_maker.html",
  "Image Watermark Maker": "image-watermark-maker.html",
  "Calculator — Basic & Scientific": "calculator.html",
  "Online Stopwatch": "stopwatch.html",
  "Name, Date & Text on Photo": "name_date_text_on_photo.html",
  "Instagram Reel Cover Maker": "instagram_reel_cover_maker.html",
  "Password to MD5 / SHA-256": "password-to-md5.html",
  "Meta Title & Description Generator": "meta-generator.html",
  "OMR Sheet Generator & Checker": "omr-generator.html",
  "Typing Speed Test — Hindi & English": "typing-test.html",
  "Online Exam System — Teacher & Student": "online-exam.html"
};

// --- PAID SERVICES MAPPING ---
const paidToolsMap = {
  "RC PDF INSTANT": "vehicle-and-transport-services/rc-pdf-instant.html",
  "RC PDF Server 1": "vehicle-and-transport-services/rc-pdf-instant.html",
  "RC PDF Server 2": "vehicle-and-transport-services/rc-pdf-instant.html"
};

// MAIN GET URL FUNCTION
function getToolUrl(name) {
  // 1. Check if it's a Paid Service
  if (paidToolsMap[name]) {
    return `paidtools/${paidToolsMap[name]}`;
  }

  // 2. Check if it's a Free Tool
  if (freeToolsMap[name]) {
    return `freetools/${freeToolsMap[name]}`;
  }

  // 3. Fallback for unmapped free tools
  const fallback = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `freetools/${fallback}.html`;
}