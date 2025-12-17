/**
 * 分批提交工具
 * 根据标书大纲的层级结构，按一级标题（#）分批提交，最后合并结果
 */

/**
 * 解析标书大纲，提取所有一级标题及其下的内容
 * @param {string} outline - 标书大纲的 Markdown 文本
 * @returns {Array} 返回数组，每个元素包含 {title: '一级标题', content: '该标题下的所有内容'}
 */
function parseOutlineToBatches(outline) {
  const batches = [];
  const lines = outline.split('\n');
  let currentBatch = null;
  let currentContent = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 检查是否是一级标题（# 开头，且不是 ##）
    if (line.match(/^#\s+[^#]/)) {
      // 如果之前有批次，先保存
      if (currentBatch) {
        currentBatch.content = currentContent.join('\n').trim();
        batches.push(currentBatch);
      }
      
      // 开始新的批次
      currentBatch = {
        title: line.replace(/^#\s+/, '').trim(),
        content: ''
      };
      currentContent = [line]; // 包含标题本身
    } else if (currentBatch) {
      // 如果当前在某个批次中，继续收集内容
      currentContent.push(line);
    }
  }
  
  // 保存最后一个批次
  if (currentBatch) {
    currentBatch.content = currentContent.join('\n').trim();
    batches.push(currentBatch);
  }
  
  return batches;
}

/**
 * 简单的字符串哈希函数（支持中文）
 */
function simpleHash(str) {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * 生成批次进度的存储键
 */
function getBatchProgressKey(outline, parseResult, companyResult, userReq) {
  // 使用关键参数的哈希值作为键（支持中文）
  const combined = (outline || '') + (parseResult || '') + (companyResult || '') + (userReq || '');
  const hash = simpleHash(combined);
  const key = `batchSubmit_${hash}`;
  return key;
}

/**
 * 保存批次进度
 */
function saveBatchProgress(key, completedBatches, totalBatches) {
  try {
    localStorage.setItem(key, JSON.stringify({
      completedBatches: completedBatches,
      totalBatches: totalBatches,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error('保存批次进度失败:', e);
  }
}

/**
 * 获取批次进度
 */
function getBatchProgress(key) {
  try {
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('获取批次进度失败:', e);
  }
  return null;
}

/**
 * 清除批次进度
 */
function clearBatchProgress(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('清除批次进度失败:', e);
  }
}

/**
 * 分批提交标书内容（支持断点续传）
 * @param {Object} options - 配置选项
 * @param {string} options.outline - 标书大纲
 * @param {string} options.parseResult - 招标需求
 * @param {string} options.companyResult - 公司资料
 * @param {string} options.userReq - 用户需求
 * @param {string} options.apiKey - API Key
 * @param {Function} options.onProgress - 进度回调函数 (current, total, batchTitle)
 * @param {Function} options.onError - 错误回调函数 (error)
 * @param {boolean} options.resume - 是否从上次失败点继续（默认 true）
 * @returns {Promise<Object>} 返回合并后的完整响应数据
 */
async function batchSubmitTender(options) {
  const {
    outline,
    parseResult,
    companyResult,
    userReq,
    apiKey,
    onProgress,
    onError,
    resume = true
  } = options;
  
  try {
    // 解析大纲为批次
    const batches = parseOutlineToBatches(outline);
    
    if (batches.length === 0) {
      throw new Error('无法解析标书大纲，请确保大纲包含一级标题（# 开头）');
    }
    
    // 生成进度存储键
    const progressKey = getBatchProgressKey(outline, parseResult || '', companyResult || '', userReq || '');
    
    // 存储所有批次的结果
    let batchResults = [];
    let startIndex = 0;
    
    // 检查是否有未完成的批次（断点续传）
    if (resume) {
      const progress = getBatchProgress(progressKey);
      if (progress && progress.completedBatches && progress.completedBatches.length > 0) {
        // 检查批次数量是否匹配
        if (progress.totalBatches === batches.length) {
          batchResults = progress.completedBatches;
          startIndex = batchResults.length;
          
          if (onProgress) {
            onProgress(startIndex, batches.length, `从第 ${startIndex + 1} 个批次继续提交...`);
          }
        } else {
          // 批次数量不匹配，清除旧进度
          clearBatchProgress(progressKey);
          batchResults = [];
          startIndex = 0;
        }
      }
    } else {
      // 不续传，清除旧进度
      clearBatchProgress(progressKey);
    }
    
    if (startIndex === 0 && onProgress) {
      onProgress(0, batches.length, '开始分批提交...');
    }
    
    // 依次提交每个批次（从 startIndex 开始）
    for (let i = startIndex; i < batches.length; i++) {
      const batch = batches[i];
      
      if (onProgress) {
        onProgress(i + 1, batches.length, `正在提交：${batch.title}`);
      }
      
      try {
        // 构建该批次的输入
        const inputs = {
          outline_content: batch.content, // 只提交当前批次的大纲内容
          company_data: companyResult || '',
        };
        
        if (parseResult && parseResult.trim()) {
          inputs.previous_result = parseResult.trim();
        }
        
        if (userReq && userReq.trim()) {
          inputs[API.DIFY_CONFIG.inputKeys.userRequirementsKey || 'user_requirements'] = userReq.trim();
        }
        
        // 调用 API
        const response = await fetch(`${API.DIFY_CONFIG.baseURL}/workflows/run`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs,
            response_mode: 'blocking',
            user: API.DIFY_CONFIG.user,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData?.message || errorData?.data?.error || `API调用失败: ${response.status}`);
        }
        
        const responseData = await response.json();
        if (responseData?.data?.error) {
          throw new Error(responseData.data.error);
        }
        
        // 提取该批次的结果
        let batchContent = null;
        
        // 优先从 outputs.content 数组获取（这是 step4 的标准格式）
        if (responseData?.data?.outputs?.content && Array.isArray(responseData.data.outputs.content)) {
          // 如果是数组格式，收集所有内容项
          const contentItems = responseData.data.outputs.content;
          if (contentItems.length === 1) {
            // 只有一个元素，直接使用
            batchContent = {
              id: contentItems[0].id || `batch-${i + 1}`,
              title: contentItems[0].title || batch.title,
              content: contentItems[0].content || ''
            };
          } else if (contentItems.length > 1) {
            // 多个元素，合并为一个（保持原有结构）
            batchContent = {
              id: `batch-${i + 1}`,
              title: batch.title,
              content: contentItems.map(item => {
                const itemTitle = item.title || '';
                const itemContent = item.content || '';
                return itemTitle ? `## ${itemTitle}\n\n${itemContent}` : itemContent;
              }).join('\n\n')
            };
          }
        } else if (responseData?.data?.outputs?.text) {
          // 如果是文本格式
          batchContent = {
            id: `batch-${i + 1}`,
            title: batch.title,
            content: responseData.data.outputs.text
          };
        } else {
          // 其他格式，尝试提取
          const extractedContent = Utils.getResultContent(responseData);
          batchContent = {
            id: `batch-${i + 1}`,
            title: batch.title,
            content: extractedContent
          };
        }
        
        // 确保 batchContent 是对象格式
        if (typeof batchContent === 'string') {
          batchContent = {
            id: `batch-${i + 1}`,
            title: batch.title,
            content: batchContent
          };
        } else if (!batchContent || typeof batchContent !== 'object') {
          // 如果提取失败，创建默认对象
          batchContent = {
            id: `batch-${i + 1}`,
            title: batch.title,
            content: ''
          };
        }
        
        // 确保有 id 和 title
        if (!batchContent.id) batchContent.id = `batch-${i + 1}`;
        if (!batchContent.title) batchContent.title = batch.title;
        if (!batchContent.content) batchContent.content = '';
        
        batchResults.push(batchContent);
        
        // 保存当前进度（每完成一个批次就保存）
        saveBatchProgress(progressKey, batchResults, batches.length);
        
      } catch (err) {
        // 出错时保存已完成的批次，以便下次继续
        saveBatchProgress(progressKey, batchResults, batches.length);
        
        if (onError) {
          onError(new Error(`批次 ${i + 1} (${batch.title}) 提交失败: ${err.message}`));
        }
        throw err;
      }
    }
    
    // 所有批次都完成了，清除进度
    clearBatchProgress(progressKey);
    
    // 合并所有批次的结果
    const mergedResult = {
      workflow_run_id: `merged-${Date.now()}`,
      task_id: `merged-${Date.now()}`,
      data: {
        id: `merged-${Date.now()}`,
        workflow_id: 'merged',
        status: 'succeeded',
        outputs: {
          content: batchResults
        },
        elapsed_time: 0,
        total_tokens: 0,
        total_steps: batches.length,
        created_at: Math.floor(Date.now() / 1000),
        finished_at: Math.floor(Date.now() / 1000)
      }
    };
    
    if (onProgress) {
      onProgress(batches.length, batches.length, '所有批次提交完成，正在合并结果...');
    }
    
    return mergedResult;
    
  } catch (err) {
    if (onError) {
      onError(err);
    }
    throw err;
  }
}

// 导出到全局
window.BatchSubmit = {
  parseOutlineToBatches,
  batchSubmitTender,
  getBatchProgressKey,
  getBatchProgress,
  clearBatchProgress,
  saveBatchProgress
};

