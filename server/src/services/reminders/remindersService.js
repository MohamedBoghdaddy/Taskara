const Reminder = require('../../models/Reminder');
const { sendReminderEmail } = require('../../utils/email');

const getReminders = async (workspaceId, userId, { status, from, to }) => {
  const filter = { workspaceId, userId };
  if (status) filter.status = status;
  if (from || to) {
    filter.remindAt = {};
    if (from) filter.remindAt.$gte = new Date(from);
    if (to) filter.remindAt.$lte = new Date(to);
  }
  return Reminder.find(filter).sort({ remindAt: 1 });
};

const createReminder = async (workspaceId, userId, data) => {
  return Reminder.create({ workspaceId, userId, ...data });
};

const updateReminder = async (workspaceId, userId, reminderId, data) => {
  const reminder = await Reminder.findOneAndUpdate(
    { _id: reminderId, workspaceId, userId },
    data,
    { new: true }
  );
  if (!reminder) throw { status: 404, message: 'Reminder not found' };
  return reminder;
};

const processDueReminders = async () => {
  const now = new Date();
  const dueReminders = await Reminder.find({
    status: 'scheduled',
    remindAt: { $lte: now },
  }).populate('userId');

  for (const reminder of dueReminders) {
    try {
      if (reminder.channel === 'email' && reminder.userId?.email) {
        await sendReminderEmail(reminder.userId, reminder);
      }
      reminder.status = 'sent';
      await reminder.save();
    } catch (err) {
      console.error('Failed to process reminder:', err);
    }
  }

  return dueReminders.length;
};

module.exports = { getReminders, createReminder, updateReminder, processDueReminders };
