---
title: "paged-serving"
description: "Rust 实现的 LLM Serving 控制面：Paged KV 调度、continuous batching、OpenAI 兼容 API 与 SSE，经 C ABI 接入 tiny-llm 真实 CUDA 后端。"
date: "2026-09-16"
featured: true
order: 3
tags: ["Rust", "LLM Serving", "Systems"]
repoURL: "https://github.com/open-infra-ai/paged-serving"
---

## Overview

paged-serving 是一个基于 Rust 构建的 LLM Serving 控制面，以模块化、可测试的架构练习分页 KV 内存管理与连续批处理调度。控制面核心（分页 KV / continuous batching / 调度 / API）v0.2.0 已稳定。

计算后端为双路径设计：默认 CPU 参考执行器提供确定性输出供测试与 CI；`tiny-llm` cargo feature 下接入真实 CUDA 运行时，将各序列 block_tables 上传至 tiny-llm 的分页 KV 池。

## Highlights

- Paged KV 控制面：BlockPool、PageTable、块表上传与资源守恒校验
- Continuous batching：动态 prefill / decode 调度，优先级与准入控制、内存水位线
- OpenAI 兼容服务器：`/v1/completions`、`/v1/chat/completions` 与 SSE 流式输出
- HTTP 边界 tokenizer 适配器（默认 SimpleTokenizer，可切 HF tokenizer.json）
- tiny-llm 真实后端：3 并发 e2e 与 llama.cpp greedy 逐 token 对齐
- 属性测试与资源不变量验证

## Tech

Rust · Trait 抽象 · Continuous Batching · Paged KV · OpenAI SSE · C ABI

本仓库只练习 Serving 控制面；计算 kernel 与模型加载权威在 tiny-llm。
