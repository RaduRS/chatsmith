declare module 'pdf-parse' {
  export interface PdfData {
    numpages: number
    numrender: number
    info: unknown
    metadata: unknown
    version: string
    text: string
  }

  export interface PdfParseOptions {
    pagerender?: (pageData: unknown) => string | Promise<string>
    max?: number
  }

  export default function pdfParse(buffer: Buffer, options?: PdfParseOptions): Promise<PdfData>
}