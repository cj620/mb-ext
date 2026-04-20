import assert from 'node:assert/strict'
import test from 'node:test'

import type { TaskOutcome } from '@/agent/domain/TaskOutcome'
import type { ActiveCommerceContext } from '@/commerce/domain'

// @ts-expect-error Node test runtime uses explicit .ts specifiers with strip-types.
import { serializeActiveCommerceContext } from './serializeActiveCommerceContext.ts'

test('includes recent conversation messages in the serialized commerce context', () => {
	const recentTaskOutcome: TaskOutcome = {
		taskRunId: 'run-1',
		routeKind: 'commerce_text',
		status: 'completed',
		userIntent: '这个商品适合什么人群？',
		resultText: '适合预算有限、想要便携使用的人群。',
		facts: ['适合预算有限的人群'],
		createdAt: 1,
	}

	const context: ActiveCommerceContext = {
		currentPage: {
			url: 'https://example.com/p1',
			title: 'Example Product',
			sourcePlatform: 'amazon',
		},
		recentTaskOutcomes: [recentTaskOutcome],
		recentConversationMessages: [
			{
				id: '1',
				role: 'user',
				content: '这个商品适合什么人群？',
				createdAt: 1,
			},
			{
				id: '2',
				role: 'assistant',
				content: '适合预算有限、想要便携使用的人群。',
				createdAt: 2,
			},
		],
	}

	const serialized = serializeActiveCommerceContext(context)

	assert.match(serialized, /Recent commerce task outcomes:/)
	assert.match(serialized, /\[commerce_text\/completed\] 这个商品适合什么人群？/)
	assert.match(serialized, /facts: 适合预算有限的人群/)
	assert.match(serialized, /Recent commerce conversation:/)
	assert.match(serialized, /user: 这个商品适合什么人群？/)
	assert.match(serialized, /assistant: 适合预算有限、想要便携使用的人群。/)
})
