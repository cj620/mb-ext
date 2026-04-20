import type { AmazonExtractedProduct } from './AmazonExtractedProduct'

function textContent(node: Element | null): string | undefined {
	const value = node?.textContent?.trim()
	return value ? value.replace(/\s+/g, ' ') : undefined
}

function queryFirstText(root: ParentNode, selectors: string[]): string | undefined {
	for (const selector of selectors) {
		const value = textContent(root.querySelector(selector))
		if (value) return value
	}

	return undefined
}

function queryImage(root: ParentNode, selectors: string[]): string | undefined {
	for (const selector of selectors) {
		const element = root.querySelector<HTMLImageElement>(selector)
		const value = element?.getAttribute('src')?.trim()
		if (value) return value
	}

	return undefined
}

function extractCategoryPath(root: ParentNode): string[] | undefined {
	const items = Array.from(
		root.querySelectorAll(
			'#wayfinding-breadcrumbs_feature_div a, #wayfinding-breadcrumbs_container a'
		)
	)
		.map((item) => textContent(item))
		.filter((item): item is string => Boolean(item))

	return items.length > 0 ? items : undefined
}

function extractBulletPoints(root: ParentNode): string[] | undefined {
	const items = Array.from(
		root.querySelectorAll(
			'#feature-bullets li span.a-list-item, #featurebullets_feature_div li span'
		)
	)
		.map((item) => textContent(item))
		.filter((item): item is string => Boolean(item))
		.filter((item) => item !== 'Make sure this fits')

	return items.length > 0 ? items.slice(0, 6) : undefined
}

function extractAsin(root: ParentNode): string | undefined {
	const labels = Array.from(root.querySelectorAll('th, td, span'))

	for (const label of labels) {
		const text = label.textContent?.trim()
		if (text !== 'ASIN') continue

		const row = label.closest('tr')
		if (row) {
			const valueCell = row.querySelector('td')
			const value = textContent(valueCell)
			if (value) return value
		}

		const sibling = label.nextElementSibling
		const value = textContent(sibling)
		if (value) return value
	}

	return undefined
}

export function extractAmazonProduct(root: ParentNode = document): AmazonExtractedProduct | null {
	const title = queryFirstText(root, ['#productTitle', '#title'])
	if (!title) return null

	return {
		title,
		priceText: queryFirstText(root, [
			'#corePrice_feature_div .a-offscreen',
			'#corePriceDisplay_desktop_feature_div .a-offscreen',
			'#priceblock_ourprice',
			'#priceblock_dealprice',
			'#price_inside_buybox',
		]),
		categoryPath: extractCategoryPath(root),
		imageUrl: queryImage(root, [
			'#landingImage',
			'#imgTagWrapperId img',
			'#main-image-container img',
		]),
		brand: queryFirstText(root, ['#bylineInfo', '#brand']),
		asin: extractAsin(root),
		description: queryFirstText(root, ['#productDescription p', '#productDescription']),
		bulletPoints: extractBulletPoints(root),
	}
}
