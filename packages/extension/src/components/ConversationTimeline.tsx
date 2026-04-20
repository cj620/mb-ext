import { CheckCircle, MessageSquareText, User2, XCircle } from 'lucide-react'

import type { ConversationMessageRecord } from '@/agent/domain/ConversationMessage'
import { cn } from '@/lib/utils'

export function ConversationTimeline({ messages }: { messages: ConversationMessageRecord[] }) {
	return (
		<div className="space-y-3">
			{messages.map((message) => {
				const isUser = message.role === 'user'
				const isAssistant = message.role === 'assistant'

				return (
					<div key={message.id} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
						<div
							className={cn(
								'max-w-[90%] rounded-2xl border px-3 py-2.5',
								isUser
									? 'bg-primary text-primary-foreground border-primary/60'
									: 'bg-muted/40 border-border'
							)}
						>
							<div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide opacity-80">
								{isUser ? <User2 className="size-3" /> : <MessageSquareText className="size-3" />}
								<span>{message.role === 'user' ? 'You' : 'Assistant'}</span>
								{isAssistant && message.taskStatus === 'completed' && (
									<CheckCircle className="ml-1 size-3 text-green-500" />
								)}
								{isAssistant && message.taskStatus === 'error' && (
									<XCircle className="ml-1 size-3 text-destructive" />
								)}
							</div>
							<div
								className={cn(
									'whitespace-pre-wrap text-xs leading-5',
									isUser ? 'text-primary-foreground' : 'text-foreground'
								)}
							>
								{message.content}
							</div>
							{isAssistant && (message.routeKind || message.taskRunId) && (
								<div className="mt-2 text-[10px] text-muted-foreground">
									{message.routeKind ?? 'task'}
								</div>
							)}
						</div>
					</div>
				)
			})}
		</div>
	)
}
