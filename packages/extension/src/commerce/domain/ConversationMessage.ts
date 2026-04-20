export type ConversationMessageRole = 'user' | 'assistant' | 'system'

export interface ConversationMessage {
	id: string
	role: ConversationMessageRole
	content: string
	createdAt: number
}
