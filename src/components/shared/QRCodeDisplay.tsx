import { QRCodeSVG } from 'qrcode.react'

interface QRCodeDisplayProps {
  value: string
  size?: number
}

export function QRCodeDisplay({ value, size = 128 }: QRCodeDisplayProps) {
  return (
    <div className="inline-flex flex-col items-center gap-2 p-4 bg-white rounded-lg border">
      <QRCodeSVG value={value} size={size} />
      <span className="text-xs text-gray-500 font-mono">{value}</span>
    </div>
  )
}
