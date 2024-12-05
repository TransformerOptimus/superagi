import React, {useState, useEffect, useRef} from 'react';
import Image from "next/image";
import {ToastContainer, toast} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  createAgent,
  editAgentTemplate,
  fetchAgentTemplateConfigLocal,
  getOrganisationConfig,
  getLlmModels,
  updateExecution,
  uploadFile,
  getAgentDetails, addAgentRun, fetchModels,
  getAgentWorkflows, publishTemplateToMarketplace
} from "@/pages/api/DashboardService";
import {formatBytes, openNewTab, removeTab, setLocalStorageValue, setLocalStorageArray, returnResourceIcon, getUserTimezone, createInternalId, preventDefault, excludedToolkits, getUserClick} from "@/utils/utils";
import {EventBus} from "@/utils/eventBus";
import styles from "@/pages/Content/Agents/Agents.module.css";
import styles1 from "@/pages/Content/Knowledge/Knowledge.module.css";
import 'moment-timezone';
import AgentSchedule from "@/pages/Content/Agents/AgentSchedule";

export default function AgentCreate({
                                      sendAgentData,
                                      knowledge,
                                      selectedProjectId,
                                      fetchAgents,
                                      toolkits,
                                      organisationId,
                                      template,
                                      internalId,
                                      sendKnowledgeData,
                                      env,
                                      edit,
                                      editAgentId,
                                      agents
                                    }) {
  const [advancedOptions, setAdvancedOptions] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [agentTemplateId, setAgentTemplateId] = useState(null);
  const [agentDescription, setAgentDescription] = useState("");
  const [longTermMemory, setLongTermMemory] = useState(true);
  const [addResources, setAddResources] = useState(true);
  const [input, setInput] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [createClickable, setCreateClickable] = useState(true);
  const fileInputRef = useRef(null);
  const [maxIterations, setIterations] = useState(25);
  const [toolkitList, setToolkitList] = useState(toolkits)
  const [searchValue, setSearchValue] = useState('');
  const [showButton, setShowButton] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [modelsArray, setModelsArray] = useState(['gpt-4', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k']);

  const constraintsArray = [
    "If you are unsure how you previously did something or want to recall past events, thinking about similar events will help you remember.",
    "Ensure the tool and args are as per current plan and reasoning",
    'Exclusively use the tools listed under "TOOLS"',
    "REMEMBER to format your response as JSON, using double quotes (\"\") around keys and string values, and commas (,) to separate items in arrays and objects. IMPORTANTLY, to use a JSON object as a string in another JSON object, you need to escape the double quotes."
  ];
  const [constraints, setConstraints] = useState(constraintsArray);

  const [goals, setGoals] = useState(['Describe the agent goals here']);
  const [instructions, setInstructions] = useState(['']);

  const models = ['gpt-4', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k']
  const [model, setModel] = useState(models[1]);
  const modelRef = useRef(null);
  const [modelDropdown, setModelDropdown] = useState(false);

  const [agentWorkflows, setAgentWorkflows] = useState('');
  const [agentWorkflow, setAgentWorkflow] = useState(agentWorkflows[0]);

  const agentRef = useRef(null);
  const [agentDropdown, setAgentDropdown] = useState(false);

  const exitCriteria = ["No exit criterion", "System defined", "User defined", "Number of steps/tasks"]
  const [exitCriterion, setExitCriterion] = useState(exitCriteria[0]);
  const exitRef = useRef(null);
  const [exitDropdown, setExitDropdown] = useState(false);

  const [stepTime, setStepTime] = useState(500);

  const rollingRef = useRef(null);
  const [rollingDropdown, setRollingDropdown] = useState(false);

  const [selectedKnowledge, setSelectedKnowledge] = useState('');
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState(null);
  const knowledgeRef = useRef(null);
  const [knowledgeDropdown, setKnowledgeDropdown] = useState(false);

  const databases = ["Pinecone", "MongoDB"]
  const [database, setDatabase] = useState(databases[0]);
  const databaseRef = useRef(null);
  const [databaseDropdown, setDatabaseDropdown] = useState(false);

  const permissions = ["God Mode", "RESTRICTED (Will ask for permission before using any tool)"]
  const [permission, setPermission] = useState(permissions[0]);
  const permissionRef = useRef(null);
  const [permissionDropdown, setPermissionDropdown] = useState(false);

  const [selectedTools, setSelectedTools] = useState([]);
  const [toolNames, setToolNames] = useState(['SearxSearch', 'Read File', 'Write File']);
  const toolkitRef = useRef(null);
  const [toolkitDropdown, setToolkitDropdown] = useState(false);

  const [hasAPIkey, setHasAPIkey] = useState(false);

  const [createDropdown, setCreateDropdown] = useState(false);
  const [createModal, setCreateModal] = useState(false);

  const [scheduleData, setScheduleData] = useState(null);
  const [editModal, setEditModal] = useState(false)
  const [editButtonClicked, setEditButtonClicked] = useState(false);

  const [dropdown, setDropdown] = useState(false);
  const [publishModal, setPublishModal] = useState(false);


  useEffect(() => {
    getOrganisationConfig(organisationId, "model_api_key")
      .then((response) => {
        console.log(response.data['api_key'])
        const apiKey = response.data['api_key']
        setHasAPIkey(!(apiKey === null));
      })
      .catch((error) => {
        console.error('Error fetching project:', error);
      });
  }, [organisationId]);

  const filterToolsByNames = () => {
    if (toolkitList) {
      const selectedToolIds = toolkits
        .flatMap(toolkit => toolkit.tools)
        .filter(tool => toolNames.includes(tool.name))
        .map(tool => tool.id);

      setLocalStorageArray("tool_ids_" + String(internalId), selectedToolIds, setSelectedTools);
    }
  };

  const handleIterationChange = (event) => {
    setLocalStorageValue("agent_iterations_" + String(internalId), parseInt(event.target.value), setIterations);
  };

  useEffect(() => {
    filterToolsByNames();
  }, [toolNames]);

  useEffect(() => {
    fetchModels()
      .then((response) => {
        const models = response.data.map(model => model.name) || [];
        const selected_model = localStorage.getItem("agent_model_" + String(internalId)) || '';
        setModelsArray(models);
        if (models.length > 0 && !selected_model) {
          setLocalStorageValue("agent_model_" + String(internalId), models[0], setModel);
        } else {
          setModel(selected_model);
        }
        console.log(response)
      })
      .catch((error) => {
        console.error('Error fetching models:', error);
      });

    getAgentWorkflows()
      .then((response) => {
        const agentWorkflows = response.data || [];
        const selectedAgentWorkflow = localStorage.getItem("agent_workflow_" + String(internalId)) || '';
        setAgentWorkflows(agentWorkflows);
        if (agentWorkflows.length > 0 && !selectedAgentWorkflow) {
          setLocalStorageValue("agent_workflow_" + String(internalId), agentWorkflows[0], setAgentWorkflow);
        } else {
          setAgentWorkflow(selectedAgentWorkflow);
        }
      })
      .catch((error) => {
        console.error('Error fetching agent workflows:', error);
      });
    if (edit) {
      editingAgent();
    }

    if (template !== null) {
      fillDetails(template)
      setLocalStorageValue("agent_template_id_" + String(internalId), template.id, setAgentTemplateId);

      fetchAgentTemplateConfigLocal(template.id)
        .then((response) => {
          const data = response.data || [];
          fillAdvancedDetails(data)
          setLocalStorageArray("tool_names_" + String(internalId), data.tools, setToolNames);
          setLocalStorageValue("is_agent_template_" + String(internalId), true, setShowButton);
          setShowButton(true);
        })
        .catch((error) => {
          console.error('Error fetching template details:', error);
        });
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (modelRef.current && !modelRef.current.contains(event.target)) {
        setModelDropdown(false)
      }

      if (agentRef.current && !agentRef.current.contains(event.target)) {
        setAgentDropdown(false)
      }

      if (exitRef.current && !exitRef.current.contains(event.target)) {
        setExitDropdown(false)
      }

      if (rollingRef.current && !rollingRef.current.contains(event.target)) {
        setRollingDropdown(false)
      }

      if (knowledgeRef.current && !knowledgeRef.current.contains(event.target)) {
        setKnowledgeDropdown(false)
      }

      if (databaseRef.current && !databaseRef.current.contains(event.target)) {
        setDatabaseDropdown(false)
      }

      if (permissionRef.current && !permissionRef.current.contains(event.target)) {
        setPermissionDropdown(false)
      }

      if (toolkitRef.current && !toolkitRef.current.contains(event.target)) {
        setToolkitDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const addTool = (tool) => {
    if (!selectedTools.includes(tool.id) && !toolNames.includes(tool.name)) {
      const updatedToolIds = [...selectedTools, tool.id];
      setLocalStorageArray("tool_ids_" + String(internalId), updatedToolIds, setSelectedTools);

      const updatedToolNames = [...toolNames, tool.name];
      setLocalStorageArray("tool_names_" + String(internalId), updatedToolNames, setToolNames);
    }
    setSearchValue('');
  };

  const editingAgent = () => {
    const isLoaded = localStorage.getItem('is_editing_agent_' + String(internalId));
    const agent = agents.find(agent => agent.id === editAgentId);
    if (!isLoaded) {
      fillDetails(agent)
    }
    getAgentDetails(editAgentId, -1)
        .then((response) => {
          const data = response.data || []
          if (!isLoaded) {
            fillAdvancedDetails(data)
            setLocalStorageArray("tool_names_" + String(internalId), data.tools.map(tool => tool.name), setToolNames);
          }
        })
        .catch((error) => {
          console.error('Error fetching agent details:', error);
        });
    localStorage.setItem('is_editing_agent_' + String(internalId), true);
  };

  const fillDetails = (agent) => {
    setLocalStorageValue("agent_name_" + String(internalId), agent.name, setAgentName);
    setLocalStorageValue("agent_description_" + String(internalId), agent.description, setAgentDescription);
    setLocalStorageValue("advanced_options_" + String(internalId), true, setAdvancedOptions);
  }
  const fillAdvancedDetails = (data) => {
    setLocalStorageArray("agent_goals_" + String(internalId), data.goal, setGoals);
    setLocalStorageValue("agent_workflow_" + String(internalId), data.agent_workflow, setAgentWorkflow);
    setLocalStorageArray("agent_constraints_" + String(internalId), data.constraints, setConstraints);
    setLocalStorageValue("agent_iterations_" + String(internalId), data.max_iterations, setIterations);
    setLocalStorageValue("agent_step_time_" + String(internalId), data.iteration_interval, setStepTime);
    setLocalStorageValue("agent_permission_" + String(internalId), data.permission_type, setPermission);
    setLocalStorageArray("agent_instructions_" + String(internalId), data.instruction, setInstructions);
    setLocalStorageValue("agent_database_" + String(internalId), data.LTM_DB, setDatabase);
    setLocalStorageValue("agent_model_" + String(internalId), data.model, setModel);
  }


  const addToolkit = (toolkit) => {
    const updatedToolIds = [...selectedTools];
    const updatedToolNames = [...toolNames];

    toolkit.tools.map((tool) => {
      if (!selectedTools.includes(tool.id) && !toolNames.includes(tool.name)) {
        updatedToolIds.push(tool.id);
        updatedToolNames.push(tool.name);
      }
    });

    setLocalStorageArray("tool_ids_" + String(internalId), updatedToolIds, setSelectedTools);
    setLocalStorageArray("tool_names_" + String(internalId), updatedToolNames, setToolNames);
    setSearchValue('');
  }

  const removeTool = (indexToDelete) => {
    const updatedToolIds = [...selectedTools];
    updatedToolIds.splice(indexToDelete, 1);
    setLocalStorageArray("tool_ids_" + String(internalId), updatedToolIds, setSelectedTools);

    const updatedToolNames = [...toolNames];
    updatedToolNames.splice(indexToDelete, 1);
    setLocalStorageArray("tool_names_" + String(internalId), updatedToolNames, setToolNames);
  };

  const handlePermissionSelect = (index) => {
    setLocalStorageValue("agent_permission_" + String(internalId), permissions[index], setPermission);
    setPermissionDropdown(false);
  };

  const handleDatabaseSelect = (index) => {
    setLocalStorageValue("agent_database_" + String(internalId), databases[index], setDatabase);
    setDatabaseDropdown(false);
  };


  const handleKnowledgeSelect = (index) => {
    setLocalStorageValue("agent_knowledge_" + String(internalId), knowledge[index].name, setSelectedKnowledge);
    setLocalStorageValue("agent_knowledge_id_" + String(internalId), knowledge[index].id, setSelectedKnowledgeId);
    setKnowledgeDropdown(false);
  };

  const handleStepChange = (event) => {
    setLocalStorageValue("agent_step_time_" + String(internalId), event.target.value, setStepTime);
  };

  const handleExitSelect = (index) => {
    setLocalStorageValue("agent_exit_criterion_" + String(internalId), exitCriteria[index], setExitCriterion);
    setExitDropdown(false);
  };

  const handleAgentSelect = (index) => {
    setLocalStorageValue("agent_workflow_" + String(internalId), agentWorkflows[index], setAgentWorkflow);
    setAgentDropdown(false);
  };

  const handleModelSelect = (index) => {
    setLocalStorageValue("agent_model_" + String(internalId), modelsArray[index], setModel);
    if (modelsArray[index] === "google-palm-bison-001" || modelsArray[index] === "replicate-llama13b-v2-chat") {
      setAgentType("Fixed Task Queue")
    }
    setModelDropdown(false);
  };

  const handleGoalChange = (index, newValue) => {
    const updatedGoals = [...goals];
    updatedGoals[index] = newValue;
    setLocalStorageArray("agent_goals_" + String(internalId), updatedGoals, setGoals);
  };

  const handleInstructionChange = (index, newValue) => {
    const updatedInstructions = [...instructions];
    updatedInstructions[index] = newValue;
    setLocalStorageArray("agent_instructions_" + String(internalId), updatedInstructions, setInstructions);
  };

  const handleConstraintChange = (index, newValue) => {
    const updatedConstraints = [...constraints];
    updatedConstraints[index] = newValue;
    setLocalStorageArray("agent_constraints_" + String(internalId), updatedConstraints, setConstraints);
  };

  const handleGoalDelete = (index) => {
    const updatedGoals = [...goals];
    updatedGoals.splice(index, 1);
    setLocalStorageArray("agent_goals_" + String(internalId), updatedGoals, setGoals);
  };

  const handleInstructionDelete = (index) => {
    const updatedInstructions = [...instructions];
    updatedInstructions.splice(index, 1);
    setLocalStorageArray("agent_instructions_" + String(internalId), updatedInstructions, setInstructions);
  };

  const handleConstraintDelete = (index) => {
    const updatedConstraints = [...constraints];
    updatedConstraints.splice(index, 1);
    setLocalStorageArray("agent_constraints_" + String(internalId), updatedConstraints, setConstraints);
  };

  const addGoal = () => {
    setLocalStorageArray("agent_goals_" + String(internalId), [...goals, 'new goal'], setGoals);
  };

  const addInstruction = () => {
    setLocalStorageArray("agent_instructions_" + String(internalId), [...instructions, 'new instructions'], setInstructions);
  };

  const addConstraint = () => {
    setLocalStorageArray("agent_constraints_" + String(internalId), [...constraints, 'new constraint'], setConstraints);
  };

  const handleNameChange = (event) => {
    setLocalStorageValue("agent_name_" + String(internalId), event.target.value, setAgentName);
  };

  const handleDescriptionChange = (event) => {
    setLocalStorageValue("agent_description_" + String(internalId), event.target.value, setAgentDescription);
  };

  const closeCreateModal = () => {
    setCreateModal(false);
    setCreateDropdown(false);
  };

  function uploadResource(agentId, fileData) {
    const formData = new FormData();
    formData.append('file', fileData.file);
    formData.append('name', fileData.name);
    formData.append('size', fileData.size);
    formData.append('type', fileData.type);

    return uploadFile(agentId, formData);
  }

  useEffect(() => {
    const keySet = (eventData) => {
      setHasAPIkey(true);
    };

    const handleAgentScheduling = (item) => {
      setScheduleData(item)
    };

    EventBus.on('keySet', keySet);
    EventBus.on('handleAgentScheduling', handleAgentScheduling);

    return () => {
      EventBus.off('keySet', keySet);
      EventBus.off('handleAgentScheduling', handleAgentScheduling);
    };
  });

  useEffect(() => {
    if (scheduleData) {
      handleAddAgent()
    }
  }, [scheduleData]);

  const validateAgentData = (isNewAgent) => {
    if (isNewAgent && !hasAPIkey) {
      toast.error("Your API key is empty!", {autoClose: 1800});
      openNewTab(-3, "Settings", "Settings", false);
      return false;
    }

    if (agentName?.replace(/\s/g, '') === '') {
      toast.error("Agent name can't be blank", {autoClose: 1800});
      return false;
    }

    if (agentDescription?.replace(/\s/g, '') === '') {
      toast.error("Agent description can't be blank", {autoClose: 1800});
      return false;
    }

    const isEmptyGoal = goals.some((goal) => goal.replace(/\s/g, '') === '');
    if (isEmptyGoal) {
      toast.error("Goal can't be empty", {autoClose: 1800});
      return false;
    }

    if (selectedTools.length <= 0) {
      toast.error("Add atleast one tool", {autoClose: 1800});
      return false;
    }

    if (!modelsArray.includes(model)) {
      toast.error("Your key does not have access to the selected model", {autoClose: 1800});
      return false;
    }

    if (toolNames.includes('Knowledge Search') && !selectedKnowledge) {
      toast.error("Add atleast one knowledge", {autoClose: 1800});
      return;
    }

    return true;
  }

  const handleAddAgent = async () => {
    if (!validateAgentData(true)) {
      return;
    }

    setCreateClickable(false);

    const agentData = setAgentData()

    const scheduleAgentData = {
      "agent_config": agentData,
      "schedule": scheduleData,
    }

    if(edit){
      if (editButtonClicked) return;
      setEditButtonClicked(true);
      agentData.agent_id = editAgentId;
      const name = agentData.name
      const adjustedDate = new Date((new Date()).getTime());
      const formattedDate = `${adjustedDate.getDate()} ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][adjustedDate.getMonth()]} ${adjustedDate.getFullYear()} ${adjustedDate.getHours().toString().padStart(2, '0')}:${adjustedDate.getMinutes().toString().padStart(2, '0')}`;
      agentData.name = "Run " + formattedDate
      addAgentRun(agentData)
        .then((response) => {
        if(response){
          fetchAgents();
          uploadResources(editAgentId, name)
        }
      })
    }
    else
      {
        createAgent(createModal ? scheduleAgentData : agentData, createModal)
            .then((response) => {
              const agentId = response.data.id;
              const name = response.data.name;
              const executionId = response.data.execution_id;
              fetchAgents();
              getUserClick('Agent Created Successfully', {'templateName': template?.id ? template.name : ''})
              getUserClick('Agent Run created successfully', {})
              uploadResources(agentId, name, executionId)
            })
            .catch((error) => {
              console.error('Error creating agent:', error);
              setCreateClickable(true);
            });
      }
  };
  const setAgentData= () => {
    let permission_type = permission;
    if (permission.includes("RESTRICTED")) {
      permission_type = "RESTRICTED";
    }

    const agentData = {
      "name": agentName,
      "project_id": selectedProjectId,
      "description": agentDescription,
      "goal": goals,
      "instruction": instructions,
      "agent_workflow": agentWorkflow,
      "constraints": constraints,
      "toolkits": [],
      "tools": selectedTools,
      "exit": exitCriterion,
      "iteration_interval": stepTime,
      "model": model,
      "max_iterations": maxIterations,
      "permission_type": permission_type,
      "LTM_DB": longTermMemory ? database : null,
      "user_timezone": getUserTimezone(),
      "knowledge": toolNames.includes('Knowledge Search') ? selectedKnowledgeId : null,
    };

    return agentData
  }
  const uploadResources = (agentId, name, executionId) => {
    if (addResources && input.length > 0) {
      const uploadPromises = input.map(fileData => {
        return uploadResource(agentId, fileData)
            .catch(error => {
              console.error('Error uploading resource:', error);
              return Promise.reject(error);
            });
      });

      Promise.all(uploadPromises)
          .then(() => {
            runDecision(agentId, name, executionId)
          })
          .catch(error => {
            console.error('Error uploading files:', error);
            setCreateClickable(true);
          });
    } else {
      runDecision(agentId, name, executionId)
    }
  }

  const runDecision = (agentId, name, executionId) => {
    if(edit){
      setEditModal(false)
      sendAgentData({
        id: editAgentId,
        name: name,
        contentType: "Agents",
      });
      removeTab(editAgentId, name, "Agents", internalId)
    }
    else {
      runExecution(agentId, name, executionId, createModal);
    }
  }

  const finaliseAgentCreation = (agentId, name, executionId) => {
    toast.success('Agent created successfully', {autoClose: 1800});
    let timeoutValue = executionId ? 0 : 1500;

    setTimeout(() => {
      sendAgentData({
        id: agentId,
        name: name,
        contentType: "Agents",
        execution_id: executionId,
        internalId: createInternalId()
      });
      setCreateClickable(true);
      setCreateModal(false);
    }, timeoutValue)
  }

  function runExecution(agentId, name, executionId, createModal) {
    if (createModal) {
      finaliseAgentCreation(agentId, name, null);
      return;
    }

    updateExecution(executionId, {"status": 'RUNNING'})
      .then((response) => {
        finaliseAgentCreation(agentId, name, executionId);
      })
      .catch((error) => {
        setCreateClickable(true);
        console.error('Error updating execution:', error);
      });
  }

  const toggleToolkit = (e, id) => {
    e.stopPropagation();
    const toolkitToUpdate = toolkitList.find(toolkit => toolkit.id === id);
    if (toolkitToUpdate) {
      const newOpenValue = !toolkitToUpdate.isOpen;
      setToolkitOpen(id, newOpenValue);
    }
  };

  const setToolkitOpen = (id, isOpen) => {
    const updatedToolkits = toolkitList.map(toolkit =>
      toolkit.id === id ? {...toolkit, isOpen: isOpen} : {...toolkit, isOpen: false}
    );
    setToolkitList(updatedToolkits);
  };

  const clearTools = (e) => {
    e.stopPropagation();
    setLocalStorageArray("tool_names_" + String(internalId), [], setToolNames);
    setLocalStorageArray("tool_ids_" + String(internalId), [], setSelectedTools);
  };

  const handleFileInputChange = (event) => {
    const files = event.target.files;
    setFileData(files);
  };

  const handleDropAreaClick = () => {
    fileInputRef.current.click();
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  function updateTemplate() {

    if (!validateAgentData(false)) return;

    let permission_type = permission;
    if (permission.includes("RESTRICTED")) {
      permission_type = "RESTRICTED";
    }

    const agentTemplateConfigData = {
      "goal": goals,
      "instruction": instructions,
      "agent_workflow": agentWorkflow,
      "constraints": constraints,
      "tools": toolNames,
      "exit": exitCriterion,
      "iteration_interval": stepTime,
      "model": model,
      "max_iterations": maxIterations,
      "permission_type": permission_type,
      "LTM_DB": longTermMemory ? database : null,
    }
    const editTemplateData = {
      "name": agentName,
      "description": agentDescription,
      "agent_configs": agentTemplateConfigData
    }

    editAgentTemplate(agentTemplateId, editTemplateData)
      .then((response) => {
        if (response.status === 200) {
          toast.success('Agent template has been updated successfully!', {autoClose: 1800});
        }
      })
      .catch((error) => {
        toast.error("Error updating agent template")
        console.error('Error updating agent template:', error);
      });
  };

  function setFileData(files) {
    if (files.length > 0) {
      const fileData = {
        "file": files[0],
        "name": files[0].name,
        "size": files[0].size,
        "type": files[0].type,
      };
      const updatedFiles = [...input, fileData];
      setLocalStorageArray('agent_files_' + String(internalId), updatedFiles, setInput);
    }
  }

  function checkSelectedToolkit(toolkit) {
    const toolIds = toolkit.tools.map((tool) => tool.id);
    const toolNameList = toolkit.tools.map((tool) => tool.name);
    return toolIds.every((toolId) => selectedTools.includes(toolId)) && toolNameList.every((toolName) => toolNames.includes(toolName));
  }

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const files = event.dataTransfer.files;
    setFileData(files);
  };

  const removeFile = (index) => {
    const updatedFiles = input.filter((file) => input.indexOf(file) !== index);
    setLocalStorageArray('agent_files_' + String(internalId), updatedFiles, setInput);
  };

  useEffect(() => {
    if (internalId !== null) {
      const has_resource = localStorage.getItem("has_resource_" + String(internalId)) || 'true';
      if (has_resource) {
        setAddResources(JSON.parse(has_resource));
      }

      const has_LTM = localStorage.getItem("has_LTM_" + String(internalId)) || 'true';
      if (has_LTM) {
        setLongTermMemory(JSON.parse(has_LTM));
      }

      const advanced_options = localStorage.getItem("advanced_options_" + String(internalId)) || 'false';
      if (advanced_options) {
        setAdvancedOptions(JSON.parse(advanced_options));
      }

      const is_agent_template = localStorage.getItem("is_agent_template_" + String(internalId));
      if (is_agent_template) {
        setShowButton(true);
      }

      const agent_name = localStorage.getItem("agent_name_" + String(internalId));
      if (agent_name) {
        setAgentName(agent_name);
      }

      const agent_template_id = localStorage.getItem("agent_template_id_" + String(internalId));
      if (agent_template_id) {
        setAgentTemplateId(agent_template_id)
      }

      const agent_description = localStorage.getItem("agent_description_" + String(internalId));
      if (agent_description) {
        setAgentDescription(agent_description);
      }

      const agent_goals = localStorage.getItem("agent_goals_" + String(internalId));
      if (agent_goals) {
        setGoals(JSON.parse(agent_goals));
      }

      const tool_ids = localStorage.getItem("tool_ids_" + String(internalId));
      if (tool_ids) {
        setSelectedTools(JSON.parse(tool_ids));
      }

      const tool_names = localStorage.getItem("tool_names_" + String(internalId));
      if (tool_names) {
        setToolNames(JSON.parse(tool_names));
      }

      const agent_instructions = localStorage.getItem("agent_instructions_" + String(internalId));
      if (agent_instructions) {
        setInstructions(JSON.parse(agent_instructions));
      }

      const agent_constraints = localStorage.getItem("agent_constraints_" + String(internalId));
      if (agent_constraints) {
        setConstraints(JSON.parse(agent_constraints));
      }

      const agent_model = localStorage.getItem("agent_model_" + String(internalId));
      if (agent_model) {
        setModel(agent_model);
      }

      const agent_workflow = localStorage.getItem("agent_workflow_" + String(internalId));
      if (agent_workflow) {
        setAgentWorkflow(agent_workflow);
      }

      const agent_database = localStorage.getItem("agent_database_" + String(internalId));
      if (agent_database) {
        setDatabase(agent_database);
      }

      const agent_permission = localStorage.getItem("agent_permission_" + String(internalId));
      if (agent_permission) {
        setPermission(agent_permission);
      }

      const exit_criterion = localStorage.getItem("agent_exit_criterion_" + String(internalId));
      if (exit_criterion) {
        setExitCriterion(exit_criterion);
      }

      const iterations = localStorage.getItem("agent_iterations_" + String(internalId));
      if (iterations) {
        setIterations(Number(iterations));
      }

      const step_time = localStorage.getItem("agent_step_time_" + String(internalId));
      if (step_time) {
        setStepTime(Number(step_time));
      }

      const agent_files = localStorage.getItem("agent_files_" + String(internalId));
      if (agent_files) {
        setInput(JSON.parse(agent_files));
      }
    }

    const agent_knowledge = localStorage.getItem("agent_knowledge_" + String(internalId));
    if (agent_knowledge) {
      setSelectedKnowledge(agent_knowledge);
    }
  }, [internalId])

  function openMarketplace() {
    openNewTab(-4, "Marketplace", "Marketplace", false);
    localStorage.setItem('marketplace_tab', 'market_knowledge');
  }

  const checkPermissionValidity = (permit) => {
   if(!(agentWorkflow === 'Fixed Task Workflow' || agentWorkflow === 'Dynamic Task Workflow' || agentWorkflow === 'Goal Based Workflow' ) && permit === 'RESTRICTED (Will ask for permission before using any tool)')
     return true;
   else
     return false;
  }

  const openModelMarket = () => {
    openNewTab(-4, "Marketplace", "Marketplace", false);
    localStorage.setItem('marketplace_tab', 'market_models');
  }

  const handleAddToMarketplace = () => {
    const agentData = setAgentData()
    agentData.agent_template_id = template.id
    publishTemplateToMarketplace(agentData)
      .then((response) => {
        setDropdown(false)
        setPublishModal(true)
      })
      .catch((error) => {
        toast.error("Error Publishing to marketplace")
        console.error('Error Publishing to marketplace:', error);
      });
  }

  return (<>
    <div className="row" style={{overflowY: 'scroll', height: 'calc(100vh - 92px)'}}>
      <div className="col-3"></div>
      <div className="col-6" style={{padding: '25px 20px'}}>
        <div>
          {!edit ? <div className={styles.page_title}>Create new agent</div> : <div className={styles.page_title}>Edit agent</div>}
        </div>
        <div style={{marginTop: '10px'}}>
          <div>
            <label className={styles.form_label}>Name</label>
            <input className="input_medium" type="text" value={agentName} disabled={edit}  onChange={handleNameChange}/>
          </div>
          <div style={{marginTop: '15px'}}>
            <label className={styles.form_label}>Description</label>
            <textarea className="textarea_medium" rows={3} value={agentDescription} disabled={edit} onChange={handleDescriptionChange}/>
          </div>
          <div style={{marginTop: '15px'}}>
            <div><label className={styles.form_label}>Goals</label></div>
            {goals?.map((goal, index) => (<div key={index} style={{
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{flex: '1'}}><input className="input_medium" type="text" value={goal}
                                              onChange={(event) => handleGoalChange(index, event.target.value)}/></div>
              {goals.length > 1 && <div>
                <button className="secondary_button" style={{marginLeft: '4px', padding: '5px'}}
                        onClick={() => handleGoalDelete(index)}>
                  <Image width={20} height={21} src="/images/close.svg" alt="close-icon"/>
                </button>
              </div>}
            </div>))}
            <div>
              <button className="secondary_button" onClick={addGoal}>+ Add</button>
            </div>
          </div>

          <div style={{marginTop: '15px'}}>
            <div><label className={styles.form_label}>Instructions<span
              style={{fontSize: '9px'}}>&nbsp;(optional)</span></label></div>
            {instructions?.map((goal, index) => (<div key={index} style={{
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{flex: '1'}}><input className="input_medium" type="text" value={goal}
                                              onChange={(event) => handleInstructionChange(index, event.target.value)}/>
              </div>
              {instructions.length > 1 && <div>
                <button className="secondary_button" style={{marginLeft: '4px', padding: '5px'}}
                        onClick={() => handleInstructionDelete(index)}>
                  <Image width={20} height={21} src="/images/close.svg" alt="close-icon"/>
                </button>
              </div>}
            </div>))}
            <div>
              <button className="secondary_button" onClick={addInstruction}>+ Add</button>
            </div>
          </div>

          <div style={{marginTop: '15px'}}>
            <label className={styles.form_label}>Model</label><br/>
            <div className="dropdown_container_search" style={{width: '100%'}}>
              <div className="custom_select_container" onClick={() => setModelDropdown(!modelDropdown)}
                   style={{width: '100%'}}>
                {model}<Image width={20} height={21}
                              src={!modelDropdown ? '/images/dropdown_down.svg' : '/images/dropdown_up.svg'}
                              alt="expand-icon"/>
              </div>
              <div>
                {modelDropdown && (
                    <div className="custom_select_options" ref={modelRef} style={{width: '100%', maxHeight: '300px'}}>
                      <div className="model_options">
                        {modelsArray?.map((model, index) => (
                            <div key={index} className="custom_select_option" onClick={() => handleModelSelect(index)}
                                 style={{padding: '12px 14px', maxWidth: '100%'}}>
                              {model}
                            </div>
                        ))}
                      </div>
                      <div className="vertical_containers sticky_option">
                        <div onClick={() => openModelMarket()} className="custom_select_option horizontal_container mxw_100 padding_12_14 gap_6 bt_white">
                          <Image width={16} height={16} src="/images/marketplace_logo.png" alt="marketplace_logo" />
                          <span>Browse models from marketplace</span>
                        </div>
                        <div onClick={() => openNewTab(-5, "new model", "Add_Model", false)} className="custom_select_option horizontal_container mxw_100 padding_12_14 gap_6 bt_white">
                          <Image width={16} height={16} src="/images/plus.png" alt="plus_image" />
                          <span>Add new custom model</span>
                        </div>
                      </div>
                    </div>
                )}
              </div>
            </div>
          </div>
          <div style={{marginTop: '15px'}}>
            <label className={styles.form_label}>Tools</label>
            <div className="dropdown_container_search" style={{width: '100%'}}>
              <div className="custom_select_container" onClick={() => setToolkitDropdown(!toolkitDropdown)}
                   style={{width: '100%', alignItems: 'flex-start'}}>
                <div style={{display: 'flex', flexWrap: 'wrap', width: '100%', alignItems: 'start'}}>
                  {toolNames && toolNames.length > 0 && toolNames.map((tool, index) => (
                    <div key={index} className="tool_container" style={{margin: '2px'}} onClick={preventDefault}>
                      <div className={styles.tool_text}>{tool}</div>
                      <div><Image width={12} height={12} src='/images/close_light.svg' alt="close-icon"
                                  style={{margin: '-2px -5px 0 2px'}} onClick={() => removeTool(index)}/></div>
                    </div>
                  ))}
                  <input type="text" className="dropdown_search_text" value={searchValue} style={{flexGrow: 1}}
                         onChange={(e) => setSearchValue(e.target.value)}
                         onFocus={() => {
                           setToolkitDropdown(true);
                           setShowPlaceholder(false);
                         }} onBlur={() => {
                    setShowPlaceholder(true);
                  }}
                         onClick={(e) => e.stopPropagation()}/>
                  {toolNames && toolNames.length === 0 && showPlaceholder && searchValue.length === 0 &&
                    <div style={{color: '#666666', position: 'absolute'}}>Select Tools</div>}
                </div>
                <div style={{display: 'inline-flex'}}>
                  <Image width={20} height={21} onClick={(e) => clearTools(e)} src='/images/clear_input.svg'
                         alt="clear-input"/>
                  <Image width={20} height={21}
                         src={!toolkitDropdown ? '/images/dropdown_down.svg' : '/images/dropdown_up.svg'}
                         alt="expand-icon"/>
                </div>
              </div>
              <div>
                {toolkitDropdown && <div className="custom_select_options" ref={toolkitRef} style={{width: '100%'}}>
                  {toolkitList && toolkitList.filter((toolkit) => toolkit.tools ? toolkit.tools.some((tool) => tool.name.toLowerCase().includes(searchValue.toLowerCase())) : false).map((toolkit, index) => (
                    <div key={index}>
                      {toolkit.name !== null && !excludedToolkits().includes(toolkit.name) && <div>
                        <div onClick={() => addToolkit(toolkit)} className="custom_select_option" style={{
                          padding: '10px 14px',
                          maxWidth: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-start'}}>
                            <div onClick={(e) => toggleToolkit(e, toolkit.id)}
                                 style={{marginLeft: '-8px', marginRight: '8px'}}>
                              <Image src={toolkit.isOpen ? "/images/arrow_down.svg" : "/images/arrow_forward.svg"}
                                     width={11} height={11} alt="expand-arrow"/>
                            </div>
                            <div style={{width: '100%'}}>{toolkit.name}</div>
                          </div>
                          {checkSelectedToolkit(toolkit) && <div style={{order: '1', marginLeft: '10px'}}>
                            <Image src="/images/tick.svg" width={17} height={17} alt="selected-toolkit"/>
                          </div>}
                        </div>
                        {toolkit.isOpen && toolkit.tools.filter((tool) => tool.name ? tool.name.toLowerCase().includes(searchValue.toLowerCase()) : true).map((tool, index) => (
                          <div key={index} className="custom_select_option" onClick={() => addTool(tool)} style={{
                            padding: '10px 14px 10px 40px',
                            maxWidth: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <div>{tool.name}</div>
                            {(selectedTools.includes(tool.id) || toolNames.includes(tool.name)) &&
                              <div style={{order: '1', marginLeft: '10px'}}>
                                <Image src="/images/tick.svg" width={17} height={17} alt="selected-tool"/>
                              </div>}
                          </div>))}
                      </div>}
                    </div>))}
                </div>}
              </div>
            </div>
          </div>
          {toolNames.includes("Knowledge Search") && <div style={{marginTop: '5px'}}>
            <label className={styles.form_label}>Add knowledge</label>
            <div className="dropdown_container_search" style={{width: '100%'}}>
              <div className="custom_select_container" onClick={() => setKnowledgeDropdown(!knowledgeDropdown)}
                   style={selectedKnowledge ? {width: '100%'} : {width: '100%', color: '#888888'}}>
                {selectedKnowledge || 'Select knowledge'}<Image width={20} height={21}
                                                                src={!knowledgeDropdown ? '/images/dropdown_down.svg' : '/images/dropdown_up.svg'}
                                                                alt="expand-icon"/>
              </div>
              <div>
                {knowledgeDropdown && knowledge && knowledge.length > 0 &&
                  <div className="custom_select_options" ref={knowledgeRef} style={{width: '100%'}}>
                    {knowledge.map((item, index) => (
                      <div key={index} className="custom_select_option" onClick={() => handleKnowledgeSelect(index)}
                           style={{padding: '12px 14px', maxWidth: '100%'}}>
                        {item.name}
                      </div>))}
                    <div className={styles1.knowledge_db}
                         style={{maxWidth: '100%', borderTop: '1px solid #3F3A4E'}}>
                      <div className="custom_select_option"
                           style={{padding: '12px 14px', maxWidth: '100%', borderRadius: '0'}}
                           onClick={() => sendKnowledgeData({
                             id: -6,
                             name: "new knowledge",
                             contentType: "Add_Knowledge",
                             internalId: createInternalId()
                           })}>
                        <Image width={15} height={15} src="/images/plus_symbol.svg" alt="add-icon"/>&nbsp;&nbsp;Add
                        new knowledge
                      </div>
                    </div>
                    <div className={styles1.knowledge_db}
                         style={{maxWidth: '100%', borderTop: '1px solid #3F3A4E'}}>
                      <div className="custom_select_option" style={{
                        padding: '12px 14px',
                        maxWidth: '100%',
                        borderTopLeftRadius: '0',
                        borderTopRightRadius: '0'
                      }}
                           onClick={openMarketplace}>
                        <Image width={15} height={15} src="/images/widgets.svg"
                               alt="marketplace"/>&nbsp;&nbsp;Browse knowledge from marketplace
                      </div>
                    </div>
                  </div>}
                {knowledgeDropdown && knowledge && knowledge.length <= 0 &&
                  <div className="custom_select_options" ref={knowledgeRef}
                       style={{width: '100%', maxHeight: '400px'}}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '30px',
                      marginBottom: '20px',
                      width: '100%'
                    }}>
                      <Image width={150} height={60} src="/images/no_permissions.svg" alt="no-permissions"/>
                      <span className={styles.feed_title} style={{marginTop: '8px'}}>No knowledge found</span>
                    </div>
                    <div className={styles1.knowledge_db}
                         style={{maxWidth: '100%', borderTop: '1px solid #3F3A4E'}}>
                      <div className="custom_select_option"
                           style={{padding: '12px 14px', maxWidth: '100%', borderRadius: '0'}}
                           onClick={() => sendKnowledgeData({
                             id: -6,
                             name: "new knowledge",
                             contentType: "Add_Knowledge",
                             internalId: createInternalId()
                           })}>
                        <Image width={15} height={15} src="/images/plus_symbol.svg" alt="add-icon"/>&nbsp;&nbsp;Add
                        new knowledge
                      </div>
                    </div>
                    <div className={styles1.knowledge_db}
                         style={{maxWidth: '100%', borderTop: '1px solid #3F3A4E'}}>
                      <div className="custom_select_option" style={{
                        padding: '12px 14px',
                        maxWidth: '100%',
                        borderTopLeftRadius: '0',
                        borderTopRightRadius: '0'
                      }}
                           onClick={openMarketplace}>
                        <Image width={15} height={15} src="/images/widgets.svg"
                               alt="marketplace"/>&nbsp;&nbsp;Browse knowledge from marketplace
                      </div>
                    </div>
                  </div>}
              </div>
            </div>
          </div>}
          <div style={{marginTop: '15px'}}>
            <button className="medium_toggle"
                    onClick={() => setLocalStorageValue("advanced_options_" + String(internalId), !advancedOptions, setAdvancedOptions)}
                    style={advancedOptions ? {background: '#494856'} : {}}>
              {advancedOptions ? 'Hide Advanced Options' : 'Show Advanced Options'}{advancedOptions ?
              <Image style={{marginLeft: '10px'}} width={20} height={21} src="/images/dropdown_up.svg"
                     alt="expand-icon"/> :
              <Image style={{marginLeft: '10px'}} width={20} height={21} src="/images/dropdown_down.svg"
                     alt="expand-icon"/>}
            </button>
          </div>
          {advancedOptions &&
            <div>
              <div style={{marginTop: '15px'}}>
                <label className={styles.form_label}>Agent Workflow</label><br/>
                <div className="dropdown_container_search" style={{width: '100%'}}>
                  <div className={`${"custom_select_container"} ${edit ? 'cursor_not_allowed' : ''}`} onClick={() => {setAgentDropdown(!edit ? !agentDropdown : false)}}
                       style={{width: '100%'}}>
                    {agentWorkflow}<Image width={20} height={21}
                                      src={!agentDropdown ? '/images/dropdown_down.svg' : '/images/dropdown_up.svg'}
                                      alt="expand-icon"/>
                  </div>
                  <div>
                    {agentDropdown && <div className="custom_select_options" ref={agentRef} style={{width: '100%'}}>
                      {agentWorkflows.map((agent, index) => (
                        <div key={index} className="custom_select_option" onClick={() => handleAgentSelect(index)}
                             style={{padding: '12px 14px', maxWidth: '100%'}}>
                          {agent}
                        </div>))}
                    </div>}
                  </div>
                </div>
              </div>
              <div style={{marginTop: '15px'}}>
                <div style={{display: 'flex'}}>
                  <input className="checkbox" type="checkbox" checked={addResources}
                         onChange={() => setLocalStorageValue("has_resource_" + String(internalId), !addResources, setAddResources)}/>
                  <label className={styles.form_label} style={{marginLeft: '7px', cursor: 'pointer'}}
                         onClick={() => setLocalStorageValue("has_resource_" + String(internalId), !addResources, setAddResources)}>
                    Add Resources
                  </label>
                </div>
              </div>
              <div style={{width: '100%', height: 'auto', marginTop: '10px'}}>
                {addResources && <div style={{paddingBottom: '10px'}}>
                  <div className={`file-drop-area ${isDragging ? 'dragging' : ''}`} onDragEnter={handleDragEnter}
                       onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
                       onClick={handleDropAreaClick}>
                    <div><p style={{textAlign: 'center', color: 'white', fontSize: '14px'}}>+ Choose or drop a file
                      here</p>
                      <p style={{textAlign: 'center', color: '#888888', fontSize: '12px'}}>Supported file formats are
                        txt, pdf, docx, epub, csv, pptx only</p>
                      <input type="file" ref={fileInputRef} style={{display: 'none'}} onChange={handleFileInputChange}/>
                    </div>
                  </div>
                  <div className={styles.agent_resources}>
                    {input.map((file, index) => (
                      <div key={index} className={styles.history_box}
                           style={{background: '#272335', padding: '0px 10px', width: '100%', cursor: 'default'}}>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-start'}}>
                          <div><Image width={28} height={46} src={returnResourceIcon(file)} alt="pdf-icon"/></div>
                          <div style={{marginLeft: '5px', width: '100%'}}>
                            <div style={{fontSize: '11px'}} className={styles.single_line_block}>{file.name}</div>
                            <div style={{
                              color: '#888888',
                              fontSize: '9px'
                            }}>{file.type.split("/")[1]}{file.size !== '' ? ` • ${formatBytes(file.size)}` : ''}</div>
                          </div>
                          <div style={{cursor: 'pointer'}} onClick={() => removeFile(index)}><Image width={20}
                                                                                                    height={20}
                                                                                                    src='/images/close.svg'
                                                                                                    alt="close-icon"/>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>}
              </div>
              <div style={{marginTop: '15px'}}>
                <div><label className={styles.form_label}>Constraints</label></div>
                {constraints?.map((constraint, index) => (<div key={index} style={{
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{flex: '1'}}><input className="input_medium" type="text" value={constraint}
                                                  onChange={(event) => handleConstraintChange(index, event.target.value)}/>
                  </div>
                  <div>
                    <button className="secondary_button" style={{marginLeft: '4px', padding: '5px'}}
                            onClick={() => handleConstraintDelete(index)}>
                      <Image width={20} height={21} src="/images/close.svg" alt="close-icon"/>
                    </button>
                  </div>
                </div>))}
                <div>
                  <button className="secondary_button" onClick={addConstraint}>+ Add</button>
                </div>
              </div>
              <div style={{marginTop: '15px'}}>
                <label className={styles.form_label}>Max iterations</label>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                  <input style={{width: '90%'}} type="range" min={5} max={100} value={maxIterations}
                         onChange={handleIterationChange}/>
                  <input style={{width: '9%', order: '1', textAlign: 'center', paddingLeft: '0', paddingRight: '0'}}
                         disabled={true} className="input_medium" type="text" value={maxIterations}/>
                </div>
              </div>
              {/*<div style={{marginTop: '15px'}}>*/}
              {/*  <label className={styles.form_label}>Exit criterion</label>*/}
              {/*  <div className="dropdown_container_search" style={{width:'100%'}}>*/}
              {/*    <div className="custom_select_container" onClick={() => setExitDropdown(!exitDropdown)} style={{width:'100%'}}>*/}
              {/*      {exitCriterion}<Image width={20} height={21} src={!exitDropdown ? '/images/dropdown_down.svg' : '/images/dropdown_up.svg'} alt="expand-icon"/>*/}
              {/*    </div>*/}
              {/*    <div>*/}
              {/*      {exitDropdown && <div className="custom_select_options" ref={exitRef} style={{width:'100%'}}>*/}
              {/*        {exitCriteria.map((exit, index) => (<div key={index} className="custom_select_option" onClick={() => handleExitSelect(index)} style={{padding:'12px 14px',maxWidth:'100%'}}>*/}
              {/*          {exit}*/}
              {/*        </div>))}*/}
              {/*      </div>}*/}
              {/*    </div>*/}
              {/*  </div>*/}
              {/*</div>*/}
              {/*<div style={{marginTop: '15px'}}>*/}
              {/*  <label className={styles.form_label}>Time between steps (in milliseconds)</label>*/}
              {/*  <input className="input_medium" type="number" value={stepTime} onChange={handleStepChange}/>*/}
              {/*</div>*/}
              {/*<div style={{marginTop: '15px'}}>*/}
              {/*  <div style={{display:'flex'}}>*/}
              {/*    <input className="checkbox" type="checkbox" checked={longTermMemory} onChange={() => setLocalStorageValue("has_LTM_" + String(internalId), !longTermMemory, setLongTermMemory)} />*/}
              {/*    <label className={styles.form_label} style={{marginLeft:'7px',cursor:'pointer'}} onClick={() => setLocalStorageValue("has_LTM_" + String(internalId), !longTermMemory, setLongTermMemory)}>*/}
              {/*      Long term memory*/}
              {/*    </label>*/}
              {/*  </div>*/}
              {/*</div>*/}
              {/*{longTermMemory === true && <div style={{marginTop: '10px'}}>*/}
              {/*  <label className={styles.form_label}>Choose an LTM database</label>*/}
              {/*  <div className="dropdown_container_search" style={{width:'100%'}}>*/}
              {/*    <div className="custom_select_container" onClick={() => setDatabaseDropdown(!databaseDropdown)} style={{width:'100%'}}>*/}
              {/*      {database}<Image width={20} height={21} src={!databaseDropdown ? '/images/dropdown_down.svg' : '/images/dropdown_up.svg'} alt="expand-icon"/>*/}
              {/*    </div>*/}
              {/*    <div>*/}
              {/*      {databaseDropdown && <div className="custom_select_options" ref={databaseRef} style={{width:'100%'}}>*/}
              {/*        {databases.map((data, index) => (<div key={index} className="custom_select_option" onClick={() => handleDatabaseSelect(index)} style={{padding:'12px 14px',maxWidth:'100%'}}>*/}
              {/*          {data}*/}
              {/*        </div>))}*/}
              {/*      </div>}*/}
              {/*    </div>*/}
              {/*  </div>*/}
              {/*</div>}*/}
              <div style={{marginTop: '15px'}}>
                <label className={styles.form_label}>Permission Type</label>
                <div className="dropdown_container_search" style={{width: '100%'}}>
                  <div className="custom_select_container" onClick={() => setPermissionDropdown(!permissionDropdown)}
                       style={{width: '100%'}}>
                    {permission}<Image width={20} height={21}
                                       src={!permissionDropdown ? '/images/dropdown_down.svg' : '/images/dropdown_up.svg'}
                                       alt="expand-icon"/>
                  </div>
                  <div className="mb_34">
                    {permissionDropdown &&
                      <div className="custom_select_options mb_30" ref={permissionRef} style={{width: '100%'}}>
                        {permissions.map((permit, index) => (<div key={index} className="custom_select_option padding_12_14 mxw_100"
                                                                  onClick={() => handlePermissionSelect(index)}  style={checkPermissionValidity(permit) ? {color: '#888888', textDecoration: 'line-through',pointerEvents: 'none'} : {}}>
                          {permit}
                        </div>))}
                      </div>}
                  </div>
                </div>
              </div>
            </div>
          }

          <div style={{marginTop: '10px', display: 'flex', justifyContent: 'flex-end'}}>
            <div className="display_flex_container position_relative mr_7">
              <div>
                {dropdown && (<div className={styles.dropdown_container_agent} onMouseOver={() => setDropdown(true)} onMouseOut={() => setDropdown(false)}>
                  <ul className="padding_0 margin_0">
                    <li className={`${styles.dropdown_item_agent} ${"dropdown_item"}`} onClick={() => updateTemplate()}>Update template</li>
                    {env === 'PROD' && <li className={`${styles.dropdown_item_agent} ${"dropdown_item"}`} onClick={() => handleAddToMarketplace()}>Publish to Marketplace</li>}
                </ul>
                </div>)}
              </div>
              {showButton && <div>
                  <button className="secondary_button padding_8" onClick={() => setDropdown(true)}>
                    <Image width={20} height={20} src="/images/three_dots.svg" alt="run-icon"/>
                  </button>
                </div>}
              </div>
            <button style={{marginRight: '7px'}} className="secondary_button"
                    onClick={() => removeTab(-1, "new agent", "Create_Agent", internalId)}>Cancel
            </button>
            {!edit ? <div style={{display: 'flex', position: 'relative'}}>
              {createDropdown && (<div className="create_agent_dropdown_options" onClick={() => {
                setCreateModal(true);
                setCreateDropdown(false);
              }}>Create & Schedule Run
              </div>)}
              <div className="primary_button"
                   style={{backgroundColor: 'white', marginBottom: '4px', paddingLeft: '0', paddingRight: '5px'}}>
                <button disabled={!createClickable} className="primary_button" style={{paddingRight: '5px'}}
                        onClick={() => {handleAddAgent();}}>{createClickable ? 'Create and Run' : 'Creating Agent...'}</button>
                <button onClick={() => setCreateDropdown(!createDropdown)}
                        style={{border: 'none', backgroundColor: 'white'}}>
                  <Image width={20} height={21}
                         src={!createDropdown ? '/images/dropdown_down.svg' : '/images/dropdown_up.svg'}
                         alt="expand-icon"/>
                </button>
              </div>
            </div>: <div className="primary_button" style={{backgroundColor: 'white', marginBottom: '4px', paddingLeft: '0', paddingRight: '5px'}}>
              <button className="primary_button" style={{paddingRight: '5px'}}
                      onClick={() => setEditModal(true)}>Update changes</button> </div>}
          </div>

          {createModal && (
            <AgentSchedule env={env} internalId={internalId} closeCreateModal={closeCreateModal} type="create_agent"/>
          )}

          {editModal && (<div className="modal" onClick={() => setEditModal(!editModal)}>
            <div className="modal-content w_35" onClick={preventDefault}>
              <div className={styles.detail_name}>Update agent</div>
              <div><label className={styles.form_label}>All the new runs of this agent will be updated with the latest changes. Are you sure you want to update changes?</label></div>
              <div className="mt_20 justify_end display_flex">
                <button className="secondary_button mr_10" onClick={() => setEditModal(false)}>
                  Cancel
                </button>
                <button className={`${styles.run_button} h_32p padding_0_15 `} onClick={handleAddAgent}>
                  Update changes
                </button>
              </div>
            </div>
          </div>)}

          {publishModal && <div className="modal" onClick={() => {setPublishModal(false)}}>
            <div className="modal-content w_35" onClick={preventDefault}>
              <div className={styles.detail_name}>Template submitted successfully!</div>
              <div>
                <label className={styles.form_label}>Your template is under review. Please check the marketplace in 2-3 days. If your template is not visible on the marketplace, reach out to us on Discord&nbsp;
                  <a href="https://discord.com/channels/1107593006032355359/1143813784683692093" target="_blank" rel="noopener noreferrer">
                    #agent-templates-submission
                  </a> channel.</label>
              </div>
              <div className={styles.modal_buttons}>
                <button className="primary_button" onClick={() => {setPublishModal(false)}}>
                  Okay
                </button>
              </div>
            </div>
          </div>}

        </div>
      </div>
      <div className="col-3"></div>
    </div>
    <ToastContainer/>
  </>)
}