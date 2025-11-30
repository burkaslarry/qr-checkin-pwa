const app = {
    state: {
        socket: null,
        scanner: null,
        currentEvent: null, 
        records: []
    },

    getApiUrl(path) {
        const base = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : '';
        return `${base}${path}`;
    },

    // --- Init Methods ---

    initGuest() {
        this.startScanner('guest-reader', 'guest');
        document.getElementById('guest-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCheckIn('guest');
        });
    },

    initMember() {
        this.fetchMembers();
        // this.startScanner('member-reader', 'member'); // Scanner disabled for now
        document.getElementById('member-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCheckIn('member');
        });
    },

    initAdmin() {
        this.connectWebSocket();
        this.fetchRecords();
        this.fetchMembersForAdmin(); // Fetch members for dropdown
        this.bindAdminEvents();
        // Set default date
        const dateInput = document.getElementById('event-date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
    },

    bindAdminEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tab) {
                btn.addEventListener('click', (e) => {
                    const tabId = e.target.dataset.tab;
                    this.switchAdminTab(tabId);
                });
            }
        });

        // Forms
        const qrForm = document.getElementById('qr-generator-form');
        if (qrForm) {
            qrForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.generateEventQR();
            });
        }

        // Manual Forms
        const internalForm = document.getElementById('manual-entry-form-internal');
        if (internalForm) {
            internalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleManualEntry('internal');
            });
        }

        const externalForm = document.getElementById('manual-entry-form-external');
        if (externalForm) {
            externalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleManualEntry('external');
            });
        }
    },

    switchManualTab(type) {
        // Toggle Buttons
        const buttons = document.querySelectorAll('#admin-manual .tab-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        if (event && event.target) event.target.classList.add('active');

        // Toggle Content
        document.getElementById('manual-internal').style.display = type === 'internal' ? 'block' : 'none';
        document.getElementById('manual-external').style.display = type === 'external' ? 'block' : 'none';
    },

    async fetchMembersForAdmin() {
        try {
            const response = await fetch(this.getApiUrl('/api/members'));
            const data = await response.json();
            const select = document.getElementById('manual-member-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">-- Select Member --</option>';
            data.members.forEach(member => {
                const option = document.createElement('option');
                option.value = member;
                option.textContent = member;
                select.appendChild(option);
            });
        } catch (err) {
            console.error('Failed to load members for admin:', err);
        }
    },


    switchAdminTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
    },

    // --- Shared Logic ---

    async fetchMembers() {
        try {
            const response = await fetch(this.getApiUrl('/api/members'));
            const data = await response.json();
            const select = document.getElementById('member-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">-- Select your name --</option>';
            data.members.forEach(member => {
                const option = document.createElement('option');
                option.value = member;
                option.textContent = member;
                select.appendChild(option);
            });
        } catch (err) {
            console.error('Failed to load members:', err);
        }
    },

    // --- Scanner Logic ---
    startScanner(elementId, type) {
        if (this.state.scanner) return;
        const elem = document.getElementById(elementId);
        if (!elem) return;

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        this.state.scanner = new Html5Qrcode(elementId);
        
        this.state.scanner.start(
            { facingMode: "environment" },
            config,
            (decodedText, decodedResult) => {
                this.onScanSuccess(decodedText, type);
            },
            (errorMessage) => { }
        ).catch(err => {
            console.error('Error starting scanner', err);
            // alert('Camera access required for scanning.');
        });
    },

    stopScanner() {
        if (this.state.scanner) {
            this.state.scanner.stop().then(() => {
                this.state.scanner.clear();
                this.state.scanner = null;
            }).catch(err => console.error(err));
        }
    },

    onScanSuccess(decodedText, type) {
        try {
            const data = JSON.parse(decodedText);
            if (data.eventName && data.date) {
                this.state.currentEvent = data;
                this.stopScanner();
                
                if (type === 'guest') {
                    document.getElementById('guest-scanner-container').classList.add('hidden');
                    document.getElementById('guest-form').classList.remove('hidden');
                    document.getElementById('guest-event-name').textContent = data.eventName;
                } else if (type === 'member') {
                    document.getElementById('member-scanner-container').classList.add('hidden');
                    document.getElementById('member-form').classList.remove('hidden');
                    document.getElementById('member-event-name').textContent = data.eventName;
                }
            } else {
                alert('Invalid Event QR Code');
            }
        } catch (e) {
            console.error(e);
            alert('Invalid QR Code Format');
        }
    },

    // --- Check-in Logic ---
    async handleCheckIn(type) {
        let name;
        if (type === 'guest') {
            name = document.getElementById('guest-name').value;
        } else {
            name = document.getElementById('member-select').value;
        }

        if (!name) return;

        const payload = {
            name: name,
            type: type, 
            currentTime: new Date().toISOString()
        };

        try {
            const response = await fetch(this.getApiUrl('/api/checkin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('Check-in Successful! Welcome ' + name);
                window.location.href = '/index.html';
            } else {
                alert('Check-in failed. Please try again.');
            }
        } catch (err) {
            alert('Network error: ' + err.message);
        }
    },

    async handleManualEntry(entryType) {
        let name, type;
        
        if (entryType === 'internal') {
            name = document.getElementById('manual-member-select').value;
            type = 'member';
        } else {
            name = document.getElementById('manual-guest-name').value;
            type = 'guest';
        }
        
        if (!name) return;

        const payload = {
            name: name,
            type: type,
            currentTime: new Date().toISOString()
        };

        try {
            const response = await fetch(this.getApiUrl('/api/checkin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('Manual entry added');
                if (entryType === 'internal') {
                    document.getElementById('manual-entry-form-internal').reset();
                } else {
                    document.getElementById('manual-entry-form-external').reset();
                }
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
    },

    // --- Admin Logic ---
    generateEventQR() {
        const name = document.getElementById('event-name').value;
        const date = document.getElementById('event-date').value;

        if (!name || !date) return;

        fetch(this.getApiUrl('/api/events'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, date: date })
        }).then(res => {
            if (res.ok) console.log('Event registered');
        }).catch(err => console.error('Error registering event:', err));

        const qrData = {
            eventName: name,
            date: date,
            id: Date.now().toString()
        };

        const canvas = document.getElementById('qr-canvas');
        canvas.innerHTML = '';
        
        new QRCode(canvas, {
            text: JSON.stringify(qrData),
            width: 300,
            height: 300
        });

        document.getElementById('qr-preview').classList.remove('hidden');
    },

    downloadQR() {
        const canvas = document.querySelector('#qr-canvas canvas');
        const link = document.createElement('a');
        link.href = canvas.toDataURL("image/png");
        link.download = 'event-qr.png';
        link.click();
    },

    updateTime() {
        const now = new Date().toLocaleString();
        const internalTime = document.getElementById('manual-time-internal');
        const externalTime = document.getElementById('manual-time-external');
        
        if (internalTime) internalTime.value = now;
        if (externalTime) externalTime.value = now;
    },

    // --- WebSocket & Records ---
    connectWebSocket() {
        let wsUrl;
        if (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) {
            const base = CONFIG.API_BASE_URL;
            // Handle both http/https and potential trailing slashes
            const url = new URL(base.startsWith('http') ? base : `http://${base}`);
            url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
            url.pathname = '/ws/records';
            wsUrl = url.toString();
        } else {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            wsUrl = `${protocol}//${window.location.host}/ws/records`;
        }
        
        this.state.socket = new WebSocket(wsUrl);
        
        this.state.socket.onopen = () => {
            const status = document.getElementById('connection-status');
            if(status) {
                status.textContent = 'Live';
                status.className = 'badge badge-yes';
            }
        };
        
        this.state.socket.onclose = () => {
            const status = document.getElementById('connection-status');
            if(status) {
                status.textContent = 'Disconnected';
                status.className = 'badge badge-no';
            }
            setTimeout(() => this.connectWebSocket(), 5000);
        };

        this.state.socket.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'new_checkin') {
                this.addRecordToTable(msg.data);
                this.updateStats();
            }
        };
    },

    async fetchRecords() {
        try {
            const response = await fetch(this.getApiUrl('/api/records'));
            const data = await response.json();
            this.state.records = data.records;
            this.renderTable();
            this.updateStats();
        } catch (err) {
            console.error(err);
        }
    },

    renderTable() {
        const tbody = document.getElementById('records-tbody');
        if (!tbody) return;

        if (this.state.records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No records yet</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        [...this.state.records].reverse().forEach(record => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${record.name}</td>
                <td><span class="badge ${record.type === 'guest' ? 'badge-no' : 'badge-yes'}">${record.type.toUpperCase()}</span></td>
                <td>${new Date(record.timestamp).toLocaleString()}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    addRecordToTable(record) {
        this.state.records.push(record);
        this.renderTable();
    },

    updateStats() {
        const total = this.state.records.length;
        const guests = this.state.records.filter(r => r.type === 'guest').length;
        const members = total - guests;

        const totalEl = document.getElementById('total-count');
        const guestEl = document.getElementById('guest-count');
        const memberEl = document.getElementById('member-count');
        
        if (totalEl) totalEl.textContent = total;
        if (guestEl) guestEl.textContent = guests;
        if (memberEl) memberEl.textContent = members;
    },
    
    exportCSV() {
        window.location.href = this.getApiUrl('/api/export');
    }
};
