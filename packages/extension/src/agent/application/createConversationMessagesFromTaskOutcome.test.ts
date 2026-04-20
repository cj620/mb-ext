import assert from 'node:assert/strict'
import test from 'node:test'

import type { TaskOutcome } from '../domain/TaskOutcome'
// @ts-expect-error Node test runtime uses explicit .ts specifiers with strip-types.
import { createConversationMessagesFromTaskOutcome } from './createConversationMessagesFromTaskOutcome.ts'

test('creates a user and assistant message pair from a task outcome', () => {
	const outcome: TaskOutcome = {
		taskRunId: 'run-1',
		routeKind: 'commerce_text',
		status: 'completed',
		userIntent: '根据当前商品写5条卖点',
		resultText: '卖点1\n卖点2',
		createdAt: 100,
	}

	const [userMessage, assistantMessage] = createConversationMessagesFromTaskOutcome({
		conversationId: 'conv-1',
		taskOutcome: outcome,
	})

	assert.deepEqual(userMessage, {
		id: 'run-1-user',
		conversationId: 'conv-1',
		role: 'user',
		content: '根据当前商品写5条卖点',
		createdAt: 100,
		taskRunId: 'run-1',
		routeKind: 'commerce_text',
		taskStatus: 'completed',
	})
	assert.deepEqual(assistantMessage, {
		id: 'run-1-assistant',
		conversationId: 'conv-1',
		role: 'assistant',
		content: '卖点1\n卖点2',
		createdAt: 101,
		taskRunId: 'run-1',
		routeKind: 'commerce_text',
		taskStatus: 'completed',
	})
})
