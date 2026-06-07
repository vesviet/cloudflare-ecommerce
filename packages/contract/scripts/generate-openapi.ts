import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from '@hono/zod-openapi';
import * as fs from 'fs';
import * as path from 'path';

import { ProductSchema, CheckoutSchema, ErrorResponseSchema } from '../src/index';

const registry = new OpenAPIRegistry();

// Register components
registry.register('Product', ProductSchema);
registry.register('Checkout', CheckoutSchema);
registry.register('ErrorResponse', ErrorResponseSchema);

// We can also define some dummy paths here so the SDK generator has endpoints to generate.
registry.registerPath({
  method: 'get',
  path: '/api/products',
  description: 'Get all products',
  summary: 'List products',
  responses: {
    200: {
      description: 'A list of products',
      content: {
        'application/json': {
          schema: z.array(ProductSchema),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/checkout/guest',
  description: 'Guest checkout',
  summary: 'Submit a guest order',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CheckoutSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Checkout successful',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            orderId: z.string(),
            clientSecret: z.string().optional()
          }),
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const generator = new OpenApiGeneratorV3(registry.definitions);

const document = generator.generateDocument({
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Aura Store API',
    description: 'Public API for Aura E-Commerce Store',
  },
  servers: [{ url: 'https://api.aura.store' }],
});

const outputPath = path.resolve(__dirname, '../openapi.json');
fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');

console.log(`✅ OpenAPI Specification generated at ${outputPath}`);
