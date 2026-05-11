// ==UserScript==
// @name         DeepSeek Chat Export/Import
// @namespace    https://github.com/user/deepseek-chat-io
// @version      1.0.0
// @description  导出 DeepSeek 对话为 JSON（带日期文件名），导入历史对话作为上下文
// @author       Lumen
// @match        https://chat.deepseek.com/*
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ── 配置 ──────────────────────────────────────────────

  const CONFIG = {
    selectors: {
      message: '.ds-message',
      assistantContent: '.ds-assistant-message-main-content',
      chatInput: '#chat-input, textarea[placeholder], [contenteditable="true"]',
      inputArea: 'div[class*="chat-input"], div[class*="ChatInput"], div[class*="input-area"]',
    },
    exportPrefix: 'deepseek-chat',
  };

  // ── 工具函数 ──────────────────────────────────────────

  function formatDate(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  }

  function getTitle() {
    const raw = document.title || '';
    return raw
      .replace(/\s*-\s*DeepSeek.*$/i, '')
      .replace(/^DeepSeek.*?[-–—]\s*/i, '')
      .trim() || 'untitled';
  }

  function getConversationId() {
    const m = location.pathname.match(/\/s\/([a-f0-9-]+)/);
    return m ? m[1] : null;
  }

  // ── 核心：提取消息 ─────────────────────────────────────

  function extractMessages() {
    const msgEls = document.querySelectorAll(CONFIG.selectors.message);
    const messages = [];

    for (const el of msgEls) {
      const mainContent = el.querySelector(CONFIG.selectors.assistantContent);
      const isAssistant = mainContent !== null;

      const content = (isAssistant ? mainContent : el).textContent.trim();
      if (!content) continue;

      messages.push({
        role: isAssistant ? 'assistant' : 'user',
        content: content,
      });
    }

    return messages;
  }

  // ── 导出 ──────────────────────────────────────────────

  function exportChat() {
    const messages = extractMessages();
    if (messages.length === 0) {
      showToast('⚠️ 未检测到对话内容');
      return;
    }

    const now = new Date();
    const data = {
      _meta: true,
      source: 'DeepSeek',
      title: getTitle(),
      url: location.href,
      conversationId: getConversationId(),
      exportedAt: now.toISOString(),
      messageCount: messages.length,
      messages: messages,
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${CONFIG.exportPrefix}_${getTitle().replace(/[\/\\:*?"<>|]/g, '_')}_${formatDate(now)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`✅ 已导出 ${messages.length} 条消息`);
  }

  // ── 导入 ──────────────────────────────────────────────

  function importChat() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.messages || !Array.isArray(data.messages)) {
          showToast('⚠️ 文件格式不正确');
          return;
        }

        // 构建上下文文本
        const context = buildContextText(data);

        // 注入到输入框
        injectToInput(context);
        showToast(`✅ 已加载 "${data.title}" (${data.messageCount} 条消息)`);
      } catch (err) {
        showToast(`❌ 导入失败: ${err.message}`);
      }
    };

    input.click();
  }

  function buildContextText(data) {
    const lines = [];
    lines.push(`[以下是之前的一段对话记录，请作为上下文参考]`);
    lines.push(`对话标题：${data.title}`);
    lines.push(`导出时间：${data.exportedAt}`);
    lines.push(`---`);

    for (const msg of data.messages) {
      const role = msg.role === 'user' ? '用户' : '助手';
      lines.push(`【${role}】${msg.content}`);
    }

    lines.push(`---`);
    lines.push(`[对话记录结束。请基于以上上下文继续对话。]`);
    return lines.join('\n');
  }

  function injectToInput(text) {
    // 尝试多种输入框选择器
    const selectors = [
      '#chat-input',
      'textarea[placeholder]',
      '[contenteditable="true"]',
      'textarea',
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;

      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        // 原生 textarea/input
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.focus();
        // 将光标移到末尾
        el.setSelectionRange(text.length, text.length);
        return;
      }

      if (el.contentEditable === 'true') {
        // contenteditable div
        el.textContent = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.focus();
        // 将光标移到末尾
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel2 = window.getSelection();
        sel2.removeAllRanges();
        sel2.addRange(range);
        return;
      }
    }

    // 兜底：复制到剪贴板
    GM_setClipboard(text);
    showToast('📋 已复制到剪贴板，请手动粘贴到输入框');
  }

  // ── Toast 提示 ────────────────────────────────────────

  function showToast(msg) {
    const existing = document.querySelector('.ds-export-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'ds-export-toast';
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: 'fixed',
      top: '60px',
      right: '20px',
      padding: '12px 20px',
      background: '#1a1a2e',
      color: '#e0e0e0',
      borderRadius: '8px',
      fontSize: '14px',
      zIndex: '99999',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      transition: 'opacity 0.3s',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    });

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ── 注入按钮 ──────────────────────────────────────────

  function injectUI() {
    // 等待页面头部加载
    const header = document.querySelector('.the-header, header, [class*="header"]');
    if (!header) {
      setTimeout(injectUI, 1000);
      return;
    }

    // 避免重复注入
    if (document.querySelector('.ds-export-btns')) return;

    const container = document.createElement('div');
    container.className = 'ds-export-btns';
    Object.assign(container.style, {
      display: 'flex',
      gap: '6px',
      marginLeft: 'auto',
      marginRight: '12px',
      alignItems: 'center',
    });

    // 导出按钮
    const exportBtn = createButton('📥 导出对话', '#4a6fa5', exportChat);

    // 导入按钮
    const importBtn = createButton('📂 导入上下文', '#5a7a5a', importChat);

    container.appendChild(exportBtn);
    container.appendChild(importBtn);

    // 插入到 header 末尾
    header.appendChild(container);
  }

  function createButton(text, bg, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, {
      padding: '6px 14px',
      background: bg,
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      transition: 'opacity 0.2s',
      whiteSpace: 'nowrap',
    });
    btn.onmouseenter = () => (btn.style.opacity = '0.85');
    btn.onmouseleave = () => (btn.style.opacity = '1');
    btn.onclick = onClick;
    return btn;
  }

  // ── 菜单注册 ──────────────────────────────────────────

  if (typeof GM_registerMenuCommand !== 'undefined') {
    GM_registerMenuCommand('📥 导出当前对话', exportChat);
    GM_registerMenuCommand('📂 导入历史对话', importChat);
  }

  // ── 启动 ──────────────────────────────────────────────

  // 页面加载后注入 UI
  if (document.readyState === 'complete') {
    injectUI();
  } else {
    window.addEventListener('load', injectUI);
  }

  // SPA 路由变化时重新注入
  const observer = new MutationObserver(() => {
    if (!document.querySelector('.ds-export-btns')) {
      injectUI();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
