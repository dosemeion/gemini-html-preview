let htmlContent = '';

async function loadContent() {
  const params = new URLSearchParams(location.search);
  const key = params.get('key');

  if (key) {
    try {
      const result = await chrome.storage.local.get(key);
      if (result[key]) {
        htmlContent = result[key];
        await chrome.storage.local.remove(key);
        render();
        return;
      }
    } catch (e) {
      console.error('[GHP preview] storage.get error:', e);
    }
  }

  // 兜底：URL 参数
  const raw = params.get('html');
  if (raw) {
    htmlContent = decodeURIComponent(raw);
    render();
    return;
  }

  document.getElementById('preview-frame').style.display = 'none';
  document.getElementById('error-panel').style.display = 'flex';
}

function preRenderMath(html) {
  if (typeof renderMathInElement === 'undefined') return html;
  if (!/\$|\\[\(\[]|\\begin\{|<math[\s>]/i.test(html)) return html;

  // 在扩展页面侧用 KaTeX 预渲染，再注入 KaTeX CSS 供 iframe 使用
  const div = document.createElement('div');
  div.innerHTML = html;
  renderMathInElement(div, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$',  right: '$',  display: false },
      { left: '\\(', right: '\\)', display: false },
      { left: '\\[', right: '\\]', display: true }
    ],
    throwOnError: false
  });

  const rendered = div.innerHTML;
  const css = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">';
  return rendered.includes('</head>')
    ? rendered.replace('</head>', css + '</head>')
    : css + rendered;
}

function injectScrollFix(html) {
  // Fix: sections with opacity:0 + IntersectionObserver never trigger in iframe previews.
  // CSS override is reliable regardless of JS execution order.
  const cssOverride = `<style>
section { opacity: 1 !important; transform: none !important; }
</style>`;

  // Patch the IntersectionObserver to immediately mark entries as visible,
  // so the page's own JS also works correctly without needing user scroll.
  const jsOverride = `<script>
(function() {
  var _NativeIO = window.IntersectionObserver;
  window.IntersectionObserver = function(callback, options) {
    var io = new _NativeIO(callback, options);
    var _observe = io.observe.bind(io);
    io.observe = function(target) {
      _observe(target);
      // Immediately fire callback with isIntersecting=true
      setTimeout(function() {
        callback([{ isIntersecting: true, target: target, intersectionRatio: 1 }], io);
      }, 0);
    };
    return io;
  };
  window.IntersectionObserver.prototype = _NativeIO.prototype;
})();
<\/script>`;

  // Inject CSS into <head> and JS shim before any other scripts
  let result = html;
  result = result.includes('</head>')
    ? result.replace('</head>', cssOverride + '\n</head>')
    : cssOverride + result;
  result = result.includes('<head>')
    ? result.replace('<head>', '<head>\n' + jsOverride)
    : jsOverride + result;
  return result;
}

function injectArxivFallback(html) {
  const snippet = `<script>
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

  return html.includes('</head>')
    ? html.replace('</head>', snippet + '</head>')
    : snippet + html;
}

function render() {
  const frame = document.getElementById('preview-frame');
  let processed = injectArxivFallback(htmlContent);
  processed = injectScrollFix(processed);
  processed = preRenderMath(processed);
  const blob = new Blob([processed], { type: 'text/html' });
  frame.src = URL.createObjectURL(blob);

  const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    document.title = titleMatch[1] + ' - 预览';
  }
}

document.querySelectorAll('.size-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const frame = document.getElementById('preview-frame');
    frame.className = '';
    const device = btn.dataset.device;
    if (device !== 'desktop') {
      frame.classList.add('device-' + device);
    }
  });
});

document.getElementById('btn-download').addEventListener('click', () => {
  if (!htmlContent) return;
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gemini-preview.html';
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('btn-copy').addEventListener('click', async () => {
  if (!htmlContent) return;
  await navigator.clipboard.writeText(htmlContent);
  const btn = document.getElementById('btn-copy');
  const orig = btn.textContent;
  btn.textContent = '已复制！';
  setTimeout(() => { btn.textContent = orig; }, 1500);
});

document.getElementById('btn-source').addEventListener('click', () => {
  document.getElementById('source-content').textContent = htmlContent;
  document.getElementById('source-modal').classList.add('open');
});

document.getElementById('close-modal').addEventListener('click', () => {
  document.getElementById('source-modal').classList.remove('open');
});

document.getElementById('source-modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('source-modal')) {
    document.getElementById('source-modal').classList.remove('open');
  }
});

loadContent();
