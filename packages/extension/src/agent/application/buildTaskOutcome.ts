import type { ExecutionResult } from '@page-agent/core'

import type { TaskOutcome, TaskOutcomeRouteKind } from '../domain/TaskOutcome'

export interface BuildTaskOutcomeInput {
	taskRunId: string
	routeKind: TaskOutcomeRouteKind
	task: string
	result: ExecutionResult
	facts?: string[]
	createdAt?: number
}

function normalizeFacts(facts?: string[]): string[] | undefined {
	if (!facts?.length) {
		return undefined
	}

	const normalized = Array.from(
		new Set(facts.map((fact) => fact.trim()).filter((fact) => fact.length > 0))
	)

	return normalized.length > 0 ? normalized : undefined
}

export function buildTaskOutcome(input: BuildTaskOutcomeInput): TaskOutcome {
	return {
		taskRunId: input.taskRunId,
		routeKind: input.routeKind,
		status: input.result.success ? 'completed' : 'error',
		userIntent: input.task.trim(),
		resultText: input.result.data.trim(),
		facts: normalizeFacts(input.facts),
		createdAt: input.createdAt ?? Date.now(),
	}
}
