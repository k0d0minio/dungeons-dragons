export function Card({ className = '', ...props }) {
  const cls = ['rounded-xl border border-slate-200 bg-white text-slate-900 shadow', className].filter(Boolean).join(' ')
  return <div className={cls} {...props} />
}

export function CardHeader({ className = '', ...props }) {
  const cls = ['flex flex-col space-y-1.5 p-4', className].filter(Boolean).join(' ')
  return <div className={cls} {...props} />
}

export function CardTitle({ className = '', ...props }) {
  const cls = ['text-lg font-semibold leading-none tracking-tight', className].filter(Boolean).join(' ')
  return <h3 className={cls} {...props} />
}

export function CardContent({ className = '', ...props }) {
  const cls = ['p-4 pt-0', className].filter(Boolean).join(' ')
  return <div className={cls} {...props} />
}

