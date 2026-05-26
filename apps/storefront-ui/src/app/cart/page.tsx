export default function Cart() {
  return (
    <div className="glass glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1>Shopping Cart</h1>
      <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h3>Aura Noise Cancelling Headphones</h3>
            <p>Quantity: 1</p>
          </div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>$299.00</div>
        </div>
      </div>
      
      <div style={{ padding: '20px 0', marginTop: '20px' }}>
        <h3>Estimate Shipping</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="text" placeholder="Enter Zipcode" style={{ padding: '10px', borderRadius: '4px', border: 'none', width: '200px' }} />
          <button className="btn" style={{ background: '#3fb950' }}>Calculate</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
        <a href="/checkout" className="btn">Proceed to Checkout</a>
      </div>
    </div>
  )
}
