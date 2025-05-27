const NotificationProvider = require("./notification-provider");
const axios = require("axios");
const { DOWN, UP } = require("../../src/util");

class Discord extends NotificationProvider {
    name = "discord";

    async send(notification, message, monitorJSON = null, heartbeatJSON = null) {
        const OK = "Sent Successfully.";
        const displayName = notification.discordUsername || "Uptime Kuma";

        try {
            const webhookUrl = new URL(notification.discordWebhookUrl);
            if (notification.discordChannelType === "postToThread") {
                webhookUrl.searchParams.append("thread_id", notification.threadId);
            }

            const createPayload = (title, color, fields) => ({
                username: displayName,
                content: notification.discordPrefixMessage || undefined,
                embeds: [{
                    title,
                    color,
                    timestamp: heartbeatJSON?.time || new Date().toISOString(),
                    fields
                }],
                ...(notification.discordChannelType === "createNewForumPost" && {
                    thread_name: notification.postName
                })
            });

            if (!heartbeatJSON) {
                const payload = {
                    username: displayName,
                    content: message,
                    ...(notification.discordChannelType === "createNewForumPost" && {
                        thread_name: notification.postName
                    })
                };
                await axios.post(webhookUrl.toString(), payload);
                return OK;
            }

            const fields = [
                { name: "Service Name", value: monitorJSON.name },
                ...(notification.disableUrl ? [] : [{
                    name: monitorJSON.type === "push" ? "Service Type" : "Service URL",
                    value: this.extractAddress(monitorJSON)
                }]),
                {
                    name: `Time (${heartbeatJSON.timezone})`,
                    value: heartbeatJSON.localDateTime
                }
            ];

            let payload;

            if (heartbeatJSON.status === DOWN) {
                fields.push({
                    name: "Error",
                    value: heartbeatJSON.msg ?? "N/A"
                });

                payload = createPayload(
                    `❌ Your service ${monitorJSON.name} went down. ❌`,
                    0xFF0000,
                    fields
                );

            } else if (heartbeatJSON.status === UP) {
                fields.push({
                    name: "Ping",
                    value: heartbeatJSON.ping == null ? "N/A" : `${heartbeatJSON.ping} ms`
                });

                payload = createPayload(
                    `✅ Your service ${monitorJSON.name} is up! ✅`,
                    0x00FF00,
                    fields
                );
            }

            if (payload) {
                await axios.post(webhookUrl.toString(), payload);
                return OK;
            }
        } catch (error) {
            this.throwGeneralAxiosError(error);
        }
    }
}

module.exports = Discord;
