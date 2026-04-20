import type { TaskOutcome } from '@/agent/domain/TaskOutcome'

import type { ConversationMessage } from './ConversationMessage'
import type { ResultCard } from './ResultCard'
import type { PageContext } from './ToolContext'

export interface ActiveCommerceContext {
	currentPage: PageContext
	activeResultCard?: ResultCard
	recentConversationMessages?: ConversationMessage[]
	recentTaskOutcomes?: TaskOutcome[]
}
