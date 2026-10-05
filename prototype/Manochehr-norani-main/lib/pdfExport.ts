import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface PdfExportOptions {
  elementId: string;
  filename?: string;
  paperSize?: 'a4' | 'a3';
  orientation?: 'landscape' | 'portrait';
  marginMm?: number;
  qualityScale?: number;
}

/**
 * Pure JS OKLCH to RGB/RGBA parser and converter.
 * Converts oklch(L C H [/ A]) or oklch(L, C, H, A) into rgb(r, g, b) or rgba(r, g, b, a).
 */
function parseOklchValues(match: string): { r: number; g: number; b: number; a: number } | null {
  try {
    const inner = match.replace(/^oklch\(\s*/i, '').replace(/\s*\)$/, '').trim();
    let parts: string[];
    let alphaStr: string | null = null;

    if (inner.includes('/')) {
      const slashParts = inner.split('/');
      alphaStr = slashParts[1].trim();
      parts = slashParts[0].trim().split(/[\s,]+/);
    } else {
      parts = inner.split(/[\s,]+/);
    }

    if (parts.length < 3) return null;

    let l = parseFloat(parts[0]);
    if (parts[0].endsWith('%')) l = l / 100;

    let c = parseFloat(parts[1]);
    if (parts[1].endsWith('%')) c = c / 100;

    let h = parseFloat(parts[2]);
    if (parts[2].endsWith('deg')) h = parseFloat(parts[2]);

    let a = 1;
    if (alphaStr) {
      a = parseFloat(alphaStr);
      if (alphaStr.endsWith('%')) a = a / 100;
    } else if (parts.length >= 4) {
      a = parseFloat(parts[3]);
      if (parts[3].endsWith('%')) a = a / 100;
    }

    if (isNaN(l) || isNaN(c) || isNaN(h)) return null;

    // OKLCH -> OKLAB
    const hRad = (h * Math.PI) / 180;
    const aLab = c * Math.cos(hRad);
    const bLab = c * Math.sin(hRad);

    // OKLAB -> Linear RGB
    const l_ = l + 0.3963377774 * aLab + 0.2158037573 * bLab;
    const m_ = l - 0.1055613458 * aLab - 0.0638541728 * bLab;
    const s_ = l - 0.0894841775 * aLab - 1.2914855480 * bLab;

    const l3 = l_ * l_ * l_;
    const m3 = m_ * m_ * m_;
    const s3 = s_ * s_ * s_;

    const rLin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

    const toSrgb = (val: number) => {
      const clamped = Math.max(0, Math.min(1, val));
      const srgb = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
      return Math.round(Math.max(0, Math.min(255, srgb * 255)));
    };

    return {
      r: toSrgb(rLin),
      g: toSrgb(gLin),
      b: toSrgb(bLin),
      a: isNaN(a) ? 1 : Math.max(0, Math.min(1, a)),
    };
  } catch {
    return null;
  }
}

/**
 * Pure JS OKLAB to RGB/RGBA parser and converter.
 * Converts oklab(L a b [/ A]) or oklab(L, a, b, A) into rgb(r, g, b) or rgba(r, g, b, a).
 */
