"use client";

export function DeleteProductButton({ title }: { title: string }) {
  return (
    <button
      type="submit"
      className="btn-danger px-3 py-1"
      onClick={(e) => {
        if (!confirm(`Delete "${title}" from your store?`)) e.preventDefault();
      }}
    >
      Delete
    </button>
  );
}
