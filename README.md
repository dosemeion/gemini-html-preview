# Gemini HTML 预览

一个 Chrome 扩展，在 [Gemini](https://gemini.google.com) 和 [AI Studio](https://aistudio.google.com) 的 HTML 代码块工具栏中添加**预览**按钮，点击后直接在新标签页中渲染生成的 HTML，无需复制粘贴，无下载弹窗。

## 功能

- 一键预览 HTML 代码块
- 支持 LaTeX 数学公式渲染（`$$...$$`、`$...$`、`\(...\)`、`\[...\]`）
- 修复因 IntersectionObserver 滚动动画导致的内容不可见问题
- 同时支持 Gemini 和 AI Studio

## 工作原理

扩展在每个 HTML 代码块的工具栏中注入预览按钮。点击后，HTML 内容被发送至后台 Service Worker：

1. 注入修复脚本（IO shim、KaTeX 等）
2. 将处理后的 HTML 暂存于内存，并打开一个 `chrome-extension://` URL
3. Service Worker 拦截该 URL 的 fetch 请求，直接将 HTML 作为响应返回

不写入磁盘，不弹出下载对话框。

## 安装

1. 克隆或下载本仓库
2. 打开 `chrome://extensions`
3. 启用**开发者模式**
4. 点击**加载已解压的扩展程序**，选择项目文件夹

## 文件结构

```
background.js       # Service Worker：fetch 拦截、HTML 注入
content.js          # 向页面注入预览按钮
content.css         # 按钮样式
io-shim.js          # IntersectionObserver 补丁（修复隐藏内容）
fixes.css           # 强制 section 元素始终可见
katex.min.js        # KaTeX 数学渲染库
katex.min.css       # KaTeX 样式
auto-render.min.js  # KaTeX 自动渲染（扫描 DOM 中的公式定界符）
katex-init.js       # 页面加载后调用 renderMathInElement
manifest.json       # 扩展清单（MV3）
```

## 权限说明

| 权限 | 用途 |
|---|---|
| `tabs` | 在新标签页中打开预览 |
| `host_permissions`（gemini、aistudio） | 注入内容脚本 |


## GEM
使用提示词新建GEM，或直接使用分享链接
### GEM提示词
```
gem.txt
```

### GEM链接
```
https://gemini.google.com/gem/1HvCFRfSXeFL962z30A6ajvMLRY6rRdic?usp=sharing
```
