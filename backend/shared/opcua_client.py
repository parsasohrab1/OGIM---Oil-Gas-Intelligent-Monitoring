"""
OPC-UA Client for SCADA/PLC connectivity
"""
from typing import List, Dict, Any, Optional
from opcua import Client, ua
from datetime import datetime
import logging

from .config import settings

logger = logging.getLogger(__name__)


class OPCUAClient:
    """OPC-UA client wrapper"""
    
    def __init__(
        self,
        server_url: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None
    ):
        self.server_url = server_url or settings.OPCUA_SERVER_URL
        self.username = username or settings.OPCUA_USERNAME
        self.password = password or settings.OPCUA_PASSWORD
        self.client = None
        self.connected = False
    
    def connect(self):
        """Connect to OPC-UA server"""
        if not self.server_url:
            logger.warning("OPC-UA server URL not configured")
            return False
        
        try:
            self.client = Client(self.server_url)
            
            # Set authentication if provided
            if self.username and self.password:
                self.client.set_user(self.username)
                self.client.set_password(self.password)
            
            self.client.connect()
            self.connected = True
            logger.info(f"Connected to OPC-UA server: {self.server_url}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to OPC-UA server: {e}")
            self.connected = False
            return False
    
    def disconnect(self):
        """Disconnect from OPC-UA server"""
        if self.client and self.connected:
            try:
                self.client.disconnect()
                self.connected = False
                logger.info("Disconnected from OPC-UA server")
            except Exception as e:
                logger.error(f"Error disconnecting from OPC-UA server: {e}")
    
    def read_node(self, node_id: str) -> Optional[Any]:
        """Read a single node value"""
        if not self.connected:
            logger.warning("Not connected to OPC-UA server")
            return None
        
        try:
            node = self.client.get_node(node_id)
            value = node.get_value()
            return value
        except Exception as e:
            logger.error(f"Error reading node {node_id}: {e}")
            return None
    
    def read_nodes(self, node_ids: List[str]) -> Dict[str, Any]:
        """Read multiple node values"""
        results = {}
        for node_id in node_ids:
            value = self.read_node(node_id)
            if value is not None:
                results[node_id] = value
        return results
    
    def write_node(self, node_id: str, value: Any) -> bool:
        """Write a value to a node"""
        if not self.connected:
            logger.warning("Not connected to OPC-UA server")
            return False
        
        try:
            node = self.client.get_node(node_id)
            
            # Get data type
            data_type = node.get_data_type_as_variant_type()
            
            # Create variant with appropriate type
            variant = ua.Variant(value, data_type)
            
            # Write value
            node.set_value(variant)
            logger.info(f"Wrote value {value} to node {node_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error writing to node {node_id}: {e}")
            return False
    
    def subscribe_to_nodes(
        self,
        node_ids: List[str],
        callback: callable,
        interval: int = 1000
    ):
        """Subscribe to node changes"""
        if not self.connected:
            logger.warning("Not connected to OPC-UA server")
            return None
        
        try:
            # Create subscription
            subscription = self.client.create_subscription(interval, callback)
            
            # Subscribe to nodes
            for node_id in node_ids:
                node = self.client.get_node(node_id)
                subscription.subscribe_data_change(node)
            
            logger.info(f"Subscribed to {len(node_ids)} nodes")
            return subscription
            
        except Exception as e:
            logger.error(f"Error subscribing to nodes: {e}")
            return None
    
    def browse_nodes(self, root_node_id: str = "ns=2;i=1") -> List[Dict[str, Any]]:
        """Browse nodes in the server"""
        if not self.connected:
            logger.warning("Not connected to OPC-UA server")
            return []
        
        try:
            root = self.client.get_node(root_node_id)
            nodes = []
            
            for child in root.get_children():
                node_info = {
                    "node_id": child.nodeid.to_string(),
                    "browse_name": child.get_browse_name().to_string(),
                    "display_name": child.get_display_name().to_string(),
                }
                nodes.append(node_info)
            
            return nodes
            
        except Exception as e:
            logger.error(f"Error browsing nodes: {e}")
            return []


class ModbusTCPClient:
    """Modbus TCP client wrapper (mock implementation)"""
    
    def __init__(self, host: str, port: int = 502):
        self.host = host
        self.port = port
        self.connected = False
        logger.warning("Modbus TCP client is mock implementation")
    
    def connect(self) -> bool:
        """Connect to Modbus server"""
        try:
            # In production, use pymodbus library
            # from pymodbus.client import ModbusTcpClient
            # self.client = ModbusTcpClient(self.host, port=self.port)
            # self.connected = self.client.connect()
            
            logger.info(f"Mock connection to Modbus TCP: {self.host}:{self.port}")
            self.connected = True
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Modbus: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from Modbus server"""
        self.connected = False
        logger.info("Disconnected from Modbus TCP")
    
    def read_holding_registers(self, address: int, count: int) -> Optional[List[int]]:
        """Read holding registers"""
        if not self.connected:
            return None
        
        # Mock implementation
        logger.info(f"Mock read holding registers: address={address}, count={count}")
        return [0] * count
    
    def write_register(self, address: int, value: int) -> bool:
        """Write single register"""
        if not self.connected:
            return False
        
        # Mock implementation
        logger.info(f"Mock write register: address={address}, value={value}")
        return True

