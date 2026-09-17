---
title: "cloud-bench"
description: "云服务器深度评测脚本与方法论：fio p99 长尾延迟、%steal 超售检测、物理核/线程拆分与指令集检查，原始产物全量保留可复核。"
date: "2026-09-14"
order: 6
tags: ["Shell", "Benchmark", "fio"]
repoURL: "https://github.com/holtwood/cloud-bench"
---

## Overview

cloud-bench 是一套可复现的云服务器深度评测脚本。与 YABS、bench.sh 这类"快不快"的工具不同，它补的是"稳不稳"的几个盲区。

## Highlights

- fio 记录 p99 / p99.9 长尾延迟，而不只是平均 IOPS
- stress-ng 满载 20 分钟 + mpstat 持续记录 %steal，做超售检测
- 拆出物理核 / 线程数并用多核扩展比交叉验证标称规格
- AVX / AVX-512 指令集检测，避免跑分时直接 SIGILL
- 原始产物全量保留，汇总结果可重算复核

## Notes

仓库只放工具与方法论；实测数据集与对比站点由私有仓库维护，不在本仓库。
