from typing import Any
from superagi.vector_embeddings.base import VectorEmbeddings

class MongoDB(VectorEmbeddings):

    def __init__(self, uuid, embeds, metadata):
        self.uuid = uuid
        self.embeds = embeds
        self.metadata = metadata
        
    def get_vector_embeddings_from_chunks(self):
        """ Returns embeddings for vector dbs from final chunks"""
        result = {}
        vectors = list(zip(self.uuid, self.embeds, self.metadata))
        result['vectors'] = vectors
        return result