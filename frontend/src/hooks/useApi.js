import { useEffect, useState } from 'react'

export function useApi(url, { pollMs } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchOnce = async () => {
    try {
      const mode = localStorage.getItem('log-sense-mode') || 'sim';
      let targetUrl = url;
      if (!targetUrl.includes('mode=')) {
        targetUrl = targetUrl.includes('?') ? `${targetUrl}&mode=${mode}` : `${targetUrl}?mode=${mode}`;
      }
      const res = await fetch(targetUrl)
      if (!res.ok) throw new Error(`Request failed with ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
      setLoading(false)
    } catch (err) {
      setError(err)
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    let timerId

    ;(async () => {
      if (!isMounted) return
      await fetchOnce()
    })()

    if (pollMs) {
      timerId = setInterval(fetchOnce, pollMs)
    }

    return () => {
      isMounted = false
      if (timerId) clearInterval(timerId)
    }
  }, [url, pollMs])

  return { data, loading, error, refetch: fetchOnce }
}

