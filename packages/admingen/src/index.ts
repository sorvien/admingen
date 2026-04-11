import { Elysia } from 'elysia';
import { staticPlugin } from '@elysiajs/static';
import type { AdapterResult, AuthProvider } from '@blackwaves/admingen-types';
import { join } from 'path';

export interface AdminGenOptions {
    adapterResult: AdapterResult;
    adminPath?: string;
    beforeHandle?: (context: any) => any;
    authProvider?: AuthProvider;
}

export const AdminGen = ({
    adapterResult,
    adminPath = '/admin',
    beforeHandle,
    authProvider
}: AdminGenOptions) => {
    console.log('AdminGen Initializing (v2) with path:', adminPath);

    const uiAssetsPath = join(import.meta.dirname, '..', '..', 'ui-assets');
    console.log('--- AdminGen Debug ---');
    console.log('Running from:', import.meta.dirname);
    console.log('Resolved uiAssetsPath:', uiAssetsPath);
    // console.log('Checking existence of index.html:', await Bun.file(join(uiAssetsPath, 'index.html')).exists());
    const app = new Elysia({ prefix: adminPath });

    app.onError(({ code, error, set }: { code: any, error: any, set: any }) => {
        console.error(`[AdminGen Error] ${code}:`, error);
        return new Response(JSON.stringify({
            error: error.message,
            stack: error.stack,
            code
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    });

    // --- AUTHENTICATION ---
    // 1. Expose Auth State API
    app.get('/api/_auth/me', async (ctx) => {
        if (!authProvider) return { user: null };
        const user = await authProvider.authenticate(ctx);
        return { user };
    });

    // 1. API ROUTES (must come first)
    app.group('/api', (api) => {
        // Protect API Routes if Provider exists
        if (authProvider) {
            api.onBeforeHandle(async (ctx) => {
                // Allow checking auth state without auth (though _auth/me is likely outside this group)
                if (ctx.path.includes('/_auth/')) return;

                const user = await authProvider.authenticate(ctx);
                if (!user) {
                    return new Response('Unauthorized', { status: 401 });
                }
            });
        }

        const { schemaJson, handlers } = adapterResult;
        api.get('/_schema', () => schemaJson);

        for (const resource of schemaJson.resources) {
            const resourceName = resource.name;
            api.get(`/${resourceName}`, (ctx) => handlers.findMany(resourceName)(ctx));
            api.get(`/${resourceName}/:id`, (ctx) => handlers.findOne(resourceName)(ctx));
            api.post(`/${resourceName}`, (ctx) => handlers.create(resourceName)(ctx));
            api.patch(`/${resourceName}/:id`, (ctx) => handlers.update(resourceName)(ctx));
            api.delete(`/${resourceName}/:id`, (ctx) => handlers.delete(resourceName)(ctx));
        }
        return api;
    });

    if (beforeHandle) {
        app.onBeforeHandle((ctx) => beforeHandle(ctx));
    }

    // 2. STATIC ASSETS
    // Serve static assets (favicon, manifest, etc.) and JS/CSS files
    app.get('/*', async ({ path, set }) => {
        console.log('Static asset request:', path);
        // Strip the adminPath from the path to look up the file
        // e.g. /admin/assets/index.js -> assets/index.js
        // e.g. /admin/favicon.ico -> favicon.ico
        let relativePath = path;
        if (path.startsWith(adminPath)) {
            relativePath = path.slice(adminPath.length);
        }
        if (relativePath.startsWith('/')) {
            relativePath = relativePath.slice(1);
        }
        console.log('Resolved relativePath:', relativePath);

        // 1. Check for specific file in ui-assets
        if (relativePath) {
            const filePath = join(uiAssetsPath, relativePath);
            const file = Bun.file(filePath);
            if (await file.exists()) {
                return file;
            }
        }

        // 2. Fallback to index.html for SPA routes (if not an asset request)
        if (!relativePath.includes('.') || relativePath.endsWith('.html')) {
            const htmlFile = Bun.file(join(uiAssetsPath, 'index.html'));
            if (await htmlFile.exists()) {
                set.headers['Content-Type'] = 'text/html; charset=utf-8';
                return htmlFile;
            }
        }

        return new Response('Not found', { status: 404 });
    });

    // Handle root /admin and /admin/ (duplicate of above but explicit for Elysia's router)
    app.get('', async ({ set }) => {
        const htmlFile = Bun.file(join(uiAssetsPath, 'index.html'));
        if (await htmlFile.exists()) {
            set.headers['Content-Type'] = 'text/html; charset=utf-8';
            return htmlFile;
        }
        return new Response('Admin UI not found', { status: 404 });
    });

    return app;
}