import { Hono } from 'hono'
import { createDb } from '@ecommerce/database'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { RmaService } from '@ecommerce/core-services'
import { requireCustomer } from '@ecommerce/shared-routes'

type Bindings = {
  DB: D1Database
  STRIPE_SECRET_KEY: string
  JWT_SECRET?: string
}

type Variables = {
  customerId: string
}

const rma = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const customerAuth = requireCustomer({ message: 'Unauthorized: Sign in to request a return' })

const rmaRequestSchema = z.object({
  order_id: z.string().uuid(),
  reason: z.string().min(5),
})

rma.post('/', customerAuth, zValidator('json', rmaRequestSchema), async (c) => {
  try {
    const { order_id, reason } = c.req.valid('json')
    const customerId = c.get('customerId')
    const db = createDb(c.env.DB)

    const result = await RmaService.createReturnRequest({
      drizzleDb: db,
      rawD1Db: c.env,
      orderId: order_id,
      customerId,
      reason,
      stripeSecretKey: c.env.STRIPE_SECRET_KEY,
      waitUntil: c.executionCtx.waitUntil.bind(c.executionCtx)
    });

    return c.json({ success: true, rma_id: result.returnId, status: result.status })

  } catch (err: any) {
    const isNotFound = err.message.includes('not found') || err.message.includes('denied');
    return c.json({ success: false, error: err.message }, isNotFound ? 404 : 400)
  }
})

export default rma
