import type { SourcePlatform } from '../SourcePlatform'

export interface ProductAttribute {
	group?: string
	name: string
	value: string
}

export interface ProductPriceSnapshot {
	displayText?: string
	currency?: string
	saleAmount?: number
	originalAmount?: number
	minAmount?: number
	maxAmount?: number
	isRange?: boolean
}

export interface ProductAvailabilitySnapshot {
	inStock?: boolean
	stockText?: string
	shippingText?: string
}

export interface ProductQualitySnapshot {
	completeness: 'partial' | 'usable' | 'rich'
	missingFields: string[]
	warnings: string[]
}

export interface NormalizedProductSnapshot {
	identity: {
		platform: SourcePlatform
		canonicalUrl: string
		sourceProductId?: string
		sourceVariantId?: string
		capturedAt: number
	}
	merchandising: {
		title: string
		brand?: string
		categoryPath: string[]
		description?: string
		highlights: string[]
	}
	pricing: ProductPriceSnapshot
	media: {
		primaryImageUrl?: string
		galleryImageUrls: string[]
	}
	attributes: ProductAttribute[]
	availability: ProductAvailabilitySnapshot
	quality: ProductQualitySnapshot
	sourceMeta: Record<string, string>
}
