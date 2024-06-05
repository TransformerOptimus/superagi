import evadb
from typing import Type, Optional

from pydantic import BaseModel, Field

from superagi.llms.base_llm import BaseLlm
from superagi.tools.base_tool import BaseTool


class DbQueryConnectionSchema(BaseModel):
    db_connection: str = Field(
        ...,
        description="The name of the connection on which the provided query should be executed. This connection is created using create connection tool",
    )
    query: str = Field(
        ...,
        description="The query to be executed on the connection through EvaDB",
    )


class DbQueryConnectionTool(BaseTool):
    """
    Executes the provided query on the provided db connection using EvaDB.

    Attributes:
        name : The name of the tool.
        description : The description of the tool.
        args_schema : The args schema.
    """

    llm: Optional[BaseLlm] = None
    name = "DbQueryConnectionTool"
    description = "A tool for executing queries on the provided connection using EvaDB"
    args_schema: Type[DbQueryConnectionSchema] = DbQueryConnectionSchema

    class Config:
        arbitrary_types_allowed = True

    def _execute(self, db_connection: str, query: str) -> tuple:
        """
        Execute the EvaDB execute query tool

        Args:
            db_connection: the connection on which the query should be executed
            query : the query which should be executed on the provided connection

        Returns:
            Response of executed query.
        """
        db_query = """
            USE {db_connection} {{
                {query}
            }};
        """.format(
            db_connection=db_connection, query=query.strip(";")
        )

        print("DbQueryConnectionTool running {db_query} ....")
        cursor = evadb.connect().cursor()
        response = cursor.query(db_query).df().to_string()
        print(f"DbQueryConnectionTool query response {response}")
        cursor.close()

        return (
            "Successfully executed the provided query",
            "result: " + response,
        )
