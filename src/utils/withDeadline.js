export async function withDeadline(load, milliseconds, signal) {
  const controller = new AbortController()
  const abortFromParent = () => controller.abort(signal.reason)
  if (signal?.aborted) abortFromParent()
  else signal?.addEventListener('abort', abortFromParent, { once: true })

  const timer = setTimeout(() => controller.abort(new DOMException('Tempo de resposta excedido.', 'TimeoutError')), milliseconds)
  const aborted = new Promise((_, reject) => {
    if (controller.signal.aborted) reject(controller.signal.reason)
    else controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true })
  })

  try {
    return await Promise.race([Promise.resolve().then(() => load(controller.signal)), aborted])
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abortFromParent)
  }
}
