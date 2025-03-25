// 定义 KV 命名空间（在 Cloudflare 控制台创建并绑定）
const FORUM_POSTS = "forum_posts";
const ANNOUNCEMENT = "announcement";
const SUBMISSIONS = "submissions";

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;

        // ============= 新增全局日志 =============
        console.log(`[${new Date().toISOString()}] 收到请求: ${request.method} ${path}`);
        console.log("请求头:", Object.fromEntries(request.headers));

        try {
            // 路由处理
            if (path.startsWith('/api/forum')) {
                return await handleForum(request, env);
            } else if (path.startsWith('/api/announcement')) {
                return await handleAnnouncement(request, env);
            } else if (path.startsWith('/api/submit')) {
                return await handleSubmit(request, env);
            }

            // 静态文件托管（由 Cloudflare Pages 处理）
            return fetch(request);
        } catch (error) {
            // ============= 新增错误日志 =============
            console.error("全局捕获异常:", error.stack);
            return new Response("Server Error", { status: 500 });
        }
    }
};

// 处理论坛帖子
async function handleForum(request, env) {
    if (request.method === 'GET') {
        const posts = await env[FORUM_POSTS].get("posts") || "[]";
        return new Response(posts, { headers: { 'Content-Type': 'application/json' } });
    } else if (request.method === 'POST') {
        // ============= 新增请求体日志 =============
        const rawBody = await request.clone().text();
        console.log("论坛POST请求原始数据:", rawBody);

        const data = await request.json();
        console.log("论坛POST解析数据:", data);

        const posts = JSON.parse(await env[FORUM_POSTS].get("posts") || "[]");
        posts.push({ content: data.content, timestamp: Date.now() });
        
        // ============= 新增KV写入日志 =============
        const putResult = await env[FORUM_POSTS].put("posts", JSON.stringify(posts));
        console.log("论坛KV写入结果:", putResult);

        return new Response("OK");
    }
}

// 处理公告
async function handleAnnouncement(request, env) {
    if (request.method === 'GET') {
        const content = await env[ANNOUNCEMENT].get("latest") || "暂无公告";
        return new Response(JSON.stringify({ content }), { 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}

// 处理用户提交
async function handleSubmit(request, env) {
    if (request.method === 'POST') {
        // ============= 新增详细提交日志 =============
        const rawBody = await request.clone().text();
        console.log("提交接口原始请求体:", rawBody);

        const data = await request.json();
        console.log("提交接口解析数据:", data);

        const submissions = JSON.parse(await env[SUBMISSIONS].get("list") || "[]");
        submissions.push({ 
            message: data.message, 
            timestamp: Date.now() 
        });

        // ============= 关键存储操作日志 =============
        console.log("准备存储到KV的数据:", submissions);
        const kvResult = await env[SUBMISSIONS].put("list", JSON.stringify(submissions));
        console.log("KV存储操作结果:", kvResult); // 成功应返回 undefined

        return new Response("OK", {
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    return new Response("Method Not Allowed", { status: 405 });
}