function parseOklabValues(match: string): { r: number; g: number; b: number; a: number } | null {
  try {
    const inner = match.replace(/^oklab\(\s*/i, '').replace(/\s*\)$/, '').trim();
    let parts: string[];
    let alphaStr: string | null = null;

    if (inner.includes('/')) {
      const slashParts = inner.split('/');
      alphaStr = slashParts[1].trim();
      parts = slashParts[0].trim().split(/[\s,]+/);
    } else {
      parts = inner.split(/[\s,]+/);
    }

    if (parts.length < 3) return null;

    let l = parseFloat(parts[0]);
    if (parts[0].endsWith('%')) l = l / 100;

    let aLab = parseFloat(parts[1]);
    if (parts[1].endsWith('%')) aLab = aLab / 100;

    let bLab = parseFloat(parts[2]);
    if (parts[2].endsWith('%')) bLab = bLab / 100;

    let a = 1;
    if (alphaStr) {
      a = parseFloat(alphaStr);
      if (alphaStr.endsWith('%')) a = a / 100;
    } else if (parts.length >= 4) {
      a = parseFloat(parts[3]);
      if (parts[3].endsWith('%')) a = a / 100;
    }

    if (isNaN(l) || isNaN(aLab) || isNaN(bLab)) return null;

    const l_ = l + 0.3963377774 * aLab + 0.2158037573 * bLab;
    const m_ = l - 0.1055613458 * aLab - 0.0638541728 * bLab;
    const s_ = l - 0.0894841775 * aLab - 1.2914855480 * bLab;

    const l3 = l_ * l_ * l_;
    const m3 = m_ * m_ * m_;
    const s3 = s_ * s_ * s_;

    const rLin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

    const toSrgb = (val: number) => {
      const clamped = Math.max(0, Math.min(1, val));
      const srgb = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
      return Math.round(Math.max(0, Math.min(255, srgb * 255)));
    };

    return {
      r: toSrgb(rLin),
      g: toSrgb(gLin),
      b: toSrgb(bLin),
      a: isNaN(a) ? 1 : Math.max(0, Math.min(1, a)),
    };
  } catch {
    return null;
  }
}

export function replaceOklchInString(str: string): string {
  if (!str) return str;
  let res = str;
  if (res.includes('oklch')) {
    res = res.replace(/oklch\([^)]+\)/gi, (match) => {
      const parsed = parseOklchValues(match);
      if (!parsed) return 'rgb(30, 41, 59)';
      if (parsed.a < 1) {
        return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${parsed.a.toFixed(2)})`;
      }
      return `rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`;
    });
  }
  if (res.includes('oklab')) {
    res = res.replace(/oklab\([^)]+\)/gi, (match) => {
      const parsed = parseOklabValues(match);
      if (!parsed) return 'rgb(30, 41, 59)';
      if (parsed.a < 1) {
        return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${parsed.a.toFixed(2)})`;
      }
      return `rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`;
    });
  }
  return res;
}

/**
 * Sanitizes all style tags, inline styles, and computed color properties in a document to remove oklch & oklab calls
 */
function sanitizeDocumentColors(doc: Document) {
  try {
    // 1. Sanitize all <style> tag contents
    const styleTags = doc.querySelectorAll('style');
    styleTags.forEach((styleEl) => {
      if (styleEl.textContent && (styleEl.textContent.includes('oklch') || styleEl.textContent.includes('oklab'))) {
        styleEl.textContent = replaceOklchInString(styleEl.textContent);
      }
    });

    // 2. Sanitize all elements with inline style containing oklch or oklab
    const elementsWithInlineStyle = doc.querySelectorAll('[style*="oklch"], [style*="oklab"]');
    elementsWithInlineStyle.forEach((el) => {
      const currentStyle = el.getAttribute('style');
      if (currentStyle) {
        el.setAttribute('style', replaceOklchInString(currentStyle));
      }
    });

    // 3. Convert computed color styles to inline RGB styles on all elements
    const allEls = doc.querySelectorAll('*');
    const colorProps = ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke', 'outlineColor'];
    allEls.forEach((el) => {
      if (!(el instanceof HTMLElement || el instanceof SVGElement)) return;
      try {
        const computed = window.getComputedStyle(el);
        colorProps.forEach((prop) => {
          const val = (computed as unknown as Record<string, unknown>)[prop];
          if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
            const rgbVal = replaceOklchInString(val);
            (el.style as unknown as Record<string, string>)[prop] = rgbVal;
          }
        });
      } catch {
        // Ignore un-gettable computed styles
      }
    });
  } catch (err) {
    console.warn('Error sanitizing document oklch/oklab colors:', err);
  }
}

/**
 * High quality client-side PDF export with standard margins compliant for DAB
 * Features intelligent multi-page slicing so tall documents (Meeting Minutes, Articles, Forms)
 * never break or get clipped/distorted across pages.
 */
