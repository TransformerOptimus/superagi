from abc import ABC
from superagi.tools.base_tool import BaseToolkit, BaseTool, ToolConfiguration
from typing import Type, List
from superagi.tools.eva_db.db_create_connection_tool import DbCreateConnectionTool
from superagi.tools.eva_db.db_query_connection_tool import DbQueryConnectionTool
from superagi.types.key_type import ToolConfigKeyType


class DbToolkit(BaseToolkit, ABC):
    name: str = "Eva DB Toolkit"
    description: str = "Eva DB toolkit contains all tools related to executing queries over underlying database"

    def get_tools(self) -> List[BaseTool]:
        return [DbCreateConnectionTool(), DbQueryConnectionTool()]

    def get_env_keys(self) -> List[ToolConfiguration]:
        return []