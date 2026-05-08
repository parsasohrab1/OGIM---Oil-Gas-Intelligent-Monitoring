# OGIM Mobile (Expo)

Minimal mobile client with:

- Push notifications via Expo tokens and `alert-service`
- Offline mode with cached alerts
- Offline action queue (acknowledge alerts when connection restores)

## Run

```bash
cd mobile/app
npm install
npm start
```

Set API URL in `app.json` (`expo.extra.apiBaseUrl`), for example:

- Android emulator: `http://10.0.2.2:8000`
- iOS simulator: `http://localhost:8000`
- Real device: `http://<your-lan-ip>:8000`

## Backend endpoints used

- `POST /api/alert/notifications/devices/register`
- `POST /api/alert/notifications/devices/unregister`
- `GET /api/alert/alerts`
- `POST /api/alert/alerts/{alert_id}/acknowledge`

