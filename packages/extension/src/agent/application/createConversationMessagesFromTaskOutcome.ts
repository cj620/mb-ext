import type { ConversationMessageRecord } from '../domain/ConversationMessage'
import type { TaskOutcome } from '../domain/TaskOutcome'

export interface CreateConversationMessagesFromTaskOutcomeInput {
	conversationId: string
	taskOutcome: TaskOutcome
}

export function createConversationMessagesFromTaskOutcome({
	conversationId,
	taskOutcome,
}: CreateConversationMessagesFromTaskOutcomeInput): [
	ConversationMessageRecord,
	ConversationMessageRecord,
] {
	return [
		{
			id: `${taskOutcome.taskRunId}-user`,
			conversationId,
			role: 'user',
			content: taskOutcome.userIntent,
			createdAt: taskOutcome.createdAt,
			taskRunId: taskOutcome.taskRunId,
			routeKind: taskOutcome.routeKind,
			taskStatus: taskOutcome.status,
		},
		{
			id: `${taskOutcome.taskRunId}-assistant`,
			conversationId,
			role: 'assistant',
			content: taskOutcome.resultText,
			createdAt: taskOutcome.createdAt + 1,
			taskRunId: taskOutcome.taskRunId,
			routeKind: taskOutcome.routeKind,
			taskStatus: taskOutcome.status,
		},
	]
}
