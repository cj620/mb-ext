import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node test runtime uses explicit .ts specifiers with strip-types.
import { getConversationTitle } from './getConversationTitle.ts'

test('uses the first user message as the conversation title', () => {
	const title = getConversationTitle('  根据当前商品写5条卖点  ')

	assert.equal(title, '根据当前商品写5条卖点')
})

test('truncates long conversation titles', () => {
	const title = getConversationTitle(
		'这是一个非常长的会话标题这是一个非常长的会话标题这是一个非常长的会话标题这是一个非常长的会话标题这是一个非常长的会话标题'
	)

	assert.equal(title.endsWith('...'), true)
	assert.equal(title.length <= 43, true)
})
