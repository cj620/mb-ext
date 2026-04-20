import type { HistoricalEvent } from '@page-agent/core'
import { type DBSchema, type IDBPDatabase, openDB } from 'idb'

import { getConversationTitle } from '@/agent/application/getConversationTitle'
import type { ConversationRecord } from '@/agent/domain/Conversation'
import type { ConversationMessageRecord } from '@/agent/domain/ConversationMessage'

const DB_NAME = 'page-agent-ext'
const DB_VERSION = 2

export interface SessionRecord {
	id: string
	task: string
	history: HistoricalEvent[]
	status: 'completed' | 'error'
	createdAt: number
}

interface PageAgentDB extends DBSchema {
	sessions: {
		key: string
		value: SessionRecord
		indexes: { 'by-created': number }
	}
	conversations: {
		key: string
		value: ConversationRecord
		indexes: { 'by-updated': number }
	}
	conversationMessages: {
		key: string
		value: ConversationMessageRecord
		indexes: { 'by-conversation-created': [string, number] }
	}
}

export interface ConversationMessagesPage {
	messages: ConversationMessageRecord[]
	hasMore: boolean
	oldestCreatedAt?: number
}

let dbPromise: Promise<IDBPDatabase<PageAgentDB>> | null = null

function getDB() {
	if (!dbPromise) {
		dbPromise = openDB<PageAgentDB>(DB_NAME, DB_VERSION, {
			upgrade(db, oldVersion) {
				if (oldVersion < 1 && !db.objectStoreNames.contains('sessions')) {
					const store = db.createObjectStore('sessions', { keyPath: 'id' })
					store.createIndex('by-created', 'createdAt')
				}

				if (oldVersion < 2) {
					if (!db.objectStoreNames.contains('conversations')) {
						const store = db.createObjectStore('conversations', { keyPath: 'id' })
						store.createIndex('by-updated', 'updatedAt')
					}

					if (!db.objectStoreNames.contains('conversationMessages')) {
						const store = db.createObjectStore('conversationMessages', { keyPath: 'id' })
						store.createIndex('by-conversation-created', ['conversationId', 'createdAt'])
					}
				}
			},
		})
	}
	return dbPromise
}

export async function saveSession(
	session: Omit<SessionRecord, 'id' | 'createdAt'>
): Promise<SessionRecord> {
	const db = await getDB()
	const record: SessionRecord = {
		...session,
		id: crypto.randomUUID(),
		createdAt: Date.now(),
	}
	await db.put('sessions', record)
	return record
}

/** List sessions, newest first */
export async function listSessions(): Promise<SessionRecord[]> {
	const db = await getDB()
	const all = await db.getAllFromIndex('sessions', 'by-created')
	return all.reverse()
}

export async function getSession(id: string): Promise<SessionRecord | undefined> {
	const db = await getDB()
	return db.get('sessions', id)
}

export async function deleteSession(id: string): Promise<void> {
	const db = await getDB()
	await db.delete('sessions', id)
}

export async function clearSessions(): Promise<void> {
	const db = await getDB()
	await db.clear('sessions')
}

export async function createConversation(title = 'New conversation'): Promise<ConversationRecord> {
	const db = await getDB()
	const now = Date.now()
	const record: ConversationRecord = {
		id: crypto.randomUUID(),
		title,
		createdAt: now,
		updatedAt: now,
	}
	await db.put('conversations', record)
	return record
}

export async function listConversations(): Promise<ConversationRecord[]> {
	const db = await getDB()
	const all = await db.getAllFromIndex('conversations', 'by-updated')
	return all.reverse()
}

export async function getConversation(id: string): Promise<ConversationRecord | undefined> {
	const db = await getDB()
	return db.get('conversations', id)
}

export async function getOrCreateLatestConversation(): Promise<ConversationRecord> {
	const conversations = await listConversations()
	if (conversations.length > 0) {
		return conversations[0]
	}

	return createConversation()
}

export async function listConversationMessages(
	conversationId: string
): Promise<ConversationMessageRecord[]> {
	const db = await getDB()
	return db.getAllFromIndex(
		'conversationMessages',
		'by-conversation-created',
		IDBKeyRange.bound(
			[conversationId, 0] as [string, number],
			[conversationId, Number.MAX_SAFE_INTEGER] as [string, number]
		)
	)
}

export async function listConversationMessagesPage(
	conversationId: string,
	options: {
		beforeCreatedAt?: number
		limit?: number
	} = {}
): Promise<ConversationMessagesPage> {
	const db = await getDB()
	const limit = Math.max(1, options.limit ?? 100)
	const upperBound =
		options.beforeCreatedAt == null
			? Number.MAX_SAFE_INTEGER
			: Math.max(0, options.beforeCreatedAt - 1)
	const range = IDBKeyRange.bound(
		[conversationId, 0] as [string, number],
		[conversationId, upperBound] as [string, number]
	)
	const index = db.transaction('conversationMessages').store.index('by-conversation-created')
	const messages: ConversationMessageRecord[] = []
	let cursor = await index.openCursor(range, 'prev')

	while (cursor && messages.length < limit) {
		messages.push(cursor.value)
		cursor = await cursor.continue()
	}

	return {
		messages: messages.reverse(),
		hasMore: cursor !== null,
		oldestCreatedAt: messages.length > 0 ? messages[0]!.createdAt : undefined,
	}
}

export async function saveConversationMessages(
	conversationId: string,
	messages: ConversationMessageRecord[]
): Promise<ConversationMessageRecord[]> {
	const db = await getDB()
	const conversation = await getConversation(conversationId)
	if (!conversation) {
		throw new Error(`Conversation not found: ${conversationId}`)
	}

	const transaction = db.transaction(['conversations', 'conversationMessages'], 'readwrite')

	for (const message of messages) {
		await transaction.objectStore('conversationMessages').put(message)
	}

	const userMessage = messages.find((message) => message.role === 'user')
	const assistantMessage =
		[...messages].reverse().find((message) => message.role === 'assistant') ??
		messages[messages.length - 1]
	const nextTitle =
		conversation.title === 'New conversation' && userMessage
			? getConversationTitle(userMessage.content)
			: conversation.title

	await transaction.objectStore('conversations').put({
		...conversation,
		title: nextTitle,
		updatedAt: messages[messages.length - 1]?.createdAt ?? Date.now(),
		lastMessagePreview: assistantMessage?.content.slice(0, 120),
	})

	await transaction.done
	return messages
}

export async function deleteConversation(id: string): Promise<void> {
	const db = await getDB()
	const messages = await listConversationMessages(id)
	const transaction = db.transaction(['conversations', 'conversationMessages'], 'readwrite')

	for (const message of messages) {
		await transaction.objectStore('conversationMessages').delete(message.id)
	}

	await transaction.objectStore('conversations').delete(id)
	await transaction.done
}

export async function clearConversations(): Promise<void> {
	const db = await getDB()
	const transaction = db.transaction(['conversations', 'conversationMessages'], 'readwrite')
	await transaction.objectStore('conversations').clear()
	await transaction.objectStore('conversationMessages').clear()
	await transaction.done
}
