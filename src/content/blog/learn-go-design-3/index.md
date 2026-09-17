---
title: Go设计篇-3-设计实现最小化协程池
description: >-
  用 channel 加 select 实现 Go 工作池 WorkPool：pool 的创建与销毁、worker goroutine
  的管理、任务的提交与调度。
date: '2021-12-15'
tags:
  - go
categories:
  - programming
legacyUrl: /post/2021/12/15/learn-go-design-3/
---
基于channel+select的方案，实现WorkPool的三个功能：

- pool 的创建与销毁
- pool 中 worker（Goroutine）的管理
- task 的提交与调度
