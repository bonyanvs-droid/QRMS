import { jsPDF } from 'jspdf';
import { toCanvas } from 'html-to-image';

export type PdfOrientation = 'portrait' | 'landscape' | 'auto';

export interface PdfExportOptions {
  fileName?: string;
  orientation?: PdfOrientation;
  marginMm?: number;
  quality?: number;
}

/**
 * Creates an isolated, fixed-width desktop sandbox off-screen to render
 * pixel-perfect A4 documents regardless of the user's physical screen or device size.
 */
function createIsolatedRenderSandbox(
  sourceElement: HTMLElement,
  targetWidthPx: number
): { container: HTMLDivElement; clonedElement: HTMLElement; cleanup: () => void } {
  const container = document.createElement('div');
  container.setAttribute('aria-hidden', 'true');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = `${targetWidthPx}px`;
  container.style.maxWidth = `${targetWidthPx}px`;
  container.style.minWidth = `${targetWidthPx}px`;
  container.style.backgroundColor = '#ffffff';
  container.style.zIndex = '-9999';
  container.style.overflow = 'visible';
  container.style.opacity = '1';
  container.style.pointerEvents = 'none';

  const clonedElement = sourceElement.cloneNode(true) as HTMLElement;
  clonedElement.style.width = '100%';
  clonedElement.style.maxWidth = '100%';
  clonedElement.style.minWidth = '100%';
  clonedElement.style.margin = '0';
  clonedElement.style.overflow = 'visible';
  clonedElement.style.maxHeight = 'none';

  container.appendChild(clonedElement);
  document.body.appendChild(container);

  return {
    container,
    clonedElement,
    cleanup: () => {
      try {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      } catch (e) {
        console.warn('Error removing render sandbox:', e);
      }
    },
  };
}

/**
 * Determines the ideal orientation based on content dimensions and user preference.
 */
export function resolveEffectiveOrientation(
  element: HTMLElement,
  preferredOrientation: PdfOrientation = 'auto'
): 'portrait' | 'landscape' {
  if (preferredOrientation === 'portrait') return 'portrait';
  if (preferredOrientation === 'landscape') return 'landscape';

  // Smart detection: if table has 8+ wide columns or scrollWidth > 1150, use landscape
  const table = element.querySelector('table');
  const columnCount = table ? table.querySelectorAll('th, td:first-child').length : 0;
  if (columnCount >= 9 || element.scrollWidth > 1200) {
    return 'landscape';
  }
  return 'portrait';
}

/**
 * Converts an HTML element into a professional, device-independent A4 PDF.
 * Uses html-to-image with SVG foreignObject rendering to bypass CSS color limitations
 * (such as Tailwind v4's oklch), and produces identical crisp A4 documents on mobile & desktop.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  options?: PdfExportOptions
): Promise<void> {
  const fileName = options?.fileName || 'التقرير_الرسمي_المعتمد.pdf';
  const effectiveOrientation = resolveEffectiveOrientation(element, options?.orientation || 'auto');
  const isLandscape = effectiveOrientation === 'landscape';

  // A4 dimensions in millimeters
  const pdfWidthMm = isLandscape ? 297 : 210;
  const pdfHeightMm = isLandscape ? 210 : 297;
  const marginMm = options?.marginMm ?? 8;
  const printableWidthMm = pdfWidthMm - marginMm * 2;
  const printableHeightMm = pdfHeightMm - marginMm * 2;

  // Fixed standard desktop width for rendering canvas
  const standardRenderWidthPx = isLandscape ? 1440 : 1050;

  // Render in isolated sandbox for 100% device independence (same on mobile & desktop)
  const { container, clonedElement, cleanup } = createIsolatedRenderSandbox(
    element,
    standardRenderWidthPx
  );

  let canvas: HTMLCanvasElement;
  try {
    // Wait for any nested images or fonts to stabilize
    const images = Array.from(clonedElement.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
            } else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          })
      )
    );

    const fullHeightPx = Math.max(clonedElement.scrollHeight, clonedElement.offsetHeight, 600);

    canvas = await toCanvas(clonedElement, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      skipFonts: true,
      cacheBust: false,
      width: standardRenderWidthPx,
      height: fullHeightPx,
      style: {
        width: `${standardRenderWidthPx}px`,
        maxWidth: `${standardRenderWidthPx}px`,
        overflow: 'visible',
      },
    });
  } catch (err) {
    console.warn('Sandbox canvas rendering retry with fallback:', err);
    canvas = await toCanvas(clonedElement, {
      backgroundColor: '#ffffff',
      pixelRatio: 1.5,
      skipFonts: true,
      cacheBust: false,
    });
  } finally {
    cleanup();
  }

  // Calculate printable dimensions from canvas
  const canvasWidthPx = canvas.width;
  const canvasHeightPx = canvas.height;

  // Pixels per mm on the canvas
  const pxPerMm = canvasWidthPx / printableWidthMm;
  const pageHeightPx = Math.floor(printableHeightMm * pxPerMm);

  const pdf = new jsPDF({
    orientation: effectiveOrientation,
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const totalPages = Math.max(1, Math.ceil(canvasHeightPx / pageHeightPx));

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      pdf.addPage('a4', effectiveOrientation);
    }

    const sourceY = page * pageHeightPx;
    const sourceHeight = Math.min(pageHeightPx, canvasHeightPx - sourceY);

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvasWidthPx;
    pageCanvas.height = sourceHeight;
    const pageCtx = pageCanvas.getContext('2d');

    if (pageCtx) {
      pageCtx.fillStyle = '#ffffff';
      pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

      pageCtx.drawImage(
        canvas,
        0,
        sourceY,
        canvasWidthPx,
        sourceHeight,
        0,
        0,
        canvasWidthPx,
        sourceHeight
      );

      const sliceHeightMm = sourceHeight / pxPerMm;
      const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);

      pdf.addImage(
        imgData,
        'JPEG',
        marginMm,
        marginMm,
        printableWidthMm,
        sliceHeightMm,
        undefined,
        'FAST'
      );

      // Add page number footer in multi-page documents
      if (totalPages > 1) {
        pdf.setFontSize(8);
        pdf.setTextColor(130, 140, 150);
        const pageText = `صفحة ${page + 1} من ${totalPages}`;
        const footerY = pdfHeightMm - 3.5;
        pdf.text(pageText, pdfWidthMm / 2, footerY, { align: 'center' });
      }
    }
  }

  const finalFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  pdf.save(finalFileName);
}

/**
 * Triggers native browser printing using an isolated hidden iframe.
 * This guarantees 100% reliable printing across all devices, browsers, and iframe containers
 * without modifying parent DOM stylesheets or breaking modals.
 */
