/**
 * Utility to export any HTML container/form into a Microsoft Word (.doc / .docx compatible) document
 * with full RTL support, table styling, images, and official document layout.
 */

export interface WordExportOptions {
  elementId: string;
  filename?: string;
  title?: string;
  orientation?: 'landscape' | 'portrait';
  paperSize?: 'a4' | 'a3';
}

/**
 * Converts an image URL (including relative paths and blobs) to Base64 data URL
 */
async function toBase64(url: string): Promise<string> {
  try {
    if (url.startsWith('data:')) return url;
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

export async function exportElementToWord({
  elementId,
  filename = 'سند_رسمی_صرافی.doc',
  title = 'سند رسمی',
  orientation = 'portrait',
  paperSize = 'a4',
}: WordExportOptions): Promise<boolean> {
  try {
    const targetElement = document.getElementById(elementId);
    if (!targetElement) {
      console.error(`Target element with id "${elementId}" not found for Word export.`);
      return false;
    }

    // 1. Clone element deeply
    const clone = targetElement.cloneNode(true) as HTMLElement;

    // 2. Remove non-printable / interactive UI elements
    const elementsToRemove = clone.querySelectorAll(
      'button, .print\\:hidden, [role="button"], .no-print, input[type="file"], select[data-no-export="true"]'
    );
    elementsToRemove.forEach((el) => el.remove());

    // 3. Process inputs -> convert to clean spans with text
    const origInputs = targetElement.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input, textarea, select'
    );
    const cloneInputs = clone.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input, textarea, select'
    );

    cloneInputs.forEach((cloneInput, idx) => {
      const origInput = origInputs[idx];
      let value = '';
      if (origInput) {
        if (origInput instanceof HTMLSelectElement) {
          value = origInput.options[origInput.selectedIndex]?.text || origInput.value;
        } else if (origInput instanceof HTMLInputElement && (origInput.type === 'checkbox' || origInput.type === 'radio')) {
          value = origInput.checked ? '✓ بلی' : '— نخیر';
        } else {
          value = origInput.value;
        }
      } else {
        value = (cloneInput as HTMLInputElement).value || '';
      }

      const span = document.createElement('span');
      span.textContent = value || '________';
      span.style.fontWeight = 'bold';
      span.style.color = '#0f172a';
      span.style.borderBottom = '1px solid #94a3b8';
      span.style.padding = '1px 6px';
      span.style.display = 'inline-block';
      cloneInput.parentNode?.replaceChild(span, cloneInput);
    });

    // 4. Convert all image sources to base64 inline images
    const images = clone.querySelectorAll<HTMLImageElement>('img');
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img.src && !img.src.startsWith('data:')) {
        const b64 = await toBase64(img.src);
        img.src = b64;
      }
      img.style.maxWidth = '120px';
      img.style.maxHeight = '120px';
      img.style.height = 'auto';
      img.style.display = 'inline-block';
    }

    // 5. Enhance table styling for Word
    const tables = clone.querySelectorAll('table');
    tables.forEach((tbl) => {
      tbl.setAttribute('border', '1');
      tbl.setAttribute('cellpadding', '5');
      tbl.setAttribute('cellspacing', '0');
      tbl.style.borderCollapse = 'collapse';
      tbl.style.width = '100%';
      tbl.style.marginTop = '12px';
      tbl.style.marginBottom = '12px';
      tbl.style.direction = 'rtl';
      tbl.style.borderColor = '#1e293b';

      const ths = tbl.querySelectorAll('th');
      ths.forEach((th) => {
        th.style.backgroundColor = '#f1f5f9';
        th.style.color = '#0f172a';
        th.style.border = '1px solid #1e293b';
        th.style.padding = '6px 8px';
        th.style.fontWeight = 'bold';
        th.style.textAlign = 'center';
      });

      const tds = tbl.querySelectorAll('td');
      tds.forEach((td) => {
        td.style.border = '1px solid #1e293b';
        td.style.padding = '6px 8px';
        td.style.textAlign = 'right';
      });
    });

    const isLandscape = orientation === 'landscape';
    const isA3 = paperSize === 'a3';
    const pageWidth = isA3 ? (isLandscape ? '42.0cm' : '29.7cm') : (isLandscape ? '29.7cm' : '21.0cm');
    const pageHeight = isA3 ? (isLandscape ? '29.7cm' : '42.0cm') : (isLandscape ? '21.0cm' : '29.7cm');

    // 6. Build the full Microsoft Word Document HTML Structure
    const wordDocHtml = `
<html xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Microsoft Word 15">
<meta name="Originator" content="Microsoft Word 15">
<title>${title}</title>
<!--[if gte mso 9]>
<xml>
  <o:DocumentProperties>
    <o:Title>${title}</o:Title>
    <o:Author>سامانه صرافی و خدمات پولی</o:Author>
  </o:DocumentProperties>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page Section1 {
    size: ${pageWidth} ${pageHeight};
    margin: 1.5cm 1.5cm 1.5cm 1.5cm;
    mso-header-margin: 1.0cm;
    mso-footer-margin: 1.0cm;
    mso-paper-source: 0;
    ${isLandscape ? 'mso-page-orientation: landscape;' : 'mso-page-orientation: portrait;'}
  }
  div.Section1 {
    page: Section1;
    direction: rtl;
    text-align: right;
  }
  body {
    font-family: 'B Nazanin', 'Vazirmatn', 'Tahoma', 'Arial', sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    direction: rtl;
    text-align: right;
    color: #0f172a;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
  }
  h1 { font-size: 16pt; font-weight: bold; text-align: center; margin: 6pt 0 4pt 0; color: #0f172a; }
  h2 { font-size: 13pt; font-weight: bold; text-align: center; margin: 4pt 0 4pt 0; color: #1e293b; }
  h3 { font-size: 11pt; font-weight: bold; text-align: center; margin: 3pt 0 3pt 0; color: #334155; }
  p { margin: 4pt 0; }
  .text-center { text-align: center !important; }
  .text-right { text-align: right !important; }
  .text-left { text-align: left !important; }
  .font-bold { font-weight: bold !important; }
  .font-black { font-weight: 900 !important; }
  .bg-slate-100 { background-color: #f1f5f9; }
  .bg-slate-200 { background-color: #e2e8f0; }
  .bg-slate-900 { background-color: #0f172a; color: #ffffff !important; }
  .text-white { color: #ffffff !important; }
  .border { border: 1px solid #cbd5e1; }
  .rounded-lg, .rounded-xl, .rounded-2xl { border-radius: 6pt; }
  .p-4 { padding: 12pt; }
  .p-2 { padding: 6pt; }
  .mb-4 { margin-bottom: 12pt; }
  .mb-2 { margin-bottom: 6pt; }
  .grid { display: block; }
  .flex { display: block; }
</style>
</head>
<body lang="FA" style="tab-interval:36.0pt; direction:rtl; text-align:right;">
<div class="Section1">
  ${clone.innerHTML}
</div>
</body>
</html>
`;

    // 7. Generate Download Blob & Trigger Download
    const blob = new Blob(['\ufeff' + wordDocHtml], {
      type: 'application/msword;charset=utf-8',
    });

    const cleanFilename = filename.endsWith('.doc') || filename.endsWith('.docx')
      ? filename
      : `${filename.replace(/\.pdf$/i, '')}.doc`;

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = cleanFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    return true;
  } catch (error) {
    console.error('Failed to export element to Word:', error);
    return false;
  }
}
