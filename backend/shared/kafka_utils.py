"""
Kafka producer and consumer utilities
"""
from typing import Dict, Any, Optional, Callable
from confluent_kafka import Producer, Consumer, KafkaError, KafkaException
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer, AvroDeserializer
from confluent_kafka.serialization import SerializationContext, MessageField, StringSerializer
import json
import logging

from .config import settings

logger = logging.getLogger(__name__)


class KafkaProducerWrapper:
    """Kafka producer wrapper with error handling"""
    
    def __init__(self, topic: str, schema: Optional[str] = None):
        self.topic = topic
        
        # Producer config
        conf = {
            'bootstrap.servers': settings.KAFKA_BOOTSTRAP_SERVERS,
            'client.id': f'{settings.APP_NAME}-producer',
            'acks': 'all',
            'retries': 3,
            'max.in.flight.requests.per.connection': 1,
        }
        
        self.producer = Producer(conf)
        
        # Schema registry (if schema provided)
        if schema:
            schema_registry_conf = {'url': settings.KAFKA_SCHEMA_REGISTRY_URL}
            schema_registry_client = SchemaRegistryClient(schema_registry_conf)
            self.serializer = AvroSerializer(
                schema_registry_client,
                schema,
                lambda obj, ctx: obj
            )
        else:
            self.serializer = None
    
    def delivery_callback(self, err, msg):
        """Callback for delivery reports"""
        if err:
            logger.error(f'Message delivery failed: {err}')
        else:
            logger.debug(f'Message delivered to {msg.topic()} [{msg.partition()}] @ {msg.offset()}')
    
    def send(self, key: str, value: Dict[str, Any]):
        """Send message to Kafka"""
        try:
            if self.serializer:
                serialized_value = self.serializer(
                    value,
                    SerializationContext(self.topic, MessageField.VALUE)
                )
            else:
                serialized_value = json.dumps(value).encode('utf-8')
            
            self.producer.produce(
                topic=self.topic,
                key=key.encode('utf-8'),
                value=serialized_value,
                callback=self.delivery_callback
            )
            self.producer.poll(0)
            
        except Exception as e:
            logger.error(f"Error sending message to Kafka: {e}")
            raise
    
    def flush(self, timeout: float = 10):
        """Flush pending messages"""
        self.producer.flush(timeout)
    
    def close(self):
        """Close producer"""
        self.producer.flush()


class KafkaConsumerWrapper:
    """Kafka consumer wrapper with error handling"""
    
    def __init__(
        self,
        topics: list,
        group_id: str,
        schema: Optional[str] = None,
        auto_offset_reset: str = 'earliest'
    ):
        self.topics = topics
        
        # Consumer config
        conf = {
            'bootstrap.servers': settings.KAFKA_BOOTSTRAP_SERVERS,
            'group.id': group_id,
            'auto.offset.reset': auto_offset_reset,
            'enable.auto.commit': False,
        }
        
        self.consumer = Consumer(conf)
        self.consumer.subscribe(topics)
        
        # Schema registry (if schema provided)
        if schema:
            schema_registry_conf = {'url': settings.KAFKA_SCHEMA_REGISTRY_URL}
            schema_registry_client = SchemaRegistryClient(schema_registry_conf)
            self.deserializer = AvroDeserializer(
                schema_registry_client,
                schema,
                lambda obj, ctx: obj
            )
        else:
            self.deserializer = None
    
    def consume_messages(
        self,
        callback: Callable[[str, Dict[str, Any]], None],
        timeout: float = 1.0
    ):
        """Consume messages with callback"""
        try:
            while True:
                msg = self.consumer.poll(timeout)
                
                if msg is None:
                    continue
                
                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        logger.debug(f'Reached end of partition {msg.partition()}')
                    else:
                        raise KafkaException(msg.error())
                else:
                    # Deserialize message
                    key = msg.key().decode('utf-8') if msg.key() else None
                    
                    if self.deserializer:
                        value = self.deserializer(
                            msg.value(),
                            SerializationContext(msg.topic(), MessageField.VALUE)
                        )
                    else:
                        value = json.loads(msg.value().decode('utf-8'))
                    
                    # Process message
                    try:
                        callback(key, value)
                        self.consumer.commit(message=msg)
                    except Exception as e:
                        logger.error(f"Error processing message: {e}")
                        # Send to DLQ
                        self.send_to_dlq(msg, str(e))
        
        except KeyboardInterrupt:
            logger.info("Consumer interrupted by user")
        finally:
            self.close()
    
    def send_to_dlq(self, msg, error: str):
        """Send failed message to Dead Letter Queue"""
        dlq_topic = f"{msg.topic()}.dlq"
        dlq_producer = KafkaProducerWrapper(dlq_topic)
        
        try:
            dlq_message = {
                "original_topic": msg.topic(),
                "original_partition": msg.partition(),
                "original_offset": msg.offset(),
                "error": error,
                "value": msg.value().decode('utf-8') if msg.value() else None
            }
            dlq_producer.send(msg.key().decode('utf-8') if msg.key() else "null", dlq_message)
            dlq_producer.flush()
        except Exception as e:
            logger.error(f"Failed to send to DLQ: {e}")
    
    def close(self):
        """Close consumer"""
        self.consumer.close()


# Kafka topics
KAFKA_TOPICS = {
    "RAW_SENSOR_DATA": "raw-sensor-data",
    "PROCESSED_DATA": "processed-data",
    "ALERTS": "alerts",
    "CONTROL_COMMANDS": "control-commands",
    "ML_PREDICTIONS": "ml-predictions",
    "DLQ": "dlq",
}

