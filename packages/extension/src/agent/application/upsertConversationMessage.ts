import type { ConversationMessageRecord } from '../domain/ConversationMessage'

export function upsertConversationMessage(
	messages: ConversationMessageRecord[],
	message: ConversationMessageRecord
): ConversationMessageRecord[] {
	const existingIndex = messages.findIndex((current) => current.id === message.id)

	if (existingIndex < 0) {
		return [...messages, message]
	}

	return messages.map((current, index) => (index === existingIndex ? message : current))
}
