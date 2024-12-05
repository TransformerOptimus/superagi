from enum import Enum


class VectorStoreType(Enum):
    REDIS = 'redis'
    PINECONE = 'pinecone'
    CHROMA = 'chroma'
    WEAVIATE = 'weaviate'
    QDRANT = 'qdrant'
    LANCEDB = 'LanceDB'
    MONGODB = 'MongoDB'

    @classmethod
    def get_vector_store_type(cls, store):
        store = store.upper()
        if store in cls.__members__:
            return cls[store]
        raise ValueError(f"{store} is not a valid vector store name.")

    def __str__(self):
        return self.value
