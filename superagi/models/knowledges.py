from __future__ import annotations

from sqlalchemy import Column, Integer, String
import requests

# from superagi.models import AgentConfiguration
from superagi.models.base_model import DBBaseModel

#marketplace_url = "https://app.superagi.com/api"
marketplace_url = "http://localhost:8001"

class Knowledges(DBBaseModel):
    """
    Represents an knowledge entity.

    Attributes:
        id (int): The unique identifier of the knowledge.
        name (str): The name of the knowledge.
        description (str): The description of the knowledge.
        vector_db_index_id (int): The index associated with the knowledge.
        is_deleted (int): The flag for deletion/uninstallation of a knowledge.
        organisation_id (int): The identifier of the associated organisation.
    """

    __tablename__ = 'knowledges'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String)
    description = Column(String)
    vector_db_index_id = Column(Integer)
    organisation_id = Column(Integer)
    contributed_by = Column(String)

    def __repr__(self):
        """
        Returns a string representation of the Knowledge object.

        Returns:
            str: String representation of the Knowledge.

        """
        return f"Knowledge(id={self.id}, name='{self.name}', description='{self.description}', " \
               f"vector_db_index_id={self.vector_db_index_id}), organisation_id={self.organisation_id}, contributed_by={self.contributed_by})"

    @classmethod
    def fetch_marketplace_list(cls, page):
        headers = {'Content-Type': 'application/json'}
        response = requests.get(
            marketplace_url + f"/knowledges/marketplace/list/{str(page)}",
            headers=headers, timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            return []
    
    @classmethod
    def get_knowledge_install_details(cls, session, marketplace_knowledges, organisation):
        installed_knowledges = session.query(Knowledges).filter(Knowledges.organisation_id == organisation.id).all()
        for knowledge in marketplace_knowledges:
            if knowledge["name"] in [installed_knowledge.name for installed_knowledge in installed_knowledges]:
                knowledge["is_installed"] = True
            else:
                knowledge["is_installed"] = False
        return marketplace_knowledges
    
    @classmethod
    def get_organisation_knowledges(cls, session, organisation):
        knowledges = session.query(Knowledges).filter(Knowledges.organisation_id == organisation.id).all()
        knowledge_data = []
        for knowledge in knowledges:
            data = {
                "id": knowledge.id,
                "name": knowledge.name,
                "contributed_by": knowledge.contributed_by
            }
            knowledge_data.append(data)
        return knowledge_data
    
    @classmethod
    def fetch_knowledge_details_marketplace(cls, knowledge_name):
        headers = {'Content-Type': 'application/json'}
        response = requests.get(
            marketplace_url + f"/knowledges/marketplace/details/{knowledge_name}",
            headers=headers, timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            return []
    
    @classmethod
    def get_knowledge_from_id(cls, session, knowledge_id):
        knowledge = session.query(Knowledges).filter(Knowledges.id == knowledge_id).first()
        return knowledge
    
    @classmethod
    def add_update_knowledge(cls, session, knowledge_data):
        knowledge = session.query(Knowledges).filter(Knowledges.id == knowledge_data["id"], Knowledges.organisation_id == knowledge_data["organisation_id"]).first()
        if knowledge:
            knowledge.name = knowledge_data["name"]
            knowledge.description = knowledge_data["description"]
            knowledge.vector_db_index_id = knowledge_data["index_id"]
        else:
            knowledge = Knowledges(name=knowledge_data["name"], description=knowledge_data["description"], vector_db_index_id=knowledge_data["index_id"], organisation_id=knowledge_data["organisation_id"], contributed_by=knowledge_data["contributed_by"])
            session.add(knowledge)
        session.commit()
        return knowledge
    
    @classmethod
    def delete_knowledge(cls, session, knowledge_id):
        session.query(Knowledges).filter(Knowledges.id == knowledge_id).delete()
        session.commit()

    @classmethod
    def delete_knowledge_from_vector_index(cls, session, vector_db_index_id):
        session.query(Knowledges).filter(Knowledges.vector_db_index_id == vector_db_index_id).delete()
        session.commit()