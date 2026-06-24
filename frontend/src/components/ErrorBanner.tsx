interface Props {
  message: string;
  onClose?: () => void;
}

export function ErrorBanner({ message, onClose }: Props) {
  return (
    <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-3 mb-4 flex justify-between items-center" role="alert">
      <span>⚠️ {message}</span>
      {onClose && (
        <button className="bg-transparent border-0 text-red-600 cursor-pointer text-base" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
      )}
    </div>
  );
}
