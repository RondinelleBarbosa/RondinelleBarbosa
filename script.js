// App Database (InMemory)
const initialDB = {
    os: [
        { id: 1024, client: "João Silva", vehicle: "Honda Civic 2018", status: "progress", total: 450.00, description: "Troca de óleo e filtros" },
        { id: 1023, client: "Maria Oliveira", vehicle: "Fiat Strada", status: "done", total: 120.00, description: "Alinhamento" },
        { id: 1022, client: "Pedro Santos", vehicle: "VW Gol", status: "waiting", total: 850.50, description: "Suspensão completa" }
    ],
    inventory: [
        { id: '101', name: 'Óleo Sintético 5W30', category: 'Lubrificantes', qty: 45, price: 55.00, cost: 32.00, min: 10 },
        { id: '102', name: 'Filtro de Óleo Honda', category: 'Filtros', qty: 8, price: 45.00, cost: 15.00, min: 10 },
        { id: '103', name: 'Pastilha de Freio Univ.', category: 'Freios', qty: 12, price: 120.00, cost: 60.00, min: 5 },
        { id: '104', name: 'Amortecedor Tras.', category: 'Suspensão', qty: 2, price: 350.00, cost: 180.00, min: 4 },
        // Services for PDV
        { id: 'SERV-01', name: 'Alinhamento 3D', category: 'Serviços', qty: 999, price: 120.00, cost: 0.00, min: 0 },
        { id: 'SERV-02', name: 'Balanceamento (Roda)', category: 'Serviços', qty: 999, price: 40.00, cost: 0.00, min: 0 },
        { id: 'SERV-03', name: 'Hospedagem Veículo (Diária)', category: 'Serviços', qty: 999, price: 50.00, cost: 0.00, min: 0 }
    ],
    finance: [
        { id: 1, date: '2025-12-31', desc: 'Recebimento OS #1023', category: 'Serviços', type: 'in', value: 120.00, status: 'paid' },
        { id: 2, date: '2025-12-30', desc: 'Compra Peças (Fornecedor X)', category: 'Estoques', type: 'out', value: 450.00, status: 'paid' },
        { id: 3, date: '2025-12-30', desc: 'Conta de Energia', category: 'Despesas Fixas', type: 'out', value: 320.00, status: 'pending' },
        { id: 4, date: '2025-12-29', desc: 'Venda Balcão #88', category: 'Vendas', type: 'in', value: 85.00, status: 'paid' }
    ]
};

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyBMrwQgZLM12gquFSHJ4xCi2ruk2t9m6rg",
    authDomain: "rapidoauto.firebaseapp.com",
    projectId: "rapidoauto",
    storageBucket: "rapidoauto.firebasestorage.app",
    messagingSenderId: "22353349522",
    appId: "1:22353349522:web:88354a30e0f41a3377cf4b",
    measurementId: "G-09Q9YR987Z"
};

// Initialize Firebase (Compat Mode)
let dbRef;
try {
    if (firebase.apps.length === 0) {
        firebase.initializeApp(firebaseConfig);
    }
    dbRef = firebase.firestore();
    console.log("🔥 Firebase Conectado: rapidoauto");
} catch (e) {
    console.error("Erro ao conectar Firebase:", e);
    console.log("⚠️ Rodando em Modo Offline (Local)");
}

let db = initialDB; // Default to initial

// Persistence Logic (Hybrid: Cloud > Local)
const Storage = {
    load: async () => {
        if (dbRef) {
            try {
                // Try to load from Cloud
                const doc = await dbRef.collection('tenants').doc('demo-workshop').get();
                if (doc.exists) {
                    return doc.data();
                } else {
                    // Initialize Cloud with Local Data if empty
                    await dbRef.collection('tenants').doc('demo-workshop').set(initialDB);
                    return initialDB;
                }
            } catch (error) {
                console.error("Cloud Load Error", error);
                return JSON.parse(localStorage.getItem('rapidauto_db_v1')) || initialDB;
            }
        } else {
            // Local Fallback
            return JSON.parse(localStorage.getItem('rapidauto_db_v1')) || initialDB;
        }
    },
    save: async (data) => {
        if (dbRef) {
            dbRef.collection('tenants').doc('demo-workshop').set(data, { merge: true });
        }
        localStorage.setItem('rapidauto_db_v1', JSON.stringify(data));
    }
};

