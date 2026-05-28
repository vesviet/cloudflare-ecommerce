import { Hono } from 'hono';

const media = new Hono<{ Bindings: { MEDIA_R2: R2Bucket } }>();

media.get('/*', async (c) => {
  const path = c.req.path; // e.g. /media/products/123.jpg
  // Extract key by removing '/media/' prefix
  const key = path.replace(/^\/media\//, '');
  
  const object = await c.env.MEDIA_R2.get(key);
  
  if (object === null) {
    return c.json({ success: false, error: 'File not found' }, 404);
  }
  
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  
  return new Response(object.body, { headers });
});

export default media;
