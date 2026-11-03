import { loadEntities } from '../../storage.js';
import { getClientHistory } from '../../ventas/history.js';

let wired = false;

function qs(id){ return document.getElementById(id); }

function populateClients(){
  const select = qs('history-client');
  if(!select) return;
  const previous = select.value;
  select.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = '-- Selecciona un cliente --';
  select.appendChild(empty);
  for(const entity of loadEntities()){
    const opt = document.createElement('option');
    opt.value = entity.entity_id;
    opt.textContent = `${entity.name} · ${entity.code}`;
    select.appendChild(opt);
  }
  if(previous && [...select.options].some(item => item.value === previous)) select.value = previous;
}

function renderHistory(){
  const select = qs('history-client');
  const reference = select ? select.value : '';
  const empty = qs('history-empty');
  const body = qs('history-body');
  const total = qs('history-total');
  if(!reference){
    if(empty){ empty.hidden = false; empty.textContent = 'Selecciona un cliente para consultar su historial comercial.'; }
    if(body) body.innerHTML = '';
    if(total) total.textContent = '';
    return;
  }
  const history = getClientHistory(reference);
  if(empty){
    empty.hidden = !history.vacio;
    empty.textContent = history.vacio ? 'Este cliente no tiene cotizaciones ni pedidos registrados.' : '';
  }
  if(total) total.textContent = `Total histórico: ${history.importeTotal.toLocaleString('es-CL')} · ${history.cantidad} transacción(es)`;
  if(!body) return;
  body.innerHTML = '';
  for(const item of history.items){
    const row = document.createElement('tr');
    for(const value of [item.numero, item.tipo, item.fecha, item.estado, `${item.importe.toLocaleString('es-CL')} ${item.moneda}`]){
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    }
    body.appendChild(row);
  }
}

export function initClientHistory(){
  if(wired) return;
  wired = true;
  const select = qs('history-client');
  if(select) select.addEventListener('change', renderHistory);
}

export function renderClientHistory(){
  populateClients();
  renderHistory();
}
