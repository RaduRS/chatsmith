export interface ChunkOptions {
  size?: number
  overlap?: number
  preserveStructure?: boolean
  cleanText?: boolean
  removeHeadersFooters?: boolean
  documentType?: DocumentType
  enableOCR?: boolean
  extractImages?: boolean
  tableHandling?: 'preserve' | 'convert' | 'ignore'
}

export interface TextChunk {
  text: string
  startIndex: number
  endIndex: number
  metadata?: {
    page?: number
    section?: string
    paragraph?: number
    documentType?: DocumentType
    confidence?: number
    source?: 'text' | 'ocr' | 'table'
    tableData?: TableData
    sectionLevel?: number
    lineRange?: { start: number; end: number }
    aiSummary?: string
    keyTopics?: string[]
  }
}

export interface ProcessedDocument {
  text: string
  chunks: TextChunk[]
  metadata: DocumentMetadata
  images: ExtractedImage[]
  tables: TableData[]
  quality: QualityScore
}

export interface DocumentMetadata {
  type: DocumentType
  pages: number
  totalWords: number
  averageWordsPerPage: number
  language: string
  confidence: number
  hasImages: boolean
  hasTables: boolean
  hasForms: boolean
  extractionMethod: 'text' | 'ocr' | 'mixed'
}

export interface ExtractedImage {
  page: number
  index: number
  format: string
  dimensions: { width: number; height: number }
  altText?: string
  ocrText?: string
  confidence?: number
}

export interface TableData {
  page: number
  index: number
  rows: number
  columns: number
  headers: string[]
  data: string[][]
  caption?: string
}

export interface QualityScore {
  overall: number
  textQuality: number
  structureQuality: number
  ocrAccuracy?: number
  issues: QualityIssue[]
}

export interface QualityIssue {
  type: 'ocr_error' | 'structure_error' | 'text_corruption' | 'encoding_issue'
  severity: 'low' | 'medium' | 'high'
  description: string
  location?: { page?: number; line?: number }
}

export type DocumentType = 
  | 'medical'
  | 'business'
  | 'technical'
  | 'legal'
  | 'academic'
  | 'financial'
  | 'general'
  | 'scientific'
  | 'engineering'
  | 'conversation'
  | 'social-media'
  | 'content-creator'
  | 'transcript'
  | 'email'
  | 'report'
  | 'presentation'
  | 'form'
  | 'mixed-content'

export async function analyzeDocumentWithAI(text: string, images: ExtractedImage[] = []): Promise<{
  documentType: DocumentType
  summary: string
  keyTopics: string[]
  contentQuality: number
  language: string
  intendedAudience: string
  extractionConfidence: number
}> {
  try {
    const { OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    // Prepare content for analysis
    const contentAnalysis = `
Analyze this document content and provide structured information:

TEXT CONTENT:
${text.slice(0, 8000)} // Limit text to avoid token limits

${images.length > 0 ? `IMAGES: ${images.length} images detected` : ''}

Please respond with a JSON object containing:
{
  "documentType": "one of: medical, business, technical, legal, academic, financial, scientific, engineering, conversation, social-media, content-creator, transcript, email, report, presentation, form, mixed-content, general",
  "summary": "Brief 2-3 sentence summary of the document's main purpose and content",
  "keyTopics": ["array", "of", "main", "topics", "covered"],
  "contentQuality": 0-100, // Overall quality score based on clarity, structure, completeness
  "language": "detected language",
  "intendedAudience": "description of who this content is for",
  "extractionConfidence": 0-100 // How confident you are in the extraction/analysis
}

Consider these factors:
- Language patterns and terminology
- Document structure and formatting
- Presence of specific sections or elements
- Writing style and tone
- Technical vs general audience indicators
- Professional vs casual communication style
`

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a document analysis expert. Analyze the provided content and determine its type, characteristics, and quality. Respond only with valid JSON."
        },
        {
          role: "user",
          content: contentAnalysis
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    })

    const result = response.choices[0]?.message?.content
    if (!result) {
      throw new Error('No response from AI analysis')
    }

    try {
      return JSON.parse(result)
    } catch (parseError) {
      // Fallback to regex extraction if JSON parsing fails
      console.warn('Failed to parse AI response as JSON, using fallback')
      return extractDocumentInfoFallback(text)
    }
  } catch (error) {
    console.error('AI document analysis failed:', error)
    return extractDocumentInfoFallback(text)
  }
}

