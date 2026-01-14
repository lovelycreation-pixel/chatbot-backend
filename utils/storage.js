const Message = require("../models/Message");

async function getClientStorageUsage(clientId) {
  const result = await Message.aggregate([
    { $match: { clientId } },
    { $group: { _id: null, totalBytes: { $sum: "$size" } } }
  ]);

  const usedBytes = result[0]?.totalBytes || 0;
  const usedMB = usedBytes / (1024 * 1024);

  return {
    usedBytes,
    usedMB
  };
}

module.exports = { getClientStorageUsage };
