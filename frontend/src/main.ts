import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'qrcode';
import { getApiUrl, getWsUrl } from './config';
import { AppState, CheckInPayload, MemberResponse, RecordsResponse, WebSocketMessage } from './types';
import '../static/css/style.css'; // Import styles for Vite to process

class App {
    state: AppState = {
        socket: null,
        scanner: null,
        currentEvent: null,
        records: []
    };

    constructor() {
        this.route();
    }

    route() {
        const path = window.location.pathname;
        if (path.includes('guest.html')) {
            this.initGuest();
        } else if (path.includes('member.html')) {
            this.initMember();
        } else if (path.includes('admin.html')) {
            this.initAdmin();
        }
    }

    // --- Init Methods ---

    initGuest() {
        this.startScanner('guest-reader', 'guest');
        document.getElementById('guest-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCheckIn('guest');
        });
    }

    initMember() {
        this.fetchMembers();
        // this.startScanner('member-reader', 'member'); // Scanner disabled for now
        document.getElementById('member-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCheckIn('member');
        });
    }

    initAdmin() {
        this.connectWebSocket();
        this.fetchRecords();
        this.fetchMembersForAdmin();
        this.bindAdminEvents();
        
        const dateInput = document.getElementById('event-date') as HTMLInputElement;
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);

        // Expose functions for inline HTML calls
        (window as any).app = this;
    }

    bindAdminEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if ((btn as HTMLElement).dataset.tab) {
                btn.addEventListener('click', (e) => {
                    const target = e.target as HTMLElement;
                    const tabId = target.dataset.tab;
                    if (tabId) this.switchAdminTab(tabId);
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
    }

    switchManualTab(type: 'internal' | 'external') {
        // Toggle Buttons
        const buttons = document.querySelectorAll('#admin-manual .tab-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        // Find the button that was clicked - this is tricky if called from inline onclick without event passing
        // But the HTML onclick is `app.switchManualTab('internal')`.
        // We can manually highlight based on type.
        // Or simpler: The inline click sets the class. 
        // Let's iterate and find the one with the matching onclick? No.
        
        // Better approach: Rely on the caller to pass the event or just querySelect the specific buttons.
        // Current HTML: <button class="tab-btn active" onclick="app.switchManualTab('internal')">
        // We can remove 'active' from all and add to the one matching the type.
        
        // Since we are rewriting, let's just highlight based on index or text.
        // Assuming order: 0 = internal, 1 = external
        if (type === 'internal') {
             buttons[0]?.classList.add('active');
        } else {
             buttons[1]?.classList.add('active');
        }

        // Toggle Content
        const internalDiv = document.getElementById('manual-internal');
        const externalDiv = document.getElementById('manual-external');
        if (internalDiv) internalDiv.style.display = type === 'internal' ? 'block' : 'none';
        if (externalDiv) externalDiv.style.display = type === 'external' ? 'block' : 'none';
    }

    async fetchMembersForAdmin() {
        try {
            const response = await fetch(getApiUrl('/api/members'));
            const data: MemberResponse = await response.json();
            const select = document.getElementById('manual-member-select') as HTMLSelectElement;
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
    }


    switchAdminTab(tabId: string) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        const tabBtn = document.querySelector(`[data-tab="${tabId}"]`);
        if (tabBtn) tabBtn.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        const tabContent = document.getElementById(tabId);
        if (tabContent) tabContent.classList.add('active');
    }

    // --- Shared Logic ---

    async fetchMembers() {
        try {
            const response = await fetch(getApiUrl('/api/members'));
            const data: MemberResponse = await response.json();
            const select = document.getElementById('member-select') as HTMLSelectElement;
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
    }

    // --- Scanner Logic ---
    startScanner(elementId: string, type: 'guest' | 'member') {
        if (this.state.scanner) return;
        const elem = document.getElementById(elementId);
        if (!elem) return;

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        this.state.scanner = new Html5Qrcode(elementId);
        
        this.state.scanner.start(
            { facingMode: "environment" },
            config,
            (decodedText: string) => {
                this.onScanSuccess(decodedText, type);
            },
            (_errorMessage: string) => { 
                // console.warn(errorMessage); 
            }
        ).catch((err: any) => {
            console.error('Error starting scanner', err);
        });
    }

    stopScanner() {
        if (this.state.scanner) {
            this.state.scanner.stop().then(() => {
                this.state.scanner.clear();
                this.state.scanner = null;
            }).catch((err: any) => console.error(err));
        }
    }

    onScanSuccess(decodedText: string, type: 'guest' | 'member') {
        try {
            const data = JSON.parse(decodedText);
            if (data.eventName && data.date) {
                this.state.currentEvent = data;
                this.stopScanner();
                
                if (type === 'guest') {
                    document.getElementById('guest-scanner-container')?.classList.add('hidden');
                    document.getElementById('guest-form')?.classList.remove('hidden');
                    const eventNameEl = document.getElementById('guest-event-name');
                    if (eventNameEl) eventNameEl.textContent = data.eventName;
                } else if (type === 'member') {
                    document.getElementById('member-scanner-container')?.classList.add('hidden');
                    document.getElementById('member-form')?.classList.remove('hidden');
                    const eventNameEl = document.getElementById('member-event-name');
                    if (eventNameEl) eventNameEl.textContent = data.eventName;
                }
            } else {
                alert('Invalid Event QR Code');
            }
        } catch (e) {
            console.error(e);
            alert('Invalid QR Code Format');
        }
    }

    // --- Check-in Logic ---
    async handleCheckIn(type: 'guest' | 'member') {
        let name: string = '';
        if (type === 'guest') {
            name = (document.getElementById('guest-name') as HTMLInputElement).value;
        } else {
            name = (document.getElementById('member-select') as HTMLSelectElement).value;
        }

        if (!name) return;

        const payload: CheckInPayload = {
            name: name,
            type: type, 
            currentTime: new Date().toISOString()
        };

        try {
            const response = await fetch(getApiUrl('/api/checkin'), {
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
        } catch (err: any) {
            alert('Network error: ' + err.message);
        }
    }

    async handleManualEntry(entryType: 'internal' | 'external') {
        let name = '';
        let type: 'member' | 'guest';
        
        if (entryType === 'internal') {
            name = (document.getElementById('manual-member-select') as HTMLSelectElement).value;
            type = 'member';
        } else {
            name = (document.getElementById('manual-guest-name') as HTMLInputElement).value;
            type = 'guest';
        }
        
        if (!name) return;

        const payload: CheckInPayload = {
            name: name,
            type: type,
            currentTime: new Date().toISOString()
        };

        try {
            const response = await fetch(getApiUrl('/api/checkin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('Manual entry added');
                if (entryType === 'internal') {
                    (document.getElementById('manual-entry-form-internal') as HTMLFormElement).reset();
                } else {
                    (document.getElementById('manual-entry-form-external') as HTMLFormElement).reset();
                }
            }
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    }

    // --- Admin Logic ---
    generateEventQR() {
        const name = (document.getElementById('event-name') as HTMLInputElement).value;
        const date = (document.getElementById('event-date') as HTMLInputElement).value;

        if (!name || !date) return;

        fetch(getApiUrl('/api/events'), {
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

        const canvasContainer = document.getElementById('qr-canvas');
        if (canvasContainer) {
            canvasContainer.innerHTML = '';
            const canvas = document.createElement('canvas');
            canvasContainer.appendChild(canvas);
            QRCode.toCanvas(canvas, JSON.stringify(qrData), { width: 300 }, (err: any) => {
               if(err) console.error(err);
            });
        }

        document.getElementById('qr-preview')?.classList.remove('hidden');
    }

    downloadQR() {
        const canvas = document.querySelector('#qr-canvas canvas') as HTMLCanvasElement;
        if (!canvas) return;
        const link = document.createElement('a');
        link.href = canvas.toDataURL("image/png");
        link.download = 'event-qr.png';
        link.click();
    }

    updateTime() {
        const now = new Date().toLocaleString();
        const internalTime = document.getElementById('manual-time-internal') as HTMLInputElement;
        const externalTime = document.getElementById('manual-time-external') as HTMLInputElement;
        
        if (internalTime) internalTime.value = now;
        if (externalTime) externalTime.value = now;
    }

    // --- WebSocket & Records ---
    connectWebSocket() {
        const wsUrl = getWsUrl();
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

        this.state.socket.onmessage = (event: MessageEvent) => {
            const msg: WebSocketMessage = JSON.parse(event.data);
            if (msg.type === 'new_checkin') {
                this.addRecordToTable(msg.data);
                this.updateStats();
            }
        };
    }

    async fetchRecords() {
        try {
            const response = await fetch(getApiUrl('/api/records'));
            const data: RecordsResponse = await response.json();
            this.state.records = data.records;
            this.renderTable();
            this.updateStats();
        } catch (err) {
            console.error(err);
        }
    }

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
    }

    addRecordToTable(record: any) {
        this.state.records.push(record);
        this.renderTable();
    }

    updateStats() {
        const total = this.state.records.length;
        const guests = this.state.records.filter(r => r.type === 'guest').length;
        const members = total - guests;

        const totalEl = document.getElementById('total-count');
        const guestEl = document.getElementById('guest-count');
        const memberEl = document.getElementById('member-count');
        
        if (totalEl) totalEl.textContent = total.toString();
        if (guestEl) guestEl.textContent = guests.toString();
        if (memberEl) memberEl.textContent = members.toString();
    }
    
    exportCSV() {
        window.location.href = getApiUrl('/api/export');
    }
}

new App();

