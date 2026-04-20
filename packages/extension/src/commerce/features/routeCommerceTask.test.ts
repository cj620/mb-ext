import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node test runtime uses explicit .ts specifiers with strip-types.
import { routeCommerceTask } from './routeCommerceTask.ts'

test('routes product copywriting requests to commerce_text when an active product exists', () => {
	const route = routeCommerceTask({
		task: '根据当前商品写5条卖点',
		hasActiveProduct: true,
	})

	assert.equal(route.kind, 'commerce_text')
	assert.equal(route.shouldUseLLMRouter, false)
})

test('keeps explicit page actions on the generic page_interaction path', () => {
	const route = routeCommerceTask({
		task: '点击加入购物车按钮',
		hasActiveProduct: true,
	})

	assert.equal(route.kind, 'page_interaction')
	assert.equal(route.shouldUseLLMRouter, false)
})

test('falls back to page_interaction when no active product is available', () => {
	const route = routeCommerceTask({
		task: '根据当前商品写5条卖点',
		hasActiveProduct: false,
	})

	assert.equal(route.kind, 'page_interaction')
	assert.equal(route.shouldUseLLMRouter, false)
})

test('routes title optimization requests to commerce_text without explicit page targets', () => {
	const route = routeCommerceTask({
		task: '帮我优化这个商品标题',
		hasActiveProduct: true,
	})

	assert.equal(route.kind, 'commerce_text')
	assert.equal(route.shouldUseLLMRouter, false)
})

test('routes product analysis requests to commerce_text', () => {
	const route = routeCommerceTask({
		task: '分析一下当前商品的核心卖点和目标人群',
		hasActiveProduct: true,
	})

	assert.equal(route.kind, 'commerce_text')
	assert.equal(route.shouldUseLLMRouter, false)
})

test('requires both an action and a page target for page_interaction', () => {
	const route = routeCommerceTask({
		task: '打开更吸引人的标题思路',
		hasActiveProduct: true,
	})

	assert.equal(route.kind, 'commerce_text')
	assert.equal(route.shouldUseLLMRouter, false)
})

test('keeps page search requests on the page_interaction path', () => {
	const route = routeCommerceTask({
		task: '在页面里搜索蓝牙耳机',
		hasActiveProduct: true,
	})

	assert.equal(route.kind, 'page_interaction')
	assert.equal(route.shouldUseLLMRouter, false)
})

test('routes product information questions to commerce_text', () => {
	const route = routeCommerceTask({
		task: '这个商品的具体信息是怎么样的',
		hasActiveProduct: true,
	})

	assert.equal(route.kind, 'commerce_text')
	assert.equal(route.shouldUseLLMRouter, false)
})

test('defaults ambiguous product-scoped requests to commerce_text when an active product exists', () => {
	const route = routeCommerceTask({
		task: '帮我处理一下这个商品',
		hasActiveProduct: true,
	})

	assert.equal(route.kind, 'commerce_text')
	assert.equal(route.shouldUseLLMRouter, true)
})
