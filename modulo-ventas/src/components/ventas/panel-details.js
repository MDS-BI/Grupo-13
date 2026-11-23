import { loadEntities } from "../../storage.js";
import { listProductos } from "../../ventas/catalog.js";
import { buildTopProducts } from "../../ventas/analytics.js";
import { buildCustomerMetrics } from "../../ventas/panel-metrics.js";

const byId = (id) => document.getElementById(id);
const clientSelect = "panel-client-select";
const orderSelect = "panel-order-select";
const productSelect = "panel-product-select";
const format = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 });

function money(amount, currency = "CLP") {
  return `${format.format(amount)} ${currency}`;
}

function options(id, rows, placeholder) {
  const select = byId(id);
  if (!select) return;
  const selected = select.value;
  select.replaceChildren(new window.Option(placeholder, ""));
  for (const { id: value, name } of rows) select.add(new window.Option(name, value));
  if (rows.some(({ id: value }) => value === selected)) select.value = selected;
  select.disabled = rows.length === 0;
}

let detailData;

function renderClient() {
  const id = byId(clientSelect)?.value;
  if (!id || !detailData) {
    byId("panel-client-detail").textContent = "Selecciona un cliente para ver sus compras.";
    return;
  }
  const client = detailData.customers.get(id);
  const name = detailData.clients.get(id);
  const total = client
    ? [...client.totals].map(([currency, amount]) => money(amount, currency)).join(" · ")
    : "";
  byId("panel-client-detail").textContent = client
    ? `${name}: ${client.count} ${client.count === 1 ? "compra" : "compras"} · ${total} · Última compra: ${client.lastDate}`
    : `${name} no tiene ventas registradas en este período.`;
}

function renderOrder() {
  const order = detailData?.orders.get(byId(orderSelect)?.value);
  const lines = byId("panel-order-lines");
  lines.replaceChildren();
  byId("panel-order-detail").textContent = order
    ? [
        order.numero,
        detailData.clients.get(order.clienteId) ?? "Cliente desconocido",
        order.estado,
        order.fechaEmision,
        money(order.total, order.moneda),
      ].join(" · ")
    : "Selecciona un pedido para ver su detalle.";
  for (const line of order?.lineas ?? []) {
    const item = document.createElement("li");
    const productId = line.productoId ?? line.producto_id;
    const name = detailData.products.get(productId) ?? line.sku ?? "Producto desconocido";
    item.textContent = `${name} · ${format.format(line.cantidad)} unidades`;
    lines.append(item);
  }
}

function renderProduct() {
  const id = byId(productSelect)?.value;
  const name = detailData?.products.get(id);
  const position = detailData?.ranking.findIndex((item) => item.id === id) ?? -1;
  const product = detailData?.ranking[position];
  const totals = detailData?.productTotals.get(id) ?? [];
  byId("panel-product-detail").textContent = product
    ? `${name} · ${format.format(product.cantidad)} unidades · ${[...totals].map(([code, total]) => money(total, code)).join(" · ")} · Puesto ${position + 1} por unidades`
    : name
      ? `${name} no registra ventas en este período.`
      : "Selecciona un producto para consultar sus ventas.";
}

function productAmounts(sales) {
  const productTotals = new Map();
  for (const { lineas = [], moneda = "CLP" } of sales) {
    for (const line of lineas) {
      const id = line.productoId ?? line.producto_id ?? line.sku;
      if (!id) continue;
      if (!productTotals.has(id)) productTotals.set(id, new Map());
      const totals = productTotals.get(id);
      const amount =
        Number(line.subtotalLinea ?? line.subtotal_linea) ||
        Number(line.cantidad) * Number(line.precioUnitario || 0);
      totals.set(moneda, (totals.get(moneda) ?? 0) + amount);
    }
  }
  return productTotals;
}

export function renderPanelDetails(orders, sales) {
  const { customers, buyers, repeatBuyers, repeatRate } = buildCustomerMetrics(sales);
  const clients = new Map(loadEntities().map((entity) => [entity.entity_id, entity.name]));
  const products = new Map(listProductos().map(({ id, nombre }) => [id, nombre]));
  const ranking = buildTopProducts({ orders: sales, limit: Number.MAX_SAFE_INTEGER });
  for (const item of ranking) if (!products.has(item.id)) products.set(item.id, item.nombre);
  const ordered = [...orders].sort((a, b) =>
    (b.fechaEmision ?? "").localeCompare(a.fechaEmision ?? ""),
  );
  detailData = {
    customers,
    clients,
    products,
    ranking,
    productTotals: productAmounts(sales),
    orders: new Map(ordered.map((order) => [order.id, order])),
  };

  byId("panel-buyers").textContent = format.format(buyers);
  byId("panel-repeat-rate").textContent = `${format.format(repeatRate)}%`;
  byId("panel-repeat-count").textContent = `${repeatBuyers} de ${buyers} clientes compradores`;
  options(
    clientSelect,
    [...clients].map(([id, name]) => ({ id, name })),
    "Elegir cliente",
  );
  options(
    orderSelect,
    ordered.map(({ id, numero, clienteId }) => ({
      id,
      name: `${numero} · ${clients.get(clienteId) ?? "Cliente desconocido"}`,
    })),
    "Elegir pedido",
  );
  options(
    productSelect,
    [...products].map(([id, name]) => ({ id, name })),
    "Elegir producto",
  );
  renderClient();
  renderOrder();
  renderProduct();
}

export function initPanelDetails() {
  byId(clientSelect)?.addEventListener("change", renderClient);
  byId(orderSelect)?.addEventListener("change", renderOrder);
  byId(productSelect)?.addEventListener("change", renderProduct);
}

export function clearPanelDetails() {
  detailData = undefined;
  options(clientSelect, [], "Elegir cliente");
  options(orderSelect, [], "Elegir pedido");
  options(productSelect, [], "Elegir producto");
  renderClient();
  renderOrder();
  renderProduct();
}
