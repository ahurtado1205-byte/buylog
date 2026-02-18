/**
 * BuyLog - CarWale Aesthetic Edition
 */

const State = {
    suppliers: JSON.parse(localStorage.getItem('bl_suppliers')) || [],
    orders: JSON.parse(localStorage.getItem('bl_orders')) || [],
    settings: JSON.parse(localStorage.getItem('bl_settings')) || { userName: '', company: '' },
    users: JSON.parse(localStorage.getItem('bl_users')) || [{ id: '1', name: 'Admin', role: 'admin' }],
    currentUser: localStorage.getItem('bl_current_user') || '1',

    save() {
        localStorage.setItem('bl_suppliers', JSON.stringify(this.suppliers));
        localStorage.setItem('bl_orders', JSON.stringify(this.orders));
        localStorage.setItem('bl_settings', JSON.stringify(this.settings));
        localStorage.setItem('bl_users', JSON.stringify(this.users));
        localStorage.setItem('bl_current_user', this.currentUser);
    }
};

const router = {
    go(viewId, params = {}) {
        const app = document.getElementById('app');
        const template = document.getElementById(`view-${viewId}`);
        if (!template) return;
        app.innerHTML = '';
        app.appendChild(template.content.cloneNode(true));
        lucide.createIcons();
        window.scrollTo(0, 0);

        switch (viewId) {
            case 'home': initHome(); break;
            case 'suppliers-list': initSuppliers(); break;
            case 'supplier-detail': initSupplierDetail(params.id); break;
            case 'create-order': initCreateOrder(params.id); break;
            case 'review': initReview(params.data); break;
            case 'reports': initReports(); break;
            case 'history': initHistory(); break;
            case 'settings': initSettings(); break;
        }
    }
};

// --- LOGIC ---

