// 定义 KV 命名空间
const FORUM_POSTS = "forum_posts";
const ANNOUNCEMENT = "announcement";
const SUBMISSIONS = "submissions";

// CORS 配置
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 调试日志：记录所有请求
    console.log(`[${new Date().toISOString()}] ${request.method} ${path}`, {
      headers: Object.fromEntries(request.headers),
      cf: request.cf
    });

    // 处理预检请求 (OPTIONS)
    if (request.method === "OPTIONS") {
      console.log("处理 OPTIONS 预检请求");
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      let response;
      
      // 路由处理
      if (path.startsWith('/api/forum')) {
        response = await handleForum(request, env);
      } else if (path.startsWith('/api/announcement')) {
        response = await handleAnnouncement(request, env);
      } else if (path.startsWith('/api/submit')) {
        response = await handleSubmit(request, env);
      } else {
        response = new Response("Not Found", { status: 404 });
      }

      // 为所有响应添加 CORS 头
      const modifiedHeaders = new Headers(response.headers);
      for (const [key, value] of Object.entries(CORS_HEADERS)) {
        modifiedHeaders.set(key, value);
      }

      console.log("返回响应:", {
        status: response.status,
        headers: Object.fromEntries(modifiedHeaders)
      });

      return new Response(response.body, {
        status: response.status,
        headers: modifiedHeaders
      });

    } catch (error) {
      // 全局错误处理
      console.error("全局捕获异常:", error.stack);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS
        }
      });
    }
  }
};

// 论坛帖子处理
async function handleForum(request, env) {
  try {
    if (request.method === 'GET') {
      const posts = await env[FORUM_POSTS].get("posts") || "[]";
      return new Response(posts, { 
        headers: { "Content-Type": "application/json" } 
      });

    } else if (request.method === 'POST') {
      const rawBody = await request.clone().text();
      console.log("论坛POST原始数据:", rawBody);

      const data = await request.json();
      console.log("论坛POST解析数据:", data);

      const posts = JSON.parse(await env[FORUM_POSTS].get("posts") || "[]");
      posts.push({ 
        content: data.content, 
        timestamp: Date.now() 
      });

      await env[FORUM_POSTS].put("posts", JSON.stringify(posts));
      console.log("论坛数据已更新");

      return new Response("OK", { 
        headers: { "Content-Type": "application/json" } 
      });
    }

    return new Response("Method Not Allowed", { status: 405 });

  } catch (error) {
    console.error("论坛处理错误:", error);
    throw error;
  }
}

// 公告处理
async function handleAnnouncement(request, env) {
  if (request.method === 'GET') {
    const content = await env[ANNOUNCEMENT].get("latest") || "暂无公告";
    return new Response(JSON.stringify({ content }), { 
      headers: { "Content-Type": "application/json" } 
    });
  }
  return new Response("Method Not Allowed", { status: 405 });
}

// 用户提交处理
async function handleSubmit(request, env) {
  if (request.method === 'POST') {
    try {
      const rawBody = await request.clone().text();
      console.log("提交原始数据:", rawBody);

      const data = await request.json();
      console.log("提交解析数据:", data);

      const submissions = JSON.parse(
        await env[SUBMISSIONS].get("list") || "[]"
      );
      submissions.push({
        message: data.message,
        timestamp: Date.now()
      });

      await env[SUBMISSIONS].put("list", JSON.stringify(submissions));
      console.log("提交数据已存储");

      return new Response("OK", { 
        headers: { "Content-Type": "application/json" } 
      });

    } catch (error) {
      console.error("提交处理错误:", error);
      throw error;
    }
  }
  return new Response("Method Not Allowed", { status: 405 });
}
