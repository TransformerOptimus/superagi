from abc import abstractmethod
from functools import wraps
from inspect import signature
from typing import List
from typing import Optional, Type, Callable, Any, Union, Dict, Tuple
import yaml
from pydantic import BaseModel, create_model, validate_arguments
from superagi.models.tool_config import ToolConfig
from sqlalchemy import Column, Integer, String, Booleans
from superagi.types.key_type import ToolConfigKeyType


from superagi.config.config import get_config


class SchemaSettings:
    """Configuration for the pydantic model."""
    extra = 'allow'
    arbitrary_types_allowed = True


def extract_valid_parameters(
        inferred_type: Type[BaseModel],
        function: Callable,
) -> dict:
    """Get the arguments from a function's signature."""
    schema = inferred_type.model_json_schema()["properties"]
    valid_params = signature(function).parameters
    return {param: schema[param] for param in valid_params if param != "run_manager"}


def _construct_model_subset(
        model_name: str, original_model: BaseModel, required_fields: list
) -> Type[BaseModel]:
    """Create a pydantic model with only a subset of model's fields."""
    fields = {
        field: (
            original_model.__fields__[field].type_,
            original_model.__fields__[field].default,
        )
        for field in required_fields
        if field in original_model.__fields__
    }
    return create_model(model_name, **fields)  # type: ignore


def create_function_schema(
        schema_name: str,
        function: Callable,
) -> Type[BaseModel]:
    """Create a pydantic schema from a function's signature."""
    validated = validate_arguments(function, config=SchemaSettings)  # type: ignore
    inferred_type = validated.model  # type: ignore
    if "run_manager" in inferred_type.__fields__:
        del inferred_type.__fields__["run_manager"]
    valid_parameters = extract_valid_parameters(inferred_type, function)
    return _construct_model_subset(
        f"{schema_name}Schema", inferred_type, list(valid_parameters)
    )


class BaseToolkitConfiguration:

    def __init__(self):
        self.session = None

    def get_tool_config(self, key: str):
        # Default implementation of the tool configuration retrieval logic
        with open("config.yaml") as file:
            config = yaml.safe_load(file)

        # Retrieve the value associated with the given key
        return config.get(key)


class BaseTool(BaseModel):
    name: str = None
    description: str
    args_schema: Type[BaseModel] = None
    permission_required: bool = True
    toolkit_config: BaseToolkitConfiguration = BaseToolkitConfiguration()

    class Config:
        arbitrary_types_allowed = True

    @property
    def args(self):
        if self.args_schema is not None:
            return self.args_schema.model_json_schema()["properties"]
        else:
            name = self.name
            args_schema = create_function_schema(f"{name}Schema", self.execute)
            return args_schema.model_json_schema()["properties"]

    @abstractmethod
    def _execute(self, *args: Any, **kwargs: Any):
        pass

    @property
    def max_token_limit(self):
        return int(get_config("MAX_TOOL_TOKEN_LIMIT", 600))

    def _parse_input(
            self,
            tool_input: Union[str, Dict],
    ) -> Union[str, Dict[str, Any]]:
        """Convert tool input to pydantic model."""
        input_args = self.args_schema
        if isinstance(tool_input, str):
            if input_args is not None:
                key_ = next(iter(input_args.__fields__.keys()))
                input_args.model_validate({key_: tool_input})
            return tool_input
        else:
            if input_args is not None:
                result = input_args.model_validate(tool_input)
                return {k: v for k, v in result.model_dump().items() if k in tool_input}
        return tool_input

    def _to_args_and_kwargs(self, tool_input: Union[str, Dict]) -> Tuple[Tuple, Dict]:
        # For backwards compatibility, if run_input is a string,
        # pass as a positional argument.
        if isinstance(tool_input, str):
            return (tool_input,), {}
        else:
            return (), tool_input

    def execute(
            self,
            tool_input: Union[str, Dict]
    ) -> Any:
        """Run the tool."""
        parsed_input = self._parse_input(tool_input)

        try:
            tool_args, tool_kwargs = self._to_args_and_kwargs(parsed_input)
            observation = (
                self._execute(*tool_args, **tool_kwargs)
            )
        except (Exception, KeyboardInterrupt) as e:
            raise e
        return observation

    @classmethod
    def from_function(cls, func: Callable, args_schema: Type[BaseModel] = None):
        if args_schema:
            return cls(description=func.__doc__, args_schema=args_schema)
        else:
            return cls(description=func.__doc__)

    def get_tool_config(self, key):
        return self.toolkit_config.get_tool_config(key=key)


class FunctionalTool(BaseTool):
    name: str = None
    description: str
    func: Callable
    args_schema: Type[BaseModel] = None

    @property
    def args(self):
        if self.args_schema is not None:
            return self.args_schema.model_json_schema()["properties"]
        else:
            name = self.name
            args_schema = create_function_schema(f"{name}Schema", self.execute)
            return args_schema.model_json_schema()["properties"]

    def _execute(self, *args: Any, **kwargs: Any):
        return self.func(*args, kwargs)

    @classmethod
    def from_function(cls, func: Callable, args_schema: Type[BaseModel] = None):
        if args_schema:
            return cls(description=func.__doc__, args_schema=args_schema)
        else:
            return cls(description=func.__doc__)

    def registerTool(cls):
        cls.__registerTool__ = True
        return cls


def tool(*args: Union[str, Callable], return_direct: bool = False,
         args_schema: Optional[Type[BaseModel]] = None) -> Callable:
    def decorator(func: Callable) -> Callable:
        nonlocal args_schema

        tool_instance = FunctionalTool.from_function(func, args_schema)

        @wraps(func)
        def wrapper(*tool_args, **tool_kwargs):
            if return_direct:
                return tool_instance._exec(*tool_args, **tool_kwargs)
            else:
                return tool_instance

        return wrapper

    if len(args) == 1 and callable(args[0]):
        return decorator(args[0])
    else:
        return decorator
    
class ToolConfiguration:

    def __init__(self, key: str, key_type: str = None, is_required: bool = False, is_secret: bool = False):
        self.key = key
        if is_secret is None:
            self.is_secret = False
        elif isinstance(is_secret, bool):
            self.is_secret = is_secret
        else:
            raise ValueError("is_secret should be a boolean value")
        if is_required is None:
            self.is_required = False
        elif isinstance(is_required, bool):
            self.is_required = is_required
        else:
            raise ValueError("is_required should be a boolean value")
        
        if key_type is None:
            self.key_type = ToolConfigKeyType.STRING
        elif isinstance(key_type,ToolConfigKeyType):
            self.key_type = key_type
        else:
            raise ValueError("key_type should be string/file/integer")


class BaseToolkit(BaseModel):
    name: str
    description: str

    @abstractmethod
    def get_tools(self) -> List[BaseTool]:
        # Add file related tools object here
        pass

    @abstractmethod
    def get_env_keys(self) -> List[str]:
        # Add file related config keys here
        pass
