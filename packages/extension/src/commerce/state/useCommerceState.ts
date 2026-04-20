import { useMemo, useState } from 'react'

import type { ResultCard, ResultCardUpdate } from '@/commerce/domain'

export interface CommerceState {
	resultCards: ResultCard[]
	activeResultCardId?: string
	activeResultCard?: ResultCard
	setActiveResultCardId: (id?: string) => void
	addResultCards: (cards: ResultCard[]) => void
	replaceResultCards: (cards: ResultCard[]) => void
	applyUpdates: (updates: ResultCardUpdate[]) => void
}

export function useCommerceState(): CommerceState {
	const [resultCards, setResultCards] = useState<ResultCard[]>([])
	const [activeResultCardId, setActiveResultCardId] = useState<string | undefined>()

	const activeResultCard = useMemo(
		() => resultCards.find((card) => card.id === activeResultCardId),
		[resultCards, activeResultCardId]
	)

	const addResultCards = (cards: ResultCard[]) => {
		if (cards.length === 0) return
		setResultCards((current) => [...cards, ...current])
		setActiveResultCardId(cards[0].id)
	}

	const replaceResultCards = (cards: ResultCard[]) => {
		setResultCards(cards)
		setActiveResultCardId(cards[0]?.id)
	}

	const applyUpdates = (updates: ResultCardUpdate[]) => {
		if (updates.length === 0) return

		setResultCards((current) =>
			current.map((card) => {
				const update = updates.find((item) => item.id === card.id)
				if (!update) return card

				return {
					...card,
					...update.patch,
					updatedAt: Date.now(),
				} as ResultCard
			})
		)
	}

	return {
		resultCards,
		activeResultCardId,
		activeResultCard,
		setActiveResultCardId,
		addResultCards,
		replaceResultCards,
		applyUpdates,
	}
}
