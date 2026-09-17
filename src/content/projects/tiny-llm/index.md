---
title: "tiny-llm"
description: "CUDA/C++17 精简 LLM 推理运行时：GGUF 加载与反量化、W8A16 推理、显式与分页 KV Cache、tokenizer、采样，以及 CUDA Graphs 加速 decode。"
date: "2026-09-16"
featured: true
order: 2
tags: ["CUDA", "C++", "LLM Inference", "KV Cache"]
repoURL: "https://github.com/open-infra-ai/tiny-llm"
---

## Overview

tiny-llm 是面向聚焦型 Transformer 工作负载的 CUDA 原生 C++ 推理引擎。仓库表面刻意保持精简：CUDA/C++17 内核、W8A16 量化、显式 KV Cache 管理，以及一条容易审计和维护的运行时路径。

## Highlights

- GGUF 加载与反量化：F16 / F32 / Q4_0 / Q5_0 / Q8_0 / Q4_K / Q6_K
- W8A16 量化推理路径（INT8 权重 + FP16 激活）
- KV Cache 管理、采样（temperature / top-k / top-p）与端到端生成
- 分页 KV（block_tables + scatter/gather），经 C ABI 供 paged-serving 使用
- tokenizer 与 HuggingFace tokenizers 差分测试逐 id 对齐
- CUDA Graphs 加速 decode

## Benchmarks

2026-08-23 正式基准快照（RTX 3060 Laptop 6GB，Qwen2.5-0.5B-Instruct Q4_K_M，5 组独立进程配对测量）：

- TPOT 跨进程中位数：8.322 ms → 5.225 ms（CUDA Graphs 开启后 -37.2%）
- decode 吞吐：120.2 → 191.4 tok/s（+59.3%）
- 报告含原始 JSONL、模型哈希与完整命令，全部可复算

## Tech

CUDA · C++17 · CMake · GGUF · W8A16 · Paged KV · C ABI · CUDA Graphs

本仓库只负责模型权重到 token 生成的运行时主线；调度与批处理在 paged-serving，FlashAttention 深挖在 cuflash。
