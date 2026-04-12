/**
 * Webhook worker — delivers outbound webhook events with HMAC-SHA256 signing.
 */
let Worker;
try { ({ Worker } = require('bullmq')); } catch (_) {}

const crypto = require('crypto');
const https  = require('https');
const http   = require('http');

const deliverWebhook = async ({ url, secret, event, payload }) => {
  const body      = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
  const signature = secret
    ? `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`
    : '';

  return new Promise((resolve, reject) => {
    const parsed   = new URL(url);
    const lib      = parsed.protocol === 'https:' ? https : http;
    const reqOpts  = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers: {
        'Content-Type':    'application/json',
        'Content-Length':  Buffer.byteLength(body),
        'X-Taskara-Event': event,
        'X-Taskara-Signature': signature,
      },
    };

    const req = lib.request(reqOpts, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve({ status: res.statusCode });
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.resume();
    });

    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
};

let workerInstance = null;

const startWebhookWorker = (redisConnection) => {
  if (!Worker || !redisConnection) return null;

  workerInstance = new Worker('webhooks', async (job) => {
    const { url, secret, event, payload } = job.data;
    await deliverWebhook({ url, secret, event, payload });
  }, {
    connection: redisConnection,
    concurrency: 5,
  });

  workerInstance.on('failed', (job, err) => {
    console.error(`[WebhookWorker] Failed delivery to ${job?.data?.url}:`, err.message);
  });

  console.log('[WebhookWorker] Worker started');
  return workerInstance;
};

module.exports = { startWebhookWorker, deliverWebhook };
