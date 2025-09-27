import React from 'react'

type Props = {
    value: string
    onChange: (v: string) => void
    placeholder?: string
}

export default function CollectionPicker({ value, onChange, placeholder = 'Collection (optional)' }: Props) {
    return (
        <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ padding: 8, minWidth: 220 }}
        />
    )
}