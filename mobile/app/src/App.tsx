import { useCallback, useEffect, useState } from 'react'
import { SafeAreaView, View, Text, TouchableOpacity, FlatList, RefreshControl } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AlertItem, getOpenAlerts, acknowledgeAlert, registerPushDevice } from './api'
import { flushOfflineQueue, loadAlertsCache, queueAcknowledge, saveAlertsCache } from './offline'
import { registerForPushNotificationsAsync } from './notifications'

export default function App() {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [isOnline, setIsOnline] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncStatus, setSyncStatus] = useState('idle')

  const loadData = useCallback(async () => {
    setRefreshing(true)
    try {
      if (isOnline) {
        const serverAlerts = await getOpenAlerts()
        setAlerts(serverAlerts)
        await saveAlertsCache(serverAlerts)
      } else {
        const cached = await loadAlertsCache()
        setAlerts(cached as AlertItem[])
      }
    } finally {
      setRefreshing(false)
    }
  }, [isOnline])

  useEffect(() => {
    const unsub = NetInfo.addEventListener(async (state) => {
      const online = Boolean(state.isConnected)
      setIsOnline(online)
      if (online) {
        setSyncStatus('syncing')
        const result = await flushOfflineQueue()
        setSyncStatus(`synced:${result.processed},failed:${result.failed}`)
        await loadData()
      }
    })
    return () => unsub()
  }, [loadData])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    ;(async () => {
      const token = await registerForPushNotificationsAsync()
      if (!token) return
      const userId = (await AsyncStorage.getItem('user_id')) || 'mobile-user'
      await registerPushDevice(userId, 'expo', token)
    })()
  }, [])

  const onAcknowledge = async (alertId: string) => {
    if (isOnline) {
      await acknowledgeAlert(alertId)
      await loadData()
      return
    }

    await queueAcknowledge(alertId)
    setAlerts((prev) => prev.filter((a) => a.alert_id !== alertId))
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f6f7fb' }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>OGIM Mobile</Text>
        <Text style={{ marginTop: 6, color: isOnline ? '#14833b' : '#b15206' }}>
          {isOnline ? 'Online' : 'Offline Mode فعال است'}
        </Text>
        <Text style={{ marginTop: 4, color: '#666' }}>Sync: {syncStatus}</Text>
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.alert_id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#777' }}>No open alerts</Text>}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <Text style={{ fontWeight: '700' }}>{item.well_name}</Text>
            <Text style={{ marginTop: 4 }}>{item.message}</Text>
            <Text style={{ marginTop: 4, color: '#666' }}>Severity: {item.severity}</Text>
            <TouchableOpacity
              style={{ marginTop: 10, backgroundColor: '#1967d2', padding: 10, borderRadius: 8 }}
              onPress={() => onAcknowledge(item.alert_id)}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
                {isOnline ? 'Acknowledge' : 'Queue Acknowledge (Offline)'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  )
}

