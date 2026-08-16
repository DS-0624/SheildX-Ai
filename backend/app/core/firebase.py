import logging
import os
import firebase_admin
from firebase_admin import credentials, firestore, auth, messaging
from app.core.config import settings

logger = logging.getLogger("sheildx.firebase")

db = None
firebase_app = None

def init_firebase():
    global firebase_app, db
    if firebase_admin._apps:
        firebase_app = firebase_admin.get_app()
        db = firestore.client()
        return firebase_app, db
        
    try:
        if settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            firebase_app = firebase_admin.initialize_app(cred)
            logger.info("Firebase initialized using credentials file path.")
        elif settings.FIREBASE_PRIVATE_KEY and settings.FIREBASE_CLIENT_EMAIL:
            cred_dict = {
                "type": "service_account",
                "project_id": settings.FIREBASE_PROJECT_ID,
                "private_key": settings.FIREBASE_PRIVATE_KEY.replace('\\n', '\n'),
                "client_email": settings.FIREBASE_CLIENT_EMAIL,
            }
            cred = credentials.Certificate(cred_dict)
            firebase_app = firebase_admin.initialize_app(cred)
            logger.info("Firebase initialized using inline environment credentials.")
        else:
            logger.warning("Firebase credentials not set. Running in mock/standalone mode.")
            firebase_app = None
            db = None
    except Exception as e:
        logger.error(f"Error initializing Firebase: {str(e)}")
        firebase_app = None
        db = None
        
    return firebase_app, db

class MockFirestore:
    """In-memory fallback database for local testing when Firebase is unconfigured"""
    def __init__(self):
        self.store = {}
        
    def collection(self, col_name):
        return MockCollection(self.store, col_name)

class MockCollection:
    def __init__(self, store, col_name):
        self.store = store
        self.col_name = col_name
        if col_name not in self.store:
            self.store[col_name] = {}
            
    def document(self, doc_id):
        return MockDocument(self.store[self.col_name], doc_id)
        
    def where(self, field, op, val):
        return MockQuery(self.store[self.col_name], field, op, val)
        
    def stream(self):
        for doc_id, data in self.store[self.col_name].items():
            yield MockDocSnapshot(doc_id, data)

class MockDocument:
    def __init__(self, col_store, doc_id):
        self.col_store = col_store
        self.doc_id = doc_id
        
    def set(self, data, merge=False):
        if merge and self.doc_id in self.col_store:
            self.col_store[self.doc_id].update(data)
        else:
            self.col_store[self.doc_id] = dict(data)
            
    def update(self, data):
        if self.doc_id in self.col_store:
            self.col_store[self.doc_id].update(data)
        else:
            self.col_store[self.doc_id] = dict(data)
            
    def get(self):
        data = self.col_store.get(self.doc_id)
        return MockDocSnapshot(self.doc_id, data)

class MockDocSnapshot:
    def __init__(self, doc_id, data):
        self.id = doc_id
        self._data = data
        self.exists = data is not None
        
    def to_dict(self):
        return self._data or {}

class MockQuery:
    def __init__(self, col_store, field, op, val):
        self.col_store = col_store
        self.field = field
        self.op = op
        self.val = val
        
    def stream(self):
        for doc_id, data in self.col_store.items():
            if self.field in data:
                if self.op == "==" and data[self.field] == self.val:
                    yield MockDocSnapshot(doc_id, data)
                elif self.op == "array_contains" and isinstance(data[self.field], list) and self.val in data[self.field]:
                    yield MockDocSnapshot(doc_id, data)

mock_db = MockFirestore()

def get_db():
    global db
    if db is not None:
        return db
    return mock_db
