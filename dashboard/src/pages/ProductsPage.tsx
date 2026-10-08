import { listProducts } from '../api/products'
import { useAsync } from '../hooks/useAsync'
import { formatUgx } from '../lib/format'

export function ProductsPage() {
  const { data: products, error, loading } = useAsync(listProducts, [])

  return (
    <section>
      <h1>Products</h1>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {products && (
        <table>
          <thead>
            <tr><th>Name</th><th>Category</th><th>Base price</th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>{formatUgx(p.basePriceUgx)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