/**
 * High quality client-side PDF export with standard margins compliant for DAB
 * Features intelligent multi-page slicing so tall documents (Meeting Minutes, Articles, Forms)
 * never break or get clipped/distorted across pages.
 */
export async function exportElementToPdf({
  elementId,
  filename = 'چارت_سازمانی_شرکت_برکت_الله_غفوری_د_افغانستان_بانک.pdf',
  paperSize = 'a4',
  orientation = 'portrait',
  marginMm = 10,
  qualityScale = 2.5,
}: PdfExportOptions): Promise<boolean> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with id "${elementId}" not found for PDF export.`);
      return false;
    }

    // Sanitize oklch colors in current document before html2canvas runs
    sanitizeDocumentColors(document);

    // Force background color and high scale for crisp text and graphics
    const canvas = await html2canvas(element, {
      scale: qualityScale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: Math.max(element.scrollWidth, 1200),
      onclone: (clonedDoc) => {
        sanitizeDocumentColors(clonedDoc);
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.padding = '24px';
          clonedElement.style.backgroundColor = '#ffffff';
          clonedElement.style.color = '#0f172a';
          clonedElement.style.boxShadow = 'none';
          clonedElement.style.borderRadius = '0px';
        }
      },
    });

    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: paperSize,
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Standard DAB margins
    const printableWidth = pdfWidth - marginMm * 2;
    const printableHeight = pdfHeight - marginMm * 2;

    // Convert canvas px to mm (1 px ≈ 0.264583 mm)
    const imgWidthMm = (canvas.width * 0.264583) / qualityScale;
    const imgHeightMm = (canvas.height * 0.264583) / qualityScale;

    // Scale to fit page width
    const widthScale = printableWidth / imgWidthMm;
    const scaledCanvasHeightMm = imgHeightMm * widthScale;
    const scaledCanvasWidthMm = printableWidth;

    // If height fits on a single page or slightly over (with 10% tolerance), fit to 1 page
    if (scaledCanvasHeightMm <= printableHeight * 1.12) {
      const heightScale = printableHeight / imgHeightMm;
      const singlePageScale = Math.min(widthScale, heightScale, 1.0);
      const finalWidthMm = imgWidthMm * singlePageScale;
      const finalHeightMm = imgHeightMm * singlePageScale;

      const xPos = marginMm + (printableWidth - finalWidthMm) / 2;
      const yPos = marginMm + (printableHeight - finalHeightMm) / 2;

      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', xPos, yPos, finalWidthMm, finalHeightMm, undefined, 'FAST');
    } else {
      // Multi-page document export (e.g. detailed minutes, articles, multi-section forms)
      // Slice canvas vertically page by page without distortion or text overlaps
      const pageHeightPx = Math.floor((printableHeight / (0.264583 * widthScale)) * qualityScale);
      let renderedHeightPx = 0;
      let pageIndex = 0;

      while (renderedHeightPx < canvas.height) {
        const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedHeightPx);
        
        // Create an offscreen canvas for each clean page slice
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeightPx;
        const ctx = pageCanvas.getContext('2d');

        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            renderedHeightPx,
            canvas.width,
            sliceHeightPx,
            0,
            0,
            canvas.width,
            sliceHeightPx
          );

          const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
          const sliceHeightMm = (sliceHeightPx * 0.264583 * widthScale) / qualityScale;

          if (pageIndex > 0) {
            pdf.addPage(paperSize, orientation);
          }

          const xPos = marginMm;
          const yPos = marginMm;

          pdf.addImage(pageImgData, 'PNG', xPos, yPos, scaledCanvasWidthMm, sliceHeightMm, undefined, 'FAST');
        }

        renderedHeightPx += sliceHeightPx;
        pageIndex++;
      }
    }

    pdf.save(filename);
    return true;
  } catch (err) {
    console.error('Failed to export PDF:', err);
    return false;
  }
}

export interface ImageExportOptions {
  elementId: string;
  filename?: string;
  qualityScale?: number;
  backgroundColor?: string;
}

export async function exportElementToPng({
  elementId,
  filename = 'chart.png',
  qualityScale = 3.0,
  backgroundColor = '#ffffff',
}: ImageExportOptions): Promise<boolean> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with id "${elementId}" not found for PNG export.`);
      return false;
    }

    sanitizeDocumentColors(document);

    const canvas = await html2canvas(element, {
      scale: qualityScale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: backgroundColor,
      logging: false,
      windowWidth: Math.max(element.scrollWidth, 1200),
      onclone: (clonedDoc) => {
        sanitizeDocumentColors(clonedDoc);
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.padding = '24px';
          clonedElement.style.backgroundColor = backgroundColor;
          clonedElement.style.color = '#0f172a';
          clonedElement.style.boxShadow = 'none';
          clonedElement.style.borderRadius = '0px';
        }
      },
    });

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.error('Failed to export PNG:', err);
    return false;
  }
}

