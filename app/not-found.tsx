import Link from "next/link"

export default function NotFound() {
  return (
    <div className="font-sans min-h-screen p-6 sm:p-10 flex items-center justify-center">
      <div className="max-w-xl w-full text-center space-y-4">
        <h1 className="text-2xl sm:text-3xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page you’re looking for doesn’t exist or may have moved.
        </p>
        <div className="flex items-center justify-center">
          <Link
            href="/"
            className="px-4 py-2 rounded bg-[#13c56b] hover:bg-[#10b261] active:bg-[#0da05a] text-white"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  )
}


