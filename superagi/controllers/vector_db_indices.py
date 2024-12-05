from fastapi_sqlalchemy import db
from fastapi import HTTPException, Depends, Query
from fastapi import APIRouter
from superagi.helper.auth import get_user_organisation
from superagi.models.vector_dbs import Vectordbs
from superagi.models.vector_db_indices import VectordbIndices
from superagi.models.knowledges import Knowledges
from superagi.models.knowledge_configs import KnowledgeConfigs

router = APIRouter()

@router.get("/marketplace/valid_indices/{knowledge_name}")
def get_marketplace_valid_indices(knowledge_name: str, organisation = Depends(get_user_organisation)):
    vector_dbs = Vectordbs.get_vector_db_from_organisation(db.session, organisation)
    knowledge = Knowledges.fetch_knowledge_details_marketplace(knowledge_name)
    knowledge_with_config = KnowledgeConfigs.fetch_knowledge_config_details_marketplace(knowledge['id'])
    pinecone = []
    qdrant = []
    weaviate = []
    mongodb = []
    for vector_db in vector_dbs:
        indices =  VectordbIndices.get_vector_indices_from_vectordb(db.session, vector_db.id)
        for index in indices:
            data = {"id": index.id, "name": index.name}
            data["is_valid_dimension"] = True if index.dimensions == int(knowledge_with_config["dimensions"]) else False
            data["is_valid_state"] = True if index.state != "Custom" else False
            if vector_db.db_type == "Pinecone":
                pinecone.append(data)
            if vector_db.db_type == "Qdrant":
                qdrant.append(data)
            if vector_db.db_type == "Weaviate":
                data["is_valid_dimension"] = True
                weaviate.append(data)
            if vector_db.db_type == "MongoDB":
                mongodb.append(data)
    return {"pinecone": pinecone, "qdrant": qdrant, "weaviate": weaviate, "mongodb": mongodb}

@router.get("/user/valid_indices")
def get_user_valid_indices(organisation = Depends(get_user_organisation)):
    vector_dbs = Vectordbs.get_vector_db_from_organisation(db.session, organisation)
    pinecone = []
    qdrant = []
    weaviate = []
    mongodb = []
    for vector_db in vector_dbs:
        indices =  VectordbIndices.get_vector_indices_from_vectordb(db.session, vector_db.id)
        for index in indices:
            data = {"id": index.id, "name": index.name}
            data["is_valid_state"] = True if index.state == "Custom" else False
            if vector_db.db_type == "Pinecone":
                pinecone.append(data)
            if vector_db.db_type == "Qdrant":
                qdrant.append(data)
            if vector_db.db_type == "Weaviate":
                weaviate.append(data)
            if vector_db.db_type == "Weaviate":
                mongodb.append(data)
    return {"pinecone": pinecone, "qdrant": qdrant, "weaviate": weaviate, "mongodb": mongodb}