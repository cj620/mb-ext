import type { NormalizedProductSnapshot } from '@/commerce/domain'
import type { ExtractorPageContext } from '@/commerce/runtime/extractors/base'

import type { AmazonExtractedProduct } from './AmazonExtractedProduct'

function inferCompleteness(product: AmazonExtractedProduct): NormalizedProductSnapshot['quality'] {
	const missingFields: string[] = []
	const warnings: string[] = []

	if (!product.title) missingFields.push('title')
	if (!product.priceText) missingFields.push('price')
	if (!product.imageUrl) missingFields.push('primaryImage')
	if (!product.categoryPath?.length) missingFields.push('categoryPath')

	const completeness =
		missingFields.length === 0 ? 'rich' : missingFields.length <= 2 ? 'usable' : 'partial'

	if (!product.asin) warnings.push('ASIN not found')

	return {
		completeness,
		missingFields,
		warnings,
	}
}

export function normalizeAmazonProduct(
	product: AmazonExtractedProduct,
	context: ExtractorPageContext
): NormalizedProductSnapshot {
	return {
		identity: {
			platform: 'amazon',
			canonicalUrl: context.url,
			sourceProductId: product.asin,
			capturedAt: Date.now(),
		},
		merchandising: {
			title: product.title,
			brand: product.brand,
			categoryPath: product.categoryPath ?? [],
			description: product.description,
			highlights: product.bulletPoints ?? [],
		},
		pricing: {
			displayText: product.priceText,
		},
		media: {
			primaryImageUrl: product.imageUrl,
			galleryImageUrls: product.imageUrl ? [product.imageUrl] : [],
		},
		attributes: [],
		availability: {},
		quality: inferCompleteness(product),
		sourceMeta: product.asin ? { asin: product.asin } : {},
	}
}
