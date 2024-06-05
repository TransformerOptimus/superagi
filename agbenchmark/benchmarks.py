import sys
import requests
import json
import time
import os

baseUrl = "http://localhost:3000/api"


def setup(config_data: dict) -> tuple[int, int]:
    # check if organization exists
    headers = {"Content-Type": "application/json"}

    organisation = requests.request("GET", f"{baseUrl}/organisations/get/1")
    if organisation.status_code != 200:
        organisation = requests.request(
            "POST", f"{baseUrl}/organisations/add",
            data=json.dumps({"name": "Test Organization", "description": "Test Organization"}),
            headers=headers
        )
        if organisation.status_code != 200:
            print("Error creating organization")
            sys.exit(1)

    org_id = organisation.json()['id']

    user = requests.request("GET", f"{baseUrl}/users/get/1")
    if user.status_code != 200:
        user = requests.request(
            "POST", f"{baseUrl}/users/add",
            data=json.dumps({"name": "Test User", "email": "super6@agi.com", "password": "dummypass", "organisation_id": org_id}),
            headers=headers)
        if user.status_code != 201:
            print("Error creating user")
            sys.exit(1)

    # check if project exists
    project = requests.request("GET", f"{baseUrl}/projects/get/1")
    if project.status_code != 200:
        project = requests.request(
            "POST", f"{baseUrl}/projects/add",
            data=json.dumps({"name": "Test Project", "description": "Test Project", "organization_id": 1}),
            headers=headers
        )
        if project.status_code != 200:
            print("Error creating project")
            sys.exit(1)

    project_id = project.json()['id']

    openai_key = config_data.get('OPENAI_API_KEY', os.getenv('OPENAI_API_KEY'))

    if openai_key is None:
        print("No OpenAI key found")
        sys.exit(1)
    # add openai key
    json_data = {
        'model_source': 'OpenAi',
        'model_api_key': openai_key,
    }

    response = requests.post(f'{baseUrl}/validate-llm-api-key', headers=headers,
                             json=json_data)

    if response.status_code != 200:
        print("No valid OpenAI key found")
        sys.exit(1)

    # add openai key
    json_data = {
        'key': 'model_api_key',
        'value': openai_key,
    }

    response = requests.post(
        f'{baseUrl}/configs/add/organisation/{org_id}',
        headers=headers,
        json=json_data,
    )

    json_data = {
        'key': 'model_source',
        'value': 'OpenAi',
    }

    response = requests.post(
        f'{baseUrl}/configs/add/organisation/{org_id}',
        headers=headers,
        json=json_data,
    )

    return org_id, project_id


def get_tool_ids(tool_names: list) -> list:
    tool_url = f"{baseUrl}/tools/list"
    tool_response = requests.request("GET", tool_url)
    tool_ids = []
    for tool in tool_response.json():
        if tool['name'] in tool_names:
            tool_ids.append(tool['id'])
    return tool_ids

def run_specific_agent(task: str) -> None:
    # create and start the agent here and dynamically pass in the task
    # must have File Toolkit, Search Toolkit minimum
    import yaml
    config_data = {}
    if os.path.exists("config.yaml"):
        with open("config.yaml", "r") as file:
            config_data = yaml.safe_load(file)
    org_id, project_id = setup(config_data)

    list_of_tools = ['Read File', 'Write File', 'WebScraperTool', "CodingTool", "DuckDuckGoSearch"]
    list_of_tool_ids = get_tool_ids(list_of_tools)
    headers = {"Content-Type": "application/json"}

    payload = {
        'status': 'Running',
        'name': 'agent',
        'project_id': project_id,
        'description': 'AI assistant to solve complex problems',
        'goal': [
            f"{task}"
        ],
        'agent_workflow': 'Goal Based Workflow',
        "instruction": [],
        'constraints': [
            "If you are unsure how you previously did something or want to recall past events, thinking about similar events will help you remember.",
            "Ensure the tool and args are as per current plan and reasoning",
            "Exclusively use the tools listed under 'TOOLS'",
            "REMEMBER to format your response as JSON, using double quotes ("") around keys and string values, and commas (,) to separate items in arrays and objects. IMPORTANTLY, to use a JSON object as a string in another JSON object, you need to escape the double quotes.",
        ],
        'toolkits': [],
        'tools': list_of_tool_ids,
        'exit': 'No exit criterion',
        'iteration_interval': 500,
        'model': 'gpt-4',
        'max_iterations': 25,
        'permission_type': 'God Mode',
        'LTM_DB': 'Pinecone',
        'user_timezone': 'Asia/Kolkata',
        'knowledge': None,
    }

    response = requests.request(
        "POST", f"{baseUrl}/agents/create", headers=headers, data=json.dumps(payload)
    )

    print(response.json())

    agent_execution_id = response.json()['execution_id']
    agent_id = response.json()['id']
    _ = requests.request(
        "PUT", f"{baseUrl}/agentexecutions/update/{agent_execution_id}", headers=headers,
        data=json.dumps({'status': 'RUNNING'}))

    with open("agbenchmark/config.json", "r") as f:
        config = json.load(f)

    # Update the output workspace path depending on agentexecution and agentid
    print(response.json(), 'response')
    response = response.json()

    output_path = f"workspace/output/"
    input_path = f"workspace/input/"
    config["workspace"]["output"] = output_path
    config["workspace"]["input"] = input_path

    if "{agent_id}" in config_data.get("RESOURCES_INPUT_ROOT_DIR"):
        config["workspace"]["input"] = config_data["RESOURCES_INPUT_ROOT_DIR"].replace("{agent_id}", "agent_"+str(agent_id))

    if "{agent_id}" in config_data.get("RESOURCES_OUTPUT_ROOT_DIR"):
        config_data["RESOURCES_OUTPUT_ROOT_DIR"] = config_data["RESOURCES_OUTPUT_ROOT_DIR"].replace("{agent_id}", "agent_"+str(agent_id))
        config["workspace"]["output"] = config_data["RESOURCES_OUTPUT_ROOT_DIR"].replace("{agent_execution_id}", "NewRun_"+str(agent_execution_id))

    print(config, 'configerino')
    # config["workspace"]["output"] = os.path.join(
    #     "workspace","output", f"{response['id']}", f"{response['execution_id']}")
    #
    # config["workspace"]["input"] = os.path.join(
    #     "workspace","input", f"{response['id']}", f"{response['execution_id']}")

    with open("agbenchmark/config.json", "w") as f:
        json.dump(config, f)

    # agent execution stream

    # add manual timeout of 120 seconds
    start_time = time.time()
    pause_payload = {"status": "PAUSED"}
    while True:
        agent_stream = requests.request(
            "GET", f"{baseUrl}/agentexecutionfeeds/get/execution/{agent_execution_id}", headers=headers
        )
        if agent_stream.json()['status'] == 'COMPLETED':
            break

        if time.time() - start_time > 120:
            response = requests.request(
                "PUT", f"{baseUrl}/agentexecutions/update/{response['execution_id']}", headers=headers,
                data=json.dumps(pause_payload)
            )
            break
        time.sleep(5)

    # terminate the agent


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script.py <task>")
        sys.exit(1)
    task = sys.argv[1]
    run_specific_agent(task)
