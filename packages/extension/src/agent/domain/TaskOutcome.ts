export type TaskOutcomeRouteKind = 'commerce_text' | 'page_interaction'

export type TaskOutcomeStatus = 'completed' | 'error'

export interface TaskOutcome {
	taskRunId: string
	routeKind: TaskOutcomeRouteKind
	status: TaskOutcomeStatus
	userIntent: string
	resultText: string
	facts?: string[]
	createdAt: number
}
