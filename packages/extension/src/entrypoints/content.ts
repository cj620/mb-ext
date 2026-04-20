import { initPageController } from '@/agent/RemotePageController.content'
import { extractAmazonProduct } from '@/commerce/runtime/extractors/amazon'

// import { DEMO_CONFIG } from '@/agent/constants'

const DEBUG_PREFIX = '[Content]'

export default defineContentScript({
	matches: ['<all_urls>'],
	runAt: 'document_end',

	main() {
		console.debug(`${DEBUG_PREFIX} Loaded on ${window.location.href}`)
		initPageController()
		initCommerceRuntime()

		// if auth token matches, expose agent to page
		chrome.storage.local.get('PageAgentExtUserAuthToken').then((result) => {
			// extension side token.
			// @note this is isolated world. it is safe to assume user script cannot access it
			const extToken = result.PageAgentExtUserAuthToken
			if (!extToken) return

			// page side token
			const pageToken = localStorage.getItem('PageAgentExtUserAuthToken')
			if (!pageToken) return

			if (pageToken !== extToken) return

			console.log('[PageAgentExt]: Auth tokens match. Exposing agent to page.')

			// add isolated world script
			exposeAgentToPage().then(
				// add main-world script
				() => injectScript('/main-world.js')
			)
		})
	},
})

function detectSourcePlatform(url: string): 'amazon' | 'shopee' | 'unknown' {
	try {
		const hostname = new URL(url).hostname
		if (/(^|\.)amazon\./i.test(hostname)) return 'amazon'
		if (/(^|\.)shopee\./i.test(hostname)) return 'shopee'
		return 'unknown'
	} catch {
		return 'unknown'
	}
}

function initCommerceRuntime() {
	chrome.runtime.onMessage.addListener((message, sender, sendResponse): true | undefined => {
		if (message.type !== 'COMMERCE_CONTROL') return

		if (message.action === 'extract_product') {
			try {
				const platform = detectSourcePlatform(window.location.href)
				if (platform === 'amazon') {
					sendResponse({
						success: true,
						platform,
						product: extractAmazonProduct(document),
					})
					return
				}

				sendResponse({
					success: false,
					platform,
					error: 'Current page is not supported for commerce extraction yet.',
				})
			} catch (error) {
				sendResponse({
					success: false,
					platform: 'unknown',
					error: error instanceof Error ? error.message : String(error),
				})
			}
		}

		return true
	})
}

async function exposeAgentToPage() {
	const { MultiPageAgent } = await import('@/agent/MultiPageAgent')
	console.log('[PageAgentExt]: MultiPageAgent loaded')

	/**
	 * singleton MultiPageAgent to handle requests from the page
	 */
	let multiPageAgent: InstanceType<typeof MultiPageAgent> | null = null

	window.addEventListener('message', async (e) => {
		if (e.source !== window) return

		const data = e.data
		if (typeof data !== 'object' || data === null) return
		if (data.channel !== 'PAGE_AGENT_EXT_REQUEST') return

		const { action, payload, id } = data

		switch (action) {
			case 'execute': {
				// singleton check
				if (multiPageAgent && multiPageAgent.status === 'running') {
					window.postMessage(
						{
							channel: 'PAGE_AGENT_EXT_RESPONSE',
							id,
							action: 'execute_result',
							error: 'Agent is already running a task. Please wait until it finishes.',
						},
						'*'
					)
					return
				}

				try {
					const { task, config } = payload
					const { systemInstruction, ...agentConfig } = config

					// Dispose old instance before creating new one
					multiPageAgent?.dispose()

					multiPageAgent = new MultiPageAgent({
						...agentConfig,
						instructions: systemInstruction ? { system: systemInstruction } : undefined,
					})

					// events

					multiPageAgent.addEventListener('statuschange', (event) => {
						if (!multiPageAgent) return
						window.postMessage(
							{
								channel: 'PAGE_AGENT_EXT_RESPONSE',
								id,
								action: 'status_change_event',
								payload: multiPageAgent.status,
							},
							'*'
						)
					})

					multiPageAgent.addEventListener('activity', (event) => {
						if (!multiPageAgent) return
						window.postMessage(
							{
								channel: 'PAGE_AGENT_EXT_RESPONSE',
								id,
								action: 'activity_event',
								payload: (event as CustomEvent).detail,
							},
							'*'
						)
					})

					multiPageAgent.addEventListener('historychange', (event) => {
						if (!multiPageAgent) return
						window.postMessage(
							{
								channel: 'PAGE_AGENT_EXT_RESPONSE',
								id,
								action: 'history_change_event',
								payload: multiPageAgent.history,
							},
							'*'
						)
					})

					// result

					const result = await multiPageAgent.execute(task)

					window.postMessage(
						{
							channel: 'PAGE_AGENT_EXT_RESPONSE',
							id,
							action: 'execute_result',
							payload: result,
						},
						'*'
					)
				} catch (error) {
					window.postMessage(
						{
							channel: 'PAGE_AGENT_EXT_RESPONSE',
							id,
							action: 'execute_result',
							error: (error as Error).message,
						},
						'*'
					)
				}

				break
			}

			case 'stop': {
				multiPageAgent?.stop()
				break
			}

			default:
				console.warn(`${DEBUG_PREFIX} Unknown action from page:`, action)
				break
		}
	})
}
