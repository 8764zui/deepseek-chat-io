# deepseek-chat-io

DeepSeek 对话导出工具 — Tampermonkey 用户脚本

## 功能

一键将当前 DeepSeek 对话导出为精简 JSON 文件，文件名自带日期和标题。

## 导出格式

```json
{
  "title": "对话标题",
  "messages": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}
```

来源、日期等元信息已在文件名中体现，JSON 内不重复存储。

## 文件名格式

`deepseek_标题_YYYY-MM-DD_HH-mm.json`

## 安装

Tampermonkey → 新建脚本 → 粘贴 `deepseek-chat-exporter.user.js` → 保存

## DOM 依赖

- `.ds-message` — 消息容器
- `.ds-assistant-message-main-content` — AI 最终回复（自动排除思维过程）
