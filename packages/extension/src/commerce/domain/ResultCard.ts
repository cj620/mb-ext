import type { ResultCardType } from './ResultCardType'
import type { SourcePlatform } from './SourcePlatform'
import type { ProductCardDetail, ProductCardSummary } from './index'

export interface ListingCopyCardSummary {
	title: string
	description?: string
}

export interface ListingCopyCardDetail {
	titleOptions: string[]
	descriptionOptions: string[]
}

export interface ErrorReportCardSummary {
	message: string
}

export interface ErrorReportCardDetail {
	code?: string
	recoverable: boolean
	suggestions?: string[]
}

export interface ResultCardAction {
	id: string
	label: string
}

interface ResultCardBase<TType extends ResultCardType, TSummary, TDetail = undefined> {
	id: string
	type: TType
	title: string
	sourcePlatform: SourcePlatform
	summary: TSummary
	detail?: TDetail
	actions?: ResultCardAction[]
	createdAt: number
	updatedAt: number
}

export type ProductResultCard = ResultCardBase<'product', ProductCardSummary, ProductCardDetail>

export type ListingCopyResultCard = ResultCardBase<
	'listing_copy',
	ListingCopyCardSummary,
	ListingCopyCardDetail
>

export type ErrorReportResultCard = ResultCardBase<
	'error_report',
	ErrorReportCardSummary,
	ErrorReportCardDetail
>

export type ResultCard = ProductResultCard | ListingCopyResultCard | ErrorReportResultCard
