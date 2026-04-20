import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node test runtime uses explicit .ts specifiers with strip-types.
import { resolveCommerceTaskRoute } from './resolveCommerceTaskRoute.ts'

test('keeps explicit rule-based routes without calling the LLM router', async () => {
	let called = false

	const result = await resolveCommerceTaskRoute(
		{
			task: '点击加入购物车按钮',
			hasActiveProduct: true,
		},
		{
			routeByLLM: async () => {
				called = true
				throw new Error('should not be called')
			},
		}
	)

	assert.equal(result.kind, 'page_interaction')
	assert.equal(result.source, 'rule')
	assert.equal(called, false)
})

test('uses the LLM router for uncertain routes', async () => {
	const result = await resolveCommerceTaskRoute(
		{
			task: '帮我处理一下这个商品',
			hasActiveProduct: true,
			contextPrompt: '<commerce_context />',
			llmConfig: {
				baseURL: 'https://example.com',
				model: 'test-model',
			},
		},
		{
			routeByLLM: async () => ({
				kind: 'page_interaction',
				confidence: 0.88,
				reason: 'Direct manipulation requested.',
			}),
		}
	)

	assert.equal(result.kind, 'page_interaction')
	assert.equal(result.source, 'llm')
})

test('falls back to commerce_text when the LLM router is low confidence', async () => {
	const result = await resolveCommerceTaskRoute(
		{
			task: '帮我处理一下这个商品',
			hasActiveProduct: true,
			contextPrompt: '<commerce_context />',
			llmConfig: {
				baseURL: 'https://example.com',
				model: 'test-model',
			},
		},
		{
			routeByLLM: async () => ({
				kind: 'page_interaction',
				confidence: 0.42,
				reason: 'Unclear whether page action is needed.',
			}),
		}
	)

	assert.equal(result.kind, 'commerce_text')
	assert.equal(result.source, 'fallback')
})
