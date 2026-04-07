# Gemini HTML Preview

A Chrome extension that adds a **预览** button to HTML code blocks on [Gemini](https://gemini.google.com) and [AI Studio](https://aistudio.google.com), opening the generated HTML instantly in a new tab — no copy-paste, no download dialogs.

## Features

- One-click preview of HTML code blocks
- Renders LaTeX math formulas via KaTeX (`$$...$$`, `$...$`, `\(...\)`, `\[...\]`)
- Fixes invisible sections caused by IntersectionObserver-based scroll animations
- Works on both Gemini and AI Studio

## How it works

The extension injects a 预览 button into every HTML code block toolbar. On click, the HTML is sent to the background service worker, which:

1. Injects fix scripts (IO shim, KaTeX) into the HTML
2. Stores the result in memory and opens a `chrome-extension://` URL
3. The service worker intercepts the fetch for that URL and serves the HTML directly

No files are written to disk. No download dialogs.

## Installation

1. Clone or download this repository
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the project folder

## File structure

```
background.js       # Service worker: fetch interception, HTML injection
content.js          # Injects preview button into Gemini/AI Studio pages
content.css         # Button styles
io-shim.js          # IntersectionObserver patch (fixes hidden sections)
fixes.css           # Forces sections visible regardless of scroll state
katex.min.js        # KaTeX math renderer
katex.min.css       # KaTeX styles
auto-render.min.js  # KaTeX auto-render (scans DOM for delimiters)
katex-init.js       # Calls renderMathInElement on page load
manifest.json       # Extension manifest (MV3)
```

## Permissions

| Permission | Reason |
|---|---|
| `tabs` | Open preview in a new tab |
| `host_permissions` (gemini, aistudio) | Inject content script |
