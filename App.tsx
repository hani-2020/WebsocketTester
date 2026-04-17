import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import io from 'socket.io-client';

// React Native sometimes lacks navigator.userAgent which socket.io 2.x requires
if (!window.navigator) {
  (window as any).navigator = {};
}
if (!window.navigator.userAgent) {
  window.navigator.userAgent = 'react-native';
}

type LogType = 'info' | 'success' | 'error' | 'warn';

interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: LogType;
}

export default function App() {
  const [mode, setMode] = useState<'io' | 'ws'>('io');
  const [status, setStatus] = useState<'Disconnected' | 'Connecting' | 'Connected'>('Disconnected');
  const [url, setUrl] = useState('wss://pmt-gows.retyn.dev');
  const [path, setPath] = useState('/ws/chat/');
  const [queryParams, setQueryParams] = useState('{"user_id":"6","csrf":"anything","mobile_view":"true"}');
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const socketRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const addLog = (message: string, type: LogType = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLogs(prev => [...prev, { id: Math.random().toString(), time, message, type }]);
  };

  const handleConnect = () => {
    if (status !== 'Disconnected') return;
    setStatus('Connecting');
    addLog(`Initiating ${mode === 'io' ? 'Socket.io' : 'Raw WS'} connection...`, 'info');

    let queryObj = {};
    try {
      if (queryParams.trim()) {
        queryObj = JSON.parse(queryParams.trim());
      }
    } catch (e) {
      addLog('Invalid JSON in Query Params. Using empty object.', 'warn');
    }

    if (mode === 'io') {
      try {
        const parsedUrl = url.replace('wss://', 'https://').replace('ws://', 'http://');
        const origin = url.split('/').slice(0,3).join('/');
        
        socketRef.current = io(parsedUrl, {
          path: path || '/socket.io',
          query: queryObj,
          transports: ['websocket'],
          jsonp: false,
          forceNew: true,
          extraHeaders: {
            Origin: origin,
            'User-Agent': window.navigator.userAgent
          }
        });

        socketRef.current.on('connect', () => {
          setStatus('Connected');
          addLog('Socket.io connected successfully', 'success');
        });

        socketRef.current.on('connect_error', (err: any) => {
          setStatus('Disconnected');
          addLog(`Connect Error: ${err.message || err}`, 'error');
        });

        socketRef.current.on('disconnect', (reason: string) => {
          setStatus('Disconnected');
          addLog(`Disconnected: ${reason}`, 'error');
        });

        socketRef.current.on('error', (err: any) => {
          addLog(`Error: ${JSON.stringify(err)}`, 'error');
        });

        // Catch all events pseudo-code for socket.io client 2.x
        const originalOnEvent = socketRef.current.onevent;
        socketRef.current.onevent = function (...args: any[]) {
          const packet = args[0];
          const eventName = packet.data[0];
          const data = packet.data[1];
          addLog(`[${eventName}] ${JSON.stringify(data)}`, 'info');
          if (originalOnEvent) {
             originalOnEvent.apply(socketRef.current, args);
          }
        };

      } catch (err: any) {
        setStatus('Disconnected');
        addLog(`Failed to initialize Socket.io client: ${err.message || err}`, 'error');
      }
    } else {
      let finalUrl = url;
      if (path && !finalUrl.endsWith('/')) {
        finalUrl += finalUrl.includes('?') ? '' : path;
      }
      try {
        const queryStr = Object.entries(queryObj)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
          .join('&');
        
        if (queryStr) {
          finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryStr;
        }

        wsRef.current = new WebSocket(finalUrl);

        wsRef.current.onopen = () => {
          setStatus('Connected');
          addLog('Raw WebSocket connected successfully', 'success');
        };

        wsRef.current.onmessage = (e) => {
          addLog(`Received: ${e.data}`, 'info');
        };

        wsRef.current.onerror = (e) => {
          addLog(`WebSocket Error occurred.`, 'error');
        };

        wsRef.current.onclose = (e) => {
          setStatus('Disconnected');
          addLog(`WebSocket connection closed. Code: ${e.code}, Reason: ${e.reason || 'None'}`, 'error');
        };
      } catch (err: any) {
        setStatus('Disconnected');
        addLog(`Exceptions during WebSocket initialization: ${err.message || err}`, 'error');
      }
    }
  };

  const handleDisconnect = () => {
    if (mode === 'io' && socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    } else if (mode === 'ws' && wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('Disconnected');
    addLog('Disconnected by user', 'warn');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView 
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Socket Tester</Text>
          <View style={[
            styles.statusBadge, 
            status === 'Connected' ? styles.statusBadgeConnected : 
            status === 'Connecting' ? styles.statusBadgeConnecting : 
            styles.statusBadgeDisconnected
          ]}>
            <Text style={[
              styles.statusText,
              status === 'Connected' ? styles.statusTextConnected : 
              status === 'Connecting' ? styles.statusTextConnecting : 
              styles.statusTextDisconnected
            ]}>{status}</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity 
            style={[styles.tab, mode === 'io' && styles.tabActive]} 
            onPress={() => setMode('io')}
          >
            <Text style={[styles.tabText, mode === 'io' && styles.tabTextActive]}>Socket.io</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, mode === 'ws' && styles.tabActive]} 
            onPress={() => setMode('ws')}
          >
            <Text style={[styles.tabText, mode === 'ws' && styles.tabTextActive]}>Raw WS</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controls}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>URL</Text>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          {mode === 'io' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Path</Text>
              <TextInput
                style={styles.input}
                value={path}
                onChangeText={setPath}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Query Params (JSON)</Text>
            <TextInput
              style={styles.input}
              value={queryParams}
              onChangeText={setQueryParams}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.button, styles.primaryBtn]} 
              onPress={handleConnect}
              disabled={status !== 'Disconnected'}
            >
              {status === 'Connecting' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Connect</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.secondaryBtn]} 
              onPress={handleDisconnect}
              disabled={status === 'Disconnected'}
            >
              <Text style={styles.secondaryBtnText}>Disconnect</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.secondaryBtn]} 
              onPress={() => setLogs([])}
            >
              <Text style={styles.secondaryBtnText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.logContainer}>
          <ScrollView 
            ref={scrollViewRef}
            contentContainerStyle={styles.logScrollContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {logs.map((log) => (
              <View key={log.id} style={styles.logEntry}>
                <Text style={styles.logTime}>{log.time}</Text>
                <Text style={[
                  styles.logMessage,
                  log.type === 'success' && styles.logSuccess,
                  log.type === 'error' && styles.logError,
                  log.type === 'warn' && styles.logWarn,
                ]}>
                  {log.type === 'error' ? '✖ ' : log.type === 'success' ? '✔ ' : ''}
                  {log.message}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  keyboardAvoiding: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: '#2c2c2e',
  },
  statusBadgeConnected: {
    backgroundColor: 'rgba(50, 215, 75, 0.2)',
  },
  statusBadgeConnecting: {
    backgroundColor: 'rgba(255, 159, 10, 0.2)',
  },
  statusBadgeDisconnected: {
    backgroundColor: 'rgba(255, 69, 58, 0.2)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8e8e93',
  },
  statusTextConnected: {
    color: '#32d74b',
  },
  statusTextConnecting: {
    color: '#ff9f0a',
  },
  statusTextDisconnected: {
    color: '#ff453a',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    padding: 2,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#48484a',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  controls: {
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    color: '#8e8e93',
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#2c2c2e',
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    fontSize: 16,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  primaryBtn: {
    backgroundColor: '#007AFF',
  },
  secondaryBtn: {
    backgroundColor: '#2c2c2e',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    marginBottom: 20,
    overflow: 'hidden',
  },
  logScrollContent: {
    padding: 12,
  },
  logEntry: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  logTime: {
    color: '#8e8e93',
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  logMessage: {
    color: '#ffffff',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  logSuccess: {
    color: '#32d74b',
  },
  logError: {
    color: '#ff453a',
  },
  logWarn: {
    color: '#ff9f0a',
  },
});
