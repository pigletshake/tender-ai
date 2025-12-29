// 轻量 Markdown 渲染兜底（无第三方依赖、可离线使用）
// 目标：覆盖本项目常见的 Markdown（标题/列表/引用/代码块/行内代码/粗体/段落）
// 注意：会先进行 HTML 转义，避免把原始内容当成 HTML 注入页面。

function escapeHtml(input) {
  const s = String(input ?? '');
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function applyInline(markdownText) {
  // 在已转义的文本上做轻量替换
  let s = markdownText;
  // 行内代码：`code`
  s = s.replace(/`([^`]+?)`/g, '<code>$1</code>');
  // 粗体：**text**
  s = s.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  // 斜体：*text*（尽量保守，避免与列表冲突）
  s = s.replace(/(^|[\s(])\*([^*\n]+?)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>');
  // 链接：[text](url)
  s = s.replace(/\[([^\]]+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return s;
}

function parseMarkdown(markdown) {
  const src = String(markdown ?? '');
  const lines = src.split(/\r?\n/);

  let html = '';
  let inCode = false;
  let codeLang = '';
  let codeBuf = [];
  let inUl = false;
  let inOl = false;
  let inBlockquote = false;
  let paraBuf = [];

  function flushParagraph() {
    if (paraBuf.length === 0) return;
    const text = applyInline(escapeHtml(paraBuf.join('\n'))).replace(/\n/g, '<br>');
    html += `<p>${text}</p>\n`;
    paraBuf = [];
  }

  function closeLists() {
    if (inUl) {
      html += '</ul>\n';
      inUl = false;
    }
    if (inOl) {
      html += '</ol>\n';
      inOl = false;
    }
  }

  function closeBlockquote() {
    if (inBlockquote) {
      html += '</blockquote>\n';
      inBlockquote = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // fenced code block: ```lang
    const fenceMatch = rawLine.match(/^```(\w+)?\s*$/);
    if (fenceMatch) {
      if (!inCode) {
        // start code
        flushParagraph();
        closeLists();
        closeBlockquote();
        inCode = true;
        codeLang = (fenceMatch[1] || '').trim();
        codeBuf = [];
      } else {
        // end code
        const code = escapeHtml(codeBuf.join('\n'));
        const cls = codeLang ? ` class="language-${escapeHtml(codeLang)}"` : '';
        html += `<pre><code${cls}>${code}</code></pre>\n`;
        inCode = false;
        codeLang = '';
        codeBuf = [];
      }
      continue;
    }

    if (inCode) {
      codeBuf.push(rawLine);
      continue;
    }

    // blank line -> paragraph break / close blockquote or lists if needed
    if (!rawLine.trim()) {
      flushParagraph();
      closeLists();
      closeBlockquote();
      continue;
    }

    // headings: # .. ######
    const hMatch = rawLine.match(/^(#{1,6})\s+(.*)$/);
    if (hMatch) {
      flushParagraph();
      closeLists();
      closeBlockquote();
      const level = hMatch[1].length;
      const content = applyInline(escapeHtml(hMatch[2].trim()));
      html += `<h${level}>${content}</h${level}>\n`;
      continue;
    }

    // blockquote: > ...
    const bqMatch = rawLine.match(/^>\s?(.*)$/);
    if (bqMatch) {
      flushParagraph();
      closeLists();
      if (!inBlockquote) {
        html += '<blockquote>\n';
        inBlockquote = true;
      }
      const content = applyInline(escapeHtml(bqMatch[1]));
      html += `<p>${content}</p>\n`;
      continue;
    } else {
      // leaving blockquote when a non-quote line appears
      closeBlockquote();
    }

    // unordered list: - item / * item
    const ulMatch = rawLine.match(/^\s*[-*]\s+(.*)$/);
    if (ulMatch) {
      flushParagraph();
      if (inOl) {
        html += '</ol>\n';
        inOl = false;
      }
      if (!inUl) {
        html += '<ul>\n';
        inUl = true;
      }
      const li = applyInline(escapeHtml(ulMatch[1].trim()));
      html += `<li>${li}</li>\n`;
      continue;
    }

    // ordered list: 1. item
    const olMatch = rawLine.match(/^\s*\d+\.\s+(.*)$/);
    if (olMatch) {
      flushParagraph();
      if (inUl) {
        html += '</ul>\n';
        inUl = false;
      }
      if (!inOl) {
        html += '<ol>\n';
        inOl = true;
      }
      const li = applyInline(escapeHtml(olMatch[1].trim()));
      html += `<li>${li}</li>\n`;
      continue;
    }

    // normal text -> paragraph buffer
    closeLists();
    paraBuf.push(rawLine);
  }

  // flush remaining
  if (inCode) {
    // 未闭合代码块也渲染出来
    const code = escapeHtml(codeBuf.join('\n'));
    const cls = codeLang ? ` class="language-${escapeHtml(codeLang)}"` : '';
    html += `<pre><code${cls}>${code}</code></pre>\n`;
  }
  flushParagraph();
  closeLists();
  closeBlockquote();

  return html || '';
}

window.Markdown = {
  parse: parseMarkdown,
};


