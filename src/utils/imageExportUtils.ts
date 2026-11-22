import html2canvas from 'html2canvas';

/**
 * Copies a DOM element as a high-resolution PNG image directly to the clipboard.
 * When pasted in Microsoft Word, PowerPoint, Excel, or Email with Ctrl+V,
 * it renders as a crisp, pixel-perfect visual that preserves exact styling.
 * 
 * @param elementId The ID of the HTML element to capture, or the HTMLElement itself
 * @param options Optional configuration
 * @returns Promise<boolean> true if copied successfully
 */
export async function copyElementAsImage(
  target: string | HTMLElement,
  options?: {
    scale?: number;
    backgroundColor?: string;
    padding?: number;
  }
): Promise<boolean> {
  const el = typeof target === 'string' ? document.getElementById(target) : target;
  if (!el) {
    console.error('copyElementAsImage: Target element not found:', target);
    return false;
  }

  const scale = options?.scale || 2.5; // High-resolution capture (2.5x retina)
  const backgroundColor = options?.backgroundColor || '#ffffff';

  try {
    // Render the element to a canvas
    const canvas = await html2canvas(el, {
      scale,
      backgroundColor,
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
      onclone: (clonedDoc: any, clonedEl: any) => {
        // Ensure cloned element is visible and expanded to its full scroll width
        clonedEl.style.overflow = 'visible';
        clonedEl.style.maxHeight = 'none';
        clonedEl.style.maxWidth = 'none';
        clonedEl.style.width = `${el.scrollWidth}px`;

        // Make all table containers overflow visible in clone
        const tables = clonedEl.querySelectorAll('table, .overflow-x-auto');
        tables.forEach((t: any) => {
          (t as HTMLElement).style.overflow = 'visible';
          (t as HTMLElement).style.maxWidth = 'none';
        });
      },
    } as any);

    // Convert canvas to Blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png', 1.0);
    });

    if (!blob) {
      console.error('Failed to convert canvas to blob');
      return false;
    }

    // Write to clipboard
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);
      return true;
    } else {
      // Fallback: copy as data URL or prompt download
      const dataUrl = canvas.toDataURL('image/png');
      const win = window.open();
      if (win) {
        win.document.write(`<img src="${dataUrl}" style="max-width:100%;" />`);
      }
      return true;
    }
  } catch (err) {
    console.error('Error copying element as image:', err);
    return false;
  }
}
