// src/lib/ai/rag.ts
import { runQA } from './qa'
import {getDoc, addEvent, searchEmbeddings} from '../storage/store'
import { v4 as uuidv4 } from 'uuid'

export interface RAGAnswer {
    question: string
    answer: string
    citations: string[]
}

export async function ask(question: string, topK = 3): Promise<RAGAnswer> {
    // 1. Retrieve top-K doc ids
    const results = await searchEmbeddings(question, topK)

    // 2. Fetch their text
    const docs = await Promise.all(results.map(r => getDoc(r.id)))
    const context = docs.filter(Boolean).join('\n\n')

    // 3. Run QA
    const qa = await runQA(question, context)

    // 4. Log event
    await addEvent({
        id: uuidv4(),
        kind: 'qa',
        ts: Date.now(),
        question,
        citations: results.map(r => r.id),
    })

    return {
        question,
        answer: qa.answer,
        citations: results.map(r => r.id),
    }
}