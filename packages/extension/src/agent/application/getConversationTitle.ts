const MAX_TITLE_LENGTH = 40

export function getConversationTitle(input: string): string {
	const normalized = input.trim() || 'New conversation'

	if (normalized.length <= MAX_TITLE_LENGTH) {
		return normalized
	}

	return `${normalized.slice(0, MAX_TITLE_LENGTH).trimEnd()}...`
}
