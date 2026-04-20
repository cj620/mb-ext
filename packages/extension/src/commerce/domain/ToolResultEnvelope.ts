import type { ResultCard } from './ResultCard'
import type { ResultCardUpdate } from './ResultCardUpdate'

export interface ToolResultEnvelope {
	message: string
	resultCards?: ResultCard[]
	updates?: ResultCardUpdate[]
}
