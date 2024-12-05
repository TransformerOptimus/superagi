import json
import re
import uuid
from typing import Any, List, Iterable, Mapping
from typing import Optional, Pattern
import traceback
import numpy as np
from uuid import uuid4

from superagi.config.config import get_config
from superagi.lib.logger import logger
from superagi.vector_store.base import VectorStore
from superagi.vector_store.document import Document

from pymongo import MongoClient
from pymongo.operations import SearchIndexModel

def create_mongo_client(
        connection_string: str = None,
) -> MongoClient:
    """
    Creates a MongoDB client instance.

    Returns:
        A MongoClient instance.

    Raises:
        ConnectionError: If unable to connect to the MongoDB server.
    """
    try:
        client = MongoClient(connection_string)
        client.admin.command("ping")
        return client
    except Exception as e:
        raise ConnectionError(f"Failed to connect to MongoDB: {e}")



DOC_PREFIX = "doc:"

CONTENT_KEY = "content"
METADATA_KEY = "metadata"
VECTOR_SCORE_KEY = "vector_score"


class MongoDB(VectorStore):

    def delete_embeddings_from_vector_db(self, ids: List[str]) -> None:
        pass

    def add_embeddings_to_vector_db(self, embeddings: dict) -> None:
        pass #you can store embeddings + more in MongoDB document model
        
    def get_index_stats(self) -> dict:
        pass

    def __init__(
        self, client: MongoClient, embedding_model: Any, class_name: str, text_field: str = "text",
        database_name: str = None, collection_name: str = None, index_name: str = None
    ):
        self.class_name = class_name
        self.embedding_model = embedding_model
        self.text_field = text_field
        self.client = client
        if collection_name is None:
            raise ValueError("Collection name cannot be None")
        if index_name is None:
            raise ValueError("Index name cannot be None")
        
        # This will get the model dimension size by computing the embeddings dimensions
        sentences = "The weather is lovely today in paradise."
        self.dimensions = (self.embedding_model.get_embedding(sentences))

        # check if mongodb collection exists using the client
        self.collection = self.client
        self.db = self.collection[database_name]
        self.index_name = index_name
        # make sure collection/index exists or create it
        self.collection = self.create_collection(collection_name, index_name, "cosine", overwrite=True)

    def create_collection(
            self,
            collection_name: str,
            index_name: str,
            similarity: str,
            overwrite: bool = False,
            get_or_create: bool = True,
        ):
            """
            Create a collection in the vector database and create a vector search index in the collection.

            Args:
                collection_name: str | The name of the collection.
                index_name: str | The name of the index.
                similarity: str | The similarity metric for the vector search index.
                overwrite: bool | Whether to overwrite the collection if it exists. Default is False.
                get_or_create: bool | Whether to get the collection if it exists. Default is True
            """
            # Check if similarity is valid
            if similarity not in ["euclidean", "cosine", "dotProduct"]:
                raise ValueError("Invalid similarity. Allowed values: 'euclidean', 'cosine', 'dotProduct'.")
            # if overwrite is False and get_or_create is False, raise a ValueError
            if not overwrite and not get_or_create:
                raise ValueError("If overwrite is False, get_or_create must be True.")
            # If overwrite is True and the collection already exists, drop the existing collection
            collection_names = self.db.list_collection_names()
            if overwrite and collection_name in collection_names:
                self.db.drop_collection(collection_name)
            # If get_or_create is True and the collection already exists, return the existing collection
            if get_or_create and collection_name in collection_names:
                return self.db[collection_name]
            # If get_or_create is False and the collection already exists, raise a ValueError
            if not get_or_create and collection_name in collection_names:
                raise ValueError(f"Collection {collection_name} already exists.")

            # Create a new collection
            collection = self.db.create_collection(collection_name)
            # Create a vector search index in the collection
            search_index_model = SearchIndexModel(
                definition={
                    "fields": [
                        {"type": "vector", "numDimensions": self.dimensions, "path": "embedding", "similarity": similarity},
                    ]
                },
                name=index_name,
                type="vectorSearch",
            )
            # Create the search index
            try:
                collection.create_search_index(model=search_index_model)
                return collection
            except Exception as e:
                logger.error(f"Error creating search index: {e}")
                raise e
    def add_texts(self, texts: Iterable[str],
                  metadatas: Optional[List[dict]] = None,
                  embeddings: Optional[List[List[float]]] = None,
                  ids: Optional[list[str]] = None,
                  **kwargs: Any) -> List[str]:
        collected_ids = []
        for i, text in enumerate(texts):
            metadata = metadatas[i] if metadatas else {}
            data_object = metadata.copy()
            data_object[self.text_field] = text
            vector = self.embedding_model.get_embedding(text)
            id = str(uuid4())
            self.collection.insert_one({"id": id, "data_object": data_object, "vectors": vector})
            collected_ids.append(id)
        return collected_ids

    def get_matching_text(self, query: str, top_k: int = 5, metadata: Optional[dict] = None, **kwargs: Any) -> List[Document]:
        return []
        
