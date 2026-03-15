from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class UnifiedMessage:
    channel: str  # "whatsapp" | "email" | "webchat"
    sender_id: str
    sender_name: str
    message: str
    conversation_id: str = ""
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: dict = field(default_factory=dict)
