import { Helpers as H } from '../lib/helpers'

export default function ProgressBar({ value, width = 160 }: { value: number; width?: number }) {
    return (
        <div style={{ height: 6, background: '#eee', borderRadius: 4, width }}>
            <div
                style={{
                    height: 6,
                    borderRadius: 4,
                    width: `${H.clamp(value, 0, 100)}%`,
                    background: '#888',
                    transition: 'width 200ms ease',
                }}
            />
        </div>
    )
}