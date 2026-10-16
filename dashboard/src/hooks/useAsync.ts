import { useCallback, useEffect, useState } from 'react'

// Runs an async loader whenever `deps` change and tracks loading/error state.
// Keeps the previous data while reloading, so screens don't flash empty after a change.
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps)

  const reload = useCallback(() => {
    let current = true
    setLoading(true)
    setError(null)
    run()
      .then((value) => current && setData(value))
      .catch((e: Error) => current && setError(e.message))
      .finally(() => current && setLoading(false))
    return () => {
      current = false
    }
  }, [run])

  useEffect(reload, [reload])

  return { data, error, loading, reload, setData }
}
