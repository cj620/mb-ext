import type { SourcePlatform } from '@/commerce/domain'

import type { ExtractorPageContext, ProductExtractor } from './ProductExtractor'

export class ProductExtractorRegistry {
	#extractors: ProductExtractor<unknown>[] = []

	register<TRawProduct>(extractor: ProductExtractor<TRawProduct>): void {
		this.#extractors.push(extractor as ProductExtractor<unknown>)
	}

	findByContext(context: ExtractorPageContext): ProductExtractor<unknown> | undefined {
		return this.#extractors.find((extractor) => extractor.canHandle(context))
	}

	findByPlatform(platform: SourcePlatform): ProductExtractor<unknown> | undefined {
		return this.#extractors.find((extractor) => extractor.platform === platform)
	}

	listPlatforms(): SourcePlatform[] {
		return this.#extractors.map((extractor) => extractor.platform)
	}
}
