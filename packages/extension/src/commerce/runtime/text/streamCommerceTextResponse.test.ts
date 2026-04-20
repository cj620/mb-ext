import type { Message } from '@page-agent/llms'
import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node test runtime uses explicit .ts specifiers with strip-types.
import { streamCommerceTextResponse } from './streamCommerceTextResponse.ts'

test('parses text deltas from chat completions SSE stream', async () => {
	const deltas: string[] = []
	const capturedRequests: { url: string; init?: RequestInit }[] = []
	const encoder = new TextEncoder()
	const messages: Message[] = [
		{ role: 'system', content: 'You are a commerce writing assistant.' },
		{ role: 'user', content: '根据当前商品写5条卖点' },
	]

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"卖点1"}}]}\n\n'))
			controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"\\n卖点2"}}]}\n\n'))
			controller.enqueue(
				encoder.encode(
					'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":11,"completion_tokens":7,"total_tokens":18}}\n\n'
				)
			)
			controller.enqueue(encoder.encode('data: [DONE]\n\n'))
			controller.close()
		},
	})

	const result = await streamCommerceTextResponse({
		llmConfig: {
			baseURL: 'https://example.com',
			model: 'gpt-5-mini',
			apiKey: 'test-key',
			customFetch: async (url, init) => {
				const requestUrl = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
				capturedRequests.push({ url: requestUrl, init })
				return new Response(stream, {
					status: 200,
					headers: { 'Content-Type': 'text/event-stream' },
				})
			},
		},
		messages,
		abortSignal: new AbortController().signal,
		onTextDelta: (text) => deltas.push(text),
	})

	assert.deepEqual(deltas, ['卖点1', '卖点1\n卖点2'])
	assert.equal(result.text, '卖点1\n卖点2')
	assert.deepEqual(result.usage, {
		promptTokens: 11,
		completionTokens: 7,
		totalTokens: 18,
		cachedTokens: undefined,
		reasoningTokens: undefined,
	})
	assert.equal(capturedRequests.length, 1)
	assert.equal(capturedRequests[0]?.url, 'https://example.com/chat/completions')
	assert.equal(capturedRequests[0]?.init?.method, 'POST')
	const headers = new Headers(capturedRequests[0]?.init?.headers)
	assert.equal(headers.get('authorization'), 'Bearer test-key')

	const requestBody = capturedRequests[0]?.init?.body
	if (typeof requestBody !== 'string') {
		throw new Error('expected request body to be a JSON string')
	}
	const body = JSON.parse(requestBody)
	assert.equal(body.stream, true)
	assert.equal(body.messages[0]?.role, 'system')
	assert.equal(body.messages[1]?.role, 'user')
})
