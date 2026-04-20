import type { ResultCard } from '@/commerce/domain'

import { ProductDockCard } from './ProductDockCard'

export function ResultCardDock({ activeCard }: { activeCard?: ResultCard }) {
	if (!activeCard) return null
	if (activeCard.type === 'product') return <ProductDockCard card={activeCard} />
	return null
}
