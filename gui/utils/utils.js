import {formatDistanceToNow, format, addMinutes} from 'date-fns';
import {utcToZonedTime} from 'date-fns-tz';
import {baseUrl, analyticsMeasurementId, analyticsApiSecret, mixpanelId} from "@/pages/api/apiConfig";
import {EventBus} from "@/utils/eventBus";
import JSZip from "jszip";
import moment from 'moment';
import mixpanel from 'mixpanel-browser'
import Cookies from "js-cookie";

const toolkitData = {
  'Jira Toolkit': '/images/jira_icon.svg',
  'Email Toolkit': '/images/gmail_icon.svg',
  'Google Calendar Toolkit': '/images/google_calender_icon.svg',
  'GitHub Toolkit': '/images/github_icon.svg',
  'Google Search Toolkit': '/images/google_search_icon.svg',
  'Searx Toolkit': '/images/searx_icon.svg',
  'Slack Toolkit': '/images/slack_icon.svg',
  'Web Scraper Toolkit': '/images/webscraper_icon.svg',
  'Web Scrapper Toolkit': '/images/webscraper_icon.svg',
  'Twitter Toolkit': '/images/twitter_icon.svg',
  'Google SERP Toolkit': '/images/google_serp_icon.svg',
  'File Toolkit': '/images/filemanager_icon.svg',
  'CodingToolkit': '/images/superagi_logo.png',
  'Thinking Toolkit': '/images/superagi_logo.png',
  'Image Generation Toolkit': '/images/superagi_logo.png',
  'DuckDuckGo Search Toolkit': '/images/duckduckgo_icon.png',
  'Instagram Toolkit': '/images/instagram.png',
  'Knowledge Search Toolkit': '/images/knowledeg_logo.png',
  'Notion Toolkit': '/images/notion_logo.png',
  'ApolloToolkit': '/images/apollo_logo.png',
  'Google Analytics Toolkit': '/images/google_analytics_logo.png'
};

export const getUserTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export const convertToGMT = (dateTime) => {
  if (!dateTime) {
    return null;
  }
  return moment.utc(dateTime).format('YYYY-MM-DD HH:mm:ss');
};

export const formatTimeDifference = (timeDifference) => {
  const units = ['years', 'months', 'days', 'hours', 'minutes'];
  const singularUnits = ['year', 'month', 'day', 'hour', 'minute'];

  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    if (timeDifference[unit] !== 0) {
      if (unit === 'minutes') {
        return `${timeDifference[unit]} ${timeDifference[unit] === 1 ? singularUnits[i] : unit} ago`;
      } else {
        return `${timeDifference[unit]} ${timeDifference[unit] === 1 ? singularUnits[i] : unit} ago`;
      }
    }
  }

  return 'Just now';
};

export const formatNumber = (number) => {
  if (number === null || number === undefined || number === 0) {
    return '0';
  }

  const suffixes = ['', 'k', 'M', 'B', 'T'];
  const magnitude = Math.floor(Math.log10(number) / 3);
  const scaledNumber = number / Math.pow(10, magnitude * 3);
  const suffix = suffixes[magnitude];

  if (scaledNumber % 1 === 0) {
    return scaledNumber.toFixed(0) + suffix;
  }

  return scaledNumber.toFixed(1) + suffix;
};

export const formatTime = (lastExecutionTime) => {
  try {
    const parsedTime = new Date(lastExecutionTime + 'Z'); // append 'Z' to indicate UTC
    if (isNaN(parsedTime.getTime())) {
      throw new Error('Invalid time value');
    }

    const timeZone = 'Asia/Kolkata';
    const zonedTime = utcToZonedTime(parsedTime, timeZone);

    return formatDistanceToNow(zonedTime, {
      addSuffix: true,
      includeSeconds: true
    }).replace(/about\s/, '')
      .replace(/minutes?/, 'min')
      .replace(/hours?/, 'hrs')
      .replace(/days?/, 'day')
      .replace(/weeks?/, 'week');
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Invalid Time';
  }
};

export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const formattedValue = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));

  return `${formattedValue} ${sizes[i]}`;
};

export const downloadFile = (fileId, fileName = null) => {
  // const authToken = localStorage.getItem('accessToken');
  const authToken = Cookies.get("accessToken");
  const url = `${baseUrl()}/resources/get/${fileId}`;
  const env = localStorage.getItem('applicationEnvironment');

  if (env === 'PROD') {
    const headers = {
      Authorization: `Bearer ${authToken}`,
    };

    return fetch(url, {headers})
      .then((response) => response.blob())
      .then((blob) => {
        if (fileName) {
          const fileUrl = window.URL.createObjectURL(blob);
          const anchorElement = document.createElement('a');
          anchorElement.href = fileUrl;
          anchorElement.download = fileName;
          anchorElement.click();
          window.URL.revokeObjectURL(fileUrl);
        } else {
          return blob;
        }
      })
      .catch((error) => {
        console.error('Error downloading file:', error);
      });
  } else {
    if (fileName) {
      window.open(url, '_blank');
    } else {
      return fetch(url)
        .then((response) => response.blob())
        .catch((error) => {
          console.error('Error downloading file:', error);
        });
    }
  }
};

