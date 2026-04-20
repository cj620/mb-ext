import { useEffect, useRef, useState } from 'react'

import type { TaskOutcome } from '@/agent/domain/TaskOutcome'
import { buildActiveCommerceContext } from '@/commerce/application/context/buildActiveCommerceContext'
import {
	type CommerceConversationContext,
	updateCommerceConversationContext,
} from '@/commerce/application/context/updateCommerceConversationContext'
import { captureCurrentProduct } from '@/commerce/application/use-cases/captureCurrentProduct'
import { CurrentPageRuntime } from '@/commerce/runtime/page/CurrentPageRuntime'
import { serializeActiveCommerceContext } from '@/commerce/runtime/prompt/serializeActiveCommerceContext'
import { useCommerceState } from '@/commerce/state'

export function useCommerceAgent() {
	const state = useCommerceState()
	const [isLoading, setIsLoading] = useState(false)
	const runtimeRef = useRef<CurrentPageRuntime | null>(null)
	const latestUrlRef = useRef<string | null>(null)
	const conversationContextRef = useRef<CommerceConversationContext>({ messages: [], outcomes: [] })

	if (!runtimeRef.current) {
		runtimeRef.current = new CurrentPageRuntime()
	}

	useEffect(() => {
		let cancelled = false
		const runtime = runtimeRef.current
		if (!runtime) return
		let inFlight = false

		const refreshCurrentProduct = async (force = false) => {
			if (inFlight) return

			try {
				const page = await runtime.getCurrentPageContext()
				if (!force && latestUrlRef.current === page.url) {
					return
				}

				inFlight = true
				setIsLoading(true)

				const result = await captureCurrentProduct({
					getCurrentPageContext: async () => page,
					getNormalizedCurrentProduct: (context) => runtime.getNormalizedCurrentProduct(context),
				})

				if (cancelled) return

				latestUrlRef.current = page.url

				if (result.resultCards?.length) {
					state.replaceResultCards(result.resultCards)
				}
			} catch (error) {
				console.error('[Commerce][useCommerceAgent] Failed to capture current product', error)
			} finally {
				inFlight = false
				if (!cancelled) setIsLoading(false)
			}
		}

		void refreshCurrentProduct(true)

		const unsubscribe = runtime.observeCurrentPageChanges(() => {
			void refreshCurrentProduct()
		})

		return () => {
			cancelled = true
			unsubscribe()
		}
	}, [])

	return {
		...state,
		isLoading,
		buildTaskContextPrompt: async () => {
			const runtime = runtimeRef.current
			if (!runtime) return ''

			const currentPage = await runtime.getCurrentPageContext()
			const context = buildActiveCommerceContext({
				currentPage,
				activeResultCard: state.activeResultCard,
				recentConversationMessages:
					conversationContextRef.current.scopeKey === currentPage.url
						? conversationContextRef.current.messages
						: undefined,
				recentTaskOutcomes:
					conversationContextRef.current.scopeKey === currentPage.url
						? conversationContextRef.current.outcomes
						: undefined,
			})

			return serializeActiveCommerceContext(context)
		},
		recordTaskOutcome: async (taskOutcome: TaskOutcome) => {
			const runtime = runtimeRef.current
			if (!runtime || !taskOutcome.userIntent.trim() || !taskOutcome.resultText.trim()) return

			const currentPage = await runtime.getCurrentPageContext()
			conversationContextRef.current = updateCommerceConversationContext(
				conversationContextRef.current,
				{
					scopeKey: currentPage.url,
					taskOutcome,
				}
			)
		},
	}
}
