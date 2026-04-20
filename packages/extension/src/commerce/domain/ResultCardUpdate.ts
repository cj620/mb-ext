import type { ResultCard } from './ResultCard'

export interface ResultCardUpdate {
	id: ResultCard['id']
	patch: Partial<ResultCard>
}
