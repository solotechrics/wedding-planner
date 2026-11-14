const API = '/api/items';
const $ = (id) => document.getElementById(id);
const naira = (n) => '₦' + Number(n).toLocaleString();

let owner = localStorage.getItem('owner');
if (!owner) {
  owner = (prompt('Your name (e.g. Solorics):') || '').trim() || 'Me';
  localStorage.setItem('owner', owner);
}
let view = 'mine';
let editingId = null;

async function api(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function params() {
  const p = new URLSearchParams();
  if (view === 'mine') p.set('owner', owner);
  else if ($('fOwner').value) p.set('owner', $('fOwner').value);
  ['q', 'min', 'max'].forEach((k) => { const v = $(k).value.trim(); if (v) p.set(k, v); });
  p.set('sort', $('sort').value);
  return p;
}

async function load() {
  try {
    $('error').textContent = '';
    const [items, summary] = await Promise.all([api(`${API}?${params()}`), api(`${API}/summary`)]);
    render(items, summary);
  } catch (e) { $('error').textContent = e.message; }
}

function cell(text, cls = 'p-3') {
  const td = document.createElement('td');
  td.className = cls; td.textContent = text; return td;
}

function render(items, summary) {
  const merged = view === 'merged';
  $('ownerCol').classList.toggle('hidden', !merged);
  $('itemForm').classList.toggle('hidden', merged);
  $('whoami').textContent = `Signed in as ${owner} (change)`;
  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.view === view;
    t.className = 'tab px-4 py-2 rounded-lg text-sm ' +
      (on ? 'bg-stone-800 text-white' : 'bg-white border border-stone-300');
  });

  // owner filter (merged view only)
  const sel = $('fOwner');
  const current = sel.value;
  sel.replaceChildren(new Option('Everyone', ''));
  summary.byOwner.forEach((o) => sel.add(new Option(o.owner, o.owner)));
  sel.value = current;
  sel.classList.toggle('hidden', !merged);

  // rows
  const tbody = $('rows');
  tbody.replaceChildren();
  items.forEach((it) => {
    const tr = document.createElement('tr');
    tr.className = 'border-t border-stone-100';
    tr.append(cell(it._id.slice(-6), 'p-3 text-stone-400 font-mono'), cell(it.name));
    if (merged) tr.append(cell(it.owner));
    tr.append(cell(naira(it.price), 'p-3 text-right'));
    const actions = document.createElement('td');
    actions.className = 'p-3 text-right whitespace-nowrap';
    if (it.owner === owner) {
      const edit = document.createElement('button');
      edit.textContent = 'Edit'; edit.className = 'underline mr-3';
      edit.onclick = () => startEdit(it);
      const del = document.createElement('button');
      del.textContent = 'Delete'; del.className = 'underline text-red-600';
      del.onclick = () => remove(it);
      actions.append(edit, del);
    }
    tr.append(actions);
    tbody.append(tr);
  });
  $('empty').classList.toggle('hidden', items.length > 0);

  // totals
  const shown = items.reduce((s, i) => s + i.price, 0);
  const t = $('totals');
  t.replaceChildren();
  const line = (label, val, bold) => {
    const d = document.createElement('div');
    d.className = 'flex justify-between' + (bold ? ' font-semibold text-base' : '');
    const a = document.createElement('span'); a.textContent = label;
    const b = document.createElement('span'); b.textContent = naira(val);
    d.append(a, b); t.append(d);
  };
  line(`Shown (${items.length} items)`, shown);
  if (merged) {
    summary.byOwner.forEach((o) => line(`${o.owner} (${o.count} items)`, o.total));
    line('Grand total', summary.grandTotal, true);
  }
}

function startEdit(it) {
  editingId = it._id;
  $('name').value = it.name; $('price').value = it.price;
  $('saveBtn').textContent = 'Save changes';
  $('cancelBtn').classList.remove('hidden');
  $('name').focus();
}
function resetForm() {
  editingId = null; $('itemForm').reset();
  $('saveBtn').textContent = 'Add item';
  $('cancelBtn').classList.add('hidden');
}

async function remove(it) {
  if (!confirm(`Delete "${it.name}"?`)) return;
  try { await api(`${API}/${it._id}`, { method: 'DELETE' }); load(); }
  catch (e) { $('error').textContent = e.message; }
}

$('itemForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = { name: $('name').value.trim(), price: Number($('price').value) };
  try {
    if (editingId) await api(`${API}/${editingId}`, { method: 'PUT', body: JSON.stringify(body) });
    else await api(API, { method: 'POST', body: JSON.stringify({ ...body, owner }) });
    resetForm(); load();
  } catch (err) { $('error').textContent = err.message; }
});
$('cancelBtn').onclick = resetForm;
$('whoami').onclick = () => {
  const n = (prompt('Your name:', owner) || '').trim();
  if (n) { owner = n; localStorage.setItem('owner', n); load(); }
};
document.querySelectorAll('.tab').forEach((t) => (t.onclick = () => { view = t.dataset.view; load(); }));
['q', 'min', 'max'].forEach((id) => $(id).addEventListener('input', load));
['sort', 'fOwner'].forEach((id) => $(id).addEventListener('change', load));

load();
