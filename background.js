// Gemini HTML Preview - Background Service Worker

// tabId -> downloadId
const tabToDownload = new Map();

function injectFixes(html) {
  const cssOverride = `<style>
section { opacity: 1 !important; transform: none !important; }
</style>`;

  const jsOverride = `<script>
(function() {
  var _NativeIO = window.IntersectionObserver;
  if (!_NativeIO) return;
  window.IntersectionObserver = function(callback, options) {
    var io = new _NativeIO(callback, options);
    var _observe = io.observe.bind(io);
    io.observe = function(target) {
      _observe(target);
      setTimeout(function() {
        callback([{ isIntersecting: true, target: target, intersectionRatio: 1 }], io);
      }, 0);
    };
    return io;
  };
  window.IntersectionObserver.prototype = _NativeIO.prototype;
})();
<\/script>`;

  const arxivFallback = `<script>
(function() {
  function patchImg(img) {
    if (img._arxivPatched) return;
    img._arxivPatched = true;
    img.addEventListener('error', function() {
      var url = this.src;
      if (/arxiv\.org\/html\//.test(url)) {
        var next = url.replace(
          /https?:\/\/arxiv\.org\/html\/([^\/]+)\//,
          'https://ar5iv.labs.arxiv.org/html/$1/assets/'
        );
        if (next !== url) this.src = next;
      }
    }, { once: true });
  }
  new MutationObserver(function(ms) {
    ms.forEach(function(m) {
      m.addedNodes.forEach(function(n) {
        if (!n || n.nodeType !== 1) return;
        if (n.tagName === 'IMG') patchImg(n);
        else if (n.querySelectorAll) n.querySelectorAll('img').forEach(patchImg);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
<\/script>`;

  let result = html;
  result = result.includes('</head>')
    ? result.replace('</head>', cssOverride + '\n</head>')
    : cssOverride + result;
  result = result.includes('<head>')
    ? result.replace('<head>', '<head>\n' + jsOverride + '\n' + arxivFallback)
    : jsOverride + arxivFallback + result;
  return result;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'openPreview') return;

  const processed = injectFixes(msg.html);
  const blob = new Blob([processed], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);
  const filename = `gemini-preview/preview-${Date.now()}.html`;

  chrome.downloads.download({
    url: blobUrl,
    filename: filename,
    saveAs: false,
    conflictAction: 'uniquify'
  }, (downloadId) => {
    URL.revokeObjectURL(blobUrl);

    if (chrome.runtime.lastError || downloadId === undefined) {
      console.error('[GHP] download failed:', chrome.runtime.lastError?.message);
      return;
    }

    // Wait for download to complete, then open the file in a new tab
    function onDownloadChanged(delta) {
      if (delta.id !== downloadId) return;
      if (delta.state?.current !== 'complete') return;
      chrome.downloads.onChanged.removeListener(onDownloadChanged);

      chrome.downloads.search({ id: downloadId }, (items) => {
        if (!items?.[0]?.filename) return;
        const fileUrl = 'file:///' + items[0].filename.replace(/\\/g, '/');
        chrome.tabs.create({ url: fileUrl }, (tab) => {
          tabToDownload.set(tab.id, downloadId);
        });
      });
    }

    chrome.downloads.onChanged.addListener(onDownloadChanged);
  });

  return true;
});

// When the preview tab is closed, delete the temp file and erase download history
chrome.tabs.onRemoved.addListener((tabId) => {
  if (!tabToDownload.has(tabId)) return;
  const downloadId = tabToDownload.get(tabId);
  tabToDownload.delete(tabId);

  chrome.downloads.removeFile(downloadId, () => {
    if (chrome.runtime.lastError) {
      console.warn('[GHP] removeFile failed:', chrome.runtime.lastError.message);
    }
    chrome.downloads.erase({ id: downloadId });
  });
});
