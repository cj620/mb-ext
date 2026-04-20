import type { InvokeResult, Message, Tool } from '@page-agent/llms'
import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node test runtime uses explicit .ts specifiers with strip-types.
import { executeCommerceTextTask } from './executeCommerceTextTask.ts'

test('streams commerce text deltas before returning the final result', async () => {
	const streamedTexts: string[] = []

	const result = await executeCommerceTextTask(
		{
			task: '根据当前商品写5条卖点',
			contextPrompt: '<commerce_context>\nActive product title: Test\n</commerce_context>',
			onTextDelta: (text) => streamedTexts.push(text),
		},
		{
			abortSignal: new AbortController().signal,
			streamText: async (messages, abortSignal, onTextDelta) => {
				assert.equal(abortSignal.aborted, false)
				assert.ok(messages.some((message) => message.role === 'system'))
				assert.ok(messages.some((message) => message.role === 'user'))

				onTextDelta?.('卖点1')
				onTextDelta?.('卖点1\n卖点2')

				return {
					text: '卖点1\n卖点2',
					usage: {
						promptTokens: 10,
						completionTokens: 20,
						totalTokens: 30,
					},
					rawRequest: {
						stream: true,
					},
					rawResponse: {
						streamed: true,
					},
				}
			},
		}
	)

	assert.deepEqual(streamedTexts, ['卖点1', '卖点1\n卖点2'])
	assert.equal(result.success, true)
	assert.equal(result.data, '卖点1\n卖点2')
	assert.equal(result.history.length, 1)

	if (result.history[0]?.type !== 'step') {
		throw new Error('expected step event')
	}

	assert.equal(result.history[0].action.name, 'done')
	assert.equal(result.history[0].action.output, '卖点1\n卖点2')
	assert.deepEqual(result.history[0].rawRequest, { stream: true })
	assert.deepEqual(result.history[0].rawResponse, { streamed: true })
})

test('returns a done step event from the text-only executor', async () => {
	let capturedMessages: Message[] | undefined
	let capturedTools: Record<string, Tool> | undefined

	const result = await executeCommerceTextTask(
		{
			task: '根据当前商品写5条卖点',
			contextPrompt: '<commerce_context>\nActive product title: Test\n</commerce_context>',
		},
		{
			abortSignal: new AbortController().signal,
			invoke: async (
				messages,
				tools
			): Promise<InvokeResult<{ text: string; success: boolean }>> => {
				capturedMessages = messages
				capturedTools = tools

				return {
					toolCall: {
						name: 'done',
						args: {
							text: '卖点1\n卖点2',
							success: true,
						},
					},
					toolResult: {
						text: '卖点1\n卖点2',
						success: true,
					},
					usage: {
						promptTokens: 10,
						completionTokens: 20,
						totalTokens: 30,
					},
				}
			},
		}
	)

	assert.equal(result.success, true)
	assert.equal(result.data, '卖点1\n卖点2')
	assert.equal(result.history.length, 1)
	assert.equal(result.history[0]?.type, 'step')

	if (result.history[0]?.type !== 'step') {
		throw new Error('expected step event')
	}

	assert.equal(result.history[0].action.name, 'done')
	assert.equal(result.history[0].action.output, '卖点1\n卖点2')
	assert.ok(capturedMessages?.some((message) => message.role === 'system'))
	assert.ok(capturedMessages?.some((message) => message.role === 'user'))
	assert.deepEqual(Object.keys(capturedTools ?? {}), ['done'])
})
