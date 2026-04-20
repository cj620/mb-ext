import type { ActiveCommerceContext } from '@/commerce/domain'

function renderCurrentPage(context: ActiveCommerceContext): string[] {
	return [
		`Current page platform: ${context.currentPage.sourcePlatform}`,
		`Current page title: ${context.currentPage.title || '(empty)'}`,
		`Current page URL: ${context.currentPage.url || '(empty)'}`,
	]
}

function renderActiveResultCard(context: ActiveCommerceContext): string[] {
	const card = context.activeResultCard
	if (!card) {
		return ['Active commerce result: none']
	}

	const lines = [
		`Active commerce result type: ${card.type}`,
		`Active commerce result title: ${card.title}`,
	]

	if (card.type === 'product') {
		lines.push(`Active product title: ${card.summary.title}`)
		if (card.summary.priceText) {
			lines.push(`Active product price: ${card.summary.priceText}`)
		}
		if (card.summary.categoryText) {
			lines.push(`Active product category: ${card.summary.categoryText}`)
		}
		if (card.detail?.brand) {
			lines.push(`Active product brand: ${card.detail.brand}`)
		}
		if (card.detail?.description) {
			lines.push(`Active product description: ${card.detail.description}`)
		}
		if (card.detail?.highlights?.length) {
			lines.push(`Active product highlights: ${card.detail.highlights.join(' | ')}`)
		}
	}

	return lines
}

function renderRecentConversation(context: ActiveCommerceContext): string[] {
	if (!context.recentConversationMessages?.length) {
		return []
	}

	return [
		'Recent commerce conversation:',
		...context.recentConversationMessages.map(
			(message) => `${message.role}: ${message.content || '(empty)'}`
		),
	]
}

function renderRecentTaskOutcomes(context: ActiveCommerceContext): string[] {
	if (!context.recentTaskOutcomes?.length) {
		return []
	}

	return [
		'Recent commerce task outcomes:',
		...context.recentTaskOutcomes.flatMap((outcome, index) => {
			const lines = [
				`${index + 1}. [${outcome.routeKind}/${outcome.status}] ${outcome.userIntent}`,
				`result: ${outcome.resultText}`,
			]

			if (outcome.facts?.length) {
				lines.push(`facts: ${outcome.facts.join(' | ')}`)
			}

			return lines
		}),
	]
}

export function serializeActiveCommerceContext(context: ActiveCommerceContext): string {
	return [
		'<commerce_context>',
		...renderCurrentPage(context),
		...renderActiveResultCard(context),
		...renderRecentTaskOutcomes(context),
		...renderRecentConversation(context),
		'</commerce_context>',
	].join('\n')
}
