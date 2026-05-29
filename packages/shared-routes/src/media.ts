import { Hono } from 'hono';

const media = new Hono<{ Bindings: { PRODUCTS_R2: R2Bucket, CMS_R2: R2Bucket } }>();

media.get('/*', async (c) => {
  const path = c.req.path; // e.g. /media/products/123.jpg or /media/cms/456.jpg
  // Extract key by removing '/media/' prefix
  const rawKey = path.replace(/^\/media\//, '');
  
  let object;
  if (rawKey.startsWith('products/')) {
    const bucketKey = rawKey.replace(/^products\//, '');
    object = await c.env.PRODUCTS_R2.get(bucketKey);
  } else if (rawKey.startsWith('cms/')) {
    const bucketKey = rawKey.replace(/^cms\//, '');
    object = await c.env.CMS_R2.get(bucketKey);
  } else {
    return c.json({ success: false, error: 'Invalid media path' }, 400);
  }
  
  if (object === null) {
    return c.json({ success: false, error: 'File not found' }, 404);
  }
  
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  
  return new Response(object.body, { headers });
});

export default media;
