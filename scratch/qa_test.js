const ADMIN_URL = 'http://localhost:8788';
const PUBLIC_URL = 'http://localhost:8787';

async function runTests() {
  console.log('--- STARTING QA TESTS ---');
  
  try {
    // Wait for services to be up
    await new Promise(r => setTimeout(r, 2000));
    
    // Test 1: Cycle Prevention
    console.log('\\n[1] Testing Cycle Prevention in Hierarchy');
    const ts = Date.now();
    const resA = await fetch(`${ADMIN_URL}/categories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Category A', slug: `cat-a-${ts}` })
    });
    const resultA = await resA.json();
    if (!resultA.success) throw new Error('Failed to create A: ' + JSON.stringify(resultA));
    const catA = resultA.data;
    
    const resB = await fetch(`${ADMIN_URL}/categories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Category B', slug: `cat-b-${ts}`, parent_id: catA.id })
    });
    const resultB = await resB.json();
    if (!resultB.success) throw new Error('Failed to create B: ' + JSON.stringify(resultB));
    const catB = resultB.data;
    
    const resCycle = await fetch(`${ADMIN_URL}/categories/${catA.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Category A', parent_id: catB.id })
    });
    const cycleResult = await resCycle.json();
    if (cycleResult.success === false && cycleResult.error.includes('cycle')) {
      console.log('✅ Cycle prevention works:', cycleResult.error);
    } else {
      console.error('❌ Cycle prevention failed:', cycleResult);
    }
    
    // Test 2: Category Tree KV Cache Write-Through
    console.log('\\n[2] Testing KV Cache Write-Through');
    const resCache1 = await fetch(`${PUBLIC_URL}/api/categories`);
    const cacheHeader1 = resCache1.headers.get('x-cache');
    console.log(`Initial fetch X-Cache: ${cacheHeader1}`);
    
    console.log('Creating Category C (should invalidate cache)...');
    const resC = await fetch(`${ADMIN_URL}/categories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Category C', slug: `cat-c-${ts}` })
    });
    const catC = (await resC.json()).data;
    
    const resCache2 = await fetch(`${PUBLIC_URL}/api/categories`);
    const cacheHeader2 = resCache2.headers.get('x-cache');
    console.log(`Second fetch X-Cache: ${cacheHeader2}`); // Should be MISS because cache was cleared
    const tree = await resCache2.json();
    const foundC = tree.data.some((c) => c.slug === `cat-c-${ts}`);
    if (cacheHeader2 === 'MISS' && foundC) {
      console.log('✅ KV Cache invalidation works. Category C found in tree.');
    } else {
      console.error('❌ KV Cache invalidation failed:', { cacheHeader2, foundC });
    }
    
    // Test 3: Safe Category Deletion
    console.log('\\n[3] Testing Safe Category Deletion');
    console.log('Deleting Category A (parent of B)...');
    await fetch(`${ADMIN_URL}/categories/${catA.id}`, { method: 'DELETE' });
    
    const resCheckB = await fetch(`${ADMIN_URL}/categories`);
    const allCats = (await resCheckB.json()).data;
    const catBUpdated = allCats.find(c => c.id === catB.id);
    if (catBUpdated && catBUpdated.parent_id === null) {
      console.log('✅ Safe deletion works: Category B parent_id set to null.');
    } else {
      console.error('❌ Safe deletion failed. Category B:', catBUpdated);
    }
    
    // Test 4: Recursive Product Filtering
    console.log('\\n[4] Testing Recursive Product Filtering');
    const resC2 = await fetch(`${ADMIN_URL}/categories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Category C2', slug: `cat-c2-${ts}`, parent_id: catC.id })
    });
    const catC2 = (await resC2.json()).data;
    
    console.log('Creating product in Category C2...');
    const formData = new URLSearchParams();
    formData.append('name', `Test Product in C2 ${ts}`);
    formData.append('type', 'simple');
    formData.append('regular_price', '1000');
    formData.append('stock', '10');
    formData.append('primary_category_id', catC2.id);
    
    await fetch(`${ADMIN_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    
    // Query parent category C
    const resProdFilter = await fetch(`${PUBLIC_URL}/api/products?category=cat-c-${ts}`);
    const filteredProducts = await resProdFilter.json();
    if (filteredProducts.data && filteredProducts.data.some(p => p.title === `Test Product in C2 ${ts}`)) {
      console.log('✅ Recursive filtering works: Product found when querying parent category.');
    } else {
      console.error('❌ Recursive filtering failed. Products returned:', filteredProducts.data);
    }
    
    console.log('\\n--- TESTS COMPLETE ---');
    process.exit(0);
  } catch (err) {
    console.error('Test script error:', err);
    process.exit(1);
  }
}

runTests();
