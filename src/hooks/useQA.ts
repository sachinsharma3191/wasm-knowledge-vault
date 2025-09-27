import { useCallback, useState } from 'react'
import { addEvent } from '../lib/storage/store'
import { ask } from '../lib/qa/ask'
import { Helpers as H } from '../lib/helpers'



export default function useQA({ setBusy }: { setBusy: (b: boolean) => void }) {
    const [qaQ, setQaQ] = useState('')
    const [qaA, setQaA] = useState<{ answer: string; citations: string[] } | null>(null)

    const handleAsk = useCallback(async () => {
        setBusy(true)
        try {
            const res = await ask(qaQ)
            setQaA(res)
            await addEvent({ id: H.nowId('ev'), kind: 'qa', ts: Date.now(), question: qaQ, citations: res.citations } as any)
        } finally { setBusy(false) }
    }, [qaQ, setBusy])

    return { qaQ, setQaQ, qaA, handleAsk }
}