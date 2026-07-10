async function run() {
  try {
    console.log("Sending query fetch to http://127.0.0.1:8787/api/test/query...");
    const res = await fetch('http://127.0.0.1:8787/api/test/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: "SELECT 1;" })
    });
    console.log("Status:", res.status);
    const body = await res.text();
    console.log("Body:", body);
  } catch (err) {
    console.error("Fetch Error:", err.message);
  }
}

run();
