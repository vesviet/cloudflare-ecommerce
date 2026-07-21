const { execSync } = require('child_process');

// Config
const ADMIN_API = 'http://127.0.0.1:8788/api';
const PUBLIC_API = 'http://127.0.0.1:8787';

async function run() {
  console.log("🚀 Starting Landing Pages Integration QA Validation...");
  
  // 1. Create a Landing Page via Admin API
  console.log("1. Creating Landing Page...");
  const randomSlug = `test-campaign-qa-${Date.now()}`;
  const createRes = await fetch(`${ADMIN_API}/landing-pages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Local-Admin-Email': 'admin@local.dev' // Authentication mock for dev
    },
    body: JSON.stringify({
      title: "Test Campaign QA",
      slug: randomSlug,
      seo_title: "QA SEO",
      seo_description: "Desc",
      facebook_pixel_id: "FB123",
      tiktok_pixel_id: "TT123",
      urgency_fake_views: 45,
      combo_rules_json: JSON.stringify([{ id: "combo-1", name: "QA Combo", price: 150000 }])
    })
  });
  
  const createData = await createRes.json();
  if (!createData.success) {
    throw new Error("Failed to create landing page: " + JSON.stringify(createData));
  }
  const landingPageId = createData.data.id;
  console.log(`✅ Created Landing Page (ID: ${landingPageId})`);

  // 2. Fetch the Landing Page via Public API
  console.log("2. Fetching Landing Page via Public API...");
  const getRes = await fetch(`${PUBLIC_API}/api/landing-pages/${randomSlug}`);
  const getData = await getRes.json();
  
  if (!getData.success || getData.data.id !== landingPageId) {
    throw new Error("Failed to fetch landing page from Public API: " + JSON.stringify(getData));
  }
  console.log("✅ Fetched Landing Page successfully.");

  // 3. Submit a Lead Checkout
  console.log("3. Submitting Lead...");
  const leadRes = await fetch(`${PUBLIC_API}/api/landing-pages/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      landing_page_id: landingPageId,
      customer_name: "QA User",
      customer_phone: "0909090909",
      customer_address: "123 QA St",
      customer_note: "Deliver fast",
      selected_combo_id: "combo-1",
      selected_colors_json: ["Red", "Blue"],
      selected_sizes_json: ["L", "XL"],
      total_amount: 150000,
      utm_source: "facebook",
      turnstile_token: "" // Note: Local dev doesn't enforce this if TURNSTILE_SECRET_KEY is empty
    })
  });
  
  const leadData = await leadRes.json();
  if (!leadData.success) {
    throw new Error("Failed to submit lead: " + JSON.stringify(leadData));
  }
  const leadId = leadData.data.id;
  console.log(`✅ Lead submitted successfully (ID: ${leadId})`);

  // 4. Verify DB Side Effects using wrangler d1
  console.log("4. Verifying Database Side Effects...");
  const dbOutput = execSync(`cd apps/public-api && npx wrangler d1 execute ecommerce-db --local --command "SELECT * FROM landing_page_leads WHERE id = '${leadId}';" --json`).toString();
  const dbRows = JSON.parse(dbOutput)[0].results;
  
  if (dbRows.length === 0) {
    throw new Error("Lead not found in D1 database");
  }
  
  const dbLead = dbRows[0];
  if (dbLead.customer_name !== "QA User" || dbLead.total_amount !== 150000 || dbLead.utm_source !== "facebook") {
    throw new Error("Lead data in DB is corrupted or mismatched: " + JSON.stringify(dbLead));
  }
  console.log("✅ Database verification passed. Lead is safely stored.");

  console.log("🎉 All QA Integration validations passed successfully!");
}

run().catch(err => {
  console.error("❌ Test Failed:", err.message);
  process.exit(1);
});
