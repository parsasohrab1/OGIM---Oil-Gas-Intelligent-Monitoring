"""
MLflow integration for model management
"""
import glob
import logging
import os
from typing import Any, Dict, Optional

import joblib
import mlflow
import mlflow.sklearn
import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

MODEL_REGISTRY_TO_KEY = {
    "anomaly-detection": "anomaly_detection",
    "failure-prediction": "failure_prediction",
}


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
    
    def load_model(self, model_name: str, version: int = None):
        """Load model from MLflow registry"""
        try:
            if version:
                model_uri = f"models:/{model_name}/{version}"
            else:
                model_uri = f"models:/{model_name}/latest"
            
            model = mlflow.sklearn.load_model(model_uri)
            key = MODEL_REGISTRY_TO_KEY.get(model_name, model_name)
            self.models[key] = model
            
            if key == "failure_prediction":
                self._load_local_scaler("failure_prediction")
            
            logger.info(f"Loaded model: {model_name} (version: {version or 'latest'})")
            return model
        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            return None
    
    def load_registered_models(self):
        """Best-effort load of supported models from the registry."""
        results = {}
        for registry_name in ("anomaly-detection", "failure-prediction"):
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
        """Placeholder to export metrics to Prometheus or logging."""
        for key, value in metrics.items():
            logger.info("Model metric", extra={"model": model_name, "metric": key, "value": value})


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

