import 'dotenv/config';
import axios from 'axios';
import cors from 'cors';
import express from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
const app = express();
app.use(cors({
    origin: '*',
    exposedHeaders: ['Mcp-Session-Id'],
    allowedHeaders: ['Content-Type', 'Mcp-Session-Id'],
}));
app.use(express.json());
const serverInfo = {
    name: 'top-movers-app',
    version: '1.0.0',
};
const mcpServer = new McpServer(serverInfo);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const widgetPath = path.resolve(__dirname, '../ui/widget.html');
let widgetHtml = '';
try {
    widgetHtml = readFileSync(widgetPath, 'utf8');
}
catch (error) {
    console.warn('Unable to load widget HTML at startup:', error);
}
const topMoversInputSchema = {
    limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Maximum number of movers to return for each table (default 5).'),
};
const topMoversSchema = z.object(topMoversInputSchema);
const sanitizeNumber = (value) => {
    if (!value)
        return null;
    const cleaned = value.replace(/[,%$]/g, '').replace(/\s+/g, '');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
};
const parseMovers = (records = [], limit) => records.slice(0, limit).map((record) => ({
    symbol: record.ticker,
    price: sanitizeNumber(record.price),
    changeAmount: sanitizeNumber(record.change_amount),
    changePercent: sanitizeNumber(record.change_percent),
    volume: sanitizeNumber(record.volume),
}));
const resolveBaseUrl = (req) => {
    const forwardedProto = req.headers['x-forwarded-proto']?.split(',')[0]?.trim();
    const protocol = forwardedProto || req.protocol || 'http';
    const forwardedHost = req.headers['x-forwarded-host'];
    const host = forwardedHost || req.headers.host || 'localhost';
    return `${protocol}://${host}`;
};
mcpServer.registerResource('top-movers-widget', 'ui://widget/top-movers.html', {}, async () => {
    let html = widgetHtml;
    try {
        html = readFileSync(widgetPath, 'utf8');
    }
    catch (error) {
        if (!html) {
            throw error;
        }
        console.warn('Falling back to cached widget HTML:', error);
    }
    return {
        contents: [
            {
                uri: 'ui://widget/top-movers.html',
                mimeType: 'text/html+skybridge',
                text: html,
                _meta: {
                    'openai/widgetDescription': 'Displays the latest Alpha Vantage top gainers and losers tables.',
                    'openai/widgetPrefersBorder': true,
                    'openai/widgetCSP': {
                        connect_domains: [],
                        resource_domains: [],
                    },
                },
            },
        ],
    };
});
mcpServer.registerTool('topMovers', {
    title: 'Top Gainers and Losers',
    description: 'Fetch latest top gainers and losers from Alpha Vantage.',
    inputSchema: topMoversInputSchema,
    outputSchema: {
        gainers: z
            .array(z.object({
            symbol: z.string(),
            price: z.number().nullable(),
            changeAmount: z.number().nullable(),
            changePercent: z.number().nullable(),
            volume: z.number().nullable(),
        }))
            .describe('Top gaining stocks.'),
        losers: z
            .array(z.object({
            symbol: z.string(),
            price: z.number().nullable(),
            changeAmount: z.number().nullable(),
            changePercent: z.number().nullable(),
            volume: z.number().nullable(),
        }))
            .describe('Top losing stocks.'),
        lastUpdated: z.string().nullable(),
    },
    annotations: {
        readOnlyHint: true,
    },
    _meta: {
        'openai/outputTemplate': 'ui://widget/top-movers.html',
        'openai/widgetAccessible': true,
        'openai/toolInvocation/invoking': 'Fetching latest market movers…',
        'openai/toolInvocation/invoked': 'Latest market movers fetched.',
    },
}, async (args) => {
    const { limit } = args;
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
        throw new Error('ALPHA_VANTAGE_API_KEY is not set.');
    }
    const effectiveLimit = limit ?? 5;
    const { data } = await axios.get('https://www.alphavantage.co/query', {
        params: {
            function: 'TOP_GAINERS_LOSERS',
            apikey: apiKey,
        },
    });
    if (data.note || data.information) {
        throw new Error(data.note || data.information || 'Alpha Vantage request was throttled.');
    }
    const gainers = parseMovers(data.top_gainers, effectiveLimit);
    const losers = parseMovers(data.top_losers, effectiveLimit);
    const output = {
        gainers,
        losers,
        lastUpdated: data.last_updated ?? null,
    };
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify(output),
            },
        ],
        structuredContent: output,
    };
});
app.post('/mcp', async (req, res) => {
    try {
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true,
            // allow browser clients without DNS rebinding issues
            allowedHosts: ['127.0.0.1', 'localhost'],
            enableDnsRebindingProtection: false,
        });
        res.on('close', () => {
            transport.close();
        });
        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, req.body);
    }
    catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: error instanceof Error ? error.message : 'Internal server error',
                },
                id: null,
            });
        }
    }
});
// Add SSE support for backward compatibility
app.get('/mcp', async (req, res) => {
    console.log('SSE connection request');
    try {
        const transport = new SSEServerTransport('/mcp', res);
        res.on('close', () => {
            console.log('SSE connection closed');
            transport.close();
        });
        await mcpServer.connect(transport);
    }
    catch (error) {
        console.error('Error handling SSE request:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Internal server error',
            });
        }
    }
});
app.get('/.well-known/apps.json', (req, res) => {
    const baseUrl = resolveBaseUrl(req);
    res.json({
        schema_version: 'v1',
        name: 'Top Movers Dashboard',
        description: 'Browse current top stock market gainers and losers powered by Alpha Vantage directly inside ChatGPT.',
        instructions: 'Help users explore Alpha Vantage top gainers and losers. Fetch fresh data with the topMovers tool and summarize noteworthy trends.',
        tools: [
            {
                type: 'mcp',
                name: serverInfo.name,
                server: {
                    url: `${baseUrl}/mcp`,
                },
                tool_ids: ['topMovers'],
            },
        ],
    });
});
app.get('/', (_req, res) => {
    res.json({ message: 'Top Movers MCP server is running.' });
});
const port = Number.parseInt(process.env.PORT ?? '3000', 10);
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}).on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
});
