---
title: "cuflash"
description: "从零手写的 CUDA FlashAttention 实现：标量内核到 WMMA Tensor Core 前向、FlashDecoding/Split-KV 与 Roofline 性能分析，支持 FP16/BF16/FP32 前反向，覆盖 sm_70–sm_90。"
date: "2026-09-16"
featured: true
order: 1
tags: ["CUDA", "C++", "FlashAttention", "Tensor Core"]
repoURL: "https://github.com/open-infra-ai/cuflash"
---

## Overview

cuflash 是一个从零手写的 CUDA FlashAttention 深度实现：从正确起步，经标量内核 → WMMA Tensor Core 前向的优化迭代，形成有数据支撑的性能叙事。教学可读性为底色，内核深度为作品定位。

项目当前处于 stable 维护收敛阶段（最新 Release 0.6.0），只修正确性 bug 与文档，不再扩展新功能。

## Highlights

- O(N) 辅助内存，不物化完整 O(N²) 注意力矩阵
- FP32 / FP16 / BF16 的前向与反向路径，含因果掩码支持
- FlashDecoding（decode 阶段 KV 分块并行）
- 简洁的 C++ API + C ABI 绑定，可经 ctypes 接入 Python
- 多架构覆盖：sm_70（V100）→ sm_90（H100）
- 完整测试体系：单元、集成、压力与 PyTorch 对比测试；Google Benchmark 性能追踪
- VitePress 文档站，覆盖算法、API、性能与故障排除

## Tech

CUDA · C++ · WMMA Tensor Core · Google Benchmark · C ABI · VitePress

本仓库是 open-infra-ai 五仓学习路径中的 CUDA kernel 专项仓：CUDA 基础在 cuda-foundations，Triton 参考实现在 trifuse，运行时与 Serving 分别在 tiny-llm 与 paged-serving。
