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
  "QR Code Designer & Modifier": "qr-code-generator.html",
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
  // RC Services
  "RC PDF INSTANT": "vehicle-and-transport-services/rc-pdf-instant.html",
  "Vehicle Verification & Details": "vehicle-and-transport-services/vehicle-full-details.html",
  "Change RC Mobile Number": "vehicle-and-transport-services/change-rc-mobile-number.html",

  // DL & LL Services
  "DL PDF INSTANT": "vehicle-and-transport-services/dl-pdf-instant.html",
  "DL PDF Server 1": "vehicle-and-transport-services/dl-pdf-server-1.html",
  "DL PDF Server 2 (Blue)": "vehicle-and-transport-services/dl-pdf-server-2.html",
  "LL PDF": "vehicle-and-transport-services/ll-pdf.html",
  "LL Exam Request": "vehicle-and-transport-services/ll-exam-request.html",

  // Voter Services
  "Voter Mobile Link": "voter-services/voter-mobile-link.html",
  "Voter Mobile Link S1": "voter-services/voter-mobile-link-s1.html",
  "Voter PDF": "voter-services/voter-pdf.html",

  // Farmer Services
  "KISAN CARD": "farmer-services/kisan-card.html",
  "Farmer PDF S1": "farmer-services/farmer-pdf-s1.html",
  "Farmer PDF All State": "farmer-services/farmer-pdf-all-state.html",
  "AgriStack Farmer PDF": "farmer-services/agristack-farmer-pdf.html",

  // PAN Services
  "Aadhaar to PAN": "pan-services/aadhaar-to-pan.html",
  "Aadhaar to PAN S1": "pan-services/aadhaar-to-pan-s1.html",
  "PAN Details": "pan-services/pan-details.html",
  "TAN Verification": "pan-services/tan-verification.html",
  "New PAN apply": "pan-services/new-pan-apply.html",
  "PAN update / correction": "pan-services/pan-update-correction.html",

  // Udyam Services
  "New UDYAM CERTIFICATE": "udyam-services/new-udyam-certificate.html",
  "PAN to Udyam S2": "udyam-services/pan-to-udyam-s2.html",

  // Aadhaar & Ration
  "AADHAAR Update": "aadhaar-ration/aadhaar-update.html",
  "Ration PDF S1": "aadhaar-ration/ration-pdf-s1.html",
  "Ration PDF S2 (Aadhaar)": "aadhaar-ration/ration-pdf-s2.html",

  // Mobile Services
  "Mobile Details Find": "mobile-services/mobile-details-find.html",
  "Mobile Details S1": "mobile-services/mobile-details-s1.html",
  "Mobile Details S2": "mobile-services/mobile-details-s2.html",
  "Other Mobile Issue": "mobile-services/other-mobile-issue.html",

  // GST Services
  "New GST Certificate": "gst-services/new-gst-certificate.html",
  "GST Download": "gst-services/gst-download.html",
  "PAN to GST": "gst-services/pan-to-gst.html",
  "GST Details": "gst-services/gst-details.html",

  // Chassis, Vehicle & Challan
  "Chassis to RC": "vehicle-and-transport-services/chassis-to-rc.html",
  "Vehicle to Mobile Find": "vehicle-and-transport-services/vehicle-to-mobile-find.html",
  "Challan Details": "vehicle-and-transport-services/challan-details.html",
  "DBT Seeding Status": "bank-services/dbt-seeding-status.html",

  // Disambiguated Duplicate Names (Lost Document vs PVC Converter)
  "Lost Document Service|Voter ID": "lost-documents/voter-id.html",
  "Lost Document Service|Aadhaar Card": "lost-documents/aadhaar-card.html",
  "Lost Document Service|PAN Card": "lost-documents/pan-card.html",
  "Lost Document Service|Driving License": "lost-documents/driving-license.html",

  "PVC Converter Tools|Voter ID": "pvc-converter/voter-id.html",
  "PVC Converter Tools|Aadhaar Card": "pvc-converter/aadhaar-card.html",
  "PVC Converter Tools|PAN Card": "pvc-converter/pan-card.html",
  "PVC Converter Tools|Driving License": "pvc-converter/driving-license.html",
  "PVC Converter Tools|Vehicle RC": "pvc-converter/vehicle-rc.html",
  "PVC Converter Tools|Any Other Document": "pvc-converter/any-other-document.html",

  // Govt Department & Civil Contractor Services
  "New Digital Signature (DSC)": "govt-contractor/new-dsc.html",
  "E-procurement registration": "govt-contractor/e-procurement-registration.html",
  "Tender upload (for contractor)": "govt-contractor/tender-upload-contractor.html",
  "Tender upload (for department)": "govt-contractor/tender-upload-department.html",
  "Building estimate creator": "govt-contractor/building-estimate-creator.html",
  "BOQ creator": "govt-contractor/boq-creator.html",
  "Govt civil & electric bill maker (Excel)": "govt-contractor/civil-electric-bill-excel.html",
  "Bill form": "govt-contractor/bill-form.html",
  "Extra item sheet": "govt-contractor/extra-item-sheet.html",
  "Excess item sheet": "govt-contractor/excess-item-sheet.html",
  "QC register creator": "govt-contractor/qc-register-creator.html",
  "Work escalation statement": "govt-contractor/work-escalation-statement.html"
};

// MAIN GET URL FUNCTION
function getToolUrl(name, key = "") {
  // 1. Check if it's a Paid Service by composite key ("Category|Name") or Name
  if (key && paidToolsMap[key]) {
    return `paidtools/${paidToolsMap[key]}`;
  }
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
