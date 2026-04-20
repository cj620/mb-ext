import { ArrowLeft, History, MessageSquarePlus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type { ConversationRecord } from '@/agent/domain/Conversation'
import { Button } from '@/components/ui/button'
import {
	clearConversations,
	createConversation,
	deleteConversation,
	listConversations,
} from '@/lib/db'

function timeAgo(ts: number): string {
	const seconds = Math.floor((Date.now() - ts) / 1000)
	if (seconds < 60) return 'just now'
	const minutes = Math.floor(seconds / 60)
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}h ago`
	const days = Math.floor(hours / 24)
	return `${days}d ago`
}

export function HistoryList({
	activeConversationId,
	onSelect,
	onBack,
}: {
	activeConversationId?: string
	onSelect: (id: string) => void
	onBack: () => void
}) {
	const [conversations, setConversations] = useState<ConversationRecord[]>([])
	const [loading, setLoading] = useState(true)

	const load = useCallback(async () => {
		try {
			setConversations(await listConversations())
		} catch (err) {
			console.error('[HistoryList] Failed to load sessions:', err)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		load()
	}, [load])

	const handleDelete = async (e: React.MouseEvent, id: string) => {
		e.stopPropagation()
		await deleteConversation(id)
		setConversations((prev) => {
			const remaining = prev.filter((conversation) => conversation.id !== id)

			if (id === activeConversationId) {
				if (remaining[0]) {
					onSelect(remaining[0].id)
				} else {
					void createConversation().then((conversation) => {
						setConversations([conversation])
						onSelect(conversation.id)
					})
				}
			}

			return remaining
		})
	}

	return (
		<div className="flex flex-col h-screen bg-background">
			{/* Header */}
			<header className="flex items-center gap-2 border-b px-3 py-2">
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onBack}
					className="cursor-pointer"
					aria-label="Back"
					title="Back"
				>
					<ArrowLeft className="size-3.5" />
				</Button>
				<span className="text-sm font-medium flex-1">Conversations</span>
				<Button
					variant="ghost"
					size="sm"
					onClick={async () => {
						const conversation = await createConversation()
						setConversations((prev) => [conversation, ...prev])
						onSelect(conversation.id)
					}}
					className="text-[10px] cursor-pointer h-6 px-2"
				>
					<MessageSquarePlus className="size-3 mr-1" />
					New
				</Button>
				{conversations.length > 0 && (
					<Button
						variant="ghost"
						size="sm"
						onClick={async () => {
							await clearConversations()
							const conversation = await createConversation()
							setConversations([conversation])
							onSelect(conversation.id)
						}}
						className="text-[10px] text-muted-foreground hover:text-destructive cursor-pointer h-6 px-2"
					>
						<Trash2 className="size-3 mr-1" />
						Clear All
					</Button>
				)}
			</header>

			{/* List */}
			<div className="flex-1 overflow-y-auto">
				{loading && (
					<div className="flex flex-col" aria-label="Loading history" aria-busy="true">
						{[...Array(4)].map((_, i) => (
							<div key={i} className="flex items-start gap-2 px-3 py-2.5 border-b">
								<div className="size-3.5 mt-0.5 rounded-full bg-muted animate-pulse shrink-0" />
								<div className="flex-1 space-y-1.5">
									<div className="h-2.5 bg-muted animate-pulse rounded w-3/4" />
									<div className="h-2 bg-muted animate-pulse rounded w-1/3" />
								</div>
							</div>
						))}
					</div>
				)}

				{!loading && conversations.length === 0 && (
					<div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
						<History className="size-8 opacity-30" />
						<p className="text-xs">No conversations yet</p>
					</div>
				)}

				{conversations.map((conversation) => (
					<div
						key={conversation.id}
						role="button"
						tabIndex={0}
						onClick={() => onSelect(conversation.id)}
						className="w-full text-left px-3 py-2.5 border-b hover:bg-muted/50 transition-colors cursor-pointer flex items-start gap-2 group"
					>
						<History className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />

						<div className="flex-1 min-w-0">
							<p className="text-xs font-medium truncate">{conversation.title}</p>
							<div className="flex items-center mt-0.5">
								<p className="text-[10px] text-muted-foreground truncate">
									{timeAgo(conversation.updatedAt)}
									{conversation.lastMessagePreview ? ` · ${conversation.lastMessagePreview}` : ''}
								</p>
								<button
									type="button"
									onClick={(e) => handleDelete(e, conversation.id)}
									className="ml-auto p-0.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
									title="Delete conversation"
									aria-label={`Delete conversation ${conversation.title}`}
								>
									<Trash2 className="size-3" />
								</button>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
