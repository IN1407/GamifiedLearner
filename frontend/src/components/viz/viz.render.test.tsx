// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TokenizerViz from './TokenizerViz'
import SimilarityViz from './SimilarityViz'
import ChunkingViz from './ChunkingViz'

// Smoke-render each visualization to confirm it mounts without throwing and
// draws its initial (deterministic) state from data.
describe('teaching visualizations render', () => {
  it('TokenizerViz shows token + character stats', () => {
    const html = renderToStaticMarkup(<TokenizerViz />)
    expect(html).toContain('Tokenizer explorer')
    expect(html).toContain('Tokens')
    expect(html).toContain('Characters')
  })

  it('SimilarityViz shows a cosine similarity value and both word vectors', () => {
    const html = renderToStaticMarkup(<SimilarityViz />)
    expect(html).toContain('Vector similarity')
    expect(html).toContain('cosine similarity')
    expect(html).toContain('cat')
    expect(html).toContain('kitten')
  })

  it('ChunkingViz renders the sample document with chunk shading', () => {
    const html = renderToStaticMarkup(<ChunkingViz />)
    expect(html).toContain('Chunking visualizer')
    expect(html).toContain('chunk')
    // renders per-character spans with background colors
    expect(html).toContain('background-color')
  })
})
