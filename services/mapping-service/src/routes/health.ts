import { Router } from 'express'

const router = Router()

/** Liveness for Docker / ops — no auth, no downstream calls. */
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'mapping-service' })
})

export { router as healthRouter }
