import { parseSpecs } from "@/lib/product-specs";

export function ProductSpecsTable({ specs }: { specs: string | null | undefined }) {
  const rows = parseSpecs(specs);
  if (!rows.length) return null;

  return (
    <div className="overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : "bg-background"}>
              <td className="px-4 py-2.5 font-semibold text-muted-foreground w-2/5 border-r">{row.key}</td>
              <td className="px-4 py-2.5 font-medium">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