// Formatter Utils
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// App Logic
const app = {
    init: async () => {
        // Real Cloud Auth Listener
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                // User is signed in.
                document.getElementById('login-screen').classList.remove('active');

                // Update User Info
                const userInfoSpan = document.querySelector('.user-info span');
                if (userInfoSpan) userInfoSpan.innerHTML = `Olá, <b>${user.email.split('@')[0]}</b><br>Gerente`;

                // Load System Data from Cloud
                dbRef = firebase.firestore();
                db = await Storage.load();
                app.loadSystem();

                console.log("Logged in as: ", user.email);
            } else {
                // User is signed out.
                document.getElementById('login-screen').classList.add('active');
            }
        });
    },

    login: () => {
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPass').value;

        if (email && pass) {
            const btn = document.querySelector('#login-screen .btn-primary');
            const originalText = btn.innerText;
            btn.innerText = "Verificando...";
            btn.disabled = true;

            // Firebase Auth Login
            firebase.auth().signInWithEmailAndPassword(email, pass)
                .then((userCredential) => {
                    // Signed in logic handled by onAuthStateChanged
                })
                .catch((error) => {
                    console.error(error);
                    let msg = "Erro ao entrar.";
                    if (error.code === 'auth/user-not-found') msg = "Usuário não encontrado.";
                    if (error.code === 'auth/wrong-password') msg = "Senha incorreta.";
                    if (error.code === 'auth/invalid-email') msg = "Email inválido.";

                    alert(msg + " (Tente admin@rapidauto.com / 12345678)");

                    // Reset button
                    btn.innerText = originalText;
                    btn.disabled = false;
                });

        } else {
            alert("Preencha todos os campos!");
        }
    },

    toggleSidebar: () => {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('mobile-open');
    },

    logout: () => {
        firebase.auth().signOut().then(() => {
            location.reload();
        });
    },

    loadSystem: () => {
        app.updateDate();
        app.setupNavigation();
        app.renderOSTable();
        app.renderInventoryTable();
        app.renderFinanceTable();
        app.renderProductGrid();

        // POS Search Listener
        const posSearch = document.getElementById('posSearch');
        if (posSearch) {
            posSearch.addEventListener('input', app.renderProductGrid);
        }
        console.log("RapidAuto ERP Initialized with Persistence");
    },

    // Autosave Wrapper
    saveState: () => {
        Storage.save(db);
    },


    updateDate: () => {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateString = now.toLocaleDateString('pt-BR', options);
        document.getElementById('currentDate').textContent = dateString.charAt(0).toUpperCase() + dateString.slice(1);
    },

    setupNavigation: () => {
        const navLinks = document.querySelectorAll('.nav-item');
        const screens = document.querySelectorAll('.screen');
        const pageTitle = document.getElementById('pageTitle');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                const targetId = link.getAttribute('data-target');
                const targetScreen = document.getElementById(targetId);

                if (targetScreen) {
                    screens.forEach(s => s.classList.remove('active'));
                    screens.forEach(s => s.classList.add('hidden'));

                    targetScreen.classList.remove('hidden');
                    targetScreen.classList.add('active');

                    const newTitle = link.querySelector('span').textContent;
                    pageTitle.textContent = newTitle;

                    // Handle deep link to tabs (e.g. Sidebar Links for Clients vs Suppliers)
                    const tabTarget = link.getAttribute('data-tab');
                    if (tabTarget) {
                        // Find the button inside the target screen that toggles this tab
                        const tabBtn = targetScreen.querySelector(`[onclick*="${tabTarget}"]`);
                        if (tabBtn) {
                            // Convert text onclick to function call or reuse switchTab
                            app.switchTab(tabTarget, tabBtn);
                        }
                    }
                }
            });
        });

        // Search Filter
        const searchInput = document.getElementById('osSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = db.os.filter(os =>
                    os.client.toLowerCase().includes(term) ||
                    os.vehicle.toLowerCase().includes(term) ||
                    os.id.toString().includes(term)
                );
                app.renderOSTable(filtered);
            });
        }
    },

    // --- OS Module Logic ---

    renderOSTable: (data = db.os) => {
        const tbody = document.getElementById('osTableBody');
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">Nenhuma OS encontrada.</td></tr>';
            return;
        }

        data.forEach(item => {
            const statusMap = {
                'pending': { label: 'Pendente', class: 'pending' },
                'progress': { label: 'Em Andamento', class: 'progress' },
                'waiting': { label: 'Aguardando Peça', class: 'waiting' },
                'done': { label: 'Concluído', class: 'done' }
            };
            const status = statusMap[item.status] || { label: item.status, class: '' };

            // WhatsApp Message Generator
            const msg = `Olá ${item.client}, referente a sua OS #${item.id} (${item.vehicle}): O status atual é *${status.label}*. Valor: ${formatCurrency(item.total)}.`;
            const waLink = `https://wa.me/?text=${encodeURIComponent(msg)}`;

            const row = `
                <tr>
                    <td>#${item.id}</td>
                    <td>${item.client}</td>
                    <td>${item.vehicle}</td>
                    <td><span class="status-badge ${status.class}">${status.label}</span></td>
                    <td>${formatCurrency(item.total)}</td>
                    <td>
                        <button class="action-btn" title="Editar"><i class="ph ph-pencil"></i></button>
                        <a href="${waLink}" target="_blank" class="action-btn whatsapp" title="Enviar no WhatsApp"><i class="ph ph-whatsapp-logo"></i></a>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    },

    // --- POS Module ---

    cart: [],

    renderProductGrid: () => {
        const grid = document.getElementById('productGrid');
        if (!grid) return;
        grid.innerHTML = '';

        const term = document.getElementById('posSearch')?.value.toLowerCase() || '';
        const filtered = db.inventory.filter(p => p.name.toLowerCase().includes(term) || p.id.includes(term));

        filtered.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.onclick = () => app.addToCart(p);
            card.innerHTML = `
                <h4>${p.name}</h4>
                <span class="stock">${p.qty} un disp.</span>
                <span class="price">${formatCurrency(p.price)}</span>
            `;
            grid.appendChild(card);
        });
    },

    addToCart: (product) => {
        const existing = app.cart.find(item => item.id === product.id);
        if (existing) {
            if (existing.qty >= product.qty) {
                alert("Estoque insuficiente!");
                return;
            }
            existing.qty++;
        } else {
            app.cart.push({ ...product, qty: 1 });
        }
        app.renderCart();
    },

    removeFromCart: (id) => {
        app.cart = app.cart.filter(item => item.id !== id);
        app.renderCart();
    },

    renderCart: () => {
        const container = document.getElementById('cartItems');
        const countSpan = document.getElementById('cartCount');
        const totalSpan = document.getElementById('cartTotal');

        if (!container) return;
        container.innerHTML = '';

        let total = 0;
        let count = 0;

        if (app.cart.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="margin-top: 2rem;">
                    <i class="ph ph-shopping-basket" style="font-size: 2rem;"></i>
                    <p>Carrinho vazio</p>
                </div>`;
        } else {
            app.cart.forEach(item => {
                const itemTotal = item.price * item.qty;
                total += itemTotal;
                count += item.qty;

                const el = document.createElement('div');
                el.className = 'cart-item';
                el.innerHTML = `
                    <div class="cart-item-info">
                        <strong>${item.name}</strong>
                        <small>${item.qty}x ${formatCurrency(item.price)}</small>
                    </div>
                    <div style="display:flex; align-items:center; gap: 10px;">
                        <strong>${formatCurrency(itemTotal)}</strong>
                        <button class="action-btn" onclick="app.removeFromCart('${item.id}')" style="color: var(--danger)"><i class="ph ph-trash"></i></button>
                    </div>
                `;
                container.appendChild(el);
            });
        }

        countSpan.textContent = `${count} itens`;
        totalSpan.textContent = formatCurrency(total);
    },

    checkout: () => {
        if (app.cart.length === 0) {
            alert("Carrinho vazio!");
            return;
        }

        const total = app.cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

        // 1. Create Finance Record
        db.finance.unshift({
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            desc: `Venda PDV - ${app.cart.length} itens`,
            category: 'Vendas',
            type: 'in',
            value: total,
            status: 'paid'
        });

        // 2. Deduct Inventory
        app.cart.forEach(cartItem => {
            const product = db.inventory.find(p => p.id === cartItem.id);
            if (product) {
                product.qty -= cartItem.qty;
            }
        });

        // 3. Clear Cart & Update UI
        app.cart = [];
        app.saveState(); // Persist changes
        app.renderCart();
        app.renderProductGrid(); // Update stock display
        app.renderFinanceTable();
        app.renderInventoryTable();

        // 4. Feedback
        alert(`Venda finalizada com sucesso!\nTotal: ${formatCurrency(total)}\nNota Fiscal (NFC-e) emitida.`);
    },

    // --- Inventory Module ---
    renderInventoryTable: () => {
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        db.inventory.forEach(item => {
            let statusBadge = '<span class="status-badge done">Normal</span>';
            if (item.qty <= item.min) {
                statusBadge = '<span class="status-badge canceled">Baixo</span>';
            }

            const row = `
                <tr>
                    <td>${item.id}</td>
                    <td>${item.name}</td>
                    <td>${item.category}</td>
                    <td>${item.qty} un</td>
                    <td>${formatCurrency(item.price)}</td>
                    <td>${statusBadge}</td>
                    <td><button class="action-btn"><i class="ph ph-pencil"></i></button></td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    },

    // --- Finance Module ---
    renderFinanceTable: () => {
        const tbody = document.getElementById('financeTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        db.finance.forEach(item => {
            const isIn = item.type === 'in';
            const colorClass = isIn ? 'success' : 'danger';
            const icon = isIn ? 'ph-arrow-up-right' : 'ph-arrow-down-right';
            const typeLabel = isIn ? 'Entrada' : 'Saída';

            const statusLabel = item.status === 'paid' ? 'Pago/Recebido' : 'Pendente';
            const statusClass = item.status === 'paid' ? 'done' : 'waiting';

            const row = `
                <tr>
                    <td>${item.date.split('-').reverse().join('/')}</td>
                    <td>${item.desc}</td>
                    <td>${item.category}</td>
                    <td><span style="color: var(--${colorClass}); display: flex; align-items: center; gap: 4px;"><i class="ph ${icon}"></i> ${typeLabel}</span></td>
                    <td style="font-weight: 600;">${formatCurrency(item.value)}</td>
                    <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    },

    // Mock API
    mockSearchPlate: () => {
        const plateInput = document.getElementById('searchPlate');
        const plate = plateInput.value.toUpperCase();

        if (plate.length < 7) return;

        // Visual Feedback for API Call
        plateInput.disabled = true;
        plateInput.style.cursor = 'wait';
        const originalPlaceholder = plateInput.placeholder;
        plateInput.value = "Consultando DETRAN...";

        setTimeout(() => {
            // Mock Database
            const vehicles = {
                'ABC1234': 'Honda Civic 2019 - Prata',
                'XYZ9876': 'Fiat Strada 2021 - Branca',
                'PLK5522': 'VW Gol 1.6 2018 - Preto'
            };

            const result = vehicles[plate.replace('-', '')] || vehicles[plate] || 'Chevrolet Onix 2023 - Prata (Genérico)';

            // Handle result display
            // If called from New OS Modal (auto-fill)
            const osVehicleInput = document.getElementById('osVehicle');
            if (osVehicleInput && document.getElementById('newOSModal').classList.contains('active')) {
                osVehicleInput.value = result;
                if (!document.getElementById('osClient').value) document.getElementById('osClient').value = "Cliente " + plate;
            } else {
                // If called from Top Bar (alert result)
                alert(`Veículo Encontrado:\n${result}\n\nProprietário: João da Silva\nSituação: Regular`);
            }

            // Restore Input
            plateInput.value = "";
            plateInput.placeholder = "Placa consultada";
            plateInput.disabled = false;
            plateInput.style.cursor = 'text';

        }, 1500);
    },

    openNewOSModal: () => {
        document.getElementById('newOSModal').classList.add('active');
    },

    closeNewOSModal: () => {
        document.getElementById('newOSModal').classList.remove('active');
    },

    openPlateModal: () => {
        const plate = prompt("Digite a placa para consultar (Simulação API):", "ABC-1234");
        if (plate) {
            document.getElementById('searchPlate').value = plate;
            app.mockSearchPlate();
        }
    },

    // Tab System for Registration Module
    switchTab: (tabId, btnElement) => {
        const container = btnElement.closest('.card');
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        btnElement.classList.add('active');
        document.getElementById(tabId).classList.add('active');
    },

    saveOS: () => {
        const client = document.getElementById('osClient').value;
        const vehicle = document.getElementById('osVehicle').value;
        const total = parseFloat(document.getElementById('osValue').value) || 0;
        const status = document.getElementById('osStatus').value;
        const desc = document.getElementById('osDescription').value;

        if (!client || !vehicle) {
            alert("Preencha o cliente e o veículo!");
            return;
        }

        const newOS = {
            id: db.os.length > 0 ? db.os[0].id + 1 : 1000,
            client,
            vehicle,
            status,
            total,
            description: desc
        };

        db.os.unshift(newOS);
        app.saveState(); // Persist

        app.renderOSTable();
        app.closeNewOSModal();

        alert("OS Salva com sucesso!");
    },

    // --- System Features ---
    backupSystem: () => {
        const dataStr = JSON.stringify(db, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `rapidauto_backup_${new Date().toISOString().slice(0, 10)}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        alert("Backup realizado com sucesso! O arquivo foi salvo no seu computador.");
    },

    importXML: (input) => {
        if (input.files && input.files[0]) {
            setTimeout(() => {
                alert("Lendo XML da SEFAZ...");
                const newProducts = [
                    { id: '201', name: 'Kit Embreagem LUK', category: 'Transmissão', qty: 5, price: 450.00, cost: 280.00, min: 2 },
                    { id: '202', name: 'Correia Dentada Contitech', category: 'Motor', qty: 10, price: 85.00, cost: 40.00, min: 5 }
                ];

                db.inventory.push(...newProducts);
                app.saveState(); // Persist
                app.renderInventoryTable();

                alert(`Importação Concluída!\nFornecedor: AUTO PEÇAS DISTRIBUIDORA LTDA\nItens Adicionados: 2\nValor Total: R$ 1.800,00`);
                input.value = '';
            }, 1000);
        }
    }
};

document.addEventListener('DOMContentLoaded', app.init);
