import type { ResultCard } from '@/commerce/domain'

import { ProductDockCard } from './ProductDockCard'

export function canRenderResultCardDock(activeCard?: ResultCard): boolean {
	return activeCard?.type === 'product'
}

export function ResultCardDock({ activeCard }: { activeCard?: ResultCard }) {
	if (!activeCard || activeCard.type !== 'product') return null
	if (canRenderResultCardDock(activeCard)) return <ProductDockCard card={activeCard} />
	return null
}