function initHome() {
    const list = document.getElementById('home-recent');
    const recent = [...State.orders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    if (!recent.length) list.innerHTML = '<p style="color:var(--text-muted); padding:20px;">Sin pedidos recientes.</p>';
    recent.forEach(o => {
        const s = State.suppliers.find(sup => sup.id === o.supplierId);
        const el = document.createElement('div');
        el.className = 'list-item';
        el.style.cursor = 'pointer';
        el.onclick = () => showOrderDetails(o.id);
        el.innerHTML = `<div><strong>${s?.name || 'Prov. Eliminado'}</strong><br><small>${new Date(o.date).toLocaleDateString()}</small></div>
                        <div class="tab-btn" style="background:#f1f3f5; pointer-events:none;">${o.items.length} ítems</div>`;
        list.appendChild(el);
    });
}

function initSuppliers() {
    const list = document.getElementById('suppliers-list-container');
    const searchInput = document.getElementById('sup-search-input');

    const render = (filter = '') => {
        list.innerHTML = '';
        const filtered = State.suppliers.filter(s =>
            s.name.toLowerCase().includes(filter.toLowerCase()) ||
            (s.category && s.category.toLowerCase().includes(filter.toLowerCase()))
        );

        if (!filtered.length) {
            list.innerHTML = '<p style="padding:20px; text-align:center; color:var(--text-muted);">No se encontraron proveedores.</p>';
            return;
        }

        filtered.forEach(s => {
            const el = document.createElement('div');
            el.className = 'list-item';
            el.innerHTML = `<div style="flex:1; cursor:pointer;" onclick="router.go('supplier-detail', {id:'${s.id}'})">
                                <strong>${s.name}</strong><br><small>${s.category || 'General'}</small>
                            </div>
                            <button class="btn-delete" onclick="deleteSupplier('${s.id}')"><i data-lucide="trash-2" style="width:18px"></i></button>`;
            list.appendChild(el);
        });
        lucide.createIcons();
    };

    searchInput.addEventListener('input', (e) => render(e.target.value));
    render();
}

function initSupplierDetail(id) {
    const s = State.suppliers.find(sup => sup.id === id);
    if (!s) return router.go('suppliers-list');
    const last = State.orders.filter(o => o.supplierId === id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    document.getElementById('det-title').innerText = s.name;
    document.getElementById('det-info-card').innerHTML = `
        <div style="font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px;">Datos de Contacto</div>
        <div><strong>Contacto:</strong> ${s.contactName || '-'}</div>
        <div><strong>Tel/WA:</strong> ${s.phone || '-'}</div>
        <div><strong>Email:</strong> ${s.email || '-'}</div>
        ${s.category ? `<div><strong>Rubro:</strong> ${s.category}</div>` : ''}
    `;
    const box = document.getElementById('det-last-order');
    box.innerHTML = last ? last.items.map(it => `• ${it.name} x ${it.qty}`).join('<br>') : 'Sin registros anteriores.';

    document.getElementById('btn-start-order').onclick = () => router.go('create-order', { id: s.id });
    document.getElementById('btn-edit-sup').onclick = () => showSupplierModal(s);
}

function initCreateOrder(supplierId) {
    const s = State.suppliers.find(sup => sup.id === supplierId);
    const list = document.getElementById('items-list-edit');
    const suggs = document.getElementById('sugg-chips');
    const lastOrder = State.orders.filter(o => o.supplierId === supplierId).sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    const addRow = (name = '', qty = '') => {
        const row = document.createElement('div');
        row.style = "display:flex; gap:10px; margin-bottom:10px; align-items:center; position:relative;";
        row.innerHTML = `
            <input type="text" class="n-in" placeholder="Producto" value="${name}" list="products-list" style="flex:1; padding:10px; border:1px solid var(--border); border-radius:8px;">
            <input type="text" class="q-in" placeholder="Cant" value="${qty || '1'}" style="width:60px; padding:10px; border:1px solid var(--border); border-radius:8px; text-align:center;">
            <button onclick="this.parentElement.remove()" class="btn-delete"><i data-lucide="x" style="width:16px"></i></button>
        `;
        list.appendChild(row);
        lucide.createIcons();

        const nIn = row.querySelector('.n-in');
        const qIn = row.querySelector('.q-in');

        const keyHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (e.target === nIn) qIn.focus();
                else { addRow().querySelector('.n-in').focus(); }
            }
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                addRow().querySelector('.n-in').focus();
            }
        };
        nIn.onkeydown = keyHandler;
        qIn.onkeydown = keyHandler;

        // Normalize on blur
        nIn.addEventListener('blur', (e) => {
            if (e.target.value) {
                e.target.value = e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1).toLowerCase().trim();
            }
        });

        return row;
    };

    // Prepare Autocomplete DataList
    let dataList = document.getElementById('products-list');
    if (!dataList) {
        dataList = document.createElement('datalist');
        dataList.id = 'products-list';
        document.body.appendChild(dataList);
    }

    // Suggestions from history (Normalized)
    const history = State.orders.filter(o => o.supplierId === supplierId).flatMap(o => o.items);
    const normalizedHistory = history.map(i => i.name.trim().toLowerCase());
    const uniqueNormalized = [...new Set(normalizedHistory)].map(name => {
        // Find original or capitalized version
        return name.charAt(0).toUpperCase() + name.slice(1);
    });

    dataList.innerHTML = uniqueNormalized.map(name => `<option value="${name}">`).join('');

    uniqueNormalized.slice(0, 8).forEach(name => {
        const chip = document.createElement('button');
        chip.className = 'tab-btn';
        chip.style = "border:1px solid var(--border); background:white;";
        chip.innerText = name;
        chip.onclick = () => addRow(name, '1');
        suggs.appendChild(chip);
    });

    addRow().querySelector('.n-in').focus();

    document.getElementById('btn-add-row').onclick = () => addRow().querySelector('.n-in').focus();
    document.getElementById('btn-repeat-last').onclick = () => { if (lastOrder) lastOrder.items.forEach(it => addRow(it.name, it.qty)); };
    document.getElementById('btn-back-create').onclick = () => router.go('supplier-detail', { id: supplierId });
    document.getElementById('btn-review').onclick = () => {
        const items = [];
        list.querySelectorAll('div').forEach(r => {
            const nInput = r.querySelector('.n-in');
            const qInput = r.querySelector('.q-in');
            if (nInput && qInput) {
                const n = nInput.value.trim();
                const q = qInput.value.trim();
                if (n) items.push({ name: n, qty: q });
            }
        });
        if (!items.length) return alert("Carga algún producto.");

        // SAVE ORDER IMMEDIATELY UPON "OK"
        State.orders.push({
            id: Date.now().toString(),
            supplierId: s.id,
            date: new Date().toISOString(),
            items
        });
        State.save();

        router.go('review', { data: { supplier: s, items } });
    };
}

