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
 * @param {Function} options.onStreamChunk - 流式文本块回调函数 (batchIndex, batchTitle, textChunk, allBatchesContent)
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
    onStreamChunk,
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
      
      // 初始化当前批次的流式文本
      let currentBatchFullText = '';
      
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
        
        // 流式调用 API
        const response = await fetch(`${API.DIFY_CONFIG.baseURL}/workflows/run`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs,
            response_mode: 'streaming',
            user: API.DIFY_CONFIG.user,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData?.message || errorData?.data?.error || `API调用失败: ${response.status}`);
        }
        
        // 处理流式响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        let workflowRunId = null;
        let taskId = null;
        let finalOutputs = null;
        let hasError = false;
        let errorMessage = '';
        
        console.log(`[批次 ${i + 1}] 开始处理流式响应`);
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log(`[批次 ${i + 1}] 流式响应读取完成`);
              break;
            }
            
            // 解码数据块
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            // 处理 SSE 格式的数据（以 \n\n 分隔）
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || ''; // 保留最后一个不完整的数据块
            
            for (const line of lines) {
              if (!line.trim()) continue;
              
              // SSE 格式：data: {...}
              if (!line.startsWith('data: ')) {
                console.warn(`[批次 ${i + 1}] 跳过非 data 行:`, line.substring(0, 50));
                continue;
              }
              
              try {
                const jsonStr = line.substring(6); // 去掉 'data: ' 前缀
                const data = JSON.parse(jsonStr);
                
                // 处理不同的事件类型
                if (data.event === 'workflow_started') {
                  workflowRunId = data.workflow_run_id;
                  taskId = data.task_id;
                  console.log(`[批次 ${i + 1}] 工作流已启动:`, workflowRunId);
                } else if (data.event === 'text_chunk') {
                  // 收集文本块
                  if (data.data && data.data.text) {
                    const textChunk = data.data.text;
                    fullText += textChunk;
                    currentBatchFullText = fullText; // 更新当前批次的完整文本
                    console.log(`[批次 ${i + 1}] 收到文本块 (${textChunk.length} 字符):`, textChunk.substring(0, 50) + '...');
                    
                    // 实时回调，更新预览
                    if (onStreamChunk) {
                      try {
                        // 构建当前所有批次的内容（包括已完成的批次和当前批次的流式内容）
                        const allBatchesContent = [...batchResults];
                        // 添加当前批次的流式内容
                        allBatchesContent.push({
                          id: `batch-${i + 1}`,
                          title: batch.title,
                          content: currentBatchFullText
                        });
                        console.log(`[批次 ${i + 1}] 调用 onStreamChunk，总批次数: ${allBatchesContent.length}`);
                        onStreamChunk(i, batch.title, textChunk, allBatchesContent);
                      } catch (e) {
                        console.error(`[批次 ${i + 1}] 调用 onStreamChunk 失败:`, e);
                      }
                    } else {
                      console.warn(`[批次 ${i + 1}] onStreamChunk 回调未定义`);
                    }
                  }
                } else if (data.event === 'workflow_finished') {
                  // 工作流完成，提取最终结果
                  if (data.data) {
                    finalOutputs = data.data.outputs;
                    if (data.data.error) {
                      hasError = true;
                      errorMessage = data.data.error;
                    }
                    console.log(`[批次 ${i + 1}] 工作流已完成，状态:`, data.data.status);
                  }
                } else if (data.event === 'node_finished' && data.data && data.data.status === 'failed') {
                  // 节点失败
                  if (data.data.error) {
                    hasError = true;
                    errorMessage = data.data.error;
                  }
                  console.error(`[批次 ${i + 1}] 节点执行失败:`, data.data.error);
                } else {
                  console.log(`[批次 ${i + 1}] 收到事件:`, data.event);
                }
              } catch (e) {
                // 忽略解析错误，继续处理下一个数据块
                console.warn(`[批次 ${i + 1}] 解析 SSE 数据失败:`, e, line.substring(0, 100));
              }
            }
          }
          
          // 处理剩余的缓冲区数据
          if (buffer.trim()) {
            const lines = buffer.split('\n\n');
            for (const line of lines) {
              if (!line.trim() || !line.startsWith('data: ')) continue;
              try {
                const data = JSON.parse(line.substring(6));
                if (data.event === 'text_chunk' && data.data && data.data.text) {
                  fullText += data.data.text;
                  currentBatchFullText = fullText;
                  // 实时回调，更新预览
                  if (onStreamChunk) {
                    const allBatchesContent = [...batchResults];
                    allBatchesContent.push({
                      id: `batch-${i + 1}`,
                      title: batch.title,
                      content: currentBatchFullText
                    });
                    onStreamChunk(i, batch.title, data.data.text, allBatchesContent);
                  }
                } else if (data.event === 'workflow_finished' && data.data) {
                  finalOutputs = data.data.outputs;
                  if (data.data.error) {
                    hasError = true;
                    errorMessage = data.data.error;
                  }
                }
              } catch (e) {
                console.warn('解析 SSE 数据失败:', e);
              }
            }
          }
          
          // 检查是否有错误
          if (hasError) {
            throw new Error(errorMessage || '工作流执行失败');
          }
        } catch (streamErr) {
          throw new Error(`批次 ${i + 1} (${batch.title}) 流式处理失败: ${streamErr.message}`);
        }
        
        // 提取该批次的结果
        let batchContent = null;
        
        // 优先从 finalOutputs 中提取（流式输出的最终结果）
        if (finalOutputs && finalOutputs.content && Array.isArray(finalOutputs.content)) {
          // 如果是数组格式，收集所有内容项
          const contentItems = finalOutputs.content;
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
        } else if (finalOutputs && finalOutputs.text) {
          // 如果是文本格式
          batchContent = {
            id: `batch-${i + 1}`,
            title: batch.title,
            content: finalOutputs.text
          };
        } else if (fullText || currentBatchFullText) {
          // 使用收集的流式文本
          batchContent = {
            id: `batch-${i + 1}`,
            title: batch.title,
            content: fullText || currentBatchFullText
          };
        } else {
          // 其他格式，尝试提取
          batchContent = {
            id: `batch-${i + 1}`,
            title: batch.title,
            content: ''
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

