import type { TaskOutcome } from '@/agent/domain/TaskOutcome'
import type { ConversationMessage } from '@/commerce/domain'

export interface CommerceConversationContext {
	scopeKey?: string
	messages: ConversationMessage[]
	outcomes: TaskOutcome[]
}

export interface UpdateCommerceConversationContextInput {
	scopeKey: string
	taskOutcome: TaskOutcome
}

const MAX_CONVERSATION_MESSAGES = 6
const MAX_TASK_OUTCOMES = 3

export function updateCommerceConversationContext(
	context: CommerceConversationContext,
	input: UpdateCommerceConversationContextInput
): CommerceConversationContext {
	const nextMessages: ConversationMessage[] = [
		{
			id: `${input.taskOutcome.taskRunId}-user`,
			role: 'user',
			content: input.taskOutcome.userIntent,
			createdAt: input.taskOutcome.createdAt,
		},
		{
			id: `${input.taskOutcome.taskRunId}-assistant`,
			role: 'assistant',
			content: input.taskOutcome.resultText,
			createdAt: input.taskOutcome.createdAt + 1,
		},
	]

	const isSameScope = context.scopeKey === input.scopeKey
	const baseMessages = isSameScope ? context.messages : []
	const baseOutcomes = isSameScope ? context.outcomes : []

	return {
		scopeKey: input.scopeKey,
		messages: [...baseMessages, ...nextMessages].slice(-MAX_CONVERSATION_MESSAGES),
		outcomes: [...baseOutcomes, input.taskOutcome].slice(-MAX_TASK_OUTCOMES),
	}
}
