import type { TaskOutcomeRouteKind, TaskOutcomeStatus } from './TaskOutcome'

export type ConversationMessageRole = 'user' | 'assistant' | 'system'

export interface ConversationMessageRecord {
	id: string
	conversationId: string
	role: ConversationMessageRole
	content: string
	createdAt: number
	taskRunId?: string
	routeKind?: TaskOutcomeRouteKind
	taskStatus?: TaskOutcomeStatus
}
