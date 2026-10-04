export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/search" className="flex">
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder="Search by part name or number, e.g. BN44-00807A or HP 15 hinge"
        className="input rounded-r-none"
        aria-label="Search products"
      />
      <button className="btn-primary rounded-l-none">Search</button>
    </form>
  );
}
