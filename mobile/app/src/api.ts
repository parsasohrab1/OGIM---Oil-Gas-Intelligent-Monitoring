import axios from 'axios'
import Constants from 'expo-constants'
import AsyncStorage from '@react-native-async-storage/async-storage'

const baseURL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:8000'

export const api = axios.create({
  baseURL,
  timeout: 15000
})

export type AlertItem = {
  alert_id: string
  timestamp: string
  severity: string
  status: string
  well_name: string
  message: string
  rule_name: string
}

export async function getOpenAlerts(): Promise<AlertItem[]> {
  const token = (await AsyncStorage.getItem('access_token')) || ''
  const response = await api.get('/api/alert/alerts', {
    params: { status: 'open', limit: 50 },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  })
  return response.data?.alerts || []
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  const token = (await AsyncStorage.getItem('access_token')) || ''
  await api.post(`/api/alert/alerts/${alertId}/acknowledge`, null, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  })
}

export async function registerPushDevice(userId: string, platform: string, deviceToken: string): Promise<void> {
  const token = (await AsyncStorage.getItem('access_token')) || ''
  await api.post(
    '/api/alert/notifications/devices/register',
    { user_id: userId, platform, device_token: deviceToken },
    { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
  )
}

