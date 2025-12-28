import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { mlAPI } from '../api/services'
import './LSTMForecast.css'

interface ForecastResult {
  sensor_id: string
  predictions: number[]
  forecast_steps: number
  sequence_length: number
  confidence: number
  timestamp: string
  confidence_lower?: number[]
  confidence_upper?: number[]
  model_type?: string
}

export default function LSTMForecast() {
  const queryClient = useQueryClient()
  const [selectedSensor, setSelectedSensor] = useState<string>('')
  const [forecastSteps, setForecastSteps] = useState<number>(24)
  const [historicalData, setHistoricalData] = useState<string>('')
  const [trainingWell, setTrainingWell] = useState<string>('')
  const [trainingData, setTrainingData] = useState<string>('')
  const [modelType, setModelType] = useState<string>('stacked_lstm')

  // Fetch available models
  const { data: modelsData } = useQuery({
    queryKey: ['lstm-models'],
    queryFn: async () => {
      try {
        const response = await mlAPI.getLSTMModels()
        return response.data
      } catch (error: any) {
        console.error('Failed to fetch models:', error)
        return { models: [], count: 0 }
      }
    },
    refetchInterval: 30000,
  })

  // Forecast mutation
  const forecastMutation = useMutation({
    mutationFn: async (data: { sensor_id: string; historical_data: number[]; forecast_steps: number }) => {
      const response = await mlAPI.forecastTimeSeries(data)
      return response.data as ForecastResult
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecast'] })
    },
  })

  // Training mutation
  const trainingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await mlAPI.trainLSTMModel(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lstm-models'] })
      alert('Model training completed successfully!')
    },
    onError: (error: any) => {
      alert(`Training failed: ${error.message}`)
    },
  })

  const handleForecast = () => {
    if (!selectedSensor || !historicalData) {
      alert('Please provide sensor ID and historical data')
      return
    }

    try {
      const dataPoints = historicalData.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
      if (dataPoints.length < 60) {
        alert('Historical data must have at least 60 points')
        return
      }

      forecastMutation.mutate({
        sensor_id: selectedSensor,
        historical_data: dataPoints,
        forecast_steps: forecastSteps
      })
    } catch (error) {
      alert('Invalid historical data format. Use comma-separated numbers.')
    }
  }

  const handleTrain = () => {
    if (!trainingWell || !trainingData) {
      alert('Please provide well name and training data')
      return
    }

    try {
      const dataPoints = trainingData.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
      if (dataPoints.length < 200) {
        alert('Training data must have at least 200 points')
        return
      }

      trainingMutation.mutate({
        well_name: trainingWell,
        time_series_data: dataPoints,
        model_type: modelType,
        sequence_length: 60,
        forecast_horizon: 24,
        epochs: 50,
        batch_size: 32,
        validation_split: 0.2
      })
    } catch (error) {
      alert('Invalid training data format. Use comma-separated numbers.')
    }
  }

  // Prepare chart data
  const chartData: any[] = []
  if (forecastMutation.data) {
    const result = forecastMutation.data
    const historical = historicalData.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
    
    // Historical data points
    historical.slice(-60).forEach((value, idx) => {
      chartData.push({
        time: `T-${60 - idx}`,
        value: value,
        type: 'historical'
      })
    })
    
    // Forecast points
    result.predictions.forEach((pred, idx) => {
      chartData.push({
        time: `T+${idx + 1}`,
        value: pred,
        type: 'forecast',
        lower: result.confidence_lower?.[idx],
        upper: result.confidence_upper?.[idx]
      })
    })
  }

  return (
    <div className="lstm-forecast-page">
      <h2>LSTM Time Series Forecasting</h2>

      <div className="lstm-grid">
        {/* Model Training Section */}
        <div className="lstm-card">
          <h3>Train LSTM Model</h3>
          <div className="form-group">
            <label>Well Name</label>
            <input
              type="text"
              value={trainingWell}
              onChange={(e) => setTrainingWell(e.target.value)}
              placeholder="e.g., PROD-001"
            />
          </div>
          <div className="form-group">
            <label>Model Type</label>
            <select value={modelType} onChange={(e) => setModelType(e.target.value)}>
              <option value="stacked_lstm">Stacked LSTM</option>
              <option value="bidirectional">Bidirectional LSTM</option>
              <option value="attention">LSTM with Attention</option>
            </select>
          </div>
          <div className="form-group">
            <label>Training Data (comma-separated, min 200 points)</label>
            <textarea
              value={trainingData}
              onChange={(e) => setTrainingData(e.target.value)}
              rows={5}
              placeholder="e.g., 100.5, 102.3, 98.7, ..."
            />
          </div>
          <button
            onClick={handleTrain}
            disabled={trainingMutation.isPending}
            className="btn-train"
          >
            {trainingMutation.isPending ? 'Training...' : 'Train Model'}
          </button>
          {trainingMutation.data && (
            <div className="training-results">
              <h4>Training Results</h4>
              <div>Status: {trainingMutation.data.training_status}</div>
              <div>Train MAE: {trainingMutation.data.metrics?.train_mae?.toFixed(4)}</div>
              <div>Val MAE: {trainingMutation.data.metrics?.val_mae?.toFixed(4)}</div>
              <div>Epochs: {trainingMutation.data.epochs_trained}</div>
            </div>
          )}
        </div>

        {/* Forecast Section */}
        <div className="lstm-card">
          <h3>Generate Forecast</h3>
          <div className="form-group">
            <label>Sensor ID</label>
            <input
              type="text"
              value={selectedSensor}
              onChange={(e) => setSelectedSensor(e.target.value)}
              placeholder="e.g., PROD-001-PRESSURE"
            />
          </div>
          <div className="form-group">
            <label>Forecast Steps</label>
            <input
              type="number"
              value={forecastSteps}
              onChange={(e) => setForecastSteps(parseInt(e.target.value) || 24)}
              min={1}
              max={100}
            />
          </div>
          <div className="form-group">
            <label>Historical Data (comma-separated, min 60 points)</label>
            <textarea
              value={historicalData}
              onChange={(e) => setHistoricalData(e.target.value)}
              rows={5}
              placeholder="e.g., 100.5, 102.3, 98.7, ..."
            />
          </div>
          <button
            onClick={handleForecast}
            disabled={forecastMutation.isPending}
            className="btn-forecast"
          >
            {forecastMutation.isPending ? 'Forecasting...' : 'Generate Forecast'}
          </button>
        </div>

        {/* Trained Models List */}
        <div className="lstm-card">
          <h3>Trained Models</h3>
          <div className="models-list">
            {modelsData?.models?.length === 0 ? (
              <p className="no-models">No trained models. Train a model first.</p>
            ) : (
              modelsData?.models?.map((model: any, idx: number) => (
                <div key={idx} className="model-item">
                  <div className="model-name">{model.well_name}</div>
                  <div className="model-type">{model.model_type}</div>
                  <div className="model-info">
                    Seq: {model.sequence_length} | Horizon: {model.forecast_horizon}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Forecast Visualization */}
        {forecastMutation.data && (
          <div className="lstm-card chart-card">
            <h3>Forecast Results</h3>
            <div className="forecast-info">
              <div>Sensor: {forecastMutation.data.sensor_id}</div>
              <div>Forecast Steps: {forecastMutation.data.forecast_steps}</div>
              <div>Confidence: {(forecastMutation.data.confidence * 100).toFixed(1)}%</div>
              {forecastMutation.data.model_type && (
                <div>Model: {forecastMutation.data.model_type}</div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="none"
                  fill="#8884d8"
                  fillOpacity={0.1}
                  name="Confidence Upper"
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stroke="none"
                  fill="#8884d8"
                  fillOpacity={0.1}
                  name="Confidence Lower"
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Value"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="predictions-list">
              <h4>Predictions</h4>
              <div className="predictions-grid">
                {forecastMutation.data.predictions.map((pred, idx) => (
                  <div key={idx} className="prediction-item">
                    <div className="pred-step">Step {idx + 1}</div>
                    <div className="pred-value">{pred.toFixed(2)}</div>
                    {forecastMutation.data.confidence_lower && forecastMutation.data.confidence_upper && (
                      <div className="pred-range">
                        [{forecastMutation.data.confidence_lower[idx].toFixed(2)}, {forecastMutation.data.confidence_upper[idx].toFixed(2)}]
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

