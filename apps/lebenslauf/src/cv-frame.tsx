import { useWidth } from "@pocket-apps/core/use-width";
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { highlightCss, targetInPages, targetOf, type HighlightTarget } from "./highlight.ts";
import { A4, paginate, type PageSlice } from "./pages.ts";
import type { Language } from "./schema.ts";

/** The gray space around and between the pages in the preview, in mm. */
const PAGE_GAP = 6;

/** The width of an A4 page with the gray space at both sides, in CSS pixels (96 per inch). */
const PREVIEW_WIDTH = ((A4.width + 2 * PAGE_GAP) / 25.4) * 96;

/** On a wide screen, the sheet grows up to this zoom. Then the text stays easy to read. */
const MAX_ZOOM = 1.5;

/** The empty document of the frame. The doctype gives the standards mode. */
const EMPTY_DOCUMENT =
  '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>';

/**
 * The root element of a document. While Chrome loads the srcdoc, the new document can have no
 * root element for a moment. The type of `documentElement` does not show this.
 */
function rootOf(target: Document): HTMLElement | null {
  return target.querySelector("html");
}

/** Sets the title and the language of the CV document. */
function setDocumentInfo(target: Document, title: string, language: Language): void {
  const root = rootOf(target);
  if (!root) return;
  target.title = title;
  root.lang = language;
}

/**
 * Measures the blocks of the CV (`data-page-unit`) and splits the CV into pages.
 * `null` without a layout (a hidden frame, or jsdom).
 */
function measurePages(flow: HTMLElement, pageMargin: number): PageSlice[] | null {
  const sheet = flow.firstElementChild;
  if (!sheet) return null;
  const box = sheet.getBoundingClientRect();
  if (box.width === 0) return null;
  const pixelsPerMm = box.width / A4.width;
  const units = Array.from(flow.querySelectorAll("[data-page-unit]"), (element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: (rect.top - box.top) / pixelsPerMm,
      bottom: (rect.bottom - box.top) / pixelsPerMm,
      keepWithNext: element.getAttribute("data-page-unit") === "keep-with-next",
    };
  });
  return paginate(units, pageMargin, A4.height - 2 * pageMargin);
}

function samePages(a: readonly PageSlice[] | null, b: readonly PageSlice[] | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.length === b.length &&
    a.every((page, index) => page.start === b[index]?.start && page.height === b[index].height)
  );
}

function mm(value: number): string {
  return `${value.toFixed(3)}mm`;
}

/**
 * The CSS of the frame itself, not of the design: the zoom, and the pages of the preview.
 * Each page is a white A4 sheet. It shows a copy of the CV, moved up to the start of the page
 * and cut at the end of the page. The print ignores the sheets and prints the CV once.
 */
function frameCss(zoom: number, pages: readonly PageSlice[] | null, pageMargin: number): string {
  // The frame is as high as its content, so it never needs scroll bars.
  const base = `@media screen { :root { zoom: ${zoom.toFixed(4)}; overflow: hidden; } }`;
  if (pages === null) return base;
  const pageRules = pages
    .map((page, index) => {
      // Above the first page, there is no content to hide. There, the box starts at the top of
      // the sheet. Else it would cut what sticks out into the top margin, for example the
      // shadow of the photo.
      const top = index === 0 ? 0 : pageMargin;
      const sheet = `.cv-sheet[data-page="${String(index)}"]`;
      return (
        `${sheet} .cv-clip { top: ${mm(top)}; height: ${mm(page.height + pageMargin - top)}; }\n` +
        `${sheet} .cv-shift { margin-top: ${mm(pageMargin - top - page.start)}; }`
      );
    })
    .join("\n");
  return `${base}
@media screen {
  .cv-flow { position: absolute; top: 0; left: 0; width: 100%; opacity: 0; pointer-events: none; }
  .cv-sheet {
    position: relative; overflow: clip; width: ${String(A4.width)}mm; height: ${String(A4.height)}mm;
    margin: 0 auto ${String(PAGE_GAP)}mm; background: #fff; box-shadow: 0 0.3mm 1.5mm rgb(0 0 0 / 25%);
  }
  .cv-sheet:last-child { margin-bottom: 0; }
  /* The gray space at the top shows where the first page starts. */
  .cv-sheets { padding: ${String(PAGE_GAP)}mm; }
  /* "clip", not "hidden": the box must not scroll, also not by scrollIntoView(). */
  .cv-clip { position: absolute; right: 0; left: 0; overflow: clip; }
${pageRules}
}
@media print { .cv-sheets { display: none; } }`;
}

export type CvFrameProps = {
  /** The title of the document. Chrome uses it as the name of the PDF file. */
  title: string;
  language: Language;
  /** The CSS of the design. */
  css: string;
  /** The top and bottom margin of a page of the design, in mm. */
  pageMargin: number;
  /** The frame element. The parent keeps it, for example to print it. */
  frame: HTMLIFrameElement | null;
  /** A stable function, for example a state setter. React calls it with the frame element. */
  onFrame: (frame: HTMLIFrameElement | null) => void;
  /** The section or entry to highlight. */
  highlight: HighlightTarget | null;
  /** The frame calls it with the entry or section under the mouse, or with `null`. */
  onHover: (target: HighlightTarget | null) => void;
  children: ReactNode;
};