export const downloadAllFiles = (files, run_name) => {
  const zip = new JSZip();
  const promises = [];
  const fileNamesCount = {};

  files.forEach((file, index) => {
    fileNamesCount[file.name]
      ? fileNamesCount[file.name]++
      : (fileNamesCount[file.name] = 1);

    let modifiedFileName = file.name;
    if (fileNamesCount[file.name] > 1) {
      const fileExtensionIndex = file.name.lastIndexOf(".");
      const name = file.name.substring(0, fileExtensionIndex);
      const extension = file.name.substring(fileExtensionIndex + 1);
      modifiedFileName = `${name} (${fileNamesCount[file.name] - 1}).${extension}`;
    }

    const promise = downloadFile(file.id)
      .then((blob) => {
        const fileBlob = new Blob([blob], {type: file.type});
        zip.file(modifiedFileName, fileBlob);
      })
      .catch((error) => {
        console.error("Error downloading file:", error);
      });

    promises.push(promise);
  });

  Promise.all(promises)
    .then(() => {
      zip.generateAsync({type: "blob"})
        .then((content) => {
          const now = new Date();
          const timestamp = `${now.getFullYear()}-${("0" + (now.getMonth() + 1)).slice(-2)}-${("0" + now.getDate()).slice(-2)}_${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`.replace(/:/g, '-');
          const zipFilename = `${run_name}_${timestamp}.zip`;
          const downloadLink = document.createElement("a");
          downloadLink.href = URL.createObjectURL(content);
          downloadLink.download = zipFilename;
          downloadLink.click();
        })
        .catch((error) => {
          console.error("Error generating zip:", error);
        });
    });
};

export const refreshUrl = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const {origin, pathname} = window.location;
  const urlWithoutToken = origin + pathname;
  window.history.replaceState({}, document.title, urlWithoutToken);
};

export const loadingTextEffect = (loadingText, setLoadingText, timer) => {
  const text = loadingText;
  let dots = '';

  const interval = setInterval(() => {
    dots = dots.length < 3 ? dots + '.' : '';
    setLoadingText(`${text}${dots}`);
  }, timer);

  return () => clearInterval(interval)
};

export const openNewTab = (id, name, contentType, hasInternalId = false) => {
  EventBus.emit('openNewTab', {
    element: {id: id, name: name, contentType: contentType, internalId: hasInternalId ? createInternalId() : 0}
  });
};

export const removeTab = (id, name, contentType, internalId) => {
  EventBus.emit('removeTab', {
    element: {id: id, name: name, contentType: contentType, internalId: internalId}
  });
};

export const setLocalStorageValue = (key, value, stateFunction) => {
  stateFunction(value);
  localStorage.setItem(key, value);
};

export const setLocalStorageArray = (key, value, stateFunction) => {
  stateFunction(value);
  const arrayString = JSON.stringify(value);
  localStorage.setItem(key, arrayString);
};

const getInternalIds = () => {
  const internal_ids = localStorage.getItem("agi_internal_ids");
  return internal_ids ? JSON.parse(internal_ids) : [];
};

const removeAgentInternalId = (internalId) => {
  let idsArray = getInternalIds();
  const internalIdIndex = idsArray.indexOf(internalId);

  if (internalIdIndex !== -1) {
    idsArray.splice(internalIdIndex, 1);
    localStorage.setItem('agi_internal_ids', JSON.stringify(idsArray));
    localStorage.removeItem("agent_create_click_" + String(internalId));
    localStorage.removeItem("agent_name_" + String(internalId));
    localStorage.removeItem("agent_description_" + String(internalId));
    localStorage.removeItem("agent_goals_" + String(internalId));
    localStorage.removeItem("agent_instructions_" + String(internalId));
    localStorage.removeItem("agent_constraints_" + String(internalId));
    localStorage.removeItem("agent_model_" + String(internalId));
    localStorage.removeItem("agent_type_" + String(internalId));
    localStorage.removeItem("tool_names_" + String(internalId));
    localStorage.removeItem("tool_ids_" + String(internalId));
    localStorage.removeItem("agent_rolling_window_" + String(internalId));
    localStorage.removeItem("agent_database_" + String(internalId));
    localStorage.removeItem("agent_permission_" + String(internalId));
    localStorage.removeItem("agent_exit_criterion_" + String(internalId));
    localStorage.removeItem("agent_iterations_" + String(internalId));
    localStorage.removeItem("agent_step_time_" + String(internalId));
    localStorage.removeItem("advanced_options_" + String(internalId));
    localStorage.removeItem("has_LTM_" + String(internalId));
    localStorage.removeItem("has_resource_" + String(internalId));
    localStorage.removeItem("agent_files_" + String(internalId));
    localStorage.removeItem("agent_start_time_" + String(internalId));
    localStorage.removeItem("agent_expiry_date_" + String(internalId));
    localStorage.removeItem("agent_expiry_type_" + String(internalId));
    localStorage.removeItem("agent_expiry_runs_" + String(internalId));
    localStorage.removeItem("agent_time_unit_" + String(internalId));
    localStorage.removeItem("agent_time_value_" + String(internalId));
    localStorage.removeItem("agent_is_recurring_" + String(internalId));
    localStorage.removeItem("is_agent_template_" + String(internalId));
    localStorage.removeItem("agent_template_id_" + String(internalId));
    localStorage.removeItem("agent_knowledge_" + String(internalId));
    localStorage.removeItem("agent_knowledge_id_" + String(internalId));
    localStorage.removeItem("is_editing_agent_" + String(internalId));
  }
};

