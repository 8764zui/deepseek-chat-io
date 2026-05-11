// ==UserScript==
// @name         DeepSeek Chat Exporter
// @namespace    https://github.com/8764zui/deepseek-chat-io
// @version      1.1.0
// @description  一键导出 DeepSeek 对话为 JSON 文件（带日期文件名）
// @author       Lumen
// @match        https://chat.deepseek.com/*
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ── 提取消息 ──────────────────────────────────────────

  function extractChat() {
    const msgs = document.querySelectorAll('.ds-message');
    const messages = [];

    for (const el of msgs) {
      const main = el.querySelector('.ds-assistant-message-main-content');
      const content = (main || el).textContent.trim();
      if (!content) continue;
      messages.push({ role: main ? 'assistant' : 'user', content });
    }

    return messages;
  }

  // ── 导出 ──────────────────────────────────────────────

  function exportChat() {
    const messages = extractChat();
    if (!messages.length) { toast('⚠️ 未检测到对话'); return; }

    const title = document.title.replace(/\s*-\s*DeepSeek.*$/i, '').trim() || 'untitled';
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;

    const data = { title, messages };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `deepseek_${title.replace(/[\/\\:*?"<>|]/g,'_')}_${stamp}.json`
    });
    document.body.appendChild(a); a.click(); a.remove();
    toast(`✅ 导出 ${messages.length} 条`);
  }

  // ── Toast ─────────────────────────────────────────────

  function toast(msg) {
    const t = Object.assign(document.createElement('div'), { textContent: msg });
    Object.assign(t.style, {
      position:'fixed', top:'60px', right:'20px', padding:'10px 18px',
      background:'#1a1a2e', color:'#e0e0e0', borderRadius:'8px',
      fontSize:'13px', zIndex:'99999', boxShadow:'0 4px 12px rgba(0,0,0,0.3)',
      fontFamily:'system-ui,sans-serif', transition:'opacity .3s'
    });
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; setTimeout(() => t.remove(), 300); }, 2000);
  }

  // ── 注入按钮 ──────────────────────────────────────────

  function inject() {
    const hdr = document.querySelector('.the-header, header');
    if (!hdr || document.querySelector('.ds-export-btn')) { setTimeout(inject, 1000); return; }

    const btn = Object.assign(document.createElement('button'), {
      textContent: '📥 导出对话',
      onclick: exportChat
    });
    Object.assign(btn.style, {
      padding:'6px 14px', background:'#4a6fa5', color:'#fff', border:'none',
      borderRadius:'6px', cursor:'pointer', fontSize:'13px', fontWeight:'500',
      marginLeft:'auto', marginRight:'12px', fontFamily:'system-ui,sans-serif',
      whiteSpace:'nowrap', transition:'opacity .2s'
    });
    btn.className = 'ds-export-btn';
    btn.onmouseenter = () => btn.style.opacity='0.85';
    btn.onmouseleave = () => btn.style.opacity='1';
    hdr.appendChild(btn);
  }

  // ── 启动 ──────────────────────────────────────────────

  inject();
  new MutationObserver(() => { if (!document.querySelector('.ds-export-btn')) inject(); })
    .observe(document.body, { childList: true, subtree: true });
})();
