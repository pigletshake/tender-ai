// Dify 与后端接口配置（可按需修改）
const DIFY_CONFIG = {
  baseURL: 'http://172.16.120.60/v1',
  apiKeys: {
    step1: 'app-5fU1q7kTeszfkz4nU52oc9Gs',
    step2: 'app-vECS70cwkyrd0UKOFuMQ0tlb',
    step3: 'app-IqcrIwuYXQmVBjXWDAn1e6uz',
    step4: 'app-nJIgslrIw5gjUGUjdCZvBN8U',
    step5: 'app-s3g0APfB2hEDxDXOEBbO1z1e',
    step6: '',
  },
  inputKeys: {
    step1FileKey: 'tender_documents',
    step3CompanyKey: 'company_files',
    userRequirementsKey: 'user_requirements',
  },
  user: 'user-123',
};

const API_BASE_URL = 'http://localhost:8000/api';
const API_ENDPOINTS = {
  step1: '/parse',
  step2: '/outline',
  step3: '/company',
  step4: '/write',
  step5: '/compliance',
  step6: '/merge',
};

async function uploadFileToDify(file, fileType = 'TXT', apiKey) {
  if (!apiKey) throw new Error('Dify API Key未配置');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user', DIFY_CONFIG.user);
  formData.append('type', fileType);
  const res = await fetch(`${DIFY_CONFIG.baseURL}/files/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`文件上传失败: ${res.status}`);
  const data = await res.json();
  const uploadId = data?.id || data?.data?.id;
  if (!uploadId) throw new Error('文件上传失败: 未返回文件ID');
  return uploadId;
}

function getFileType(file) {
  const ext = file.name.split('.').pop().toUpperCase();
  const typeMap = {
    TXT: 'TXT',
    MD: 'MD',
    MARKDOWN: 'MARKDOWN',
    PDF: 'PDF',
    HTML: 'HTML',
    XLSX: 'XLSX',
    XLS: 'XLS',
    CSV: 'CSV',
    DOCX: 'DOCX',
    DOC: 'DOCX',
    EML: 'EML',
    MSG: 'MSG',
    PPTX: 'PPTX',
    PPT: 'PPTX',
    XML: 'XML',
    EPUB: 'EPUB',
    JPG: 'JPG',
    JPEG: 'JPEG',
    PNG: 'PNG',
    GIF: 'GIF',
    WEBP: 'WEBP',
    SVG: 'SVG',
    MP3: 'MP3',
    M4A: 'M4A',
    WAV: 'WAV',
    WEBM: 'WEBM',
    AMR: 'AMR',
    MP4: 'MP4',
    MOV: 'MOV',
    MPEG: 'MPEG',
    MPGA: 'MPGA',
  };
  return typeMap[ext] || 'TXT';
}

function getFileCategory(fileType) {
  const documentTypes = ['TXT', 'MD', 'MARKDOWN', 'PDF', 'HTML', 'XLSX', 'XLS', 'DOCX', 'CSV', 'EML', 'MSG', 'PPTX', 'PPT', 'XML', 'EPUB'];
  const imageTypes = ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG'];
  const audioTypes = ['MP3', 'M4A', 'WAV', 'WEBM', 'AMR'];
  const videoTypes = ['MP4', 'MOV', 'MPEG', 'MPGA'];
  if (documentTypes.includes(fileType)) return 'document';
  if (imageTypes.includes(fileType)) return 'image';
  if (audioTypes.includes(fileType)) return 'audio';
  if (videoTypes.includes(fileType)) return 'video';
  return 'custom';
}

async function callDifyWorkflow(apiKey, inputs = {}) {
  if (!apiKey) throw new Error('Dify API Key未配置');
  const body = {
    inputs,
    response_mode: 'blocking',
    user: DIFY_CONFIG.user,
  };
  const res = await fetch(`${DIFY_CONFIG.baseURL}/workflows/run`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.data?.error || res.statusText;
    throw new Error(msg || `Dify API调用失败: ${res.status}`);
  }
  if (data?.data?.error) throw new Error(data.data.error);
  if (data?.data?.outputs?.text) return data.data.outputs.text;
  if (data?.data?.outputs) return data.data.outputs;
  if (data?.data) return data.data;
  if (data?.outputs) return data.outputs;
  return data;
}

async function callAPI(stepNum, formData) {
  // 后端兼容模式
  const endpoint = API_ENDPOINTS[`step${stepNum}`];
  const url = API_BASE_URL + endpoint;
  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.code === 200 && data.data) return data.data;
  return data;
}

window.API = {
  DIFY_CONFIG,
  API_BASE_URL,
  uploadFileToDify,
  callDifyWorkflow,
  getFileType,
  getFileCategory,
  callAPI,
};

