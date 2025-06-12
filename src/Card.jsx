export function Card({ children }) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-4">
      {children}
    </div>
  );
}
export function CardContent({ children, className = "" }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {children}
    </div>
  );
}