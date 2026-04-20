import type { NormalizedProductSnapshot, SourcePlatform } from '@/commerce/domain'

export interface ExtractorPageContext {
	url: string
	title: string
	html?: string
}

export interface ProductExtractor<TRawProduct> {
	readonly platform: SourcePlatform
	canHandle: (context: ExtractorPageContext) => boolean
	normalize: (raw: TRawProduct, context: ExtractorPageContext) => NormalizedProductSnapshot
}
