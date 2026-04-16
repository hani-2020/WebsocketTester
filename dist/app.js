let mode = 'io';
let socket = null;
let rawWs = null;

const logEl = document.getElementById('log');
const statusEl = document.getElementById('status');
const urlEl = document.getElementById('url');
const pathEl = document.getElementById('path');
const queryEl = document.getElementById('query');
const pathGroup = document.getElementById('path-group');

function setMode(newMode) {
    mode = newMode;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    if (mode === 'ws') {
        pathGroup.style.display = 'none';
        if (urlEl.value.endsWith('/')) {
            // suggest full URL for WS
        }
    } else {
        pathGroup.style.display = 'flex';
    }
    
    log('SYSTEM', 'info', `Switched to ${mode.toUpperCase()} mode`);
}

function log(icon, type, ...msg) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    
    const ts = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const icons = {
        'CONNECT': '🔌',
        'SUCCESS': '✅',
        'ERROR': '❌',
        'MESSAGE': '📩',
        'SYSTEM': '⚙️',
        'PING': '🏓',
        'CLOSE': '🚪'
    };

    const typeClass = {
        'info': 'log-info',
        'success': 'log-success',
        'error': 'log-error',
        'warn': 'log-warn',
        'dim': 'log-dim'
    }[type] || 'log-info';

    entry.innerHTML = `
        <span class="log-ts">${ts}</span>
        <span class="log-icon">${icons[icon] || icon}</span>
        <span class="${typeClass}">${msg.join(' ')}</span>
    `;
    
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
}

function clearLog() {
    logEl.innerHTML = '';
}

function getQuery() {
    try {
        return JSON.parse(queryEl.value);
    } catch (e) {
        log('SYSTEM', 'error', 'Invalid Query JSON. Using empty object.');
        return {};
    }
}

function updateStatus(connected) {
    if (connected) {
        statusEl.textContent = 'Connected';
        statusEl.className = 'status-badge connected';
    } else {
        statusEl.textContent = 'Disconnected';
        statusEl.className = 'status-badge disconnected';
    }
}

function connect() {
    disconnect();
    const url = urlEl.value;
    const query = getQuery();

    log('CONNECT', 'info', `Connecting to ${url}...`);

    if (mode === 'io') {
        const path = pathEl.value;
        log('SYSTEM', 'dim', `Path: ${path}, Query: ${JSON.stringify(query)}`);
        
        socket = io(url, {
            path: path,
            transports: ['websocket'],
            query: query
        });

        socket.on('connect', () => {
            log('SUCCESS', 'success', 'Socket.io Connected');
            updateStatus(true);
        });

        socket.on('message', (data) => {
            log('MESSAGE', 'info', typeof data === 'object' ? JSON.stringify(data) : data);
        });

        socket.on('connect_error', (err) => {
            log('ERROR', 'error', `Connect Error: ${err.message}`);
            updateStatus(false);
        });

        socket.on('disconnect', (reason) => {
            log('CLOSE', 'warn', `Disconnected: ${reason}`);
            updateStatus(false);
        });

    } else {
        // Raw WS
        const queryString = new URLSearchParams(query).toString();
        const fullUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
        log('SYSTEM', 'dim', `Full URL: ${fullUrl}`);
        
        try {
            rawWs = new WebSocket(fullUrl);

            rawWs.onopen = () => {
                log('SUCCESS', 'success', 'WebSocket Connected');
                updateStatus(true);
            };

            rawWs.onmessage = (event) => {
                log('MESSAGE', 'info', event.data);
            };

            rawWs.onerror = (err) => {
                log('ERROR', 'error', 'WebSocket Error');
                updateStatus(false);
            };

            rawWs.onclose = (event) => {
                log('CLOSE', 'warn', `Closed: ${event.code} ${event.reason}`);
                updateStatus(false);
            };
        } catch (e) {
            log('ERROR', 'error', `Exception: ${e.message}`);
        }
    }
}

function disconnect() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    if (rawWs) {
        rawWs.close();
        rawWs = null;
    }
    updateStatus(false);
}

// Handle iOS safe areas and logs
window.addEventListener('load', () => {
    log('SYSTEM', 'info', 'App initialized. Ready to test.');
    log('SYSTEM', 'dim', `User Agent: ${navigator.userAgent}`);
});