const removeAddToolkitInternalId = (internalId) => {
  let idsArray = getInternalIds();
  const internalIdIndex = idsArray.indexOf(internalId);

  if (internalIdIndex !== -1) {
    idsArray.splice(internalIdIndex, 1);
    localStorage.setItem('agi_internal_ids', JSON.stringify(idsArray));
    localStorage.removeItem('tool_github_' + String(internalId));
  }
};

const removeToolkitsInternalId = (internalId) => {
  let idsArray = getInternalIds();
  const internalIdIndex = idsArray.indexOf(internalId);

  if (internalIdIndex !== -1) {
    idsArray.splice(internalIdIndex, 1);
    localStorage.setItem('agi_internal_ids', JSON.stringify(idsArray));
    localStorage.removeItem('toolkit_tab_' + String(internalId));
    localStorage.removeItem('api_configs_' + String(internalId));
  }
};

const removeKnowledgeInternalId = (internalId) => {
  let idsArray = getInternalIds();
  const internalIdIndex = idsArray.indexOf(internalId);

  if (internalIdIndex !== -1) {
    idsArray.splice(internalIdIndex, 1);
    localStorage.setItem('agi_internal_ids', JSON.stringify(idsArray));
    localStorage.removeItem('knowledge_name_' + String(internalId));
    localStorage.removeItem('knowledge_description_' + String(internalId));
    localStorage.removeItem('knowledge_index_' + String(internalId));
  }
}

const removeAddDatabaseInternalId = (internalId) => {
  let idsArray = getInternalIds();
  const internalIdIndex = idsArray.indexOf(internalId);

  if (internalIdIndex !== -1) {
    idsArray.splice(internalIdIndex, 1);
    localStorage.setItem('agi_internal_ids', JSON.stringify(idsArray));
    localStorage.removeItem('add_database_tab_' + String(internalId));
    localStorage.removeItem('selected_db_' + String(internalId));
    localStorage.removeItem('db_name_' + String(internalId));
    localStorage.removeItem('db_collections_' + String(internalId));
    localStorage.removeItem('pincone_api_' + String(internalId));
    localStorage.removeItem('pinecone_env_' + String(internalId));
    localStorage.removeItem('qdrant_api_' + String(internalId));
    localStorage.removeItem('qdrant_url_' + String(internalId));
    localStorage.removeItem('qdrant_port_' + String(internalId));
  }
}

const removeDatabaseInternalId = (internalId) => {
  let idsArray = getInternalIds();
  const internalIdIndex = idsArray.indexOf(internalId);

  if (internalIdIndex !== -1) {
    idsArray.splice(internalIdIndex, 1);
    localStorage.setItem('agi_internal_ids', JSON.stringify(idsArray));
    localStorage.removeItem('db_details_collections_' + String(internalId));
  }
}

export const resetLocalStorage = (contentType, internalId) => {
  switch (contentType) {
    case 'Create_Agent':
      removeAgentInternalId(internalId);
      break;
    case 'Add_Toolkit':
      removeAddToolkitInternalId(internalId);
      break;
    case 'Marketplace':
      localStorage.removeItem('marketplace_tab');
      localStorage.removeItem('market_item_clicked');
      localStorage.removeItem('market_detail_type');
      localStorage.removeItem('market_item');
      break;
    case 'Toolkits':
      removeToolkitsInternalId(internalId);
      break;
    case 'Knowledge':
      removeKnowledgeInternalId(internalId);
      break;
    case 'Add_Knowledge':
      removeKnowledgeInternalId(internalId);
      break;
    case 'Add_Database':
      removeAddDatabaseInternalId(internalId);
      break;
    case 'Database':
      removeDatabaseInternalId(internalId);
      break;
    case 'Settings':
      localStorage.removeItem('settings_tab');
      break;
    default:
      break;
  }
};

