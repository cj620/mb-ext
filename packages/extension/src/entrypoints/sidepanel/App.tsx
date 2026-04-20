import { History, Send, Settings, Square } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { buildTaskOutcome } from '@/agent/application/buildTaskOutcome'
import { createConversationMessagesFromTaskOutcome } from '@/agent/application/createConversationMessagesFromTaskOutcome'
import { mergeConversationMessagePages } from '@/agent/application/mergeConversationMessagePages'
import { upsertConversationMessage } from '@/agent/application/upsertConversationMessage'
import type { ConversationRecord } from '@/agent/domain/Conversation'
import type { ConversationMessageRecord } from '@/agent/domain/ConversationMessage'
import { resolveCommerceTaskRoute } from '@/commerce/features/resolveCommerceTaskRoute'
import { useCommerceAgent } from '@/commerce/features/useCommerceAgent'
import { ResultCardDock } from '@/commerce/ui'
import { canRenderResultCardDock } from '@/commerce/ui/dock/ResultCardDock'
import { ConfigPanel } from '@/components/ConfigPanel'
import { ConversationTimeline } from '@/components/ConversationTimeline'
import { HistoryList } from '@/components/HistoryList'
import { ActivityCard } from '@/components/cards'
import { EmptyState, Logo, MotionOverlay, StatusDot } from '@/components/misc'
import { Button } from '@/components/ui/button'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from '@/components/ui/input-group'
import {
	getConversation,
	getOrCreateLatestConversation,
	listConversationMessagesPage,
	saveConversationMessages,
	saveSession,
} from '@/lib/db'

import { useAgent } from '../../agent/useAgent'

const CONVERSATION_PAGE_SIZE = 100

type View = { name: 'chat' } | { name: 'config' } | { name: 'history' }

