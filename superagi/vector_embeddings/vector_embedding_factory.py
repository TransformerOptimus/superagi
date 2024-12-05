
import pinecone
from typing import Optional
from pinecone import UnauthorizedException
from superagi.vector_embeddings.pinecone import Pinecone
from superagi.vector_embeddings.qdrant import Qdrant
from superagi.vector_embeddings.weaviate import Weaviate
from superagi.vector_embeddings.mongodb import MongoDB
from superagi.types.vector_store_types import VectorStoreType

class VectorEmbeddingFactory:

    @classmethod
    def build_vector_storage(cls, vector_store: VectorStoreType, chunk_json: Optional[dict] = None):
        """
        Get the vector embeddings from final chunks.
        Args:
            vector_store : The vector store name.
        Returns:
            The vector storage object
        """
        final_chunks = []
        uuid = []
        embeds = []
        metadata = []
        vector_store = VectorStoreType.get_vector_store_type(vector_store)
        if chunk_json is not None:
            for key in chunk_json.keys():
                final_chunks.append(chunk_json[key])

            for i in range(0, len(final_chunks)):
                uuid.append(final_chunks[i]["id"])
                embeds.append(final_chunks[i]["embeds"])
                data = {
                    'text': final_chunks[i]['text'],
                    'chunk': final_chunks[i]['chunk'],
                    'knowledge_name': final_chunks[i]['knowledge_name']
                }
                metadata.append(data)

        if vector_store == VectorStoreType.PINECONE:
            return Pinecone(uuid, embeds, metadata)

        if vector_store == VectorStoreType.QDRANT:
            return Qdrant(uuid, embeds, metadata)
        
        if vector_store == VectorStoreType.WEAVIATE:
            return Weaviate(uuid, embeds, metadata)
        
        if vector_store == VectorStoreType.MONGODB:
            return MongoDB(uuid, embeds, metadata)