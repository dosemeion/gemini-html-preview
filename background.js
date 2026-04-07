// Gemini HTML Preview - Background Service Worker

// key -> html: serve pending previews via fetch interception
const pendingHtml = new Map();

// Intercept fetch requests for preview-download/* URLs
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith('/preview-download/')) return;

  const key = url.pathname.replace('/preview-download/', '');
  const html = pendingHtml.get(key);
  if (!html) return;

  pendingHtml.delete(key);
  event.respondWith(new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  }));
});

function injectFixes(html) {
  const fixesCssUrl   = chrome.runtime.getURL('fixes.css');
  const ioShimUrl     = chrome.runtime.getURL('io-shim.js');
  const katexCssUrl   = chrome.runtime.getURL('katex.min.css');
  const katexJsUrl    = chrome.runtime.getURL('katex.min.js');
  const autoRenderUrl = chrome.runtime.getURL('auto-render.min.js');
  const katexInitUrl  = chrome.runtime.getURL('katex-init.js');

  // Remove page's own CSP meta tags so our injected resources aren't blocked
  let result = html.replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');

  // Inject into <head>: section fix CSS + IO shim (must run before page scripts)
  const headInject = `<link rel="stylesheet" href="${fixesCssUrl}">\n<script src="${ioShimUrl}"><\/script>`;
  result = result.includes('<head>')
    ? result.replace('<head>', '<head>\n' + headInject)
    : headInject + result;

  // Inject KaTeX at end of </body> — scripts run after DOM is fully parsed
  const katexBlock = `<link rel="stylesheet" href="${katexCssUrl}">\n<script src="${katexJsUrl}"><\/script>\n<script src="${autoRenderUrl}"><\/script>\n<script src="${katexInitUrl}"><\/script>`;
  result = result.includes('</body>')
    ? result.replace('</body>', katexBlock + '\n</body>')
    : result + '\n' + katexBlock;

  return result;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'openPreview') return;

  const processed = injectFixes(msg.html);
  const key = Date.now().toString();
  pendingHtml.set(key, processed);

  const previewUrl = chrome.runtime.getURL(`preview-download/${key}`);
  chrome.tabs.create({ url: previewUrl });

  return true;
});
