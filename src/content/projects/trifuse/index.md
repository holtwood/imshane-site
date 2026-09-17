---
title: "trifuse"
description: "面向 Transformer 推理的可验证 Triton 融合算子：RMSNorm+RoPE、Gated MLP 与 FlashAttention 前向，经 torch.library 注册并附差分测试与 benchmark。"
date: "2026-09-16"
order: 4
tags: ["Triton", "Python", "GPU Ops"]
repoURL: "https://github.com/open-infra-ai/trifuse"
---

## Overview

trifuse 是面向 AI Infra 学习的精简 Triton 算子仓库，只保留三条可以用独立参考实现验证的 Transformer 推理路径：融合 RMSNorm+RoPE、标准 SwiGLU/GeGLU 的 Gated MLP，以及带在线 softmax 的 FlashAttention 前向。

项目状态 stable（v2.0.1）：新功能暂停，继续维护正确性、兼容性与可复现验证。

## Highlights

- `fused_rmsnorm_rope`：融合 RMSNorm 与 RoPE
- `fused_gated_mlp`：`activation(gate_proj(x)) * up_proj(x)`
- `flash_attention`：在线 softmax 前向，支持 causal mask，是 cuflash 的独立参考实现
- `import trifuse` 即注册进 `torch.ops.trifuse.*`，可接入 `torch.compile` / `torch.export` 图
- NumPy/PyTorch 参考实现、输入契约、差分测试、benchmark 与 autotuner 基础设施
- 删除了曾被误标为 "FP8 E4M3" 的 uint8 均匀量化路径，避免把 INT8 当 FP8 教材

## Tech

Triton · PyTorch · torch.library · Python · 差分测试
