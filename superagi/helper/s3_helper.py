import json

import boto3
from fastapi import HTTPException

from superagi.config.config import get_config
from superagi.lib.logger import logger
from urllib.parse import unquote
import json


class S3Helper:
    def __init__(self, bucket_name=get_config("BUCKET_NAME")):
        """
        Initialize the S3Helper class.
        Using the AWS credentials from the configuration file, create a boto3 client.
        """
        self.s3 = S3Helper.__get_s3_client()
        self.bucket_name = bucket_name

    @classmethod
    def __get_s3_client(cls):
        """
        Get an S3 client.

        Returns:
            s3 (S3Helper): The S3Helper object.
        """
        return boto3.client(
            's3',
            aws_access_key_id=get_config("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=get_config("AWS_SECRET_ACCESS_KEY"),
        )

    def upload_file(self, file, path):
        """
        Upload a file to S3.

        Args:
            file (FileStorage): The file to upload.
            path (str): The path to upload the file to.

        Raises:
            HTTPException: If the AWS credentials are not found.

        Returns:
            None
        """
        try:
            self.s3.upload_fileobj(file, self.bucket_name, path)
            logger.info("File uploaded to S3 successfully!")
        except Exception:
            raise HTTPException(status_code=500, detail="AWS credentials not found. Check your configuration.")

    def check_file_exists_in_s3(self, file_path):
        response = self.s3.list_objects_v2(Bucket=get_config("BUCKET_NAME"), Prefix="resources" + file_path)
        return 'Contents' in response
    
    def get_file_size(self, file_path):
        """
        Get the file size of a specific file in S3.

        Args:
            file_path (str): The path to the file.

        Raises:
            HTTPException: If the AWS credentials are not found.

        Returns:
            int: The size of the file in bytes.
        """
        try:
            file_info = self.s3.head_object(Bucket=self.bucket_name, Key=file_path)
            file_size = file_info['ContentLength']
            logger.info("File size retrieved from S3 successfully!")
            return file_size
        except:
            raise HTTPException(status_code=500, detail="AWS credentials not found. Check your configuration.")

    def read_from_s3(self, file_path):
        file_path = "resources" + file_path
        logger.info(f"Reading file from s3: {file_path}")
        response = self.s3.get_object(Bucket=get_config("BUCKET_NAME"), Key=file_path)
        if response['ResponseMetadata']['HTTPStatusCode'] == 200:
            return response['Body'].read().decode('utf-8')
        raise Exception(f"Error read_from_s3: {response}")

    def read_binary_from_s3(self, file_path):
        file_path = "resources" + file_path
        logger.info(f"Reading file from s3: {file_path}")
        response = self.s3.get_object(Bucket=get_config("BUCKET_NAME"), Key=file_path)
        if response['ResponseMetadata']['HTTPStatusCode'] == 200:
            return response['Body'].read()
        raise Exception(f"Error read_from_s3: {response}")

    def get_json_file(self, path):
        """
        Get a JSON file from S3.
        Args:
            path (str): The path to the JSON file.
        Raises:
            HTTPException: If the AWS credentials are not found.
        Returns:
            dict: The JSON file.
        """
        try:
            obj = self.s3.get_object(Bucket=self.bucket_name, Key=path)
            s3_response = obj['Body'].read().decode('utf-8')
            return json.loads(s3_response)
        except:
            raise HTTPException(status_code=500, detail="AWS credentials not found. Check your configuration.")

    def delete_file(self, path):
        """
        Delete a file from S3.

        Args:
            path (str): The path to the file to delete.

        Raises:
            HTTPException: If the AWS credentials are not found.

        Returns:
            None
        """
        try:
            path = "resources" + path
            self.s3.delete_object(Bucket=self.bucket_name, Key=path)
            logger.info("File deleted from S3 successfully!")
        except:
            raise HTTPException(status_code=500, detail="AWS credentials not found. Check your configuration.")

    def upload_file_content(self, content, file_path):
        try:
            self.s3.put_object(Bucket=self.bucket_name, Key=file_path, Body=content)
        except:
            raise HTTPException(status_code=500, detail="AWS credentials not found. Check your configuration.")

    def get_download_url_of_resources(self, db_resources_arr):
        s3 = boto3.client(
            's3',
            aws_access_key_id=get_config("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=get_config("AWS_SECRET_ACCESS_KEY"),
        )
        response_obj = {}
        for db_resource in db_resources_arr:
            response = self.s3.get_object(Bucket=get_config("BUCKET_NAME"), Key=db_resource.path)
            content = response["Body"].read()
            bucket_name = get_config("INSTAGRAM_TOOL_BUCKET_NAME")
            file_name = db_resource.path.split('/')[-1]
            file_name = ''.join(char for char in file_name if char != "`")
            object_key = f"public_resources/run_id{db_resource.agent_execution_id}/{file_name}"
            s3.put_object(Bucket=bucket_name, Key=object_key, Body=content)
            file_url = f"https://{bucket_name}.s3.amazonaws.com/{object_key}"
            resource_execution_id = db_resource.agent_execution_id
            if resource_execution_id in response_obj:
                response_obj[resource_execution_id].append(file_url)
            else:
                response_obj[resource_execution_id] = [file_url]
        return response_obj

    def list_files_from_s3(self, file_path):
        try:
            file_path = "resources" + file_path
            logger.info(f"Listing files from s3 with prefix: {file_path}")
            response = self.s3.list_objects_v2(Bucket=get_config("BUCKET_NAME"), Prefix=file_path)
            if 'Contents' in response:
                logger.info(response['Contents'])
                file_list = [obj['Key'] for obj in response['Contents']]
                return file_list
            else:
                raise Exception(f"No contents in S3 response")
        except:
            raise Exception(f"Error listing files from s3")
