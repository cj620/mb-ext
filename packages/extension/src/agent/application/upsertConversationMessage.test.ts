import assert from 'node:assert/strict'
import test from 'node:test'

import type { ConversationMessageRecord } from '../domain/ConversationMessage'
// @ts-expect-error Node test runtime uses explicit .ts specifiers with strip-types.
import { upsertConversationMessage } from './upsertConversationMessage.ts'

function createMessage(
	id: string,
	content: string,
	createdAt: number,
	role: ConversationMessageRecord['role'] = 'assistant'
): ConversationMessageRecord {
	return {
		id,
		conversationId: 'conversation-1',
		role,
		content,
		createdAt,
	}
}

test('appends a conversation message when the id does not exist', () => {
	const messages = [createMessage('m1', 'hello', 1, 'user')]
	const nextMessage = createMessage('m2', 'streaming', 2)

	assert.deepEqual(upsertConversationMessage(messages, nextMessage), [...messages, nextMessage])
})

test('replaces a conversation message by id while preserving order', () => {
	const original = [
		createMessage('m1', 'hello', 1, 'user'),
		createMessage('m2', 'old content', 2),
		createMessage('m3', 'tail', 3),
	]
	const replacement = createMessage('m2', 'new content', 2)

	assert.deepEqual(upsertConversationMessage(original, replacement), [
		original[0],
		replacement,
		original[2],
	])
})
