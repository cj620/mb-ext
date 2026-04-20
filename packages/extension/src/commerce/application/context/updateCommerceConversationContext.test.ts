import assert from 'node:assert/strict'
import test from 'node:test'

import type { TaskOutcome } from '@/agent/domain/TaskOutcome'
import type { ConversationMessage } from '@/commerce/domain'

// @ts-expect-error Node test runtime uses explicit .ts specifiers with strip-types.
import { updateCommerceConversationContext } from './updateCommerceConversationContext.ts'

function createOutcome(
	id: string,
	userIntent: string,
	resultText: string,
	createdAt: number
): TaskOutcome {
	return {
		taskRunId: id,
		routeKind: 'commerce_text',
		status: 'completed',
		userIntent,
		resultText,
		createdAt,
	}
}

test('appends a new commerce turn to the same scope', () => {
	const result = updateCommerceConversationContext(
		{ scopeKey: 'https://example.com/p1', messages: [], outcomes: [] },
		{
			scopeKey: 'https://example.com/p1',
			taskOutcome: createOutcome('run-1', '根据当前商品写5条卖点', '卖点1\n卖点2', 1),
		}
	)

	assert.equal(result.scopeKey, 'https://example.com/p1')
	assert.equal(result.messages.length, 2)
	assert.equal(result.outcomes.length, 1)
	assert.equal(result.messages[0]?.role, 'user')
	assert.equal(result.messages[1]?.role, 'assistant')
})

test('resets previous conversation when scope changes', () => {
	const result = updateCommerceConversationContext(
		{
			scopeKey: 'https://example.com/p1',
			messages: [
				{ id: '1', role: 'user', content: 'old', createdAt: 1 },
				{ id: '2', role: 'assistant', content: 'old reply', createdAt: 2 },
			],
			outcomes: [createOutcome('run-1', 'old', 'old reply', 1)],
		},
		{
			scopeKey: 'https://example.com/p2',
			taskOutcome: createOutcome('run-2', 'new question', 'new answer', 3),
		}
	)

	assert.equal(result.scopeKey, 'https://example.com/p2')
	assert.equal(result.messages.length, 2)
	assert.equal(result.outcomes.length, 1)
	assert.equal(result.messages[0]?.content, 'new question')
})

test('keeps only the most recent three turns', () => {
	const seed = {
		scopeKey: 'https://example.com/p1',
		messages: [
			{ id: '1', role: 'user', content: 'q1', createdAt: 1 },
			{ id: '2', role: 'assistant', content: 'a1', createdAt: 2 },
			{ id: '3', role: 'user', content: 'q2', createdAt: 3 },
			{ id: '4', role: 'assistant', content: 'a2', createdAt: 4 },
			{ id: '5', role: 'user', content: 'q3', createdAt: 5 },
			{ id: '6', role: 'assistant', content: 'a3', createdAt: 6 },
		] satisfies ConversationMessage[],
		outcomes: [
			createOutcome('run-1', 'q1', 'a1', 1),
			createOutcome('run-2', 'q2', 'a2', 3),
			createOutcome('run-3', 'q3', 'a3', 5),
		],
	}

	const result = updateCommerceConversationContext(seed, {
		scopeKey: 'https://example.com/p1',
		taskOutcome: createOutcome('run-4', 'q4', 'a4', 7),
	})

	assert.equal(result.messages.length, 6)
	assert.equal(result.outcomes.length, 3)
	assert.deepEqual(
		result.messages.map((message) => message.content),
		['q2', 'a2', 'q3', 'a3', 'q4', 'a4']
	)
	assert.deepEqual(
		result.outcomes.map((outcome) => outcome.taskRunId),
		['run-2', 'run-3', 'run-4']
	)
})
