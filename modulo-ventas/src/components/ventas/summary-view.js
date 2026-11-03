import { buildSummary } from '../../ventas/summary.js';
import { can } from '../../ventas/roles.js';

function qs(id){ return document.getElementById(id); }

function fill(id, value){
  const el = qs(id);
  if(el) el.textContent = String(value);
}

export function renderSummaryView(){
  const restricted = qs('summary-restricted');
  const content = qs('summary-content');
  if(restricted) restricted.hidden = can('ver_resumen');
  if(content) content.hidden = !can('ver_resumen');
  if(!can('ver_resumen')) return;

  const summary = buildSummary({ role: 'gerente' });
  fill('summary-total-ventas', summary.totalVentas);
  fill('summary-total-cotizaciones', summary.totalCotizaciones);
  fill('summary-total-pedidos', summary.totalPedidos);
  fill('summary-monto-ventas', summary.montoVentas.toLocaleString('es-CL'));
  fill('summary-monto-cotizaciones', summary.montoCotizaciones.toLocaleString('es-CL'));
  fill('summary-monto-pedidos', summary.montoPedidos.toLocaleString('es-CL'));
  fill('summary-monto-total', summary.montoTotal.toLocaleString('es-CL'));

  const empty = qs('summary-empty');
  if(empty) empty.hidden = !summary.vacio;

  const statesBody = qs('summary-states-body');
  if(statesBody){
    statesBody.innerHTML = '';
    for(const [estado, cantidad] of Object.entries(summary.estados)){
      const row = document.createElement('tr');
      const name = document.createElement('td');
      name.textContent = estado;
      const total = document.createElement('td');
      total.textContent = String(cantidad);
      row.append(name, total);
      statesBody.appendChild(row);
    }
  }

  const ordersBody = qs('summary-orders-body');
  if(ordersBody){
    ordersBody.innerHTML = '';
    if(summary.pedidos.length === 0){
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.className = 'empty';
      cell.textContent = 'No hay pedidos registrados todavía.';
      row.appendChild(cell);
      ordersBody.appendChild(row);
    }
    for(const order of summary.pedidos){
      const row = document.createElement('tr');
      for(const value of [order.numero, order.cliente, order.fecha, order.estado, `${order.total.toLocaleString('es-CL')} ${order.moneda}`]){
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      }
      ordersBody.appendChild(row);
    }
  }
}
