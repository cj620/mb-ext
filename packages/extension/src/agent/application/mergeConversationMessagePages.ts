import type { ConversationMessageRecord } from '../domain/ConversationMessage'

export function mergeConversationMessagePages(
	olderMessages: ConversationMessageRecord[],
	currentMessages: ConversationMessageRecord[]
): ConversationMessageRecord[] {
	const seen = new Set<string>()
	const merged: ConversationMessageRecord[] = []

	for (const message of [...olderMessages, ...currentMessages]) {
		if (seen.has(message.id)) continue
		seen.add(message.id)
		merged.push(message)
	}

	return merged
}
