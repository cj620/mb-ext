/**
 * React hook for using AgentController
 */
import type {
	AgentActivity,
	AgentStatus,
	ExecutionResult,
	HistoricalEvent,
	SupportedLanguage,
} from '@page-agent/core'
import type { LLMConfig } from '@page-agent/llms'
import { useCallback, useEffect, useRef, useState } from 'react'

import { executeCommerceTextTask } from '@/commerce/runtime/text/executeCommerceTextTask'

import { MultiPageAgent } from './MultiPageAgent'
import { DEMO_CONFIG, migrateLegacyEndpoint } from './constants'

/** Language preference: undefined means follow system */
export type LanguagePreference = SupportedLanguage | undefined

export interface AdvancedConfig {
	maxSteps?: number
	systemInstruction?: string
	experimentalLlmsTxt?: boolean
	experimentalIncludeAllTabs?: boolean
	disableNamedToolChoice?: boolean
}

export interface ExtConfig extends LLMConfig, AdvancedConfig {
	language?: LanguagePreference
}

export interface UseAgentResult {
	status: AgentStatus
	history: HistoricalEvent[]
	activity: AgentActivity | null
	currentTask: string
	config: ExtConfig | null
	execute: (
		task: string,
		options?: {
			displayTask?: string
			mode?: 'page_interaction' | 'commerce_text'
			contextPrompt?: string
			onTextDelta?: (text: string) => void
		}
	) => Promise<ExecutionResult>
	stop: () => void
	configure: (config: ExtConfig) => Promise<void>
}

export function useAgent(): UseAgentResult {
	const agentRef = useRef<MultiPageAgent | null>(null)
	const textAbortControllerRef = useRef<AbortController | null>(null)
	const [status, setStatus] = useState<AgentStatus>('idle')
	const [history, setHistory] = useState<HistoricalEvent[]>([])
	const [activity, setActivity] = useState<AgentActivity | null>(null)
	const [currentTask, setCurrentTask] = useState('')
	const [config, setConfig] = useState<ExtConfig | null>(null)

	useEffect(() => {
		chrome.storage.local.get(['llmConfig', 'language', 'advancedConfig']).then((result) => {
			let llmConfig = (result.llmConfig as LLMConfig) ?? DEMO_CONFIG
			const language = (result.language as SupportedLanguage) || undefined
			const advancedConfig = (result.advancedConfig as AdvancedConfig) ?? {}

			// Auto-migrate legacy testing endpoints
			const migrated = migrateLegacyEndpoint(llmConfig)
			if (migrated !== llmConfig) {
				llmConfig = migrated
				chrome.storage.local.set({ llmConfig: migrated })
			} else if (!result.llmConfig) {
				chrome.storage.local.set({ llmConfig: DEMO_CONFIG })
			}

			setConfig({ ...llmConfig, ...advancedConfig, language })
		})
	}, [])

	useEffect(() => {
		if (!config) return

		const { systemInstruction, ...agentConfig } = config
		const agent = new MultiPageAgent({
			...agentConfig,
			instructions: systemInstruction ? { system: systemInstruction } : undefined,
		})
		agentRef.current = agent

		const handleStatusChange = (e: Event) => {
			const newStatus = agent.status as AgentStatus
			setStatus(newStatus)
			if (newStatus === 'idle' || newStatus === 'completed' || newStatus === 'error') {
				setActivity(null)
			}
		}

		const handleHistoryChange = (e: Event) => {
			setHistory([...agent.history])
		}

		const handleActivity = (e: Event) => {
			const newActivity = (e as CustomEvent).detail as AgentActivity
			setActivity(newActivity)
		}

		agent.addEventListener('statuschange', handleStatusChange)
		agent.addEventListener('historychange', handleHistoryChange)
		agent.addEventListener('activity', handleActivity)

		return () => {
			agent.removeEventListener('statuschange', handleStatusChange)
			agent.removeEventListener('historychange', handleHistoryChange)
			agent.removeEventListener('activity', handleActivity)
			agent.dispose()
		}
	}, [config])

	const execute = useCallback(
		async (
			task: string,
			options?: {
				displayTask?: string
				mode?: 'page_interaction' | 'commerce_text'
				contextPrompt?: string
				onTextDelta?: (text: string) => void
			}
		) => {
			const agent = agentRef.current
			console.log('🚀 [useAgent] start executing task:', task)
			if (!agent || !config) throw new Error('Agent not initialized')

			const mode = options?.mode ?? 'page_interaction'

			setCurrentTask(options?.displayTask ?? task)
			setHistory([])

			if (mode === 'commerce_text') {
				textAbortControllerRef.current?.abort()
				const abortController = new AbortController()
				textAbortControllerRef.current = abortController

				setStatus('running')
				setActivity({ type: 'thinking' })

				try {
					const result = await executeCommerceTextTask(
						{
							task,
							contextPrompt: options?.contextPrompt,
							llmConfig: config,
							systemInstruction: config.systemInstruction,
							onTextDelta: options?.onTextDelta,
						},
						{
							abortSignal: abortController.signal,
						}
					)

					setHistory(result.history)
					setActivity(null)
					setStatus(result.success ? 'completed' : 'error')
					return result
				} catch (error) {
					const message = abortController.signal.aborted ? 'Task stopped' : String(error)
					const errorHistory: HistoricalEvent[] = [{ type: 'error', message, rawResponse: error }]

					setHistory(errorHistory)
					setActivity(null)
					setStatus('error')

					return {
						success: false,
						data: message,
						history: errorHistory,
					}
				} finally {
					if (textAbortControllerRef.current === abortController) {
						textAbortControllerRef.current = null
					}
				}
			}

			return agent.execute(task)
		},
		[config]
	)

	const stop = useCallback(() => {
		textAbortControllerRef.current?.abort()
		agentRef.current?.stop()
	}, [])

	const configure = useCallback(
		async ({
			language,
			maxSteps,
			systemInstruction,
			experimentalLlmsTxt,
			experimentalIncludeAllTabs,
			disableNamedToolChoice,
			...llmConfig
		}: ExtConfig) => {
			await chrome.storage.local.set({ llmConfig })
			if (language) {
				await chrome.storage.local.set({ language })
			} else {
				await chrome.storage.local.remove('language')
			}
			const advancedConfig: AdvancedConfig = {
				maxSteps,
				systemInstruction,
				experimentalLlmsTxt,
				experimentalIncludeAllTabs,
				disableNamedToolChoice,
			}
			await chrome.storage.local.set({ advancedConfig })
			setConfig({ ...llmConfig, ...advancedConfig, language })
		},
		[]
	)

	return {
		status,
		history,
		activity,
		currentTask,
		config,
		execute,
		stop,
		configure,
	}
}
