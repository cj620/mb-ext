import type { InvokeOptions, InvokeResult, LLMConfig, Message, Tool } from '@page-agent/llms'
import * as z from 'zod/v4'

import type { CommerceTaskRouteKind } from '@/commerce/features/routeCommerceTask'

export interface RouteTaskByLLMInput {
	task: string
	contextPrompt?: string
	llmConfig?: LLMConfig
	systemInstruction?: string
}

export interface RouteTaskByLLMResult {
	kind: CommerceTaskRouteKind | 'ambiguous'
	confidence: number
	reason: string
}

export interface RouteTaskByLLMDeps {
	abortSignal: AbortSignal
	invoke?: (
		messages: Message[],
		tools: Record<string, Tool>,
		abortSignal: AbortSignal,
		options?: InvokeOptions
	) => Promise<InvokeResult<RouteTaskByLLMResult>>
}

const DECIDE_ROUTE_INPUT_SCHEMA = z.object({
	intent: z.enum(['commerce_text', 'page_interaction', 'ambiguous']),
	confidence: z.number().min(0).max(1),
	reason: z.string().min(1),
})

const LLM_ROUTER_SYSTEM_PROMPT = `
You are a task router for a commerce assistant.

Your only job is to classify the user's latest request.

Choose:
- commerce_text: the user wants explanation, summarization, copywriting, analysis, translation, or any direct text answer.
- page_interaction: the user wants the agent to manipulate the current page, click, search, fill, open, navigate, or otherwise operate the browser UI.
- ambiguous: the user's wording is too unclear to safely classify as page_interaction.

Routing policy:
- Be conservative about page_interaction.
- Only choose page_interaction when the request clearly requires direct browser manipulation.
- If the request could reasonably be answered in text from the current commerce context, prefer commerce_text.

Output rules:
- Always call the decide_route tool.
- Keep reason concise.
`.trim()

function buildMessages(input: RouteTaskByLLMInput): Message[] {
	const systemParts = [LLM_ROUTER_SYSTEM_PROMPT]

	if (input.systemInstruction?.trim()) {
		systemParts.push(input.systemInstruction.trim())
	}

	const userParts = [`Task: ${input.task.trim()}`]
	if (input.contextPrompt?.trim()) {
		userParts.push(input.contextPrompt.trim())
	}

	return [
		{
			role: 'system',
			content: systemParts.join('\n\n'),
		},
		{
			role: 'user',
			content: userParts.join('\n\n'),
		},
	]
}

export async function routeTaskByLLM(
	input: RouteTaskByLLMInput,
	deps: RouteTaskByLLMDeps
): Promise<RouteTaskByLLMResult> {
	const decideRouteTool: Tool<
		{ intent: RouteTaskByLLMResult['kind']; confidence: number; reason: string },
		RouteTaskByLLMResult
	> = {
		description: 'Classify the task as commerce_text, page_interaction, or ambiguous.',
		inputSchema: DECIDE_ROUTE_INPUT_SCHEMA,
		execute: async (args) => ({
			kind: args.intent,
			confidence: args.confidence,
			reason: args.reason,
		}),
	}

	const tools = { decide_route: decideRouteTool }
	const messages = buildMessages(input)
	const invoke =
		deps.invoke ??
		(await (async () => {
			if (!input.llmConfig) {
				throw new Error('LLM config is required for task routing')
			}

			const { LLM } = await import('@page-agent/llms')
			const llm = new LLM(input.llmConfig)
			return llm.invoke.bind(llm)
		})())

	const result = await invoke(messages, tools, deps.abortSignal, {
		toolChoiceName: 'decide_route',
	})

	const toolResult = result.toolResult as
		| RouteTaskByLLMResult
		| { intent: RouteTaskByLLMResult['kind']; confidence: number; reason: string }

	return {
		kind: 'kind' in toolResult ? toolResult.kind : toolResult.intent,
		confidence: toolResult.confidence,
		reason: toolResult.reason,
	}
}
