import type { InvokeResult, Message, Tool } from '@page-agent/llms'
import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node test runtime uses explicit .ts specifiers with strip-types.
import { routeTaskByLLM } from './routeTaskByLLM.ts'

test('returns the LLM-classified route with confidence and reason', async () => {
	let capturedMessages: Message[] | undefined
	let capturedTools: Record<string, Tool> | undefined

	const result = await routeTaskByLLM(
		{
			task: '帮我处理一下这个商品',
			contextPrompt: '<commerce_context>\nActive product title: Test\n</commerce_context>',
		},
		{
			abortSignal: new AbortController().signal,
			invoke: async (messages, tools): Promise<InvokeResult<any>> => {
				capturedMessages = messages
				capturedTools = tools

				return {
					toolCall: {
						name: 'decide_route',
						args: {
							intent: 'page_interaction',
							confidence: 0.91,
							reason: 'The user asked to manipulate the page directly.',
						},
					},
					toolResult: {
						intent: 'page_interaction',
						confidence: 0.91,
						reason: 'The user asked to manipulate the page directly.',
					},
					usage: {
						promptTokens: 10,
						completionTokens: 5,
						totalTokens: 15,
					},
				}
			},
		}
	)

	assert.equal(result.kind, 'page_interaction')
	assert.equal(result.confidence, 0.91)
	assert.equal(result.reason, 'The user asked to manipulate the page directly.')
	assert.ok(capturedMessages?.some((message) => message.role === 'system'))
	assert.ok(capturedMessages?.some((message) => message.role === 'user'))
	assert.deepEqual(Object.keys(capturedTools ?? {}), ['decide_route'])
})
