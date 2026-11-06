---
title: "kvtier"
description: "LLM 推理 KV Cache 分层研究：L1 GPU HBM / L2 host DRAM / L3 storage，围绕 SGLang HiCache 与 vLLM offloading 做可审计复现与上游贡献。"
date: "2026-11-06"
order: 6
tags: ["KV Cache", "SGLang", "vLLM", "Systems"]
repoURL: "https://github.com/holtwood-systems/kvtier"
---

## Overview

kvtier 是一个 KV Cache 分层研究仓：把 GPU HBM、host DRAM 与存储之间的 KV 换出/回载，当作一个可测量的 memory hierarchy 问题，而不是只看框架参数。

研究对象是 SGLang 的 HiCache（`--enable-hierarchical-cache`）与 vLLM 的 KV offloading。目标不是复刻某个 benchmark 数字，而是把上游源码阅读收敛成可运行实验、可审计结果和可撤回的结论。

## Highlights

- 单卡 HiCache L2 微基准：WSL2 / RTX 3060 Laptop / Qwen2.5-0.5B，6 轮
- L2 回载中位数 72.3 ms，对比冷 prefill 338.0 ms，R/P 中位比 0.215
- 结果包固定 SGLang 40 位 commit、模型哈希、GPU、启动参数、原始响应与 Prometheus 指标
- 区分“本机、本模型、本配置”的结果与 #31600 的多卡 EAGLE/L3 复现
- 上游状态：SGLang PR #36116 OPEN，#36115 未合入关闭；尚无已合入 PR

## Boundary

上面的 72.3 ms / 338.0 ms 只描述该单卡、该模型、该配置，不是 #31600 的复现，也不能外推到多卡、L3 或 EAGLE 场景。上游 issue/PR 状态会变化，公开引用前需要重新核对 `main`。

项目状态为 **active**：先做可复现实验与结果审计，再决定是否进入 CPU 侧 KV 分层优化或上游贡献。
