import {
	type NormalizedProductSnapshot,
	type PageContext,
	type ProductResultCard,
	type ToolResultEnvelope,
	mapProductDetail,
	mapProductSummary,
} from '@/commerce/domain'

export interface CaptureCurrentProductDeps {
	getCurrentPageContext: () => Promise<PageContext>
	getNormalizedCurrentProduct: (page: PageContext) => Promise<NormalizedProductSnapshot | null>
	now?: () => number
}

export async function captureCurrentProduct({
	getCurrentPageContext,
	getNormalizedCurrentProduct,
	now = () => Date.now(),
}: CaptureCurrentProductDeps): Promise<ToolResultEnvelope> {
	const page = await getCurrentPageContext()
	const product = await getNormalizedCurrentProduct(page)

	if (!product) {
		return {
			message: 'Current page is not supported or product data could not be captured.',
			resultCards: [
				{
					id: `error-${now()}`,
					type: 'error_report',
					title: 'Capture unavailable',
					sourcePlatform: page.sourcePlatform,
					summary: {
						message: 'Open a supported product page to populate the Commerce Dock.',
					},
					detail: {
						recoverable: true,
						code: 'capture_unavailable',
						suggestions: ['Open a supported product page', 'Refresh the side panel'],
					},
					createdAt: now(),
					updatedAt: now(),
				},
			],
		}
	}

	const timestamp = now()
	const card: ProductResultCard = {
		id: `product-${timestamp}`,
		type: 'product',
		title: product.merchandising.title,
		sourcePlatform: product.identity.platform,
		summary: mapProductSummary(product),
		detail: mapProductDetail(product),
		actions: [
			{ id: 'optimize-listing', label: 'Optimize' },
			{ id: 'copy-title', label: 'Copy title' },
		],
		createdAt: timestamp,
		updatedAt: timestamp,
	}

	return {
		message: 'Captured product details from the current page.',
		resultCards: [card],
	}
}