function initReview(data) {
    const { supplier, items } = data;
    const preview = document.getElementById('preview-msg');
    const contactIn = document.getElementById('rev-contact-name');
    const signatureIn = document.getElementById('rev-signature');

    contactIn.value = supplier.contactName || '';
    signatureIn.value = State.settings.userName || '';

    const build = () => {
        const c = contactIn.value.trim();
        const s = signatureIn.value.trim();
        let msg = `Hola ${c || supplier.name}, te paso el pedido:\n\n`;
        items.forEach(it => msg += `• ${it.name} x ${it.qty}\n`);
        if (State.settings.company) msg += `\nPedido de: ${State.settings.company}`;
        if (s) msg += `\n${s}`;
        preview.innerText = msg;
        return msg;
    };
    build();
    contactIn.oninput = build;
    signatureIn.oninput = build;

    document.getElementById('btn-wa').onclick = () => {
        if (contactIn.value.trim() !== supplier.contactName) {
            supplier.contactName = contactIn.value.trim();
            State.save();
        }
        const msg = build();
        window.open(`https://wa.me/${supplier.phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(msg)}`, '_blank');
        router.go('home');
    };
    document.getElementById('btn-mail').onclick = () => {
        const msg = build();
        window.open(`mailto:?subject=Pedido ${supplier.name}&body=${encodeURIComponent(msg)}`, '_blank');
        router.go('home');
    };
    document.getElementById('btn-back-review').onclick = () => router.go('create-order', { id: supplier.id });
}

function initReports() {
    const body = document.getElementById('reports-body');

    // Stats Calculations
    const totalOrders = State.orders.length;
    let totalItemsCount = 0;
    const itemFreq = {};
    const supplierFreq = {};

    State.orders.forEach(o => {
        supplierFreq[o.supplierId] = (supplierFreq[o.supplierId] || 0) + 1;
        o.items.forEach(it => {
            const normalizedName = it.name.trim().charAt(0).toUpperCase() + it.name.trim().slice(1).toLowerCase();
            totalItemsCount += parseFloat(it.qty) || 1;
            itemFreq[normalizedName] = (itemFreq[normalizedName] || 0) + 1;
        });
    });

    const topItemId = Object.keys(itemFreq).sort((a, b) => itemFreq[b] - itemFreq[a])[0];
    const topSupId = Object.keys(supplierFreq).sort((a, b) => supplierFreq[b] - supplierFreq[a])[0];
    const topSup = State.suppliers.find(s => s.id === topSupId);

    const avgItemsPerOrder = totalOrders ? (totalItemsCount / totalOrders).toFixed(1) : 0;

    body.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 class="section-title" style="margin:0;">Información Táctica</h2>
            <button class="tab-btn" onclick="exportReports()" style="background:var(--primary-teal); color:white; border:none;">
                <i data-lucide="download" style="width:14px; margin-right:4px;"></i> Exportar CSV
            </button>
        </div>
        <div class="stat-grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 24px;">
            <div class="stat-card">
                <div class="stat-val">${totalOrders}</div>
                <div class="stat-label">Pedidos</div>
            </div>
            <div class="stat-card">
                <div class="stat-val">${totalItemsCount}</div>
                <div class="stat-label">Productos Total</div>
            </div>
            <div class="stat-card" style="grid-column: span 2; margin-top: 12px; background: #fffceb; border: 1px solid #ffeeba;">
                <div class="stat-val" style="font-size: 1.2rem; color: #856404;">${topItemId || '-'}</div>
                <div class="stat-label">Producto Estrella ⭐</div>
            </div>
        </div>

        <div class="main-search-card" style="margin-bottom: 24px;">
            <h2 class="section-title">Análisis de Proveedores</h2>
            <div class="stat-grid" style="grid-template-columns: 1fr; gap: 8px;">
                <div style="display:flex; justify-content:space-between; padding: 12px; background:#f8f9fa; border-radius:8px;">
                    <span class="stat-label">Top Proveedor:</span>
                    <strong style="color:var(--primary-teal)">${topSup?.name || '-'}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; padding: 12px; background:#f8f9fa; border-radius:8px;">
                    <span class="stat-label">Promedio de Items:</span>
                    <strong style="color:var(--primary-teal)">${avgItemsPerOrder} por pedido</strong>
                </div>
            </div>
        </div>

        <h2 class="section-title">Pedidos por Proveedor</h2>
        <div class="main-search-card">
            ${State.suppliers.length ? State.suppliers.map(s => {
        const count = supplierFreq[s.id] || 0;
        const percentage = totalOrders ? Math.round((count / totalOrders) * 100) : 0;
        return `
                <div style="margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span style="font-weight:600;">${s.name}</span>
                        <span style="color:var(--primary-teal); font-weight:700;">${count}</span>
                    </div>
                    <div style="width:100%; height:6px; background:#f1f1f1; border-radius:10px; overflow:hidden;">
                        <div style="width:${percentage}%; height:100%; background:var(--primary-teal);"></div>
                    </div>
                </div>`;
    }).join('') : '<p>No hay proveedores para analizar.</p>'}
        </div>

        <h2 class="section-title" style="margin-top:24px;">Frecuencia de Productos</h2>
        <div class="main-search-card">
            ${Object.keys(itemFreq).sort((a, b) => itemFreq[b] - itemFreq[a]).slice(0, 10).map(name => `
                <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f1f1f1;">
                    <span style="font-size:0.9rem;">${name}</span>
                    <span style="font-weight:700; color:var(--text-muted);">${itemFreq[name]} veces</span>
                </div>
            `).join('')}
        </div>
    `;
}

function initHistory() {
    const list = document.getElementById('history-list-full');
    const sorted = [...State.orders].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!sorted.length) list.innerHTML = '<p style="padding:20px;">No hay historial aún.</p>';
    sorted.forEach(o => {
        const s = State.suppliers.find(sup => sup.id === o.supplierId);
        const el = document.createElement('div');
        el.className = 'list-item';
        el.innerHTML = `<div style="flex:1; cursor:pointer;" onclick="showOrderDetails('${o.id}')">
                            <strong>${s?.name || 'Eliminado'}</strong><br>
                            <small>${new Date(o.date).toLocaleDateString()} - ${o.items.length} ítems</small>
                        </div>
                        <button class="btn-delete" onclick="deleteOrder('${o.id}')"><i data-lucide="trash-2" style="width:18px"></i></button>`;
        list.appendChild(el);
    });
    lucide.createIcons();
}

window.showOrderDetails = (id) => {
    const o = State.orders.find(order => order.id === id);
    if (!o) return;
    const s = State.suppliers.find(sup => sup.id === o.supplierId);

    const modal = document.getElementById('modal-container');
    const body = document.getElementById('modal-body');
    modal.classList.remove('hidden');

    body.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2 class="section-title" style="margin:0;">Detalle de Pedido</h2>
            <small style="color:var(--text-muted)">${new Date(o.date).toLocaleDateString()}</small>
        </div>
        <div style="margin-bottom:20px; padding:12px; background:#f8f9fa; border-radius:8px;">
            <strong>Proveedor:</strong> ${s?.name || 'Eliminado'}<br>
            <strong>Items:</strong> ${o.items.length}
        </div>
        <div style="max-height:300px; overflow-y:auto; margin-bottom:20px; border:1px solid var(--border); border-radius:8px; padding:10px;">
            ${o.items.map(it => `<div style="padding:6px 0; border-bottom:1px solid #f1f1f1; display:flex; justify-content:space-between;">
                <span>• ${it.name}</span>
                <strong>x ${it.qty}</strong>
            </div>`).join('')}
        </div>
        <button class="btn-primary-full" onclick="document.getElementById('modal-container').classList.add('hidden')">Cerrar</button>
    `;
};

