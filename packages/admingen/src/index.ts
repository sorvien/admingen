import { Elysia } from 'elysia';
import type { AdapterResult, AuthProvider } from '@sorvien/admingen-types';
export * from '@sorvien/admingen-types';
import { join } from 'path';
import { existsSync } from 'fs';

export interface AdminGenOptions {
    adapterResult: AdapterResult;
    adminPath?: string;
    beforeHandle?: (context: any) => any;
    authProvider?: AuthProvider;
    debug?: boolean;
}

function resolveUiAssetsPath(): string {
    const candidates = [
        join(import.meta.dirname, '..', '..', 'ui-assets'),
        join(import.meta.dirname, '..', 'ui-assets'),
        join(import.meta.dirname, 'ui-assets'),
        join(import.meta.dirname, '..', '..', 'ui', 'dist'),
        join(import.meta.dirname, '..', '..', '..', 'packages', 'ui', 'dist'),
    ];

    for (const candidate of candidates) {
        if (existsSync(join(candidate, 'index.html'))) {
            return candidate;
        }
    }
    return candidates[0];
}

export const AdminGen = ({
    adapterResult,
    adminPath = '/admin',
    beforeHandle,
    authProvider,
    debug = false
}: AdminGenOptions) => {
    const uiAssetsPath = resolveUiAssetsPath();

    if (debug) {
        console.log(`[AdminGen] Initializing with path: ${adminPath}`);
        console.log(`[AdminGen] Resolved UI assets: ${uiAssetsPath}`);
    }

    const app = new Elysia({ prefix: adminPath });

    app.onError(({ code, error }: { code: any, error: any }) => {
        console.error(`[AdminGen Error] ${code}:`, error);
        return new Response(JSON.stringify({
            error: error.message,
            stack: debug ? error.stack : undefined,
            code
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    });

    // --- AUTHENTICATION ---
    app.get('/api/_auth/me', async (ctx) => {
        if (!authProvider) {
            // When no authProvider is configured, auth is disabled.
            // Return an admin user so the zero-config dashboard works immediately.
            return { user: { id: 'admin', name: 'Admin (No Auth)' }, authEnabled: false };
        }
        const user = await authProvider.authenticate(ctx);
        return { user, authEnabled: true };
    });

    // --- API ROUTES ---
    app.group('/api', (api) => {
        if (authProvider) {
            api.onBeforeHandle(async (ctx) => {
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

    // --- STATIC ASSETS & SPA SERVING ---
    const serveIndexHtml = async (set: any) => {
        const htmlFile = Bun.file(join(uiAssetsPath, 'index.html'));
        if (await htmlFile.exists()) {
            set.headers['Content-Type'] = 'text/html; charset=utf-8';
            return htmlFile;
        }
        return new Response('Admin UI build not found. Did you run build?', { status: 404 });
    };

    // 1. Root /admin and /admin/
    app.get('/', async ({ set }) => serveIndexHtml(set));
    app.get('', async ({ set }) => serveIndexHtml(set));

    // 2. Wildcard assets and SPA client-side deep links
    app.get('/*', async ({ path, set }) => {
        let relativePath = path;
        if (path.startsWith(adminPath)) {
            relativePath = path.slice(adminPath.length);
        }
        if (relativePath.startsWith('/')) {
            relativePath = relativePath.slice(1);
        }

        if (relativePath) {
            const filePath = join(uiAssetsPath, relativePath);
            const file = Bun.file(filePath);
            if (await file.exists()) {
                return file;
            }

            // If the URL has a file extension (e.g. .js, .css, .png, .ico), don't return HTML
            if (/\.[a-zA-Z0-9]+$/.test(relativePath)) {
                return new Response('File not found', { status: 404 });
            }
        }

        // Fallback to index.html for SPA router routes (e.g. /admin/posts, /admin/login)
        return serveIndexHtml(set);
    });

    return app;
};

export const admingen = AdminGen;
export default AdminGen;