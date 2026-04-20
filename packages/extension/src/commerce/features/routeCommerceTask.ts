export type CommerceTaskRouteKind = 'commerce_text' | 'page_interaction'

export interface RouteCommerceTaskInput {
	task: string
	hasActiveProduct: boolean
}

export interface CommerceTaskRoute {
	kind: CommerceTaskRouteKind
	reason: string
	shouldUseLLMRouter: boolean
}

const PAGE_ACTION_PATTERNS = [
	/click/i,
	/open/i,
	/search/i,
	/find/i,
	/fill/i,
	/input/i,
	/type/i,
	/select/i,
	/scroll/i,
	/navigate/i,
	/go to/i,
	/点击/,
	/打开/,
	/搜索/,
	/查找/,
	/填写/,
	/输入/,
	/选择/,
	/滚动/,
	/跳转/,
]

const PAGE_TARGET_PATTERNS = [
	/page/i,
	/tab/i,
	/button/i,
	/link/i,
	/input/i,
	/form/i,
	/field/i,
	/dropdown/i,
	/cart/i,
	/browser/i,
	/页面/,
	/标签页/,
	/按钮/,
	/链接/,
	/输入框/,
	/表单/,
	/字段/,
	/下拉/,
	/购物车/,
	/浏览器/,
]

const COMMERCE_TEXT_PATTERNS = [
	/write/i,
	/rewrite/i,
	/generate/i,
	/create copy/i,
	/optimi[sz]e/i,
	/summarize/i,
	/translate/i,
	/sell(?:ing)? points?/i,
	/bullet points?/i,
	/title/i,
	/description/i,
	/卖点/,
	/文案/,
	/标题/,
	/描述/,
	/润色/,
	/改写/,
	/翻译/,
	/总结/,
	/分析/,
	/提炼/,
	/提取/,
	/人群/,
	/product information/i,
	/details?/i,
	/specs?/i,
	/what is/i,
	/how is/i,
	/information/i,
	/信息/,
	/具体信息/,
	/详情/,
	/参数/,
	/介绍/,
	/怎么样/,
	/是什么/,
]

export function routeCommerceTask(input: RouteCommerceTaskInput): CommerceTaskRoute {
	const task = input.task.trim()

	if (!input.hasActiveProduct || !task) {
		return {
			kind: 'page_interaction',
			reason: 'No active product context is available.',
			shouldUseLLMRouter: false,
		}
	}

	if (COMMERCE_TEXT_PATTERNS.some((pattern) => pattern.test(task))) {
		return {
			kind: 'commerce_text',
			reason: 'Matched an explicit commerce text intent.',
			shouldUseLLMRouter: false,
		}
	}

	const hasPageAction = PAGE_ACTION_PATTERNS.some((pattern) => pattern.test(task))
	const hasPageTarget = PAGE_TARGET_PATTERNS.some((pattern) => pattern.test(task))

	if (hasPageAction && hasPageTarget) {
		return {
			kind: 'page_interaction',
			reason: 'Matched an explicit page action with a concrete page target.',
			shouldUseLLMRouter: false,
		}
	}

	return {
		kind: 'commerce_text',
		reason: 'No explicit page action target was found; requires LLM disambiguation.',
		shouldUseLLMRouter: true,
	}
}
