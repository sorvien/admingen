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

    const uiAssetsPath = join(import.meta.dirname, '..', '..', 'ui-assets');
    console.log('--- AdminGen Debug ---');
    console.log('Running from:', import.meta.dirname);
    console.log('Resolved uiAssetsPath:', uiAssetsPath);
    // console.log('Checking existence of index.html:', await Bun.file(join(uiAssetsPath, 'index.html')).exists());
    const app = new Elysia({ prefix: adminPath });

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
            api.get(`/${resourceName}`, handlers.findMany(resourceName));
            api.get(`/${resourceName}/:id`, handlers.findOne(resourceName));
            api.post(`/${resourceName}`, handlers.create(resourceName));
            api.patch(`/${resourceName}/:id`, handlers.update(resourceName));
            api.delete(`/${resourceName}/:id`, handlers.delete(resourceName));
        }
        return api;
    });

    if (beforeHandle) {
        app.onBeforeHandle((ctx) => beforeHandle(ctx));
    }

    // 2. STATIC ASSETS
    // 2. STATIC ASSETS
    // Manual handler for assets to ensure they are found and have correct mime type
    app.get('/assets/*', async ({ path, set }) => {
        const filePath = join(uiAssetsPath, path);
        const file = Bun.file(filePath);
        if (await file.exists()) {
            // Bun auto-sets content-type usually, but we can be explicit if needed
            return file;
        }
        return new Response('Asset not found', { status: 404 });
    });

    app.use(
        staticPlugin({
            assets: uiAssetsPath,
            prefix: '', // Serve at root relative to app (so /admin/assets -> assets/)
            indexHTML: false,
            alwaysStatic: true,
        })
    );

    // 3. index.html SPA fallback for ALL of:
    //   - /admin
    //   - /admin/
    //   - /admin/posts, etc.
    // This change is for Elysia: we need BOTH "" and "/*" to fully catch /admin (w/o slash) and anything else.
    // Serve index.html for both /admin and /admin/
    app.get('', async ({ set }) => {
        const htmlFile = Bun.file(join(uiAssetsPath, 'index.html'));
        if (await htmlFile.exists()) {
            set.headers['Content-Type'] = 'text/html; charset=utf-8';
            return htmlFile;
        }
        return new Response('Admin UI not found', { status: 404 });
    });

    app.get('/*', async ({ set }) => {
        const htmlFile = Bun.file(join(uiAssetsPath, 'index.html'));
        if (await htmlFile.exists()) {
            set.headers['Content-Type'] = 'text/html; charset=utf-8';
            return htmlFile;
        }
        return new Response('Admin UI not found', { status: 404 });
    });

    return app;
}