function initSettings() {
    document.getElementById('set-biz').value = State.settings.company || '';
    document.getElementById('set-sig').value = State.settings.userName || '';
    renderUsers();
}

function renderUsers() {
    const list = document.getElementById('users-list');
    if (!list) return;
    list.innerHTML = '';
    State.users.forEach(u => {
        const isCurrent = u.id === State.currentUser;
        const el = document.createElement('div');
        el.className = 'list-item';
        el.style.background = isCurrent ? '#f0fdf4' : 'white';
        el.innerHTML = `
            <div style="flex:1;">
                <strong>${u.name}</strong> <small style="background:#e2e8f0; padding:2px 6px; border-radius:4px;">${u.role}</small>
                ${isCurrent ? '<br><span style="color:var(--primary-teal); font-size:0.75rem;">(Sesión Activa)</span>' : ''}
            </div>
            <div style="display:flex; gap:8px;">
                ${!isCurrent ? `<button class="tab-btn" onclick="switchUser('${u.id}')">Entrar</button>` : ''}
                ${u.id !== '1' ? `<button class="btn-delete" onclick="deleteUser('${u.id}')"><i data-lucide="trash-2" style="width:16px;"></i></button>` : ''}
            </div>
        `;
        list.appendChild(el);
    });
    lucide.createIcons();
}

window.addUser = () => {
    const nameIn = document.getElementById('new-user-name');
    const roleIn = document.getElementById('new-user-role');
    const name = nameIn.value.trim();
    if (!name) return alert("Ingresa un nombre.");
    State.users.push({ id: Date.now().toString(), name, role: roleIn.value });
    State.save();
    nameIn.value = '';
    renderUsers();
};

window.switchUser = (id) => {
    State.currentUser = id;
    State.save();
    renderUsers();
    alert("Usuario cambiado.");
};

