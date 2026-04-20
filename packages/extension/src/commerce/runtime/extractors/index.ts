import { amazonProductExtractor } from './amazon'
import { ProductExtractorRegistry } from './base'

export const productExtractorRegistry = new ProductExtractorRegistry()

productExtractorRegistry.register(amazonProductExtractor)

export { amazonProductExtractor }
