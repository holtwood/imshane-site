---
title: "holtwood-arena"
description: "比赛与 benchmark 归档：CANN Ascend、FlagOS、Kunpeng、Muse，以及公开的 race 性能实验室；私有赛事工作区不因比赛结束自动公开。"
date: "2026-11-06"
order: 8
tags: ["Competition", "Performance", "CANN", "Kunpeng"]
repoURL: "https://github.com/holtwood-arena"
---

## Overview

holtwood-arena 是比赛与 benchmark 的归档组织。它承载两类东西：赛期工作区，以及赛后可以公开的性能证据与复盘。

比赛在这里不是奖状墙，而是一种强制约束：固定题面、固定输入、固定评测口径，逼着人把“我觉得更快”变成“在同一条件下可复现地更快”。

## 2026 记录

- **CANNJudge / Ascend 910B2**：CANN 2026 电力行业算子专场 10 题、十月天梯赛 4 题，以及早期 CANN 挑战赛。工作区私有，保留题面来源、实现、测量与赛后复盘。
- **Kunpeng HPC**：S2 FP32 二维卷积优化（公开；x86 本地验证，鲲鹏平台未复测）；S3 OpenFOAM 静态研究（公开；未参赛、未上机，已归档）。
- **FlagOS S2**：SGLang 算子优化与 MiniCPM5-2B 推理吞吐工作区。
- **Muse Spark Open Kernel Challenge**：kernel 与 serving 赛道工作区。

## 公开入口

- [race](https://github.com/holtwood-arena/race) — Speed Demon / 1BRC / PPC / DIMACS / AHC 性能实验室
- [kunpeng-s2-conv](https://github.com/holtwood-arena/kunpeng-s2-conv) — 卷积优化的单变量归因与方法论
- [kunpeng-s3-openfoam](https://github.com/holtwood-arena/kunpeng-s3-openfoam) — OpenFOAM 静态研究存档

## Boundary

私有赛事仓只用于个人与协作团队的赛事记录；公开页面不复制账号、提交记录、榜单快照或未脱敏题面。性能数字只在记录的硬件与软件版本下成立，不跨平台外推。
