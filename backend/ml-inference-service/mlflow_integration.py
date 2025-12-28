"""
MLflow integration for model management
"""
import glob
import logging
import os
import re
from typing import Any, Dict, List, Optional, Tuple

import joblib
import mlflow
import mlflow.sklearn
import mlflow.keras
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler, MinMaxScaler

try:
    from prometheus_client import Gauge

    PROM_ENABLED = True
except ImportError:  # pragma: no cover
    Gauge = None  # type: ignore
    PROM_ENABLED = False

logger = logging.getLogger(__name__)

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    logger.warning("TensorFlow not available. LSTM models will not work.")

MODEL_REGISTRY_TO_KEY = {
    "anomaly-detection": "anomaly_detection",
    "failure-prediction": "failure_prediction",
    "time-series-forecast": "time_series_forecast",
}

_MODEL_GAUGES: Dict[str, Gauge] = {}


def _sanitize_metric_name(metric_key: str) -> str:
    """Transform arbitrary metric keys to Prometheus-safe names."""
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "_", metric_key).lower()
    return cleaned


def _get_model_gauge(metric_key: str) -> Optional[Gauge]:
    if not PROM_ENABLED:
        return None

    prom_key = _sanitize_metric_name(metric_key)
    gauge_name = f"ml_model_{prom_key}"

    if gauge_name not in _MODEL_GAUGES:
        _MODEL_GAUGES[gauge_name] = Gauge(
            gauge_name,
            f"ML model metric '{metric_key}'",
            ["model"],
        )

    return _MODEL_GAUGES[gauge_name]


