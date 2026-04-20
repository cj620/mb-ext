import assert from 'node:assert/strict'
import test from 'node:test'

import type { ConversationMessageRecord } from '../domain/ConversationMessage'
// @ts-expect-error Node test runtime uses explicit .ts specifiers with strip-types.
import { getVisibleConversationMessages } from './getVisibleConversationMessages.ts'

function createMessage(id: number): ConversationMessageRecord {
	return {
		id: String(id),
		conversationId: 'conv-1',
		role: id % 2 === 0 ? 'assistant' : 'user',
		content: `message-${id}`,
		createdAt: id,
	}
}

test('returns only the most recent visible messages', () => {
	const messages = Array.from({ length: 5 }, (_, index) => createMessage(index + 1))

	const result = getVisibleConversationMessages(messages, 2)

	assert.deepEqual(
		result.messages.map((message) => message.content),
		['message-4', 'message-5']
	)
	assert.equal(result.hasMore, true)
	assert.equal(result.hiddenCount, 3)
})

test('returns all messages when visible count exceeds the message count', () => {
	const messages = Array.from({ length: 3 }, (_, index) => createMessage(index + 1))

	const result = getVisibleConversationMessages(messages, 10)

	assert.equal(result.messages.length, 3)
	assert.equal(result.hasMore, false)
	assert.equal(result.hiddenCount, 0)
})
