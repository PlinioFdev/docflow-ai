import { useCallback, useState } from 'react'
export default function useToast() {
  const [toasts, setToasts] = useState([])
  const addToast = useCallback((type, message) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, type, message }])
  }, [])
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])
  return { toasts, addToast, removeToast }
}
