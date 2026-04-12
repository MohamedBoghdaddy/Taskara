const WebhookSubscription = require('../../models/WebhookSubscription');
const { addWebhookJob }   = require('../../jobs/queues');
const { deliverWebhook }  = require('../../jobs/workers/webhookWorker');

/**
 * Dispatch an event to all matching active webhook subscriptions.
 * If BullMQ is available, queues the job; otherwise delivers synchronously.
 */
const dispatchEvent = async (workspaceId, event, payload) => {
  try {
    const subs = await WebhookSubscription.find({
      workspaceId,
      active: true,
      events: event,
    });

    for (const sub of subs) {
      const jobData = { url: sub.url, secret: sub.secret, event, payload };
      const queued  = await addWebhookJob(jobData, { removeOnComplete: 20, removeOnFail: 10 });

      if (!queued) {
        // BullMQ not available — deliver directly (fire-and-forget)
        deliverWebhook(jobData).then(() => {
          WebhookSubscription.findByIdAndUpdate(sub._id, {
            $inc: { deliveryCount: 1 }, lastTriggeredAt: new Date(),
          }).catch(() => {});
        }).catch(() => {
          WebhookSubscription.findByIdAndUpdate(sub._id, { $inc: { failureCount: 1 } }).catch(() => {});
        });
      } else {
        await WebhookSubscription.findByIdAndUpdate(sub._id, { lastTriggeredAt: new Date(), $inc: { deliveryCount: 1 } });
      }
    }
  } catch (err) {
    console.error('[WebhookService] dispatchEvent error:', err.message);
  }
};

module.exports = { dispatchEvent };
