const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }

  if (size === 'lg' || size === 'xl') {
    return (
      <div className={`w-full max-w-6xl animate-pulse ${className}`.trim()}>
        <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm">
          <div className="h-7 w-1/3 rounded-lg bg-slate-200" />
          <div className="h-4 w-2/3 rounded bg-slate-200" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="h-44 rounded-xl bg-slate-200" />
            <div className="h-44 rounded-xl bg-slate-200" />
            <div className="h-44 rounded-xl bg-slate-200" />
          </div>
          <div className="h-4 w-5/6 rounded bg-slate-200" />
          <div className="h-4 w-2/3 rounded bg-slate-200" />
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center ${className}`.trim()}>
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-primary ${sizeClasses[size]}`}></div>
    </div>
  )
}

export default LoadingSpinner