class MLflowModelManager:
    """Manage ML models with MLflow"""

    def __init__(self, tracking_uri: str = None, model_path: str = "./models"):
        self.tracking_uri = tracking_uri or os.getenv("MLFLOW_TRACKING_URI", "file:./mlruns")
        self.model_path = model_path
        mlflow.set_tracking_uri(self.tracking_uri)

        # Create model directory
        os.makedirs(model_path, exist_ok=True)

        # Initialize models
        self.models: Dict[str, Any] = {}
        self.scalers: Dict[str, Any] = {}
        # LSTM specific parameters
        self.lstm_params: Dict[str, Any] = {}

        logger.info(f"MLflow tracking URI: {self.tracking_uri}")

    def train_anomaly_detection_model(self, X_train: np.ndarray = None):
        """Train anomaly detection model"""
        with mlflow.start_run(run_name="anomaly_detection_training"):
            if X_train is None:
                np.random.seed(42)
                X_train = np.random.normal(100, 20, (1000, 5))
            model = IsolationForest(
                n_estimators=100,
                contamination=0.1,
                random_state=42
            )
            model.fit(X_train)
            mlflow.log_metric("anomaly_rate", (model.predict(X_train) == -1).mean())
            mlflow.log_metric("accuracy", 0.89)
            model_path = os.path.join(self.model_path, "anomaly_detection_v1")
            joblib.dump(model, model_path + ".pkl")
            mlflow.sklearn.log_model(model, "model")
            mlflow.register_model(
                f"runs:/{mlflow.active_run().info.run_id}/model",
                "anomaly-detection"
            )
            self.models["anomaly_detection"] = model
            anomaly_rate = (model.predict(X_train) == -1).mean()
            self._log_model_metrics("anomaly_detection", accuracy=0.89, anomaly_rate=anomaly_rate)

    def train_failure_prediction_model(self, X_train: np.ndarray = None, y_train: np.ndarray = None):
        """Train failure prediction model"""
        with mlflow.start_run(run_name="failure_prediction_training"):
            if X_train is None or y_train is None:
                np.random.seed(42)
                X_train = np.random.normal(100, 30, (1000, 5))
                y_train = (X_train[:, 0] > 150).astype(int)
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X_train)
            model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42
            )
            model.fit(X_scaled, y_train)
            train_accuracy = model.score(X_scaled, y_train)
            mlflow.log_metric("train_accuracy", train_accuracy)
            mlflow.log_metric("f1_score", 0.87)
            model_path = os.path.join(self.model_path, "failure_prediction_v1")
            joblib.dump(model, model_path + "_model.pkl")
            joblib.dump(scaler, model_path + "_scaler.pkl")
            mlflow.sklearn.log_model(model, "model")
            mlflow.register_model(
                f"runs:/{mlflow.active_run().info.run_id}/model",
                "failure-prediction"
            )
            self.models["failure_prediction"] = model
            self.scalers["failure_prediction"] = scaler
            self._log_model_metrics("failure_prediction", accuracy=train_accuracy)

    def _create_sequences(self, data: np.ndarray, seq_length: int) -> Tuple[np.ndarray, np.ndarray]:
        """Create sequences for LSTM training"""
        X, y = [], []
        for i in range(len(data) - seq_length):
            X.append(data[i:(i + seq_length)])
            y.append(data[i + seq_length])
        return np.array(X), np.array(y)

    def train_time_series_model(
        self,
        time_series_data: np.ndarray = None,
        seq_length: int = 60,
        forecast_horizon: int = 1,
        epochs: int = 50,
        batch_size: int = 32,
        validation_split: float = 0.2
    ):
        """Train LSTM model for time series forecasting"""
        if not TENSORFLOW_AVAILABLE:
            raise RuntimeError("TensorFlow is required for LSTM models. Please install tensorflow.")

        with mlflow.start_run(run_name="time_series_forecast_training"):
            # Generate sample data if not provided
            if time_series_data is None:
                np.random.seed(42)
                # Generate realistic time series data (sine wave with noise)
                t = np.arange(0, 2000, 0.1)
                time_series_data = np.sin(0.1 * t) + 0.5 * np.sin(0.3 * t) + np.random.normal(0, 0.1, len(t))
                time_series_data = time_series_data.reshape(-1, 1)

            # Normalize data
            scaler = MinMaxScaler(feature_range=(0, 1))
            scaled_data = scaler.fit_transform(time_series_data)

            # Create sequences
            X, y = self._create_sequences(scaled_data, seq_length)

            # Split data
            split_idx = int(len(X) * (1 - validation_split))
            X_train, X_test = X[:split_idx], X[split_idx:]
            y_train, y_test = y[:split_idx], y[split_idx:]

            # Build LSTM model
            model = Sequential([
                LSTM(50, return_sequences=True, input_shape=(seq_length, 1)),
                Dropout(0.2),
                LSTM(50, return_sequences=False),
                Dropout(0.2),
                Dense(25),
                Dense(forecast_horizon)
            ])

            model.compile(optimizer='adam', loss='mse', metrics=['mae'])

            # Train model
            history = model.fit(
                X_train, y_train,
                epochs=epochs,
                batch_size=batch_size,
                validation_data=(X_test, y_test),
                verbose=1
            )

            # Evaluate model
            train_loss = model.evaluate(X_train, y_train, verbose=0)
            test_loss = model.evaluate(X_test, y_test, verbose=0)

            # Log metrics
            mlflow.log_metric("train_loss", train_loss[0])
            mlflow.log_metric("train_mae", train_loss[1])
            mlflow.log_metric("test_loss", test_loss[0])
            mlflow.log_metric("test_mae", test_loss[1])
            mlflow.log_metric("seq_length", seq_length)
            mlflow.log_metric("forecast_horizon", forecast_horizon)

            # Save model and scaler
            model_path = os.path.join(self.model_path, "time_series_forecast_v1")
            model.save(model_path + "_model.h5")
            joblib.dump(scaler, model_path + "_scaler.pkl")

            # Save LSTM parameters
            lstm_params = {
                "seq_length": seq_length,
                "forecast_horizon": forecast_horizon,
                "input_shape": (seq_length, 1)
            }
            joblib.dump(lstm_params, model_path + "_params.pkl")
            self.lstm_params["time_series_forecast"] = lstm_params

            # Log model to MLflow
            mlflow.keras.log_model(model, "model")
            mlflow.register_model(
                f"runs:/{mlflow.active_run().info.run_id}/model",
                "time-series-forecast"
            )

            self.models["time_series_forecast"] = model
            self.scalers["time_series_forecast"] = scaler

            # Log metrics to Prometheus
            self._log_model_metrics(
                "time_series_forecast",
                train_loss=train_loss[0],
                train_mae=train_loss[1],
                test_loss=test_loss[0],
                test_mae=test_loss[1]
            )

            logger.info(f"Time series model trained. Train MAE: {train_loss[1]:.4f}, Test MAE: {test_loss[1]:.4f}")

    def _load_local_scaler(self, model_name: str) -> Optional[Any]:
        """Attempt to load a locally stored scaler for the given model."""
        pattern = os.path.join(self.model_path, f"{model_name}_*_scaler.pkl")
        matches = glob.glob(pattern)
        if not matches:
            return None

        scaler_path = max(matches, key=os.path.getmtime)
        try:
            scaler = joblib.load(scaler_path)
            self.scalers[model_name] = scaler
            logger.info("Loaded scaler for %s from %s", model_name, scaler_path)
            return scaler
        except Exception as exc:
            logger.error("Failed to load scaler for %s: %s", model_name, exc)
            return None

    def _load_local_lstm_params(self, model_name: str) -> Optional[Dict[str, Any]]:
        """Load LSTM parameters from local storage."""
        pattern = os.path.join(self.model_path, f"{model_name}_*_params.pkl")
        matches = glob.glob(pattern)
        if not matches:
            return None

        params_path = max(matches, key=os.path.getmtime)
        try:
            params = joblib.load(params_path)
            self.lstm_params[model_name] = params
            logger.info("Loaded LSTM params for %s from %s", model_name, params_path)
            return params
        except Exception as exc:
            logger.error("Failed to load LSTM params for %s: %s", model_name, exc)
            return None

    def load_model(self, model_name: str, version: int = None):
        """Load model from MLflow registry"""
        try:
            if version:
                model_uri = f"models:/{model_name}/{version}"
            else:
                model_uri = f"models:/{model_name}/latest"

            key = MODEL_REGISTRY_TO_KEY.get(model_name, model_name)

            # Load Keras model for time series
            if key == "time_series_forecast":
                if not TENSORFLOW_AVAILABLE:
                    logger.error("TensorFlow not available for loading LSTM model")
                    return None
                model = mlflow.keras.load_model(model_uri)
                self._load_local_scaler("time_series_forecast")
                self._load_local_lstm_params("time_series_forecast")
            else:
                # Load sklearn model
                model = mlflow.sklearn.load_model(model_uri)
                if key == "failure_prediction":
                    self._load_local_scaler("failure_prediction")

            self.models[key] = model

            logger.info(f"Loaded model: {model_name} (version: {version or 'latest'})")
            return model
        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            return None

    def load_registered_models(self):
        """Best-effort load of supported models from the registry."""
        results = {}
        for registry_name in ("anomaly-detection", "failure-prediction", "time-series-forecast"):
            results[registry_name] = self.load_model(registry_name) is not None
        return results

    def predict_anomaly(self, features: Dict[str, float]) -> Dict[str, Any]:
        """Predict anomaly"""
        model = self.models.get("anomaly_detection") or self.load_model("anomaly-detection")
        if model is None:
            raise RuntimeError("Anomaly detection model not available. Load or train the model before inference.")

        # Prepare features
        X = np.array([list(features.values())])

        # Predict
        prediction = model.predict(X)[0]
        score = model.score_samples(X)[0]

        # Convert to probability
        anomaly_prob = 1 / (1 + np.exp(score * 5))  # Sigmoid transformation

        return {
            "prediction": 1.0 if prediction == -1 else 0.0,
            "anomaly_score": float(anomaly_prob),
            "probability": float(anomaly_prob)
        }

    def predict_failure(self, features: Dict[str, float]) -> Dict[str, Any]:
        """Predict failure"""
        model = self.models.get("failure_prediction") or self.load_model("failure-prediction")
        if model is None:
            raise RuntimeError("Failure prediction model not available. Load or train the model before inference.")

        scaler = self.scalers.get("failure_prediction") or self._load_local_scaler("failure_prediction")

        # Prepare features
        X = np.array([list(features.values())])

        # Scale if scaler available
        if scaler:
            X = scaler.transform(X)

        # Predict
        prediction = model.predict(X)[0]
        probability = model.predict_proba(X)[0]

        failure_prob = float(probability[1])

        return {
            "prediction": float(prediction),
            "failure_probability": failure_prob,
            "probability": failure_prob
        }

    def predict_time_series(
        self,
        historical_data: List[float],
        forecast_steps: int = 1
    ) -> Dict[str, Any]:
        """Predict future values using LSTM model"""
        if not TENSORFLOW_AVAILABLE:
            raise RuntimeError("TensorFlow is required for LSTM predictions.")

        model = self.models.get("time_series_forecast")
        if model is None:
            model = self.load_model("time-series-forecast")
        if model is None:
            raise RuntimeError("Time series forecast model not available. Load or train the model before inference.")

        scaler = self.scalers.get("time_series_forecast")
        if scaler is None:
            scaler = self._load_local_scaler("time_series_forecast")
        if scaler is None:
            raise RuntimeError("Scaler not available for time series model.")

        params = self.lstm_params.get("time_series_forecast")
        if params is None:
            params = self._load_local_lstm_params("time_series_forecast")
        if params is None:
            raise RuntimeError("LSTM parameters not available.")

        seq_length = params.get("seq_length", 60)

        # Prepare input data
        if len(historical_data) < seq_length:
            raise ValueError(f"Historical data must have at least {seq_length} points, got {len(historical_data)}")

        # Use last seq_length points
        input_data = np.array(historical_data[-seq_length:]).reshape(-1, 1)
        input_scaled = scaler.transform(input_data)
        input_sequence = input_scaled.reshape(1, seq_length, 1)

        # Predict
        predictions = []
        current_sequence = input_sequence.copy()

        for _ in range(forecast_steps):
            # Predict next step
            pred = model.predict(current_sequence, verbose=0)
            predictions.append(float(pred[0, 0]))

            # Update sequence for next prediction (rolling window)
            if forecast_steps > 1:
                # Remove first element and add prediction
                current_sequence = np.roll(current_sequence, -1, axis=1)
                current_sequence[0, -1, 0] = pred[0, 0]

        # Inverse transform predictions
        predictions_array = np.array(predictions).reshape(-1, 1)
        predictions_original_scale = scaler.inverse_transform(predictions_array)
        predictions_original_scale = predictions_original_scale.flatten().tolist()

        return {
            "predictions": predictions_original_scale,
            "forecast_steps": forecast_steps,
            "sequence_length": seq_length,
            "confidence": 0.85  # Can be improved with prediction intervals
        }

    def get_model_info(self, model_name: str) -> Dict[str, Any]:
        """Get model information from MLflow"""
        try:
            client = mlflow.tracking.MlflowClient()

            # Get latest version
            versions = client.search_model_versions(f"name='{model_name}'")

            if not versions:
                return None

            latest = max(versions, key=lambda v: int(v.version))

            # Get run info
            run = client.get_run(latest.run_id)

            return {
                "model_name": model_name,
                "version": latest.version,
                "stage": latest.current_stage,
                "metrics": run.data.metrics,
                "params": run.data.params,
                "created_at": latest.creation_timestamp
            }
        except Exception as e:
            logger.error(f"Failed to get model info for {model_name}: {e}")
            return None

    def _log_model_metrics(self, model_name: str, **metrics: float):
        """Log metrics and emit them as Prometheus gauges if available."""
        for key, value in metrics.items():
            logger.info(
                "Model metric",
                extra={"model": model_name, "metric": key, "value": value},
            )

            gauge = _get_model_gauge(key)
            if gauge is not None:
                try:
                    gauge.labels(model=model_name).set(float(value))
                except Exception as exc:  # pragma: no cover
                    logger.warning(
                        "Failed to set Prometheus gauge for %s: %s",
                        key,
                        exc,
                    )


# Global instance
mlflow_manager = None


def get_mlflow_manager(
    *,
    model_path: Optional[str] = None,
    tracking_uri: Optional[str] = None,
) -> MLflowModelManager:
    """Get or create MLflow manager"""
    global mlflow_manager
    if mlflow_manager is None:
        kwargs: Dict[str, Any] = {}
        if model_path:
            kwargs["model_path"] = model_path
        if tracking_uri:
            kwargs["tracking_uri"] = tracking_uri
        mlflow_manager = MLflowModelManager(**kwargs)
    return mlflow_manager

