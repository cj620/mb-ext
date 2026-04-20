import assert from 'node:assert/strict'
import test from 'node:test'

import type { ConversationMessageRecord } from '../domain/ConversationMessage'
// @ts-expect-error Node test runtime uses explicit .ts specifiers with strip-types.
import { mergeConversationMessagePages } from './mergeConversationMessagePages.ts'

function createMessage(id: string, createdAt: number): ConversationMessageRecord {
	return {
		id,
		conversationId: 'conv-1',
		role: 'assistant',
		content: id,
		createdAt,
	}
}

test('prepends older messages while preserving chronological order', () => {
	const older = [createMessage('m1', 1), createMessage('m2', 2)]
	const current = [createMessage('m3', 3), createMessage('m4', 4)]

	const merged = mergeConversationMessagePages(older, current)

	assert.deepEqual(
		merged.map((message) => message.id),
		['m1', 'm2', 'm3', 'm4']
	)
})

test('deduplicates overlapping messages across pages', () => {
	const older = [createMessage('m1', 1), createMessage('m2', 2)]
	const current = [createMessage('m2', 2), createMessage('m3', 3)]

	const merged = mergeConversationMessagePages(older, current)

	assert.deepEqual(
		merged.map((message) => message.id),
		['m1', 'm2', 'm3']
	)
})
