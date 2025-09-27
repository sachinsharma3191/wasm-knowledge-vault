import React from 'react'

export function highlight(text: string, query: string) {
    if (!query.trim()) return text
    const terms = Array.from(new Set(
        query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
    ))
    if (!terms.length) return text

    const rx = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'ig')
    const parts = text.split(rx)
    return parts.map((part, i) =>
        terms.some(t => t.toLowerCase() === part.toLowerCase())
            ? <mark key={i}>{part}</mark>
            : <span key={i}>{part}</span>
    )
}

function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}