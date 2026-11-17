import {
  getPrecioVigente,
  listCategorias,
  listProductos,
  searchProductos,
} from "../../ventas/catalog.js";

let wired = false;

function qs(id) {
  return document.getElementById(id);
}

function cell(content, className) {
  const td = document.createElement("td");
  if (content && content.nodeType === 1) td.appendChild(content);
  else td.textContent = String(content ?? "");
  if (className) td.className = className;
  return td;
}

function badge(status) {
  const span = document.createElement("span");
  span.className = `status-badge badge-${status}`;
  span.textContent = status;
  return span;
}

export function initProductsPanel() {
  if (wired) return;
  wired = true;
  qs("product-search")?.addEventListener("input", renderProductsPanel);
  qs("product-stock-filter")?.addEventListener("change", renderProductsPanel);
}

export function renderProductsPanel() {
  const body = qs("products-body");
  if (!body) return;
  const term = qs("product-search")?.value || "";
  const filter = qs("product-stock-filter")?.value || "all";
  let products = searchProductos(term);
  if (filter === "available") products = products.filter((p) => Number(p.stockActual) > 0);
  if (filter === "low") {
    products = products.filter((p) => Number(p.stockActual) <= Number(p.stockMinimo ?? 0));
  }

  const empty = qs("products-empty");
  if (empty) empty.hidden = products.length > 0;
  const count = qs("products-count");
  if (count) count.textContent = `${products.length} de ${listProductos().length} productos`;

  const categories = new Map(listCategorias().map((category) => [category.id, category.nombre]));
  body.innerHTML = "";
  for (const product of products) {
    const price = getPrecioVigente(product.id);
    const stock = Number(product.stockActual) || 0;
    const minimum = Number(product.stockMinimo) || 0;
    const name = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = product.nombre;
    const description = document.createElement("div");
    description.className = "muted product-description";
    description.textContent = product.descripcion || "Sin descripción registrada";
    name.append(strong, description);

    const row = document.createElement("tr");
    row.append(
      cell(product.sku),
      cell(name),
      cell(categories.get(product.categoriaId) || "Sin categoría"),
      cell(product.unidadMedida),
      cell(`${Number(product.impuestoPorcentaje) || 0}%`),
      cell(`${stock} ${product.unidadMedida}`, stock <= minimum ? "stock-low" : ""),
      cell(
        price
          ? `${Number(price.precio).toLocaleString("es-CL")} ${price.moneda}`
          : "Sin precio vigente",
        "amount",
      ),
      cell(badge(product.estado || "disponible")),
    );
    body.appendChild(row);
  }
}
