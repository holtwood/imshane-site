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

## 设计考虑：

- task 用 `chan Task` 承载，带缓冲，Submit 阻塞在队列满时。
- worker 是固定数量的 goroutine，从同一个 task channel 竞争取任务，天然实现负载均衡。
- 销毁用单独的 `stop` channel 广播；`close(stop)` 后所有 worker 的 select 同时命中退出分支，比逐个通知简单。
- 用 `sync.WaitGroup` 等待所有 worker 退出，保证 Shutdown 返回时无残留 goroutine。

## 实现：

```go
type Task func()

type WorkPool struct {
	tasks chan Task
	stop  chan struct{}
	wg    sync.WaitGroup
}

// NewWorkPool 创建 pool 并启动 workers 个 goroutine
func NewWorkPool(workers, queueSize int) *WorkPool {
	p := &WorkPool{
		tasks: make(chan Task, queueSize),
		stop:  make(chan struct{}),
	}
	p.wg.Add(workers)
	for i := 0; i < workers; i++ {
		go p.worker()
	}
	return p
}

// worker 循环取任务，收到 stop 信号后退出
func (p *WorkPool) worker() {
	defer p.wg.Done()
	for {
		select {
		case t := <-p.tasks:
			t()
		case <-p.stop:
			return
		}
	}
}

// Submit 提交任务，队列满时阻塞
func (p *WorkPool) Submit(t Task) {
	p.tasks <- t
}

// Shutdown 广播停止信号并等待所有 worker 退出
func (p *WorkPool) Shutdown() {
	close(p.stop)
	p.wg.Wait()
}
```

## 注意点：

- `close(p.stop)` 后队列中**未取走**的 task 会被丢弃：worker 命中 stop 分支直接 return，不再 drain tasks。如果需要"排空队列再退出"，应改成 `close(p.tasks)` + worker 用 `for t := range p.tasks` 消费，由 channel 关闭自然结束循环。
- 用 stop 方案时 Submit 不能向已关闭 channel 发送（tasks 始终不关闭，所以 Submit 本身不会 panic）；用 close(tasks) 方案则要保证 Submit 先于关闭发生，否则 `send on closed channel` panic，一般需要额外标志位或锁保护。
- task 内部的 panic 会打挂 worker goroutine，生产实现里 worker 循环中应 recover，避免池容量悄悄缩水。
