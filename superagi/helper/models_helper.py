from typing import List, Dict, Union, Any
from sqlalchemy import text, func, and_, distinct, create_engine, MetaData, Table
from sqlalchemy.orm import Session
from superagi.models.models_config import ModelsConfig
from superagi.models.models import Models
from superagi.models.call_logs import CallLogs
from superagi.llms.hugging_face import HuggingFace
from superagi.helper.encyption_helper import encrypt_data, decrypt_data
import logging

class ModelsHelper:

    def __init__(self, session:Session, organisation_id: int):
        self.session = session
        self.organisation_id = organisation_id

    def storeApiKey(self, model_provider, model_api_key):
        existing_entry = self.session.query(ModelsConfig).filter(and_(ModelsConfig.org_id == self.organisation_id, ModelsConfig.provider == model_provider)).first()

        if existing_entry:
            existing_entry.api_key = encrypt_data(model_api_key)
        else:
            new_entry = ModelsConfig(org_id=self.organisation_id, provider=model_provider, api_key=encrypt_data(model_api_key))
            self.session.add(new_entry)

        self.session.commit()

        return {'message': 'The API key was successfully stored'}

    def fetchApiKeys(self):
        api_key_info = self.session.query(ModelsConfig.provider, ModelsConfig.api_key).filter(
            ModelsConfig.org_id == self.organisation_id).all()

        if not api_key_info:
            logging.error("No API key found for the provided model provider")
            return []

        api_keys = [{"provider": provider, "api_key": decrypt_data(api_key)} for provider, api_key in
                    api_key_info]

        return api_keys

    def fetchApiKey(self, model_provider):
        api_key_data = self.session.query(ModelsConfig.id, ModelsConfig.provider, ModelsConfig.api_key).filter(
            and_(ModelsConfig.org_id == self.organisation_id, ModelsConfig.provider == model_provider)).first()

        if api_key_data is None:
            return []
        else:
            api_key = [{'id': api_key_data.id, 'provider': api_key_data.provider,
                        'api_key': decrypt_data(api_key_data.api_key)}]
            return api_key


    def validateEndPoint(self, model_api_key, end_point, model_provider):
        response = {"success": True}

        if(model_provider == 'Hugging Face'):
            try:
                result = HuggingFace(api_key=model_api_key,end_point=end_point).verify_end_point()
            except Exception as e:
                response['success'] = False
                response['error'] = str(e)
            else:
                response['result'] = result

        return response

    def fetchModelById(self, model_provider_id):
        model = self.session.query(ModelsConfig.provider).filter(ModelsConfig.id == model_provider_id, ModelsConfig.org_id == self.organisation_id).first()
        if model is None:
            return {"error": "Model not found"}
        else:
            return {"provider": model.provider}

    def storeModelDetails(self, model_name, description, end_point, model_provider_id, token_limit, type, version):
        if not model_name:
            return {"error": "Model Name is empty or undefined"}
        if not description:
            return {"error": "Description is empty or undefined"}
        if not model_provider_id:
            return {"error": "Model Provider Id is null or undefined or 0"}
        if not token_limit:
            return {"error": "Token Limit is null or undefined or 0"}

        # Check if model_name already exists in the database
        existing_model = self.session.query(Models).filter(Models.model_name == model_name, Models.org_id == self.organisation_id).first()
        if existing_model:
            return {"error": "Model Name already exists"}

        # Get the provider of the model
        model = self.fetchModelById(model_provider_id)
        if "error" in model:
            return model  # Return error message if model not found

        # Check the 'provider' from ModelsConfig table
        if not end_point and model["provider"] not in ['OpenAI', 'Google Palm', 'Replicate']:
            return {"error": "End Point is empty or undefined"}

        try:
            model = Models(
                model_name=model_name,
                description=description,
                end_point=end_point,
                token_limit=token_limit,
                model_provider_id=model_provider_id,
                type=type,
                version=version,
                org_id=self.organisation_id
            )
            self.session.add(model)
            self.session.commit()

        except Exception as e:
            logging.error(f"Unexpected Error Occured: {e}")
            return {"error": "Unexpected Error Occured"}

        return {"success": "Model Details stored successfully"}

    def fetchModels(self) -> List[Dict[str, Union[str, int]]]:
        try:
            models = self.session.query(Models.id, Models.model_name, Models.description, ModelsConfig.provider).join(ModelsConfig, Models.model_provider_id == ModelsConfig.id).filter(Models.org_id == self.organisation_id).all()

            result = []
            for model in models:
                result.append({
                    "id": model[0],
                    "name": model[1],
                    "description": model[2],
                    "model_provider": model[3]
                })

        except Exception as e:
            logging.error(f"Unexpected Error Occured: {e}")
            return {"error": "Unexpected Error Occured"}

        return result

    def fetchModelDetails(self, model_id: int) -> Dict[str, Union[str, int]]:
        try:
            model = self.session.query(
                Models.id, Models.model_name, Models.description,Models.end_point, Models.token_limit, Models.type,ModelsConfig.provider,
            ).join(
                ModelsConfig, Models.model_provider_id == ModelsConfig.id
            ).filter(
                and_(Models.org_id == self.organisation_id, Models.id == model_id)
            ).first()

            if model:
                return {
                    "id": model[0],
                    "name": model[1],
                    "description": model[2],
                    "end_point": model[3],
                    "token_limit": model[4],
                    "type": model[5],
                    "model_provider": model[6]
                }
            else:
                return {"error": "Model with the given ID doesn't exist."}

        except Exception as e:
            logging.error(f"Unexpected Error Occured: {e}")
            return {"error": "Unexpected Error Occured"}

    def fetchModelTokens(self) -> Dict[str, int]:
        try:
            models = self.session.query(
                Models.model_name, Models.token_limit
            ).filter(
                Models.org_id == self.organisation_id
            ).all()

            if models:
                return dict(models)
            else:
                return {"error": "No models found for the given organisation ID."}

        except Exception as e:
            logging.error(f"Unexpected Error Occured: {e}")
            return {"error": "Unexpected Error Occured"}