export interface BatchDocumentItem {
  id: string;
  elementId: string;
  title: string;
  category?: string;
  orientation?: 'landscape' | 'portrait';
}

export interface BatchPdfExportOptions {
  documents: BatchDocumentItem[];
  filename?: string;
  paperSize?: 'a4' | 'a3';
  defaultOrientation?: 'portrait' | 'landscape';
  marginMm?: number;
  qualityScale?: number;
  includeCoverPage?: boolean;
  companyName?: string;
  licenseNumber?: string;
  includePageNumbers?: boolean;
  coverPageElementId?: string;
  onProgress?: (current: number, total: number, docTitle: string) => void;
}

/**
 * Batch PDF export: captures multiple documents and merges them into a single high-quality PDF.
 * Supports multi-page slicing per document, cover page generation, and global page numbering.
 */
export async function exportBatchToPdf({
  documents,
  filename = 'پکیج_کامل_اسناد_شرکت_صرافی.pdf',
  paperSize = 'a4',
  defaultOrientation = 'portrait',
  marginMm = 10,
  qualityScale = 2.2,
  includeCoverPage = true,
  coverPageElementId = 'batch-cover-page-canvas',
  includePageNumbers = true,
  onProgress,
}: BatchPdfExportOptions): Promise<boolean> {
  try {
    if (!documents || documents.length === 0) {
      console.error('No documents selected for batch export');
      return false;
    }

    // Sanitize oklch colors across the entire document
    sanitizeDocumentColors(document);

    // Filter documents to process (optionally prepend cover page)
    const docsToProcess: { elementId: string; title: string; orientation: 'portrait' | 'landscape' }[] = [];

    if (includeCoverPage && coverPageElementId && document.getElementById(coverPageElementId)) {
      docsToProcess.push({
        elementId: coverPageElementId,
        title: 'صفحه سربرگ و فهرست رسمی اسناد',
        orientation: defaultOrientation,
      });
    }

    documents.forEach((d) => {
      docsToProcess.push({
        elementId: d.elementId,
        title: d.title,
        orientation: d.orientation || defaultOrientation,
      });
    });

    const totalDocs = docsToProcess.length;
    let pdf: jsPDF | null = null;
    let isFirstPage = true;

    for (let i = 0; i < totalDocs; i++) {
      const docItem = docsToProcess[i];
      if (onProgress) {
        onProgress(i + 1, totalDocs, docItem.title);
      }

      // Small pause to allow UI update & DOM stabilization
      await new Promise((resolve) => setTimeout(resolve, 80));

      const stagingArea = document.getElementById('batch-export-staging-area');
      let element: HTMLElement | null = null;

      if (stagingArea) {
        element = stagingArea.querySelector('#' + docItem.elementId) as HTMLElement | null;
        if (!element) {
          element = stagingArea.querySelector(`[data-batch-doc="${docItem.elementId}"]`) as HTMLElement | null;
        }
      }

      if (!element) {
        element = document.getElementById(docItem.elementId);
      }

      if (!element) {
        console.warn(`Element for "${docItem.title}" (${docItem.elementId}) not found, skipping.`);
        continue;
      }

      // Capture element to canvas
      const canvas = await html2canvas(element, {
        scale: qualityScale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: Math.max(element.scrollWidth, 1150),
        onclone: (clonedDoc) => {
          sanitizeDocumentColors(clonedDoc);
          const clonedEl = clonedDoc.getElementById(docItem.elementId) || clonedDoc.querySelector(`[data-batch-doc="${docItem.elementId}"]`);
          if (clonedEl instanceof HTMLElement) {
            clonedEl.style.padding = '24px';
            clonedEl.style.backgroundColor = '#ffffff';
            clonedEl.style.color = '#0f172a';
            clonedEl.style.boxShadow = 'none';
            clonedEl.style.borderRadius = '0px';
          }
        },
      });

      const docOrientation = docItem.orientation;

      if (!pdf) {
        pdf = new jsPDF({
          orientation: docOrientation,
          unit: 'mm',
          format: paperSize,
          compress: true,
        });
      } else {
        if (!isFirstPage) {
          pdf.addPage(paperSize, docOrientation);
        }
      }
      isFirstPage = false;

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const printableWidth = pdfWidth - marginMm * 2;
      const printableHeight = pdfHeight - marginMm * 2;

      const imgWidthMm = (canvas.width * 0.264583) / qualityScale;
      const imgHeightMm = (canvas.height * 0.264583) / qualityScale;

      const widthScale = printableWidth / imgWidthMm;
      const scaledCanvasHeightMm = imgHeightMm * widthScale;
      const scaledCanvasWidthMm = printableWidth;

      if (scaledCanvasHeightMm <= printableHeight * 1.12) {
        const heightScale = printableHeight / imgHeightMm;
        const singlePageScale = Math.min(widthScale, heightScale, 1.0);
        const finalWidthMm = imgWidthMm * singlePageScale;
        const finalHeightMm = imgHeightMm * singlePageScale;

        const xPos = marginMm + (printableWidth - finalWidthMm) / 2;
        const yPos = marginMm + (printableHeight - finalHeightMm) / 2;

        const imgData = canvas.toDataURL('image/png', 0.95);
        pdf.addImage(imgData, 'PNG', xPos, yPos, finalWidthMm, finalHeightMm, undefined, 'FAST');
      } else {
        // Multi-page slicing for tall document
        const pageHeightPx = Math.floor((printableHeight / (0.264583 * widthScale)) * qualityScale);
        let renderedHeightPx = 0;
        let pageSliceIdx = 0;

        while (renderedHeightPx < canvas.height) {
          const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedHeightPx);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeightPx;
          const ctx = pageCanvas.getContext('2d');

          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(
              canvas,
              0,
              renderedHeightPx,
              canvas.width,
              sliceHeightPx,
              0,
              0,
              canvas.width,
              sliceHeightPx
            );

            const pageImgData = pageCanvas.toDataURL('image/png', 0.95);
            const sliceHeightMm = (sliceHeightPx * 0.264583 * widthScale) / qualityScale;

            if (pageSliceIdx > 0) {
              pdf.addPage(paperSize, docOrientation);
            }

            pdf.addImage(pageImgData, 'PNG', marginMm, marginMm, scaledCanvasWidthMm, sliceHeightMm, undefined, 'FAST');
          }

          renderedHeightPx += sliceHeightPx;
          pageSliceIdx++;
        }
      }
    }

    if (!pdf) {
      console.error('PDF instance was not created.');
      return false;
    }

    // Add global page numbering if enabled
    if (includePageNumbers) {
      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        const pWidth = pdf.internal.pageSize.getWidth();
        const pHeight = pdf.internal.pageSize.getHeight();
        
        // Skip numbering cover page if total pages > 1
        if (includeCoverPage && p === 1 && totalPages > 1) {
          continue;
        }

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(140, 150, 165);
        pdf.text(
          `DAB Compliance Package • Page ${p} of ${totalPages}`,
          pWidth / 2,
          pHeight - 4,
          { align: 'center' }
        );
      }
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    return true;
  } catch (err) {
    console.error('Failed to export batch PDF:', err);
    return false;
  }
}