export async function printElementViaIframe(
  element: HTMLElement,
  options?: {
    title?: string;
    orientation?: 'portrait' | 'landscape';
  }
): Promise<void> {
  const documentTitle = options?.title || 'التقرير الرسمي المعتمد';
  const orientation = options?.orientation || 'portrait';

  return new Promise((resolve, reject) => {
    try {
      // Create hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.zIndex = '-9999';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        document.body.removeChild(iframe);
        throw new Error('Unable to access iframe document');
      }

      // Collect all active document stylesheets and font links
      const styleSheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map((node) => node.outerHTML)
        .join('\n');

      const printHtml = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
          <head>
            <meta charset="UTF-8">
            <title>${documentTitle}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
            ${styleSheets}
            <style>
              @page {
                size: A4 ${orientation};
                margin: 10mm 8mm 10mm 8mm;
              }
              *, *::before, *::after {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background-color: #ffffff !important;
                color: #0f172a !important;
                font-family: 'Cairo', system-ui, sans-serif !important;
                direction: rtl !important;
                width: 100% !important;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
                page-break-inside: auto !important;
              }
              thead {
                display: table-header-group !important;
                break-inside: avoid !important;
              }
              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .print\\:hidden {
                display: none !important;
              }
            </style>
          </head>
          <body class="p-4 bg-white text-slate-900 antialiased">
            ${element.outerHTML}
          </body>
        </html>
      `;

      doc.open();
      doc.write(printHtml);
      doc.close();

      // Ensure print is only invoked once (prevents double print dialog)
      let printTriggered = false;
      const performPrint = () => {
        if (printTriggered) return;
        printTriggered = true;
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            resolve();
          } catch (e) {
            reject(e);
          } finally {
            // Clean up iframe after a safe delay
            setTimeout(() => {
              try {
                if (iframe.parentNode) {
                  document.body.removeChild(iframe);
                }
              } catch {}
            }, 2000);
          }
        }, 350);
      };

      if (iframe.contentWindow) {
        iframe.contentWindow.onload = performPrint;
        // Fallback only if onload did not fire within safe timeout
        setTimeout(() => {
          if (!printTriggered) {
            performPrint();
          }
        }, 800);
      } else {
        performPrint();
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Attempts a reliable browser print command via hidden iframe,
 * with automated fallback to device-independent PDF export if blocked.
 */
export async function executePrintOrPdfFallback(
  element: HTMLElement,
  options?: {
    fileName?: string;
    orientation?: PdfOrientation;
    title?: string;
  }
): Promise<'print_invoked' | 'pdf_downloaded'> {
  const fileName = options?.fileName || 'التقرير_الرسمي_المعتمد.pdf';
  const effectiveOrientation = resolveEffectiveOrientation(element, options?.orientation || 'auto');

  try {
    await printElementViaIframe(element, {
      title: options?.title || 'التقرير الرسمي المعتمد',
      orientation: effectiveOrientation,
    });
    return 'print_invoked';
  } catch (err) {
    console.warn('Native print via iframe encountered issue, executing PDF export fallback:', err);
    await exportElementToPdf(element, {
      fileName,
      orientation: effectiveOrientation,
    });
    return 'pdf_downloaded';
  }
}
