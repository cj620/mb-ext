import type { ProductExtractor } from '@/commerce/runtime/extractors/base'

import type { AmazonExtractedProduct } from './AmazonExtractedProduct'
import { extractAmazonProduct } from './extractAmazonProduct'
import { normalizeAmazonProduct } from './normalizeAmazonProduct'

export type { AmazonExtractedProduct } from './AmazonExtractedProduct'
export { extractAmazonProduct } from './extractAmazonProduct'
export { normalizeAmazonProduct } from './normalizeAmazonProduct'

export const amazonProductExtractor: ProductExtractor<AmazonExtractedProduct> = {
	platform: 'amazon',
	canHandle: (context) => {
		try {
			return /(^|\.)amazon\./i.test(new URL(context.url).hostname)
		} catch {
			return false
		}
	},
	normalize: normalizeAmazonProduct,
}
