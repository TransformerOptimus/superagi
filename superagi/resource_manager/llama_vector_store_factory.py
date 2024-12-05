from llama_index.vector_stores.types import VectorStore

from superagi.config.config import get_config
from superagi.types.vector_store_types import VectorStoreType


class LlamaVectorStoreFactory:
    """
    Factory class to create vector stores based on the vector_store_name

    :param vector_store_name: VectorStoreType
    :param index_name: str

    :return: VectorStore object
    """
    def __init__(self, vector_store_name: VectorStoreType, index_name: str):
        self.vector_store_name = vector_store_name
        self.index_name = index_name

    def get_vector_store(self) -> VectorStore:
        """
        Returns the vector store based on the vector_store_name

        :return: VectorStore object
        """
        if self.vector_store_name == VectorStoreType.PINECONE:
            from llama_index.vector_stores import PineconeVectorStore
            return PineconeVectorStore(self.index_name)

        if self.vector_store_name == VectorStoreType.REDIS:
            redis_url = get_config("REDIS_VECTOR_STORE_URL") or "redis://super__redis:6379"
            from llama_index.vector_stores import RedisVectorStore
            return RedisVectorStore(
                index_name=self.index_name,
                redis_url=redis_url,
                metadata_fields=["agent_id", "resource_id"]
            )

        if self.vector_store_name == VectorStoreType.CHROMA:
            from llama_index.vector_stores import ChromaVectorStore
            import chromadb
            from chromadb.config import Settings
            chroma_host_name = get_config("CHROMA_HOST_NAME") or "localhost"
            chroma_port = get_config("CHROMA_PORT") or 8000
            chroma_client = chromadb.Client(
                Settings(chroma_api_impl="rest", chroma_server_host=chroma_host_name,
                         chroma_server_http_port=chroma_port))
            chroma_collection = chroma_client.get_or_create_collection(self.index_name)
            return ChromaVectorStore(chroma_collection)

        if self.vector_store_name == VectorStoreType.QDRANT:
            from llama_index.vector_stores import QdrantVectorStore
            qdrant_host_name = get_config("QDRANT_HOST_NAME") or "localhost"
            qdrant_port = get_config("QDRANT_PORT") or 6333
            from qdrant_client import QdrantClient
            qdrant_client = QdrantClient(host=qdrant_host_name, port=qdrant_port)
            return QdrantVectorStore(client=qdrant_client, collection_name=self.index_name)
        
        if self.vector_store_name == VectorStoreType.MONGODB:
            from llama_index.vector_stores.mongodb import MongoDBAtlasVectorSearch
            import pymongo
            MDB_URI = get_config("MDB_URI") or "mongodb://localhost:27017"
            store = MongoDBAtlasVectorSearch(pymongo.MongoClient(MDB_URI))
            return store

        raise ValueError(str(self.vector_store_name) + " vector store is not supported yet.")