window.deleteUser = (id) => {
    if (id === '1') return;
    if (confirm("¿Borrar este usuario?")) {
        State.users = State.users.filter(u => u.id !== id);
        if (State.currentUser === id) State.currentUser = '1';
        State.save();
        renderUsers();
    }
};

window.saveSettings = () => {
    State.settings.company = document.getElementById('set-biz').value.trim();
    State.settings.userName = document.getElementById('set-sig').value.trim();
    State.save();
    alert("Configuración guardada 💾");
    router.go('home');
};

window.deleteOrder = (id) => {
    if (confirm("¿Borrar este pedido del historial?")) {
        State.orders = State.orders.filter(o => o.id !== id);
        State.save();
        initHistory();
    }
};

window.deleteSupplier = (id) => {
    if (confirm("¿Borrar este proveedor? No borrará el historial de pedidos.")) {
        State.suppliers = State.suppliers.filter(s => s.id !== id);
        State.save();
        initSuppliers();
    }
};

function showSupplierModal(s = null) {
    const modal = document.getElementById('modal-container');
    const body = document.getElementById('modal-body');
    modal.classList.remove('hidden');
    body.innerHTML = `
        <h2 class="section-title">${s ? 'Editar' : 'Nuevo'} Proveedor</h2>
        <div class="form-group"><label>Nombre</label><input type="text" id="m-name" value="${s ? s.name : ''}"></div>
        <div class="form-group"><label>Contacto</label><input type="text" id="m-contact" value="${s ? s.contactName || '' : ''}"></div>
        <div class="form-group"><label>Email</label><input type="email" id="m-email" value="${s ? s.email || '' : ''}"></div>
        <div class="form-group"><label>Categoría</label><input type="text" id="m-cat" value="${s ? s.category || '' : ''}"></div>
        <div class="form-group"><label>WhatsApp</label><input type="tel" id="m-phone" value="${s ? s.phone || '' : ''}"></div>
        <div style="display:flex; gap:10px; margin-top:20px;">
            <button class="btn-primary-full" style="flex:2" onclick="saveSupplier('${s ? s.id : ''}')">Guardar</button>
            <button class="btn-primary-full" style="flex:1; background:#f1f3f5; color:var(--text-dark);" onclick="document.getElementById('modal-container').classList.add('hidden')">Cerrar</button>
        </div>
    `;
}

window.saveSupplier = (id) => {
    const data = {
        name: document.getElementById('m-name').value.trim(),
        contactName: document.getElementById('m-contact').value.trim(),
        email: document.getElementById('m-email').value.trim(),
        category: document.getElementById('m-cat').value.trim(),
        phone: document.getElementById('m-phone').value.trim()
    };
    if (!data.name) return;
    if (id) {
        const idx = State.suppliers.findIndex(sup => sup.id === id);
        State.suppliers[idx] = { ...State.suppliers[idx], ...data };
    } else {
        State.suppliers.push({ id: Date.now().toString(), ...data });
    }
    State.save();
    document.getElementById('modal-container').classList.add('hidden');
    router.go('suppliers-list');
};

window.exportReports = () => {
    // Collect data similarly to initReports
    const itemFreq = {};
    const supplierFreq = {};
    State.orders.forEach(o => {
        supplierFreq[o.supplierId] = (supplierFreq[o.supplierId] || 0) + 1;
        o.items.forEach(it => {
            itemFreq[it.name] = (itemFreq[it.name] || 0) + 1;
        });
    });

    let csvContent = "data:text/csv;charset=utf-8,";

    // Section: Suppliers
    csvContent += "ANALISIS DE PROVEEDORES\n";
    csvContent += "Proveedor,Pedidos Realizados\n";
    State.suppliers.forEach(s => {
        csvContent += `"${s.name}",${supplierFreq[s.id] || 0}\n`;
    });

    // Section: Products
    csvContent += "\nFRECUENCIA DE PRODUCTOS\n";
    csvContent += "Producto,Veces Pedido\n";
    Object.keys(itemFreq).sort((a, b) => itemFreq[b] - itemFreq[a]).forEach(name => {
        csvContent += `"${name}",${itemFreq[name]}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `buylog_reporte_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

function exportData() {
    const data = { s: State.suppliers, o: State.orders, st: State.settings };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u; a.download = 'buylog_backup.json';
    a.click();
}

function importData(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const data = JSON.parse(ev.target.result);
        if (data.s) State.suppliers = data.s;
        if (data.o) State.orders = data.o;
        if (data.st) State.settings = data.st;
        State.save();
        alert("Datos importados!");
        router.go('home');
    };
    reader.readAsText(e.target.files[0]);
}

window.onload = () => router.go('home');
