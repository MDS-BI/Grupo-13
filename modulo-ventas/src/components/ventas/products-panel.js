import {
  getPrecioVigente,
  listCategorias,
  searchProductos,
} from "../../ventas/catalog.js";
import { can } from "../../ventas/roles.js";

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
  const categories = new Map(listCategorias().map((category) => [category.id, category.nombre]));
  const sensitiveVisible = can("ver_datos_sensibles");
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
    const cost = Number(product.costoEstandar);
    const margin =
      price && Number.isFinite(cost) && Number(price.precio) > 0
        ? `${(((Number(price.precio) - cost) / Number(price.precio)) * 100).toFixed(1)}%`
        : "Sin costo registrado";
    const costCell = cell(
      sensitiveVisible && Number.isFinite(cost)
        ? `${cost.toLocaleString("es-CL")} ${price?.moneda || ""}`.trim()
        : sensitiveVisible
          ? "Sin costo registrado"
          : "Reservado",
      "amount",
    );
    const marginCell = cell(sensitiveVisible ? margin : "Reservado", "amount");
    costCell.hidden = !sensitiveVisible;
    marginCell.hidden = !sensitiveVisible;
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
      costCell,
      marginCell,
      cell(badge(product.estado || "disponible")),
    );
    body.appendChild(row);
  }
}
