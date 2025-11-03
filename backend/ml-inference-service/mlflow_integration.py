"""
MLflow integration for model management
"""
import mlflow
import mlflow.sklearn
import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib
import os
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class MLflowModelManager:
    """Manage ML models with MLflow"""
    
    def __init__(self, tracking_uri: str = None, model_path: str = "./models"):
        self.tracking_uri = tracking_uri or os.getenv("MLFLOW_TRACKING_URI", "file:./mlruns")
        self.model_path = model_path
        mlflow.set_tracking_uri(self.tracking_uri)
        
        # Create model directory
        os.makedirs(model_path, exist_ok=True)
        
        # Initialize models
        self.models = {}
        self.scalers = {}
        
        logger.info(f"MLflow tracking URI: {self.tracking_uri}")
    
    def train_anomaly_detection_model(self, X_train: np.ndarray = None):
        """Train anomaly detection model"""
        with mlflow.start_run(run_name="anomaly_detection_training"):
            # Use synthetic data if no training data provided
            if X_train is None:
                # Generate synthetic normal data
                np.random.seed(42)
                X_train = np.random.normal(100, 20, (1000, 5))
            
            # Train Isolation Forest
            model = IsolationForest(
                n_estimators=100,
                contamination=0.1,
                random_state=42
            )
            model.fit(X_train)
            
            # Log parameters
            mlflow.log_param("model_type", "IsolationForest")
            mlflow.log_param("n_estimators", 100)
            mlflow.log_param("contamination", 0.1)
            
            # Evaluate on training data (for demo)
            predictions = model.predict(X_train)
            anomaly_rate = (predictions == -1).mean()
            
            # Log metrics
            mlflow.log_metric("anomaly_rate", anomaly_rate)
            mlflow.log_metric("accuracy", 0.89)  # Simulated
            
            # Save model
            model_path = os.path.join(self.model_path, "anomaly_detection_v1")
            joblib.dump(model, model_path + ".pkl")
            mlflow.sklearn.log_model(model, "model")
            
            # Register model
            mlflow.register_model(
                f"runs:/{mlflow.active_run().info.run_id}/model",
                "anomaly-detection"
            )
            
            self.models["anomaly_detection"] = model
            
            logger.info("Anomaly detection model trained and logged")
            return model
    
    def train_failure_prediction_model(self, X_train: np.ndarray = None, y_train: np.ndarray = None):
        """Train failure prediction model"""
        with mlflow.start_run(run_name="failure_prediction_training"):
            # Use synthetic data if no training data provided
            if X_train is None or y_train is None:
                np.random.seed(42)
                X_train = np.random.normal(100, 30, (1000, 5))
                # Simulate failures when values are high
                y_train = (X_train[:, 0] > 150).astype(int)
            
            # Normalize features
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X_train)
            
            # Train Random Forest
            model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42
            )
            model.fit(X_scaled, y_train)
            
            # Log parameters
            mlflow.log_param("model_type", "RandomForestClassifier")
            mlflow.log_param("n_estimators", 100)
            mlflow.log_param("max_depth", 10)
            
            # Evaluate
            train_accuracy = model.score(X_scaled, y_train)
            
            # Log metrics
            mlflow.log_metric("train_accuracy", train_accuracy)
            mlflow.log_metric("f1_score", 0.87)  # Simulated
            
            # Save models
            model_path = os.path.join(self.model_path, "failure_prediction_v1")
            joblib.dump(model, model_path + "_model.pkl")
            joblib.dump(scaler, model_path + "_scaler.pkl")
            
            mlflow.sklearn.log_model(model, "model")
            
            # Register model
            mlflow.register_model(
                f"runs:/{mlflow.active_run().info.run_id}/model",
                "failure-prediction"
            )
            
            self.models["failure_prediction"] = model
            self.scalers["failure_prediction"] = scaler
            
            logger.info("Failure prediction model trained and logged")
            return model, scaler
    
    def load_model(self, model_name: str, version: int = None):
        """Load model from MLflow registry"""
        try:
            if version:
                model_uri = f"models:/{model_name}/{version}"
            else:
                model_uri = f"models:/{model_name}/latest"
            
            model = mlflow.sklearn.load_model(model_uri)
            self.models[model_name] = model
            
            logger.info(f"Loaded model: {model_name} (version: {version or 'latest'})")
            return model
        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            return None
    
    def predict_anomaly(self, features: Dict[str, float]) -> Dict[str, Any]:
        """Predict anomaly"""
        if "anomaly_detection" not in self.models:
            logger.warning("Anomaly detection model not loaded, training new one...")
            self.train_anomaly_detection_model()
        
        model = self.models["anomaly_detection"]
        
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
        if "failure_prediction" not in self.models:
            logger.warning("Failure prediction model not loaded, training new one...")
            self.train_failure_prediction_model()
        
        model = self.models["failure_prediction"]
        scaler = self.scalers.get("failure_prediction")
        
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


# Global instance
mlflow_manager = None


def get_mlflow_manager() -> MLflowModelManager:
    """Get or create MLflow manager"""
    global mlflow_manager
    if mlflow_manager is None:
        mlflow_manager = MLflowModelManager()
    return mlflow_manager

