/**
 * AI 智能增强服务
 * 用于自动生成书签描述和推荐分类
 */

import aiServiceManager from './ai-service-manager'

export interface CategoryOption {
  id: string
  name: string
}

export interface AIEnhancement {
  description?: string
  categoryId?: string
  categoryName?: string
  reason?: string
}

/**
 * 智能匹配分类：支持 ID 匹配 + Name 反向查找
 *
 * 匹配策略（按优先级）：
 * 1. 通过 categoryId 精确匹配
 * 2. 通过 categoryName 反向查找（忽略大小写和空格）
 * 3. 都失败则返回 null
 *
 * @param categoryId AI 返回的分类 ID
 * @param categoryName AI 返回的分类名称
 * @param categories 可用的分类列表
 * @returns 匹配到的分类，或 null
 */
function findMatchingCategory(
  categoryId: string | undefined,
  categoryName: string | undefined,
  categories: CategoryOption[]
): CategoryOption | null {
  // 策略 1: 通过 ID 精确匹配
  if (categoryId?.trim()) {
    const byId = categories.find(c => c.id === categoryId.trim())
    if (byId) {
      return byId
    }
  }

  // 策略 2: 通过 Name 反向查找（忽略大小写、空格）
  if (categoryName?.trim()) {
    const normalizedName = categoryName.toLowerCase().trim()
    const byName = categories.find(
      c => c.name.toLowerCase().trim() === normalizedName
    )
    if (byName) {
      return byName
    }
  }

  return null
}

/**
 * AI 智能增强：生成描述 + 推荐分类
 *
 * @param url 书签网址
 * @param title 书签标题
 * @param categories 现有分类列表
 * @returns AI 增强结果
 */
export async function enhanceBookmark(
  url: string,
  title: string,
  categories: CategoryOption[]
): Promise<AIEnhancement> {
  if (!aiServiceManager.hasValidApiKey()) {
    throw new Error('AI API 密钥未配置，请在设置中配置')
  }

  const client = aiServiceManager.getClient()
  const model = aiServiceManager.getChatModel()

  // 构建分类列表文本（简化格式，双重匹配策略会处理 ID/Name）
  const categoriesText = categories
    .map((c, i) => `${i + 1}. ${c.name}`)
    .join('\n')

  const prompt = `你是一个书签管理助手。根据以下信息，帮助用户智能填充书签。

**书签信息**：
- URL: ${url}
- 标题: ${title}

**现有分类列表**：
${categoriesText}

**任务**：
1. 生成一个简短的描述（15-30字，说明这个网站是做什么的）
2. 从现有分类中选择最合适的一个分类（填写分类名称即可）
3. 用10字内说明推荐理由

**输出格式**（严格的 JSON，不要添加其他内容）：
{
  "description": "网站的简短描述（中文，15-30字）",
  "categoryName": "从上面列表中选择一个分类名称",
  "reason": "推荐理由（10字内）"
}

**注意事项**：
- 如果 URL 或标题中包含明显的技术栈或领域信息，优先考虑对应分类
- 如果无法确定合适的分类，选择最通用的那个`

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的书签管理助手，擅长理解网站内容并进行分类。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    })

    const responseText = completion.choices[0]?.message?.content?.trim()

    if (!responseText) {
      throw new Error('AI 返回空响应')
    }

    // 解析 JSON 响应
    const result = parseAIResponse(responseText)

    // 验证分类列表是否为空
    if (categories.length === 0) {
      // 如果没有分类，只返回描述
      return {
        description: result.description,
        categoryId: undefined,
        categoryName: undefined,
        reason: undefined
      }
    }

    // 使用双重匹配策略：ID 优先，Name 降级
    const matchedCategory = findMatchingCategory(
      result.categoryId,
      result.categoryName,
      categories
    )

    if (matchedCategory) {
      // 匹配成功：使用找到的分类
      result.categoryId = matchedCategory.id
      result.categoryName = matchedCategory.name
    } else {
      // 匹配失败：使用默认分类（第一个）
      const firstCategory = categories[0]
      result.categoryId = firstCategory.id
      result.categoryName = firstCategory.name
      result.reason = `AI推荐的分类不存在，已归类到「${firstCategory.name}」`
    }

    return result
  } catch (error) {
    console.error('AI 增强失败:', error)
    throw new Error(`AI 增强失败: ${(error as Error).message}`)
  }
}

/**
 * 仅推荐分类（不生成描述）
 *
 * @param url 书签网址
 * @param title 书签标题
 * @param description 书签描述（可选）
 * @param categories 现有分类列表
 * @returns 推荐的分类
 */
export async function suggestCategory(
  url: string,
  title: string,
  description: string | undefined,
  categories: CategoryOption[]
): Promise<Pick<AIEnhancement, 'categoryId' | 'categoryName' | 'reason'>> {
  if (!aiServiceManager.hasValidApiKey()) {
    throw new Error('AI API 密钥未配置，请在设置中配置')
  }

  const client = aiServiceManager.getClient()
  const model = aiServiceManager.getChatModel()

  const categoriesText = categories
    .map((c, i) => `${i + 1}. ${c.name}`)
    .join('\n')

  const prompt = `你是一个书签分类助手。根据以下书签信息，从现有分类中选择最合适的一个。

**书签信息**：
- URL: ${url}
- 标题: ${title}
${description ? `- 描述: ${description}` : ''}

**现有分类列表**：
${categoriesText}

**输出格式**（严格的 JSON，不要添加其他内容）：
{
  "categoryName": "从上面列表中选择一个分类名称",
  "reason": "推荐理由（10字内）"
}

**示例**：
如果选择第一个分类"工作"，则输出：
{
  "categoryName": "工作",
  "reason": "与工作相关"
}`

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的书签分类助手。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    })

    const responseText = completion.choices[0]?.message?.content?.trim()

    if (!responseText) {
      throw new Error('AI 返回空响应')
    }

    const result = parseAIResponse(responseText)

    // 验证分类列表是否为空
    if (categories.length === 0) {
      throw new Error('分类列表为空，无法推荐分类')
    }

    // 使用双重匹配策略：ID 优先，Name 降级
    const matchedCategory = findMatchingCategory(
      result.categoryId,
      result.categoryName,
      categories
    )

    if (matchedCategory) {
      // 匹配成功：使用找到的分类
      result.categoryId = matchedCategory.id
      result.categoryName = matchedCategory.name
    } else {
      // 匹配失败：使用默认分类（第一个）
      console.warn('[suggestCategory] ❌ 匹配失败，使用默认分类')
      const firstCategory = categories[0]
      result.categoryId = firstCategory.id
      result.categoryName = firstCategory.name
      result.reason = `AI推荐的分类不存在，已归类到「${firstCategory.name}」`
    }

    return {
      categoryId: result.categoryId!,  // 断言非空
      categoryName: result.categoryName!,
      reason: result.reason!
    }
  } catch (error) {
    console.error('[suggestCategory] AI 分类推荐失败:', error)
    throw new Error(`AI 分类推荐失败: ${(error as Error).message}`)
  }
}

/**
 * 解析 AI 返回的 JSON 响应
 */
function parseAIResponse(text: string): AIEnhancement {
  try {
    // 尝试提取 JSON 部分（AI 可能会添加额外的文本）
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('未找到有效的 JSON 响应')
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      description: parsed.description || '',
      categoryId: parsed.categoryId || '',
      categoryName: parsed.categoryName || '',
      reason: parsed.reason || ''
    }
  } catch (error) {
    console.error('解析 AI 响应失败:', text)
    throw new Error('解析 AI 响应失败')
  }
}
