---
title: "cuda-foundations"
description: "系统性 CUDA 算子工程学习路径：从 SGEMM 优化阶梯到可复用 kernel 库、进阶 HPC 模式与轻量推理组件，四个模块含完整测试与文档。"
date: "2026-09-16"
order: 5
tags: ["CUDA", "C++", "SGEMM", "HPC"]
repoURL: "https://github.com/open-infra-ai/cuda-foundations"
---

## Overview

cuda-foundations 是一条从 SGEMM 基础到可复用推理组件的系统性 CUDA 算子工程学习路径。多数 CUDA 学习材料要么太小不像工程、要么太大读不通——这个仓库卡在中间。

## Highlights

- 模块 01：直接在 SGEMM 上讲清优化阶梯
- 模块 02：把这些思路组织成可复用的 kernel 库形态
- 模块 03：进阶 CUDA 与 HPC 模式实验
- 模块 04：kernel、内存、stream 与配置如何组成一个小型推理向系统
- 2026-08-23 测试机（RTX 3060 Laptop / sm_86 / CUDA 12.0）上 `ctest` 261/261 通过

## Tech

CUDA 12.x · C++17/20 · 双构建系统 · VitePress 文档

项目状态 stable：四个模块已完整，只修正确性与教学细节，不再新增模块。
