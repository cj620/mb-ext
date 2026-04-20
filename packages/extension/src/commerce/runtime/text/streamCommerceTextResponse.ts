import type { InvokeResult, LLMConfig, Message } from '@page-agent/llms'

export interface StreamCommerceTextResponseInput {
	llmConfig: LLMConfig
	messages: Message[]
	abortSignal: AbortSignal
	onTextDelta?: (text: string) => void
}

export interface StreamCommerceTextResponseResult {
	text: string
	usage: InvokeResult['usage']
	rawRequest: Record<string, unknown>
	rawResponse: {
		streamed: true
		events: unknown[]
	}
}

export async function streamCommerceTextResponse(
	input: StreamCommerceTextResponseInput
): Promise<StreamCommerceTextResponseResult> {
	const config = {
		baseURL: input.llmConfig.baseURL,
		model: input.llmConfig.model,
		apiKey: input.llmConfig.apiKey ?? '',
		temperature: input.llmConfig.temperature,
		customFetch: (input.llmConfig.customFetch ?? fetch).bind(globalThis),
	}
	const requestBody: Record<string, unknown> = {
		model: config.model,
		temperature: config.temperature,
		messages: input.messages,
		stream: true,
		stream_options: {
			include_usage: true,
		},
	}

	patchStreamRequestBody(requestBody)

	let response: Response
	try {
		response = await config.customFetch(`${config.baseURL}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
			},
			body: JSON.stringify(requestBody),
			signal: input.abortSignal,
		})
	} catch (error: unknown) {
		const isAbortError = (error as any)?.name === 'AbortError'
		const errorMessage = isAbortError ? 'Network request aborted' : 'Network request failed'
		if (!isAbortError) console.error(error)
		throw new Error(errorMessage, { cause: error })
	}

	if (!response.ok) {
		const errorData = await response.json().catch(() => undefined)
		const errorMessage =
			(errorData as { error?: { message?: string } } | undefined)?.error?.message ??
			response.statusText

		if (response.status === 401 || response.status === 403) {
			throw new Error(`Authentication failed: ${errorMessage}`, { cause: errorData })
		}
		if (response.status === 429) {
			throw new Error(`Rate limit exceeded: ${errorMessage}`, { cause: errorData })
		}
		if (response.status >= 500) {
			throw new Error(`Server error: ${errorMessage}`, { cause: errorData })
		}
		throw new Error(`HTTP ${response.status}: ${errorMessage}`, { cause: errorData })
	}

	if (!response.body) {
		throw new Error('Missing response body for stream')
	}

	const reader = response.body.getReader()
	const decoder = new TextDecoder()
	const events: unknown[] = []
	let buffer = ''
	let text = ''
	const usage: InvokeResult['usage'] = {
		promptTokens: 0,
		completionTokens: 0,
		totalTokens: 0,
	}

	const flushEventBlock = (block: string) => {
		const dataLines = block
			.split('\n')
			.filter((line) => line.startsWith('data:'))
			.map((line) => line.slice(5).trim())

		if (dataLines.length === 0) {
			return false
		}

		const payload = dataLines.join('\n')
		if (!payload || payload === '[DONE]') {
			return payload === '[DONE]'
		}

		const event = JSON.parse(payload) as {
			choices?: { delta?: { content?: string | null } }[]
			usage?: {
				prompt_tokens?: number
				completion_tokens?: number
				total_tokens?: number
				prompt_tokens_details?: { cached_tokens?: number }
				completion_tokens_details?: { reasoning_tokens?: number }
			}
		}

		events.push(event)

		const deltaText = event.choices?.[0]?.delta?.content
		if (deltaText) {
			text += deltaText
			input.onTextDelta?.(text)
		}

		if (event.usage) {
			usage.promptTokens = event.usage.prompt_tokens ?? usage.promptTokens
			usage.completionTokens = event.usage.completion_tokens ?? usage.completionTokens
			usage.totalTokens = event.usage.total_tokens ?? usage.totalTokens
			usage.cachedTokens = event.usage.prompt_tokens_details?.cached_tokens
			usage.reasoningTokens = event.usage.completion_tokens_details?.reasoning_tokens
		}

		return false
	}

	while (true) {
		const { done, value } = await reader.read()
		buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })

		let separatorIndex = buffer.indexOf('\n\n')
		while (separatorIndex >= 0) {
			const block = buffer.slice(0, separatorIndex)
			buffer = buffer.slice(separatorIndex + 2)
			const sawDone = flushEventBlock(block)
			if (sawDone) {
				return {
					text,
					usage,
					rawRequest: requestBody,
					rawResponse: {
						streamed: true,
						events,
					},
				}
			}
			separatorIndex = buffer.indexOf('\n\n')
		}

		if (done) {
			break
		}
	}

	if (buffer.trim()) {
		flushEventBlock(buffer.trim())
	}

	return {
		text,
		usage,
		rawRequest: requestBody,
		rawResponse: {
			streamed: true,
			events,
		},
	}
}

function patchStreamRequestBody(body: Record<string, unknown>) {
	const model = normalizeModelName(typeof body.model === 'string' ? body.model : '')
	if (!model) return

	if (model.startsWith('qwen')) {
		body.temperature = Math.max(Number(body.temperature ?? 0), 1)
		body.enable_thinking = false
	}

	if (model.startsWith('claude')) {
		body.thinking = { type: 'disabled' }
	}

	if (model.startsWith('grok')) {
		body.thinking = { type: 'disabled', effort: 'minimal' }
		body.reasoning = { enabled: false, effort: 'low' }
	}

	if (model.startsWith('gpt')) {
		body.verbosity = 'low'

		if (model.startsWith('gpt-52') || model.startsWith('gpt-51')) {
			body.reasoning_effort = 'none'
		} else if (model.startsWith('gpt-54')) {
			delete body.reasoning_effort
		} else if (model.startsWith('gpt-5-mini')) {
			body.reasoning_effort = 'low'
			body.temperature = 1
		} else if (model.startsWith('gpt-5')) {
			body.reasoning_effort = 'low'
		}
	}

	if (model.startsWith('gemini')) {
		body.reasoning_effort = 'minimal'
	}

	if (model.startsWith('minimax')) {
		body.temperature = Math.max(Number(body.temperature ?? 0), 0.01)
		if (Number(body.temperature) > 1) {
			body.temperature = 1
		}
	}
}

function normalizeModelName(modelName: string): string {
	let normalizedName = modelName.toLowerCase()
	if (normalizedName.includes('/')) {
		normalizedName = normalizedName.split('/')[1] ?? normalizedName
	}

	return normalizedName.replace(/_/g, '').replace(/\./g, '')
}
