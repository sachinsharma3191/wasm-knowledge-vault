// src/lib/ai/qa.ts
import { pipeline } from '@xenova/transformers'

let qaPipeline: any = null

async function getPipeline() {
    if (!qaPipeline) {
        qaPipeline = await pipeline('question-answering', 'Xenova/distilbert-base-cased-distilled-squad')
    }
    return qaPipeline
}

export interface QAResult {
    answer: string
    score: number
    start: number
    end: number
}

export async function runQA(question: string, context: string): Promise<QAResult> {
    const pipe = await getPipeline()
    return pipe({ question, context })
}