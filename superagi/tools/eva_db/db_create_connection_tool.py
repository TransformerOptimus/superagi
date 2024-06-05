import evadb
from typing import Type, Optional

from pydantic import BaseModel, Field

from superagi.llms.base_llm import BaseLlm
from superagi.tools.base_tool import BaseTool


class DbCreateConnectionSchema(BaseModel):
    db_engine: str = Field(
        ...,
        description="The name of underlying database engine to connect to",
    )
    username: str = Field(
        ...,
        description="The username for connecting to the database",
    )
    host: str = Field(
        ...,
        description="The hostname for connecting to the database",
    )
    port: str = Field(
        ...,
        description="The port for connecting to the database",
    )
    database_name: str = Field(
        ...,
        description="The database name in the underlying engine to connect to",
    )


class DbCreateConnectionTool(BaseTool):
    """
    Register a connection entry within EvaDB, enabling the underlying database engine to execute future queries effectively.

    Attributes:
        name : The name of the tool.
        description : The description of the tool.
        args_schema : The args schema.
    """

    llm: Optional[BaseLlm] = None
    name = "DbCreateConnectionTool"
    description = """
        A tool for establishing connections to the designated database within the corresponding db engine, utilizing user-provided credentials.
        """
    args_schema: Type[DbCreateConnectionSchema] = DbCreateConnectionSchema

    class Config:
        arbitrary_types_allowed = True

    def _execute(
        self, db_engine: str, username: str, host: str, port: str, database_name: str
    ) -> tuple:
        """
        Execute the EvaDB create connection tool.

        Args:
            db_engine: The name of db engine to connect to eg. postgres, sqlite
            username: The username for connecting to the database
            password: The password for connecting to the database
            host: The hostname for connecting to the database
            port: The port for connecting to the database
            database_name: The database name in the underlying engine to connect to

        Returns:
            The response of create connection query
        """
        cursor = evadb.connect().cursor()
        db_connection_name = db_engine + "__" + database_name

        # todo: discuss a better way to get the password from user
        password = ""
        create_db_query = f"""
            CREATE DATABASE IF NOT EXISTS {db_connection_name} 
            WITH ENGINE = "{db_engine}", 
            PARAMETERS = {{
                "user": "{username}",
                "host": "{host}",
                "port": "{port}",
                "database": "{database_name}",
                "password": "{password}"
            }};
        """
        print(f"DbCreateConnectionTool running query {create_db_query}")
        cursor.query(create_db_query).df()
        cursor.close()
        return f"Sucessfully created the desired connection to underlying database engine with name {db_connection_name}. This connection can now be used to query requested database."
