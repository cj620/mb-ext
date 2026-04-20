import type { NormalizedProductSnapshot } from './NormalizedProductSnapshot'

export interface ProductCardSummary {
	imageUrl?: string
	title: string
	priceText?: string
	categoryText?: string
}

export interface ProductCardDetail {
	brand?: string
	description?: string
	highlights?: string[]
	attributes?: {
		group?: string
		name: string
		value: string
	}[]
	sourceMeta?: Record<string, string>
}

export function mapProductSummary(product: NormalizedProductSnapshot): ProductCardSummary {
	return {
		imageUrl: product.media.primaryImageUrl,
		title: product.merchandising.title,
		priceText: product.pricing.displayText,
		categoryText:
			product.merchandising.categoryPath.length > 0
				? product.merchandising.categoryPath.join(' / ')
				: undefined,
	}
}

export function mapProductDetail(product: NormalizedProductSnapshot): ProductCardDetail {
	return {
		brand: product.merchandising.brand,
		description: product.merchandising.description,
		highlights: product.merchandising.highlights,
		attributes: product.attributes,
		sourceMeta: product.sourceMeta,
	}
}
