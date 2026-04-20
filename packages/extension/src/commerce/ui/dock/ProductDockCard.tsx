import type { ProductResultCard } from '@/commerce/domain'
import { cn } from '@/lib/utils'

export function ProductDockCard({ card }: { card: ProductResultCard }) {
	return (
		<div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
			<div className="size-12 shrink-0 overflow-hidden rounded-md border bg-background">
				{card.summary.imageUrl ? (
					<img
						src={card.summary.imageUrl}
						alt={card.summary.title}
						className="size-full object-cover"
					/>
				) : (
					<div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
						No image
					</div>
				)}
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex items-start justify-between gap-2">
					<p className="line-clamp-2 text-xs font-medium text-foreground">{card.summary.title}</p>
					{card.summary.priceText && (
						<span className="shrink-0 text-xs font-semibold text-foreground">
							{card.summary.priceText}
						</span>
					)}
				</div>

				{card.summary.categoryText && (
					<p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
						{card.summary.categoryText}
					</p>
				)}
			</div>

			<div className="flex shrink-0 items-center gap-1">
				{card.actions?.slice(0, 2).map((action) => (
					<button
						key={action.id}
						type="button"
						className={cn(
							'rounded border px-2 py-1 text-[10px] font-medium text-muted-foreground',
							'transition-colors hover:border-foreground/20 hover:text-foreground'
						)}
					>
						{action.label}
					</button>
				))}
			</div>
		</div>
	)
}