function extractDocumentInfoFallback(text: string): {
  documentType: DocumentType
  summary: string
  keyTopics: string[]
  contentQuality: number
  language: string
  intendedAudience: string
  extractionConfidence: number
} {
  // Fallback implementation using traditional pattern matching
  const detectedType = detectDocumentType(text)
  const summary = text.split(/[.!?]/)[0]?.slice(0, 200) + '...' || 'Unable to generate summary'
  
  // Extract key topics (simple approach)
  const words = text.toLowerCase().split(/\s+/)
  const wordFreq: Record<string, number> = {}
  words.forEach(word => {
    if (word.length > 4 && !['this', 'that', 'with', 'from', 'they', 'were', 'been', 'have', 'their', 'said', 'each', 'which', 'would', 'there', 'could', 'other', 'after', 'first', 'well', 'many', 'some', 'time', 'very', 'when', 'much', 'new', 'also', 'these', 'two', 'more', 'her', 'like', 'him', 'see', 'now', 'way', 'who', 'may', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'her', 'can', 'out', 'if', 'up', 'so', 'about', 'what', 'your', 'all', 'any', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1
    }
  })
  
  const keyTopics = Object.entries(wordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word)
  
  return {
    documentType: detectedType,
    summary,
    keyTopics,
    contentQuality: 70, // Default quality score
    language: detectLanguage(text),
    intendedAudience: 'General audience',
    extractionConfidence: 60 // Lower confidence for fallback
  }
}

export function detectDocumentType(text: string): DocumentType {
  const indicators = {
    conversation: [
      /\b(?:said|replied|responded|asked|answered|mentioned|noted|agreed|disagreed)\s+[:\-]/i,
      /\[\d{1,2}:\d{2}(:\d{2})?\]/, // Timestamps like [14:30] or [14:30:45]
      /\b(?:User|Person|Participant|Speaker)\s*\d*[:\-]/i,
      /\b(?:Teams|Slack|Discord|Zoom|Meet|Chat)\s+(?:message|conversation|transcript)/i,
      /(?:^|\n)\s*[A-Z][a-z]+\s+[A-Z][a-z]+[:\-]/m // Name: or Name- patterns
    ],
    'social-media': [
      /[@#]\w+/g, // Mentions and hashtags
      /\b(?:like|comment|share|follow|subscribe|retweet|reply)\b/i,
      /\b(?:Instagram|Twitter|X|TikTok|YouTube|LinkedIn|Facebook|Threads)\s+(?:post|story|video|reel)/i,
      /(?:^|\s)(?:https?:\/\/)(?:www\.)?(?:instagram|twitter|x|tiktok|youtube|linkedin|facebook)\.com/i,
      /\b(?:views|likes|comments|shares|followers|subscribers)\s*[:\-]?\s*\d+/i
    ],
    'content-creator': [
      /\b(?:content creator|influencer|YouTuber|streamer|blogger|vlogger|podcaster)\b/i,
      /\b(?:video|stream|episode|blog|post|content|creation|upload|publish)\b/i,
      /\b(?:monetization|sponsorship|affiliate|brand deal|collaboration)\b/i,
      /\b(?:SEO|engagement|analytics|metrics|algorithm|trending)\b/i,
      /(?:Intro|Outro|Like and subscribe|Comment below|Follow me|Check out my)\b/i
    ],
    transcript: [
      /\b(?:transcript|subtitles|captions|closed.?caption|CC)\b/i,
      /\[\d{1,2}:\d{2}(:\d{2})?\]/, // Timestamps
      /\[\s*(?:music|applause|laughter|silence|inaudible)\s*\]/i,
      /\b(?:Speaker|Voice|Narrator|Host|Guest|Interviewer|Interviewee)\s*\d*[:\-]/i,
      /(?:^|\n)\s*(?:>>|-->|<-->)/m // Transcript markers
    ],
    email: [
      /^(?:From|To|Cc|Bcc|Subject|Date|Reply-To):/im,
      /\b(?:Dear|Hello|Hi|Greetings|Best regards|Sincerely|Cheers|Thanks)\s+/i,
      /(?:@\w+\.\w+|\w+@\w+\.\w+)/, // Email addresses
      /\b(?:attachment|attached|forward|reply|sender|recipient|inbox|outbox)\b/i,
      /^(?:>\s*)+/m // Email reply markers
    ],
    report: [
      /\b(?:report|executive summary|findings|recommendations|conclusion|appendix)\b/i,
      /\b(?:quarterly|annual|monthly|weekly|daily)\s+(?:report|update|summary)\b/i,
      /\b(?:status|progress|update|overview|analysis|insights)\b/i,
      /Report (?:ID|Number|#)?:?\s*\w+/i,
      /Prepared (?:by|for):/i
    ],
    presentation: [
      /\b(?:slide|presentation|deck|pitch|demo|webinar|conference|workshop)\b/i,
      /\b(?:Slide \d+|Page \d+|Screen \d+)/i,
      /\[CLICK\]|\[NEXT\]|\[PREVIOUS\]|\[TRANSITION\]/i,
      /\b(?:bullet point|agenda|outline|summary|key takeaways)\b/i,
      /(?:Thank you for your attention|Questions\?|Q&A session)/i
    ],
    form: [
      /\[\s*\]|\[x\]|\[X\]/g, // Checkboxes
      /_{5,}/g, // Form fields
      /\b(?:Name|Date|Signature|Address|Phone|Email|SSN|ID)\s*[:_]/i,
      /\b(?:Required|Optional|Mandatory|Field|Form|Application)\b/i,
      /\b(?:Yes|No|Maybe|N\/A|Not\s+applicable)\s*[:\-]/i
    ],
    medical: [
      /\b(?:patient|diagnosis|treatment|symptom|medication|prescription|clinical|medical|healthcare|hospital|doctor|physician)\b/i,
      /\b(?:ICD-10|CPT|HCPCS|DRG|EMR|EHR|HIPAA)\b/i,
      /\b(?:mg|ml|mcg|units|dosage|frequency|route)\s+\d+/i
    ],
    business: [
      /\b(?:revenue|profit|loss|market|strategy|business|company|corporation|LLC|Inc)\b/i,
      /\b(?:ROI|KPI|SWOT|B2B|B2C|stakeholder|synergy)\b/i,
      /\b(?:quarterly|annual|financial|budget|forecast)\b/i
    ],
    technical: [
      /\b(?:algorithm|function|method|variable|parameter|return|class|interface|API)\b/i,
      /\b(?:JavaScript|Python|Java|C\+\+|React|Node|database|server|client)\b/i,
      /\b(?:Git|GitHub|Docker|Kubernetes|AWS|Azure)\b/i
    ],
    legal: [
      /\b(?:contract|agreement|clause|provision|liability|warranty|indemnification)\b/i,
      /\b(?:plaintiff|defendant|court|judge|attorney|litigation|arbitration)\b/i,
      /\b(?:herein|whereas|forthwith|hereinafter|aforementioned)\b/i
    ],
    academic: [
      /\b(?:research|study|hypothesis|methodology|findings|conclusion|abstract|citation)\b/i,
      /\b(?:peer-reviewed|journal|publication|conference|symposium)\b/i,
      /\b(?:methodology|literature|review|analysis|discussion)\b/i
    ],
    financial: [
      /\b(?:revenue|expense|asset|liability|equity|cash.?flow|balance.?sheet|income.?statement)\b/i,
      /\b(?:GAAP|IFRS|SEC|audit|compliance|regulatory)\b/i,
      /\b(?:USD|EUR|GBP|\$|€|£)\s*\d+(?:,\d{3})*(?:\.\d{2})?/i
    ],
    scientific: [
      /\b(?:experiment|hypothesis|theory|law|principle|constant|variable|measurement)\b/i,
      /\b(?:laboratory|specimen|sample|analysis|data|results)\b/i,
      /\b(?:temperature|pressure|volume|mass|density|concentration)\s*[:=]\s*\d+/i
    ],
    engineering: [
      /\b(?:design|specification|drawing|blueprint|schematic|diagram)\b/i,
      /\b(?:CAD|CAM|manufacturing|production|assembly|quality.?control)\b/i,
      /\b(?:tolerance|dimension|material|component|system)\b/i
    ]
  }

  const scores: Partial<Record<DocumentType, number>> = {
    medical: 0, business: 0, technical: 0, legal: 0, academic: 0,
    financial: 0, general: 0, scientific: 0, engineering: 0
  }

  // Score each document type
  Object.entries(indicators).forEach(([type, patterns]) => {
    patterns.forEach(pattern => {
      const matches = text.match(pattern)
      const key = type as DocumentType
      scores[key] = (scores[key] ?? 0) + (matches ? matches.length : 0)
    })
  })

  // Find the highest scoring type
  const sortedTypes = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort(([, a], [, b]) => b - a)

  // Return the highest scoring type, or 'general' if no clear match
  return sortedTypes.length > 0 ? sortedTypes[0][0] as DocumentType : 'general'
}

export function getDocumentTypeConfig(type: DocumentType): {
  chunkSize: number
  overlap: number
  preserveStructure: boolean
  enableOCR: boolean
  tableHandling: 'preserve' | 'convert' | 'ignore'
  cleanPatterns: RegExp[]
} {
  const configs = {
    medical: {
      chunkSize: 1500,
      overlap: 300,
      preserveStructure: true,
      enableOCR: true,
      tableHandling: 'preserve' as const,
      cleanPatterns: [
        /\b(?:confidential|proprietary|internal.?use.?only)\b/i,
        /Patient ID:\s*\S+/i,
        /MRN:\s*\S+/i,
        /DOB:\s*\d{1,2}\/\d{1,2}\/\d{2,4}/i
      ]
    },
    business: {
      chunkSize: 2000,
      overlap: 200,
      preserveStructure: true,
      enableOCR: false,
      tableHandling: 'convert' as const,
      cleanPatterns: [
        /\b(?:confidential|proprietary|internal.?use.?only)\b/i,
        /©\s*\d{4}\s*[^\s]+/i,
        /All rights reserved/i
      ]
    },
    technical: {
      chunkSize: 1800,
      overlap: 250,
      preserveStructure: true,
      enableOCR: true,
      tableHandling: 'preserve' as const,
      cleanPatterns: [
        /\b(?:TODO|FIXME|HACK|XXX)\b/i,
        /console\.(?:log|warn|error)\([^)]*\)/gi
      ]
    },
    legal: {
      chunkSize: 1200,
      overlap: 400,
      preserveStructure: true,
      enableOCR: true,
      tableHandling: 'preserve' as const,
      cleanPatterns: [
        /\b(?:attorney.?client.?privilege|work.?product|confidential)\b/i,
        /©\s*\d{4}\s*[^\s]+/i,
        /All rights reserved/i
      ]
    },
    academic: {
      chunkSize: 2200,
      overlap: 200,
      preserveStructure: true,
      enableOCR: false,
      tableHandling: 'preserve' as const,
      cleanPatterns: [
        /\b(?:peer.?review|accepted|published|copyright)\b/i,
        /DOI:\s*[^\s]+/i,
        /ISBN:\s*[^\s]+/i
      ]
    },
    financial: {
      chunkSize: 1500,
      overlap: 300,
      preserveStructure: true,
      enableOCR: true,
      tableHandling: 'preserve' as const,
      cleanPatterns: [
        /\b(?:unaudited|preliminary|draft)\b/i,
        /\$\s*\d+(?:,\d{3})*(?:\.\d{2})?/g, // Remove specific dollar amounts
        /Account #:\s*\S+/i
      ]
    },
    scientific: {
      chunkSize: 2000,
      overlap: 250,
      preserveStructure: true,
      enableOCR: true,
      tableHandling: 'preserve' as const,
      cleanPatterns: [
        /\b(?:experimental|preliminary|draft)\b/i,
        /Patent \d+/i
      ]
    },
    engineering: {
      chunkSize: 1800,
      overlap: 200,
      preserveStructure: true,
      enableOCR: true,
      tableHandling: 'preserve' as const,
      cleanPatterns: [
        /\b(?:proprietary|confidential|internal)\b/i,
        /Drawing #:\s*\S+/i
      ]
    },
    general: {
      chunkSize: 2000,
      overlap: 200,
      preserveStructure: true,
      enableOCR: false,
      tableHandling: 'convert' as const,
      cleanPatterns: []
    },
    conversation: {
      chunkSize: 1200,
      overlap: 400,
      preserveStructure: true,
      enableOCR: false,
      tableHandling: 'ignore' as const,
      cleanPatterns: [
        /\bUser\s+\d+:/gi, // Remove user identifiers
        /\[\d{1,2}:\d{2}(:\d{2})?\]/g // Remove timestamps for cleaner text
      ]
    },
    'social-media': {
      chunkSize: 800,
      overlap: 200,
      preserveStructure: false,
      enableOCR: true,
      tableHandling: 'ignore' as const,
      cleanPatterns: [
        /[@#]\w+/g, // Remove mentions and hashtags for cleaner processing
        /https?:\/\/[^\s]+/g // Remove URLs
      ]
    },
    'content-creator': {
      chunkSize: 1500,
      overlap: 300,
      preserveStructure: true,
      enableOCR: true,
      tableHandling: 'convert' as const,
      cleanPatterns: [
        /\b(?:Like and subscribe|Comment below|Follow me|Check out my)\b/gi,
        /\b(?:smash that like button|hit the bell|notification squad)\b/gi
      ]
    },
    transcript: {
      chunkSize: 1800,
      overlap: 350,
      preserveStructure: true,
      enableOCR: true,
      tableHandling: 'ignore' as const,
      cleanPatterns: [
        /\[\s*(?:music|applause|laughter|silence|inaudible)\s*\]/gi,
        /\[\d{1,2}:\d{2}(:\d{2})?\]/g // Remove timestamps
      ]
    },
    email: {
      chunkSize: 1000,
      overlap: 300,
      preserveStructure: true,
      enableOCR: false,
      tableHandling: 'convert' as const,
      cleanPatterns: [
        /^>\s*/gm, // Remove email reply markers
        /^(?:From|To|Cc|Bcc|Subject|Date):.*$/gim // Remove email headers
      ]
    },
    report: {
      chunkSize: 2200,
      overlap: 250,
      preserveStructure: true,
      enableOCR: true,
      tableHandling: 'preserve' as const,
      cleanPatterns: [
        /\b(?:Confidential|Proprietary|Internal Use Only)\b/gi,
        /Report (?:ID|Number|#)?:?\s*\w+/gi
      ]
    },
    presentation: {
      chunkSize: 1000,
      overlap: 200,
      preserveStructure: true,
      enableOCR: true,
      tableHandling: 'convert' as const,
      cleanPatterns: [
        /\[CLICK\]|\[NEXT\]|\[PREVIOUS\]|\[TRANSITION\]/gi,
        /Slide \d+/gi
      ]
    },
    form: {
      chunkSize: 800,
      overlap: 150,
      preserveStructure: false,
      enableOCR: true,
      tableHandling: 'preserve' as const,
      cleanPatterns: [
        /_{5,}/g, // Remove form field underlines
        /\[\s*\]|\[x\]|\[X\]/gi // Remove checkboxes
      ]
    },
    'mixed-content': {
      chunkSize: 1600,
      overlap: 300,
      preserveStructure: true,
      enableOCR: true,
      tableHandling: 'convert' as const,
      cleanPatterns: [] // Mixed content needs careful handling
    }
  }

  return configs[type]
}

export function cleanPdfText(text: string): string {
  // Remove common PDF extraction artifacts
  const cleaned = text
    // Remove multiple consecutive whitespaces
    .replace(/\s{2,}/g, ' ')
    // Remove standalone numbers that might be page numbers
    .replace(/^\s*\d+\s*$/gm, '')
    // Remove common header/footer patterns
    .replace(/^\s*[-–—]\s*\d+\s*[-–—]\s*$/gm, '')
    // Remove email addresses and URLs that might be headers/footers
    .replace(/^\s*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\s*$/gm, '')
    .replace(/^\s*https?:\/\/[^\s]+\s*$/gm, '')
    // Remove repeated text that might be headers
    .replace(/^(.{10,})\n\1$/gm, '$1')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive blank lines (keep max 2)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  
  return cleaned
}

export function extractPdfStructure(text: string): {
  pages: string[]
  sections: Array<{ title: string; level: number; start: number }>
} {
  const pages: string[] = []
  const sections: Array<{ title: string; level: number; start: number }> = []
  
  // Split by page markers (common in PDF text extraction)
  const pageMarkers = text.split(/\f|\x0C|Page \d+|\n\s*\d+\s*\n/g)
  pages.push(...pageMarkers.map(p => p.trim()).filter(p => p.length > 0))
  
  // Extract section headers (various heading levels)
  const lines = text.split('\n')
  lines.forEach((line, index) => {
    const trimmed = line.trim()
    
    // H1: All caps, longer than 3 chars
    if (/^[A-Z][A-Z\s]{3,}$/.test(trimmed) && trimmed.length > 3) {
      sections.push({ title: trimmed, level: 1, start: index })
    }
    // H2: Title case with numbers (e.g., "1. Introduction")
    else if (/^\d+\.\s+[A-Z]/.test(trimmed)) {
      sections.push({ title: trimmed, level: 2, start: index })
    }
    // H3: Numbered subsections (e.g., "1.1 Background")
    else if (/^\d+\.\d+\.?\s+[A-Z]/.test(trimmed)) {
      sections.push({ title: trimmed, level: 3, start: index })
    }
    // H4: Mixed case with colon
    else if (/^[A-Z][a-zA-Z\s]+:\s*$/.test(trimmed) && trimmed.length > 5) {
      sections.push({ title: trimmed, level: 4, start: index })
    }
  })
  
  return { pages, sections }
}

export function smartChunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const {
    size = 2000,
    overlap = 200,
    preserveStructure = true,
    cleanText = true,
    removeHeadersFooters = true
  } = options

  // Preprocess text if needed
  let processedText = text
  if (cleanText) {
    processedText = cleanPdfText(text)
  }
  
  if (removeHeadersFooters) {
    processedText = cleanPdfText(processedText)
  }

  const len = processedText.length
  const normalizedSize = Math.max(1, Math.floor(size))
  const normalizedOverlap = Math.max(0, Math.min(Math.floor(overlap), normalizedSize - 1))
  const window = Math.min(200, Math.floor(normalizedSize / 2))
  
  const chunks: TextChunk[] = []
  let start = 0
  let paragraphCount = 0
  
  while (start < len) {
    const targetEnd = Math.min(start + normalizedSize, len)
    let end = targetEnd
    
    // Enhanced boundary detection for PDFs
    const forwardSlice = processedText.slice(targetEnd, Math.min(targetEnd + window, len))
    const backwardSlice = processedText.slice(Math.max(start, targetEnd - window), targetEnd)
    
    let forwardBreak = -1
    
    if (preserveStructure) {
      // Look for paragraph boundaries (double newlines)
      const forwardDoubleNl = forwardSlice.indexOf('\n\n')
      // Look for sentence boundaries (period + space + capital letter)
      const forwardSentence = forwardSlice.search(/\.\s+[A-Z]/)
      // Look for list items
      const forwardList = forwardSlice.indexOf('\n- ')
      const forwardNumbered = forwardSlice.search(/\n\d+\.\s+/)
      // Look for section headers
      const forwardH1 = forwardSlice.indexOf('\n# ')
      const forwardH2 = forwardSlice.indexOf('\n## ')
      const forwardH3 = forwardSlice.indexOf('\n### ')
      
      const forwardAny = [
        forwardDoubleNl,
        forwardSentence,
        forwardList,
        forwardNumbered,
        forwardH1,
        forwardH2,
        forwardH3
      ].filter(i => i >= 0)
      
      if (forwardAny.length > 0) {
        forwardBreak = Math.min(...forwardAny)
      }
    }
    
    if (forwardBreak >= 0) {
      end = targetEnd + forwardBreak
    } else {
      // Search backward for clean break points
      const lastNl = backwardSlice.lastIndexOf('\n')
      const lastPeriod = backwardSlice.lastIndexOf('. ')
      const lastComma = backwardSlice.lastIndexOf(', ')
      
      if (lastNl >= 0) {
        end = targetEnd - (backwardSlice.length - lastNl)
      } else if (lastPeriod >= 0) {
        end = targetEnd - (backwardSlice.length - lastPeriod)
      } else if (lastComma >= 0 && lastComma > backwardSlice.length - 50) {
        end = targetEnd - (backwardSlice.length - lastComma)
      }
    }
    
    if (end <= start) end = Math.min(start + normalizedSize, len)
    
    const chunkText = processedText.slice(start, end)
    const paragraphMatches = chunkText.match(/\n\n/g)
    const currentParagraphs = paragraphMatches ? paragraphMatches.length : 0
    
    chunks.push({
      text: chunkText,
      startIndex: start,
      endIndex: end,
      metadata: {
        paragraph: paragraphCount,
        section: undefined // Could be enhanced with section detection
      }
    })
    
    paragraphCount += currentParagraphs
    
    if (end === len) break
    start = Math.max(0, end - normalizedOverlap)
  }
  
  return chunks
}

export async function extractTextFromPdfBuffer(
  buffer: Buffer,
  options: { enableOCR?: boolean; extractImages?: boolean } = {}
): Promise<{ text: string; images: ExtractedImage[]; metadata: { pages: number; info?: unknown; metadata?: unknown } }> {
  try {
    // Primary text extraction with pdf-parse
    const pdfParse = await import('pdf-parse')
    const pdfData = await pdfParse.default(buffer)
    
    let extractedText = pdfData.text || ''
    const images: ExtractedImage[] = []
    
    // If OCR is enabled and text quality is poor, perform OCR
    if (options.enableOCR) {
      const textQuality = validateTextQuality(extractedText)
      if (textQuality.score < 70 || extractedText.length < 100) {
        // Perform OCR on the entire document or specific pages
        const ocrResult = await performOCROnPdf(buffer)
        if (ocrResult.text.length > extractedText.length * 0.8) {
          extractedText = ocrResult.text
          images.push(...ocrResult.images)
        }
      }
    }

    // Extract images if requested
    if (options.extractImages) {
      const extractedImages = await extractImagesFromPdf(buffer)
      images.push(...extractedImages)
    }

    return {
      text: extractedText,
      images,
      metadata: {
        pages: pdfData.numpages,
        info: pdfData.info as unknown,
        metadata: pdfData.metadata as unknown,
      },
    }
  } catch (error) {
    console.error('PDF extraction error:', error)
    
    // Fallback to OCR if text extraction fails
    if (options.enableOCR) {
      return performOCROnPdf(buffer)
    }
    
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function performOCROnPdf(buffer: Buffer): Promise<{ text: string; images: ExtractedImage[]; metadata: { pages: number; info?: unknown; metadata?: unknown } }> {
  try {
    // This would integrate with OCR libraries like tesseract or Google Vision
    // For now, we'll return a placeholder implementation
    console.warn('OCR not fully implemented - using basic text extraction')
    
    const pdfParse = await import('pdf-parse')
    const pdfData = await pdfParse.default(buffer)
    
    return {
      text: pdfData.text || '',
      images: [],
      metadata: {
        pages: pdfData.numpages,
        info: pdfData.info as unknown,
        metadata: pdfData.metadata as unknown,
      },
    }
  } catch (error) {
    throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function extractImagesFromPdf(buffer: Buffer): Promise<ExtractedImage[]> {
  try {
    // Enhanced image extraction with AI analysis
    const images: ExtractedImage[] = []
    
    // This would integrate with libraries like pdf2pic, pdf-image, or pdf-poppler
    // For now, we'll create a comprehensive analysis function
    
    // Extract basic image info from PDF metadata
    const pdfParse = await import('pdf-parse')
    const pdfData = await pdfParse.default(buffer)
    
    // Simulate image extraction (in real implementation, this would extract actual images)
    const mockImages = [
      {
        page: 1,
        index: 0,
        format: 'jpeg',
        dimensions: { width: 800, height: 600 },
        altText: 'Chart or diagram',
        confidence: 0.8
      }
    ]
    
    // Analyze each image with AI for better understanding
    for (const img of mockImages) {
      try {
        // This would convert the image to base64 and analyze it
        const analysis = await analyzeImageWithAI(img)
        images.push({
          ...img,
          altText: analysis.description,
          ocrText: analysis.extractedText,
          confidence: analysis.confidence
        })
      } catch (imgError) {
        console.warn('Image analysis failed for image:', img.index, imgError)
        images.push(img) // Add basic image info even if AI analysis fails
      }
    }
    
    return images
  } catch (error) {
    console.error('Image extraction error:', error)
    return []
  }
}

async function analyzeImageWithAI(imageInfo: ExtractedImage): Promise<{
  description: string
  extractedText: string
  confidence: number
  contentType: 'chart' | 'diagram' | 'screenshot' | 'photo' | 'document' | 'other'
}> {
  try {
    const { analyzeImageFromBase64 } = await import('@/lib/ai/vision')
    
    // For now, return mock analysis
    // In real implementation, convert image to base64 and analyze
    const mockBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' // 1x1 pixel
    
    const analysis = await analyzeImageFromBase64(mockBase64)
    
    return {
      description: analysis || 'Image content analysis',
      extractedText: extractTextFromImageDescription(analysis),
      confidence: 0.85,
      contentType: classifyImageContent(analysis)
    }
  } catch (error) {
    console.error('AI image analysis failed:', error)
    return {
      description: 'Unable to analyze image content',
      extractedText: '',
      confidence: 0.3,
      contentType: 'other'
    }
  }
}

function extractTextFromImageDescription(description: string): string {
  // Extract any mentioned text from the AI description
  const textMatches = description.match(/[""']([^""']+)[""']/g)
  if (textMatches) {
    return textMatches.map(match => match.replace(/[""']/g, '')).join(' ')
  }
  return ''
}

function classifyImageContent(description: string): 'chart' | 'diagram' | 'screenshot' | 'photo' | 'document' | 'other' {
  const desc = description.toLowerCase()
  
  if (desc.includes('chart') || desc.includes('graph') || desc.includes('plot')) return 'chart'
  if (desc.includes('diagram') || desc.includes('flow') || desc.includes('schema')) return 'diagram'
  if (desc.includes('screenshot') || desc.includes('screen') || desc.includes('interface')) return 'screenshot'
  if (desc.includes('document') || desc.includes('text') || desc.includes('page')) return 'document'
  if (desc.includes('photo') || desc.includes('picture') || desc.includes('image')) return 'photo'
  
  return 'other'
}

export function validateTextQuality(text: string): {
  isValid: boolean
  issues: string[]
  score: number
} {
  const issues: string[] = []
  let score = 100
  
  // Check for excessive whitespace
  const whitespaceRatio = (text.match(/\s/g) || []).length / text.length
  if (whitespaceRatio > 0.3) {
    issues.push('Excessive whitespace detected')
    score -= 20
  }
  
  // Check for repeated characters (might indicate OCR issues)
  const repeatedChars = text.match(/(.)\1{4,}/g) || []
  if (repeatedChars.length > 0) {
    issues.push('Repeated characters detected (possible OCR artifacts)')
    score -= 15
  }
  
  // Check for very long words (might indicate broken text)
  const longWords = text.match(/\b\w{25,}\b/g) || []
  if (longWords.length > 5) {
    issues.push('Many very long words detected (possible text corruption)')
    score -= 25
  }
  
  // Check for minimum meaningful content
  const meaningfulChars = text.replace(/[^\w\s]/g, '').length
  if (meaningfulChars < text.length * 0.5) {
    issues.push('Low ratio of meaningful characters')
    score -= 30
  }
  
  // Check for reasonable sentence structure
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
  if (sentences.length < 3 && text.length > 500) {
    issues.push('Poor sentence structure detected')
    score -= 10
  }
  
  return {
    isValid: score >= 70,
    issues,
    score: Math.max(0, score)
  }
}

export function optimizeChunkSize(text: string, targetChunkSize: number = 2000): number {
  // Analyze text structure to suggest optimal chunk size
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
  
  // For technical documents, prefer smaller chunks
  const technicalIndicators = /\b(?:algorithm|function|method|variable|parameter|return)\b/i
  const isTechnical = technicalIndicators.test(text)
  
  // For narrative text, can use larger chunks
  const narrativeIndicators = /\b(?:story|narrative|character|plot|scene)\b/i
  const isNarrative = narrativeIndicators.test(text)
  
  let optimalSize = targetChunkSize
  
  if (isTechnical && !isNarrative) {
    optimalSize = Math.min(targetChunkSize, Math.max(1000, avgSentenceLength * 15))
  } else if (isNarrative && avgSentenceLength < 100) {
    optimalSize = Math.min(targetChunkSize * 1.2, 2500)
  }
  
  return Math.max(500, Math.min(3000, optimalSize))
}

export async function processDocumentForEmbedding(
  input: string | Buffer,
  options: ChunkOptions = {}
): Promise<ProcessedDocument> {
  // Auto-detect document type if not specified
  let text = ''
  let images: ExtractedImage[] = []
  let tables: TableData[] = []
  let detectedType: DocumentType = options.documentType || 'general'
  let aiAnalysis: Awaited<ReturnType<typeof analyzeDocumentWithAI>> | null = null
  
  // Handle different input types
  if (Buffer.isBuffer(input)) {
    // PDF buffer processing
    const extractionOptions = {
      enableOCR: options.enableOCR ?? true,
      extractImages: options.extractImages ?? true
    }
    
    const extracted = await extractTextFromPdfBuffer(input, extractionOptions)
    text = extracted.text
    images = extracted.images
    
    // Use AI to analyze the document content
    if (options.documentType === undefined) {
      try {
        aiAnalysis = await analyzeDocumentWithAI(text, images)
        detectedType = aiAnalysis.documentType
      } catch (error) {
        console.warn('AI analysis failed, falling back to pattern detection:', error)
        detectedType = detectDocumentType(text)
      }
    }
    
    // Extract tables if present
    if (options.tableHandling !== 'ignore') {
      tables = await extractTablesFromPdf(input)
    }
  } else {
    // Plain text input
    text = input
    
    // Use AI to analyze the text content
    if (options.documentType === undefined) {
      try {
        aiAnalysis = await analyzeDocumentWithAI(text)
        detectedType = aiAnalysis.documentType
      } catch (error) {
        console.warn('AI analysis failed, falling back to pattern detection:', error)
        detectedType = detectDocumentType(text)
      }
    } else {
      detectedType = options.documentType
    }
  }

  // Get document-specific configuration
  const config = getDocumentTypeConfig(detectedType)
  
  // Apply document-specific cleaning
  let cleanedText = text
  if (options.cleanText !== false) {
    cleanedText = cleanDocumentText(text, detectedType)
  }
  
  // Extract document structure
  const structure = extractDocumentStructure(cleanedText, detectedType)
  
  // Smart chunking with document-specific settings
  const chunks = smartChunkText(cleanedText, {
    size: options.size || config.chunkSize,
    overlap: options.overlap || config.overlap,
    preserveStructure: options.preserveStructure ?? config.preserveStructure,
    cleanText: false, // Already cleaned
    removeHeadersFooters: false // Already cleaned
  })

  // Enhance chunks with document-specific metadata
  const enhancedChunks = chunks.map(chunk => {
    const startLine = cleanedText.slice(0, chunk.startIndex).split('\n').length
    const endLine = cleanedText.slice(0, chunk.endIndex).split('\n').length
    
    // Find relevant sections and metadata
    const section = structure.sections.find(s => 
      s.start >= startLine && s.start <= endLine
    )
    
    const table = tables.find(t => 
      t.page >= Math.floor(startLine / 50) && t.page <= Math.floor(endLine / 50)
    )
    
    return {
      ...chunk,
      metadata: {
        ...chunk.metadata,
        documentType: detectedType,
        section: section?.title,
        sectionLevel: section?.level,
        lineRange: { start: startLine, end: endLine },
        tableData: table,
        confidence: calculateChunkConfidence(chunk.text, detectedType),
        aiSummary: aiAnalysis?.summary,
        keyTopics: aiAnalysis?.keyTopics
      }
    }
  })

  // Calculate document metadata
  const metadata: DocumentMetadata = {
    type: detectedType,
    pages: structure.pages.length,
    totalWords: cleanedText.split(/\s+/).length,
    averageWordsPerPage: Math.round(cleanedText.split(/\s+/).length / Math.max(1, structure.pages.length)),
    language: aiAnalysis?.language || detectLanguage(cleanedText),
    confidence: aiAnalysis?.extractionConfidence || calculateDocumentConfidence(cleanedText, detectedType),
    hasImages: images.length > 0,
    hasTables: tables.length > 0,
    hasForms: detectForms(cleanedText),
    extractionMethod: images.length > 0 ? 'mixed' : 'text'
  }

  // Calculate quality score
  const quality = calculateDocumentQuality(cleanedText, enhancedChunks, metadata)

  return {
    text: cleanedText,
    chunks: enhancedChunks,
    metadata,
    images,
    tables,
    quality
  }
}

export async function processPdfTextForEmbedding(
  text: string, 
  options: ChunkOptions = {}
): Promise<{ chunks: TextChunk[]; metadata: any }> {
  // Legacy function - redirects to new comprehensive processor
  const result = await processDocumentForEmbedding(text, options)
  return {
    chunks: result.chunks,
    metadata: {
      totalPages: result.metadata.pages,
      totalSections: result.metadata.type,
      totalChunks: result.chunks.length,
      averageChunkSize: result.chunks.reduce((sum, c) => sum + c.text.length, 0) / result.chunks.length
    }
  }
}

export function extractDocumentStructure(text: string, documentType: DocumentType): {
  pages: string[]
  sections: Array<{ title: string; level: number; start: number }>
} {
  const pages: string[] = []
  const sections: Array<{ title: string; level: number; start: number }> = []
  
  // Split by page markers (common in PDF text extraction)
  const pageMarkers = text.split(/\f|\x0C|Page \d+|\n\s*\d+\s*\n/g)
  pages.push(...pageMarkers.map(p => p.trim()).filter(p => p.length > 0))
  
  // Document type-specific section detection
  const lines = text.split('\n')
  
  lines.forEach((line, index) => {
    const trimmed = line.trim()
    
    // Medical document sections
    if (documentType === 'medical') {
      if (/^\s*(?:Patient History|Diagnosis|Treatment Plan|Medications|Allergies|Vital Signs)\s*$/i.test(trimmed)) {
        sections.push({ title: trimmed, level: 1, start: index })
      }
      if (/^\s*(?:Chief Complaint|History of Present Illness|Review of Systems)\s*$/i.test(trimmed)) {
        sections.push({ title: trimmed, level: 2, start: index })
      }
    }
    
    // Business document sections
    if (documentType === 'business') {
      if (/^\s*(?:Executive Summary|Market Analysis|Financial Projections|Conclusion)\s*$/i.test(trimmed)) {
        sections.push({ title: trimmed, level: 1, start: index })
      }
      if (/^\s*(?:Introduction|Methodology|Results|Discussion)\s*$/i.test(trimmed)) {
        sections.push({ title: trimmed, level: 2, start: index })
      }
    }
    
    // Technical document sections
    if (documentType === 'technical') {
      if (/^\s*(?:Architecture|Implementation|API Reference|Configuration)\s*$/i.test(trimmed)) {
        sections.push({ title: trimmed, level: 1, start: index })
      }
      if (/^\s*(?:Setup|Installation|Usage|Examples)\s*$/i.test(trimmed)) {
        sections.push({ title: trimmed, level: 2, start: index })
      }
    }
    
    // Legal document sections
    if (documentType === 'legal') {
      if (/^\s*(?:Contract Terms|Liability|Warranty|Indemnification)\s*$/i.test(trimmed)) {
        sections.push({ title: trimmed, level: 1, start: index })
      }
      if (/^\s*(?:WHEREAS|THEREFORE|NOW, THEREFORE|IN WITNESS WHEREOF)\s*$/i.test(trimmed)) {
        sections.push({ title: trimmed, level: 2, start: index })
      }
    }
    
    // Academic document sections
    if (documentType === 'academic') {
      if (/^\s*(?:Abstract|Introduction|Literature Review|Methodology|Results|Discussion|Conclusion|References)\s*$/i.test(trimmed)) {
        sections.push({ title: trimmed, level: 1, start: index })
      }
      if (/^\s*(?:Hypothesis|Research Questions|Data Analysis|Limitations)\s*$/i.test(trimmed)) {
        sections.push({ title: trimmed, level: 2, start: index })
      }
    }
    
    // Financial document sections
    if (documentType === 'financial') {
      if (/^\s*(?:Balance Sheet|Income Statement|Cash Flow|Equity|Notes)\s*$/i.test(trimmed)) {
        sections.push({ title: trimmed, level: 1, start: index })
      }
      if (/^\s*(?:Assets|Liabilities|Revenue|Expenses|Ratios)\s*$/i.test(trimmed)) {
        sections.push({ title: trimmed, level: 2, start: index })
      }
    }
    
    // Scientific document sections
    if (documentType === 'scientific') {
      if (/^\s*(?:Materials and Methods|Results|Discussion|Conclusion|Acknowledgments)\s*$/i.test(trimmed)) {
        sections.push({ title: trimmed, level: 1, start: index })
      }
      if (/^\s*(?:Experimental Setup|Data Collection|Statistical Analysis)\s*$/i.test(trimmed)) {
        sections.push({ title: trimmed, level: 2, start: index })
      }
    }
    
    // Engineering document sections
    if (documentType === 'engineering') {
      if (/^\s*(?:Specifications|Design Requirements|Testing|Validation|Deployment)\s*$/i.test(trimmed)) {
        sections.push({ title: trimmed, level: 1, start: index })
      }
      if (/^\s*(?:System Overview|Component Details|Interface Definitions)\s*$/i.test(trimmed)) {
        sections.push({ title: trimmed, level: 2, start: index })
      }
    }
    
    // General document sections (fallback)
    if (documentType === 'general') {
      // H1: All caps, longer than 3 chars
      if (/^[A-Z][A-Z\s]{3,}$/.test(trimmed) && trimmed.length > 3) {
        sections.push({ title: trimmed, level: 1, start: index })
      }
      // H2: Title case with numbers (e.g., "1. Introduction")
      else if (/^\d+\.\s+[A-Z]/.test(trimmed)) {
        sections.push({ title: trimmed, level: 2, start: index })
      }
      // H3: Numbered subsections (e.g., "1.1 Background")
      else if (/^\d+\.\d+\.?\s+[A-Z]/.test(trimmed)) {
        sections.push({ title: trimmed, level: 3, start: index })
      }
      // H4: Mixed case with colon
      else if (/^[A-Z][a-zA-Z\s]+:\s*$/.test(trimmed) && trimmed.length > 5) {
        sections.push({ title: trimmed, level: 4, start: index })
      }
    }
  })
  
  return { pages, sections }
}

export function cleanDocumentText(text: string, documentType: DocumentType): string {
  const config = getDocumentTypeConfig(documentType)
  
  let cleaned = text
    // Remove multiple consecutive whitespaces
    .replace(/\s{2,}/g, ' ')
    // Remove standalone numbers that might be page numbers
    .replace(/^\s*\d+\s*$/gm, '')
    // Remove common header/footer patterns
    .replace(/^\s*[-–—]\s*\d+\s*[-–—]\s*$/gm, '')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive blank lines (keep max 2)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  
  // Apply document-specific cleaning patterns
  config.cleanPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '[REDACTED]')
  })
  
  return cleaned
}

export function detectLanguage(text: string): string {
  // Simple language detection based on common words
  const languages = {
    english: /\b(?:the|and|or|but|in|on|at|to|for|of|with|by|from|up|about|into|through|during|before|after|above|below|between|among|under|over|within|without|against|toward|towards|upon|beneath|beside|besides|except|including|regarding|concerning|considering|despite|following|including|regarding|concerning|considering|despite|following)\b/i,
    spanish: /\b(?:el|la|de|que|y|a|en|un|es|se|no|te|lo|le|da|su|por|son|con|para|como|esta|pero|más|sus|le|ya|os|yo|hay|vez|sin|su|ya|les|nos|me|que|eso|muy|cada|eso|ese|esa|eso|esos|esas)\b/i,
    french: /\b(?:le|de|et|à|un|il|être|et|en|avoir|que|pour|dans|ce|son|une|sur|avec|ne|se|pas|plus|pouvoir|par|je|mais|tout|faire|son|mettre|autre|mais|nous|vous|ils|elles|on)\b/i,
    german: /\b(?:der|die|und|in|den|von|zu|das|mit|sich|des|auf|für|ist|im|dem|nicht|ein|eine|auch|als|an|es|er|nach|bei|einer|der|die|das|wer|was|wann|wo|warum|wie|welche|welcher|welches|welchen|welchem)\b/i
  }
  
  const scores: Record<string, number> = {}
  
  Object.entries(languages).forEach(([lang, pattern]) => {
    const matches = text.match(pattern)
    scores[lang] = matches ? matches.length : 0
  })
  
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a)
  return sorted.length > 0 && sorted[0][1] > 0 ? sorted[0][0] : 'unknown'
}

export function calculateDocumentConfidence(text: string, documentType: DocumentType): number {
  const config = getDocumentTypeConfig(documentType)
  let confidence = 50 // Base confidence
  
  // Check for document-specific keywords
  const typeIndicators: Partial<Record<DocumentType, RegExp>> = {
    medical: /\b(?:patient|diagnosis|treatment|medication|prescription|clinical)\b/gi,
    business: /\b(?:revenue|profit|market|strategy|business|company)\b/gi,
    technical: /\b(?:function|method|variable|class|interface|API)\b/gi,
    legal: /\b(?:contract|agreement|liability|warranty|provision)\b/gi,
    academic: /\b(?:research|study|hypothesis|methodology|findings)\b/gi,
    financial: /\b(?:asset|liability|equity|revenue|expense|cash)\b/gi,
    scientific: /\b(?:experiment|hypothesis|theory|measurement|analysis)\b/gi,
    engineering: /\b(?:design|specification|system|component|manufacturing)\b/gi
  }
  
  const indicator = typeIndicators[documentType]
  if (indicator) {
    const matches = text.match(indicator)
    confidence += matches ? Math.min(matches.length * 5, 30) : 0
  }
  
  // Check text structure quality
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
  if (sentences.length > 10) confidence += 10
  
  // Check for reasonable paragraph structure
  const paragraphs = text.split(/\n\n/).filter(p => p.trim().length > 50)
  if (paragraphs.length > 3) confidence += 10
  
  return Math.min(100, Math.max(0, confidence))
}

export function calculateChunkConfidence(chunkText: string, documentType: DocumentType): number {
  let confidence = 70 // Base confidence
  
  // Check for meaningful content
  const words = chunkText.split(/\s+/).filter(w => w.length > 2)
  if (words.length < 10) confidence -= 20
  
  // Check for excessive repetition
  const wordFreq: Record<string, number> = {}
  words.forEach(word => {
    const lower = word.toLowerCase()
    wordFreq[lower] = (wordFreq[lower] || 0) + 1
  })
  
  const maxFreq = Math.max(...Object.values(wordFreq))
  if (maxFreq > words.length * 0.3) confidence -= 15
  
  // Check for document-specific content
  const docConfidence = calculateDocumentConfidence(chunkText, documentType)
  confidence += (docConfidence - 50) * 0.3
  
  return Math.min(100, Math.max(0, confidence))
}

export function detectForms(text: string): boolean {
  const formIndicators = [
    /\[\s*\]/g, // Empty checkboxes
    /\[x\]/gi, // Checked checkboxes
    /_{3,}/g, // Underlines for form fields
    /\b(?:Name|Date|Signature|Address|Phone|Email)\s*[:_]/gi, // Form labels
    /\b(?:Yes|No|Maybe)\s*[:_]/gi // Multiple choice
  ]
  
  const matches = formIndicators.reduce((total, pattern) => {
    const found = text.match(pattern)
    return total + (found ? found.length : 0)
  }, 0)
  
  return matches > 3
}

export async function extractTablesFromPdf(buffer: Buffer): Promise<TableData[]> {
  try {
    // This would integrate with table extraction libraries like pdf-table-extractor
    // For now, return empty array as placeholder
    console.warn('Table extraction not fully implemented')
    return []
  } catch (error) {
    console.error('Table extraction error:', error)
    return []
  }
}

export function calculateDocumentQuality(
  text: string, 
  chunks: TextChunk[], 
  metadata: DocumentMetadata
): QualityScore {
  const issues: QualityIssue[] = []
  
  // Text quality assessment
  const textQuality = validateTextQuality(text)
  textQuality.issues.forEach(issue => {
    issues.push({
      type: 'text_corruption',
      severity: textQuality.score > 70 ? 'low' : textQuality.score > 40 ? 'medium' : 'high',
      description: issue
    })
  })
  
  // Structure quality assessment
  let structureScore = 80
  if (chunks.length === 0) {
    structureScore -= 50
    issues.push({
      type: 'structure_error',
      severity: 'high',
      description: 'No valid chunks generated'
    })
  }
  
  if (chunks.some(chunk => chunk.text.length < 50)) {
    structureScore -= 20
    issues.push({
      type: 'structure_error',
      severity: 'medium',
      description: 'Some chunks are too short'
    })
  }
  
  // Overall quality calculation
  const overallScore = Math.round(
    (textQuality.score * 0.4) + 
    (structureScore * 0.3) + 
    (metadata.confidence * 0.3)
  )
  
  return {
    overall: Math.min(100, Math.max(0, overallScore)),
    textQuality: textQuality.score,
    structureQuality: structureScore,
    issues
  }
}

export async function comprehensiveContentAnalysis(
  input: string | Buffer,
  options: {
    includeAIAnalysis?: boolean
    extractEntities?: boolean
    sentimentAnalysis?: boolean
    topicModeling?: boolean
    languageDetection?: boolean
  } = {}
): Promise<{
  document: ProcessedDocument
  entities: Array<{ text: string; type: string; confidence: number }>
  sentiment: { score: number; label: 'positive' | 'negative' | 'neutral' }
  topics: string[]
  language: string
  readability: {
    score: number
    grade: string
    complexity: 'simple' | 'moderate' | 'complex'
  }
}> {
  // Process the document first
  const document = await processDocumentForEmbedding(input)
  
  // Initialize results
  let entities: Array<{ text: string; type: string; confidence: number }> = []
  let sentiment = { score: 0, label: 'neutral' as const }
  let topics: string[] = []
  let readability: { score: number; grade: string; complexity: 'simple' | 'moderate' | 'complex' } = { score: 0, grade: 'unknown', complexity: 'moderate' }
  
  if (options.includeAIAnalysis !== false) {
    try {
      const { OpenAI } = await import('openai')
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      
      const basicTopics = extractBasicTopics(document.text, document.metadata.type)
      const analysisPrompt = `
Analyze this document comprehensively and provide structured insights:

Document Text (first 5000 characters):
${document.text.slice(0, 5000)}

Document Type: ${document.metadata.type}
Key Topics: ${basicTopics.join(', ')}

Please provide a JSON response with:
{
  "entities": [
    {"text": "entity name", "type": "PERSON|ORG|LOCATION|DATE|MISC", "confidence": 0.9}
  ],
  "sentiment": {"score": -1 to 1, "label": "positive|negative|neutral"},
  "topics": ["main topic 1", "main topic 2", "main topic 3"],
  "readability": {"score": 0-100, "grade": "8th grade", "complexity": "simple|moderate|complex"}
}

Focus on extracting meaningful insights that would help understand and categorize this content effectively.
`

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a content analysis expert. Extract entities, analyze sentiment, identify topics, and assess readability. Respond only with valid JSON."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1500
      })

      const result = response.choices[0]?.message?.content
      if (result) {
        try {
          const analysis = JSON.parse(result)
          entities = analysis.entities || []
          sentiment = analysis.sentiment || sentiment
          topics = analysis.topics || []
          readability = analysis.readability || readability
        } catch (parseError) {
          console.warn('Failed to parse AI analysis JSON, using fallback methods')
        }
      }
    } catch (error) {
      console.warn('AI content analysis failed:', error)
    }
  }
  
  // Fallback methods if AI analysis failed or was disabled
  if (entities.length === 0) {
    entities = extractBasicEntities(document.text)
  }
  
  if (topics.length === 0) {
    topics = extractBasicTopics(document.text, document.metadata.type)
  }
  
  if (readability.score === 0) {
    readability = calculateReadability(document.text)
  }
  
  return {
    document,
    entities,
    sentiment,
    topics,
    language: document.metadata.language,
    readability
  }
}

function extractBasicEntities(text: string): Array<{ text: string; type: string; confidence: number }> {
  const entities: Array<{ text: string; type: string; confidence: number }> = []
  
  // Simple regex-based entity extraction
  const patterns = {
    PERSON: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
    ORG: /\b(?:Inc\.|LLC|Corp\.|Company|Organization|University|Hospital)\b/gi,
    LOCATION: /\b(?:USA|UK|Canada|Australia|Germany|France|Japan|China|India|Brazil)\b/g,
    DATE: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}\b/g,
    MISC: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g
  }
  
  Object.entries(patterns).forEach(([type, pattern]) => {
    const matches = text.match(pattern)
    if (matches) {
      matches.forEach(match => {
        if (!entities.some(e => e.text === match)) {
          entities.push({ text: match, type, confidence: 0.7 })
        }
      })
    }
  })
  
  return entities.slice(0, 20) // Limit to prevent overwhelming results
}

function extractBasicTopics(text: string, documentType: DocumentType): string[] {
  const words = text.toLowerCase().split(/\s+/)
  const wordFreq: Record<string, number> = {}
  
  // Filter out common stop words
  const stopWords = new Set([
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'under', 'over', 'within', 'without', 'against', 'toward', 'towards', 'upon', 'beneath', 'beside', 'besides', 'except', 'including', 'regarding', 'concerning', 'considering', 'despite', 'following', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'don', 'should', 'now'
  ])
  
  words.forEach(word => {
    if (word.length > 3 && !stopWords.has(word) && /^[a-z]+$/.test(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1
    }
  })
  
  // Get top topics based on frequency
  const sortedTopics = Object.entries(wordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([word]) => word)
  
  // Add document-type specific topics
  const docTypeTopics: Partial<Record<DocumentType, string[]>> = {
    medical: ['patient', 'treatment', 'diagnosis', 'symptom', 'medication'],
    business: ['revenue', 'market', 'strategy', 'customer', 'product'],
    technical: ['system', 'data', 'algorithm', 'function', 'interface'],
    legal: ['contract', 'agreement', 'liability', 'provision', 'compliance'],
    academic: ['research', 'study', 'hypothesis', 'methodology', 'findings'],
    financial: ['asset', 'liability', 'equity', 'revenue', 'expense'],
    scientific: ['experiment', 'hypothesis', 'theory', 'measurement', 'analysis'],
    engineering: ['design', 'system', 'component', 'specification', 'testing'],
    conversation: ['said', 'asked', 'replied', 'mentioned', 'discussed'],
    'social-media': ['post', 'comment', 'share', 'like', 'follow'],
    'content-creator': ['content', 'video', 'audience', 'engagement', 'creation'],
    transcript: ['speaker', 'transcript', 'audio', 'recording', 'dialogue'],
    email: ['sender', 'recipient', 'subject', 'attachment', 'message'],
    report: ['findings', 'recommendations', 'summary', 'analysis', 'conclusion'],
    presentation: ['slide', 'presentation', 'audience', 'speaker', 'topic'],
    form: ['field', 'required', 'optional', 'input', 'validation'],
    'mixed-content': ['content', 'document', 'information', 'text', 'data'],
    general: []
  }
  
  const specificTopics = docTypeTopics[documentType] ?? []
  const finalTopics = [...new Set([...specificTopics, ...sortedTopics])].slice(0, 10)
  
  return finalTopics
}

function calculateReadability(text: string): {
  score: number
  grade: string
  complexity: 'simple' | 'moderate' | 'complex'
} {
  // Simple readability calculation (similar to Flesch Reading Ease)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const syllables = words.reduce((total, word) => {
    // Rough syllable count
    const count = word.toLowerCase().split(/[aeiouy]+/).length - 1
    return total + Math.max(1, count)
  }, 0)
  
  if (sentences.length === 0 || words.length === 0) {
    return { score: 0, grade: 'unknown', complexity: 'moderate' }
  }
  
  const avgSentenceLength = words.length / sentences.length
  const avgSyllablesPerWord = syllables / words.length
  
  // Flesch Reading Ease approximation
  const score = Math.max(0, Math.min(100, 
    206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord)
  ))
  
  let grade: string
  let complexity: 'simple' | 'moderate' | 'complex'
  
  if (score >= 80) {
    grade = '6th grade'
    complexity = 'simple'
  } else if (score >= 60) {
    grade = '8th-9th grade'
    complexity = 'moderate'
  } else if (score >= 40) {
    grade = '10th-12th grade'
    complexity = 'moderate'
  } else {
    grade = 'College level'
    complexity = 'complex'
  }
  
  return { score: Math.round(score), grade, complexity }
}

export function chunkText(text: string, size: number = 2000, overlap: number = 200): string[] {
  const len = text.length
  const normalizedSize = Math.max(1, Math.floor(size))
  const normalizedOverlap = Math.max(0, Math.min(Math.floor(overlap), normalizedSize - 1))
  const window = Math.min(200, Math.floor(normalizedSize / 2))
  const chunks: string[] = []
  let start = 0
  while (start < len) {
    const targetEnd = Math.min(start + normalizedSize, len)
    let end = targetEnd
    // Prefer to cut on clean boundaries nearby
    const forwardSlice = text.slice(targetEnd, Math.min(targetEnd + window, len))
    const backwardSlice = text.slice(Math.max(start, targetEnd - window), targetEnd)
    // Look forward for double newline or list/heading markers
    let forwardBreak = -1
    const forwardDoubleNl = forwardSlice.indexOf('\n\n')
    const forwardList = forwardSlice.indexOf('\n- ')
    const forwardH3 = forwardSlice.indexOf('\n### ')
    const forwardAny = [forwardDoubleNl, forwardList, forwardH3].filter(i => i >= 0)
    if (forwardAny.length > 0) forwardBreak = Math.min(...forwardAny)
    if (forwardBreak >= 0) {
      end = targetEnd + forwardBreak
    } else {
      // Otherwise, search backward for a newline boundary
      const lastNl = backwardSlice.lastIndexOf('\n')
      if (lastNl >= 0) end = targetEnd - (backwardSlice.length - lastNl)
    }
    if (end <= start) end = Math.min(start + normalizedSize, len)
    chunks.push(text.slice(start, end))
    if (end === len) break
    start = Math.max(0, end - normalizedOverlap)
  }
  return chunks
}