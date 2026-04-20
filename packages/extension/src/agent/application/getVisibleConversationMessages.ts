import type { ConversationMessageRecord } from '../domain/ConversationMessage'

export interface VisibleConversationMessagesResult {
	messages: ConversationMessageRecord[]
	hasMore: boolean
	hiddenCount: number
}

export function getVisibleConversationMessages(
	messages: ConversationMessageRecord[],
	visibleCount: number
): VisibleConversationMessagesResult {
	const normalizedVisibleCount = Math.max(0, visibleCount)
	const visibleMessages = messages.slice(-normalizedVisibleCount)
	const hiddenCount = Math.max(0, messages.length - visibleMessages.length)

	return {
		messages: visibleMessages,
		hasMore: hiddenCount > 0,
		hiddenCount,
	}
}
