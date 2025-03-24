// 定义 KV 命名空间（在 Cloudflare 控制台创建并绑定）
const FORUM_POSTS = "forum_posts";
const ANNOUNCEMENT = "announcement";
const SUBMISSIONS = "submissions";

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;

        // 路由处理
        if (path.startsWith('/api/forum')) {
            return handleForum(request, env);
        } else if (path.startsWith('/api/announcement')) {
            return handleAnnouncement(request, env);
        } else if (path.startsWith('/api/submit')) {
            return handleSubmit(request, env);
        }

        // 静态文件托管（由 Cloudflare Pages 处理）
        return fetch(request);
    }
};

// 处理论坛帖子
async function handleForum(request, env) {
    if (request.method === 'GET') {
        const posts = await env[FORUM_POSTS].get("posts") || "[]";
        return new Response(posts, { headers: { 'Content-Type': 'application/json' } });
    } else if (request.method === 'POST') {
        const data = await request.json();
        const posts = JSON.parse(await env[FORUM_POSTS].get("posts") || "[]");
        posts.push({ content: data.content, timestamp: Date.now() });
        await env[FORUM_POSTS].put("posts", JSON.stringify(posts));
        return new Response("OK");
    }
}

// 处理公告
async function handleAnnouncement(request, env) {
    if (request.method === 'GET') {
        const content = await env[ANNOUNCEMENT].get("latest") || "暂无公告";
        return new Response(JSON.stringify({ content }), { headers: { 'Content-Type': 'application/json' } });
    }
}

// 处理用户提交
async function handleSubmit(request, env) {
    if (request.method === 'POST') {
        const data = await request.json();
        const submissions = JSON.parse(await env[SUBMISSIONS].get("list") || "[]");
        submissions.push({ message: data.message, timestamp: Date.now() });
        await env[SUBMISSIONS].put("list", JSON.stringify(submissions));
        return new Response("OK");
    }
}