import type { ExecutionResult } from '@page-agent/core'
import type { InvokeOptions, InvokeResult, LLMConfig, Message, Tool } from '@page-agent/llms'
import * as z from 'zod/v4'

export interface ExecuteCommerceTextTaskInput {
	task: string
	contextPrompt?: string
	llmConfig?: LLMConfig
	systemInstruction?: string
	onTextDelta?: (text: string) => void
}

export interface ExecuteCommerceTextTaskDeps {
	abortSignal: AbortSignal
	invoke?: (
		messages: Message[],
		tools: Record<string, Tool>,
		abortSignal: AbortSignal,
		options?: InvokeOptions
	) => Promise<InvokeResult<{ text: string; success: boolean }>>
	streamText?: (
		messages: Message[],
		abortSignal: AbortSignal,
		onTextDelta?: (text: string) => void
	) => Promise<{
		text: string
		usage: InvokeResult['usage']
		rawRequest?: unknown
		rawResponse?: unknown
	}>
}

const DONE_INPUT_SCHEMA = z.object({
	text: z.string().min(1),
	success: z.boolean().default(true),
})

const COMMERCE_TEXT_SYSTEM_PROMPT = `
You are a commerce writing assistant.

Responsibilities:
- Answer the user's commerce writing request directly.
- Use the provided commerce context when it is relevant.
- Stay in text mode only. Never browse, click, search, scroll, navigate, or describe page actions.
- If the task is underspecified, make a reasonable best-effort answer from the available product context.

Output rules:
- Always respond by calling the done tool.
- Put the full user-facing answer in done.text.
- Set done.success to true unless the request cannot be completed.
`.trim()

function buildMessages(input: ExecuteCommerceTextTaskInput): Message[] {
	const systemParts = [COMMERCE_TEXT_SYSTEM_PROMPT]

	if (input.systemInstruction?.trim()) {
		systemParts.push(input.systemInstruction.trim())
	}

	const userParts = [input.task.trim()]
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

export async function executeCommerceTextTask(
	input: ExecuteCommerceTextTaskInput,
	deps: ExecuteCommerceTextTaskDeps
): Promise<ExecutionResult> {
	const doneTool: Tool<{ text: string; success: boolean }, { text: string; success: boolean }> = {
		description: 'Return the final text answer for this commerce task.',
		inputSchema: DONE_INPUT_SCHEMA,
		execute: async (args) => args,
	}

	const tools = { done: doneTool }
	const messages = buildMessages(input)
	let doneResult: { text: string; success: boolean }
	let usage: InvokeResult['usage']
	let rawRequest: unknown
	let rawResponse: unknown

	if (deps.streamText) {
		const result = await deps.streamText(messages, deps.abortSignal, input.onTextDelta)
		doneResult = {
			text: result.text,
			success: true,
		}
		usage = result.usage
		rawRequest = result.rawRequest
		rawResponse = result.rawResponse
	} else if (input.llmConfig) {
		// @ts-expect-error Dynamic .ts import keeps Node strip-types tests resolvable without
		// changing the extension build tsconfig.
		const { streamCommerceTextResponse } = await import('./streamCommerceTextResponse.ts')
		const result = await streamCommerceTextResponse({
			llmConfig: input.llmConfig,
			messages,
			abortSignal: deps.abortSignal,
			onTextDelta: input.onTextDelta,
		})
		doneResult = {
			text: result.text,
			success: true,
		}
		usage = result.usage
		rawRequest = result.rawRequest
		rawResponse = result.rawResponse
	} else {
		const invoke =
			deps.invoke ??
			(await (async () => {
				throw new Error('LLM config is required for commerce text execution')
			})())

		const result = await invoke(messages, tools, deps.abortSignal, {
			toolChoiceName: 'done',
		})

		doneResult = result.toolResult as { text: string; success: boolean }
		usage = result.usage
		rawRequest = result.rawRequest
		rawResponse = result.rawResponse
	}

	return {
		success: doneResult.success,
		data: doneResult.text,
		history: [
			{
				type: 'step',
				stepIndex: 0,
				reflection: {
					evaluation_previous_goal: 'Prepared the final commerce response.',
					memory: input.contextPrompt?.trim()
						? 'Used the active commerce context attached to this request.'
						: 'No commerce context was attached to this request.',
					next_goal: 'Return the final answer to the user.',
				},
				action: {
					name: 'done',
					input: doneResult,
					output: doneResult.text,
				},
				usage,
				rawRequest,
				rawResponse,
			},
		],
	}
}
