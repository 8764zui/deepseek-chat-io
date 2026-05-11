# deepseek-chat-io

DeepSeek 对话导出/导入工具 — Tampermonkey 用户脚本

## 功能

- **导出对话**: 一键将当前 DeepSeek 对话导出为 JSON 文件（自动带日期和标题）
- **导入上下文**: 加载之前的对话记录，注入到当前输入框作为上下文继续对话

## 导出格式

```json
{
  "_meta": true,
  "source": "DeepSeek",
  "title": "对话标题",
  "url": "https://chat.deepseek.com/a/chat/s/...",
  "conversationId": "8b4819d6-...",
  "exportedAt": "2026-05-11T12:00:00.000Z",
  "messageCount": 2,
  "messages": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}
```

## 文件名格式

`deepseek-chat_标题_YYYY-MM-DD_HH-mm.json`

## 安装

1. 安装 Tampermonkey 浏览器扩展
2. 新建脚本，粘贴 `deepseek-chat-exporter.user.js` 的内容
3. 保存并启用

## DOM 结构依赖

- `.ds-message` — 消息容器
- `.ds-assistant-message-main-content` — AI 最终回复（排除思维过程）

## 技术说明

- 自动排除 AI 的思维过程（thinking），只保留最终回复
- 导入时将历史对话格式化为上下文文本注入输入框
- 支持 SPA 路由变化自动重新注入 UI
- 兜底方案：输入框注入失败时自动复制到剪贴板
