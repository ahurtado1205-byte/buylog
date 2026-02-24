// --- SUPABASE CONFIG ---
const SUPABASE_URL = 'https://rekcsmlsombubfijcgcu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3UkQfPPUu_G17rD2EenyAg_QQ_vJQsw';

let sb = null;
const initSupabase = () => {
    try {
        if (typeof supabase !== 'undefined') {
            sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log("✅ Supabase cargado correctamente.");
            window.sb = sb; // Para poder debuguear desde consola
        } else {
            console.error("❌ Error: La librería de Supabase no se cargó.");
        }
    } catch (e) {
        console.error("❌ Error inicializando Supabase:", e);
    }
};
initSupabase();

const State = {
    activeWorkspace: null,
    suppliers: [],
    orders: [],
    settings: {},
    users: [],
    currentUser: null,

    async init() {
        if (!sb) {
            console.error("Supabase no está cargado.");
            return;
        }

        const savedCompany = localStorage.getItem('bl_logged_company');
        const savedUser = localStorage.getItem('bl_logged_user');

        if (!savedCompany || !savedUser) {
            router.go('login');
            return;
        }

        this.activeWorkspace = savedCompany;
        this.currentUser = savedUser;
        await this.loadWorkspace(this.activeWorkspace);
        router.go('home');
    },

    async loadWorkspace(id) {
        this.activeWorkspace = id;

        // 1. Load Company Settings
        const { data: company, error: cErr } = await sb
            .from('companies')
            .select('*')
            .eq('id', id)
            .single();

        if (company) {
            this.settings = company.settings || {
                userName: '',
                company: company.name,
                heroImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600',
                heroTitle: 'Tu Compra Inteligente',
                heroSubtitle: 'Encuentra tu pedido ideal'
            };
        }

        // 2. Load Suppliers
        const { data: sups } = await sb
            .from('suppliers')
            .select('*')
            .eq('company_id', id);
        this.suppliers = sups || [];

        // 3. Load Orders (Last 50)
        const { data: ords } = await sb
            .from('orders')
            .select('*')
            .eq('company_id', id)
            .order('date', { ascending: false })
            .limit(50);
        this.orders = ords || [];

        // 4. Load Users
        const { data: usrs } = await sb
            .from('profiles')
            .select('*')
            .eq('company_id', id);
        this.users = usrs || [];
    },

    async save() {
        // En esta versión Cloud, guardamos cambios específicos 
        // cuando ocurren (saveSupplier, saveSettings, etc.)
        // Este método queda para actualizaciones globales si fuera necesario.
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
    // Apply Hero Settings
    const heroImg = document.querySelector('.hero-banner img');
    const heroTitle = document.querySelector('.hero-banner h1');
    const heroSub = document.querySelector('.hero-banner p');

    if (heroImg) heroImg.src = State.settings.heroImage;
    if (heroTitle) heroTitle.innerText = State.settings.heroTitle || 'Tu Compra Inteligente';
    if (heroSub) heroSub.innerText = State.settings.heroSubtitle;

    const list = document.getElementById('home-recent');
    const recent = [...State.orders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    if (!recent.length) list.innerHTML = '<p style="color:var(--text-muted); padding:20px;">Sin pedidos recientes.</p>';
    recent.forEach(o => {
        const s = State.suppliers.find(sup => sup.id === o.supplier_id);
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
    const last = State.orders.filter(o => o.supplier_id === id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    document.getElementById('det-title').innerText = s.name;
    document.getElementById('det-info-card').innerHTML = `
        <div style="font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px;">Datos de Contacto</div>
        <div><strong>Contacto:</strong> ${s.contact_name || '-'}</div>
        <div><strong>Tel/WA:</strong> ${s.phone || '-'}</div>
        <div><strong>Email:</strong> ${s.email || '-'}</div>
        <div><strong>Domicilio:</strong> ${s.address || '-'}</div>
        <div style="margin-top:12px; font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; border-top:1px solid #eee; padding-top:12px;">Logística</div>
        <div><strong>Horarios:</strong> ${s.hours || '-'}</div>
        <div><strong>Días Pedido:</strong> <span style="color:var(--primary-teal); font-weight:600;">${s.order_days || '-'}</span></div>
        <div><strong>Días Entrega:</strong> <span style="color:#e67e22; font-weight:600;">${s.delivery_days || '-'}</span></div>
        ${s.category ? `<div style="margin-top:8px;"><strong>Rubro:</strong> ${s.category}</div>` : ''}
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
    const lastOrder = State.orders.filter(o => o.supplier_id === supplierId).sort((a, b) => new Date(b.date) - new Date(a.date))[0];

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

    // Suggestions from ALL history (Global Catalog)
    const globalHistory = State.orders.flatMap(o => o.items);
    const normalizedGlobal = globalHistory.map(i => i.name.trim().toLowerCase());
    const uniqueGlobal = [...new Set(normalizedGlobal)].map(name => {
        return name.charAt(0).toUpperCase() + name.slice(1);
    }).sort();

    dataList.innerHTML = uniqueGlobal.map(name => `<option value="${name}">`).join('');

    // Quick Selector (Dropdown)
    suggs.innerHTML = `
        <div style="width:100%; margin-bottom:10px;">
            <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Agregar de mi catálogo:</label>
            <select id="quick-prod-select" style="width:100%; padding:12px; border-radius:12px; border:1px solid var(--border); background:white; font-family:inherit;">
                <option value="">-- Elige un producto registrado --</option>
                ${uniqueGlobal.map(name => `<option value="${name}">${name}</option>`).join('')}
            </select>
        </div>
    `;

    document.getElementById('quick-prod-select').onchange = (e) => {
        if (e.target.value) {
            addRow(e.target.value, '1');
            e.target.value = ''; // Reset select
        }
    };

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

        // SAVE ORDER TO SUPABASE
        const newOrder = {
            company_id: State.activeWorkspace,
            supplier_id: s.id,
            date: new Date().toISOString(),
            status: 'pending', // Default status
            items
        };

        sb.from('orders').insert([newOrder]).select().then(({ data, error }) => {
            if (error) console.error("Error guardando pedido:", error);
            if (data && data[0]) {
                State.orders.unshift(data[0]);
                router.go('review', { data: { order: data[0], supplier: s, items } });
            }
        });
    };
}

function initReview(data) {
    const { supplier, items } = data;
    const preview = document.getElementById('preview-msg');
    const contactIn = document.getElementById('rev-contact-name');
    const signatureIn = document.getElementById('rev-signature');

    contactIn.value = supplier.contact_name || '';
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

    document.getElementById('btn-print').onclick = () => downloadOrderPDF(data.order?.id);
    document.getElementById('btn-wa').onclick = () => {
        if (contactIn.value.trim() !== supplier.contact_name) {
            supplier.contact_name = contactIn.value.trim();
            // In a Supabase context, you'd update the supplier in the DB here
            // For now, we'll just update the local object for the current session
            // State.save(); // This would trigger a full save, better to have a specific updateSupplier function
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
        supplierFreq[o.supplier_id] = (supplierFreq[o.supplier_id] || 0) + 1;
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
                    <span>${name}</span>
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
        const s = State.suppliers.find(sup => sup.id === o.supplier_id);
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
    const s = State.suppliers.find(sup => sup.id === o.supplier_id);
    const isAdmin = State.users.find(u => u.id === State.currentUser)?.role === 'admin';

    const modal = document.getElementById('modal-container');
    const body = document.getElementById('modal-body');
    modal.classList.remove('hidden');

    body.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2 class="section-title" style="margin:0;">Detalle de Pedido</h2>
            <div class="status-badge status-${o.status || 'pending'}">${o.status || 'pendiente'}</div>
        </div>
        
        ${o.status === 'pending' && isAdmin ? `
            <div class="approval-container">
                <p style="font-size:0.85rem; margin-bottom:12px;">Este pedido requiere aprobación para ser enviado.</p>
                <button class="btn-primary-v2" onclick="approveOrder('${o.id}')">
                    <i data-lucide="check-circle"></i> Aprobar Ahora
                </button>
            </div>
        ` : ''}

        <div style="margin-bottom:20px; padding:12px; background:#f8f9fa; border-radius:8px; font-size:0.9rem;">
            <strong>Proveedor:</strong> ${s?.name || 'Eliminado'}<br>
            <strong>Fecha:</strong> ${new Date(o.date).toLocaleDateString()}<br>
            <strong>Items:</strong> ${o.items.length}
        </div>
        <div style="max-height:300px; overflow-y:auto; margin-bottom:20px; border:1px solid var(--border); border-radius:8px; padding:10px;">
            ${o.items.map(it => `<div style="padding:10px 0; border-bottom:1px solid #f1f1f1; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:18px; height:18px; border:1px solid #cbd5e1; border-radius:4px;"></div>
                    <span>${it.name}</span>
                </div>
                <strong>x ${it.qty}</strong>
            </div>`).join('')}
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <button class="btn-primary-full" style="background:#64748b" onclick="downloadOrderPDF('${o.id}')">PDF Checklist</button>
            <button class="btn-primary-full" onclick="document.getElementById('modal-container').classList.add('hidden')">Cerrar</button>
        </div>
    `;
    lucide.createIcons();
};

window.approveOrder = async (id) => {
    const { error } = await sb.from('orders').update({ status: 'approved' }).eq('id', id);
    if (!error) {
        const idx = State.orders.findIndex(o => o.id === id);
        if (idx !== -1) State.orders[idx].status = 'approved';
        alert("¡Pedido Aprobado!");
        showOrderDetails(id);
    }
};

window.downloadOrderPDF = (orderId) => {
    const o = State.orders.find(order => order.id === orderId);
    if (!o) return;
    const s = State.suppliers.find(sup => sup.id === o.supplier_id);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Estilos
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(13, 148, 136); // Primary Teal
    doc.text("BuyLog - Hoja de Recepción", 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generado el ${new Date().toLocaleString()}`, 20, 27);

    // Info del Pedido
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 32, 190, 32);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Proveedor: ${s?.name || 'N/A'}`, 20, 42);
    doc.text(`Fecha Pedido: ${new Date(o.date).toLocaleDateString()}`, 20, 49);
    doc.text(`Estado: ${o.status?.toUpperCase() || 'PENDIENTE'}`, 20, 56);
    doc.text(`Empresa: ${State.settings.company || '-'}`, 120, 42);

    // Tabla de Items
    const tableData = o.items.map(it => [
        "[  ]", // Casillero para marcar
        it.name,
        it.qty,
        "________________" // Espacio para observaciones
    ]);

    doc.autoTable({
        startY: 65,
        head: [['Recibido', 'Producto', 'Cant. Pedida', 'Observaciones']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [13, 148, 136] },
        styles: { fontSize: 10, cellPadding: 8 }
    });

    doc.setFontSize(9);
    doc.setTextColor(150);
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.text("Firma de Recepción: ___________________________", 20, finalY);

    doc.save(`Pedido_${s?.name}_${new Date(o.date).toISOString().split('T')[0]}.pdf`);
};

function initSettings() {
    document.getElementById('set-biz').value = State.settings.company || '';
    document.getElementById('set-sig').value = State.settings.userName || '';
    document.getElementById('set-hero-title').value = State.settings.heroTitle || '';
    document.getElementById('set-hero-img').value = State.settings.heroImage || '';
    document.getElementById('set-hero-sub').value = State.settings.heroSubtitle || '';
    renderUsers();
    // renderWorkspaces(); // Workspaces are now managed by Supabase and login flow
}

function renderWorkspaces() {
    // This function is largely deprecated in the Supabase version
    // as workspaces are managed via the 'companies' table and login.
    // However, if we wanted to list all companies a user has access to,
    // we would fetch them here. For now, it's not directly used.
    const list = document.getElementById('workspaces-list');
    if (!list) return;
    list.innerHTML = '<p style="padding:20px; text-align:center; color:var(--text-muted);">La gestión de empresas se realiza al iniciar sesión.</p>';
}

window.switchWorkspace = async (id) => {
    localStorage.setItem('bl_logged_company', id);
    await State.loadWorkspace(id);
    router.go('home');
    alert(`Cambiado a: ${State.settings.company}`);
};

window.createWorkspace = async () => {
    const name = prompt("Nombre del nuevo Restaurante / Sucursal:");
    if (!name) return;
    const id = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now().toString().slice(-4);

    // Optional Clone logic
    const clone = confirm("¿Deseas clonar los PROVEEDORES del restaurante actual?");

    const newSuppliers = clone ? State.suppliers.map(s => ({ ...s, id: undefined, company_id: id })) : [];

    const { data: newCompany, error: companyError } = await sb
        .from('companies')
        .insert([{
            id: id,
            name: name,
            settings: {
                userName: '',
                company: name,
                heroImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600',
                heroTitle: 'Tu Compra Inteligente',
                heroSubtitle: `Pedido para ${name}`
            }
        }])
        .select()
        .single();

    if (companyError) {
        console.error("Error creating company:", companyError);
        alert("Error al crear la empresa.");
        return;
    }

    if (newSuppliers.length > 0) {
        const { error: suppliersError } = await sb
            .from('suppliers')
            .insert(newSuppliers);
        if (suppliersError) console.error("Error cloning suppliers:", suppliersError);
    }

    localStorage.setItem('bl_logged_company', id);
    await State.loadWorkspace(id);
    router.go('home');
};

window.deleteWorkspace = async (id) => {
    // In a real app, you'd likely soft-delete or have more robust access control.
    // For this example, we'll allow deletion if it's not the active one.
    if (id === State.activeWorkspace) {
        alert("No puedes eliminar el restaurante activo.");
        return;
    }
    if (confirm("¿Seguro que deseas borrar este restaurante y TODA su información? Esta acción no se puede deshacer.")) {
        const { error: deleteCompanyError } = await sb
            .from('companies')
            .delete()
            .eq('id', id);

        if (deleteCompanyError) {
            console.error("Error deleting company:", deleteCompanyError);
            alert("Error al eliminar la empresa.");
            return;
        }

        // Also delete associated suppliers, orders, profiles
        await sb.from('suppliers').delete().eq('company_id', id);
        await sb.from('orders').delete().eq('company_id', id);
        await sb.from('profiles').delete().eq('company_id', id);

        // Remove from local storage if it was ever logged in
        if (localStorage.getItem('bl_logged_company') === id) {
            localStorage.removeItem('bl_logged_company');
            localStorage.removeItem('bl_logged_user');
        }

        // Reload to reflect changes
        location.reload();
    }
};

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

window.addUser = async () => {
    const nameIn = document.getElementById('new-user-name');
    const roleIn = document.getElementById('new-user-role');
    const name = nameIn.value.trim();
    if (!name) return alert("Ingresa un nombre.");

    const { data, error } = await sb
        .from('profiles')
        .insert([{ name, company_id: State.activeWorkspace, role: roleIn.value }])
        .select()
        .single();

    if (error) {
        console.error("Error adding user:", error);
        alert("Error al agregar usuario.");
        return;
    }
    State.users.push(data);
    nameIn.value = '';
    renderUsers();
};

window.switchUser = (id) => {
    State.currentUser = id;
    localStorage.setItem('bl_logged_user', id);
    renderUsers();
    alert("Usuario cambiado.");
};

window.deleteUser = async (id) => {
    if (id === '1') return; // Prevent deleting the default admin
    if (confirm("¿Borrar este usuario?")) {
        const { error } = await sb
            .from('profiles')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting user:", error);
            alert("Error al eliminar usuario.");
            return;
        }

        State.users = State.users.filter(u => u.id !== id);
        if (State.currentUser === id) {
            State.currentUser = State.users.length > 0 ? State.users[0].id : null;
            localStorage.setItem('bl_logged_user', State.currentUser);
        }
        renderUsers();
    }
};

window.saveSettings = async () => {
    State.settings.company = document.getElementById('set-biz').value.trim();
    State.settings.userName = document.getElementById('set-sig').value.trim();
    State.settings.heroTitle = document.getElementById('set-hero-title').value.trim();
    State.settings.heroImage = document.getElementById('set-hero-img').value.trim();
    State.settings.heroSubtitle = document.getElementById('set-hero-sub').value.trim();

    const { error } = await sb
        .from('companies')
        .update({ settings: State.settings })
        .eq('id', State.activeWorkspace);

    if (error) {
        console.error("Save Error:", error);
        alert("Error salvando en la nube: " + (error.message || "Error desconocido"));
    } else {
        alert("Configuración guardada en la Nube ☁️");
        router.go('home');
    }
};

window.handleHeroUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) return alert("Imagen muy pesada (máx 1MB)");
    const reader = new FileReader();
    reader.onload = (ev) => {
        State.settings.heroImage = ev.target.result;
        document.getElementById('set-hero-img').value = ev.target.result;
        alert("Imagen cargada (recuerda Guardar)");
    };
    reader.readAsDataURL(file);
};

window.deleteOrder = async (id) => {
    if (confirm("¿Borrar este pedido del historial?")) {
        const { error } = await sb.from('orders').delete().eq('id', id);
        if (!error) {
            State.orders = State.orders.filter(o => o.id !== id);
            initHistory();
        }
    }
};

window.deleteSupplier = async (id) => {
    if (confirm("¿Borrar este proveedor? No borrará el historial de pedidos.")) {
        const { error } = await sb.from('suppliers').delete().eq('id', id);
        if (!error) {
            State.suppliers = State.suppliers.filter(s => s.id !== id);
            initSuppliers();
        }
    }
};

function showSupplierModal(s = null) {
    const modal = document.getElementById('modal-container');
    const body = document.getElementById('modal-body');
    modal.classList.remove('hidden');
    body.innerHTML = `
        <h2 class="section-title">${s ? 'Editar' : 'Nuevo'} Proveedor</h2>
        <div style="max-height: 60vh; overflow-y: auto; padding-right: 5px;">
            <div class="form-group"><label>Nombre</label><input type="text" id="m-name" value="${s ? s.name : ''}"></div>
            <div class="form-group"><label>Contacto</label><input type="text" id="m-contact" value="${s ? s.contact_name || '' : ''}"></div>
            <div class="form-group"><label>Email</label><input type="email" id="m-email" value="${s ? s.email || '' : ''}"></div>
            <div class="form-group"><label>WhatsApp</label><input type="tel" id="m-phone" value="${s ? s.phone || '' : ''}"></div>
            <div class="form-group"><label>Domicilio</label><input type="text" id="m-address" value="${s ? s.address || '' : ''}"></div>
            <div class="form-group"><label>Horarios</label><input type="text" id="m-hours" value="${s ? s.hours || '' : ''}" placeholder="Ej: 8:00 - 16:00"></div>
            <div class="form-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <div class="form-group"><label>Días Pedido</label><input type="text" id="m-order" value="${s ? s.order_days || '' : ''}" placeholder="Lun/Mie"></div>
                <div class="form-group"><label>Días Entrega</label><input type="text" id="m-delivery" value="${s ? s.delivery_days || '' : ''}" placeholder="Mar/Jue"></div>
            </div>
            <div class="form-group"><label>Categoría</label><input type="text" id="m-cat" value="${s ? s.category || '' : ''}"></div>
        </div>
        <div style="display:flex; gap:10px; margin-top:20px;">
            <button class="btn-primary-full" style="flex:2" onclick="saveSupplier('${s ? s.id : ''}')">Guardar</button>
            <button class="btn-primary-full" style="flex:1; background:#f1f3f5; color:var(--text-dark);" onclick="document.getElementById('modal-container').classList.add('hidden')">Cerrar</button>
        </div>
    `;
}

window.saveSupplier = async (id) => {
    const data = {
        name: document.getElementById('m-name').value.trim(),
        contact_name: document.getElementById('m-contact').value.trim(),
        email: document.getElementById('m-email').value.trim(),
        category: document.getElementById('m-cat').value.trim(),
        phone: document.getElementById('m-phone').value.trim(),
        address: document.getElementById('m-address').value.trim(),
        hours: document.getElementById('m-hours').value.trim(),
        order_days: document.getElementById('m-order').value.trim(),
        delivery_days: document.getElementById('m-delivery').value.trim(),
        company_id: State.activeWorkspace
    };
    if (!data.name) return;

    if (id) {
        const { error } = await sb.from('suppliers').update(data).eq('id', id);
        if (error) {
            console.error("Error updating supplier:", error);
            alert("Error al editar proveedor: " + error.message);
            return;
        }
        const idx = State.suppliers.findIndex(sup => sup.id === id);
        State.suppliers[idx] = { ...State.suppliers[idx], ...data };
    } else {
        const { data: newSup, error } = await sb.from('suppliers').insert([data]).select().single();
        if (error) {
            console.error("Error creating supplier:", error);
            alert("Error al crear proveedor: " + error.message);
            return;
        }
        State.suppliers.push(newSup);
    }

    document.getElementById('modal-container').classList.add('hidden');
    router.go('suppliers-list');
};

window.exportReports = () => {
    // Collect data similarly to initReports
    const itemFreq = {};
    const supplierFreq = {};
    State.orders.forEach(o => {
        supplierFreq[o.supplier_id] = (supplierFreq[o.supplier_id] || 0) + 1;
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
    a.href = u; a.download = `buylog_full_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function importData(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if (data.s) State.suppliers = data.s;
            if (data.o) State.orders = data.o;
            if (data.st) State.settings = data.st;
            State.save();
            alert("Datos importados!");
            router.go('home');
        } catch (err) {
            alert("Error al importar JSON.");
        }
    };
    reader.readAsText(e.target.files[0]);
}

window.exportSuppliersCSV = () => {
    let csv = "\uFEFF"; // UTF-8 BOM
    csv += "Nombre,Contacto,WhatsApp,Email,Categoría\n";
    State.suppliers.forEach(s => {
        csv += `"${s.name}","${s.contact_name || ''}","${s.phone || ''}","${s.email || ''}","${s.category || ''}"\n`;
    });
    downloadCSV(csv, 'buylog_proveedores.csv');
};

window.importSuppliersCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
        const text = ev.target.result;
        const rows = text.split(/\r?\n/).slice(1); // Skip header
        const newSuppliers = [];
        rows.forEach(row => {
            // Split by comma but ignore commas inside double quotes
            const cols = row.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
            if (cols && cols.length >= 1) {
                const clean = c => c.replace(/^["']|["']$/g, '').trim();
                newSuppliers.push({
                    name: clean(cols[0]),
                    contact_name: cols[1] ? clean(cols[1]) : '',
                    phone: cols[2] ? clean(cols[2]) : '',
                    email: cols[3] ? clean(cols[3]) : '',
                    category: cols[4] ? clean(cols[4]) : '',
                    company_id: State.activeWorkspace
                });
            }
        });
        if (newSuppliers.length) {
            if (confirm(`¿Importar ${newSuppliers.length} proveedores? Esto se sumará a los actuales.`)) {
                const { data, error } = await sb.from('suppliers').insert(newSuppliers).select();
                if (!error) {
                    State.suppliers.push(...data);
                    alert("Importación exitosa!");
                    router.go('suppliers-list');
                } else {
                    console.error("Error importing suppliers:", error);
                    alert("Error al importar proveedores.");
                }
            }
        }
    };
    reader.readAsText(file);
};

window.exportOrdersCSV = () => {
    let csv = "\uFEFF";
    csv += "Fecha,Proveedor,Producto,Cantidad\n";
    State.orders.forEach(o => {
        const s = State.suppliers.find(sup => sup.id === o.supplier_id);
        o.items.forEach(it => {
            csv += `"${new Date(o.date).toLocaleDateString()}","${s?.name || 'Eliminado'}","${it.name}","${it.qty}"\n`;
        });
    });
    downloadCSV(csv, 'buylog_historial_pedidos.csv');
};

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.loginPhase1 = async () => {
    const bizName = document.getElementById('login-biz-name').value.trim();
    const bizCode = document.getElementById('login-biz-code').value.trim();

    if (!bizName || !bizCode) return alert("Por favor, ingresa el nombre y el código de acceso.");

    const companyId = bizName.toLowerCase().replace(/\s+/g, '_');

    // Check if company exists
    let { data: company, error } = await sb
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

    if (!company) {
        // Create new company with the provided code
        const { data: newComp, error: createErr } = await sb
            .from('companies')
            .insert([{
                id: companyId,
                name: bizName,
                settings: {
                    access_code: bizCode,
                    company: bizName,
                    heroTitle: 'Tu Compra Inteligente',
                    heroImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600'
                }
            }])
            .select()
            .single();

        if (createErr) {
            console.error("Error al crear empresa:", createErr);
            return alert("Error de Supabase: " + (createErr.message || "Error desconocido") + "\n\nDetalle: " + (createErr.details || "-"));
        }
        company = newComp;
        alert("¡Empresa registrada con éxito! Este será tu código de acceso de ahora en adelante.");
    } else {
        // Verify access code (it's stored in settings for now, ideally in a separate field)
        const savedCode = company.settings?.access_code;
        if (savedCode && savedCode !== bizCode) {
            return alert("Código de acceso incorrecto para esta empresa.");
        }
    }

    // Load users for this company
    const { data: users } = await sb
        .from('profiles')
        .select('*')
        .eq('company_id', companyId);

    const finalUsers = users?.length ? users : [{ id: '1', name: 'Admin', role: 'admin', company_id: companyId }];

    // If no users exist for this company, create a default admin
    if (!users || users.length === 0) {
        const { data: adminUser, error: adminError } = await sb
            .from('profiles')
            .insert([{ name: 'Admin', role: 'admin', company_id: companyId }])
            .select()
            .single();
        if (adminError) {
            console.error("Error creating default admin:", adminError);
        } else if (adminUser) {
            finalUsers = [adminUser];
        }
    }

    document.getElementById('login-biz-welcome').innerText = `Hola ${bizName}`;
    const grid = document.getElementById('login-users-grid');
    grid.innerHTML = '';

    finalUsers.filter(Boolean).forEach(u => {
        const btn = document.createElement('button');
        btn.className = 'user-btn';
        btn.innerHTML = `
            <i data-lucide="user"></i>
            <span>${u.name}</span>
        `;
        btn.onclick = () => loginPhase2(companyId, u.id, bizName);
        grid.appendChild(btn);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-ghost';
    addBtn.style.width = '100%';
    addBtn.style.marginTop = '10px';
    addBtn.innerHTML = "<i data-lucide='user-plus'></i> Nuevo Operador";
    addBtn.onclick = async () => {
        const name = prompt("Nombre del nuevo usuario:");
        if (name) {
            await sb.from('profiles').insert([{ name, company_id: companyId, role: 'user' }]);
            loginPhase1();
        }
    };
    grid.appendChild(addBtn);

    document.getElementById('login-step-1').classList.add('hidden');
    document.getElementById('login-step-2').classList.remove('hidden');
    lucide.createIcons();
};

window.loginPhase2 = async (companyId, userId, companyName) => {
    localStorage.setItem('bl_logged_company', companyId);
    localStorage.setItem('bl_logged_user', userId);

    await State.loadWorkspace(companyId);
    router.go('home');
};

window.logout = () => {
    if (confirm("¿Cerrar sesión de esta empresa?")) {
        localStorage.removeItem('bl_logged_company');
        localStorage.removeItem('bl_logged_user');
        location.reload();
    }
};

window.hardResetApp = () => {
    if (confirm("🚨 ATENCIÓN: Esto borrará tu sesión actual y todos los datos guardados localmente. ¿Deseas continuar?")) {
        if (confirm("⚠️ ¿ESTÁS REALMENTE SEGURO? Se perderá el acceso rápido a tu empresa (deberás volver a poner el nombre y código).")) {
            localStorage.clear();
            sessionStorage.clear();
            alert("Aplicación reseteada. Reiniciando...");
            location.reload();
        }
    }
};

window.onload = () => {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('BuyLog SW Registered'))
            .catch(err => console.log('SW Register Error:', err));
    }

    State.init();
};

