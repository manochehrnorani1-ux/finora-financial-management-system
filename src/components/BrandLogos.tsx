/** FINORA brand logo (public asset) and org-scoped customer logo (from attachments). */
export function FinoraLogo({ height = 48, className = "" }: { height?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/finora-logo.png"
      alt="FINORA"
      height={height}
      className={`w-auto object-contain ${className}`}
      style={{ height }}
    />
  );
}

export function CustomerLogo({ attachmentId, name, height = 48 }: { attachmentId: string | null; name: string; height?: number }) {
  if (!attachmentId) {
    return (
      <div className="grid place-items-center rounded-lg border border-slate-200 bg-slate-50 px-3 font-bold text-slate-500" style={{ height }}>
        {name.slice(0, 1)}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/files/${attachmentId}`}
      alt={name}
      height={height}
      className="w-auto max-w-[180px] object-contain"
      style={{ height }}
    />
  );
}
