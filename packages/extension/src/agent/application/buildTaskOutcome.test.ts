import type { ExecutionResult } from '@page-agent/core'
import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node test runtime uses explicit .ts specifiers with strip-types.
import { buildTaskOutcome } from './buildTaskOutcome.ts'

test('builds a completed task outcome from the execution result', () => {
	const result: ExecutionResult = {
		success: true,
		data: ' 已生成 5 条卖点 ',
		history: [],
	}

	const outcome = buildTaskOutcome({
		taskRunId: 'run-1',
		routeKind: 'commerce_text',
		task: ' 根据当前商品写5条卖点 ',
		result,
		createdAt: 123,
	})

	assert.deepEqual(outcome, {
		taskRunId: 'run-1',
		routeKind: 'commerce_text',
		status: 'completed',
		userIntent: '根据当前商品写5条卖点',
		resultText: '已生成 5 条卖点',
		facts: undefined,
		createdAt: 123,
	})
})

test('normalizes and deduplicates extracted facts', () => {
	const result: ExecutionResult = {
		success: false,
		data: '生成失败',
		history: [],
	}

	const outcome = buildTaskOutcome({
		taskRunId: 'run-2',
		routeKind: 'page_interaction',
		task: '打开评论区',
		result,
		facts: [' 已打开评论区 ', '已打开评论区', '', '当前停留在商品详情页'],
		createdAt: 456,
	})

	assert.deepEqual(outcome.facts, ['已打开评论区', '当前停留在商品详情页'])
	assert.equal(outcome.status, 'error')
})
