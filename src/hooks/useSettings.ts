import { useEffect, useState } from 'react'
import { getPref, setPref } from '../lib/storage/store'

export default function useSettings() {
    const [tagBoost, setTagBoostState] = useState(0.2)
    const [collectionBoost, setCollectionBoostState] = useState(0.3)
    const [preferredCollection, setPreferredCollectionState] = useState('')

    // NEW:
    const [tagWeights, setTagWeightsState] = useState<string>('') // lines like: important:0.6\nobsolete:-0.3
    const [excludeTags, setExcludeTagsState] = useState<string>('') // comma sep: draft,private

    useEffect(() => {
        (async () => {
            setTagBoostState(await getPref('tagBoost', 0.2))
            setCollectionBoostState(await getPref('collectionBoost', 0.3))
            setPreferredCollectionState(await getPref('preferredCollection', ''))
            setTagWeightsState(await getPref('tagWeights', ''))
            setExcludeTagsState(await getPref('excludeTags', ''))
        })()
    }, [])

    const setTagBoost = async (v: number) => { setTagBoostState(v); await setPref('tagBoost', v) }
    const setCollectionBoost = async (v: number) => { setCollectionBoostState(v); await setPref('collectionBoost', v) }
    const setPreferredCollection = async (v: string) => { setPreferredCollectionState(v); await setPref('preferredCollection', v) }

    const setTagWeights = async (s: string) => { setTagWeightsState(s); await setPref('tagWeights', s) }
    const setExcludeTags = async (s: string) => { setExcludeTagsState(s); await setPref('excludeTags', s) }

    return { tagBoost, setTagBoost, collectionBoost, setCollectionBoost, preferredCollection, setPreferredCollection, tagWeights, setTagWeights, excludeTags, setExcludeTags }
}