export const createInternalId = () => {
  let newId = 1;

  if (typeof window !== 'undefined') {
    let idsArray = getInternalIds();
    let found = false;

    for (let i = 1; !found; i++) {
      if (!idsArray.includes(i)) {
        newId = i;
        found = true;
      }
    }

    idsArray.push(newId);
    localStorage.setItem('agi_internal_ids', JSON.stringify(idsArray));
  }

  return newId;
};

export const returnToolkitIcon = (toolkitName) => {
  return toolkitData[toolkitName] || '/images/custom_tool.svg';
};

export const returnResourceIcon = (file) => {
  const fileType = file.type;

  switch (true) {
    case fileType.includes('image'):
      return '/images/img_file.svg';
    case fileType === 'application/pdf':
      return '/images/pdf_file.svg';
    case fileType === 'application/txt' || fileType === 'text/plain':
      return '/images/txt_file.svg';
    default:
      return '/images/default_file.svg';
  }
};

export const returnDatabaseIcon = (database) => {
  const dbTypeIcons = {
    'Pinecone': '/images/pinecone.svg',
    'Qdrant': '/images/qdrant.svg',
    'Weaviate' : '/images/weaviate.svg',
    'MongoDB' : '/images/mongodb.svg',
  };

  return dbTypeIcons[database]
};

export const convertToTitleCase = (str) => {
  if (!str) {
    return '';
  }

  const words = str.toLowerCase().split('_');
  const capitalizedWords = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return capitalizedWords.join(' ');
};

export const preventDefault = (e) => {
  e.stopPropagation();
};

export const excludedToolkits = () => {
  return ["Thinking Toolkit", "Human Input Toolkit", "Resource Toolkit"];
}

export const getFormattedDate = (data) => {
  let date = new Date(data);
  const year = date.getFullYear();
  const day = date.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  return `${day} ${month} ${year}`;
}

export const modelIcon = (model) => {
  const icons = {
    'Hugging Face': '/images/huggingface_logo.svg',
    'Google Palm': '/images/google_palm_logo.svg',
    'Replicate': '/images/replicate_logo.svg',
    'OpenAI': '/images/openai_logo.svg',
  }

  return icons[model];
}

export const modelGetAuth = (modelProvider) => {
  const externalLinks = {
    'Replicate': 'https://replicate.com/account/api-tokens',
    'Hugging Face': 'https://huggingface.co/settings/tokens',
    'OpenAI': 'https://platform.openai.com/account/api-keys',
    'Google Palm': 'https://developers.generativeai.google/products/palm',
  }

  return externalLinks[modelProvider]
}

export const formatDateTime = (dateTimeString) => {
  const date = new Date(dateTimeString);
  const adjustedDate = addMinutes(addMinutes(date, 5 * 60), 30);
  const formattedDate = format(adjustedDate, 'd MMM yyyy HH:mm');

  return formattedDate;
};

export const convertWaitingPeriod = (waitingPeriod) => {
  let convertedValue = waitingPeriod;
  let unit = 'seconds';

  if (convertedValue >= 60 && convertedValue < 3600) {
    convertedValue = Math.floor(convertedValue / 60);
    unit = 'minutes';
  } else if (convertedValue >= 3600 && convertedValue < 86400) {
    convertedValue = Math.floor(convertedValue / 3600);
    unit = 'hours';
  } else if (convertedValue >= 86400 && convertedValue < 604800) {
    convertedValue = Math.floor(convertedValue / 86400);
    unit = 'days';
  } else if (convertedValue >= 604800) {
    convertedValue = Math.floor(convertedValue / 604800);
    unit = 'weeks';
  }

  return convertedValue + ' ' + unit;
}

export const getUTMParametersFromURL = () => {
  const params = new URLSearchParams(window.location.search);

  const utmParams = {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
  };

  if (!utmParams.utm_source && !utmParams.utm_medium && !utmParams.utm_campaign) {
    return null;
  }

  return utmParams;
}

export const getUserClick = (event, props) => {
  const env = localStorage.getItem('applicationEnvironment');
  if(env === 'PROD' && mixpanelId()){
    mixpanel.track(event, props)
  }
}

export const sendGAEvent = async (client, eventName, params) => {
  const measurement_id = analyticsMeasurementId();
  const api_secret = analyticsApiSecret();
  await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${measurement_id}&api_secret=${api_secret}`, {
    method: "POST",
    body: JSON.stringify({
      client_id: client,
      events: [{
        name: eventName,
        params: params
      }]
    })
  });
}