import type { TaskOutcome } from '@/agent/domain/TaskOutcome'
import type {
	ActiveCommerceContext,
	ConversationMessage,
	PageContext,
	ResultCard,
} from '@/commerce/domain'

interface BuildActiveCommerceContextInput {
	currentPage: PageContext
	activeResultCard?: ResultCard
	recentConversationMessages?: ConversationMessage[]
	recentTaskOutcomes?: TaskOutcome[]
}

export function buildActiveCommerceContext({
	currentPage,
	activeResultCard,
	recentConversationMessages,
	recentTaskOutcomes,
}: BuildActiveCommerceContextInput): ActiveCommerceContext {
	return {
		currentPage,
		activeResultCard,
		recentConversationMessages,
		recentTaskOutcomes,
	}
}
