import type { LLMConfig } from '@page-agent/llms'

import type { RouteTaskByLLMResult } from '../runtime/router/routeTaskByLLM'
import type { CommerceTaskRoute, RouteCommerceTaskInput } from './routeCommerceTask'

export interface ResolveCommerceTaskRouteInput extends RouteCommerceTaskInput {
	contextPrompt?: string
	llmConfig?: LLMConfig
	systemInstruction?: string
	abortSignal?: AbortSignal
}

export interface ResolvedCommerceTaskRoute extends CommerceTaskRoute {
	source: 'rule' | 'llm' | 'fallback'
	confidence?: number
}

export interface ResolveCommerceTaskRouteDeps {
	routeByRule?: (input: RouteCommerceTaskInput) => CommerceTaskRoute
	routeByLLM?: (input: {
		task: string
		contextPrompt?: string
		llmConfig?: LLMConfig
		systemInstruction?: string
		abortSignal: AbortSignal
	}) => Promise<RouteTaskByLLMResult>
}

const PAGE_INTERACTION_CONFIDENCE_THRESHOLD = 0.7
const COMMERCE_TEXT_CONFIDENCE_THRESHOLD = 0.5

function toResolvedRuleRoute(route: CommerceTaskRoute): ResolvedCommerceTaskRoute {
	return {
		...route,
		source: 'rule',
	}
}

export async function resolveCommerceTaskRoute(
	input: ResolveCommerceTaskRouteInput,
	deps: ResolveCommerceTaskRouteDeps = {}
): Promise<ResolvedCommerceTaskRoute> {
	const routeByRule =
		deps.routeByRule ??
		// @ts-expect-error Node test runtime uses explicit .ts specifiers with strip-types.
		(await import('./routeCommerceTask.ts')).routeCommerceTask
	const ruleRoute = routeByRule(input)
	if (!ruleRoute.shouldUseLLMRouter) {
		return toResolvedRuleRoute(ruleRoute)
	}

	if (!input.llmConfig) {
		return {
			...ruleRoute,
			source: 'fallback',
			reason: 'LLM router was unavailable, so the default commerce_text route was kept.',
		}
	}

	const routeByLLM =
		deps.routeByLLM ??
		(async (llmInput) => {
			// @ts-expect-error Node test runtime uses explicit .ts specifiers with strip-types.
			const { routeTaskByLLM } = await import('../runtime/router/routeTaskByLLM.ts')
			return routeTaskByLLM(llmInput, { abortSignal: llmInput.abortSignal })
		})
	const abortSignal = input.abortSignal ?? new AbortController().signal
	const llmRoute = await routeByLLM({
		task: input.task,
		contextPrompt: input.contextPrompt,
		llmConfig: input.llmConfig,
		systemInstruction: input.systemInstruction,
		abortSignal,
	})

	if (
		llmRoute.kind === 'page_interaction' &&
		llmRoute.confidence >= PAGE_INTERACTION_CONFIDENCE_THRESHOLD
	) {
		return {
			kind: 'page_interaction',
			reason: llmRoute.reason,
			shouldUseLLMRouter: false,
			source: 'llm',
			confidence: llmRoute.confidence,
		}
	}

	if (
		llmRoute.kind === 'commerce_text' &&
		llmRoute.confidence >= COMMERCE_TEXT_CONFIDENCE_THRESHOLD
	) {
		return {
			kind: 'commerce_text',
			reason: llmRoute.reason,
			shouldUseLLMRouter: false,
			source: 'llm',
			confidence: llmRoute.confidence,
		}
	}

	return {
		kind: 'commerce_text',
		reason: llmRoute.reason,
		shouldUseLLMRouter: false,
		source: 'fallback',
		confidence: llmRoute.confidence,
	}
}