export default function App() {
	const [view, setView] = useState<View>({ name: 'chat' })
	const [inputValue, setInputValue] = useState('')
	const [activeConversation, setActiveConversation] = useState<ConversationRecord | null>(null)
	const [conversationMessages, setConversationMessages] = useState<ConversationMessageRecord[]>([])
	const [hasOlderConversationMessages, setHasOlderConversationMessages] = useState(false)
	const [oldestLoadedMessageCreatedAt, setOldestLoadedMessageCreatedAt] = useState<
		number | undefined
	>()
	const historyRef = useRef<HTMLDivElement>(null)
	const skipAutoScrollRef = useRef(false)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const { status, activity, config, execute, stop, configure } = useAgent()
	const commerceState = useCommerceAgent()

	useEffect(() => {
		let cancelled = false

		const loadConversation = async () => {
			try {
				const conversation = await getOrCreateLatestConversation()
				const page = await listConversationMessagesPage(conversation.id, {
					limit: CONVERSATION_PAGE_SIZE,
				})
				if (!cancelled) {
					setActiveConversation(conversation)
					setConversationMessages(page.messages)
					setHasOlderConversationMessages(page.hasMore)
					setOldestLoadedMessageCreatedAt(page.oldestCreatedAt)
				}
			} catch (error) {
				console.error('[SidePanel] Failed to load conversation messages:', error)
			}
		}

		void loadConversation()

		return () => {
			cancelled = true
		}
	}, [])

	useEffect(() => {
		let cancelled = false

		const loadMessages = async () => {
			if (!activeConversation) return

			try {
				const page = await listConversationMessagesPage(activeConversation.id, {
					limit: CONVERSATION_PAGE_SIZE,
				})
				if (!cancelled) {
					setConversationMessages(page.messages)
					setHasOlderConversationMessages(page.hasMore)
					setOldestLoadedMessageCreatedAt(page.oldestCreatedAt)
				}
			} catch (error) {
				console.error('[SidePanel] Failed to load active conversation messages:', error)
			}
		}

		void loadMessages()

		return () => {
			cancelled = true
		}
	}, [activeConversation?.id])

	useEffect(() => {
		if (skipAutoScrollRef.current) {
			skipAutoScrollRef.current = false
			return
		}

		if (historyRef.current) {
			historyRef.current.scrollTop = historyRef.current.scrollHeight
		}
	}, [conversationMessages, activity])

	const runTask = useCallback(
		async (task: string) => {
			const normalizedTask = task.trim()
			if (!normalizedTask || status === 'running' || !activeConversation) return

			setInputValue('')
			setView({ name: 'chat' })

			const pendingMessageId = `pending-${Date.now()}`
			const streamingAssistantMessageId = `${pendingMessageId}-assistant`
			const pendingCreatedAt = Date.now()
			const pendingUserMessage: ConversationMessageRecord = {
				id: pendingMessageId,
				conversationId: activeConversation.id,
				role: 'user',
				content: normalizedTask,
				createdAt: pendingCreatedAt,
			}

			setConversationMessages((prev) => [...prev, pendingUserMessage])
			setOldestLoadedMessageCreatedAt((current) =>
				current == null ? pendingCreatedAt : Math.min(current, pendingCreatedAt)
			)

			try {
				const ruleNeedsContext = Boolean(commerceState.activeResultCard)
				let contextPrompt = ''

				const route = await resolveCommerceTaskRoute({
					task: normalizedTask,
					hasActiveProduct: Boolean(commerceState.activeResultCard),
					contextPrompt: ruleNeedsContext
						? ((contextPrompt = await commerceState.buildTaskContextPrompt()), contextPrompt)
						: undefined,
					llmConfig: config ?? undefined,
					systemInstruction: config?.systemInstruction,
				})

				if (route.kind === 'commerce_text') {
					if (!contextPrompt && commerceState.activeResultCard) {
						contextPrompt = await commerceState.buildTaskContextPrompt()
					}
					const result = await execute(normalizedTask, {
						displayTask: normalizedTask,
						mode: 'commerce_text',
						contextPrompt,
						onTextDelta: (text) => {
							setConversationMessages((prev) =>
								upsertConversationMessage(prev, {
									id: streamingAssistantMessageId,
									conversationId: activeConversation.id,
									role: 'assistant',
									content: text,
									createdAt: pendingCreatedAt + 1,
									routeKind: 'commerce_text',
								})
							)
						},
					})
					const persistedSession = await saveSession({
						task: normalizedTask,
						history: result.history,
						status: result.success ? 'completed' : 'error',
					})
					const taskOutcome = buildTaskOutcome({
						taskRunId: persistedSession.id,
						routeKind: route.kind,
						task: normalizedTask,
						result,
					})
					const messages = createConversationMessagesFromTaskOutcome({
						conversationId: activeConversation.id,
						taskOutcome,
					})
					await saveConversationMessages(activeConversation.id, messages)
					setConversationMessages((prev) => [
						...prev.filter(
							(message) =>
								message.id !== pendingMessageId && message.id !== streamingAssistantMessageId
						),
						...messages,
					])
					setOldestLoadedMessageCreatedAt((current) =>
						current == null ? messages[0]?.createdAt : current
					)
					await commerceState.recordTaskOutcome(taskOutcome)
					return
				}

				const result = await execute(normalizedTask, {
					displayTask: normalizedTask,
					mode: 'page_interaction',
				})
				const persistedSession = await saveSession({
					task: normalizedTask,
					history: result.history,
					status: result.success ? 'completed' : 'error',
				})
				const taskOutcome = buildTaskOutcome({
					taskRunId: persistedSession.id,
					routeKind: route.kind,
					task: normalizedTask,
					result,
				})
				const messages = createConversationMessagesFromTaskOutcome({
					conversationId: activeConversation.id,
					taskOutcome,
				})
				await saveConversationMessages(activeConversation.id, messages)
				setConversationMessages((prev) => [
					...prev.filter((message) => message.id !== pendingMessageId),
					...messages,
				])
				setOldestLoadedMessageCreatedAt((current) =>
					current == null ? messages[0]?.createdAt : current
				)
			} catch (error) {
				setConversationMessages((prev) => [
					...prev.filter(
						(message) =>
							message.id !== pendingMessageId && message.id !== streamingAssistantMessageId
					),
					{
						id: `${pendingMessageId}-error`,
						conversationId: activeConversation.id,
						role: 'assistant',
						content: String(error),
						createdAt: pendingCreatedAt + 1,
						taskStatus: 'error',
					},
				])
				setOldestLoadedMessageCreatedAt((current) =>
					current == null ? pendingCreatedAt : Math.min(current, pendingCreatedAt)
				)
				console.error('[SidePanel] Failed to execute task:', error)
			}
		},
		[activeConversation, commerceState, execute, status]
	)

	const handleSubmit = useCallback(
		(e?: React.SyntheticEvent) => {
			e?.preventDefault()
			runTask(inputValue)
		},
		[inputValue, runTask]
	)

	const handleStop = useCallback(() => {
		console.log('[SidePanel] Stopping task...')
		stop()
	}, [stop])

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
			e.preventDefault()
			handleSubmit()
		}
	}

	// --- View routing ---

	if (view.name === 'config') {
		return (
			<ConfigPanel
				config={config}
				onSave={async (newConfig) => {
					await configure(newConfig)
					setView({ name: 'chat' })
				}}
				onClose={() => setView({ name: 'chat' })}
			/>
		)
	}

	if (view.name === 'history') {
		return (
			<HistoryList
				activeConversationId={activeConversation?.id}
				onSelect={async (id) => {
					const nextConversation =
						activeConversation?.id === id ? activeConversation : await getConversation(id)
					if (!nextConversation) return
					setActiveConversation(nextConversation)
					setView({ name: 'chat' })
				}}
				onBack={() => setView({ name: 'chat' })}
			/>
		)
	}

	// --- Chat view ---

	const isRunning = status === 'running'
	const showEmptyState = conversationMessages.length === 0 && !isRunning
	const showDock = view.name === 'chat' && canRenderResultCardDock(commerceState.activeResultCard)

	return (
		<div className="relative flex flex-col h-screen bg-background">
			<MotionOverlay active={isRunning} />
			{/* Header */}
			<header className="flex items-center justify-between border-b px-3 py-2">
				<div className="flex items-center gap-2">
					<Logo className="size-5" />
					<span className="text-sm font-medium">Page Agent Ext</span>
				</div>
				<div className="flex items-center gap-1">
					<StatusDot status={status} />
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setView({ name: 'history' })}
						className="cursor-pointer"
						aria-label="History"
						title="History"
					>
						<History className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setView({ name: 'config' })}
						className="cursor-pointer"
						aria-label="Settings"
						title="Settings"
					>
						<Settings className="size-3.5" />
					</Button>
				</div>
			</header>

			{/* Content */}
			<main className="flex-1 min-h-0 overflow-hidden flex flex-col">
				<div ref={historyRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
					{showEmptyState && <EmptyState />}

					{hasOlderConversationMessages && activeConversation && (
						<div className="flex justify-center">
							<Button
								variant="ghost"
								size="sm"
								onClick={async () => {
									if (!oldestLoadedMessageCreatedAt) return
									skipAutoScrollRef.current = true
									const page = await listConversationMessagesPage(activeConversation.id, {
										beforeCreatedAt: oldestLoadedMessageCreatedAt,
										limit: CONVERSATION_PAGE_SIZE,
									})
									setConversationMessages((current) =>
										mergeConversationMessagePages(page.messages, current)
									)
									setHasOlderConversationMessages(page.hasMore)
									setOldestLoadedMessageCreatedAt(page.oldestCreatedAt)
								}}
								className="h-7 text-[11px] text-muted-foreground cursor-pointer"
							>
								Load older messages
							</Button>
						</div>
					)}

					{conversationMessages.length > 0 && (
						<ConversationTimeline messages={conversationMessages} />
					)}

					{/* Activity indicator at bottom */}
					{activity && <ActivityCard activity={activity} />}
				</div>
			</main>

			{showDock && (
				<section className="border-t px-3 py-2">
					<ResultCardDock activeCard={commerceState.activeResultCard} />
				</section>
			)}

			{/* Input */}
			<footer className="border-t p-3">
				<InputGroup className="relative rounded-lg">
					<InputGroupTextarea
						ref={textareaRef}
						placeholder="Describe your task... (Enter to send)"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						disabled={isRunning}
						className="text-xs pr-12 min-h-10"
					/>
					<InputGroupAddon align="inline-end" className="absolute bottom-0 right-0">
						{isRunning ? (
							<InputGroupButton
								size="icon-sm"
								variant="destructive"
								onClick={handleStop}
								className="size-7"
								aria-label="Stop task"
								title="Stop task"
							>
								<Square className="size-3" />
							</InputGroupButton>
						) : (
							<InputGroupButton
								size="icon-sm"
								variant="default"
								onClick={() => handleSubmit()}
								disabled={!inputValue.trim() || !activeConversation}
								className="size-7 cursor-pointer"
								aria-label="Send"
								title="Send"
							>
								<Send className="size-3" />
							</InputGroupButton>
						)}
					</InputGroupAddon>
				</InputGroup>
			</footer>
		</div>
	)
}
