import type { NormalizedProductSnapshot, PageContext, SourcePlatform } from '@/commerce/domain'
import type { AmazonExtractedProduct } from '@/commerce/runtime/extractors/amazon'
import { productExtractorRegistry } from '@/commerce/runtime/extractors/index'

interface CommerceExtractResponse {
	success: boolean
	platform: SourcePlatform
	product?: unknown
	error?: string
}

function detectSourcePlatform(url: string): SourcePlatform {
	try {
		const hostname = new URL(url).hostname
		if (/(^|\.)amazon\./i.test(hostname)) return 'amazon'
		if (/(^|\.)shopee\./i.test(hostname)) return 'shopee'
		return 'unknown'
	} catch {
		return 'unknown'
	}
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
	const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
	return tabs[0]
}

export class CurrentPageRuntime {
	async getCurrentPageContext(): Promise<PageContext> {
		const tab = await getActiveTab()
		const url = tab?.url ?? ''
		const title = tab?.title ?? ''

		return {
			url,
			title,
			sourcePlatform: url ? detectSourcePlatform(url) : 'unknown',
		}
	}

	async getNormalizedCurrentProduct(page: PageContext): Promise<NormalizedProductSnapshot | null> {
		const extractor = productExtractorRegistry.findByContext({
			url: page.url,
			title: page.title,
		})
		if (!extractor) return null

		const tab = await getActiveTab()
		if (!tab?.id) return null

		const response = (await chrome.tabs.sendMessage(tab.id, {
			type: 'COMMERCE_CONTROL',
			action: 'extract_product',
		})) as CommerceExtractResponse | undefined

		if (!response?.success || !response.product) {
			console.warn('[Commerce][CurrentPageRuntime] Failed to extract product', response?.error)
			return null
		}

		if (response.platform !== extractor.platform) {
			console.warn('[Commerce][CurrentPageRuntime] Extractor/platform mismatch', {
				responsePlatform: response.platform,
				extractorPlatform: extractor.platform,
			})
			return null
		}

		return extractor.normalize(response.product as AmazonExtractedProduct, {
			url: page.url,
			title: page.title,
		})
	}

	observeCurrentPageChanges(onChange: () => void): () => void {
		const handleActivated = () => {
			onChange()
		}

		const handleUpdated = (
			tabId: number,
			changeInfo: { status?: string; url?: string },
			tab: chrome.tabs.Tab
		) => {
			if (!tab.active) return
			if (changeInfo.status === 'complete' || typeof changeInfo.url === 'string') {
				onChange()
			}
		}

		chrome.tabs.onActivated.addListener(handleActivated)
		chrome.tabs.onUpdated.addListener(handleUpdated)

		return () => {
			chrome.tabs.onActivated.removeListener(handleActivated)
			chrome.tabs.onUpdated.removeListener(handleUpdated)
		}
	}
}
