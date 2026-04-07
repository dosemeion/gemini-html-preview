// Gemini HTML Preview - Content Script

const PROCESSED_ATTR = 'data-html-preview-processed';

// 检查 code-block-decoration 的语言标签是否为 HTML
function isHtmlDecoration(decorationEl) {
  const span = decorationEl.querySelector('span');
  if (!span) return false;
  const lang = span.textContent.trim().toLowerCase();
  return lang === 'html';
}

// 在工具栏 .buttons 里注入预览按钮
function injectButton(decorationEl) {
  console.log('[GHP] injectButton called on:', decorationEl.className);

  if (decorationEl.hasAttribute(PROCESSED_ATTR)) {
    console.log('[GHP] already processed, skip');
    return;
  }

  if (!isHtmlDecoration(decorationEl)) {
    const span = decorationEl.querySelector('span');
    console.log('[GHP] skip (not html):', span ? span.textContent.trim() : 'no span', decorationEl.className);
    return;
  }

  console.log('[GHP] is HTML decoration, proceeding...');

  // 找到同一 code-block 容器下的代码内容
  // 注意：不能用 decorationEl.closest() —— decoration 自身含 "code-block" 会匹配到自己
  const codeBlock = decorationEl.parentElement?.closest('[class*="code-block"]') ||
                    decorationEl.parentElement;
  const codeEl = codeBlock.querySelector('[data-test-id="code-content"]') ||
                 codeBlock.querySelector('code') ||
                 codeBlock.querySelector('pre');
  if (!codeEl) {
    console.log('[GHP] no code element found in block, codeBlock:', codeBlock?.className);
    return;
  }

  console.log('[GHP] found code element');

  const buttonsDiv = decorationEl.querySelector('.buttons');
  if (!buttonsDiv) {
    console.log('[GHP] .buttons not found yet, will retry');
    return;  // .buttons 还未渲染，等下次 MutationObserver 触发时重试
  }

  console.log('[GHP] found .buttons, injecting preview button...');

  // 只有找到挂载点才标记已处理，避免提前锁住导致无法重试
  decorationEl.setAttribute(PROCESSED_ATTR, '1');

  const btn = document.createElement('button');
  btn.className = 'gemini-html-preview-btn mdc-icon-button mat-mdc-icon-button mat-mdc-button-base';
  btn.setAttribute('aria-label', '预览 HTML');
  btn.setAttribute('title', '在新标签页预览 HTML');
  btn.innerHTML = `<span style="font-size:13px;font-weight:500;padding:0 4px;color:inherit">预览</span>`;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Read at click time so we get fully-streamed content, not a stale empty capture
    const html = codeEl.textContent;
    console.log('[GHP] click: codeEl tag=', codeEl.tagName, 'data-test-id=', codeEl.getAttribute('data-test-id'), 'len=', html.length, 'preview=', html.slice(0, 80));
    openPreview(html);
  });

  buttonsDiv.appendChild(btn);
}

function openPreview(htmlContent) {
  try {
    chrome.runtime.sendMessage({ type: 'openPreview', html: htmlContent });
  } catch (e) {
    alert('扩展已更新，请刷新页面后重试。');
  }
}

function isContextValid() {
  try { return !!chrome.runtime?.id; } catch (e) { return false; }
}

function scan() {
  if (!isContextValid()) {
    observer.disconnect();
    clearInterval(scanInterval);
    return;
  }
  document.querySelectorAll('.code-block-decoration').forEach(el => injectButton(el));
}

function debugDom() {
  const log = (label, els) => {
    if (els.length === 0) return;
    console.log('[GHP]', label, els.length);
    els.forEach((el, i) => console.log('[GHP]  [' + i + ']', el.tagName, JSON.stringify(el.className).slice(0, 120)));
  };

  log('code elements:', document.querySelectorAll('code'));
  log('pre elements:', document.querySelectorAll('pre'));
  log('[class*=code]:', document.querySelectorAll('[class*="code"]'));
  log('[class*=decor]:', document.querySelectorAll('[class*="decor"]'));
  log('[class*=toolbar]:', document.querySelectorAll('[class*="toolbar"]'));
  log('[class*=button]:', document.querySelectorAll('[class*="button"]'));
  log('[class*=lang]:', document.querySelectorAll('[class*="lang"]'));
  log('[class*=syntax]:', document.querySelectorAll('[class*="syntax"]'));
  log('[class*=highlight]:', document.querySelectorAll('[class*="highlight"]'));

  // broader: any element whose class contains common code-block keywords
  log('[class*=block]:', document.querySelectorAll('[class*="block"]'));
  log('[class*=snippet]:', document.querySelectorAll('[class*="snippet"]'));
  log('[class*=source]:', document.querySelectorAll('[class*="source"]'));
  log('[class*=copy]:', document.querySelectorAll('[class*="copy"]'));
  log('[class*=header]:', document.querySelectorAll('[class*="header"]'));
}

// expose for manual call: window.__ghpDebug() in console
window.__ghpDebug = debugDom;

const observer = new MutationObserver(() => {
  try {
    clearTimeout(observer._timer);
    observer._timer = setTimeout(scan, 500);
  } catch (e) { /* context invalidated */ }
});

try {
  observer.observe(document.body, { childList: true, subtree: true });
  scan();
} catch (e) { /* context invalidated */ }

const scanInterval = setInterval(() => { try { scan(); } catch (e) { clearInterval(scanInterval); } }, 2000);
