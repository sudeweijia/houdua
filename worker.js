// 定义 KV 命名空间常量
const FORUM_POSTS = "forum_posts";
const ANNOUNCEMENT = "announcement";
const SUBMISSIONS = "submissions";

// 增强的CORS配置
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Expose-Headers": "X-Custom-Header"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 增强的请求日志
    console.log(`[${new Date().toISOString()}] ${request.method} ${path}`, {
      cf: request.cf,
      headers: Object.fromEntries(request.headers),
      body: request.method !== 'GET' ? await request.clone().text() : null
    });

    // 统一处理OPTIONS预检请求
    if (request.method === "OPTIONS") {
      console.log(`处理OPTIONS预检请求: ${path}`);
      return new Response(null, { 
        headers: CORS_HEADERS 
      });
    }

    try {
      let response;
      
      // 路由分发
      if (path.startsWith('/api/forum')) {
        response = await handleForum(request, env);
      } else if (path.startsWith('/api/announcement')) {
        response = await handleAnnouncement(request, env);
      } else if (path.startsWith('/api/submit')) {
        response = await handleSubmit(request, env);
      } else if (path === '/debug') {
        // 调试端点
        response = new Response(JSON.stringify({
          status: "debug",
          timestamp: Date.now()
        }), { 
          headers: { "Content-Type": "application/json" } 
        });
      } else {
        response = new Response("Not Found", { status: 404 });
      }

      // 统一添加CORS头
      const headers = new Headers(response.headers);
      Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        headers.set(key, value);
      });

      // 响应日志
      console.log(`返回响应: ${path}`, {
        status: response.status,
        headers: Object.fromEntries(headers)
      });

      return new Response(response.body, {
        status: response.status,
        headers
      });

    } catch (error) {
      // 增强的错误处理
      console.error("全局捕获异常:", {
        error: error.message,
        stack: error.stack,
        url: request.url
      });
      
      return new Response(JSON.stringify({ 
        error: error.message,
        success: false
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS
        }
      });
    }
  }
};

// --- 功能模块处理函数 ---

/**
 * 论坛帖子处理
 */
async function handleForum(request, env) {
  try {
    const db = env[FORUM_POSTS];
    
    if (request.method === 'GET') {
      // 获取帖子列表
      const posts = await db.get("posts", { type: "json" }) || [];
      return new Response(JSON.stringify(posts), { 
        headers: { "Content-Type": "application/json" } 
      });

    } else if (request.method === 'POST') {
      // 创建新帖子
      const data = await request.json();
      const posts = await db.get("posts", { type: "json" }) || [];
      
      const newPost = {
        id: crypto.randomUUID(),
        content: data.content,
        timestamp: Date.now(),
        author: data.author || "匿名用户"
      };
      
      posts.push(newPost);
      await db.put("posts", JSON.stringify(posts));
      
      return new Response(JSON.stringify(newPost), { 
        status: 201,
        headers: { "Content-Type": "application/json" } 
      });
    }

    return new Response("Method Not Allowed", { status: 405 });

  } catch (error) {
    console.error("论坛处理错误:", error);
    throw error;
  }
}

/**
 * 公告处理
 */
async function handleAnnouncement(request, env) {
  const db = env[ANNOUNCEMENT];
  
  if (request.method === 'GET') {
    const content = await db.get("latest") || "暂无公告";
    return new Response(JSON.stringify({ 
      content,
      updatedAt: await db.get("updatedAt") 
    }), { 
      headers: { "Content-Type": "application/json" } 
    });
    
  } else if (request.method === 'POST') {
    // 管理员更新公告
    const { content } = await request.json();
    await db.put("latest", content);
    await db.put("updatedAt", new Date().toISOString());
    
    return new Response("OK", { status: 200 });
  }
  
  return new Response("Method Not Allowed", { status: 405 });
}

/**
 * 用户提交处理 (增强版)
 */
async function handleSubmit(request, env) {
  if (request.method !== 'POST') {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const db = env[SUBMISSIONS];
    const data = await request.json();
    
    // 数据验证
    if (!data.message || data.message.trim().length === 0) {
      return new Response(JSON.stringify({ 
        error: "消息内容不能为空",
        success: false
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" } 
      });
    }

    // 存储提交
    const submission = {
      id: crypto.randomUUID(),
      message: data.message.trim(),
      timestamp: Date.now(),
      ip: request.headers.get('CF-Connecting-IP')
    };

    const submissions = await db.get("list", { type: "json" }) || [];
    submissions.push(submission);
    await db.put("list", JSON.stringify(submissions));

    return new Response(JSON.stringify({
      success: true,
      id: submission.id
    }), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error("提交处理错误:", error);
    throw error;
  }
}
