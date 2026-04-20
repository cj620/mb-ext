import type { ConversationMessage } from './ConversationMessage'
import type { ResultCard } from './ResultCard'
import type { SourcePlatform } from './SourcePlatform'

export interface PageContext {
	url: string
	title: string
	sourcePlatform: SourcePlatform
}

export interface ToolContext {
	currentPage: PageContext
	activeResultCardId?: string
	resultCards: ResultCard[]
	conversation: ConversationMessage[]
}