/**
 * Shows the CV in an iframe. The frame has its own document, so the CSS of the design and the
 * Tailwind CSS of the app do not touch each other. Printing the frame prints only the CV.
 * On screen, the frame scales the A4 pages to its width (up to 150 %). It shows the pages as
 * the print splits them: the CV once, invisible, for the measurement (and for screen readers),
 * and one sheet per page.
 */
export function CvFrame(props: CvFrameProps) {
  const { title, language, css, pageMargin, frame, onFrame, highlight, onHover, children } = props;
  const boxRef = useRef<HTMLDivElement>(null);
  const width = useWidth(boxRef);
  // Chrome loads the srcdoc after the start and then replaces the first, empty document.
  // jsdom does not load a srcdoc. There, the first document stays.
  const [loadedDocument, setLoadedDocument] = useState<Document | null>(null);
  const cvDocument = loadedDocument ?? frame?.contentDocument ?? null;
  // In Chrome, the first, empty document has no body yet.
  const body = cvDocument?.body ?? null;
  const [height, setHeight] = useState(0);
  const [flow, setFlow] = useState<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<PageSlice[] | null>(null);
  const zoom = width > 0 ? Math.min(MAX_ZOOM, width / PREVIEW_WIDTH) : 1;

  useEffect(() => {
    if (cvDocument) setDocumentInfo(cvDocument, title, language);
  }, [cvDocument, title, language]);

  // The frame is as high as its content. Then the page of the app scrolls, not the frame.
  // The observer must belong to the window of the frame: Chrome does not reliably report the
  // size of an element in another document. A frame that loads while it is hidden
  // (display: none) has no layout, and Chrome then reports nothing to an observer that started
  // at this time. Thus a new observer starts when the frame gets a width.
  // jsdom gives a frame window no ResizeObserver. There, the observer of the app window is used.
  const isShown = width > 0;
  useEffect(() => {
    const root = cvDocument && rootOf(cvDocument);
    if (!cvDocument || !root) return;
    function measure() {
      if (!root) return;
      setHeight(Math.ceil(root.getBoundingClientRect().height));
      if (!flow) return;
      const next = measurePages(flow, pageMargin);
      setPages((current) => (samePages(current, next) ? current : next));
    }
    const view = cvDocument.defaultView;
    const resizeObserver = new (view?.ResizeObserver ?? ResizeObserver)(measure);
    resizeObserver.observe(root);
    // A change of a text can move a page break without a change of the size.
    const mutationObserver = new (view?.MutationObserver ?? MutationObserver)(measure);
    if (flow) {
      resizeObserver.observe(flow);
      mutationObserver.observe(flow, { subtree: true, childList: true, characterData: true });
    }
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [cvDocument, isShown, flow, pageMargin]);

  const reportHover = useEffectEvent(onHover);

  // The entry or section under the mouse. With pages, the frame computes it (`targetInPages`).
  // Without pages (no layout, for example in jsdom), the CV itself takes the mouse events.
  useEffect(() => {
    const root = cvDocument && rootOf(cvDocument);
    const view = cvDocument?.defaultView;
    if (!cvDocument || !root || !view) return;
    function onMove(event: MouseEvent) {
      if (!cvDocument || !view) return;
      const { target } = event;
      if (flow && pages) {
        reportHover(targetInPages(cvDocument, flow, pages, event.clientX, event.clientY));
      } else {
        reportHover(target instanceof view.Element ? targetOf(target) : null);
      }
    }
    function onLeave() {
      reportHover(null);
    }
    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseleave", onLeave);
    return () => {
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", onLeave);
    };
  }, [cvDocument, flow, pages]);

  return (
    <div ref={boxRef} className="w-full overflow-hidden rounded-lg bg-muted ring-1 ring-border">
      <iframe
        ref={onFrame}
        title="Vorschau des Lebenslaufs"
        srcDoc={EMPTY_DOCUMENT}
        height={height}
        className="block w-full"
        onLoad={(event) => {
          setLoadedDocument(event.currentTarget.contentDocument);
        }}
      />
      {body &&
        createPortal(
          <>
            <style>{css}</style>
            <style>{frameCss(zoom, pages, pageMargin)}</style>
            <style>{highlightCss(highlight)}</style>
            <div ref={setFlow} className="cv-flow">
              {children}
            </div>
            {pages && (
              <div className="cv-sheets" inert>
                {pages.map((page, index) => (
                  <div key={page.start} className="cv-sheet" data-page={index}>
                    <div className="cv-clip">
                      <div className="cv-shift">{children}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>,
          body,
        )}
    </div>
  );
}
