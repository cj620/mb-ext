export type { SourcePlatform } from './SourcePlatform'
export type { ConversationMessage, ConversationMessageRole } from './ConversationMessage'
export type {
	ErrorReportCardDetail,
	ErrorReportCardSummary,
	ErrorReportResultCard,
	ListingCopyCardDetail,
	ListingCopyCardSummary,
	ListingCopyResultCard,
	ProductResultCard,
	ResultCard,
	ResultCardAction,
} from './ResultCard'
export type { ResultCardType } from './ResultCardType'
export type { ResultCardUpdate } from './ResultCardUpdate'
export type { PageContext, ToolContext } from './ToolContext'
export type { ToolResultEnvelope } from './ToolResultEnvelope'
export type {
	NormalizedProductSnapshot,
	ProductAttribute,
	ProductAvailabilitySnapshot,
	ProductPriceSnapshot,
	ProductQualitySnapshot,
} from './product/NormalizedProductSnapshot'
export type { ProductCardDetail, ProductCardSummary } from './product/ProductCardMapper'
export { mapProductDetail, mapProductSummary } from './product/ProductCardMapper'
