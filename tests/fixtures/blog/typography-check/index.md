---
title: "中英文混排与代码块测试"
description: "用于验证 featured / updatedDate / tags / categories 字段与中文排版渲染的测试文章。"
date: "2026-09-15"
draft: true
updatedDate: "2026-09-16"
featured: true
tags: ["typography", "test"]
categories: ["programming"]
legacyUrl: "/post/2026/09/15/typography-check/"
---

这是一篇用于验证内容模型的测试文章：包含 `updatedDate`、`featured`、`tags`、`categories` 与 `legacyUrl` 字段。

中文与 English mixed content 需要在同一行内自然共处。标点、间距与换行都应保持克制：like this sentence embedded here.

## 代码高亮

```go
// GPM: Goroutine, Processor, Machine
func schedule(gp *g) {
    // 调度入口
}
```

## 引用与列表

> 排版的目标是让读者忘记排版本身。

1. 中文字体 fallback
2. Latin text inline
3. `inline code` 混排
