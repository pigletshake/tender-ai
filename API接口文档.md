# 易标AI API 接口文档

## 基础信息

- **Base URL**: `http://your-api-domain.com/api`
- **请求格式**: `multipart/form-data` (POST)
- **响应格式**: `application/json`

## 通用响应格式

### 成功响应
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "content": "返回的内容文本",
    "metadata": {}
  }
}
```

### 错误响应
```json
{
  "code": 400,
  "message": "错误信息",
  "data": null
}
```

---

## 接口列表

### 1. 解析招标文件

**接口地址**: `/parse`

**请求方法**: `POST`

**请求参数**:
- `file` (File, 必填): 招标文件，支持格式：Word(.doc, .docx)、PDF(.pdf)、TXT(.txt)、MD(.md)
- 文件大小限制：最大 50MB

**请求示例**:
```javascript
const formData = new FormData();
formData.append('file', fileObject);
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "content": "招标文件解析结果：\n\n项目名称：XX系统建设项目\n招标单位：XX公司\n项目预算：500万元\n技术要求：...\n商务要求：...",
    "metadata": {
      "project_name": "XX系统建设项目",
      "budget": "500万元",
      "deadline": "2024-12-31"
    }
  }
}
```

---

### 2. 生成标书大纲

**接口地址**: `/outline`

**请求方法**: `POST`

**请求参数**:
- `file` (File, 必填): 原始招标文件
- `previous_result` (String, 可选): 上一步结果的JSON字符串

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "content": "标书大纲：\n\n一、投标函\n二、法定代表人身份证明\n三、授权委托书\n四、投标报价表\n五、技术方案\n  5.1 项目概述\n  5.2 技术架构\n  5.3 实施方案\n六、商务响应\n  6.1 商务条款响应表\n  6.2 服务承诺\n七、资质证明文件\n八、其他材料",
    "metadata": {
      "sections": [
        "投标函",
        "法定代表人身份证明",
        "授权委托书",
        "投标报价表",
        "技术方案",
        "商务响应",
        "资质证明文件",
        "其他材料"
      ]
    }
  }
}
```

---

### 3. 生成技术方案

**接口地址**: `/technical`

**请求方法**: `POST`

**请求参数**:
- `file` (File, 必填): 原始招标文件
- `previous_result` (String, 可选): 上一步结果的JSON字符串

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "content": "技术方案：\n\n5.1 项目概述\n本项目旨在建设一套完整的XX系统，满足招标文件中的所有技术要求。\n\n5.2 技术架构\n采用微服务架构，使用Spring Cloud框架，数据库采用MySQL 8.0，缓存使用Redis。\n\n5.3 实施方案\n第一阶段：需求调研（1个月）\n第二阶段：系统设计（1个月）\n第三阶段：开发实施（3个月）\n第四阶段：测试验收（1个月）\n\n5.4 技术优势\n- 采用成熟稳定的技术栈\n- 具备高可用性和可扩展性\n- 完善的监控和运维体系",
    "metadata": {
      "sections": [
        "项目概述",
        "技术架构",
        "实施方案",
        "技术优势"
      ]
    }
  }
}
```

---

### 4. 生成商务响应

**接口地址**: `/business`

**请求方法**: `POST`

**请求参数**:
- `file` (File, 必填): 原始招标文件
- `previous_result` (String, 可选): 上一步结果的JSON字符串

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "content": "商务响应：\n\n6.1 商务条款响应表\n\n| 条款 | 招标要求 | 响应情况 | 说明 |\n|------|---------|---------|------|\n| 付款方式 | 验收后付款 | 完全响应 | 同意验收后付款 |\n| 交付周期 | 6个月 | 完全响应 | 承诺6个月内完成 |\n| 质保期 | 3年 | 完全响应 | 提供3年免费质保 |\n\n6.2 服务承诺\n- 提供7×24小时技术支持\n- 30分钟内响应故障\n- 定期巡检和维护\n- 免费培训服务",
    "metadata": {
      "response_items": [
        {
          "clause": "付款方式",
          "requirement": "验收后付款",
          "response": "完全响应"
        }
      ]
    }
  }
}
```

---

### 5. 合规检查

**接口地址**: `/compliance`

**请求方法**: `POST`

**请求参数**:
- `file` (File, 必填): 原始招标文件
- `previous_result` (String, 可选): 上一步结果的JSON字符串

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "content": "合规检查结果：\n\n✓ 检查项1：文件格式符合要求 - 通过\n✓ 检查项2：所有必填项已填写 - 通过\n✓ 检查项3：报价在预算范围内 - 通过\n✓ 检查项4：技术方案满足要求 - 通过\n✓ 检查项5：商务条款完全响应 - 通过\n✓ 检查项6：资质文件齐全 - 通过\n\n总体评价：所有检查项均通过，标书符合招标要求。\n\n建议：\n1. 建议补充项目案例说明\n2. 建议增加团队介绍",
    "metadata": {
      "total_checks": 6,
      "passed_checks": 6,
      "failed_checks": 0,
      "suggestions": [
        "建议补充项目案例说明",
        "建议增加团队介绍"
      ]
    }
  }
}
```

---

### 6. 最终合并

**接口地址**: `/merge`

**请求方法**: `POST`

**请求参数**:
- `file` (File, 必填): 原始招标文件
- `previous_result` (String, 可选): 上一步结果的JSON字符串

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "content": "合并后的完整标书：\n\n[包含所有步骤的内容，按照标准标书格式组织]\n\n一、投标函\n...\n\n二、技术方案\n...\n\n三、商务响应\n...\n\n四、其他材料\n...",
    "metadata": {
      "total_pages": 50,
      "sections": 8
    }
  }
}
```

---

### 7. 导出Word文档

**接口地址**: `/export`

**请求方法**: `POST`

**请求参数**:
- `data` (String, 必填): 所有步骤结果的JSON字符串

**响应**:
- Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- 返回Word文档的二进制流

**响应示例**:
```
[Word文档二进制流]
```

---

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 接口不存在 |
| 413 | 文件过大 |
| 415 | 不支持的文件格式 |
| 500 | 服务器内部错误 |

---

## 注意事项

1. 所有接口都需要上传原始文件，即使后续步骤也需要
2. `previous_result` 参数用于传递上一步的结果，格式为JSON字符串
3. 文件上传使用 `multipart/form-data` 格式
4. 所有接口都是同步调用，可能需要较长时间，建议前端设置合理的超时时间
5. 导出接口返回的是Word文档的二进制流，前端需要处理为blob并触发下载

